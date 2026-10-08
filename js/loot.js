/* ======================= ROI DO (settings/droprate/*.ini + magicattriblevel.txt) ======================= */
'use strict';
const FACTION_WEAPON_SHARE = 0.5;
function dropFile(L) {
  const b = L < 110 ? clamp(Math.floor(L / 10) * 10, 10, 90) : (L < 119 ? 110 : 119);
  return J.drop['npcdroprate' + b + '.ini'] || J.drop['npcdroprate.ini'];
}
/* Cap vat pham 1..10 theo cap quai, gioi han boi MinItemLevel/MaxItemLevel cua tep roi do */
function itemTier(L, df) {
  const m = df.main;
  return clamp(Math.round(L / 12) + irnd(-1, 1), m.MinItemLevel || 1, m.MaxItemLevel || 10);
}
function baseRow(detail, particular, tier) {
  const g = J.items[detail]; if (!g) return null;
  let rows = g.list.filter(r => r.k === particular);
  if (!rows.length) return null;
  const okRows = rows.filter(r => sexReqOk(r.req)); if (okRows.length) rows = okRows;   // uu tien mon dung gioi tinh nhan vat
  return rows.reduce((b, r) => Math.abs(r.lvl - tier) < Math.abs(b.lvl - tier) ? r : b);
}
/* Thuoc tinh ma thuat theo KItemGenerator::Gen_MagicAttrib + KLibOfBPT (magicattrib.txt, 330 dong):
   dong i = 0,2,4 la tien to (hien), 1,3,5 la hau to (an, can ngu hanh kich hoat); ung vien = dong cung loai tien/hau to,
   he yeu cau (-1 = moi he) bang he cua mon do, cap dong <= cap thuoc tinh, ti le roi theo loai trang bi > nDecide,
   khong trung loai thuoc tinh; chon ngau nhien deu; gia tri ngau nhien trong khoang. */
function rollMagic(it, levels, lucky = 0) {
  const out = [], used = new Set();
  for (let i = 0; i < levels.length; i++) {
    const pre = i % 2 === 0 ? 1 : 0, lv = levels[i];
    const decide = Math.floor(Math.random() * 100) / (1 + lucky * 20 / 100);
    const cand = J.affix.filter(a => a.pre === pre && (a.s < 0 || a.s === it.s) && a.lvl <= lv && (a.w[it.d] || 0) > decide && !used.has(a.a));
    if (!cand.length) break;
    const a = pick(cand); used.add(a.a);
    const p = a.p.map(([mn, mx]) => mn === -1 && mx === -1 ? -1 : irnd(Math.min(mn, mx), Math.max(mn, mx)));
    out.push({ a: a.a, p, n: a.n, pre });
  }
  return out;
}
function magicCount(cls) {
  const r = Math.random() * 100 - (cls === 'boss' ? 35 : cls === 'elite' ? 12 : 0) - (R.P ? R.P.lucky : 0) * 0.5;
  return r < 3 ? irnd(5, 6) : r < 15 ? irnd(3, 4) : r < 50 ? irnd(1, 2) : 0;
}
/* cap tung dong thuoc tinh (pnaryMALevel): quanh cap mon do, 1..10 */
const magicLevels = (n, tier) => Array.from({ length: n }, () => clamp(tier + irnd(-1, 0), 1, 10));
function rarityOf(n) { return n >= 3 ? 2 : n >= 1 ? 1 : 0; }   // Tim (3) chi tu Huyen Tinh (recipes.js), do roi ngau nhien toi da Vang
const randomSeries = () => irnd(0, 4); // KItemGenerator: he ngau nhien Kim..Tho neu khong yeu cau he

