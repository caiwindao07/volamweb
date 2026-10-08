/* ==========================================================================
   VÕ LÂM IDLE - SERVER TỔNG HỢP (NODE.JS + WEBSOCKET + TÀI KHOẢN & DATABASE)
   1. Phục vụ Web Server tĩnh cho toàn bộ game.
   2. Hệ thống Tài khoản (Đăng ký / Đăng nhập / Lưu trữ đám mây JSON DB).
   3. WebSocket Real-time Multiplayer (Đồng bộ tọa độ, môn phái, chat thế giới).
   ========================================================================== */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const { WebSocketServer } = require('ws');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml'
};

const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
let PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

// ==========================================
// 0. NẠP DỮ LIỆU GAME (THẾ GIỚI & QUÁI VẬT & VẬT CẢN)
// ==========================================
let JW = null;
let JX = null;
let JMO = null;
const zoneWalkable = new Map(); // zoneId -> Array<{ x, y }>

try {
  const worldPath = path.join(ROOT_DIR, 'world.js');
  const dataPath = path.join(ROOT_DIR, 'data.js');
  const jmoPath = path.join(ROOT_DIR, 'jmo.js');
  if (fs.existsSync(worldPath) && fs.existsSync(dataPath)) {
    const sandbox = { window: {} };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(dataPath, 'utf8'), sandbox);
    vm.runInContext(fs.readFileSync(worldPath, 'utf8'), sandbox);
    if (fs.existsSync(jmoPath)) {
      vm.runInContext(fs.readFileSync(jmoPath, 'utf8'), sandbox);
    }
    JW = sandbox.window.JW;
    JX = sandbox.window.JX;
    JMO = sandbox.window.JMO;
    console.log(`[Multiplayer] Đã nạp dữ liệu thế giới (${JW.zones.length} bản đồ, ${Object.keys(JW.mon).length} quái vật).`);

    // Tiền xử lý các ô di chuyển an toàn không vướng vật cản cho từng bản đồ
    if (JMO) {
      for (const [zid, mData] of Object.entries(JMO)) {
        const bin = Buffer.from(mData.obs, 'base64');
        const n = mData.gw * mData.gh;
        const ok = new Uint8Array(n);
        for (let k = 0; k < n; k++) ok[k] = ((bin[k >> 3] >> (k & 7)) & 1) ? 0 : 1;
        const comp = new Int32Array(n).fill(-1), q = new Int32Array(n);
        let best = -1, bestN = 0, id = 0;
        for (let s = 0; s < n; s++) {
          if (!ok[s] || comp[s] >= 0) continue;
          let h = 0, t = 0; q[t++] = s; comp[s] = id;
          while (h < t) {
            const c = q[h++], cx = c % mData.gw, cy = (c / mData.gw) | 0;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
              if (!dx && !dy) continue;
              const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= mData.gw || y >= mData.gh) continue;
              const k = y * mData.gw + x; if (!ok[k] || comp[k] >= 0) continue;
              if (dx && dy && (!ok[cy * mData.gw + x] || !ok[y * mData.gw + cx])) continue;
              comp[k] = id; q[t++] = k;
            }
          }
          if (t > bestN) { bestN = t; best = id; }
          id++;
        }
        for (let k = 0; k < n; k++) ok[k] = comp[k] === best ? 1 : 0;
        const safeCells = [];
        for (let cy = 1; cy < mData.gh - 1; cy++) {
          for (let cx = 1; cx < mData.gw - 1; cx++) {
            const idx = cy * mData.gw + cx;
            if (ok[idx] && ok[idx - 1] && ok[idx + 1] && ok[idx - mData.gw] && ok[idx + mData.gw]) {
              safeCells.push({ x: Math.round((cx + 0.5) * mData.cw), y: Math.round((cy + 0.5) * mData.ch) });
            }
          }
        }
        zoneWalkable.set(Number(zid), safeCells);
      }
      console.log(`[Multiplayer] Đã phân tích vật cản và tạo bản đồ tọa độ an toàn cho ${zoneWalkable.size} khu vực.`);
    }
  }
} catch (e) {
  console.error('[Multiplayer] Lỗi khi nạp world.js / data.js / jmo.js:', e);
}

// ==========================================
// 1. DATABASE & QUẢN LÝ TÀI KHOẢN (JSON + MONGODB ATLAS)
// ==========================================
let db = { users: {} };
const sessions = new Map(); // token -> username
let mongoClient = null;
let mongoDb = null;
let mongoUsersCol = null;

global._mongoStatus = {
  mode: 'init',
  connected: false,
  attempts: [],
  serverPublicIp: null,
  accountsCount: 0
};

// Truy vấn public IP của server để hỗ trợ cấu hình whitelist MongoDB Atlas
try {
  const https = require('https');
  https.get('https://api.ipify.org?format=json', (r) => {
    let raw = '';
    r.on('data', c => raw += c);
    r.on('end', () => {
      try {
        const j = JSON.parse(raw);
        global._mongoStatus.serverPublicIp = j.ip;
      } catch (e) {}
    });
  }).on('error', () => {});
} catch (e) {}

async function initMongo() {
  const envUri = (process.env.MONGODB_URI || '').trim();
  const defaultUriWithAuth = 'mongodb+srv://volam:Mitom1304@cluster0.tpppret.mongodb.net/volam-idle?authSource=admin&retryWrites=true&w=majority';
  const defaultUriWithoutAuth = 'mongodb+srv://volam:Mitom1304@cluster0.tpppret.mongodb.net/volam-idle?retryWrites=true&w=majority';

  const urisToTry = [];
  if (envUri) urisToTry.push({ uri: envUri, src: 'process.env.MONGODB_URI' });
  urisToTry.push({ uri: defaultUriWithAuth, src: 'mặc định (authSource=admin)' });
  urisToTry.push({ uri: defaultUriWithoutAuth, src: 'mặc định (chuẩn Atlas)' });

  global._mongoStatus.attempts = [];

  for (const item of urisToTry) {
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(item.uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000
      });
      await client.connect();
      mongoClient = client;
      mongoDb = mongoClient.db('volam-idle');
      mongoUsersCol = mongoDb.collection('users');
      console.log(`[DB] Đã kết nối thành công tới MongoDB Atlas trực tuyến (${item.src})!`);
      global._mongoStatus.mode = 'mongodb';
      global._mongoStatus.connected = true;
      global._mongoStatus.connectedSource = item.src;
      global._mongoStatus.attempts.push({ src: item.src, ok: true });
      return true;
    } catch (err) {
      console.warn(`[DB] Không thể kết nối MongoDB Atlas (${item.src}):`, err.message);
      global._mongoStatus.attempts.push({ src: item.src, ok: false, error: err.message });
    }
  }
  mongoUsersCol = null;
  global._mongoStatus.mode = 'local';
  global._mongoStatus.connected = false;
  return false;
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findDbUser(uKey) {
  if (!uKey) return null;
  const key = String(uKey).trim().toLowerCase();
  if (db.users[key]) return db.users[key];
  if (mongoUsersCol) {
    try {
      const doc = await mongoUsersCol.findOne({
        username: { $regex: new RegExp('^' + escapeRegex(key) + '$', 'i') }
      });
      if (doc) {
        const u = {
          username: doc.username,
          passwordHash: doc.passwordHash,
          heroName: doc.heroName || (doc.state && doc.state.name) || doc.username,
          fac: doc.fac || (doc.state && doc.state.fac) || 'shaolin',
          createdAt: doc.createdAt,
          lastLogin: doc.lastLogin,
          state: doc.state,
          token: doc.token
        };
        db.users[key] = u;
        if (u.token) sessions.set(u.token, key);
        return u;
      }
    } catch (e) {
      console.error('[DB] Lỗi truy vấn người dùng từ MongoDB:', e.message);
    }
  }
  return null;
}

async function persistUser(user) {
  if (!user || !user.username) return;
  const uKey = String(user.username).trim().toLowerCase();
  db.users[uKey] = user;
  if (mongoUsersCol) {
    try {
      await mongoUsersCol.updateOne(
        { username: user.username },
        { $set: user },
        { upsert: true }
      );
    } catch (e) {
      console.error('[DB] Lỗi lưu người dùng lên Mongo:', e.message);
    }
  } else {
    saveDb();
  }
}

async function loadDb() {
  try {
    // 1. Kết nối MongoDB Atlas
    const connected = await initMongo();
    if (connected && mongoUsersCol) {
      db = { users: {} };
      const totalCount = await mongoUsersCol.countDocuments();
      console.log(`[DB] Đang hoạt động chế độ Online (MongoDB Atlas). Tổng số tài khoản: ${totalCount}.`);
    } else {
      // Chế độ Offline/Local khi không có Mongo: nạp từ db.json
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        db = JSON.parse(raw);
        if (!db.users) db.users = {};
      }
      for (const uKey in db.users) {
        if (db.users[uKey].token) {
          sessions.set(db.users[uKey].token, uKey);
        }
      }
      console.log(`[DB] Đang hoạt động chế độ Cục bộ (db.json). Số tài khoản: ${Object.keys(db.users).length}.`);
    }
  } catch (e) {
    console.error('[DB] Lỗi load database:', e);
  }
}

function saveDb() {
  if (mongoUsersCol) {
    const list = Object.values(db.users);
    if (!list.length) return;
    const ops = list.map(u => ({
      updateOne: {
        filter: { username: u.username },
        update: { $set: u },
        upsert: true
      }
    }));
    mongoUsersCol.bulkWrite(ops).catch(e => console.error('[DB] Lỗi sync active users sang MongoDB:', e.message));
    return;
  }
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db), 'utf8');
  } catch (e) {
    console.error('[DB] Lỗi ghi database cục bộ:', e);
  }
}

function hashPassword(pass) {
  return crypto.createHash('sha256').update(pass + '::vl_salt_2026_idle').digest('hex');
}

function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

function createInitialHeroState(heroName, fac) {
  return {
    v: 1,
    name: heroName || 'Tân thủ',
    fac: fac || 'shaolin',
    sex: (fac === 'emei' || fac === 'cuiyan') ? 1 : 0,
    lvl: 1,
    xp: 0,
    gold: 0,
    attrPts: 0,
    attr: { str: 0, dex: 0, vit: 0, eng: 0 },
    skPts: 1,
    sk: {},
    main: 0,
    eq: {},
    inv: [],
    stage: 1,
    maxStage: 1,
    wave: 1,
    push: true,
    uid: 1,
    autoSell: 0,
    kps: 0.2,
    totalKills: 0,
    autoEquip: false,
    autoPts: false,
    autoMap: true,
    diff: 1,
    autoForge: false,
    autoBuy: true,
    tut: 0,
    hints: {},
    bakAt: 0,
    potOff: false,
    potUsed: 0,
    potStock: { life: {}, mana: {} },
    ctrl: 'auto',
    joy: 'fixed',
    slots: [0, 0, 0, 0],
    snd: { on: true, vol: 0.7, music: true, mvol: 0.4 },
    lootF: { minRar: 0, minLvl: 1, groups: [], series: [], auto: true },
    ground: [],
    mats: { ht: {}, ore: {}, shard: {}, misc: {} },
    camp: { wood: 0, wine: 0, fireT: 0, wineT: 0, fireX: 0, fireY: 0 },
    mount: { tier: 0, lvl: 1, exp: 0, fodder: 0 },
    cloak: { tier: 0 },
    meridian: { qi: 0, levels: { nham: 0, doc: 0, xung: 0, doi: 0, amduy: 0, duongduy: 0, amkieu: 0, duongkieu: 0 } },
    companion: {
      activeId: null,
      selectedTabId: 1,
      list: {
        1: { id: 1, lvl: 1, exp: 0, intimacy: 0, maxIntimacy: 100, star: 0, equips: { weapon: 0, helm: 0, armor: 0, gloves: 0, boots: 0 } },
        2: { id: 2, lvl: 1, exp: 0, intimacy: 0, maxIntimacy: 100, star: 0, equips: { weapon: 0, helm: 0, armor: 0, gloves: 0, boots: 0 } },
        3: { id: 3, lvl: 1, exp: 0, intimacy: 0, maxIntimacy: 100, star: 0, equips: { weapon: 0, helm: 0, armor: 0, gloves: 0, boots: 0 } },
        4: { id: 4, lvl: 1, exp: 0, intimacy: 0, maxIntimacy: 100, star: 0, equips: { weapon: 0, helm: 0, armor: 0, gloves: 0, boots: 0 } },
        5: { id: 5, lvl: 1, exp: 0, intimacy: 0, maxIntimacy: 100, star: 0, equips: { weapon: 0, helm: 0, armor: 0, gloves: 0, boots: 0 } }
      }
    },
    vip: { lvl: 1, exp: 0, lastClaim: '', pts: 0 },
    rw: { stat: { kills: 0, elite: 0, boss: 0, chests: 0 }, fd: 0 },
    last: Date.now()
  };
}

// ==========================================
// ANTI-CHEAT & SERVER-AUTHORITATIVE LOGIC
// ==========================================
function getMaxAllowedDamage(lvl) {
  const L = Math.max(1, Math.min(200, Number(lvl) || 1));
  // Công thức sát thương tối đa cho phép mỗi đòn đánh của người chơi ở cấp L
  // Cấp 1: tối đa ~500, Cấp 50: ~35,000, Cấp 99: ~250,000, Cấp 200: ~1,500,000
  return Math.max(500, Math.round((70 + L * 95 + Math.pow(L, 1.85) * 18) * 3.5));
}

function sanitizeAndValidateState(serverState, incomingState, username) {
  if (!serverState) return incomingState;
  if (!incomingState || typeof incomingState !== 'object') return serverState;

  // 1. Cấp độ & Kinh nghiệm: Cho phép lên cấp bình thường (kể cả lên nhiều cấp 1 lúc), chỉ chặn hack vọt > 20 cấp
  const currentSrvLvl = Math.max(1, Math.min(200, Number(serverState.lvl) || 1));
  const incLvl = Math.max(1, Math.min(200, Number(incomingState.lvl) || currentSrvLvl));
  if (incLvl - currentSrvLvl > 20) {
    console.warn(`[Anti-Cheat] Tài khoản "${username}" cố tình lưu cấp độ nhảy vọt: Lv.${incLvl} (Server: Lv.${currentSrvLvl}). Đã khôi phục về Lv.${currentSrvLvl}.`);
    incomingState.lvl = currentSrvLvl;
    incomingState.xp = Number(serverState.xp) || 0;
  } else {
    incomingState.lvl = incLvl;
    incomingState.xp = Math.max(0, Number(incomingState.xp) || 0);
  }

  // 2. Điểm Tiềm Năng & Điểm Kỹ Năng: Mỗi cấp chỉ +5 tiềm năng và +1 kỹ năng
  const clientAttr = incomingState.attr || {};
  incomingState.attr = {
    str: Math.max(0, Math.floor(Number(clientAttr.str) || 0)),
    dex: Math.max(0, Math.floor(Number(clientAttr.dex) || 0)),
    vit: Math.max(0, Math.floor(Number(clientAttr.vit) || 0)),
    eng: Math.max(0, Math.floor(Number(clientAttr.eng) || 0))
  };
  const rebornCount = (incomingState.rw && incomingState.rw.stat && incomingState.rw.stat.reborn) || 0;
  const maxAttrPossible = (incomingState.lvl - 1) * 5 + rebornCount * 100 + 50;
  const totalAttrSpent = incomingState.attr.str + incomingState.attr.dex + incomingState.attr.vit + incomingState.attr.eng;
  let clientAttrPts = Math.max(0, Math.floor(Number(incomingState.attrPts) || 0));
  if (totalAttrSpent + clientAttrPts > maxAttrPossible) {
    clientAttrPts = Math.max(0, maxAttrPossible - totalAttrSpent);
  }
  incomingState.attrPts = clientAttrPts;

  incomingState.sk = incomingState.sk || {};
  let totalSkSpent = 0;
  for (const skId in incomingState.sk) {
    totalSkSpent += Number(incomingState.sk[skId]) || 0;
  }
  const maxSkPossible = 1 + (incomingState.lvl - 1) * 1 + rebornCount * 50 + 200; // 1 ban đầu + 1 mỗi cấp + chuyển sinh + mật tịch + quà
  let clientSkPts = Math.max(0, Math.floor(Number(incomingState.skPts) || 0));
  if (totalSkSpent + clientSkPts > maxSkPossible) {
    clientSkPts = Math.max(0, maxSkPossible - totalSkSpent);
  }
  incomingState.skPts = clientSkPts;

  // 3. Ngân lượng: Giữ nguyên số vàng hợp lệ
  incomingState.gold = Math.max(0, Math.floor(Number(incomingState.gold) || 0));

  // 5. Cập nhật các trường dữ liệu hợp lệ vào serverState
  serverState.gold = incomingState.gold;
  serverState.lvl = incomingState.lvl;
  serverState.xp = incomingState.xp;
  serverState.attrPts = incomingState.attrPts;
  serverState.attr = incomingState.attr;
  serverState.skPts = incomingState.skPts;
  serverState.sk = incomingState.sk;
  if (incomingState.eq) serverState.eq = incomingState.eq;
  if (incomingState.inv) serverState.inv = incomingState.inv;
  if (incomingState.stage) serverState.stage = incomingState.stage;
  if (incomingState.maxStage) serverState.maxStage = Math.max(serverState.maxStage || 1, incomingState.maxStage);
  if (incomingState.mats) serverState.mats = incomingState.mats;
  if (incomingState.mount) serverState.mount = incomingState.mount;
  if (incomingState.camp) serverState.camp = incomingState.camp;
  if (incomingState.auto) serverState.auto = incomingState.auto;
  if (incomingState.fac) serverState.fac = String(incomingState.fac);
  if (incomingState.sex !== undefined) serverState.sex = Number(incomingState.sex) || 0;
  if (incomingState.main !== undefined) serverState.main = Number(incomingState.main) || 0;
  if (incomingState.slots) serverState.slots = incomingState.slots;
  if (incomingState.push !== undefined) serverState.push = !!incomingState.push;
  if (incomingState.rw) serverState.rw = incomingState.rw;
  if (incomingState.pkMode) serverState.pkMode = String(incomingState.pkMode);
  if (incomingState.pkValue !== undefined) serverState.pkValue = Math.max(0, Number(incomingState.pkValue) || 0);
  if (incomingState.jailUntil !== undefined) serverState.jailUntil = Math.max(0, Number(incomingState.jailUntil) || 0);
  if (incomingState.lastPkReduceT !== undefined) serverState.lastPkReduceT = Number(incomingState.lastPkReduceT) || Date.now();
  if (incomingState.vip && typeof incomingState.vip === 'object') {
    serverState.vip = {
      lvl: Math.max(1, Math.min(10, Math.floor(Number(incomingState.vip.lvl) || 1))),
      exp: Math.max(0, Math.floor(Number(incomingState.vip.exp) || 0)),
      lastClaim: String(incomingState.vip.lastClaim || ''),
      pts: Math.max(0, Math.floor(Number(incomingState.vip.pts) || 0))
    };
  }
  serverState.lastSyncT = Date.now();
  serverState.lastSave = Date.now();

  return serverState;
}

