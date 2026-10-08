/* ======================= PHAN THUONG NGOAI GAME GOC (docs/DE_XUAT.md) =======================
   1 diem danh 7/30 ngay · 2 nhiem vu ngay · 3 thanh tuu + danh hieu · 4 trum Hoang Kim dinh ky · 5 thuong offline theo moc
   6 thap thu thach · 7 chuyen sinh (toi da 5 lan) · 8 dong hanh · 9 su kien theo mua · 10 ruong Phuc Duyen */
'use strict';
const dayKey = d => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const today = () => dayKey(new Date());
const GB_EVERY = 1800, GB_RETRY = 300;     // trum Hoang Kim: moi 30 phut choi; thua thi 5 phut sau quay lai
const REBORN_LV = 200, REBORN_MAX = 10;   // chuyen sinh tu cap 200
const FD_COST = 10;
function RW() { // trang thai phan thuong trong file luu (tao / bo sung truong khi nap file cu)
  const r = S.rw || (S.rw = {});
  r.stat = Object.assign({ kills: 0, bosses: 0, goldBoss: 0, picked: 0, towerBest: 0, reborn: 0, chests: 0, tokens: 0 }, r.stat || {});
  r.login = Object.assign({ last: '', streak: 0, total: 0, got: {}, claimed: true }, r.login || {});
  r.ach = r.ach || {}; r.title = r.title || ''; r.fd = r.fd || 0; if (r.gbT == null) r.gbT = GB_EVERY;
  r.pet = r.pet || null;
  return r;
}

/* ---------- phan thuong chung ---------- */
function grant(g, why) {
  const out = [];
  if (g.gold) { const v = Math.round(g.gold * (1 + S.lvl / 10)); S.gold += v; out.push(`${fmt(v)} lượng`); }
  if (g.pot) { const st = potStock(g.pot.kind); st[g.pot.tier] = (st[g.pot.tier] || 0) + g.pot.n; out.push(`${g.pot.n} ${g.pot.kind === 'life' ? 'Kim Sáng Dược' : 'Ngưng Thần đan'}`); }
  if (g.fd) { RW().fd += g.fd; out.push(`${g.fd} Phúc Duyên`); }
  if (g.item) { const it = (() => { const d = irnd(0, 9); return makeItem(d, sexPart(d, 0), clamp(Math.round(S.lvl / 12) + 1, 1, 10), g.item); })(); if (it) { addItem(it, true, true, true); out.push(esc(it.n)); } }
  if (g.set) { const it = forceSetItem(); if (it) { addItem(it, true, true); out.push(`<b style="color:${RAR_COL[it.r]}">${esc(it.n)}</b>`); } }
  if (g.pts) { S.attrPts += g.pts; out.push(`${g.pts} điểm tiềm năng`); }
  if (out.length) { log(`🎁 ${esc(why)}: ${out.join(', ')}`); if (!R.quiet) uiSfx('learn'); save(); }
  return out;
}
function forceSetItem() { // do bo Hoang Kim cua phai, cap yeu cau gan cap nhan vat
  const fid = FAC[S.fac] ? FAC[S.fac].id : -1, cap = S.lvl + 15;
  const req = (r, id) => (r.req.find(q => q[0] === id) || [0, -1])[1];
  const G = J.sets.gold.filter(r => sexReqOk(r.req));
  let pool = G.filter(r => req(r, 39) === fid && req(r, 36) <= cap);
  if (!pool.length) pool = G.filter(r => req(r, 36) <= cap);
  if (!pool.length) pool = G.filter(r => req(r, 39) === fid);
  return pool.length ? makeSetItem('gold', pick(pool), 5) : null;
}

/* ---------- 1. diem danh 7 ngay (vong lap) + moc 10/20/30 ngay ---------- */
const LOGIN7 = [{ gold: 200 }, { pot: { kind: 'life', tier: 2, n: 10 } }, { gold: 400, fd: 5 }, { pot: { kind: 'mana', tier: 2, n: 10 } }, { item: 4 }, { gold: 800, fd: 10 }, { set: 1, fd: 20 }];
const LOGIN30 = { 10: { gold: 3000, pts: 10 }, 20: { set: 1, pts: 20 }, 30: { set: 1, fd: 50, pts: 30 } };
function loginCheck() {
  if (!S || !S.fac) return;
  const L = RW().login, t = today();
  if (L.last === t) return;
  const y = new Date(); y.setDate(y.getDate() - 1);
  L.streak = L.last === dayKey(y) ? L.streak + 1 : 1;
  L.last = t; L.total++; L.claimed = false;
  dailyQuests(true); dotGift();
}
function claimLogin() {
  const L = RW().login; if (L.claimed) return;
  L.claimed = true;
  grant(LOGIN7[(L.streak - 1) % 7], `Điểm danh ngày ${L.streak}`);
  const m = LOGIN30[L.total]; if (m && !L.got[L.total]) { L.got[L.total] = 1; grant(m, `Điểm danh ${L.total} ngày`); }
  achCheck();
}

/* ---------- 1b. qua moc cap (nhan 1 lan, khong nhan lai sau chuyen sinh): chu yeu tieu hao + tien loi,
   chi so vinh vien chi la vai diem tiem nang -> khong lam lech can bang giua cac phai ---------- */