/* Trang phuc nam / nu nam o cac "particular" khac nhau (vd ao 0..6 nam, 7..13 nu): doi sang loai dung gioi tinh nhan vat */
function sexPart(detail, part) {
  const g = J.items[detail]; if (!g) return part;
  const rows = g.list.filter(r => r.k === part);
  if (!rows.length || rows.some(r => sexReqOk(r.req))) return part;
  const alt = [...new Set(g.list.filter(r => sexReqOk(r.req)).map(r => r.k))];
  return alt.length ? pick(alt) : part;
}
function makeItem(detail, particular, tier, nMagic) {
  const b = baseRow(detail, particular, tier); if (!b) return null;
  const it = { uid: S.uid++, d: detail, k: particular, p: b.p, n: b.n, ic: b.ic || '', lvl: b.lvl, s: b.s >= 0 ? b.s : randomSeries(),
    base: b.base.map(x => x.slice()), req: b.req.map(x => x.slice()), price: b.price };
  it.mag = rollMagic(it, magicLevels(nMagic, b.lvl), R.P ? R.P.lucky : 0);
  it.r = rarityOf(it.mag.length);
  return it;
}
/* Roi do khi ha quai: so luong theo loai quai, mon theo RandRate/RandRange cua tep droprate */
function rollDrops(e) {
  const df = dropFile(e.L), items = df.items.filter(x => x[0] === 0 && x[1] <= 9);
  const n = e.cls === 'boss' ? 3 : e.cls === 'elite' ? (Math.random() < 0.5 ? 1 : 0) : (Math.random() < 0.1 ? 1 : 0);
  const out = [];
  for (let i = 0; i < n * (e.bonusDrop || 1); i++) {
    const x = wpick(items, r => r[3]); if (!x) continue;
    let [detail, part] = [x[1], x[2]];
    // JX mua vu khi o tiem; game idle khong co tiem -> mot nua so vu khi roi ra dung loai vu khi cua phai
    const f = FAC[S.fac];
    if (detail <= 1 && f && f.wcode >= 0 && Math.random() < FACTION_WEAPON_SHARE) [detail, part] = f.wcode === 7 ? [1, irnd(0, 2)] : [0, f.wcode === 9 ? 6 : f.wcode];
    part = sexPart(detail, part);
    let it = makeItem(detail, part, itemTier(e.L, df), magicCount(e.cls));
    for (let t = 0; it && !sexOk(it) && t < 6; t++) it = makeItem(detail, part, itemTier(e.L, df), magicCount(e.cls));   // khong roi trang phuc khac gioi tinh
    if (it && sexOk(it)) out.push(it);
  }
  return out;
}
function moneyDrop(e) {
  const m = dropFile(e.L).main;
  const vipGold = (typeof vipGoldMul === 'function') ? vipGoldMul() : 1;
  return Math.round((m.MoneyScale || 50) / 10 * e.L * rnd(0.6, 1.4) * (e.cls === 'boss' ? 8 : e.cls === 'elite' ? 2 : 1) * vipGold);
}
const itemValue = it => Math.round((it.price || 100) / 10 * (1 + it.mag.length * 0.8));
function itemPower(it) {
  let v = it.lvl * 10;
  for (const [id, mn, mx] of it.base) if (id === 28 || id === 29 || id === 30) v += (mn + mx) / 2;
  for (const m of it.mag) v += 15 + Math.abs(m.p[0]) * 0.6;
  return v * enhMul(it);
}
function slotFor(it) {
  const s = DETAIL_SLOT[it.d];
  if (s === 'ring') return !S.eq.ring1 ? 'ring1' : !S.eq.ring2 ? 'ring2' : (itemPower(S.eq.ring1) <= itemPower(S.eq.ring2) ? 'ring1' : 'ring2');
  return s;
}
function itemLines(it) {
  const L = [], dmin = it.base.find(b => b[0] === 28), dmax = it.base.find(b => b[0] === 29), k = enhMul(it);
  if (it.plv) L.push(['h on', `Bạch Kim +${it.plv}: thuộc tính gốc +${Math.round(it.plv * PLAT_STEP * 100)}%`]);
  if (it.enh) L.push(['h on', `Cường hóa +${it.enh}: thuộc tính gốc +${Math.round((k - 1) * 100)}%`]);
  if (dmin) L.push(['b', `Sát thương: ${Math.round(dmin[1] * k)} - ${Math.round((dmax ? dmax[1] : dmin[1]) * k)}`]);
  for (const [id, mn, mx] of it.base) {
    const nm = attrName(id); if (id === 28 || id === 29 || nm === 'durability_v' || nm === 'item_purple' || id === 167) continue;
    L.push(['b', attrText(nm, [Math.round((mn + mx) / 2 * k), 0, Math.round(mx * k)])]);
  }
  const act = typeof hiddenActive === 'function' ? hiddenActive(it) : 0;
  it.mag.forEach((m, i) => {
    const hidden = i % 2 === 1, on = !hidden || Math.floor(i / 2) < act;
    L.push([hidden ? (on ? 'h on' : 'h') : 'm', attrText(attrName(m.a), m.p.map(v => v === -1 ? 0 : v)) + (hidden && !on ? ' (ẩn)' : '')]);
  });
  if (it.set) {
    const ex = typeof goldEnhance === 'function' ? goldEnhance(it, S.eq) : 0, cnt = typeof setCounts === 'function' ? (setCounts(S.eq)[it.set.grp] || 0) : 0;
    (it.ext || []).forEach((m, i) => L.push([i < ex ? 'h on' : 'h', attrText(attrName(m.a), m.p.map(v => v === -1 ? 0 : v)) + (i < ex ? ' (bộ)' : ` (mặc ${it.set.n1 * (i + 1)} món cùng bộ)`)]));
    L.push(['r', `Bộ ${it.set.kind === 'gold' ? 'Hoàng Kim' : 'Bạch Kim'}: đang mặc ${cnt} món · đủ ${it.set.n2} món mở hết dòng ẩn mọi trang bị`]);
    for (const r of setMembers(it)) L.push(['r', `  ${Object.values(S.eq).some(e => e && e.set && e.n === r.n) ? '✔' : '·'} ${r.n}`]);
  }
  const REQ = { 36: 'Cấp', 32: 'Sức mạnh', 33: 'Thân pháp', 34: 'Sinh khí', 35: 'Nội công', 37: 'Hệ', 38: 'Giới tính', 39: 'Môn phái' };
  for (const entry of (it.req || [])) {
    if (!entry) continue;
    const id = Array.isArray(entry) ? entry[0] : (entry.id !== undefined ? entry.id : entry[0]);
    const v = Array.isArray(entry) ? entry[1] : (entry.v !== undefined ? entry.v : entry[1]);
    if (REQ[id] && (v > 0 || id === 39)) L.push(['r', `Yêu cầu ${REQ[id]}: ${id === 37 ? SERIES[v] : id === 39 ? ((J.factions[v] || {}).n || v) : v}`]);
  }
  return L;
}

