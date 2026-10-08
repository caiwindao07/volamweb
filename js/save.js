/* ======================= LUU GAME (localStorage 'jxidle') ======================= */
'use strict';
const SAVE_V = 1, OFFLINE_MAX = 8 * 3600;
/* 3 slot nhan vat: slot 0 giu khoa cu 'jxidle' (tuong thich file luu truoc day), slot 1, 2 = 'jxidle_2', 'jxidle_3'.
   Con tro 'jxidle_slot' = chi so slot dang choi, hoac 'menu' (hien man hinh chon nhan vat o lan vao tiep theo). */
const SLOT_N = 3, SLOT_PTR = 'jxidle_slot';
let SLOT = 0, SAVE_LOCK = false;
function purgeLegacyOfflineSaves() {
  try {
    ['jxidle', 'jxidle_2', 'jxidle_3', 'jxidle_slot', 'jxidle_bak', 'jxidle_2_bak', 'jxidle_3_bak'].forEach(k => {
      localStorage.removeItem(k);
    });
  } catch (e) {}
}
purgeLegacyOfflineSaves();

const saveKey = () => (typeof ACC !== 'undefined' && ACC.user && ACC.user.username) ? 'jx_save_' + ACC.user.username : 'jx_save_temp';
var S = null;
const FEMALE_FAC = ['emei', 'cuiyan'];       // phai nu: trang phuc nu; con lai nam
function defaultAutoSettings() {
  return {
    on: true,
    hpPct: 70,
    mpPct: 50,
    autoBuyPot: true,
    autoTp: true,
    tpPct: 20,
    tpOnOutPot: true,
    mainSkillId: 0,
    combo: true,
    targetPrio: 'near',
    range: 650,
    autoBuff: true,
    buffSkill1: 0,
    buffSkill2: 0,
    buffInterval: 25,
    autoMount: true,
    autoPartyAccept: true,
    autoPartyInvite: false,
    followLeader: false,
    autoLoot: true,
    autoEquip: false,
    autoSellWhite: true,
    autoPush: true,
    autoTower: true,
    autoDatau: true,
    autoDungeon: true,
    autoWorldBoss: true,
    autoClaimReward: true
  };
}