const LV_MS = [
  [10, { gold: 300, pot: { kind: 'life', tier: 1, n: 10 } }, 'Mở khóa: tháp thử thách'],
  [20, { gold: 600, pot: { kind: 'mana', tier: 2, n: 10 }, fd: 5 }, 'Mở khóa: đồng hành'],
  [30, { item: 4, fd: 5 }, ''],
  [40, { gold: 1500, pot: { kind: 'life', tier: 3, n: 10 }, pts: 3 }, ''],
  [50, { item: 5, fd: 10 }, 'Danh hiệu «Thiếu hiệp»'],
  [60, { gold: 3000, pot: { kind: 'mana', tier: 3, n: 10 }, pts: 3 }, ''],
  [70, { set: 1, fd: 10 }, ''],
  [80, { gold: 5000, pot: { kind: 'life', tier: 4, n: 10 }, pts: 4 }, ''],
  [90, { item: 6, fd: 15 }, ''],
  [95, { set: 1, fd: 20, pts: 5 }, 'Danh hiệu «Đại hiệp»'],
  [97, { gold: 10000, pot: { kind: 'life', tier: 5, n: 20 }, fd: 20 }, ''],
  [99, { set: 1, fd: 30, pts: 5 }, 'Danh hiệu «Tông sư» · mở khóa chuyển sinh'],
];
const TOWER_LV = 10, PET_LV = 20;
const unlocked = lv => S.lvl >= lv || RW().stat.reborn > 0;
function lvMsReady() { const g = RW().lvGot || {}; return LV_MS.filter(([lv]) => S.lvl >= lv && !g[lv]); }
function claimLvMs(lv) {
  const r = RW(), m = LV_MS.find(x => x[0] === lv); r.lvGot = r.lvGot || {};
  if (!m || S.lvl < lv || r.lvGot[lv]) return;
  r.lvGot[lv] = 1; grant(m[1], `Mốc cấp ${lv}`); achCheck(); refreshGift();
}

/* ---------- 2. nhiem vu ngay (4 viec ngau nhien moi ngay) ---------- */
const DQ_POOL = [
  ['kills', 'Hạ {n} quái', lv => 150 + lv * 3], ['bosses', 'Hạ {n} trùm', () => 2], ['picked', 'Nhặt {n} món đồ', () => 8],
  ['stages', 'Vượt {n} ải', () => 5], ['pots', 'Dùng {n} bình thuốc', () => 10], ['tower', 'Leo {n} tầng tháp thử thách', () => 3],
];
function dailyQuests(reset) {
  const r = RW();
  if (!reset && r.dq && r.dq.day === today()) return r.dq;
  const pool = DQ_POOL.filter(q => q[0] !== 'tower' || unlocked(TOWER_LV)).sort(() => Math.random() - 0.5).slice(0, 4);
  r.dq = { day: today(), list: pool.map(([k, t, f]) => ({ k, t: t.replace('{n}', f(S.lvl)), need: f(S.lvl), have: 0, done: false })) };
  return r.dq;
}
function questTick(k, n = 1) {
  if (!S || !S.fac) return;
  if (k === 'picked') RW().stat.picked += n;
  for (const q of dailyQuests().list) if (q.k === k && !q.done && q.have < q.need) { q.have = Math.min(q.need, q.have + n); if (q.have >= q.need) dotGift(); }
}
function claimQuest(i) { const q = dailyQuests().list[i]; if (!q || q.done || q.have < q.need) return; q.done = true; grant({ gold: 300, fd: 5 }, `Nhiệm vụ: ${q.t}`); }

/* ---------- 3. thanh tuu + danh hieu (deo 1 danh hieu: cong chi so nho) ---------- */
const ACH = [
  ['lv30', 'Xuất sơn', () => S.lvl >= 30 || RW().stat.reborn > 0, { gold: 1000 }, ['lifemax_p', 3]],
  ['lv50', 'Thiếu hiệp', () => (RW().lvGot || {})[50], { fd: 5 }, ['lifemax_p', 4]],
  ['lv80', 'Danh chấn giang hồ', () => S.lvl >= 80 || RW().stat.reborn > 0, { gold: 5000, pts: 10 }, ['attackspeed_v', 3]],
  ['lv100', 'Đại hiệp', () => (RW().lvGot || {})[95] || (RW().lvGot || {})[100], { fd: 10 }, ['allres_p', 4]],
  ['lv150', 'Tông sư', () => (RW().lvGot || {})[99] || (RW().lvGot || {})[150], { fd: 20 }, ['allres_p', 6]],
  ['k1000', 'Sát thủ', () => RW().stat.kills >= 1000, { fd: 10 }, ['manamax_p', 4]],
  ['k10000', 'Vạn nhân địch', () => RW().stat.kills >= 10000, { set: 1 }, ['attackspeed_v', 5]],
  ['b50', 'Diệt trùm', () => RW().stat.bosses >= 50, { fd: 20 }, ['allres_p', 3]],
  ['zone8', 'Nửa giang sơn', () => S.maxStage >= STAGES / 2, { gold: 8000 }, ['fastwalkrun_p', 5]],
  ['zone16', 'Trường Bạch sơn chủ', () => S.maxStage > STAGES, { set: 1, pts: 20 }, ['lifemax_p', 6]],
  ['setfull', 'Hoàng Kim đủ bộ', () => enoughToActive(S.eq), { fd: 30 }, ['allres_p', 5]],
  ['tower20', 'Leo tháp tầng 20', () => RW().stat.towerBest >= 20, { set: 1 }, ['attackspeed_v', 6]],
  ['reborn1', 'Chuyển sinh', () => RW().stat.reborn >= 1, { fd: 50 }, ['lifemax_p', 8]],
  ['gold5', 'Săn trùm Hoàng Kim', () => RW().stat.goldBoss >= 5, { fd: 20 }, ['lucky_v', 10]],
];
if (typeof window !== 'undefined' && window._pendingACH) {
  ACH.push(...window._pendingACH);
  delete window._pendingACH;
}
function achCheck() {
  if (!S || !S.fac) return;
  const r = RW();
  for (const [id, n, ok, reward] of ACH) if (!r.ach[id] && ok()) { r.ach[id] = 1; grant(reward, `Thành tựu «${n}»`); if (!R.quiet) toast(`Thành tựu: ${n}`); dotGift(); }
}
function titleAttr(A) { // goi tu calc(): chi so cua danh hieu dang deo
  if (!S.rw || !S.rw.title) return;
  const t = ACH.find(a => a[0] === S.rw.title); if (t && S.rw.ach[t[0]]) addAttr(A, t[4][0], [t[4][1], 0, 0]);
}