loadDb();

// Định kỳ lưu cơ sở dữ liệu xuống ổ đĩa mỗi 30 giây
setInterval(saveDb, 30000);

// ==========================================
// 2. HTTP SERVER & REST API
// ==========================================
function sendJson(res, statusCode, obj) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Cache-Control': 'no-cache'
  });
  res.end(JSON.stringify(obj));
}

function parseJsonBody(req, callback) {
  let body = '';
  req.on('data', chunk => {
    body += chunk;
    if (body.length > 5 * 1024 * 1024) req.destroy(); // tối đa 5MB cho save file
  });
  req.on('end', () => {
    try {
      const data = JSON.parse(body || '{}');
      callback(null, data);
    } catch (e) {
      callback(e);
    }
  });
}

function getAuthUser(req) {
  const auth = req.headers['authorization'];
  if (!auth) return null;
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  const username = sessions.get(token);
  if (!username || !db.users[username]) return null;
  return { username, user: db.users[username], token };
}

async function getAuthUserAsync(req) {
  const auth = req.headers['authorization'];
  if (!auth) return null;
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  let uKey = sessions.get(token);
  let user = uKey ? db.users[uKey] : null;
  if (!user && mongoUsersCol) {
    try {
      const doc = await mongoUsersCol.findOne({ token: token });
      if (doc) {
        uKey = String(doc.username).trim().toLowerCase();
        user = {
          username: doc.username,
          passwordHash: doc.passwordHash,
          heroName: doc.heroName || (doc.state && doc.state.name) || doc.username,
          fac: doc.fac || (doc.state && doc.state.fac) || 'shaolin',
          createdAt: doc.createdAt,
          lastLogin: doc.lastLogin,
          state: doc.state,
          token: doc.token
        };
        db.users[uKey] = user;
        sessions.set(token, uKey);
      }
    } catch (e) {}
  }
  if (!uKey || !user) return null;
  return { username: uKey, user, token };
}