/* ======================= DO ROI TREN DAT + BO LOC ======================= */
const GROUND_MAX = 40, PICK_R = 26;
const LOOT_ATTR_GROUPS = [ // thuoc tinh hay loc (ten trong KMagicDesc.cpp)
  ['Sinh lực', ['lifemax_v', 'lifemax_p', 'lifereplenish_v']], ['Nội lực', ['manamax_v', 'manamax_p', 'manareplenish_v']],
  ['Sát thương', ['addphysicsdamage_v', 'addphysicsdamage_p', 'addfiredamage_v', 'addcolddamage_v', 'addlightingdamage_v', 'addpoisondamage_v']],
  ['Kháng', ['physicsres_p', 'poisonres_p', 'coldres_p', 'fireres_p', 'lightingres_p', 'allres_p']],
  ['Chỉ số', ['strength_v', 'dexterity_v', 'vitality_v', 'energy_v']], ['Kỹ năng', ['allskill_v', 'addphysicsmagic_v', 'addcoldmagic_v', 'addfiremagic_v', 'addlightingmagic_v', 'addpoisonmagic_v']],
  ['Tốc độ', ['attackspeed_v', 'castspeed_v', 'fastwalkrun_p']], ['Hút máu / nội', ['steallifeenhance_p', 'stealmanaenhance_p']],
  ['Chính xác / né', ['attackratingenhance_v', 'adddefense_v']], ['Ngũ hành', ['metalskill_v', 'woodskill_v', 'waterskill_v', 'fireskill_v', 'earthskill_v']],
];
const LOOT_SPECIFIC_ATTRS = [
  { id: '', n: '-- Bất kỳ thuộc tính nào --' },
  { id: 'allres_p', n: 'Kháng tất cả (%)' },
  { id: 'steallifeenhance_p', n: 'Hút sinh lực (%)' },
  { id: 'stealmanaenhance_p', n: 'Hút nội lực (%)' },
  { id: 'attackspeed_v', n: 'Tốc độ đánh (ngoại công)' },
  { id: 'castspeed_v', n: 'Tốc độ xuất chiêu (nội công)' },
  { id: 'fastwalkrun_p', n: 'Tốc độ di chuyển (%)' },
  { id: 'allskill_v', n: 'Kỹ năng vốn có (+cấp)' },
  { id: 'lifemax_v', n: 'Sinh lực tối đa (điểm)' },
  { id: 'lifemax_p', n: 'Sinh lực tối đa (%)' },
  { id: 'manamax_v', n: 'Nội lực tối đa (điểm)' },
  { id: 'physicsres_p', n: 'Kháng vật lý (%)' },
  { id: 'coldres_p', n: 'Kháng băng (%)' },
  { id: 'fireres_p', n: 'Kháng hỏa (%)' },
  { id: 'lightingres_p', n: 'Kháng lôi (%)' },
  { id: 'poisonres_p', n: 'Kháng độc (%)' },
  { id: 'strength_v', n: 'Sức mạnh' },
  { id: 'dexterity_v', n: 'Thân pháp' },
  { id: 'vitality_v', n: 'Sinh khí' },
  { id: 'energy_v', n: 'Nội công' },
  { id: 'addphysicsdamage_v', n: 'Sát thương vật lý (điểm)' },
  { id: 'addphysicsdamage_p', n: 'Sát thương vật lý (%)' }
];