function newSave() {
  return { v: SAVE_V, name: 'Tân thủ', fac: null, sex: 0, lvl: 1, xp: 0, gold: 0, attrPts: 0, attr: { str: 0, dex: 0, vit: 0, eng: 0 },
    skPts: 1, sk: {}, main: 0, eq: {}, inv: [], stage: 1, maxStage: 1, wave: 1, push: true, uid: 1, autoSell: 0,
    kps: 0.2, totalKills: 0, autoEquip: false, autoPts: false, autoMap: true, diff: 1, autoForge: false, autoBuy: true, tut: 0, hints: {}, bakAt: 0, potOff: false, potUsed: 0, potStock: { life: {}, mana: {} }, ctrl: 'auto', joy: 'fixed', slots: [0, 0, 0, 0], snd: { on: true, vol: 0.7, music: true, mvol: 0.4 }, lootF: { minRar: 0, minLvl: 1, groups: [], series: [], auto: true }, ground: [], mats: { ht: {}, ore: {}, shard: {}, misc: {} }, auto: defaultAutoSettings(),
    cloak: { tier: 0 },
    pkMode: 'peace',
    pkValue: 0,
    jailUntil: 0,
    lastPkReduceT: Date.now(),
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
    last: Date.now() };
}
/* Chu ky file luu (cyrb53 + muoi): phat hien sua tay localStorage / ma xuat. Khong ngan duoc nguoi quyet tam (game chay hoan toan o may nguoi choi) nhung chan sua vo tinh va nhap ma da bi doi. */
const SAVE_SALT = 'jx-idle-v1:';
function sigOf(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57; const s = SAVE_SALT + str;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
function pack(state) { const body = JSON.stringify(state); return JSON.stringify({ d: body, h: sigOf(body) }); }
function unpack(txt) {                       // -> { state, ok } ; ok=false neu chu ky sai; file cu (khong goi) coi la hop le 1 lan roi ky lai
  const o = JSON.parse(txt);
  if (o && typeof o.d === 'string' && typeof o.h === 'string') return { state: JSON.parse(o.d), ok: sigOf(o.d) === o.h };
  return { state: o, ok: true, legacy: true };
}
function save() {
  if (SAVE_LOCK || !S || !S.fac) return;
  S.last = Date.now(); if (typeof saveGround === 'function' && R.ground) saveGround();
  try {
    const k = saveKey();
    localStorage.setItem(k, pack(S));
  } catch (e) { /* bo nho day / che do rieng tu */ }
  if (typeof syncCloudSave === 'function') syncCloudSave();
}
function migrate(o) {
  window._legitLevelTransition = true;
  window._legitExpGain = true;
  let s;
  try {
    s = Object.assign(newSave(), o);
    s.attr = Object.assign({ str: 0, dex: 0, vit: 0, eng: 0 }, o.attr || {});
  if (s.fac && !FAC[s.fac]) s.fac = null;
  for (const id in s.sk) if (!SK[id]) delete s.sk[id];
  s.stage = clamp(s.stage | 0 || 1, 1, STAGES + 400);
  // am thanh: file luu cu chi co {on:false} mac dinh (chua tung chinh) -> dung cau hinh moi
  s.snd = Object.assign({ on: true, vol: 0.7, music: true, mvol: 0.4 }, o.snd && 'vol' in o.snd ? o.snd : {});
  s.lootF = Object.assign({ minRar: 1, minLvl: 1, groups: [], series: [], auto: true }, o.lootF || {});
  if (o.autoSell && !o.lootF) s.lootF.minRar = o.autoSell;      // tu ban cu -> muc do hiem toi thieu cua bo loc
  s.lootF = s.lootF || { minRar: 0, minLvl: 1, groups: [], series: [], auto: true };
  if (s.lootF.minRar === 1 && !s.lootF._custom) s.lootF.minRar = 0;
  if (s.lootF.auto === undefined) s.lootF.auto = true;
  s.eq = (s.eq && typeof s.eq === 'object') ? s.eq : {};
  s.inv = Array.isArray(s.inv) ? s.inv : [];
  // do sinh truoc khi co ngu hanh trang bi: khong co thu tu tien/hau to -> giu moi dong luon hieu luc
  for (const it of s.inv.concat(Object.values(s.eq), (s.ground || []).map(g => g && g.it))) if (it && (it.mag || []).some(m => m.pre === undefined)) it.leg = true;
  if (!o.autoPtsOff) { s.autoPts = false; s.autoPtsOff = 1; }     // tu cong diem tiem nang / ky nang nay mac dinh TAT (ca file luu cu: tat mot lan, bat lai o the Khac)
  s.autoMap = o.autoMap !== undefined ? !!o.autoMap : true;
  s.mats = { ht: Object.assign({}, (o.mats || {}).ht), ore: Object.assign({}, (o.mats || {}).ore), shard: Object.assign({}, (o.mats || {}).shard), misc: Object.assign({}, (o.mats || {}).misc) };
  s.camp = o.camp && typeof o.camp === 'object' ? o.camp : { wood: 5, wine: 2, fireT: 0, wineT: 0, fireX: 0, fireY: 0 };
  s.mount = o.mount && typeof o.mount === 'object' ? o.mount : { tier: 1, lvl: 1, exp: 0, fodder: 10 };
  s.bossState = o.bossState && typeof o.bossState === 'object' ? o.bossState : { tickets: 3, lastDay: today(), defeated: {} };
  s.rw = o.rw && typeof o.rw === 'object' ? o.rw : {};    // phan thuong: file cu chua co -> RW() tu dien mac dinh
  s.lvl = clamp(Math.floor(+s.lvl) || 1, 1, MAX_LEVEL); s.xp = Math.max(0, +s.xp || 0);
  while (s.lvl < MAX_LEVEL && s.xp >= J.exp[s.lvl - 1]) {
    s.xp -= J.exp[s.lvl - 1];
    s.lvl++;
    s.attrPts += PTS_PER_LEVEL;
    s.skPts += SKILL_PTS_PER_LEVEL;
  }
  s.gold = Number.isFinite(+s.gold) ? Math.max(0, +s.gold) : 0; s.skPts = Math.max(0, Math.floor(+s.skPts) || 0); s.attrPts = Math.max(0, Math.floor(+s.attrPts) || 0);
  let spentMigrateSk = 0; for (const id in s.sk) spentMigrateSk += (s.sk[id] || 0);
  const minExpectedMigrateSk = 1 + (Math.max(1, s.lvl) - 1) * 1;
  if (spentMigrateSk + s.skPts < minExpectedMigrateSk) {
    s.skPts = minExpectedMigrateSk - spentMigrateSk;
  }
  s.inv = (Array.isArray(s.inv) ? s.inv : []).filter(it => it && typeof it === 'object' && Array.isArray(it.base) && Array.isArray(it.mag)).slice(0, INV_MAX);
  // Chuan hoa req cho tat ca do (neu tung luu dang {id, v} hoac loi)
  for (const it of s.inv.concat(Object.values(s.eq || {}))) {
    if (it && Array.isArray(it.req)) {
      it.req = it.req.map(r => Array.isArray(r) ? r : (r && r.id !== undefined && r.v !== undefined ? [r.id, r.v] : r)).filter(r => Array.isArray(r));
    }
  }
  let maxUid = 0; for (const it of s.inv.concat(Object.values(s.eq || {}))) if (it && it.uid > maxUid) maxUid = it.uid; s.uid = Math.max(+s.uid || 1, maxUid + 1);
  { const seen = new Set(); s.inv = s.inv.filter(it => { if (seen.has(it.uid)) { it.uid = s.uid++; } seen.add(it.uid); return true; }); }   // uid trung (nhap ma sua tay): cap lai
  s.diff = [0, 1, 2].includes(+o.diff) ? +o.diff : 1; s.hints = o.hints && typeof o.hints === 'object' ? o.hints : {};
  if (s.fac) s.sex = FEMALE_FAC.includes(s.fac) ? 1 : 0;         // gioi tinh theo phai (file luu cu mac dinh 0 -> phai nu mac nham do nam)
  const wrongSex = k => s.eq[k] && !sexReqOkFor(s.eq[k], s.sex);
  for (const k of Object.keys(s.eq || {})) if (!s.eq[k] || typeof s.eq[k] !== 'object') delete s.eq[k]; else if (wrongSex(k)) { if (s.inv.length < INV_MAX) s.inv.push(s.eq[k]); delete s.eq[k]; }   // trang phuc sai gioi tinh dang mac: thao ve tui
  s.auto = Object.assign(defaultAutoSettings(), o.auto || {});
  s.autoEquip = o.autoEquipExplicit ? !!o.autoEquip : false;
  s.autoEquipExplicit = !!o.autoEquipExplicit;
  s.auto.autoEquip = s.autoEquip;
  s.cloak = o.cloak && typeof o.cloak === 'object' && o.cloak.tier !== undefined ? o.cloak : { tier: 0 };
  s.pkMode = ['peace', 'pk', 'slaughter'].includes(o.pkMode) ? o.pkMode : 'peace';
  s.pkValue = Math.max(0, Number(o.pkValue) || 0);
  s.jailUntil = Math.max(0, Number(o.jailUntil) || 0);
  s.lastPkReduceT = Number(o.lastPkReduceT) || Date.now();
  s.meridian = o.meridian && typeof o.meridian === 'object' ? o.meridian : {
    qi: 0,
    levels: { nham: 0, doc: 0, xung: 0, doi: 0, amduy: 0, duongduy: 0, amkieu: 0, duongkieu: 0 }
  };
  s.companion = o.companion && typeof o.companion === 'object' && o.companion.list ? o.companion : {
    activeId: null,
    selectedTabId: 1,
    list: {
      1: { id: 1, lvl: 1, exp: 0, intimacy: 0, maxIntimacy: 100, star: 0, equips: { weapon: 0, helm: 0, armor: 0, gloves: 0, boots: 0 } },
      2: { id: 2, lvl: 1, exp: 0, intimacy: 0, maxIntimacy: 100, star: 0, equips: { weapon: 0, helm: 0, armor: 0, gloves: 0, boots: 0 } },
      3: { id: 3, lvl: 1, exp: 0, intimacy: 0, maxIntimacy: 100, star: 0, equips: { weapon: 0, helm: 0, armor: 0, gloves: 0, boots: 0 } },
      4: { id: 4, lvl: 1, exp: 0, intimacy: 0, maxIntimacy: 100, star: 0, equips: { weapon: 0, helm: 0, armor: 0, gloves: 0, boots: 0 } },
      5: { id: 5, lvl: 1, exp: 0, intimacy: 0, maxIntimacy: 100, star: 0, equips: { weapon: 0, helm: 0, armor: 0, gloves: 0, boots: 0 } }
    }
  };
  s.vip = (o.vip && typeof o.vip === 'object') ? {
    lvl: Math.max(1, Math.min(10, Math.floor(Number(o.vip.lvl) || 1))),
    exp: Math.max(0, Math.floor(Number(o.vip.exp) || 0)),
    lastClaim: String(o.vip.lastClaim || ''),
    pts: Math.max(0, Math.floor(Number(o.vip.pts) || 0))
  } : { lvl: 1, exp: 0, lastClaim: '', pts: 0 };
  s.v = SAVE_V;
  if (typeof secureObjectState === 'function') {
    secureObjectState(s);
  }
  } finally {
    window._legitLevelTransition = false;
    window._legitExpGain = false;
  }
  return s;
}
/* Stub giữ lại cho tương thích nếu các module khác gọi - đều là no-op khi đã dùng Server DB */
function slotInfo(i) { return null; }
function pickSlot() { return { slot: 0, menu: false }; }
function deleteSlot(i) { location.reload(); }
function switchCharacter() {
  if (typeof logoutAccount === 'function') {
    logoutAccount();
  } else {
    location.reload();
  }
}
function load() {
  if (typeof ACC === 'undefined' || !ACC.isLoggedIn) {
    return false;
  }
  try {
    const t = localStorage.getItem(saveKey());
    if (t) {
      let u = unpack(t);
      if (u && u.state && u.state.fac) {
        S = migrate(u.state);
        return true;
      }
    }
  } catch (e) { console.warn('Khong doc duoc file luu cache', e); }
  return false;
}
/* ---------- File luu de chuyen thiet bi (.jxsave) ----------
   Dinh dang: JSON { game: 'jxidle', v, exported, fac, lvl, data } voi data = chuoi pack() co chu ky (cung dinh dang luu trong may).
   Nap vao BAT KY slot nao: kiem tra chu ky + noi dung, ghi bang migrate(), giu ban sao luu slot cu. Cung nhan ma van ban cu (base64) va file tho. */
function saveFileText() {
  save();
  return JSON.stringify({ game: 'jxidle', v: SAVE_V, exported: Date.now(), fac: S.fac, lvl: S.lvl, data: pack(S) });
}
function saveFileName() { const d = new Date(), p = n => String(n).padStart(2, '0'); return `jxidle_${S.fac}_cap${S.lvl}_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}.jxsave`; }
function downloadSaveFile() {
  if (!S.fac) return false;
  const blob = new Blob([saveFileText()], { type: 'application/json' }), a = document.createElement('a');
  S.bakAt = Date.now(); save();
  a.href = URL.createObjectURL(blob); a.download = saveFileName(); document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  return true;
}
/* Doc noi dung file / ma -> trang thai hop le (nem loi neu hong, sai chu ky hoac khong phai file cua game) */
function parseSaveText(txt) {
  txt = String(txt || '').trim().replace(/^\uFEFF/, '');
  if (!txt) throw new Error('File rỗng');
  let packed;
  if (txt[0] === '{') {
    const o = JSON.parse(txt);
    if (o && o.game === 'jxidle' && typeof o.data === 'string') packed = o.data;
    else if (o && typeof o.d === 'string' && typeof o.h === 'string') packed = txt;      // file tho (khoa luu trong may)
    else throw new Error('Không phải file lưu của game');
  } else packed = decodeURIComponent(escape(atob(txt)));                                  // ma van ban (Xuat ma)
  const u = unpack(packed);
  if (!u.ok) throw new Error('File đã bị chỉnh sửa (sai chữ ký)');
  const o = u.state;
  if (!o || typeof o !== 'object' || !o.fac || !FAC[o.fac] || !('lvl' in o)) throw new Error('File không có nhân vật hợp lệ');
  return o;
}
/* Ghi nhan vat vao slot i (giu ban sao luu cu), dat con tro, tai lai trang */
function writeSlot(i, state) {
  const s = migrate(state); s.last = Date.now();
  SAVE_LOCK = true;
  try {
    const k = slotKey(i), prev = localStorage.getItem(k);
    if (prev) localStorage.setItem(k + '_bak', prev);
    localStorage.setItem(k, pack(s));
    localStorage.setItem(SLOT_PTR, String(i));
  } catch (e) { SAVE_LOCK = false; throw new Error('Không ghi được (bộ nhớ trình duyệt đầy hoặc bị chặn)'); }
  return s;
}
function exportSave() { save(); return btoa(unescape(encodeURIComponent(pack(S)))); }
function importSave(txt) {
  const u = unpack(decodeURIComponent(escape(atob(txt.trim()))));
  if (!u.ok) throw new Error('Mã đã bị chỉnh sửa');
  const o = u.state;
  if (!o || typeof o !== 'object' || !('lvl' in o)) throw new Error('Mã không hợp lệ');
  S = migrate(o); save(); R.dirty = true;
}

/* Tien trinh offline: uoc tinh theo toc do ha quai do duoc khi dang choi (S.kps), toi da 8 gio */
/* Treo may: 2 gio dau tinh day du, tu gio thu 3 chi con 40%, tran 8 gio / lan va 12 gio / 24 gio thuc (chong chinh dong ho); luon thap hon choi that.
   Dong ho lui (S.last o tuong lai) khong cho tien trinh. */
const OFFLINE_FULL = 2 * 3600, OFFLINE_TAIL = 0.4, OFFLINE_RATE = 0.75, OFFLINE_DAY_MAX = 12 * 3600;
function offlineGains() {
  const now = Date.now(), raw = (now - S.last) / 1000;
  if (!(raw >= 60) || !S.fac) return null;
  const d = S.offDay = (S.offDay && now - S.offDay.t0 < 86400000 && S.offDay.t0 <= now) ? S.offDay : { t0: now, secs: 0 };
  const capped = Math.min(OFFLINE_MAX, raw, Math.max(0, OFFLINE_DAY_MAX - d.secs));
  if (capped < 60) return null;
  d.secs += capped;
  const secs = capped, eff = Math.min(secs, OFFLINE_FULL) + OFFLINE_TAIL * Math.max(0, secs - OFFLINE_FULL);
  const kills = Math.floor(eff * clamp(S.kps || 0.1, 0.02, 3) * 0.8 * OFFLINE_RATE);
  if (!kills) return null;
  const L = stageLevel(S.stage), lv0 = S.lvl;
  const xp = expFor(L) * kills * (S.lvl - L > 10 ? 0.2 : S.lvl - L > 5 ? 0.6 : 1);
  const gold = moneyDrop({ L, cls: 'normal' }) * kills;
  gainXp(xp, 100); S.gold += gold;
  let got = 0, sold = 0;
  const nDrops = Math.min(30, Math.floor(kills * 0.08));
  for (let i = 0; i < nDrops; i++) {
    const it = rollDrops({ L, cls: Math.random() < 0.15 ? 'elite' : 'normal', bonusDrop: 1 })[0];
    if (!it) continue;
    if (addItem(it, true)) got++; else sold++;
  }
  autoEquipAll(); sweepJunk(); autoBuyWeapon(); autoForge();
  const chests = offlineChests(secs);                       // rương tu luyen theo moc 1 / 4 / 8 gio (rewards.js)
  return { secs, kills, xp, gold, lv0, lv1: S.lvl, got, sold, chests };
}