/* ---------- 4. trum Hoang Kim dinh ky ---------- */
function goldBossTick(dt) { if (S.fac && !R.town && !R.tower) RW().gbT -= dt; }
function goldBossDue() { return !R.tower && RW().gbT <= 0; }
function spawnGoldBoss() {
  // cap trum khong vuot cap nhan vat + 2 (nhip len cap cham: nhan vat thuong danh ai cao hon cap minh)
  const z = zoneOf(Math.min(S.stage, STAGES)), L = Math.min(stageLevel(S.stage), S.lvl) + 2, [x, y] = inWorld(H.x + 240, H.y - 120);
  const e = makeEnemy(z.boss, L, 'boss', x, y);
  e.hp = e.max = e.max * 2; e.dmg *= 1.15; e.goldBoss = true; e.n = 'Trùm Hoàng Kim · ' + e.n;
  R.enemies.push(e); RW().gbT = GB_EVERY;
  R.banner = { t: 2.5, text: 'Trùm Hoàng Kim xuất hiện!', sub: 'Hạ để nhận đồ Hoàng Kim' }; log('<b style="color:#ffb52e">Trùm Hoàng Kim xuất hiện!</b>');
}

/* ---------- 5. thuong offline theo moc 1 / 4 / 8 gio ---------- */
function offlineChests(secs) {
  let n = 0;
  if (secs >= 3600) { grant({ gold: 500, pot: { kind: 'life', tier: 2, n: 5 } }, 'Tu luyện 1 giờ'); n++; }
  if (secs >= 4 * 3600) { grant({ gold: 1500, fd: 10 }, 'Tu luyện 4 giờ'); n++; }
  if (secs >= 8 * 3600 - 60) { grant({ set: 1, fd: 20 }, 'Tu luyện 8 giờ'); n++; }
  return n;
}

/* ---------- 6. thap thu thach (Phong Ky) ---------- */
function towerStart() {
  if (R.town) backFromTown();
  R.tower = { floor: Math.max(1, RW().stat.towerBest - 4) }; R.enemies = []; R.corpses = []; R.spawnT = 0.5;
  R.banner = { t: 2, text: `Tháp thử thách · tầng ${R.tower.floor}`, sub: 'Gục ngã là rời tháp' }; closeModal(true);
}
const towerLevel = f => Math.min(MAX_LEVEL, 10 + f * 4);
function towerSpawn() {
  const f = R.tower.floor, L = towerLevel(f), z = ZONES[Math.min(ZONES.length - 1, Math.floor(f / 3))], boss = f % 5 === 0;
  R.enemies = []; R.stall = 0;
  const n = boss ? 1 : 3 + (f % 3);
  for (let i = 0; i < n; i++) { const [x, y] = inWorld(H.x + rnd(-260, 260), H.y + rnd(-220, 220)); R.enemies.push(makeEnemy(boss ? z.boss : pick(z.m), L, boss ? 'boss' : 'elite', x, y)); }
}
function towerCleared() {
  const r = RW(), f = R.tower.floor;
  if (f > r.stat.towerBest) { r.stat.towerBest = f; grant(f % 5 === 0 ? { set: 1, fd: 10 } : { gold: 200 * f, fd: 2 }, `Tháp tầng ${f}`); }
  questTick('tower'); achCheck();
  heal(R.P.life * 0.3, true); R.mana = Math.min(R.P.mana, R.mana + R.P.mana * 0.3);
  R.tower.floor++; R.spawnT = 1.5; R.banner = { t: 1.5, text: `Tầng ${R.tower.floor}`, sub: `Quái cấp ${towerLevel(R.tower.floor)}` };
}
function towerExit(dead) {
  if (!R.tower) return;
  log(`${dead ? 'Gục ở' : 'Rời'} tháp thử thách tầng ${R.tower.floor}. Kỷ lục: ${RW().stat.towerBest}`);
  R.tower = null; R.enemies = []; S.wave = 1; R.spawnT = 0.5; R.zoneShown = null;
}

/* ---------- 7. chuyen sinh (Chuyen sinh tu cap 200, toi da 10 lan) ---------- */
function rebornBonus() {
  const n = S.rw && S.rw.stat ? S.rw.stat.reborn || 0 : 0;
  return { xp: 0.25 * n, dmg: 0.15 * n };
}

function grantRebornRewards(n) {
  const rewList = [];
  // 1. Điểm tiềm năng: 100 điểm * n
  const bonusPts = n * 100;
  S.attrPts = (S.attrPts || 0) + bonusPts;
  rewList.push(`+${bonusPts} Điểm Tiềm Năng`);

  // 2. Ngân Lượng: 100,000 lượng * n
  const bonusGold = n * 100000;
  S.gold = (S.gold || 0) + bonusGold;
  rewList.push(`${fmt(bonusGold)} Lượng`);

  // 3. Phúc Duyên: 100 * n
  const bonusFd = n * 100;
  if (typeof RW === 'function') RW().fd = (RW().fd || 0) + bonusFd;
  rewList.push(`+${bonusFd} Phúc Duyên`);

  // 4. Cỏ Linh Chi bồi dưỡng Thần Thú: 50 * n
  if (typeof pvkEnsureMount === 'function') pvkEnsureMount();
  if (S.mount) {
    const fodder = n * 50;
    S.mount.fodder = (S.mount.fodder || 0) + fodder;
    rewList.push(`+${fodder} Cỏ Linh Chi`);
  }

  // 5. Huyền Tinh Cấp Cao & Thủy Tinh
  // Lần 1: Cấp 6 x3; Lần 2: Cấp 7 x3; Lần 3: Cấp 8 x3; Lần 4: Cấp 9 x3; Lần 5+: Cấp 10 x3
  const htLvl = Math.min(10, 5 + n);
  if (typeof matAdd === 'function') {
    matAdd('ht', htLvl, 3);
    matAdd('misc', 'wc', n * 5);
  }
  rewList.push(`3x Huyền Tinh Cấp ${htLvl}`, `${n * 5}x Thủy Tinh`);

  // 6. Trang bị cực phẩm Hoàng Kim / Bạch Kim
  // Lần >= 3 thưởng đồ Bạch Kim, lần 1-2 thưởng đồ Hoàng Kim hoàn mỹ
  const isPlatina = n >= 3;
  const setKind = isPlatina ? 'platina' : 'gold';
  let setItem = null;
  if (typeof J !== 'undefined' && J.sets && J.sets[setKind] && typeof makeSetItem === 'function') {
    const fid = (typeof FAC !== 'undefined' && FAC[S.fac]) ? FAC[S.fac].id : -1;
    const reqOf = (r, id) => (r.req.find(q => q[0] === id) || [0, -1])[1];
    let pool = J.sets[setKind].filter(r => typeof sexReqOk === 'function' ? sexReqOk(r.req) : true);
    const mine = pool.filter(r => reqOf(r, 39) === fid);
    if (mine.length) pool = mine;
    if (pool.length) {
      setItem = makeSetItem(setKind, pick(pool), 10);
      if (setItem && typeof addItem === 'function') addItem(setItem, true, true);
    }
  }
  if (setItem) {
    rewList.push(`Trang bị <b style="color:${RAR_COL[setItem.r] || '#ffd700'}">${esc(setItem.n)}</b>`);
  }

  // 7. Thăng cấp Phi Phong
  if (S.cloak) {
    S.cloak.tier = Math.min(10, Math.max(S.cloak.tier || 0, n));
    rewList.push(`Phi Phong Bậc ${S.cloak.tier}`);
  }

  return rewList;
}