const server = http.createServer((req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    });
    res.end();
    return;
  }

  const urlParts = req.url.split('?');
  const pathname = urlParts[0];

  // API ROUTING
  if (pathname.startsWith('/api/')) {
    // 0. Kiểm tra trạng thái cơ sở dữ liệu (Database Health / Diagnostic)
    if (pathname === '/api/db-status' && req.method === 'GET') {
      const getCount = async () => {
        let count = Object.keys(db.users || {}).length;
        if (mongoUsersCol) {
          try { count = await mongoUsersCol.countDocuments(); } catch(e){}
        }
        return sendJson(res, 200, {
          ok: true,
          ...global._mongoStatus,
          accountsCount: count,
          help: !global._mongoStatus.connected ? 'Vào MongoDB Atlas -> Network Access -> Add IP Address -> chọn Allow Access From Anywhere (0.0.0.0/0)' : 'Đã kết nối MongoDB Atlas thành công'
        });
      };
      getCount();
      return;
    }

    // 1. Đăng ký tài khoản
    if (pathname === '/api/register' && req.method === 'POST') {
      parseJsonBody(req, async (err, data) => {
        if (err || !data || !data.username || !data.password) {
          return sendJson(res, 400, { ok: false, error: 'Thiếu tên tài khoản hoặc mật khẩu!' });
        }
        const uKey = String(data.username).trim().toLowerCase();
        if (uKey.length < 3 || uKey.length > 20) {
          return sendJson(res, 400, { ok: false, error: 'Tên tài khoản phải từ 3 đến 20 ký tự!' });
        }
        if (data.password.length < 4) {
          return sendJson(res, 400, { ok: false, error: 'Mật khẩu phải từ 4 ký tự trở lên!' });
        }
        const existing = await findDbUser(uKey);
        if (existing) {
          return sendJson(res, 400, { ok: false, error: 'Tên tài khoản này đã được sử dụng!' });
        }

        const heroName = String(data.heroName || data.username).trim().slice(0, 20);
        const fac = String(data.fac || 'shaolin');
        const initialHero = createInitialHeroState(heroName, fac);
        const token = generateToken();

        const newUser = {
          username: String(data.username).trim(),
          passwordHash: hashPassword(data.password),
          heroName: heroName,
          fac: fac,
          state: initialHero,
          token: token,
          createdAt: Date.now(),
          lastLogin: Date.now()
        };

        db.users[uKey] = newUser;
        sessions.set(token, uKey);
        await persistUser(newUser);

        console.log(`[Auth] Đăng ký thành công tài khoản: ${newUser.username} (${heroName})`);
        return sendJson(res, 200, {
          ok: true,
          token: token,
          user: {
            username: newUser.username,
            heroName: newUser.heroName,
            fac: newUser.fac
          },
          state: newUser.state
        });
      });
      return;
    }

    // 2. Đăng nhập tài khoản
    if (pathname === '/api/login' && req.method === 'POST') {
      parseJsonBody(req, async (err, data) => {
        if (err || !data || !data.username || !data.password) {
          return sendJson(res, 400, { ok: false, error: 'Thiếu tên tài khoản hoặc mật khẩu!' });
        }
        const uKey = String(data.username).trim().toLowerCase();
        const u = await findDbUser(uKey);
        if (!u) {
          return sendJson(res, 400, { ok: false, error: 'Tài khoản không tồn tại! Vui lòng đăng ký mới.' });
        }

        const hashed = hashPassword(data.password);
        if (u.passwordHash !== hashed) {
          return sendJson(res, 400, { ok: false, error: 'Mật khẩu không chính xác!' });
        }

        const token = generateToken();
        u.token = token;
        u.lastLogin = Date.now();
        sessions.set(token, uKey);
        db.users[uKey] = u;
        await persistUser(u);

        console.log(`[Auth] Đăng nhập thành công: ${u.username}`);
        return sendJson(res, 200, {
          ok: true,
          token: token,
          user: {
            username: u.username,
            heroName: u.heroName,
            fac: u.fac
          },
          state: u.state
        });
      });
      return;
    }

    // 3. Lấy thông tin tài khoản hiện tại qua token
    if (pathname === '/api/me' && req.method === 'GET') {
      getAuthUserAsync(req).then(session => {
        if (!session) {
          return sendJson(res, 401, { ok: false, error: 'Chưa đăng nhập hoặc phiên đã hết hạn' });
        }
        return sendJson(res, 200, {
          ok: true,
          user: {
            username: session.user.username,
            heroName: session.user.heroName,
            fac: session.user.fac
          },
          state: session.user.state
        });
      });
      return;
    }

    // 4. Lưu dữ liệu nhân vật lên máy chủ (Cloud Save)
    if (pathname === '/api/save' && req.method === 'POST') {
      getAuthUserAsync(req).then(session => {
        if (!session) {
          return sendJson(res, 401, { ok: false, error: 'Chưa đăng nhập!' });
        }

        parseJsonBody(req, async (err, data) => {
          if (err || !data || !data.state) {
            return sendJson(res, 400, { ok: false, error: 'Dữ liệu không hợp lệ!' });
          }
          // Xác thực và chuẩn hóa toàn bộ dữ liệu lưu theo thẩm quyền của Server
          session.user.state = sanitizeAndValidateState(session.user.state, data.state, session.username);
          if (session.user.state.name) session.user.heroName = session.user.state.name;
          if (session.user.state.fac) session.user.fac = session.user.state.fac;
          session.user.lastSave = Date.now();
          await persistUser(session.user);
          return sendJson(res, 200, {
            ok: true,
            msg: 'Đã lưu đám mây thành công',
            state: session.user.state
          });
        });
      });
      return;
    }

    // 5. Đăng xuất
    if (pathname === '/api/logout' && req.method === 'POST') {
      getAuthUserAsync(req).then(session => {
        if (session) {
          delete session.user.token;
          sessions.delete(session.token);
          persistUser(session.user);
        }
        return sendJson(res, 200, { ok: true, msg: 'Đã đăng xuất' });
      });
      return;
    }

    return sendJson(res, 404, { ok: false, error: 'API không tồn tại' });
  }

  // PHỤC VỤ FILE TĨNH WEB
  let reqPath = pathname.replace(/^\/+/, '');
  if (!reqPath || reqPath === '') reqPath = 'index.html';

  const decodedPath = decodeURIComponent(reqPath).replace(/\//g, path.sep);
  const filePath = path.join(ROOT_DIR, decodedPath);

  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`404 Not Found: ${reqPath}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

// ==========================================
// 3. WEBSOCKET REAL-TIME MULTIPLAYER
// ==========================================
const wss = new WebSocketServer({ server });

const players = new Map(); // ws -> playerObj
let nextPlayerId = 1000;

function broadcast(msg, senderWs = null) {
  const json = typeof msg === 'string' ? msg : JSON.stringify(msg);
  for (const client of wss.clients) {
    if (client !== senderWs && client.readyState === 1) { // OPEN
      client.send(json);
    }
  }
}

function broadcastToZone(zoneId, msg, senderWs = null) {
  const json = typeof msg === 'string' ? msg : JSON.stringify(msg);
  for (const [ws, player] of players.entries()) {
    if (player.zoneId === zoneId && ws !== senderWs && ws.readyState === 1) {
      ws.send(json);
    }
  }
}

function broadcastOnlineCount() {
  const count = players.size + BOTS.length;
  broadcast({
    type: 'online_count',
    count: count
  });
}

// ==========================================
// HỆ THỐNG BOT TỰ ĐỘNG (BOT AI SYSTEM)
// Bot luyện công, trò chuyện, rao bán, nhắn tin trả giá & giao dịch
// ==========================================
const BOTS = [
  { id: 901, name: 'Độc Cô Kiếm', fac: 'huashan', series: 2, lvl: 1, xp: 0, zoneId: 2, x: 1470, y: 1490, targetX: 1470, targetY: 1490, dir: 0, face: 1, act: 'st', vip: 3, chat: '', chatT: 0, initialized: true, isBot: true,
    eq: { weapon: { n: 'Thanh Phong Kiếm', d: 0, k: 0, lvl: 10, r: 2, enh: 4, s: 2, ic: 'img/i/0_0.png' }, armor: { n: 'Tử Hà Kiếm Y', lvl: 10, r: 2, s: 2 } },
    sellItems: [
      { uid: 90101, n: 'Thanh Phong Kiếm', k: 0, r: 3, lvl: 10, s: 2, price: 1500, minPrice: 1000, desc: 'Bảo kiếm Hoa Sơn phái, sắc bén vô cùng', ic: 'img/i/0_0.png' },
      { uid: 90102, n: 'Huyền Tinh Cấp 4', k: 4, r: 2, lvl: 10, s: -1, price: 800, minPrice: 500, desc: 'Khoáng thạch rèn trang bị', ic: 'img/i/4_0.png' }
    ]
  },
  { id: 902, name: 'Tiểu Long Nữ', fac: 'cuiyan', series: 2, lvl: 1, xp: 0, zoneId: 2, x: 1590, y: 1520, targetX: 1590, targetY: 1520, dir: 0, face: -1, act: 'st', vip: 2, chat: '', chatT: 0, initialized: true, isBot: true,
    eq: { weapon: { n: 'Băng Tằm Song Đao', d: 0, k: 5, lvl: 10, r: 3, enh: 6, s: 2, ic: 'img/i/0_2.png' }, armor: { n: 'Băng Tằm Y', lvl: 10, r: 3, s: 2 } },
    sellItems: [
      { uid: 90201, n: 'Băng Tằm Y', k: 1, r: 3, lvl: 10, s: 2, price: 2000, minPrice: 1400, desc: 'Áo giáp tơ tằm băng giá, tăng mạnh kháng Thủy', ic: 'img/i/1_0.png' },
      { uid: 90202, n: 'Lam Thủy Tinh', k: 4, r: 3, lvl: 10, s: -1, price: 1200, minPrice: 900, desc: 'Đá quý khảm nạm trang bị', ic: 'img/i/4_1.png' }
    ]
  },
  { id: 903, name: 'Kiều Phong', fac: 'gaibang', series: 3, lvl: 1, xp: 0, zoneId: 2, x: 1520, y: 1590, targetX: 1520, targetY: 1590, dir: 0, face: 1, act: 'st', vip: 4, chat: '', chatT: 0, initialized: true, isBot: true,
    eq: { weapon: { n: 'Đả Cẩu Bổng', d: 0, k: 2, lvl: 10, r: 2, enh: 8, s: 3, ic: 'img/i/0_10.png' }, armor: { n: 'Hàng Long Bào', lvl: 10, r: 2, s: 3 } },
    sellItems: [
      { uid: 90301, n: 'Đả Cẩu Bổng', k: 0, r: 4, lvl: 10, s: 3, price: 5000, minPrice: 3800, desc: 'Trấn bang chi bảo Cái Bang', ic: 'img/i/0_10.png' },
      { uid: 90302, n: 'Tử Thủy Tinh', k: 4, r: 3, lvl: 10, s: -1, price: 1500, minPrice: 1100, desc: 'Bảo ngọc luyện thần binh', ic: 'img/i/4_2.png' }
    ]
  },
  { id: 904, name: 'Vô Danh Tăng', fac: 'shaolin', series: 0, lvl: 1, xp: 0, zoneId: 37, x: 1560, y: 1520, targetX: 1560, targetY: 1520, dir: 0, face: 1, act: 'st', vip: 5, chat: '', chatT: 0, initialized: true, isBot: true,
    eq: { weapon: { n: 'Kim Cang Thiền Trượng', d: 0, k: 2, lvl: 10, r: 2, enh: 10, s: 0, ic: 'img/i/0_10.png' }, armor: { n: 'Cà Sa Đại Đức', lvl: 10, r: 2, s: 0 } },
    stall: {
      title: 'Tàng Kinh Các Tiệm',
      sellerName: 'Vô Danh Tăng',
      items: [
        { uid: 90401, n: 'Dịch Cân Kinh Tàn Trang', k: 4, r: 4, lvl: 10, s: 0, price: 3000, desc: 'Tăng vĩnh viễn tiềm năng', ic: 'img/i/4_0.png' },
        { uid: 90402, n: 'Kim Cang Quyển', k: 3, r: 3, lvl: 10, s: 0, price: 1800, desc: 'Vòng tay hộ thân Phật môn', ic: 'img/i/3_0.png' }
      ]
    },
    sellItems: [
      { uid: 90401, n: 'Dịch Cân Kinh Tàn Trang', k: 4, r: 4, lvl: 10, s: 0, price: 3000, minPrice: 2400, desc: 'Tăng vĩnh viễn tiềm năng', ic: 'img/i/4_0.png' },
      { uid: 90402, n: 'Kim Cang Quyển', k: 3, r: 3, lvl: 10, s: 0, price: 1800, minPrice: 1300, desc: 'Vòng tay hộ thân Phật môn', ic: 'img/i/3_0.png' }
    ]
  },
  { id: 905, name: 'Đông Phương Bất Bại', fac: 'tangmen', series: 1, lvl: 1, xp: 0, zoneId: 2, x: 1560, y: 1450, targetX: 1560, targetY: 1450, dir: 0, face: -1, act: 'st', vip: 3, chat: '', chatT: 0, initialized: true, isBot: true,
    eq: { weapon: { n: 'Bạo Vũ Lê Hoa Châm', d: 1, k: 0, lvl: 10, r: 4, enh: 12, s: 1, ic: 'img/i/0_1.png' }, armor: { n: 'Hắc Mộc Bào', lvl: 10, r: 3, s: 1 } },
    stall: {
      title: 'Hắc Mộc Nhai Tiệm',
      sellerName: 'Đông Phương Bất Bại',
      items: [
        { uid: 90501, n: 'Bạo Vũ Lê Hoa Châm', k: 0, r: 4, lvl: 10, s: 1, price: 4200, desc: 'Ám khí Đường Môn độc môn', ic: 'img/i/0_1.png' },
        { uid: 90502, n: 'Bách Thảo Đan', k: 4, r: 2, lvl: 10, s: 1, price: 600, desc: 'Thần dược trừ bách độc', ic: 'img/i/4_0.png' }
      ]
    },
    sellItems: [
      { uid: 90501, n: 'Bạo Vũ Lê Hoa Châm', k: 0, r: 4, lvl: 10, s: 1, price: 4200, minPrice: 3200, desc: 'Ám khí Đường Môn độc môn', ic: 'img/i/0_1.png' },
      { uid: 90502, n: 'Bách Thảo Đan', k: 4, r: 2, lvl: 10, s: 1, price: 600, minPrice: 400, desc: 'Thần dược trừ bách độc', ic: 'img/i/4_0.png' }
    ]
  }
];

// Khởi tạo các Bot vào danh sách người chơi thế giới
function initBots() {
  for (const bot of BOTS) {
    bot.lastUpdate = Date.now();
    bot.hp = 1000 + bot.lvl * 80;
    bot.maxHp = bot.hp;
    bot.mp = 800 + bot.lvl * 50;
    bot.maxMp = bot.mp;
  }
}
initBots();

const BOT_RANDOM_CHATS = [
  'Hôm nay cày cấp ở đây rớt nhiều đồ xịn quá các huynh đệ!',
  'Ai mua trang bị hoặc đá khảm không? Nhắn tin tôi có giá tốt!',
  'Bản đồ này quái đông thật, cắm auto luyện công khỏe re.',
  'Cần thanh lý ít đồ kiếm tiền mua máu mana, ai có nhu cầu mật tôi!',
  'Đang rảnh rỗi luyện chiêu thức, huynh đệ nào qua giao lưu không?',
  'Anh em nào mua đồ thì cứ nhắn tin trả giá nhé, hợp lý là tôi gật đầu ngay!'
];

// Định kỳ cho Bot di chuyển, luyện công xuất chiêu, tăng cấp và phát ngôn
setInterval(() => {
  const now = Date.now();
  for (const bot of BOTS) {
    // Bot luyện công nhận kinh nghiệm và tăng cấp cùng người chơi
    bot.xp = (bot.xp || 0) + 25;
    const needXp = bot.lvl * bot.lvl * 60;
    if (bot.xp >= needXp && bot.lvl < 150) {
      bot.lvl++;
      bot.xp = 0;
      bot.maxHp = 1000 + bot.lvl * 80;
      bot.hp = bot.maxHp;
      // Cập nhật cấp độ cho thành viên tổ đội nếu bot đang trong pt
      for (const pt of serverParties.values()) {
        const m = pt.members.find(x => x.id === bot.id);
        if (m) { m.lvl = bot.lvl; broadcastParty(pt); }
      }
      broadcastToZone(bot.zoneId, {
        type: 'player_update',
        player: bot
      });
    }

    // 1. Bot di chuyển quanh khu vực luyện công & đồng hành cùng người chơi
    if (Math.random() < 0.6) {
      const humansInZone = Array.from(players.values()).filter(pl => pl.zoneId === bot.zoneId && pl.initialized);
      if (humansInZone.length > 0) {
        let nearest = null, minDist = 999999;
        for (const pl of humansInZone) {
          const d = Math.hypot(pl.x - bot.x, pl.y - bot.y);
          if (d < minDist) { minDist = d; nearest = pl; }
        }
        if (nearest && minDist > 260) {
          // Di chuyển lại gần người chơi để cùng luyện công (tầm 100-220px)
          const angle = Math.atan2(nearest.y - bot.y, nearest.x - bot.x);
          const step = Math.min(minDist - 120, 45 + Math.random() * 30);
          bot.x = Math.round(bot.x + Math.cos(angle) * step);
          bot.y = Math.round(bot.y + Math.sin(angle) * step);
          bot.face = Math.cos(angle) >= 0 ? 1 : -1;
          bot.act = 'run';
        } else {
          // Luyện công quanh người chơi
          const angle = Math.random() * Math.PI * 2;
          const dist = 15 + Math.random() * 35;
          bot.x = Math.round(bot.x + Math.cos(angle) * dist);
          bot.y = Math.round(bot.y + Math.sin(angle) * dist);
          bot.face = Math.cos(angle) >= 0 ? 1 : -1;
          bot.act = Math.random() < 0.45 ? 'at' : 'run';
        }
      } else {
        // Kiểm tra xem có người chơi ở khu vực khác không để đi theo hỗ trợ luyện công
        const activeHumans = Array.from(players.values()).filter(pl => pl.initialized && pl.zoneId !== 37);
        if (activeHumans.length > 0 && bot.id !== 904 && Math.random() < 0.3) {
          const pickHuman = activeHumans[Math.floor(Math.random() * activeHumans.length)];
          bot.zoneId = pickHuman.zoneId;
          bot.x = Math.round(pickHuman.x + (Math.random() - 0.5) * 160);
          bot.y = Math.round(pickHuman.y + (Math.random() - 0.5) * 160);
          broadcastToZone(bot.zoneId, {
            type: 'player_join',
            player: bot
          });
        } else {
          // Quanh quẩn vị trí hiện tại
          const angle = Math.random() * Math.PI * 2;
          const dist = 20 + Math.random() * 50;
          bot.x = Math.round(bot.x + Math.cos(angle) * dist);
          bot.y = Math.round(bot.y + Math.sin(angle) * dist);
          bot.face = Math.cos(angle) >= 0 ? 1 : -1;
          bot.act = Math.random() < 0.4 ? 'at' : 'run';
        }
      }
      
      broadcastToZone(bot.zoneId, {
        type: 'player_move',
        id: bot.id,
        name: bot.name,
        lvl: bot.lvl,
        x: bot.x,
        y: bot.y,
        dir: 0,
        face: bot.face,
        act: bot.act,
        stage: 1,
        zoneId: bot.zoneId,
        mounted: false,
        mountTier: 0,
        cloakTier: 0,
        pkMode: 'peace',
        eq: bot.eq,
        hp: bot.hp,
        maxHp: bot.maxHp
      });
    }

    // 2. Bot mô phỏng xuất chiêu luyện công (player_skill)
    if (Math.random() < 0.3) {
      const skillMap = { huashan: 1347, cuiyan: 95, gaibang: 115, shaolin: 4, tangmen: 47 };
      const skId = skillMap[bot.fac] || 4;
      broadcastToZone(bot.zoneId, {
        type: 'player_skill',
        id: bot.id,
        x: bot.x,
        y: bot.y,
        dir: 0,
        face: bot.face,
        tx: bot.x + bot.face * 120,
        ty: bot.y + (Math.random() - 0.5) * 60,
        skillId: skId
      });
    }

    // 3. Bot rao bán hoặc trò chuyện trên kênh Thế Giới / Kênh Mua Bán
    if (Math.random() < 0.08) {
      let chatMsg = '';
      let chan = 'world';
      if (Math.random() < 0.6 && bot.sellItems && bot.sellItems.length > 0) {
        const it = bot.sellItems[Math.floor(Math.random() * bot.sellItems.length)];
        chatMsg = `Bán gấp [${it.n}] giá ${it.price} lượng, ai mua mật tin trả giá trực tiếp nhé!`;
        chan = 'trade';
      } else {
        chatMsg = BOT_RANDOM_CHATS[Math.floor(Math.random() * BOT_RANDOM_CHATS.length)];
        chan = 'world';
      }

      bot.chat = chatMsg;
      bot.chatT = now;
      broadcast({
        type: 'player_chat',
        id: bot.id,
        name: bot.name,
        vip: bot.vip,
        chan: chan,
        text: chatMsg
      });
    }
  }
}, 3500);

// Xử lý phản hồi thông minh khi người chơi trò chuyện / trả giá / giao dịch với Bot
function handleBotChatResponse(bot, player, playerWs, text) {
  const t = text.toLowerCase();
  let reply = '';
  const botItems = bot.sellItems || [];

  // 1. Người chơi hỏi mua đồ hoặc hỏi giá
  if (t.includes('mua') || t.includes('giá') || t.includes('bán') || t.includes('bao nhiêu') || t.includes('đồ')) {
    if (botItems.length > 0) {
      const itemListStr = botItems.map(it => `[${it.n}]: ${it.price} lượng`).join(', ');
      reply = `Chào đại hiệp! Tôi đang có: ${itemListStr}. Huynh đệ muốn mua món nào hoặc trả giá bao nhiêu cứ bảo tôi!`;
    } else {
      reply = `Hiện tại tôi vừa bán hết đồ rồi đại hiệp ơi!`;
    }
  }
  // 2. Người chơi trả giá (e.g. "bán 1000 lượng nhé", "giảm giá 1200 đi", "1000k dc ko")
  else if (/\d+/.test(t) || t.includes('bớt') || t.includes('giảm') || t.includes('fix') || t.includes('rẻ')) {
    const numbers = t.match(/\d+/g);
    const offerPrice = numbers ? parseInt(numbers[0], 10) : 0;
    
    // Tìm món đồ gần nhất
    const targetItem = botItems[0];
    if (targetItem) {
      if (offerPrice >= targetItem.minPrice) {
        reply = `Được rồi! Hảo sảng! Giá ${offerPrice} lượng tôi đồng ý bán [${targetItem.n}] cho huynh đệ! Mời giao dịch ngay nhé!`;
        targetItem.agreePrice = offerPrice;
        // Tự động gửi lời mời giao dịch tới người chơi
        setTimeout(() => {
          if (playerWs.readyState === 1) {
            playerWs.send(JSON.stringify({
              type: 'trade_req_prompt',
              fromId: bot.id,
              fromName: bot.name,
              fromLvl: bot.lvl
            }));
          }
        }, 1500);
      } else if (offerPrice > 0 && offerPrice < targetItem.minPrice) {
        const counterOffer = Math.round((targetItem.price + targetItem.minPrice) / 2);
        reply = `Giá ${offerPrice} lượng bèo quá huynh đệ ơi, tôi lỗ vốn mất! Để hữu nghị cho huynh ${counterOffer} lượng nhé? Đồng ý thì mời giao dịch!`;
      } else {
        reply = `Huynh đệ muốn bớt bao nhiêu lượng? Cứ ra giá cụ thể xem tôi có để lại được không!`;
      }
    } else {
      reply = `Tôi hết hàng rồi huynh đệ ơi!`;
    }
  }
  // 3. Người chơi rủ giao dịch / hẹn địa điểm
  else if (t.includes('giao dịch') || t.includes('gd') || t.includes('trade') || t.includes('đổi')) {
    reply = `Được chứ, tôi đang ở gần đây! Mời đại hiệp xác nhận giao dịch nhé!`;
    setTimeout(() => {
      if (playerWs.readyState === 1) {
        playerWs.send(JSON.stringify({
          type: 'trade_req_prompt',
          fromId: bot.id,
          fromName: bot.name,
          fromLvl: bot.lvl
        }));
      }
    }, 1000);
  }
  // 4. Trò chuyện chào hỏi thông thường
  else if (t.includes('chào') || t.includes('hi') || t.includes('hello') || t.includes('alo')) {
    reply = `Chào ${player.name}! Rất vui được gặp trên chốn võ lâm giang hồ! Huynh đệ đang cày cấp hay tìm mua đồ gì thế?`;
  } else if (t.includes('ở đâu') || t.includes('tọa độ')) {
    reply = `Tôi đang ở tọa độ (${bot.x}, ${bot.y}) bản đồ này đây đại hiệp ơi!`;
  } else {
    const defaultReplies = [
      `Hay đấy đại hiệp! Giang hồ hiểm ác, có gì cứ tương trợ lẫn nhau nhé!`,
      `Huynh đệ cần mua trang bị hoặc đá quý thì cứ bảo tôi, giá cả thương lượng thoải mái!`,
      `Tôi đang tập trung luyện chiêu thức, chúc huynh đệ sớm xưng bá võ lâm!`
    ];
    reply = defaultReplies[Math.floor(Math.random() * defaultReplies.length)];
  }

  // Gửi tin nhắn phản hồi lại người chơi
  setTimeout(() => {
    bot.chat = reply;
    bot.chatT = Date.now();
    if (playerWs.readyState === 1) {
      // Gửi riêng hoặc hiển thị tin nhắn mật / lân cận
      playerWs.send(JSON.stringify({
        type: 'player_chat',
        id: bot.id,
        name: bot.name,
        vip: bot.vip,
        chan: 'whisper',
        text: reply
      }));
    }
    // Đồng thời hiển thị bong bóng chat trên đầu bot
    broadcastToZone(bot.zoneId, {
      type: 'player_chat',
      id: bot.id,
      name: bot.name,
      vip: bot.vip,
      chan: 'near',
      text: reply
    });
  }, 1000 + Math.random() * 800);
}
const serverParties = new Map(); // partyId -> { id, leaderId, leaderName, members: [ { id, name, fac, series, lvl, x, y } ] }
let nextPartyId = 100;
let serverMarket = [];

function getPlayerParty(playerId) {
  for (const party of serverParties.values()) {
    if (party.members.some(m => m.id === playerId)) return party;
  }
  return null;
}

function broadcastParty(party) {
  if (!party) return;
  const json = JSON.stringify({
    type: 'party_sync',
    party: {
      id: party.id,
      leaderId: party.leaderId,
      leaderName: party.leaderName,
      members: party.members
    }
  });
  for (const [ws, pl] of players.entries()) {
    if (party.members.some(m => m.id === pl.id) && ws.readyState === 1) {
      ws.send(json);
    }
  }
}

function getActivePlayersInZone(zoneId) {
  const list = [];
  for (const pl of players.values()) {
    if (pl.zoneId === zoneId && pl.x != null && pl.y != null) {
      list.push(pl);
    }
  }
  return list;
}

function getSafeMobSpawnPos(zoneId, nearX, nearY) {
  const safeList = zoneWalkable.get(zoneId);
  if (!safeList || !safeList.length) {
    return { x: 1792, y: 1792 };
  }
  // 75% cơ hội xuất hiện trong bán kính 100-450px quanh người chơi để có quái đánh liên tục
  if (nearX != null && nearY != null && Math.random() < 0.75) {
    const minR2 = 90 * 90, maxR2 = 450 * 450;
    const candidates = [];
    for (let i = 0; i < 150; i++) {
      const pt = safeList[Math.floor(Math.random() * safeList.length)];
      const d2 = (pt.x - nearX) ** 2 + (pt.y - nearY) ** 2;
      if (d2 >= minR2 && d2 <= maxR2) {
        candidates.push(pt);
        if (candidates.length >= 10) break;
      }
    }
    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
  }
  // Ngược lại xuất hiện ngẫu nhiên rải rác khắp toàn bộ bản đồ
  return safeList[Math.floor(Math.random() * safeList.length)];
}

const zoneMobs = new Map(); // zoneId -> Map(mobId -> mob)
let nextMobId = 5000;

function spawnOneMob(zoneId, nearX, nearY) {
  if (!JW || !JW.zones) return null;
  if (JW.town && (zoneId === JW.town.id || zoneId === 37)) return null;
  const z = JW.zones.find(x => x.id === zoneId);
  if (!z) return null;
  let map = zoneMobs.get(zoneId);
  if (!map) {
    map = new Map();
    zoneMobs.set(zoneId, map);
  }
  const mobId = ++nextMobId;
  const tid = (z.m && z.m.length) ? z.m[Math.floor(Math.random() * z.m.length)] : 1;
  const monDef = (JW.mon && JW.mon[tid]) ? JW.mon[tid] : {};
  const L = Math.round((z.lo + z.hi) / 2);
  const cls = Math.random() < 0.12 ? 'elite' : 'normal';
  const pos = getSafeMobSpawnPos(zoneId, nearX, nearY);
  // Cân bằng lại HP quái thế giới: giảm 35% để đánh dễ thở và vừa sức
  const baseHp = Math.round(75 + L * 28 * (cls === 'elite' ? 2.0 : 1));

  const mob = {
    id: mobId,
    zoneId: zoneId,
    tid: tid,
    n: monDef.n || 'Quái vật',
    L: L,
    cls: cls,
    series: Math.floor(Math.random() * 5),
    hp: baseHp,
    maxHp: baseHp,
    x: pos.x,
    y: pos.y
  };
  map.set(mobId, mob);
  return mob;
}

function ensureZoneMobs(zoneId, nearX, nearY) {
  if (!JW || !JW.zones) return [];
  if (JW.town && (zoneId === JW.town.id || zoneId === 37)) return [];
  const z = JW.zones.find(x => x.id === zoneId);
  if (!z) return []; // Thoát ngay nếu bản đồ không hợp lệ
  let map = zoneMobs.get(zoneId);
  if (!map) {
    map = new Map();
    zoneMobs.set(zoneId, map);
  }
  const zonePlayers = getActivePlayersInZone(zoneId);
  const maxMobs = Math.min(80, Math.max(45, zonePlayers.length * 15)); // Mở rộng bãi quái theo số lượng người online (45-80 quái)
  let attempts = 0;
  while (map.size < maxMobs && attempts < maxMobs * 2) {
    attempts++;
    let px = nearX, py = nearY;
    if (zonePlayers.length > 0) {
      const pl = zonePlayers[Math.floor(Math.random() * zonePlayers.length)];
      px = pl.x;
      py = pl.y;
    }
    const spawned = spawnOneMob(zoneId, px, py);
    if (!spawned) break; // Thoát ngay nếu không thể sinh quái, chống lặp vô hạn tràn RAM
  }
  return Array.from(map.values());
}

// Định kỳ 4 giây đảm bảo các bãi quái luôn duy trì đủ số lượng cho các người chơi đang online
setInterval(() => {
  if (!JW || !JW.zones) return;
  const activeZoneIds = new Set();
  for (const p of players.values()) {
    if (p.initialized && p.zoneId && (!JW.town || (p.zoneId !== JW.town.id && p.zoneId !== 37))) {
      activeZoneIds.add(p.zoneId);
    }
  }
  for (const zId of activeZoneIds) {
    const list = ensureZoneMobs(zId);
  }
}, 4000);

// "mỗi 2 tiếng trừ 1 điểm PK" (7200000ms = 2 giờ)
setInterval(() => {
  const now = Date.now();
  const TWO_HOURS = 2 * 60 * 60 * 1000;
  for (const [ws, p] of players.entries()) {
    if (p.pkValue > 0) {
      p.lastPkReduceT = p.lastPkReduceT || now;
      if (now - p.lastPkReduceT >= TWO_HOURS) {
        const reductions = Math.floor((now - p.lastPkReduceT) / TWO_HOURS);
        p.pkValue = Math.max(0, p.pkValue - reductions);
        p.lastPkReduceT = now;
        if (p.uKey && db.users[p.uKey] && db.users[p.uKey].state) {
          db.users[p.uKey].state.pkValue = p.pkValue;
          db.users[p.uKey].state.lastPkReduceT = p.lastPkReduceT;
        }
        try {
          ws.send(JSON.stringify({
            type: 'pk_update',
            pkValue: p.pkValue,
            jailUntil: p.jailUntil || 0,
            lastPkReduceT: p.lastPkReduceT,
            msg: `🕊️ Đã qua 2 giờ tu tâm dưỡng tính, điểm PK của bạn giảm 1 còn: ${p.pkValue}.`
          }));
        } catch (e) {}
      }
    }
    if (p.jailUntil > 0 && now >= p.jailUntil) {
      p.jailUntil = 0;
      if (p.uKey && db.users[p.uKey] && db.users[p.uKey].state) {
        db.users[p.uKey].state.jailUntil = 0;
      }
      try {
        ws.send(JSON.stringify({
          type: 'pk_update',
          pkValue: p.pkValue,
          jailUntil: 0,
          lastPkReduceT: p.lastPkReduceT,
          msg: '🎉 Bạn đã mãn hạn tù 1 ngày và được Quan Phủ phóng thích khỏi Thiên Lao!'
        }));
      } catch (e) {}
    }
  }
}, 60000); // Kiểm tra mỗi phút một lần

// ==========================================
// HỆ THỐNG GIAO DỊCH (PLAYER TRADE)
// ==========================================
let nextTradeId = 200;
const activeTrades = new Map(); // tradeId -> session
const playerTradeMap = new Map(); // playerId -> tradeId

function getTradeSession(playerId) {
  const tid = playerTradeMap.get(playerId);
  return tid ? activeTrades.get(tid) : null;
}

function cancelTradeSession(tid, reason) {
  const s = activeTrades.get(tid);
  if (!s) return;
  activeTrades.delete(tid);
  playerTradeMap.delete(s.p1.id);
  playerTradeMap.delete(s.p2.id);
  const e1 = Array.from(players.entries()).find(([w, pl]) => pl.id === s.p1.id);
  const e2 = Array.from(players.entries()).find(([w, pl]) => pl.id === s.p2.id);
  if (e1 && e1[0].readyState === 1) e1[0].send(JSON.stringify({ type: 'trade_cancelled', reason: reason || 'Giao dịch đã kết thúc' }));
  if (e2 && e2[0].readyState === 1) e2[0].send(JSON.stringify({ type: 'trade_cancelled', reason: reason || 'Giao dịch đã kết thúc' }));
}

function syncTradeSession(s) {
  const e1 = Array.from(players.entries()).find(([w, pl]) => pl.id === s.p1.id);
  const e2 = Array.from(players.entries()).find(([w, pl]) => pl.id === s.p2.id);
  if (e1 && e1[0].readyState === 1) {
    e1[0].send(JSON.stringify({
      type: 'trade_sync',
      session: {
        id: s.id,
        partner: { id: s.p2.id, name: s.p2.name, lvl: s.p2.lvl },
        myItems: s.p1.items,
        myMoney: s.p1.money,
        myLocked: s.p1.locked,
        myConfirmed: s.p1.confirmed,
        partnerItems: s.p2.items,
        partnerMoney: s.p2.money,
        partnerLocked: s.p2.locked,
        partnerConfirmed: s.p2.confirmed
      }
    }));
  }
  if (e2 && e2[0].readyState === 1) {
    e2[0].send(JSON.stringify({
      type: 'trade_sync',
      session: {
        id: s.id,
        partner: { id: s.p1.id, name: s.p1.name, lvl: s.p1.lvl },
        myItems: s.p2.items,
        myMoney: s.p2.money,
        myLocked: s.p2.locked,
        myConfirmed: s.p2.confirmed,
        partnerItems: s.p1.items,
        partnerMoney: s.p1.money,
        partnerLocked: s.p1.locked,
        partnerConfirmed: s.p1.confirmed
      }
    }));
  }
}

// ==========================================
// HỆ THỐNG DÃ TẨU (DA TAU QUEST SYSTEM)
// ==========================================
function ensurePlayerDatau(uState) {
  if (!uState) return null;
  if (!uState.datau) {
    uState.datau = {
      streak: 0,
      totalDone: 0,
      curTask: null,
      completed: false,
      lastReward: null
    };
  }
  return uState.datau;
}

const DATAU_COMMON_ITEMS = [
  { n: 'Hoàng Ngọc Giới Chỉ', k: 0, lvl: 1, ic: 'img/i/g1.png' },
  { n: 'Phù Dung Thạch Giới Chỉ', k: 0, lvl: 3, ic: 'img/i/g3.png' },
  { n: 'Thúy Lựu Thạch Giới Chỉ', k: 0, lvl: 5, ic: 'img/i/g5.png' },
  { n: 'Lam Bảo Thạch Giới Chỉ', k: 0, lvl: 8, ic: 'img/i/g8.png' },
  { n: 'Ngân Hạng Liễm', k: 1, lvl: 2, ic: 'img/i/g12.png' },
  { n: 'Kim Hạng Liễm', k: 1, lvl: 3, ic: 'img/i/g13.png' },
  { n: 'Ngọc Châu Hạng Liễm', k: 1, lvl: 5, ic: 'img/i/g15.png' },
  { n: 'Trân Châu Hạng Liễm', k: 1, lvl: 8, ic: 'img/i/g18.png' },
  { n: 'Lục Du Ngọc Bội', k: 2, lvl: 1, ic: 'img/i/g21.png' },
  { n: 'Kinh Bạch Ngọc Bội', k: 2, lvl: 3, ic: 'img/i/g23.png' },
  { n: 'Ngũ Sắc Ngọc Bội', k: 2, lvl: 5, ic: 'img/i/g25.png' },
  { n: 'Bích Ngọc Ngọc Bội', k: 2, lvl: 7, ic: 'img/i/g27.png' },
  { n: 'San Hô Hộ Thân Phù', k: 3, lvl: 2, ic: 'img/i/g32.png' },
  { n: 'Miêu Nhãn Hộ Thân Phù', k: 3, lvl: 4, ic: 'img/i/g34.png' },
  { n: 'Hổ Phách Hộ Thân Phù', k: 3, lvl: 6, ic: 'img/i/g36.png' },
  { n: 'Tử Phỉ Thúy Hộ Thân Phù', k: 3, lvl: 9, ic: 'img/i/g39.png' }
];

const DATAU_MATERIALS = [
  { n: 'Lam Thủy Tinh', ic: 'img/i/g51.png' },
  { n: 'Tử Thủy Tinh', ic: 'img/i/g52.png' },
  { n: 'Tiên Thảo Lộ', ic: 'img/i/g53.png' },
  { n: 'Quế Hoa Tửu', ic: 'img/i/g54.png' },
  { n: 'Phúc Duyên Lộ', ic: 'img/i/g55.png' },
  { n: 'Huyền Tinh khoáng thạch', ic: 'img/i/g56.png' }
];

function generateDatauTask(pLvl) {
  const roll = Math.random();
  if (roll < 0.45) {
    let validZones = (JW && JW.zones) ? JW.zones.filter(z => z.id !== 37 && z.id !== 386) : [];
    if (validZones.length === 0) validZones = [{ id: 2, n: 'Hoa Sơn' }];
    let zObj = validZones[0];
    if (pLvl >= 120 && validZones.find(z => z.id === 224)) zObj = validZones.find(z => z.id === 224);
    else if (pLvl >= 90 && validZones.find(z => z.id === 56)) zObj = validZones.find(z => z.id === 56);
    else if (pLvl >= 60 && validZones.find(z => z.id === 90)) zObj = validZones.find(z => z.id === 90);
    else if (pLvl >= 30 && validZones.find(z => z.id === 7)) zObj = validZones.find(z => z.id === 7);
    else zObj = validZones[Math.floor(Math.random() * Math.min(3, validZones.length))];

    const count = 15 + Math.floor(Math.random() * 15);
    return {
      type: 'monster',
      typeName: 'Diệt Quái',
      desc: `Hãy đến [${zObj.n}] tiêu diệt ${count} quái vật để trừ gian diệt ác.`,
      zoneId: zObj.id,
      zoneName: zObj.n,
      targetCount: count,
      progress: 0
    };
  } else if (roll < 0.70) {
    const item = DATAU_COMMON_ITEMS[Math.floor(Math.random() * DATAU_COMMON_ITEMS.length)];
    return {
      type: 'equip_common',
      typeName: 'Thu Thập Trang Bị',
      desc: `Lão phu đang cần 1 [${item.n}]. Hãy tìm và giao nộp cho lão phu.`,
      itemName: item.n,
      itemIcon: item.ic,
      targetCount: 1,
      progress: 0
    };
  } else if (roll < 0.85) {
    const mat = DATAU_MATERIALS[Math.floor(Math.random() * DATAU_MATERIALS.length)];
    return {
      type: 'material',
      typeName: 'Giao Bảo Thạch',
      desc: `Lão phu cần 1 [${mat.n}] để luyện dược. Hãy mang tới cho lão phu.`,
      itemName: mat.n,
      itemIcon: mat.ic,
      targetCount: 1,
      progress: 0
    };
  } else {
    const expNeed = pLvl * 5000;
    return {
      type: 'exp',
      typeName: 'Luyện Công',
      desc: `Võ học vô biên, hãy rèn luyện tích lũy thêm ${fmt(expNeed)} điểm kinh nghiệm.`,
      targetCount: expNeed,
      progress: 0
    };
  }
}

// ==========================================
// HỆ THỐNG CHIẾN TRƯỜNG TỐNG KIM (SONG-JIN)
// Chu kỳ: Mỗi giờ 1 trận (60 phút / chu kỳ, diễn ra 30 phút):
// - Phút :00 -> :05 (5 phút = 300s): Báo Danh
// - Phút :05 -> :08 (3 phút = 180s): Vào Doanh Trại Đợi (Hậu doanh Tống / Kim)
// - Phút :08 -> :28 (20 phút = 1200s): Giao Tranh Quyết Liệt (Boss xuất hiện ở phút thứ 18)
// - Phút :28 -> :30 (2 phút = 120s): Kết Thúc & Trao Thưởng
// - Phút :30 -> :00 (30 phút = 1800s): Nghỉ Ngơi & Đếm Ngược Đến Trận Sau
// ==========================================
const TONGKIM_SERVER = {
  round: 1,
  phase: 'idle',           // 'register' | 'staging' | 'battle' | 'ended' | 'idle'
  phaseName: 'Chờ trận kế',
  timeLeft: 0,
  songScore: 0,
  jinScore: 0,
  bossSpawned: false,
  rewardGiven: false,
  players: new Map(),
  quancoBalances: new Map()
};

function getTongkimSchedule() {
  const now = new Date();
  const m = now.getMinutes();
  const s = now.getSeconds();
  const secInHour = m * 60 + s;

  if (secInHour < 300) {
    // 00:00 -> 04:59 (5 phút)
    return {
      phase: 'register',
      phaseName: 'BÁO DANH',
      timeLeft: 300 - secInHour,
      totalPhaseTime: 300,
      bossSpawned: false
    };
  } else if (secInHour < 480) {
    // 05:00 -> 07:59 (3 phút)
    return {
      phase: 'staging',
      phaseName: 'DOANH TRẠI ĐỢI',
      timeLeft: 480 - secInHour,
      totalPhaseTime: 180,
      bossSpawned: false
    };
  } else if (secInHour < 1680) {
    // 08:00 -> 27:59 (20 phút)
    return {
      phase: 'battle',
      phaseName: 'GIAO TRANH',
      timeLeft: 1680 - secInHour,
      totalPhaseTime: 1200,
      bossSpawned: secInHour >= 1080 // Boss xuất hiện ở phút thứ 18 (sau 10 phút đánh)
    };
  } else if (secInHour < 1800) {
    // 28:00 -> 29:59 (2 phút)
    return {
      phase: 'ended',
      phaseName: 'KẾT THÚC & TRAO THƯỞNG',
      timeLeft: 1800 - secInHour,
      totalPhaseTime: 120,
      bossSpawned: false
    };
  } else {
    // 30:00 -> 59:59 (30 phút nghỉ)
    return {
      phase: 'idle',
      phaseName: 'NGHỈ NGƠI CHỜ TRẬN KẾ',
      timeLeft: 3600 - secInHour, // Đếm ngược đến đầu giờ sau (:00)
      totalPhaseTime: 1800,
      bossSpawned: false
    };
  }
}

function getPlayerQuanco(uKey) {
  if (!uKey) return 0;
  return TONGKIM_SERVER.quancoBalances.get(uKey) || 0;
}

function addPlayerQuanco(uKey, amt) {
  if (!uKey) return;
  const cur = getPlayerQuanco(uKey);
  TONGKIM_SERVER.quancoBalances.set(uKey, Math.max(0, cur + amt));
}

function getTongkimLadder() {
  const arr = Array.from(TONGKIM_SERVER.players.values());
  arr.sort((a, b) => (b.score || 0) - (a.score || 0));
  return arr.slice(0, 10).map((p, i) => ({
    rank: i + 1,
    id: p.id,
    name: p.name,
    camp: p.camp,
    kills: p.kills,
    score: p.score
  }));
}

function syncTongkimToAll() {
  const ladder = getTongkimLadder();
  for (const [ws, pl] of players.entries()) {
    if (ws.readyState !== 1) continue;
    const tkP = TONGKIM_SERVER.players.get(pl.id);
    const inBattle = (pl.zoneId === 386) || !!tkP;
    const qBal = pl.uKey ? getPlayerQuanco(pl.uKey) : 0;
    ws.send(JSON.stringify({
      type: 'tongkim_sync',
      phase: TONGKIM_SERVER.phase,
      phaseName: TONGKIM_SERVER.phaseName,
      inBattle: inBattle,
      camp: tkP ? tkP.camp : null,
      timeLeft: TONGKIM_SERVER.timeLeft,
      songScore: TONGKIM_SERVER.songScore,
      jinScore: TONGKIM_SERVER.jinScore,
      myScore: tkP ? tkP.score : 0,
      myKills: tkP ? tkP.kills : 0,
      myCombo: tkP ? tkP.combo : 0,
      quanco: qBal,
      ladder: ladder.map(item => ({ ...item, isMe: item.id === pl.id }))
    }));
  }
}

setInterval(() => {
  const sched = getTongkimSchedule();
  const prevPhase = TONGKIM_SERVER.phase;
  TONGKIM_SERVER.phase = sched.phase;
  TONGKIM_SERVER.phaseName = sched.phaseName;
  TONGKIM_SERVER.timeLeft = sched.timeLeft;

  // Xử lý chuyển đổi giai đoạn (Phase transitions)
  if (prevPhase !== sched.phase) {
    if (sched.phase === 'register') {
      // Bắt đầu 5 phút báo danh trận mới
      TONGKIM_SERVER.songScore = 0;
      TONGKIM_SERVER.jinScore = 0;
      TONGKIM_SERVER.bossSpawned = false;
      TONGKIM_SERVER.rewardGiven = false;
      for (const tkP of TONGKIM_SERVER.players.values()) {
        tkP.kills = 0; tkP.score = 0; tkP.combo = 0;
      }
      broadcast({
        type: 'player_chat',
        fromId: 0,
        fromName: '📢 [Tống Kim]',
        text: '⚔️ CHIẾN TRƯỜNG TỐNG KIM ĐÃ MỞ BÁO DANH (5 phút)! Đại hiệp hãy đến NPC Mộ Binh Quan tại Biện Kinh ghi danh chọn phe!',
        global: true
      });
    } else if (sched.phase === 'staging') {
      // Hết giờ báo danh, vào doanh trại đợi 3 phút
      broadcast({
        type: 'player_chat',
        fromId: 0,
        fromName: '📢 [Tống Kim]',
        text: '⏳ ĐÃ HẾT GIỜ BÁO DANH! Các hiệp khách tập kết tại Đại Doanh chuẩn bị xuất kích! Trận chiến sẽ bắt đầu sau 3 phút!',
        global: true
      });
      // Tập kết người chơi đã tham gia về Hậu Doanh
      for (const [pId, tkP] of TONGKIM_SERVER.players.entries()) {
        const plEntry = Array.from(players.entries()).find(([w, pl]) => pl.id === pId);
        if (plEntry) {
          const pl = plEntry[1];
          pl.zoneId = 386;
          pl.x = tkP.camp === 'song' ? 800 : 2600;
          pl.y = 1100;
          broadcastToZone(386, { type: 'player_enter', player: pl });
        }
      }
    } else if (sched.phase === 'battle') {
      // Khai chiến! Giao tranh 20 phút!
      broadcast({
        type: 'player_chat',
        fromId: 0,
        fromName: '📢 [Tống Kim]',
        text: '🔥 HIỆU LỆNH XUẤT KÍCH! Cửa đại doanh đã mở! Toàn quân Tống - Kim tràn ra chiến trường giao tranh (20 phút)!',
        global: true
      });
    } else if (sched.phase === 'ended') {
      // Trận đấu kết thúc, trao thưởng
      if (!TONGKIM_SERVER.rewardGiven) {
        TONGKIM_SERVER.rewardGiven = true;
        const winner = TONGKIM_SERVER.songScore > TONGKIM_SERVER.jinScore ? 'song' :
                       TONGKIM_SERVER.jinScore > TONGKIM_SERVER.songScore ? 'jin' : 'draw';
        const winName = winner === 'song' ? 'Phe TỐNG ĐẠI THẮNG' : winner === 'jin' ? 'Phe KIM ĐẠI THẮNG' : 'HAI BÊN BẤT PHÂN THẮNG BẠI';

        broadcast({
          type: 'player_chat',
          fromId: 0,
          fromName: '📢 [Tống Kim]',
          text: `🏆 TRẬN CHIẾN TỐNG KIM KẾT THÚC! ${winName}! (Tống ${TONGKIM_SERVER.songScore} : ${TONGKIM_SERVER.jinScore} Kim)`,
          global: true
        });

        for (const [pId, tkP] of TONGKIM_SERVER.players.entries()) {
          const plEntry = Array.from(players.entries()).find(([w, pl]) => pl.id === pId);
          if (plEntry && plEntry[1].uKey) {
            const uKey = plEntry[1].uKey;
            const isWin = (tkP.camp === winner);
            const winBonus = isWin ? 150 : 80;
            const scoreBonus = Math.floor(tkP.score / 2);
            const totalQ = winBonus + scoreBonus;
            addPlayerQuanco(uKey, totalQ);

            if (db.users[uKey] && db.users[uKey].state) {
              const uSt = db.users[uKey].state;
              const expR = tkP.score * 1500;
              const goldR = tkP.score * 500;
              uSt.xp = (uSt.xp || 0) + expR;
              uSt.gold = (uSt.gold || 0) + goldR;
              if (plEntry[0].readyState === 1) {
                plEntry[0].send(JSON.stringify({
                  type: 'state_sync',
                  xp: uSt.xp,
                  gold: uSt.gold
                }));
              }
            }
          }
        }
        saveDb();
      }
    } else if (sched.phase === 'idle') {
      broadcast({
        type: 'player_chat',
        fromId: 0,
        fromName: '📢 [Tống Kim]',
        text: '🌿 Trận chiến đã khép lại. Nghỉ ngơi dưỡng sức! Trận tiếp theo sẽ mở báo danh vào đầu giờ kế tiếp (:00)!',
        global: true
      });
    }
  }

  // Boss xuất hiện ở phút thứ 18 (khi sched.bossSpawned và chưa spawn)
  if (sched.bossSpawned && !TONGKIM_SERVER.bossSpawned) {
    TONGKIM_SERVER.bossSpawned = true;
    broadcast({
      type: 'player_chat',
      fromId: 0,
      fromName: '📢 [Chiến Trường]',
      zoneId: 386,
      text: '⚔️ ĐẠI BOSS TỐNG KIM ĐÃ XUẤT HIỆN! Trương Tông Chính & Liễu Thanh Thanh trấn giữ trung tâm!',
      global: true
    });
  }

  // Đồng bộ mỗi 2 giây
  if (TONGKIM_SERVER.timeLeft % 2 === 0) {
    syncTongkimToAll();
  }
}, 1000);

wss.on('connection', (ws) => {
  const pId = ++nextPlayerId;
  const pData = {
    id: pId,
    username: null,
    name: `Hiệp Khách ${pId}`,
    fac: 'shaolin',
    series: 0,
    lvl: 1,
    vip: 1,
    x: 768,
    y: 768,
    stage: 1,
    zoneId: 2,
    dir: 0,
    face: 1,
    act: 'st',
    chat: '',
    chatT: 0,
    pkMode: 'peace',
    pkValue: 0,
    jailUntil: 0,
    lastPkReduceT: Date.now(),
    initialized: false,
    lastUpdate: Date.now()
  };
  players.set(ws, pData);

  // Gửi danh sách người chơi & BOTS đã khởi tạo cho client vừa vào
  const allActivePlayers = Array.from(players.values()).filter(x => x.id === pId || x.initialized).concat(BOTS);
  ws.send(JSON.stringify({
    type: 'init',
    myId: pId,
    players: allActivePlayers  // client sẽ tự lọc theo zoneId
  }));

  console.log(`[Multiplayer] Kết nối mới #${pId}. Tổng client: ${players.size}`);
  broadcastOnlineCount();

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const p = players.get(ws);
      if (!p) return;

      const now = Date.now();

      // Cập nhật thông tin / Xác thực từ client
      if (data.type === 'auth' || data.type === 'profile') {
        const wasInit = p.initialized;
        if (data.token) {
          let uKey = sessions.get(data.token);
          let uObj = uKey ? db.users[uKey] : null;
          if (!uObj && mongoUsersCol) {
            mongoUsersCol.findOne({ token: data.token }).then(doc => {
              if (doc) {
                uKey = String(doc.username).trim().toLowerCase();
                uObj = {
                  username: doc.username,
                  passwordHash: doc.passwordHash,
                  heroName: doc.heroName || (doc.state && doc.state.name) || doc.username,
                  fac: doc.fac || (doc.state && doc.state.fac) || 'shaolin',
                  state: doc.state,
                  token: doc.token
                };
                db.users[uKey] = uObj;
                sessions.set(data.token, uKey);
                p.username = uObj.username;
                p.uKey = uKey;
                if (uObj.state) {
                  p.lvl = Math.max(1, Math.min(200, Number(uObj.state.lvl) || 1));
                  if (uObj.state.name) p.name = String(uObj.state.name).slice(0, 20);
                  if (uObj.state.fac) p.fac = String(uObj.state.fac);
                }
              }
            }).catch(() => {});
          } else if (uObj) {
            p.username = uObj.username;
            p.uKey = uKey;
            const uState = uObj.state;
            if (uState) {
              p.lvl = Math.max(1, Math.min(200, Number(uState.lvl) || 1));
              if (uState.name) p.name = String(uState.name).slice(0, 20);
              if (uState.fac) p.fac = String(uState.fac);
            }
          }
        }

        // Chống trùng lặp (Duplicate session): Nếu tài khoản này đã có phiên mở trước đó, đá phiên cũ ra!
        if (p.username) {
          for (const [otherWs, otherP] of players.entries()) {
            if (otherWs !== ws && otherP.username === p.username) {
              if (otherWs.readyState === 1) {
                console.log(`[Multiplayer] Tài khoản "${p.username}" mở ở tab/kết nối mới (#${p.id}). Ngắt kết nối tab cũ (#${otherP.id}).`);
                try {
                  otherWs.send(JSON.stringify({
                    type: 'kicked',
                    message: 'Tài khoản của bạn đã được mở ở một tab hoặc cửa sổ khác!'
                  }));
                  otherWs.close();
                } catch (e) {}
              }
              players.delete(otherWs);
              broadcast({
                type: 'player_leave',
                id: otherP.id
              });
            }
          }
        }

        if (data.name && !p.uKey) p.name = String(data.name).slice(0, 20);
        if (data.fac) {
          p.fac = String(data.fac);
          if (p.uKey && db.users[p.uKey] && db.users[p.uKey].state) {
            db.users[p.uKey].state.fac = p.fac;
          }
        }
        if (data.series != null) p.series = Number(data.series);
        const authLvl = (p.uKey && db.users[p.uKey] && db.users[p.uKey].state)
          ? (Number(db.users[p.uKey].state.lvl) || 1)
          : (p.lvl || 1);
        if (data.lvl != null && !p.uKey) p.lvl = Number(data.lvl);
        else p.lvl = authLvl;
        if (data.vip != null) p.vip = Number(data.vip);
        if (data.eq) p.eq = data.eq;
        if (data.zoneId != null) {
          p.zoneId = Number(data.zoneId);
          ws.send(JSON.stringify({
            type: 'zone_mobs_sync',
            zoneId: p.zoneId,
            mobs: ensureZoneMobs(p.zoneId, p.x, p.y)
          }));
        }

        ws.send(JSON.stringify({
          type: 'market_sync',
          items: serverMarket
        }));

        // Gửi gói tin đồng bộ chuẩn từ Server tới Client ngay khi kết nối
        if (p.uKey && db.users[p.uKey] && db.users[p.uKey].state) {
          const uState = db.users[p.uKey].state;
          ws.send(JSON.stringify({
            type: 'state_sync',
            gold: uState.gold,
            lvl: uState.lvl,
            xp: uState.xp,
            attrPts: uState.attrPts,
            skPts: uState.skPts,
            attr: uState.attr,
            sk: uState.sk,
            vip: uState.vip,
            pkValue: uState.pkValue || 0,
            jailUntil: uState.jailUntil || 0,
            lastPkReduceT: uState.lastPkReduceT || Date.now()
          }));
          p.pkValue = Math.max(0, Number(uState.pkValue) || 0);
          p.jailUntil = Math.max(0, Number(uState.jailUntil) || 0);
          p.lastPkReduceT = Number(uState.lastPkReduceT) || Date.now();
        }

        // Nếu client gửi tọa độ ban đầu, đồng bộ ngay
        if (data.x != null && data.y != null) {
          p.x = Number(data.x);
          p.y = Number(data.y);
        }
        if (data.mounted !== undefined) p.mounted = !!data.mounted;
        if (data.mountTier != null) p.mountTier = Number(data.mountTier) || 1;
        if (data.mount) p.mount = data.mount;
        if (data.cloakTier != null) p.cloakTier = Number(data.cloakTier) || 0;
        if (data.cloak) p.cloak = data.cloak;
        if (data.pkMode) p.pkMode = String(data.pkMode);
        if (data.pkValue != null && !p.uKey) p.pkValue = Math.max(0, Number(data.pkValue) || 0);
        if (data.jailUntil != null && !p.uKey) p.jailUntil = Math.max(0, Number(data.jailUntil) || 0);
        p.initialized = true;

        if (!wasInit) {
          // Chỉ thông báo xuất hiện tới người chơi CÙNG ZONE
          broadcastToZone(p.zoneId, {
            type: 'player_join',
            player: p
          }, ws);
          console.log(`[Multiplayer] Người chơi #${p.id} (${p.name} - ${p.username || 'Khách'}) đã vào thế giới (zone ${p.zoneId}).`);
          // Gửi danh sách người chơi & BOTS cùng zone
          const zonePlayers = Array.from(players.values())
            .filter(pl => pl.zoneId === p.zoneId && pl.id !== p.id && pl.initialized)
            .concat(BOTS.filter(b => b.zoneId === p.zoneId));
          ws.send(JSON.stringify({
            type: 'zone_players_sync',
            players: zonePlayers
          }));
        } else {
          // player_update chỉ gửi cho người cùng zone
          broadcastToZone(p.zoneId, {
            type: 'player_update',
            player: p
          }, ws);
        }
      } else if (data.type === 'move') {
        // Đồng bộ tọa độ & hành động
        const dt = (now - p.lastUpdate) / 1000;
        p.lastUpdate = now;

        const newX = Number(data.x);
        const newY = Number(data.y);

        if (!p.initialized || data.teleport) {
          p.x = newX;
          p.y = newY;
          p.initialized = true;
        } else {
          // Cho phép khoảng cách di chuyển thực tế kể cả giật lag
          const dist = Math.hypot(newX - p.x, newY - p.y);
          const maxDist = Math.max(350, 1200 * dt);
          if (dist <= maxDist) {
            p.x = newX;
            p.y = newY;
          } else {
            // Khi nhảy vọt quá xa (chuyển bản đồ / hồi thành), cập nhật luôn
            p.x = newX;
            p.y = newY;
          }
        }

        const authLvl = (p.uKey && db.users[p.uKey] && db.users[p.uKey].state)
          ? (Number(db.users[p.uKey].state.lvl) || 1)
          : (p.lvl || 1);
        if (data.lvl != null) {
          const clientLvl = Math.max(1, Math.min(200, Number(data.lvl) || 1));
          p.lvl = clientLvl;
          if (p.uKey && db.users[p.uKey] && db.users[p.uKey].state) {
            db.users[p.uKey].state.lvl = clientLvl;
          }
        } else {
          p.lvl = authLvl;
        }
        if (data.eq) p.eq = data.eq;
        if (data.dir != null) p.dir = Number(data.dir);
        if (data.face != null) p.face = Number(data.face);
        if (data.act) p.act = String(data.act);
        if (data.stage != null) p.stage = Number(data.stage);
        if (data.mounted !== undefined) p.mounted = !!data.mounted;
        if (data.mountTier != null) p.mountTier = Number(data.mountTier) || 1;
        if (data.mount) p.mount = data.mount;
        if (data.cloakTier != null) p.cloakTier = Number(data.cloakTier) || 0;
        if (data.cloak) p.cloak = data.cloak;
        if (data.pkMode) p.pkMode = String(data.pkMode);
        if (data.hp != null) p.hp = Number(data.hp);
        if (data.maxHp != null) p.maxHp = Number(data.maxHp);
        if (data.mp != null) p.mp = Number(data.mp);
        if (data.maxMp != null) p.maxMp = Number(data.maxMp);

        const curParty = getPlayerParty(p.id);
        if (curParty) {
          const mem = curParty.members.find(m => m.id === p.id);
          if (mem) {
            mem.x = p.x;
            mem.y = p.y;
            mem.lvl = p.lvl;
            mem.fac = p.fac;
            mem.zoneId = p.zoneId;
            if (p.hp != null) mem.hp = p.hp;
            if (p.maxHp != null) mem.maxHp = p.maxHp;
            if (p.mp != null) mem.mp = p.mp;
            if (p.maxMp != null) mem.maxMp = p.maxMp;
          }
        }
        if (p.jailUntil && p.jailUntil > Date.now()) {
          p.zoneId = 37; // Bị giam trong Thiên Lao / Biện Kinh, không được đổi zone
        } else if (data.zoneId != null) {
          const oldZone = p.zoneId;
          p.zoneId = Number(data.zoneId);
          if (oldZone !== p.zoneId) {
            // Thông báo cho zone CŨ: người chơi rời đi
            broadcastToZone(oldZone, {
              type: 'player_leave',
              id: p.id
            }, ws);
            // Sync quái vật cho zone mới
            ws.send(JSON.stringify({
              type: 'zone_mobs_sync',
              zoneId: p.zoneId,
              mobs: ensureZoneMobs(p.zoneId, p.x, p.y)
            }));
            // Thông báo cho zone MỚI: người chơi xuất hiện
            broadcastToZone(p.zoneId, {
              type: 'player_join',
              player: p
            }, ws);
            // Gửi cho client mới vào zone: danh sách người chơi cùng zone (bao gồm BOTS)
            const zonePlayers = Array.from(players.values())
              .filter(pl => pl.zoneId === p.zoneId && pl.id !== p.id && pl.initialized)
              .concat(BOTS.filter(b => b.zoneId === p.zoneId));
            ws.send(JSON.stringify({
              type: 'zone_players_sync',
              players: zonePlayers
            }));
          }
        }

        // Chỉ broadcast move tới người chơi CÙNG ZONE
        broadcastToZone(p.zoneId, {
          type: 'player_move',
          id: p.id,
          lvl: p.lvl,
          name: p.name,
          x: p.x,
          y: p.y,
          dir: p.dir,
          face: p.face,
          act: p.act,
          stage: p.stage,
          zoneId: p.zoneId,
          mounted: p.mounted,
          mountTier: p.mountTier,
          mount: p.mount,
          cloakTier: p.cloakTier,
          pkMode: p.pkMode,
          pkValue: p.pkValue || 0,
          jailUntil: p.jailUntil || 0,
          eq: p.eq,
          hp: p.hp,
          maxHp: p.maxHp
        }, ws);
      } else if (data.type === 'pk_mode_change') {
        if (p.jailUntil && p.jailUntil > Date.now()) {
          // Trong tù không cho đổi chế độ PK
          p.pkMode = 'peace';
        } else {
          p.pkMode = String(data.pkMode || 'peace');
        }
        broadcastToZone(p.zoneId, {
          type: 'player_pk_mode',
          id: p.id,
          pkMode: p.pkMode,
          pkValue: p.pkValue || 0
        });
      } else if (data.type === 'pvp_hit') {
        if (p.jailUntil && p.jailUntil > Date.now()) return; // Đang ở tù, không thể tấn công
        const targetId = Number(data.targetId);
        let targetWs = null, targetP = null;
        for (const [otherWs, otherP] of players.entries()) {
          if (otherP.id === targetId) {
            targetWs = otherWs;
            targetP = otherP;
            break;
          }
        }
        if (targetP && targetWs && targetP.zoneId === p.zoneId && targetP.zoneId !== 37) {
          let dmg = Number(data.dmg) || 10;
          const maxDmg = getMaxAllowedDamage(p.lvl || 1);
          if (dmg > maxDmg) dmg = maxDmg;

          targetP.hp = Math.max(0, (targetP.hp != null ? targetP.hp : 100) - dmg);

          // Gửi cho nạn nhân
          try {
            targetWs.send(JSON.stringify({
              type: 'pvp_damaged',
              attackerId: p.id,
              attackerName: p.name,
              attackerPkMode: p.pkMode || 'peace',
              dmg: dmg,
              hp: targetP.hp,
              skillId: data.skillId
            }));
          } catch (e) {}

          // Broadcast số máu cập nhật cho zone
          broadcastToZone(p.zoneId, {
            type: 'player_damaged',
            id: targetId,
            dmg: dmg,
            hp: targetP.hp,
            attackerId: p.id
          }, targetWs);

          if (targetP.hp <= 0 && !targetP._isDeadHandled) {
            targetP._isDeadHandled = true;
            setTimeout(() => { if (targetP) targetP._isDeadHandled = false; }, 3000);

            const zoneName = (JX && JX.zones && JX.zones.find(z => z.id === p.zoneId)) ? JX.zones.find(z => z.id === p.zoneId).n : 'Giang Hồ';
            const killMsg = p.pkMode === 'slaughter'
              ? `🩸 [Đồ Sát] ${p.name} đã hạ sát ${targetP.name} tại ${zoneName}!`
              : `⚔️ [Tỉ Võ PK] ${p.name} đã đánh bại ${targetP.name} tại ${zoneName}!`;
            broadcast({
              type: 'player_chat',
              fromId: 0,
              fromName: '📢 [Giang Hồ]',
              chan: 'world',
              text: killMsg,
              global: true
            });

            // 1. TĂNG ĐIỂM PK CHO KẺ ĐỒ SÁT:
            // "khi PK hay đồ sát thì người PK ĐỒ sát sẽ lên điểm PK, ĐỒ SÁT chết 1 người lên 1 điểm PK"
            if (p.pkMode === 'slaughter') {
              p.pkValue = (p.pkValue || 0) + 1;
              p.lastPkReduceT = Date.now();
              if (p.uKey && db.users[p.uKey] && db.users[p.uKey].state) {
                db.users[p.uKey].state.pkValue = p.pkValue;
                db.users[p.uKey].state.lastPkReduceT = p.lastPkReduceT;
              }

              let jailNotice = '';
              // "PK = 10 điểm sẽ bị tống vào nhà giam và không thể chơi trong 1 ngày"
              if (p.pkValue >= 10) {
                p.jailUntil = Date.now() + 24 * 60 * 60 * 1000; // 1 ngày giam cầm
                p.zoneId = 37; // Đưa về Biện Kinh (Khu an toàn / Nhà giam)
                p.x = 2150; p.y = 1130;
                if (p.uKey && db.users[p.uKey] && db.users[p.uKey].state) {
                  db.users[p.uKey].state.jailUntil = p.jailUntil;
                  db.users[p.uKey].state.zoneId = 37;
                }
                jailNotice = ` ⚖️ Điểm PK đạt ${p.pkValue}! ${p.name} đã bị Quan Phủ tống vào Thiên Lao thụ án 1 ngày!`;
                broadcast({
                  type: 'player_chat',
                  fromId: 0,
                  fromName: '⚖️ [Quan Phủ]',
                  chan: 'world',
                  text: `Ác nhân ${p.name} sát hại bừa bãi (PK: ${p.pkValue}), đã bị bắt vào Nhà Giam thụ án 1 ngày!`,
                  global: true
                });
              }

              // Thông báo và đồng bộ điểm PK tới kẻ đồ sát
              ws.send(JSON.stringify({
                type: 'pk_update',
                pkValue: p.pkValue,
                jailUntil: p.jailUntil || 0,
                lastPkReduceT: p.lastPkReduceT,
                msg: `🩸 Bạn đã đồ sát ${targetP.name}! Điểm PK tăng lên: ${p.pkValue}.${jailNotice}`
              }));
              if (p.uKey) saveDb();
            }

            // 2. NẠN NHÂN BỊ HẠ SÁT: KIỂM TRA NẾU NẠN NHÂN CÓ PK = 10 ĐIỂM
            // "PK = 10 khi bị đánh chết thì văng hết tiền và đồ đang mặc"
            const victimPk = targetP.pkValue || (targetP.uKey && db.users[targetP.uKey] && db.users[targetP.uKey].state && db.users[targetP.uKey].state.pkValue) || 0;
            const penaltyDrop = victimPk >= 10;
            try {
              targetWs.send(JSON.stringify({
                type: 'pvp_death',
                killerName: p.name,
                killerId: p.id,
                penaltyDrop: penaltyDrop,
                victimPk: victimPk
              }));
            } catch (e) {}

            if (penaltyDrop) {
              broadcast({
                type: 'player_chat',
                fromId: 0,
                fromName: '📢 [Trừ Gian]',
                chan: 'world',
                text: `💥 Đại ác nhân ${targetP.name} (PK 10) đã bị ${p.name} tiêu diệt! Toàn bộ trang bị và ngân lượng đã bị rơi sạch!`,
                global: true
              });
            }
          }
        }
      } else if (data.type === 'skill') {
        const skillId = Number(data.skillId) || 0;
        const tx = Number(data.tx);
        const ty = Number(data.ty);
        if (data.x != null) p.x = Number(data.x);
        if (data.y != null) p.y = Number(data.y);
        if (data.dir != null) p.dir = Number(data.dir);
        if (data.face != null) p.face = Number(data.face);
        p.act = 'at';

        // Chỉ gửi gói tin skill tới người chơi cùng bản đồ
        broadcastToZone(p.zoneId, {
          type: 'player_skill',
          id: p.id,
          skillId: skillId,
          tx: tx,
          ty: ty,
          x: p.x,
          y: p.y,
          dir: p.dir,
          face: p.face
        }, ws);
      } else if (data.type === 'mob_hit') {
        const mobId = Number(data.mobId);
        let dmg = Number(data.dmg) || 0;
        const zoneId = p.zoneId;
        const map = zoneMobs.get(zoneId);

        // Anti-Cheat: Giới hạn tốc độ đánh tối đa 8 lần / giây
        if (!p.hitWindowT || (now - p.hitWindowT > 1000)) {
          p.hitWindowT = now;
          p.hitsInSec = 0;
        }
        p.hitsInSec++;
        if (p.hitsInSec > 8) {
          // Vượt ngưỡng tốc độ đánh cho phép
          return;
        }

        // Anti-Cheat: Giới hạn sát thương tối đa cho phép theo cấp độ
        const maxDmg = getMaxAllowedDamage(p.lvl || 1);
        if (dmg > maxDmg) {
          console.warn(`[Anti-Cheat] Phát hiện dame ảo từ "${p.name}" (Lv.${p.lvl}): ${dmg} (Max cho phép: ${maxDmg}).`);
          dmg = maxDmg;
        }

        if (map && map.has(mobId)) {
          const mob = map.get(mobId);
          mob.hp = Math.max(0, mob.hp - dmg);

          broadcastToZone(zoneId, {
            type: 'mob_damage',
            mobId: mobId,
            hp: mob.hp,
            dmg: dmg,
            attackerId: p.id
          });

          if (mob.hp <= 0) {
            map.delete(mobId);
            const curLvl = (p.uKey && db.users[p.uKey] && db.users[p.uKey].state) ? (Number(db.users[p.uKey].state.lvl) || p.lvl || 1) : (p.lvl || 1);
            const xpL = Math.min(mob.L, curLvl + 5);
            const lvDiff = mob.L - curLvl;
            let mult = 1.0;
            if (lvDiff > 10) mult = 0.1;
            else if (lvDiff > 5) mult = 0.5;
            else if (lvDiff < -10) mult = 0.2;
            else if (lvDiff < -5) mult = 0.6;

            const reqExp = (JX && JX.exp && JX.exp[xpL - 1]) ? JX.exp[xpL - 1] : (xpL * 300);
            const party = getPlayerParty(p.id);
            const partyMul = (party && party.members.length > 1) ? (1 + (party.members.length - 1) * 0.1) : 1;
            const expGain = Math.round((reqExp / (10 + xpL * 1.4)) * (mob.cls === 'elite' ? 3.5 : 1.5) * mult * partyMul);
            const goldDrop = Math.round(mob.L * 35 * (mob.cls === 'elite' ? 4 : 2));

            // Server-Authoritative: Cập nhật trực tiếp vào cơ sở dữ liệu nhân vật
            let updatedState = null;
            if (p.uKey && db.users[p.uKey] && db.users[p.uKey].state) {
              const uState = db.users[p.uKey].state;
              uState.gold = (uState.gold || 0) + goldDrop;
              uState.lvl = Math.max(1, Math.min(200, Number(uState.lvl) || 1));
              uState.xp = (uState.xp || 0) + expGain;
              let didLevelUp = false;
              let maxServerLevels = 2;
              while (uState.lvl < 200 && maxServerLevels > 0) {
                const expNeeded = (JX && JX.exp && JX.exp[uState.lvl - 1]) ? JX.exp[uState.lvl - 1] : (uState.lvl * 1000);
                if (uState.xp < expNeeded) break;
                uState.xp -= expNeeded;
                uState.lvl++;
                uState.attrPts = (uState.attrPts || 0) + 5;
                uState.skPts = (uState.skPts || 0) + 1;
                didLevelUp = true;
                maxServerLevels--;
              }
              if (maxServerLevels <= 0) {
                const expNeeded = (JX && JX.exp && JX.exp[uState.lvl - 1]) ? JX.exp[uState.lvl - 1] : (uState.lvl * 1000);
                if (uState.xp >= expNeeded) {
                  uState.xp = Math.min(uState.xp, expNeeded * 0.95);
                }
              }
              if (didLevelUp) {
                p.lvl = uState.lvl;
                broadcastToZone(p.zoneId, {
                  type: 'player_update',
                  player: p
                });
              }
              updatedState = {
                gold: uState.gold,
                lvl: uState.lvl,
                xp: uState.xp,
                attrPts: uState.attrPts,
                skPts: uState.skPts,
                didLevelUp
              };
            }

            broadcastToZone(zoneId, {
              type: 'mob_die',
              mobId: mobId,
              killerId: p.id,
              killerName: p.name,
              exp: expGain,
              gold: goldDrop
            });

            // Hook nhiệm vụ Dã Tẩu: Tăng tiến độ tiêu diệt quái vật
            if (p.uKey && db.users[p.uKey] && db.users[p.uKey].state) {
              const dSt = db.users[p.uKey].state.datau;
              if (dSt && dSt.curTask && dSt.curTask.type === 'monster' && !dSt.completed) {
                if (!dSt.curTask.zoneId || dSt.curTask.zoneId === zoneId) {
                  dSt.curTask.progress = (dSt.curTask.progress || 0) + 1;
                  if (dSt.curTask.progress >= dSt.curTask.targetCount) {
                    dSt.curTask.progress = dSt.curTask.targetCount;
                    dSt.completed = true;
                  }
                  if (ws.readyState === 1) {
                    ws.send(JSON.stringify({
                      type: 'datau_sync',
                      streak: dSt.streak,
                      totalDone: dSt.totalDone,
                      curTask: dSt.curTask,
                      completed: dSt.completed
                    }));
                  }
                }
              }
            }

            // Hook Chiến Trường Tống Kim: Cộng điểm hạ quái chiến trường
            if (zoneId === 386) {
              const tkP = TONGKIM_SERVER.players.get(p.id);
              if (tkP) {
                tkP.mobKills = (tkP.mobKills || 0) + 1;
                const pts = 2;
                tkP.score = (tkP.score || 0) + pts;
                if (tkP.camp === 'song') TONGKIM_SERVER.songScore += pts;
                else if (tkP.camp === 'jin') TONGKIM_SERVER.jinScore += pts;
                syncTongkimToAll();
              }
            }

            // Gửi gói tin đồng bộ chuẩn từ server cho người hạ gục
            if (updatedState && ws.readyState === 1) {
              ws.send(JSON.stringify({
                type: 'state_sync',
                gold: updatedState.gold,
                lvl: updatedState.lvl,
                xp: updatedState.xp,
                attrPts: updatedState.attrPts,
                skPts: updatedState.skPts,
                didLevelUp: updatedState.didLevelUp
              }));
            }

            setTimeout(() => {
              if (players.size > 0) {
                const newMob = spawnOneMob(zoneId, p.x, p.y);
                if (newMob) {
                  broadcastToZone(zoneId, {
                    type: 'mob_spawn',
                    zoneId: zoneId,
                    mob: newMob
                  });
                }
              }
            }, 200);
          }
        }
      } else if (data.type === 'alloc_attr') {
        if (p.uKey && db.users[p.uKey] && db.users[p.uKey].state) {
          const uState = db.users[p.uKey].state;
          const key = String(data.attr);
          const amount = Math.max(1, Math.floor(Number(data.amount) || 1));
          if (['str', 'dex', 'vit', 'eng'].includes(key) && (uState.attrPts || 0) >= amount) {
            uState.attrPts -= amount;
            if (!uState.attr) uState.attr = { str: 0, dex: 0, vit: 0, eng: 0 };
            uState.attr[key] = (uState.attr[key] || 0) + amount;
            ws.send(JSON.stringify({
              type: 'state_sync',
              attrPts: uState.attrPts,
              attr: uState.attr
            }));
          }
        }
      } else if (data.type === 'alloc_skill') {
        if (p.uKey && db.users[p.uKey] && db.users[p.uKey].state) {
          const uState = db.users[p.uKey].state;
          const skillId = Number(data.skillId);
          if (skillId && (uState.skPts || 0) >= 1) {
            if (!uState.sk) uState.sk = {};
            const curRank = uState.sk[skillId] || 0;
            if (curRank < 20) {
              uState.skPts -= 1;
              uState.sk[skillId] = curRank + 1;
              ws.send(JSON.stringify({
                type: 'state_sync',
                skPts: uState.skPts,
                sk: uState.sk
              }));
            }
          }
        }
      } else if (data.type === 'change_faction') {
        const fac = String(data.fac);
        if (fac) {
          p.fac = fac;
          if (data.series != null) p.series = Number(data.series);
          if (p.uKey && db.users[p.uKey] && db.users[p.uKey].state) {
            db.users[p.uKey].state.fac = fac;
            db.users[p.uKey].fac = fac;
            if (data.sk) db.users[p.uKey].state.sk = data.sk;
            if (data.skPts != null) db.users[p.uKey].state.skPts = Number(data.skPts);
            if (data.main != null) db.users[p.uKey].state.main = Number(data.main);
            if (data.slots) db.users[p.uKey].state.slots = data.slots;
            saveDb();
            // Xác nhận trạng thái chuẩn sau khi đổi phái
            ws.send(JSON.stringify({
              type: 'state_sync',
              skPts: db.users[p.uKey].state.skPts,
              sk: db.users[p.uKey].state.sk
            }));
          }
          broadcastToZone(p.zoneId, {
            type: 'player_update',
            player: p
          });
          console.log(`[Multiplayer] Người chơi #${p.id} (${p.name}) đã chuyển sang môn phái ${fac}.`);
        }
      } else if (data.type === 'get_zone_mobs') {
        const zoneId = p.zoneId || 2;
        const mobs = ensureZoneMobs(zoneId, p.x, p.y);
        ws.send(JSON.stringify({
          type: 'zone_mobs_sync',
          zoneId: zoneId,
          mobs: mobs
        }));
      } else if (data.type === 'chat') {
        const text = String(data.text || '').trim().slice(0, 80);
        if (!text) return;

        p.chat = text;
        p.chatT = now;
        const chan = data.chan === 'trade' ? 'trade' : (data.chan || 'world');

        console.log(`[Chat] [${chan}] [VIP ${p.vip}] ${p.name}: ${text}`);

        broadcast({
          type: 'player_chat',
          id: p.id,
          name: p.name,
          vip: p.vip,
          chan: chan,
          text: text
        });

        // Kiểm tra phản hồi thông minh từ BOT
        const tLower = text.toLowerCase();
        let targetBot = null;
        for (const b of BOTS) {
          if (tLower.includes(b.name.toLowerCase())) {
            targetBot = b;
            break;
          }
        }
        if (!targetBot) {
          const zoneBots = BOTS.filter(b => b.zoneId === p.zoneId);
          if (zoneBots.length > 0 && (chan === 'trade' || tLower.includes('mua') || tLower.includes('giá') || tLower.includes('bán') || tLower.includes('bớt') || tLower.includes('giảm') || tLower.includes('gd') || tLower.includes('trade') || tLower.includes('alo') || tLower.includes('bot') || /\d+/.test(tLower))) {
            targetBot = zoneBots[0];
          }
        }
        if (targetBot) {
          handleBotChatResponse(targetBot, p, ws, text);
        }
      } else if (data.type === 'market_post') {
        const price = Math.max(10, Math.floor(Number(data.price) || 100));
        const itemObj = {
          id: ++nextMarketId,
          sellerId: p.id,
          sellerName: p.name,
          it: data.it,
          price: price,
          time: now
        };
        serverMarket.push(itemObj);
        if (serverMarket.length > 60) serverMarket.shift();

        broadcast({
          type: 'market_sync',
          items: serverMarket
        });

        broadcast({
          type: 'player_chat',
          id: p.id,
          name: p.name,
          vip: p.vip,
          chan: 'trade',
          text: `Vừa đăng bán [${data.it ? data.it.n : 'Trang Bị'}] giá ${price} lượng lên Chợ Đen!`
        });
      } else if (data.type === 'market_buy') {
        const marketId = Number(data.marketId);
        const idx = serverMarket.findIndex(x => x.id === marketId);
        if (idx !== -1) {
          const itemObj = serverMarket[idx];
          serverMarket.splice(idx, 1);
          broadcast({
            type: 'market_sync',
            items: serverMarket
          });
          // Gửi tiền cho người bán nếu đang online
          for (const [otherWs, otherP] of players.entries()) {
            if (otherP.id === itemObj.sellerId && otherWs.readyState === 1) {
              otherWs.send(JSON.stringify({
                type: 'market_sold',
                gold: itemObj.price,
                itemName: itemObj.it.n
              }));
              break;
            }
          }
        }
      } else if (data.type === 'market_cancel') {
        const marketId = Number(data.marketId);
        const idx = serverMarket.findIndex(x => x.id === marketId && x.sellerId === p.id);
        if (idx !== -1) {
          serverMarket.splice(idx, 1);
          broadcast({
            type: 'market_sync',
            items: serverMarket
          });
        }
      } else if (data.type === 'party_create') {
        let party = getPlayerParty(p.id);
        if (!party) {
          const partyId = ++nextPartyId;
          party = {
            id: partyId,
            leaderId: p.id,
            leaderName: p.name,
            members: [{
              id: p.id,
              name: p.name,
              fac: p.fac,
              series: p.series,
              lvl: p.lvl,
              x: p.x,
              y: p.y,
              hp: p.hp || 100,
              maxHp: p.maxHp || 100,
              mp: p.mp || 100,
              maxMp: p.maxMp || 100,
              zoneId: p.zoneId
            }]
          };
          serverParties.set(partyId, party);
        }
        broadcastParty(party);
      } else if (data.type === 'party_invite') {
        const targetId = Number(data.targetId);
        const bot = BOTS.find(b => b.id === targetId);
        if (bot) {
          let party = getPlayerParty(p.id);
          if (!party) {
            const partyId = ++nextPartyId;
            party = {
              id: partyId,
              leaderId: p.id,
              leaderName: p.name,
              members: [{
                id: p.id,
                name: p.name,
                fac: p.fac,
                series: p.series,
                lvl: p.lvl,
                x: p.x,
                y: p.y,
                hp: p.hp || 100,
                maxHp: p.maxHp || 100,
                mp: p.mp || 100,
                maxMp: p.maxMp || 100,
                zoneId: p.zoneId
              }]
            };
            serverParties.set(partyId, party);
            broadcastParty(party);
          }
          if (party.members.length < 8 && !party.members.some(m => m.id === bot.id)) {
            party.members.push({
              id: bot.id,
              name: bot.name,
              fac: bot.fac,
              series: bot.series,
              lvl: bot.lvl,
              x: bot.x,
              y: bot.y,
              hp: bot.hp || 1000,
              maxHp: bot.maxHp || 1000,
              mp: bot.mp || 800,
              maxMp: bot.maxMp || 800,
              zoneId: bot.zoneId
            });
            broadcastParty(party);
            ws.send(JSON.stringify({
              type: 'toast',
              msg: `[Tổ Đội] ${bot.name} đã gia nhập đội ngũ luyện công!`
            }));
            broadcastToZone(bot.zoneId, {
              type: 'player_chat',
              id: bot.id,
              name: bot.name,
              vip: bot.vip,
              chan: 'team',
              text: `Chào các huynh đệ! Cùng nhau cày cấp nhé!`
            });
          }
          return;
        }
        const targetEntry = Array.from(players.entries()).find(([w, pl]) => pl.id === targetId);
        if (targetEntry) {
          let party = getPlayerParty(p.id);
          if (!party) {
            const partyId = ++nextPartyId;
            party = {
              id: partyId,
              leaderId: p.id,
              leaderName: p.name,
              members: [{
                id: p.id,
                name: p.name,
                fac: p.fac,
                series: p.series,
                lvl: p.lvl,
                x: p.x,
                y: p.y,
                hp: p.hp || 100,
                maxHp: p.maxHp || 100,
                mp: p.mp || 100,
                maxMp: p.maxMp || 100,
                zoneId: p.zoneId
              }]
            };
            serverParties.set(partyId, party);
            broadcastParty(party);
          }
          if (targetEntry[0].readyState === 1) {
            targetEntry[0].send(JSON.stringify({
              type: 'party_invite_req',
              fromId: p.id,
              fromName: p.name,
              partyId: party.id
            }));
          }
        }
      } else if (data.type === 'party_accept') {
        const partyId = Number(data.partyId);
        const party = serverParties.get(partyId);
        if (party && party.members.length < 8) {
          const oldParty = getPlayerParty(p.id);
          if (oldParty && oldParty.id !== partyId) {
            oldParty.members = oldParty.members.filter(m => m.id !== p.id);
            if (oldParty.members.length === 0) serverParties.delete(oldParty.id);
            else broadcastParty(oldParty);
          }
          if (!party.members.some(m => m.id === p.id)) {
            party.members.push({
              id: p.id,
              name: p.name,
              fac: p.fac,
              series: p.series,
              lvl: p.lvl,
              x: p.x,
              y: p.y,
              hp: p.hp || 100,
              maxHp: p.maxHp || 100,
              mp: p.mp || 100,
              maxMp: p.maxMp || 100,
              zoneId: p.zoneId
            });
          }
          broadcastParty(party);
        }
      } else if (data.type === 'party_leave') {
        const party = getPlayerParty(p.id);
        if (party) {
          party.members = party.members.filter(m => m.id !== p.id);
          ws.send(JSON.stringify({ type: 'party_sync', party: null }));
          if (party.members.length === 0) {
            serverParties.delete(party.id);
          } else {
            if (party.leaderId === p.id) {
              party.leaderId = party.members[0].id;
              party.leaderName = party.members[0].name;
            }
            broadcastParty(party);
          }
        }
      } else if (data.type === 'party_kick') {
        const party = getPlayerParty(p.id);
        const targetId = Number(data.targetId);
        if (party && party.leaderId === p.id && targetId !== p.id) {
          party.members = party.members.filter(m => m.id !== targetId);
          const targetEntry = Array.from(players.entries()).find(([w, pl]) => pl.id === targetId);
          if (targetEntry && targetEntry[0].readyState === 1) {
            targetEntry[0].send(JSON.stringify({ type: 'party_sync', party: null }));
          }
          broadcastParty(party);
        }
      } else if (data.type === 'party_transfer') {
        const party = getPlayerParty(p.id);
        const targetId = Number(data.targetId);
        if (party && party.leaderId === p.id && targetId !== p.id) {
          const targetMem = party.members.find(m => m.id === targetId);
          if (targetMem) {
            party.leaderId = targetId;
            party.leaderName = targetMem.name;
            broadcastParty(party);
          }
        }
      // ==========================================
      // XỬ LÝ GIAO DỊCH (TRADE MESSAGES)
      // ==========================================
      } else if (data.type === 'trade_req') {
        const targetId = Number(data.targetId);
        if (playerTradeMap.has(p.id)) {
          ws.send(JSON.stringify({ type: 'toast', msg: 'Bạn đang trong một giao dịch khác' }));
          return;
        }
        if (playerTradeMap.has(targetId)) {
          ws.send(JSON.stringify({ type: 'toast', msg: 'Đối phương đang bận giao dịch' }));
          return;
        }
        const bot = BOTS.find(b => b.id === targetId);
        if (bot) {
          const tid = ++nextTradeId;
          const botItem = (bot.sellItems && bot.sellItems[0]) ? Object.assign({}, bot.sellItems[0]) : { uid: bot.id * 100 + 1, n: 'Bảo Đao', price: 1000, r: 3, lvl: 40 };
          const session = {
            id: tid,
            p1: { id: p.id, name: p.name, lvl: p.lvl, uKey: p.uKey, items: [], money: 0, locked: false, confirmed: false },
            p2: { id: bot.id, name: bot.name, lvl: bot.lvl, isBot: true, botObj: bot, items: [botItem], money: 0, locked: true, confirmed: false }
          };
          activeTrades.set(tid, session);
          playerTradeMap.set(p.id, tid);
          playerTradeMap.set(bot.id, tid);
          syncTradeSession(session);
          ws.send(JSON.stringify({
            type: 'toast',
            msg: `[Giao Dịch] ${bot.name} đã chấp nhận giao dịch và đưa [${botItem.n}] lên sàn!`
          }));
          return;
        }
        const tEntry = Array.from(players.entries()).find(([w, pl]) => pl.id === targetId);
        if (tEntry && tEntry[0].readyState === 1) {
          tEntry[0].send(JSON.stringify({
            type: 'trade_req_prompt',
            fromId: p.id,
            fromName: p.name,
            fromLvl: p.lvl
          }));
        }
      } else if (data.type === 'trade_accept') {
        const targetId = Number(data.targetId);
        if (playerTradeMap.has(p.id) || playerTradeMap.has(targetId)) return;
        const bot = BOTS.find(b => b.id === targetId);
        if (bot) {
          const tid = ++nextTradeId;
          const botItem = (bot.sellItems && bot.sellItems[0]) ? Object.assign({}, bot.sellItems[0]) : { uid: bot.id * 100 + 1, n: 'Bảo Đao', price: 1000, r: 3, lvl: 40 };
          const session = {
            id: tid,
            p1: { id: p.id, name: p.name, lvl: p.lvl, uKey: p.uKey, items: [], money: 0, locked: false, confirmed: false },
            p2: { id: bot.id, name: bot.name, lvl: bot.lvl, isBot: true, botObj: bot, items: [botItem], money: 0, locked: true, confirmed: false }
          };
          activeTrades.set(tid, session);
          playerTradeMap.set(p.id, tid);
          playerTradeMap.set(bot.id, tid);
          syncTradeSession(session);
          return;
        }
        const tEntry = Array.from(players.entries()).find(([w, pl]) => pl.id === targetId);
        if (!tEntry) return;
        const targetPl = tEntry[1];
        const tid = ++nextTradeId;
        const session = {
          id: tid,
          p1: { id: targetPl.id, name: targetPl.name, lvl: targetPl.lvl, uKey: targetPl.uKey, items: [], money: 0, locked: false, confirmed: false },
          p2: { id: p.id, name: p.name, lvl: p.lvl, uKey: p.uKey, items: [], money: 0, locked: false, confirmed: false }
        };
        activeTrades.set(tid, session);
        playerTradeMap.set(p.id, tid);
        playerTradeMap.set(targetPl.id, tid);
        syncTradeSession(session);
      } else if (data.type === 'trade_decline') {
        const targetId = Number(data.targetId);
        const tEntry = Array.from(players.entries()).find(([w, pl]) => pl.id === targetId);
        if (tEntry && tEntry[0].readyState === 1) {
          tEntry[0].send(JSON.stringify({ type: 'trade_cancelled', reason: `${p.name} đã từ chối giao dịch` }));
        }
      } else if (data.type === 'trade_set_item') {
        const s = getTradeSession(p.id);
        if (!s) return;
        const me = (s.p1.id === p.id) ? s.p1 : s.p2;
        if (me.locked) return;
        const uState = (p.uKey && db.users[p.uKey]) ? db.users[p.uKey].state : null;
        if (!uState || !uState.inv) return;

        if (data.action === 'add') {
          const it = uState.inv.find(x => x.uid === Number(data.itemUid));
          if (it && !me.items.some(x => x.uid === it.uid) && me.items.length < 16) {
            me.items.push(it);
            s.p1.locked = false; s.p2.locked = false;
            s.p1.confirmed = false; s.p2.confirmed = false;
            syncTradeSession(s);
          }
        } else if (data.action === 'remove') {
          me.items = me.items.filter(x => x.uid !== Number(data.itemUid));
          s.p1.locked = false; s.p2.locked = false;
          s.p1.confirmed = false; s.p2.confirmed = false;
          syncTradeSession(s);
        }
      } else if (data.type === 'trade_set_money') {
        const s = getTradeSession(p.id);
        if (!s) return;
        const me = (s.p1.id === p.id) ? s.p1 : s.p2;
        if (me.locked) return;
        const uState = (p.uKey && db.users[p.uKey]) ? db.users[p.uKey].state : null;
        const maxGold = uState ? (uState.gold || 0) : 0;
        const amt = Math.max(0, Math.min(maxGold, Math.floor(Number(data.money) || 0)));
        me.money = amt;
        s.p1.locked = false;
        if (!s.p2.isBot) s.p2.locked = false;
        s.p1.confirmed = false;
        s.p2.confirmed = false;
        syncTradeSession(s);
      } else if (data.type === 'trade_lock') {
        const s = getTradeSession(p.id);
        if (!s) return;
        const me = (s.p1.id === p.id) ? s.p1 : s.p2;
        me.locked = true;
        syncTradeSession(s);

        if (s.p2.isBot) {
          s.p2.locked = true;
          syncTradeSession(s);
          setTimeout(() => {
            if (activeTrades.has(s.id)) {
              s.p2.confirmed = true;
              syncTradeSession(s);
            }
          }, 600);
        }
      } else if (data.type === 'trade_confirm') {
        const s = getTradeSession(p.id);
        if (!s) return;
        if (!s.p1.locked || !s.p2.locked) return;
        const me = (s.p1.id === p.id) ? s.p1 : s.p2;
        me.confirmed = true;
        if (s.p2.isBot) s.p2.confirmed = true;
        syncTradeSession(s);

        if (s.p1.confirmed && s.p2.confirmed) {
          if (s.p2.isBot) {
            const u1 = (s.p1.uKey && db.users[s.p1.uKey]) ? db.users[s.p1.uKey].state : null;
            if (u1) {
              const p1Uids = new Set(s.p1.items.map(x => x.uid));
              u1.inv = (u1.inv || []).filter(x => !p1Uids.has(x.uid)).concat(s.p2.items);
              u1.gold = Math.max(0, (u1.gold || 0) - s.p1.money);
              saveDb();
            }
            const e1 = Array.from(players.entries()).find(([w, pl]) => pl.id === s.p1.id);
            if (e1 && e1[0].readyState === 1) {
              e1[0].send(JSON.stringify({ type: 'trade_complete' }));
              if (u1) e1[0].send(JSON.stringify({ type: 'state_sync', gold: u1.gold, inv: u1.inv }));
              e1[0].send(JSON.stringify({ type: 'toast', msg: `Giao dịch cùng ${s.p2.name} thành công!` }));
            }
            broadcastToZone(p.zoneId, {
              type: 'player_chat',
              id: s.p2.id,
              name: s.p2.name,
              vip: s.p2.botObj ? s.p2.botObj.vip : 3,
              chan: 'near',
              text: `Giao dịch thành công! Đa tạ đại hiệp ${p.name} đã ủng hộ!`
            });
            activeTrades.delete(s.id);
            playerTradeMap.delete(s.p1.id);
            playerTradeMap.delete(s.p2.id);
            return;
          }

          const u1 = (s.p1.uKey && db.users[s.p1.uKey]) ? db.users[s.p1.uKey].state : null;
          const u2 = (s.p2.uKey && db.users[s.p2.uKey]) ? db.users[s.p2.uKey].state : null;
          if (u1 && u2) {
            const p1Uids = new Set(s.p1.items.map(x => x.uid));
            const p2Uids = new Set(s.p2.items.map(x => x.uid));

            u1.inv = (u1.inv || []).filter(x => !p1Uids.has(x.uid)).concat(s.p2.items);
            u2.inv = (u2.inv || []).filter(x => !p2Uids.has(x.uid)).concat(s.p1.items);

            u1.gold = (u1.gold || 0) - s.p1.money + s.p2.money;
            u2.gold = (u2.gold || 0) - s.p2.money + s.p1.money;

            saveDb();
          }

          const e1 = Array.from(players.entries()).find(([w, pl]) => pl.id === s.p1.id);
          const e2 = Array.from(players.entries()).find(([w, pl]) => pl.id === s.p2.id);

          if (e1 && e1[0].readyState === 1) {
            e1[0].send(JSON.stringify({ type: 'trade_complete' }));
            if (u1) e1[0].send(JSON.stringify({ type: 'state_sync', gold: u1.gold, inv: u1.inv }));
          }
          if (e2 && e2[0].readyState === 1) {
            e2[0].send(JSON.stringify({ type: 'trade_complete' }));
            if (u2) e2[0].send(JSON.stringify({ type: 'state_sync', gold: u2.gold, inv: u2.inv }));
          }

          activeTrades.delete(s.id);
          playerTradeMap.delete(s.p1.id);
          playerTradeMap.delete(s.p2.id);
        }
      } else if (data.type === 'trade_cancel') {
        const s = getTradeSession(p.id);
        if (s) cancelTradeSession(s.id, `${p.name} đã hủy giao dịch`);
      // ==========================================
      // XỬ LÝ NHIỆM VỤ DÃ TẨU (DA TAU MESSAGES)
      // ==========================================
      } else if (data.type === 'datau_info') {
        const uSt = (p.uKey && db.users[p.uKey]) ? db.users[p.uKey].state : (p.state = p.state || { lvl: p.lvl, gold: 100000 });
        const dSt = ensurePlayerDatau(uSt);
        ws.send(JSON.stringify({
          type: 'datau_sync',
          streak: dSt.streak,
          totalDone: dSt.totalDone,
          curTask: dSt.curTask,
          completed: dSt.completed
        }));
      } else if (data.type === 'datau_accept') {
        const uSt = (p.uKey && db.users[p.uKey]) ? db.users[p.uKey].state : (p.state = p.state || { lvl: p.lvl, gold: 100000 });
        const dSt = ensurePlayerDatau(uSt);
        if (!dSt.curTask) {
          dSt.curTask = generateDatauTask(p.lvl || 1);
          dSt.completed = false;
          if (p.uKey) saveDb();
        }
        ws.send(JSON.stringify({
          type: 'datau_sync',
          streak: dSt.streak,
          totalDone: dSt.totalDone,
          curTask: dSt.curTask,
          completed: dSt.completed
        }));
      } else if (data.type === 'datau_check') {
        if (p.uKey && db.users[p.uKey]) {
          const uSt = db.users[p.uKey].state;
          const dSt = ensurePlayerDatau(uSt);
          if (dSt.curTask && !dSt.completed) {
            if (dSt.curTask.type === 'monster' || dSt.curTask.type === 'exp') {
              if ((dSt.curTask.progress || 0) >= dSt.curTask.targetCount) {
                dSt.completed = true;
              }
            } else if (dSt.curTask.type === 'equip_common' && uSt.inv) {
              const idx = uSt.inv.findIndex(x => x.n === dSt.curTask.itemName);
              if (idx >= 0) {
                uSt.inv.splice(idx, 1);
                dSt.progress = 1;
                dSt.completed = true;
                saveDb();
                ws.send(JSON.stringify({ type: 'state_sync', inv: uSt.inv }));
              }
            } else if (dSt.curTask.type === 'material') {
              const idx = (uSt.inv || []).findIndex(x => x.n && x.n.includes(dSt.curTask.itemName));
              if (idx >= 0) {
                uSt.inv.splice(idx, 1);
                dSt.progress = 1;
                dSt.completed = true;
                saveDb();
                ws.send(JSON.stringify({ type: 'state_sync', inv: uSt.inv }));
              }
            }
            ws.send(JSON.stringify({
              type: 'datau_sync',
              streak: dSt.streak,
              totalDone: dSt.totalDone,
              curTask: dSt.curTask,
              completed: dSt.completed
            }));
          }
        }
      } else if (data.type === 'datau_claim') {
        if (p.uKey && db.users[p.uKey]) {
          const uSt = db.users[p.uKey].state;
          const dSt = ensurePlayerDatau(uSt);
          if (dSt.completed) {
            const pLvl = uSt.lvl || 1;
            const choice = data.choice || 'exp';
            if (choice === 'exp') {
              const expR = pLvl * 8000 * (1 + (dSt.streak % 100) * 0.02);
              uSt.xp = (uSt.xp || 0) + expR;
            } else if (choice === 'money') {
              const goldR = pLvl * 2000 * (1 + (dSt.streak % 100) * 0.02);
              uSt.gold = (uSt.gold || 0) + goldR;
            } else {
              const roll = Math.random();
              const gem = roll < 0.5 ? 'Lam Thủy Tinh' : roll < 0.8 ? 'Tử Thủy Tinh' : 'Lục Thủy Tinh';
              const rewardItem = { uid: Date.now(), n: gem, k: 4, ic: 'img/i/g51.png', r: 3, price: 50000 };
              uSt.inv = (uSt.inv || []).concat([rewardItem]);
            }

            dSt.streak = (dSt.streak || 0) + 1;
            dSt.totalDone = (dSt.totalDone || 0) + 1;

            const milestones = [10, 20, 50, 100, 200, 500, 1000];
            if (milestones.includes(dSt.streak)) {
              uSt.gold = (uSt.gold || 0) + dSt.streak * 5000;
              uSt.xp = (uSt.xp || 0) + dSt.streak * 15000;
              broadcast({
                type: 'player_chat',
                fromId: 0,
                fromName: '📢 [Dã Tẩu]',
                zoneId: p.zoneId,
                text: `Chúc mừng hiệp khách ${p.name} đã hoàn thành mốc ${dSt.streak} chuỗi nhiệm vụ Dã Tẩu!`,
                global: true
              });
            }

            dSt.curTask = null;
            dSt.completed = false;
            saveDb();

            ws.send(JSON.stringify({
              type: 'datau_sync',
              streak: dSt.streak,
              totalDone: dSt.totalDone,
              curTask: null,
              completed: false
            }));
            ws.send(JSON.stringify({
              type: 'state_sync',
              gold: uSt.gold,
              xp: uSt.xp,
              inv: uSt.inv
            }));
          }
        }
      } else if (data.type === 'datau_skip') {
        if (p.uKey && db.users[p.uKey]) {
          const uSt = db.users[p.uKey].state;
          const dSt = ensurePlayerDatau(uSt);
          if ((uSt.gold || 0) >= 10000) {
            uSt.gold -= 10000;
            dSt.curTask = null;
            dSt.completed = false;
            saveDb();
            ws.send(JSON.stringify({
              type: 'datau_sync',
              streak: dSt.streak,
              totalDone: dSt.totalDone,
              curTask: null,
              completed: false
            }));
            ws.send(JSON.stringify({ type: 'state_sync', gold: uSt.gold }));
          }
        }
      // ==========================================
      // XỬ LÝ CHIẾN TRƯỜNG TỐNG KIM (TONG KIM)
      // ==========================================
      } else if (data.type === 'tongkim_join') {
        if (TONGKIM_SERVER.phase === 'idle') {
          const mins = Math.ceil(TONGKIM_SERVER.timeLeft / 60);
          ws.send(JSON.stringify({
            type: 'player_chat',
            fromId: 0,
            fromName: '📢 [Tống Kim]',
            text: `Chiến trường hiện đang tạm nghỉ. Trận kế tiếp sẽ mở báo danh sau ${mins} phút nữa (vào đầu giờ tiếp theo)!`
          }));
          return;
        }
        let camp = data.camp;
        if (!camp || camp === 'auto') {
          let songC = 0, jinC = 0;
          for (const pl of TONGKIM_SERVER.players.values()) {
            if (pl.camp === 'song') songC++;
            else jinC++;
          }
          camp = songC <= jinC ? 'song' : 'jin';
        }
        TONGKIM_SERVER.players.set(p.id, {
          id: p.id,
          name: p.name,
          fac: p.fac,
          camp: camp,
          kills: 0,
          score: 0,
          combo: 0
        });
        p.zoneId = 386;
        p.x = camp === 'song' ? 800 : 2600;
        p.y = TONGKIM_SERVER.phase === 'staging' ? 1100 : 1350;
        broadcastToZone(386, { type: 'player_enter', player: p });
        syncTongkimToAll();
      } else if (data.type === 'tongkim_leave') {
        TONGKIM_SERVER.players.delete(p.id);
        p.zoneId = 37;
        p.x = 1000; p.y = 1000;
        broadcastToZone(37, { type: 'player_enter', player: p });
        syncTongkimToAll();
      } else if (data.type === 'tongkim_pvp_kill') {
        const victimId = Number(data.victimId);
        const killerTK = TONGKIM_SERVER.players.get(p.id);
        const victimTK = TONGKIM_SERVER.players.get(victimId);
        if (killerTK && victimTK && killerTK.camp !== victimTK.camp) {
          killerTK.kills = (killerTK.kills || 0) + 1;
          killerTK.combo = (killerTK.combo || 0) + 1;
          victimTK.combo = 0;
          const pts = 20;
          killerTK.score = (killerTK.score || 0) + pts;
          if (killerTK.camp === 'song') TONGKIM_SERVER.songScore += pts;
          else TONGKIM_SERVER.jinScore += pts;

          let comboTitle = '';
          if (killerTK.combo === 3) comboTitle = '⚔️ LIÊN TRẢM (3 mạng)';
          else if (killerTK.combo === 5) comboTitle = '🔥 ĐẠI SÁT TỨ PHƯƠNG (5 mạng)';
          else if (killerTK.combo >= 10) comboTitle = '⚡ THIÊN HẠ VÔ SONG (10+ mạng)';

          if (comboTitle) {
            broadcast({
              type: 'player_chat',
              fromId: 0,
              fromName: '📢 [Tống Kim]',
              zoneId: 386,
              text: `${p.name} (${killerTK.camp === 'song' ? 'Tống' : 'Kim'}) đạt ${comboTitle}!`,
              global: true
            });
          }
          syncTongkimToAll();
        }
      } else if (data.type === 'tongkim_buy') {
        const uKey = p.uKey;
        if (uKey && db.users[uKey]) {
          const uSt = db.users[uKey].state;
          const bal = getPlayerQuanco(uKey);
          const itemId = data.itemId;
          const PRICES = { mount: 1000, card: 250, box: 300, potion: 100 };
          const cost = PRICES[itemId] || 999999;
          if (bal >= cost) {
            addPlayerQuanco(uKey, -cost);
            if (itemId === 'mount') {
              uSt.mount = { id: 'tk_horse', n: 'Chiến Mã Tống Kim', spd: 1.5, dodge: 150 };
            } else if (itemId === 'box') {
              const roll = Math.random();
              const gem = roll < 0.4 ? 'Lam Thủy Tinh' : roll < 0.7 ? 'Tử Thủy Tinh' : 'Huyền Tinh cấp 5';
              uSt.inv = (uSt.inv || []).concat([{ uid: Date.now(), n: gem, k: 4, ic: 'img/i/g51.png', r: 3 }]);
            }
            saveDb();
            ws.send(JSON.stringify({
              type: 'toast',
              msg: `Đổi thành công vật phẩm Quân Nhu! Điểm Quân Công còn: ${getPlayerQuanco(uKey)}`
            }));
            ws.send(JSON.stringify({ type: 'state_sync', inv: uSt.inv, mount: uSt.mount }));
            syncTongkimToAll();
          } else {
            ws.send(JSON.stringify({ type: 'toast', msg: `Không đủ Điểm Quân Công (Cần ${cost})!` }));
          }
        }
      // ==========================================
      // XỬ LÝ BÀY BÁN HÀNG RONG (PLAYER STALL)
      // ==========================================
      } else if (data.type === 'stall_open') {
        const title = String(data.title || 'Tiệm Tạp Hóa').slice(0, 32);
        const items = Array.isArray(data.items) ? data.items.slice(0, 12) : [];
        p.stall = { title, items };
        broadcastToZone(p.zoneId, {
          type: 'stall_sync',
          playerId: p.id,
          stall: p.stall
        });
        ws.send(JSON.stringify({ type: 'toast', msg: `Mở sạp hàng [${title}] thành công!` }));
      } else if (data.type === 'stall_close') {
        p.stall = null;
        broadcastToZone(p.zoneId, {
          type: 'stall_sync',
          playerId: p.id,
          stall: null
        });
      } else if (data.type === 'stall_buy') {
        const sellerId = Number(data.sellerId);
        const itemUid = Number(data.itemUid);
        let seller = Array.from(players.values()).find(pl => pl.id === sellerId) || BOTS.find(b => b.id === sellerId);
        let sellerWs = null;
        for (const [sock, pl] of players.entries()) {
          if (pl.id === sellerId) { sellerWs = sock; break; }
        }

        if (!seller || !seller.stall || !Array.isArray(seller.stall.items)) {
          ws.send(JSON.stringify({ type: 'toast', msg: 'Sạp hàng này không tồn tại hoặc đã đóng!' }));
        } else {
          const stallIt = seller.stall.items.find(x => x.uid === itemUid);
          if (!stallIt) {
            ws.send(JSON.stringify({ type: 'toast', msg: 'Vật phẩm đã được người khác mua trước!' }));
          } else {
            const price = Number(stallIt.price) || 0;
            const buyerUser = (p.uKey && db.users[p.uKey]) ? db.users[p.uKey] : null;

            if (!buyerUser) {
              ws.send(JSON.stringify({ type: 'toast', msg: 'Lỗi đồng bộ tài khoản!' }));
            } else if ((buyerUser.state.gold || 0) < price) {
              ws.send(JSON.stringify({ type: 'toast', msg: 'Không đủ ngân lượng để thanh toán!' }));
            } else {
              // Thực hiện giao dịch nguyên tử
              buyerUser.state.gold -= price;

              // Chuyển vật phẩm vào hành trang người mua
              if (!Array.isArray(buyerUser.state.inv)) buyerUser.state.inv = [];
              buyerUser.state.inv.push(stallIt);

              // Cập nhật sạp hàng của người bán
              seller.stall.items = seller.stall.items.filter(x => x.uid !== itemUid);

              if (!seller.isBot) {
                const sellerUser = (seller.uKey && db.users[seller.uKey]) ? db.users[seller.uKey] : null;
                if (sellerUser) {
                  sellerUser.state.gold = (sellerUser.state.gold || 0) + price;
                  if (Array.isArray(sellerUser.state.inv)) {
                    sellerUser.state.inv = sellerUser.state.inv.filter(x => x.uid !== itemUid);
                  }
                }
              }
              saveDb();

              // Gửi cập nhật cho người mua
              ws.send(JSON.stringify({
                type: 'state_sync',
                gold: buyerUser.state.gold,
                inv: buyerUser.state.inv
              }));
              ws.send(JSON.stringify({
                type: 'toast',
                msg: `Mua thành công [${stallIt.n}] với giá ${price} lượng!`
              }));

              // Nếu người bán là Bot, Bot cảm ơn trên kênh gần
              if (seller.isBot) {
                broadcastToZone(seller.zoneId, {
                  type: 'player_chat',
                  id: seller.id,
                  name: seller.name,
                  vip: seller.vip,
                  chan: 'near',
                  text: `Đa tạ đại hiệp ${p.name} đã ghé mua [${stallIt.n}]! Chúc đại hiệp sớm xưng bá võ lâm!`
                });
              } else if (sellerWs && sellerWs.readyState === 1) {
                const sellerUser = (seller.uKey && db.users[seller.uKey]) ? db.users[seller.uKey] : null;
                if (sellerUser) {
                  sellerWs.send(JSON.stringify({
                    type: 'state_sync',
                    gold: sellerUser.state.gold,
                    inv: sellerUser.state.inv
                  }));
                }
                sellerWs.send(JSON.stringify({
                  type: 'toast',
                  msg: `[Sạp Hàng] Hiệp khách ${p.name} đã mua [${stallIt.n}] (+${price} lượng)!`
                }));
              }

              // Đồng bộ lại sạp hàng trên toàn khu vực
              broadcastToZone(seller.zoneId, {
                type: 'stall_sync',
                playerId: seller.id,
                stall: seller.stall.items.length > 0 ? seller.stall : null
              });
            }
          }
        }
      }
    } catch (e) {
      console.error('[Multiplayer] Message error:', e);
    }
  });

  ws.on('close', () => {
    const p = players.get(ws);
    if (p) {
      console.log(`[Multiplayer] Người chơi #${p.id} (${p.name}) đã rời game.`);
      // Tự động đóng sạp hàng nếu đang mở
      if (p.stall) {
        p.stall = null;
        broadcastToZone(p.zoneId, {
          type: 'stall_sync',
          playerId: p.id,
          stall: null
        });
      }
      // Tự động hủy giao dịch nếu đang mở
      const tid = playerTradeMap.get(p.id);
      if (tid) cancelTradeSession(tid, `${p.name} đã ngắt kết nối`);
      // Rời khỏi Tống Kim nếu đang tham gia
      if (TONGKIM_SERVER.players.has(p.id)) {
        TONGKIM_SERVER.players.delete(p.id);
        syncTongkimToAll();
      }
      // Tự động rời tổ đội
      const party = getPlayerParty(p.id);
      if (party) {
        party.members = party.members.filter(m => m.id !== p.id);
        if (party.members.length === 0) {
          serverParties.delete(party.id);
        } else {
          if (party.leaderId === p.id) {
            party.leaderId = party.members[0].id;
            party.leaderName = party.members[0].name;
          }
          broadcastParty(party);
        }
      }
      players.delete(ws);
      broadcast({
        type: 'player_leave',
        id: p.id
      });
      broadcastOnlineCount();
    }
  });

  ws.on('error', (err) => {
    console.error(`[Multiplayer] Socket error:`, err);
  });
});

// (Đã loại bỏ setInterval state_sync định kỳ để tránh đè tụt cấp/kinh nghiệm của người chơi)

// ==========================================
// 4. KHỞI ĐỘNG SERVER
// ==========================================
function startListening(port) {
  server.listen(port, '0.0.0.0', () => {
    PORT = port;
    const url = `http://localhost:${port}/`;
    console.log(`==================================================`);
    console.log(`  VO LAM IDLE - GAME SERVER & MULTIPLAYER ONLINE! `);
    console.log(`  Web & WebSocket: port ${port}                   `);
    console.log(`==================================================`);
    try {
      if (process.platform === 'win32' && !process.env.PORT) {
        require('child_process').exec(`start ${url}`);
      }
    } catch (e) {}
  });

  server.on('error', (err) => {
    if ((err.code === 'EADDRINUSE' || err.code === 'EACCES') && !process.env.PORT) {
      console.log(`Port ${port} đang bận, thử port ${port + 1}...`);
      startListening(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

startListening(PORT);