function lootFilter() {
  const f = S.lootF || (S.lootF = { minRar: 0, minLvl: 1, groups: [], series: [], targetAttr: '', minAttrVal: 0, auto: true });
  if (f.minRar === undefined || f.minRar === null) f.minRar = 0;
  if (f.auto === undefined) f.auto = true;
  if (f.targetAttr === undefined) f.targetAttr = '';
  if (f.minAttrVal === undefined) f.minAttrVal = 0;
  return f;
}
function lootMatch(it) {
  if (!it) return false;
  const f = lootFilter();
  if (f.minRar > 0 && it.r < f.minRar) return false;
  if (f.minLvl > 1 && it.lvl < f.minLvl) return false;
  if (f.series && f.series.length && !f.series.includes(it.s)) return false;
  if (f.groups && f.groups.length) {
    const want = new Set(f.groups.flatMap(g => (LOOT_ATTR_GROUPS[g] || [0, []])[1]));
    if (!it.mag.some(m => want.has(attrName(m.a)))) return false;
  }
  // Lọc theo thuộc tính chỉ định và giá trị tối thiểu (Min Value)
  if (f.targetAttr) {
    const minVal = Number(f.minAttrVal) || 0;
    const hasAttr = it.mag.some(m => {
      if (attrName(m.a) !== f.targetAttr) return false;
      if (minVal <= 0) return true;
      // Giá trị của thuộc tính nằm trong m.p[0] hoặc max(m.p)
      const p = m.p || [];
      const val = Math.max(p[0] || 0, p[2] || 0);
      return val >= minVal;
    });
    if (!hasAttr) return false;
  }
  return true;
}
function dropToGround(it, at) {
  const a = rnd(0, Math.PI * 2), d = rnd(10, 26);
  const [x, y] = inWorld(at.x + Math.cos(a) * d, at.y + Math.sin(a) * d);
  R.ground.push({ it, x, y, age: 0 });
  if (R.ground.length > GROUND_MAX) { let i = R.ground.findIndex(d => !d.it.set && !d.it.vio && !d.it.plv); if (i < 0) i = 0; const old = R.ground.splice(i, 1)[0]; S.gold += itemValue(old.it); } // qua nhieu: mon cu nhat tu ban (khong ban do bo / Tim / Bach Kim neu con mon khac)
  if (!R.quiet) uiSfx(it.d <= 1 ? 'dropWeapon' : it.d === 2 || it.d === 7 ? 'dropCloth' : 'dropOther');
  if (it.r >= 2 && !R.quiet) log(`Rơi xuống đất: <span style="color:${RAR_COL[it.r]}">${esc(it.n)}</span>`);
}
/* Hanh trang day: tu ban mon kem nhat (khong phai do bo) neu mon moi tot hon -> treo may lau van thay do moi */
function makeRoom(it, force) {
  let worst = null;
  // Dac quyen VIP 1+: tu dong ban ngay do trang/xanh rac de danh cho cho mon moi
  if (typeof vipLevel === 'function' && vipLevel() >= 1) {
    const junk = S.inv.find(x => x.r <= 1 && !x.set && !x.vio && !x.plv);
    if (junk) {
      S.gold += itemValue(junk);
      S.inv.splice(S.inv.indexOf(junk), 1);
      invDirty = true;
      return true;
    }
  }
  for (const x of S.inv) if (!x.set && !x.vio && !x.plv && (!worst || itemPower(x) < itemPower(worst))) worst = x;
  if (!worst || (!force && itemPower(worst) >= itemPower(it))) return false;
  S.gold += itemValue(worst); S.inv.splice(S.inv.indexOf(worst), 1); invDirty = true;
  return true;
}
function pickUp(drop, quiet) {
  const i = R.ground.indexOf(drop); if (i < 0) return false;
  if (!drop.it) { R.ground.splice(i, 1); return true; }

  // 1. Neu tui con cho -> nhat vao tui binh thuong
  if (S.inv.length < INV_MAX) {
    R.ground.splice(i, 1);
    addItem(drop.it, quiet, true, R.pickTarget === drop);
    questTick('picked');
    if (R.pickTarget === drop) R.pickTarget = null;
    return true;
  }

  // 2. Neu tui day -> thu don cho (ban mon kem nhat trong tui de lay mon moi tot hon)
  if (makeRoom(drop.it)) {
    R.ground.splice(i, 1);
    addItem(drop.it, quiet, true, R.pickTarget === drop);
    questTick('picked');
    if (R.pickTarget === drop) R.pickTarget = null;
    return true;
  }

  // 3. Neu tui da day toan do manh hon mon moi -> Tu dong ban mon roi nay thanh vang ngay lap tuc (khong de dong tren dat)
  const val = itemValue(drop.it);
  S.gold = (S.gold || 0) + val;
  R.ground.splice(i, 1);
  if (!R.quiet && !quiet) addText(drop.x, drop.y - 20, `+${fmt(val)} lượng`, '#fde047', 10);
  questTick('picked');
  if (R.pickTarget === drop) R.pickTarget = null;
  return true;
}
/* Nhat: tu dong hut do trong ban kinh, di toi mon dang chon (cham tay) hoac tu dong chay toi nhat mon tren dat */
const VACUUM_R = 150; // Ban kinh tu dong nhat do (magnet) quanh nhan vat
function updateGround(dt) {
  if (!R.ground.length) return false;
  for (const d of R.ground) d.age += dt;

  const f = lootFilter();
  const allowAuto = (f.auto !== false) && (!S.auto || S.auto.autoLoot !== false);

  // 1. Tu dong hut / nhat cac mon roi quanh nhan vat NEU KHOP BO LOC (VIP mo rong pham vi toan man hinh)
  if (allowAuto) {
    const vacR = (typeof vipVacuumRadius === 'function') ? Math.max(150, vipVacuumRadius()) : VACUUM_R;
    for (const d of R.ground.slice()) {
      if (d.age < 0.05) continue;
      // Chi hut mon khop bo loc, tru khi nguoi choi chu dong click tay vao mon do
      if (!lootMatch(d.it) && R.pickTarget !== d) continue;
      const dist = Math.hypot(d.x - H.x, d.y - H.y);
      if (dist <= vacR) {
        pickUp(d, true);
      }
    }
  }

  if (!R.ground.length) return false;

  // 2. Cham tay chon mon do cu the -> di toi nhat
  let target = R.pickTarget && R.ground.includes(R.pickTarget) ? R.pickTarget : null;

  // 3. Tu dong chay lai nhat mon gan nhat tren san NEU KHOP BO LOC
  if (!target && allowAuto && !(typeof manual === 'function' && manual())) {
    let best = null, bd = 1500;
    for (const d of R.ground) {
      if (d.age < 0.1) continue;
      // Chi chay lai nhat mon thoa man bo loc!
      if (!lootMatch(d.it)) continue;
      const k = Math.hypot(d.x - H.x, d.y - H.y);
      if (k < bd) { bd = k; best = d; }
    }
    target = best;
  }

  if (!target) return false;
  const dist = Math.hypot(target.x - H.x, target.y - H.y);
  if (dist <= PICK_R + 35) {
    pickUp(target, true);
    H._lootStuck = 0;
    return true;
  }
  obsSteer(H, target.x, target.y, 220 * (R.P ? R.P.speed : 1) * dt);
  H.face = target.x >= H.x ? 1 : -1;
  if (H._stuck && H._stuck > 25) {
    H._lootStuck = (H._lootStuck || 0) + 1;
    if (H._lootStuck > 2) {
      pickUp(target, true);
      H._lootStuck = 0;
    }
  }
  return true;
}