function doReborn() {
  const r = RW();
  if (S.lvl < REBORN_LV || r.stat.reborn >= REBORN_MAX) {
    if (S.lvl < REBORN_LV && typeof toast === 'function') {
      toast(`Chưa đạt cấp ${REBORN_LV} để chuyển sinh!`);
    }
    return;
  }
  const nextN = r.stat.reborn + 1;
  const rebornCost = nextN * 5000000; // lần 1: 5tr, lần 2: 10tr, ..., lần 10: 50tr
  if ((S.gold || 0) < rebornCost) {
    if (typeof toast === 'function') toast(`❌ Chuyển sinh lần ${nextN} cần ${rebornCost.toLocaleString()} Vàng!`);
    return;
  }
  if (!confirm(`Chuyển sinh lần ${nextN}: Nhân vật sẽ trở về cấp 1, giữ nguyên toàn bộ trang bị và võ công, nhận lượng lớn điểm tiềm năng và BẢO VẬT QUÝ HIẾM theo số lần chuyển sinh!\n\nChi phí: ${rebornCost.toLocaleString()} Vàng. Tiếp tục?`)) return;
  S.gold -= rebornCost;

  r.stat.reborn++;
  r.tpPend = (r.tpPend || 0) + 1;
  window._legitLevelTransition = true;
  window._legitExpGain = true;
  try {
    S.lvl = 1;
    S.xp = 0;
    S.attr = { str: 0, dex: 0, vit: 0, eng: 0 };
  } finally {
    window._legitLevelTransition = false;
    window._legitExpGain = false;
  }

  const rewList = grantRebornRewards(r.stat.reborn);

  S.stage = 1; S.wave = 1; S.push = true; R.tower = null; R.enemies = []; R.dirty = true; R.zoneShown = null;
  log(`<b class="up" style="color:#f59e0b;font-size:13px;">🎉 CHUYỂN SINH LẦN ${r.stat.reborn} THÀNH CÔNG!</b>`);
  log(`<span style="color:#ffd700;">🎁 Thưởng Chuyển Sinh lần ${r.stat.reborn}: ${rewList.join(', ')}.</span>`);
  log(`<span style="color:#4ade80;">Vĩnh viễn tăng +${r.stat.reborn * 25}% kinh nghiệm và +${r.stat.reborn * 15}% sát thương.</span>`);
  if (typeof toast === 'function') toast(`🎉 Chuyển sinh lần ${r.stat.reborn} thành công! Nhận 1 điểm Tâm Pháp.`);
  if (typeof uiSfx === 'function') uiSfx('levelup');

  if (S.autoPts === true) autoSpendAttrs();
  achCheck(); closeModal(true); refresh(); save();
  if (typeof tamPhapModal === 'function') setTimeout(tamPhapModal, 400);
}

/* ---------- 8. dong hanh (thu nuoi danh cung, len cap theo quai ha) ---------- */
function petChoices() {
  const zs = ZONES.slice(0, zoneIdx(Math.min(S.maxStage, STAGES)) + 1);
  return [...new Set(zs.flatMap(z => z.m))].filter(t => MON[t] && MON[t].anim).slice(0, 12);
}
function petAdopt(tid) { const old = RW().pet; RW().pet = { tid, lvl: old ? old.lvl : 1, xp: old ? old.xp : 0 }; R.petPos = null; toast('Đồng hành: ' + MON[tid].n); save(); refreshGift(); }
function petDmg(p) { return (6 + p.lvl * 5) * (1 + p.lvl * 0.04) * (1 + rebornBonus().dmg); }
function petTick(dt) {
  const p = S.rw && S.rw.pet; if (!p || R.town || !MON[p.tid]) { R.petPos = null; return; }
  const pp = R.petPos || (R.petPos = { x: H.x - 30, y: H.y + 10, t: 0, act: 'st', actT: 0, dir: 0 });
  const t = alive().sort((a, b) => Math.hypot(a.x - pp.x, a.y - pp.y) - Math.hypot(b.x - pp.x, b.y - pp.y))[0];
  const goal = t || { x: H.x - 36, y: H.y + 12 }, d = Math.hypot(goal.x - pp.x, goal.y - pp.y), reach = t ? t.r + 14 : 10;
  pp.moving = d > reach;
  if (pp.moving) { const k = Math.min(1, 170 * dt / d); pp.dir = dirOf(goal.x - pp.x, goal.y - pp.y); pp.x += (goal.x - pp.x) * k; pp.y += (goal.y - pp.y) * k; }
  if (Math.hypot(H.x - pp.x, H.y - pp.y) > 500) { pp.x = H.x - 30; pp.y = H.y + 10; }   // lac xa: dich chuyen ve canh chu
  pp.t -= dt;
  if (t && !pp.moving && pp.t <= 0) { pp.t = 1.2; const dmg = petDmg(p); t.hp -= dmg; t.hitT = 0.1; pp.act = 'at'; pp.actT = 0; pp.dir = dirOf(t.x - pp.x, t.y - pp.y); addText(t.x, t.y - 30, fmt(dmg), '#9fe36a', 11); }
}
function petGainXp(n) {
  const p = S.rw && S.rw.pet; if (!p) return;
  p.xp += n; const need = 20 + p.lvl * 12;
  if (p.xp >= need) { p.xp -= need; p.lvl++; log(`Đồng hành ${esc(MON[p.tid].n)} lên cấp ${p.lvl}`); }
}
function drawPet(c, dt) {
  const p = S.rw && S.rw.pet, pp = R.petPos; if (!p || !pp || !MON[p.tid]) return;
  pp.animKey = MON[p.tid].anim; stepAct(pp, dt, pp.moving ? 'run' : 'st'); if (pp.act !== 'at') setAct(pp, pp.moving ? 'run' : 'st');
  c.fillStyle = '#0007'; c.beginPath(); c.ellipse(pp.x, pp.y, 10, 4, 0, 0, 7); c.fill();
  drawAnim(pp.animKey, pp.act || 'st', pp.dir || 0, pp.actT || 0, pp.x, pp.y, 0.75 * MON_SCALE);
  label(pp.x, pp.y - 42, `${MON[p.tid].n} · Lv${p.lvl}`, NAME_COL.pet, 10, -1);
}

/* ---------- 9. su kien theo mua (theo thang hien tai) ---------- */
function eventNow() {
  const m = new Date().getMonth() + 1;
  if (m === 1 || m === 2) return { n: 'Tết Nguyên Đán', token: 'Bánh Chưng', col: '#ff5a4a' };
  if (m === 9 || m === 10) return { n: 'Tết Trung Thu', token: 'Bánh Trung Thu', col: '#ffd24a' };
  if (m === 12) return { n: 'Giáng Sinh', token: 'Chuông Bạc', col: '#9fe3ff' };
  return { n: 'Hội Võ Lâm', token: 'Lệnh Bài Võ Lâm', col: '#c8a2ff' };
}
const EVENT_SHOP = [[10, { gold: 1000 }], [20, { pot: { kind: 'life', tier: 3, n: 10 } }], [30, { item: 5 }], [40, { fd: 20 }], [60, { set: 1 }]];
function eventBuy(i) {
  const [cost, g] = EVENT_SHOP[i], st = RW().stat;
  if (st.tokens < cost) { toast(`Cần ${cost} ${eventNow().token}`); return; }
  st.tokens -= cost; grant(g, eventNow().n); refreshGift();
}

/* ---------- 10. ruong Phuc Duyen ---------- */
const FD_TABLE = [[40, { gold: 600 }], [20, { pot: { kind: 'life', tier: 3, n: 5 } }], [15, { pot: { kind: 'mana', tier: 3, n: 5 } }], [12, { item: 4 }], [8, { item: 6 }], [4, { pts: 5 }], [1, { set: 1 }]];
function openChest() {
  const r = RW(); if (r.fd < FD_COST) { toast(`Cần ${FD_COST} điểm Phúc Duyên`); return; }
  r.fd -= FD_COST; r.stat.chests++;
  const got = grant(wpick(FD_TABLE, x => x[0])[1], 'Rương Phúc Duyên');
  toast('Rương Phúc Duyên: ' + got.join(', ').replace(/<[^>]+>/g, '')); refreshGift();
}

/* ---------- moc noi vao tro choi ---------- */
function rwOnKill(e) {
  if (!S.fac) return;
  const r = RW(); r.stat.kills++; questTick('kills');
  if (e.cls === 'boss') { r.stat.bosses++; questTick('bosses'); }
  if (e.goldBoss) { r.stat.goldBoss++; grant({ set: 1, fd: 10 }, 'Hạ Trùm Hoàng Kim'); }
  if (Math.random() < 0.05) { r.stat.tokens++; const ev = eventNow(); addText(e.x, e.y - 50, '+1 ' + ev.token, ev.col, 11); }
  petGainXp(e.cls === 'boss' ? 10 : e.cls === 'elite' ? 3 : 1);
  if (r.stat.kills % 25 === 0 || e.cls === 'boss') achCheck();
}
function giftPending() {
  if (!S || !S.fac) return false;
  const r = RW();
  return !r.login.claimed || lvMsReady().length > 0 || dailyQuests().list.some(q => !q.done && q.have >= q.need) || r.fd >= FD_COST;
}
function dotGift() { const b = $('#giftBtn'); if (b) b.classList.toggle('on', giftPending()); }