/* Nhat tat ca cac mon dang roi tren mat dat */
function pickupAllGround() {
  let count = 0;
  for (const d of R.ground.slice()) {
    if (pickUp(d, true)) count++;
  }
  if (count > 0) {
    uiSfx('dropOther');
    toast(`Đã nhặt ${count} món đồ trên đất!`);
    refresh();
  } else {
    toast('Không có đồ trên đất');
  }
  return count;
}

/* Sap xep hanh trang: do quy len dau, xep theo cap va loai */
function sortInventory() {
  if (!S.inv || !S.inv.length) { toast('Túi đồ trống'); return; }
  S.inv.sort((a, b) => {
    const aP = (a.set ? 100 : 0) + (a.vio ? 50 : 0) + (a.plv ? 30 : 0) + (a.r * 10);
    const bP = (b.set ? 100 : 0) + (b.vio ? 50 : 0) + (b.plv ? 30 : 0) + (b.r * 10);
    if (aP !== bP) return bP - aP;
    if (a.d !== b.d) return a.d - b.d;
    if (a.lvl !== b.lvl) return b.lvl - a.lvl;
    return itemPower(b) - itemPower(a);
  });
  invDirty = true;
  uiSfx('dropOther');
  toast('Đã sắp xếp gọn gàng hành trang');
  refresh();
}

function groundAt(x, y) {
  let best = null, bd = 30;
  for (const d of R.ground) { const k = Math.hypot(d.x - x, d.y - (y + 6)); if (k < bd) { bd = k; best = d; } }
  return best;
}
function saveGround() { S.ground = R.ground.map(d => ({ it: d.it, wx: d.x, wy: d.y })); }
function restoreGround() { R.ground = (S.ground || []).filter(g => g && g.it).map(g => { const [x, y] = inWorld(g.wx ?? WORLD.w / 2, g.wy ?? WORLD.h / 2); return { it: g.it, x, y, age: 1 }; }); }