/* ---------- giao dien: nut 🎁 ---------- */
let giftTab = 'login';
function openRebornTab() { giftTab = 'reborn'; giftModal(); }
function refreshGift() { if (!$('#modal').classList.contains('hidden') && $('#giftTabs')) giftModal(); dotGift(); }
function giftText(g) {
  const p = [];
  if (g.gold) p.push(`${fmt(g.gold * (1 + S.lvl / 10))} lượng`); if (g.pot) p.push(`${g.pot.n} bình thuốc`); if (g.fd) p.push(`${g.fd} Phúc Duyên`);
  if (g.item) p.push(`đồ ${g.item} dòng`); if (g.set) p.push('đồ Hoàng Kim'); if (g.pts) p.push(`${g.pts} tiềm năng`);
  return p.join(', ');
}
function giftBody(r) {
  if (giftTab === 'login') {
    const L = r.login, day = ((L.streak - 1) % 7 + 7) % 7;
    return `<p class="desc">Chuỗi ${L.streak} ngày · tổng ${L.total} ngày. Mốc 10 / 20 / 30 ngày có quà lớn.</p>
      <div class="days">${LOGIN7.map((g, i) => `<div class="day${i < day || (i === day && L.claimed) ? ' got' : ''}${i === day ? ' cur' : ''}"><b>Ngày ${i + 1}</b><small>${giftText(g)}</small></div>`).join('')}</div>
      <div class="btnrow"><button class="btn" id="gLogin" ${L.claimed ? 'disabled' : ''}>${L.claimed ? 'Đã nhận hôm nay' : 'Nhận quà hôm nay'}</button></div>`;
  }
  if (giftTab === 'lvms') {
    const g = r.lvGot || {};
    return `<p class="desc">Quà mốc cấp: nhận một lần (chuyển sinh không nhận lại). Chủ yếu thuốc, ngân lượng, Phúc Duyên và mở khóa tính năng.</p>${LV_MS.map(([lv, rw, note]) => `<div class="qrow${S.lvl >= lv ? '' : ' lock'}"><span><b>Cấp ${lv}</b><small>${giftText(rw)}${note ? ' · ' + note : ''}</small></span><small></small><button class="btn sm" data-lv="${lv}" ${S.lvl >= lv && !g[lv] ? '' : 'disabled'}>${g[lv] ? 'Đã nhận' : 'Nhận'}</button></div>`).join('')}`;
  }
  if (giftTab === 'quest') return `<p class="desc">Làm mới mỗi ngày. Mỗi việc: lượng + 5 Phúc Duyên.</p>${dailyQuests().list.map((q, i) => `<div class="qrow"><span>${esc(q.t)}</span><small>${q.have}/${q.need}</small><button class="btn sm" data-q="${i}" ${q.done || q.have < q.need ? 'disabled' : ''}>${q.done ? 'Đã nhận' : 'Nhận'}</button></div>`).join('')}`;
  if (giftTab === 'ach') return `<p class="desc">Hoàn thành để nhận thưởng; đeo 1 danh hiệu để cộng chỉ số.</p>${ACH.map(([id, n, , g, t]) => `<div class="qrow${r.ach[id] ? '' : ' lock'}"><span><b>${n}</b><small>${giftText(g)} · danh hiệu: ${esc(attrText(t[0], [t[1], 0, 0]))}</small></span><small></small><button class="btn sm" data-t="${id}" ${r.ach[id] ? '' : 'disabled'}>${r.title === id ? 'Đang đeo' : 'Đeo'}</button></div>`).join('')}`;
  if (giftTab === 'chest') return `<p class="desc">Điểm Phúc Duyên: <b>${r.fd}</b> (điểm danh, nhiệm vụ, thành tựu, trùm). Mỗi lần mở: ${FD_COST} điểm.</p>
      <div class="chips">${FD_TABLE.map(([w, g]) => `<span class="chip2">${giftText(g)} · ${w}%</span>`).join('')}</div>
      <div class="btnrow"><button class="btn" id="gChest" ${r.fd >= FD_COST ? '' : 'disabled'}>Mở rương Phúc Duyên</button></div>`;
  if (giftTab === 'event') {
    const ev = eventNow();
    return `<p class="desc">Sự kiện: <b style="color:${ev.col}">${ev.n}</b>. Quái rơi ${ev.token} (5%). Đang có: <b>${r.stat.tokens}</b>.</p>${EVENT_SHOP.map(([c, g], i) => `<div class="qrow"><span>${giftText(g)}</span><small>${c} ${ev.token}</small><button class="btn sm" data-e="${i}" ${r.stat.tokens >= c ? '' : 'disabled'}>Đổi</button></div>`).join('')}`;
  }
  if (giftTab === 'tower') return `<p class="desc">Mỗi tầng một đợt tinh anh; tầng chia hết cho 5 là trùm (lần đầu qua được đồ Hoàng Kim). Quái cấp 10 + 4 × tầng. Gục ngã là rời tháp.</p>
      <p>Kỷ lục: <b>tầng ${r.stat.towerBest}</b>${R.tower ? ` · đang ở tầng ${R.tower.floor}` : ''}</p>
      <div class="btnrow">${R.tower ? '<button class="btn red" id="gTowerOut">Rời tháp</button>' : !unlocked(TOWER_LV) ? `<button class="btn" disabled>Cần cấp ${TOWER_LV}</button>` : `<button class="btn" id="gTower">Vào tháp (từ tầng ${Math.max(1, r.stat.towerBest - 4)})</button>`}</div>`;
  if (giftTab === 'pet') {
    const p = r.pet || (r.pet = { id: 'loikiem', n: 'Lôi Kiếm', series: 0, lvl: 1, xp: 0, str: 10, dex: 10, vit: 10, eng: 10, pts: 0 });
    const cfg = (typeof PVK_PETS !== 'undefined' && (PVK_PETS[p.id || 'loikiem'] || PVK_PETS.loikiem)) || { n: 'Lôi Kiếm', elemCol: '#f3d35b', series: 0, skillN: 'Lôi Động', skillDesc: 'Sát thương lôi đình' };
    const stName = typeof petStageName === 'function' ? petStageName(p) : 'Thiếu Niên';
    const needXp = 20 + (p.lvl || 1) * 15;
    const pct = Math.min(100, Math.floor((p.xp || 0) * 100 / needXp));
    return `
      <div style="background:var(--panel2);border:1px solid ${cfg.elemCol};border-radius:8px;padding:10px;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <h3 style="color:${cfg.elemCol};margin:0;font-size:15px;">${esc(p.n || cfg.n)} <button class="btn sm" onclick="petRename()">✏ Đổi tên</button></h3>
            <small style="color:var(--dim)">Giai đoạn: <b style="color:${cfg.elemCol}">${stName}</b> · Hệ ${SERIES[cfg.series]}</small>
          </div>
          <div style="text-align:right;">
            <b style="color:#ffd24a">Cấp ${p.lvl}</b>
            <div style="font-size:11px;color:var(--dim)">Sát thương: ${fmt(typeof petDmg === 'function' ? petDmg(p) : 50)}/đòn</div>
          </div>
        </div>
        <div class="bar xp" style="height:12px;margin:6px 0;">
          <i style="width:${pct}%;background:linear-gradient(#a0d060,#409020);"></i>
          <span style="font-size:9px;line-height:12px;">${p.xp} / ${needXp} (${pct}%)</span>
        </div>
        <div style="font-size:11px;color:var(--dim);margin-bottom:6px;">
          Kỹ năng: <b style="color:${cfg.elemCol}">${cfg.skillN}</b> - ${cfg.skillDesc}
        </div>
        <div class="card stats" style="margin-bottom:6px;font-size:12px;">
          <span>Sức mạnh: <b>${p.str || 10}</b> <button class="btn sm" onclick="petAddAttr('str')">+</button></span>
          <span>Thân pháp: <b>${p.dex || 10}</b> <button class="btn sm" onclick="petAddAttr('dex')">+</button></span>
          <span>Sinh khí: <b>${p.vit || 10}</b> <button class="btn sm" onclick="petAddAttr('vit')">+</button></span>
          <span>Nội công: <b>${p.eng || 10}</b> <button class="btn sm" onclick="petAddAttr('eng')">+</button></span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;">
          <span>Điểm tiềm năng: <b style="color:#ffd24a">${p.pts || 0}</b></span>
          <div>
            <button class="btn sm" onclick="petAutoAttr()">Tự cộng</button>
            <button class="btn sm" onclick="petResetAttr()">Tẩy điểm</button>
          </div>
        </div>
      </div>
      <h4 style="margin:6px 0;font-size:12px;color:var(--gold);">Chọn Linh Thú Ngũ Hành PVK:</h4>
      <div style="display:grid;grid-template-columns:repeat(5, 1fr);gap:4px;margin-top:4px;">
        ${typeof PVK_PETS !== 'undefined' ? Object.keys(PVK_PETS).map(k => {
          const item = PVK_PETS[k];
          const on = (p.id || 'loikiem') === k;
          return `<button class="btn sm ${on ? 'on' : ''}" style="padding:6px 2px;text-align:center;" onclick="petAdopt('${k}')">
            <b style="color:${item.elemCol};display:block;font-size:11px;">${item.n}</b>
            <small style="color:var(--dim);font-size:9px;">${SERIES[item.series]}</small>
          </button>`;
        }).join('') : ''}
      </div>
    `;
  }
  if (giftTab === 'mount') {
    if (typeof pvkEnsureMount === 'function') pvkEnsureMount();
    const m = S.mount || { tier: 1, lvl: 1, exp: 0, fodder: 10 };
    const cur = typeof mountCurrent === 'function' ? mountCurrent() : PVK_MOUNTS[0];
    const next = PVK_MOUNTS[cur.tier] || null;
    const pct = next ? Math.min(100, Math.floor((m.exp || 0) * 100 / cur.expNeed)) : 100;
    return `
      <div style="text-align:center;padding:10px;background:var(--panel2);border:1px solid var(--line);border-radius:8px;margin-bottom:8px;">
        <h3 style="color:${cur.col};margin:2px 0;">${cur.n} (Bậc ${cur.tier}/11)</h3>
        <p style="font-size:11px;color:var(--dim);">Yêu cầu cấp: ${cur.minLvl}</p>
        <div class="bar xp" style="height:14px;margin:6px auto;max-width:280px;">
          <i style="width:${pct}%;background:linear-gradient(#f0c040,#a07010);"></i>
          <span style="font-size:9.5px;line-height:14px;">${next ? `${m.exp} / ${cur.expNeed} (${pct}%)` : 'Đỉnh Phong'}</span>
        </div>
      </div>
      <div class="card stats">
        <span>Tốc độ di chuyển</span><span style="color:#7fe3ff">+${cur.spd}%</span>
        <span>Sinh lực tối đa</span><span style="color:#ff7a55">+${cur.hpPct}%</span>
        <span>Kháng tất cả</span><span style="color:#a87fff">+${cur.allRes}%</span>
        <span>Tăng sát thương</span><span style="color:#ffd24a">+${cur.dmgPct}%</span>
        <span>Cỏ Linh Chi có sẵn</span><span><b>${m.fodder || 0}</b> bó</span>
      </div>
      ${next ? `
        <div class="btnrow">
          <button class="btn on" onclick="mountFeed(true);refreshGift();">Cho ăn Cỏ (+250 EXP)</button>
          <button class="btn" onclick="mountFeed(false);refreshGift();">Nuôi bằng Lượng (+120 EXP)</button>
        </div>
      ` : '<p style="color:#4fd04f;text-align:center;font-weight:bold;">Đã đạt Thần Thú Cực Phẩm Xích Long Câu!</p>'}
    `;
  }
  if (giftTab === 'boss') {
    if (typeof pvkEnsureBoss === 'function') pvkEnsureBoss();
    const bs = S.bossState || { tickets: 3, defeated: {} };
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span>Vé khiêu chiến: <b style="color:#ffd24a">${bs.tickets} / 3</b></span>
        ${bs.tickets < 3 ? `<button class="btn sm" onclick="pvkBuyBossTicket();refreshGift();">Mua lượt (3k lượng)</button>` : ''}
      </div>
      <div style="display:grid;gap:6px;max-height:48vh;overflow-y:auto;">
        ${PVK_WORLD_BOSSES.map(b => {
          const locked = S.lvl < b.reqLvl;
          const count = bs.defeated[b.id] || 0;
          return `
            <div style="display:grid;grid-template-columns:1fr auto;gap:6px;align-items:center;padding:6px 8px;border:1px solid ${SERIES_COL[b.series]};border-radius:6px;background:var(--panel2);opacity:${locked ? '0.5' : '1'};">
              <div>
                <b style="color:${SERIES_COL[b.series]}">${b.n}</b> <small style="color:var(--dim)">(${b.title})</small>
                <div style="font-size:10px;color:var(--dim)">Cấp ${b.lvl} · Hệ ${SERIES[b.series]} · Y/c cấp ${b.reqLvl} · Đã hạ: <b style="color:#7fe3ff">${count}</b></div>
                <div style="font-size:10px;color:#ffd24a">Thưởng: ${fmt(b.dropGold)} lượng, Đồ Hoàng Kim, Rượu, Gỗ, Cỏ</div>
              </div>
              <div>
                ${locked ? `<span class="dim" style="font-size:11px;">Cấp ${b.reqLvl}</span>` : `
                  <button class="btn on sm" onclick="bossChallenge('${b.id}');">Đấu</button>
                `}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
  const bo = rebornBonus(), full = r.stat.reborn >= REBORN_MAX;
  const nextN = r.stat.reborn + 1;
  return `
    <div style="background:var(--panel2);border:1px solid #5a4425;border-radius:8px;padding:12px;margin-bottom:10px;">
      <h3 style="color:#ffd700;margin:0 0 6px 0;font-size:14px;text-align:center;">🌟 THẦN VÕ CHUYỂN SINH (CẤP 200)</h3>
      <p class="desc" style="font-size:12px;line-height:1.5;color:#e2d9c8;margin-bottom:8px;">
        Đạt đỉnh phong <b>Đẳng cấp ${REBORN_LV}</b> có thể tiến hành Chuyển Sinh: Nhân vật quay về Cấp 1, giữ nguyên toàn bộ trang bị, kỹ năng võ công. Mỗi lần chuyển sinh nhận lượng lớn <b>Bảo Vật Quý Hiếm</b> theo số lần chuyển sinh và thuộc tính vĩnh viễn (tối đa ${REBORN_MAX} lần).
      </p>
      <div style="font-size:12px;display:grid;grid-template-columns:1fr 1fr;gap:6px;background:#15100a;padding:8px;border-radius:6px;margin-bottom:8px;">
        <div>Đã chuyển sinh: <b style="color:#fbbf24;">${r.stat.reborn} / ${REBORN_MAX} lần</b></div>
        <div>Tăng EXP vĩnh viễn: <b style="color:#4ade80;">+${Math.round(bo.xp * 100)}%</b></div>
        <div>Tăng Sát thương: <b style="color:#ef4444;">+${Math.round(bo.dmg * 100)}%</b></div>
        <div>Cấp hiện tại: <b style="color:${S.lvl >= REBORN_LV ? '#4ade80' : '#f87171'};">${S.lvl} / ${REBORN_LV}</b></div>
        ${!full ? `<div style="grid-column:1/-1;">Chi phí lần ${nextN}: <b style="color:#ffd700;">${(nextN * 5000000).toLocaleString()} Vàng</b>${(S.gold||0) >= nextN*5000000 ? ' <span style="color:#4ade80;">✔ Đủ</span>' : ' <span style="color:#f87171;">✘ Chưa đủ</span>'}</div>` : ''}
      </div>
      ${!full ? `
        <div style="font-size:11px;color:#a39276;margin-bottom:8px;">
          🎁 <b>Quà Chuyển Sinh lần ${nextN}:</b> +${nextN * 100} Điểm Tiềm Năng, ${fmt(nextN * 100000)} Lượng, +${nextN * 100} Phúc Duyên, 3x Huyền Tinh Cấp ${Math.min(10, 5 + nextN)}, ${nextN * 50} Cỏ Linh Chi, Trang bị ${nextN >= 3 ? 'Bạch Kim' : 'Hoàng Kim'}, Phi Phong Bậc ${nextN}.
        </div>
      ` : ''}
      ${typeof tpPending === 'function' && tpPending() ? `<div class="btnrow" style="margin-bottom:8px;"><button class="btn gold" id="gTamPhap" style="width:100%;font-size:12px;font-weight:bold;">⚡ Chọn Tâm Pháp (${tpPending()} lượt)</button></div>` : ''}
      ${typeof TAM_PHAP !== 'undefined' && typeof tpStacks === 'function' ? `<div style="font-size:11px;color:#cbd5e1;background:#15100a;padding:6px 8px;border-radius:4px;margin-bottom:8px;">Tâm pháp: <b>${TAM_PHAP.map(t => `${t.n} ×${tpStacks()[t.k] || 0}`).join(' · ')}</b></div>` : ''}
    </div>
    <div class="btnrow" style="text-align:center;">
      <button class="btn red" id="gReborn" ${S.lvl >= REBORN_LV && !full && (S.gold||0) >= nextN*5000000 ? '' : 'disabled'} style="font-size:13px;padding:8px 24px;">
        ${full ? 'Đã Chuyển Sinh Tối Đa' : S.lvl >= REBORN_LV ? `⚡ Chuyển Sinh Lần ${nextN} (${(nextN * 5000000).toLocaleString()} Vàng)` : `Chưa Đạt Cấp ${REBORN_LV} (${S.lvl}/${REBORN_LV})`}
      </button>
    </div>
  `;
}
function giftModal() {
  if (!S.fac) return;
  const r = RW(), tabs = [['login', 'Điểm danh'], ['lvms', 'Mốc cấp'], ['quest', 'Nhiệm vụ'], ['ach', 'Thành tựu'], ['chest', 'Phúc Duyên'], ['event', 'Sự kiện'], ['tower', 'Tháp'], ['pet', 'Đồng hành'], ['mount', 'Chiến mã'], ['boss', 'Boss HK'], ['reborn', 'Chuyển sinh']];
  modal(`<h3>Phần thưởng <small>Phúc Duyên ${r.fd}</small></h3><div class="dtabs" id="giftTabs">${tabs.map(([k, n]) => `<button data-g="${k}" class="${k === giftTab ? 'on' : ''}">${n}</button>`).join('')}</div>${giftBody(r)}`, () => {
    document.querySelectorAll('#mBody #giftTabs button').forEach(x => x.onclick = () => { giftTab = x.dataset.g; giftModal(); });
    const on = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
    on('#gLogin', () => { claimLogin(); refreshGift(); }); on('#gChest', openChest); on('#gTower', towerStart);
    on('#gTowerOut', () => { towerExit(false); refreshGift(); }); on('#gReborn', doReborn);
    on('#gTamPhap', () => { if (typeof tamPhapModal === 'function') tamPhapModal(); });
    document.querySelectorAll('#mBody [data-lv]').forEach(x => x.onclick = () => claimLvMs(+x.dataset.lv));
    document.querySelectorAll('#mBody [data-q]').forEach(x => x.onclick = () => { claimQuest(+x.dataset.q); refreshGift(); });
    document.querySelectorAll('#mBody [data-t]').forEach(x => x.onclick = () => { r.title = r.title === x.dataset.t ? '' : x.dataset.t; R.dirty = true; save(); refreshGift(); });
    document.querySelectorAll('#mBody [data-e]').forEach(x => x.onclick = () => eventBuy(+x.dataset.e));
  });
}
