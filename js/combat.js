/* ======================= CHIEN DAU (KNpc::CheckHitTarget / CalcDamage) ======================= */
'use strict';
const R = { corpses: [], lootWait: 0, ground: [], pickTarget: null, enemies: [], P: null, life: 1, mana: 1, atkT: 0, deadT: 0, spawnT: 0, kills: 0, t0: Date.now(), logs: [], fx: [], txt: [], dirty: true, stall: 0, farm: 0 };
const AR = { w: 400, h: 520, top: 70, bot: 470 };
const H = { x: 768, y: 768, face: 1 };

/* ---------- vung / ai ---------- */
const zoneIdx = st => Math.min(ZONES.length - 1, Math.floor((Math.max(1, st) - 1) / ZONE_STAGES));
const zoneOf = st => {
  const n = zoneIdx(st), e = typeof S !== 'undefined' && S && S.zalt && S.zalt[n];
  const za = typeof ZALT !== 'undefined' ? ZALT : (typeof W !== 'undefined' && W.zalt ? W.zalt : {});
  return (e && za && za[n] && za[n][e - 1]) || ZONES[n] || ZONES[0];
};
const inZone = st => ((st - 1) % ZONE_STAGES) + 1;
function stageLevel(st) {
  if (st > STAGES) return Math.min(MAX_LEVEL, 160 + Math.floor((st - STAGES) / 2));   // ai sau vung cuoi kep o cap toi da: nhip len cap 99 (tests: pacing) da hieu chinh voi kep nay; bo kep thi cap 99 mat > 60 gio
  const z = zoneOf(st); return Math.round(z.lo + (inZone(st) - 1) * (z.hi - z.lo) / (ZONE_STAGES - 1));
}
const isBossStage = st => inZone(st) === ZONE_STAGES;

function bestStageForLevel(lvl) {
  let bestZIdx = 0;
  for (let i = 0; i < ZONES.length; i++) {
    const z = ZONES[i];
    if (lvl >= z.lo) bestZIdx = i;
  }
  const z = ZONES[bestZIdx];
  // Tu dong mo khoa ai toi thieu cua ban do khi du cap do
  const minStageOfZone = bestZIdx * ZONE_STAGES + 1;
  if (S && (S.maxStage || 1) < minStageOfZone) {
    S.maxStage = minStageOfZone;
  }
  const maxAvailableInZone = Math.min(ZONE_STAGES, Math.max(1, (S ? S.maxStage : 1) - bestZIdx * ZONE_STAGES));
  let bestStage = bestZIdx * ZONE_STAGES + 1;
  let minDiff = 999;
  for (let s = 1; s <= maxAvailableInZone; s++) {
    const candidate = bestZIdx * ZONE_STAGES + s;
    const sLvl = stageLevel(candidate);
    const diff = Math.abs(sLvl - lvl);
    if (diff < minDiff) { minDiff = diff; bestStage = candidate; }
  }
  return bestStage;
}

function checkAutoMap() {
  if (!S || S.autoMap === false || R.town || R.tower || (typeof SV !== 'undefined' && SV.on)) return;
  const curZ = zoneOf(S.stage);
  // Ưu tiên bản đồ người chơi chọn để luyện công với điều kiện không vượt cấp (S.lvl >= curZ.lo)
  if (S.chosenZone && curZ && curZ.id === S.chosenZone) {
    if (S.lvl >= curZ.lo) return; // Người chơi đủ điều kiện cấp độ vào bản đồ này -> giữ nguyên luyện công
  }
  const curLvl = stageLevel(S.stage);
  // Neu cap do vuot qua nguong ban do hien tai (hoac vuot chenh lech >= 5 cap)
  const isOverLeveled = (curZ && S.lvl > curZ.hi) || (S.lvl - curLvl >= 5);
  const isUnderLeveled = (curZ && S.lvl < curZ.lo) || (curLvl - S.lvl >= 6);

  if (isOverLeveled || isUnderLeveled) {
    const target = bestStageForLevel(S.lvl);
    if (target !== S.stage) {
      const targetZ = zoneOf(target);
      log(`Tự chuyển bản đồ phù hợp cấp ${S.lvl}: <b>${esc(targetZ.n)}</b> (Ải ${inZone(target)} - Cấp ${targetZ.lo}–${targetZ.hi})`);
      if (typeof toast === 'function') toast(`🗺 Tự chuyển sang ${targetZ.n} (Ải ${inZone(target)})!`);
      gotoStage(target);
    }
  }
}

/* ---------- quai: Npcs.txt khong co chi so theo cap -> cong thuc rieng cua game (docs/CONG_THUC.md) ---------- */
const POISON_TIME = 3;
const CLS = { normal: { hp: 1, dmg: 1, xp: 1, r: 17 }, elite: { hp: 1.8, dmg: 1.15, xp: 3, r: 21 }, boss: { hp: 6.5, dmg: 1.35, xp: 20, r: 30 } };
/* Do kho (chon o the Khac): Thuong la can bang chuan cua cac bo kiem thu. De / Kho doi mau, sat thuong quai va thuong kinh nghiem / ngan luong */
const DIFFS = [{ n: 'Dễ', hp: 0.75, dmg: 0.7, rew: 0.8, d: 'Quái yếu hơn (máu −25%, sát thương −30%), thưởng −20%' }, { n: 'Thường', hp: 1, dmg: 1, rew: 1, d: 'Cân bằng chuẩn' }, { n: 'Khó', hp: 1.4, dmg: 1.35, rew: 1.25, d: 'Quái mạnh hơn (máu +40%, sát thương +35%), thưởng +25%' }];
const diffOf = () => DIFFS[(S && [0, 1, 2].includes(S.diff)) ? S.diff : 1];
function enemyStats(L, cls) {
  const c = CLS[cls];
  return { hp: (12 + 5.0 * L + 0.32 * L * L) * c.hp, dmg: (2 + 0.60 * L + 0.003 * L * L) * c.dmg, ar: 25 + L * 7, def: 4 + L * 2.0 };
}
/* Nhip len cap (docs/CONG_THUC.md): truoc day cap 150 chi mat ~2 gio choi. Den cap 30 giu nguyen (vao game nhanh),
   sau do kinh nghiem nhan duoc chia cho 1 + 200 x ((cap - 30) / 120)^1.4  (cap 60: /30, cap 90: /77, cap 150: /201)
   -> cap 150 mat vai ngay choi (tests: pacing). */
const XP_SLOW_FROM = 60, XP_SLOW_K = 2, XP_SLOW_P = 1.1;
const xpSlow = L => L <= XP_SLOW_FROM ? 1 : 1 + XP_SLOW_K * Math.pow((L - XP_SLOW_FROM) / 120, XP_SLOW_P);
function expFor(L) {
  const need = (typeof expNeed === 'function' ? expNeed(L) : (J.exp[clamp(L, 1, MAX_LEVEL) - 1] || 1000));
  // Giảm EXP khi train quái để cày lâu lên cấp đúng chất võ lâm cày cuốc
  return (need / (40 + L * 3.5)) * 0.35;
}
function makeEnemy(tid, L, cls, x, y) {
  const m = MON[tid], z = zoneOf(S.stage), st = enemyStats(L, cls), D = diffOf(); st.hp *= D.hp; st.dmg *= D.dmg;
  const series = wpick([0, 1, 2, 3, 4], i => z.sw[i] + 1);
  const res = {}; ELEM.forEach((e, i) => { res[e] = Math.min(m.rmax[i] || 75, L * 0.35 + (cls === 'boss' ? 10 : 0)); });
  return { id: Math.random(), tid, n: m.n, img: m.img ? img(m.img) : null, sz: m.sz, L, cls, series, res,
    hp: st.hp, max: st.hp, dmg: st.dmg, ar: st.ar, def: st.def, x, y, r: CLS[cls].r,
    spd: (30 + (m.run || 6) * 4) * (cls === 'boss' ? 0.7 : 1), atkCd: rnd(0.5, 1.5), cd: 1.2 + 18 / Math.max(8, m.spd || 18) * 0.5,
    ranged: Math.random() < 0.2 && cls !== 'boss', stun: 0, poison: 0, poisonDmg: 0, hitT: 0, face: 1 };
}
function spawnWave() {
  const z = (typeof zoneOf === 'function' && typeof S !== 'undefined') ? zoneOf(S.stage) : null;
  if (z && z.id !== R.zoneShown) {
    R.zoneShown = z.id;
    R.banner = { t: 2.4, text: z.n, sub: `Cấp ${z.lo}–${z.hi}` };
    if (typeof onZoneChange === 'function') onZoneChange(z);
  }
  if (!z) return;
  if (S && S.jailUntil && S.jailUntil > Date.now()) {
    R.enemies = [];
    return;
  }

  if (!S.push && R.serverMobsActive && typeof MP !== 'undefined' && MP.connected) {
    if (typeof requestZoneMobs === 'function') requestZoneMobs();
    // Neu qua 2 giay ma server chua tra quai ve, tu dong sinh quai cuc bo de nguoi choi khong bi dung yen
    if (R.enemies && R.enemies.length > 0) return;
  }
  R.enemies = []; R.stall = 0;
  const L = stageLevel(S.stage);
  // quai xuat hien quanh nhan vat (ngoai tam nhin mot chut) roi tien lai
  const around = (r0, r1, ang) => { const a = (ang !== undefined) ? ang : rnd(0, Math.PI * 2), r = rnd(r0, r1); return inWorld(H.x + Math.cos(a) * r, H.y + Math.sin(a) * r); };
  if (S.wave === WAVES && isBossStage(S.stage)) {
    const bp = around(220, 260, 0); const b = makeEnemy(z.boss, L + 1, 'boss', bp[0], bp[1]);
    b._encircleAngle = 0; b._encircleDist = b.ranged ? 180 : (b.r + 26);
    R.enemies.push(b);
    const subN = 8;
    for (let i = 0; i < subN; i++) {
      const a = ((i + 1) / (subN + 1)) * Math.PI * 2;
      const sp = around(160, 240, a);
      const e = makeEnemy(pick(z.m), L, i < 2 ? 'elite' : 'normal', sp[0], sp[1]);
      e._encircleAngle = a;
      e._encircleDist = e.ranged ? (160 + rnd(0, 30)) : (e.r + 28 + rnd(0, 20));
      R.enemies.push(e);
    }
    log(`<b class="boss">${esc(MON[z.boss].n)}</b> cùng tùy tùng xuất hiện!`);
  } else {
    const mul = typeof smMul === 'function' ? smMul() : 1;
    const n = Math.min(25, (5 + irnd(1, 3)) * mul);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd(-0.25, 0.25);
      const sp = around(150, 230, a);
      const e = makeEnemy(pick(z.m), L, (S.wave === WAVES && i < 1) ? 'elite' : 'normal', sp[0], sp[1]);
      e._encircleAngle = a;
      e._encircleDist = e.ranged ? (160 + rnd(0, 30)) : (e.r + 28 + rnd(0, 20));
      R.enemies.push(e);
    }
  }
  if (typeof nhRabbitSpawn === 'function') nhRabbitSpawn(() => around(150, 230));
}

/* ---------- cong thuc trung / sat thuong ---------- */
function hitPercent(ar, def, ignore = 0) {
  const d = def * (100 - Math.min(ignore, 100)) / 100;
  let p = ar + d === 0 ? 50 : ar * 100 / (ar + d);
  if (p > MAX_HIT + 4) p = MAX_HIT;
  return Math.max(MIN_HIT, p);
}
/* Mot phan sat thuong (vat ly / nguyen to) vao muc tieu: ngu hanh -> khang -> nhan (100 - khang)% */
function applyPart(dmg, e, attackerSeries, targetSeries, targetRes, targetResMax, series5) {
  let res = targetRes[e];
  if (counters(attackerSeries, targetSeries)) res -= series5;           // ta khac dich: dich giam khang
  else if (counters(targetSeries, attackerSeries)) res += series5;      // dich khac ta: dich tang khang
  res = clamp(res, -targetResMax, Math.min(targetResMax, MAX_RESIST));
  return dmg * (100 - res) / 100;
}
function heroHit(a, e) {
  if (a.useAR && Math.random() * 100 >= hitPercent(R.P.ar, e.def, a.ignore)) { addText(e.x, e.y - e.r - 8, 'Trượt', '#aaa', 11); return 0; }
  const crit = Math.random() * 100 < a.crit;
  let tot = 0, best = 'phys', bv = 0;
  for (const el in a.parts) {
    let d = a.parts[el] * rnd(0.85, 1.15);
    if (el === 'poison') { // doc cong don: phan chua gay cua lan truoc + lan moi, trai deu 3 giay (KNpc::ReceiveDamage gop 2 luong doc)
      const left = e.poison > 0 ? e.poisonDmg * e.poison : 0;
      e.poisonDmg = (left + applyPart(d, 'poison', a.series, e.series, e.res, 75, a.series5)) / POISON_TIME; e.poison = POISON_TIME; continue; }
    d = applyPart(d, el, a.series, e.series, e.res, 75, a.series5);
    if (crit && el === 'phys') d *= CRIT_MULT;
    tot += d; if (d > bv) { bv = d; best = el; }
  }
  // ngu hanh tang cuong / khang (five_elements_enhance_v) cong tru truc tiep
  if (counters(a.series, e.series)) tot += R.P.series5;
  if (R.P && R.P.bossDmg && (e.cls === 'boss' || e.cls === 'elite')) tot *= R.P.bossDmg;
  tot = Math.max(1, tot);
  e.hp -= tot; e.hitT = 0.12;
  R.stall = 0;
  if (typeof stateOnHit === 'function') stateOnHit(a, e);
  if (e.isPlayer) {
    if (typeof sendPvpHit === 'function') {
      sendPvpHit(e.id, tot, a.id);
    }
  } else {
    if (e.act !== 'at') { e.act = 'hurt'; e.actT = 0; if (e.tid && MON[e.tid]) npcSfx(MON[e.tid].anim, 'hurt', 0.3); }
    if (e.isServerMob && typeof sendMobHit === 'function') {
      sendMobHit(e.id, tot);
    }
  }
  if (a.stun && Math.random() * 100 < a.stun) e.stun = 0.8;
  if (R.P.leech) heal(tot * R.P.leech / 100, true);
  if (R.P.manaLeech) R.mana = Math.min(R.P.mana, R.mana + tot * R.P.manaLeech / 100);
  const k = counters(a.series, e.series) ? ' ⚡' : '';
  addText(e.x, e.y - e.r - 6, fmt(tot) + k, crit ? '#ffe14a' : ELEM_COL[best], crit ? 16 : 12);
  return tot;
}
function enemyHit(e) {
  if (Math.random() * 100 >= hitPercent(e.ar, R.P.def)) { addText(H.x, H.y - 30, 'Né', '#9cf', 11); return; }
  const el = e.series === 1 && Math.random() < 0.4 ? 'poison' : e.series === 2 && Math.random() < 0.4 ? 'cold' : e.series === 3 && Math.random() < 0.4 ? 'fire' : e.series === 4 && Math.random() < 0.3 ? 'light' : 'phys';
  let d = e.dmg * rnd(0.8, 1.2);
  d = applyPart(d, el, e.series, R.P.series, R.P.res, PLAYER_RES_MAX, 10);
  if (R.P.res5 && !counters(e.series, R.P.series)) d = Math.max(1, d - R.P.res5); // ngu hanh khang (five_elements_resist_v)
  d = Math.max(1, Math.round(d * 0.75)); // giam sat thuong quai 25% de de tho hon
  R.life -= d; R.hurtT = 0.25; if (H.act !== 'at' && Math.random() < 0.3) { H.act = 'hurt'; H.actT = 0; }
  if (R.P.retMelee || R.P.retMeleeP) { const ret = R.P.retMelee + d * R.P.retMeleeP / 100; if (ret > 0) { e.hp -= ret; } }
  addText(H.x + rnd(-10, 10), H.y - 36, '-' + fmt(d), '#ff6a5a', 12);
}
function heal(v, quiet) { const b = R.life; R.life = Math.min(R.P.life, R.life + v); if (!quiet && R.life - b > 1) addText(H.x, H.y - 44, '+' + fmt(R.life - b), '#7f7', 11); }

/* ---------- tu dung thuoc (potion.txt): hoi dan theo thoi gian, tru ngan luong ---------- */
const POT_TIER_LV = [0, 1, 20, 40, 70, 100]; // cap nhan vat mo khoa bac thuoc 1..5
function bestPotion(kind) {
  let best = null;
  for (const p of J.potions) if (p.kind === kind && S.lvl >= (POT_TIER_LV[p.tier] || 999) && potPrice(p) <= S.gold && (!best || p.tier > best.tier)) best = p;
  return best;
}
/* Gia thuoc tang theo cap nhan vat (cho tieu ngan luong: potion.txt gia co dinh, quai cap cao roi nhieu ngan luong) */
const potPrice = p => Math.round(p.price * (1 + S.lvl / 25));
function autoPotion(dt) {
  R.hot = R.hot || { life: 0, mana: 0, lifeT: 0, manaT: 0 };
  const h = R.hot, P = R.P;
  for (const k of ['life', 'mana']) {
    if (h[k + 'T'] > 0) { const d = Math.min(dt, h[k + 'T']); h[k + 'T'] -= dt; if (k === 'life') R.life = Math.min(P.life, R.life + h.life * d); else R.mana = Math.min(P.mana, R.mana + h.mana * d); }
  }
  if (S.potOff) return;
  const cfg = S.auto || {};
  const hpLimit = (cfg.hpPct != null ? cfg.hpPct : 70) / 100;
  const mpLimit = (cfg.mpPct != null ? cfg.mpPct : 50) / 100;
  const needLife = R.life < P.life * hpLimit;
  const needMana = P.main.cost > 0 && R.mana < Math.max(P.main.cost * 2, P.mana * mpLimit);
  h.cd = Math.max(0, (h.cd || 0) - dt);
  for (const [k, need] of [['life', needLife], ['mana', needMana]]) {
    const urgent = k === 'life' && R.life < P.life * 0.35 && h.cd <= 0;
    if (!need || (h[k + 'T'] > 0 && !urgent)) continue;
    const own = takeStock(k), p = own || (cfg.autoBuyPot !== false ? bestPotion(k) : null);
    if (!p) {
      if (k === 'life' && cfg.tpOnOutPot && !R.town && R.tpCd <= 0) {
        log('<b style="color:#ff4444;">[Auto]</b> Hết thuốc hồi máu trong túi, tự dùng Thổ Địa Phù về thành!');
        goTown();
      }
      continue;
    }
    usePotion(k, p, !!own);
    if (k === 'life') h.cd = 0.8;
  }
  // Tự dùng Thổ Địa Phù cứu nguy khi HP quá thấp
  const tpLimit = (cfg.tpPct != null ? cfg.tpPct : 20) / 100;
  if (cfg.autoTp && R.life < P.life * tpLimit && !R.town && R.tpCd <= 0) {
    log(`<b style="color:#ff4444;">[Auto]</b> Sinh lực dưới ${Math.round(tpLimit * 100)}%, tự động về thành dưỡng thương!`);
    goTown();
  }
}
function usePotion(k, p, free) { // mua va uong ngay: hoi dan trong p.dur giay, cong don phan con lai cua binh truoc
  R.hot = R.hot || { life: 0, mana: 0, lifeT: 0, manaT: 0 };
  const h = R.hot;
  if (!free) S.gold -= potPrice(p);
  S.potUsed = (S.potUsed || 0) + 1; questTick('pots');
  const left = h[k + 'T'] > 0 ? h[k] * h[k + 'T'] : 0;
  h[k + 'T'] = p.dur; h[k] = (left + p.total) / p.dur;
}

/* ---------- Che do PK & PvP (Luyen Cong / PK / Do Sat) ---------- */
function canAttackPlayer(target) {
  if (!target) return false;
  if (typeof MP !== 'undefined' && MP.myId && target.id === MP.myId) return false;
  if (R.town) return false; // An toàn trong thành
  if (typeof getCurZoneId === 'function' && getCurZoneId() === 37) return false; // Biện Kinh là khu an toàn

  const myMode = (typeof S !== 'undefined' && S && S.pkMode) ? S.pkMode : 'peace';
  const targetMode = target.pkMode || 'peace';

  // Tự vệ chính đáng: nếu mục tiêu là kẻ đồ sát đã tấn công ta trong 15s gần nhất
  if (S && S.selfDefenseTargetId === target.id && Date.now() < (S.selfDefenseUntil || 0)) {
    return true;
  }

  // 1. Chế độ "Luyện công": không đánh người, chỉ đánh quái
  if (myMode === 'peace') {
    return false;
  }

  // 2. Chế độ "PK": đánh người chơi cũng bật PK hoặc Đồ Sát như mình (không đánh người Luyện Công)
  if (myMode === 'pk') {
    return targetMode === 'pk' || targetMode === 'slaughter';
  }

  // 3. Chế độ "Đồ sát": đánh bất cứ ai!
  if (myMode === 'slaughter') {
    return true;
  }

  return false;
}
window.canAttackPlayer = canAttackPlayer;

/* ---------- vong lap ---------- */
const alive = () => {
  const mobs = R.enemies.filter(e => e.hp > 0 && !e.dead);
  // Nếu ở chế độ PK / Đồ sát hoặc có kẻ thù tự vệ, thêm các người chơi đối địch vào danh sách mục tiêu
  if (typeof MP !== 'undefined' && MP.otherPlayers && !R.town && typeof getVisibleOtherPlayers === 'function') {
    const players = getVisibleOtherPlayers();
    for (const p of players) {
      if (canAttackPlayer(p) && (p.hp == null || p.hp > 0)) {
        if (!p._pvpTarget) {
          p._pvpTarget = {
            id: p.id,
            isPlayer: true,
            n: p.name,
            x: p.x,
            y: p.y,
            r: 20,
            get hp() { return p.hp != null ? p.hp : 100; },
            set hp(v) { p.hp = v; },
            get max() { return p.maxHp || 100; },
            def: (p.lvl || 1) * 6 + 40,
            ar: (p.lvl || 1) * 8 + 50,
            series: p.series || 0,
            res: { phys: 25, cold: 25, fire: 25, light: 25, poison: 25 },
            cls: 'normal',
            rawPlayer: p
          };
        }
        p._pvpTarget.x = p.x;
        p._pvpTarget.y = p.y;
        mobs.push(p._pvpTarget);
      }
    }
  }
  return mobs;
};
function nearest(list) {
  let b = null, bd = 1e9;
  const now = Date.now();
  const cfg = (typeof S !== 'undefined' && S && S.auto) ? S.auto : {};
  const range = cfg.range || 650;
  const prio = cfg.targetPrio || 'near';

  let valid = list.filter(e => e.hp > 0 && !e.dead && (!e._unreachable || e._unreachable <= now));
  if (!valid.length) return null; // Không quay lại nhắm mục tiêu đang bị kẹt góc lag

  let pool = valid;
  if (range < 2500) {
    const inRange = valid.filter(e => Math.hypot(e.x - H.x, e.y - H.y) <= range);
    if (inRange.length > 0) pool = inRange;
  }

  // Ưu tiên quái thông thoáng tầm nhìn (không bị chướng ngại vật/tường ngăn cách)
  if (typeof obsLine === 'function') {
    const directLine = pool.filter(e => obsLine(H.x, H.y, e.x, e.y));
    if (directLine.length > 0) pool = directLine;
  }

  if (prio === 'boss') {
    const bosses = pool.filter(e => e.cls === 'boss' || e.cls === 'elite' || e.goldBoss);
    if (bosses.length > 0) pool = bosses;
  } else if (prio === 'low_hp') {
    return pool.slice().sort((a, b) => a.hp - b.hp)[0];
  }

  for (const e of pool) {
    const d = Math.hypot(e.x - H.x, e.y - H.y);
    if (d < bd) { bd = d; b = e; }
  }
  return b;
}
/* Xoay chieu tu dong khi farm quai thuong (gap trum / tinh anh thi danh chieu chinh): luan phien cac chieu tan cong dang gan o 1..4 (luon co 2 chieu manh nhat, them chieu >= 40% DPS chieu manh nhat);
   chieu het noi luc thi bo qua, khong chieu nao du noi luc thi danh thuong. Tat: danh moi chieu chinh nhu truoc. */
function rotPool(P) {
  if (S.rot === false || window.NO_ROT) return [];   // NO_ROT: chi dung de so sanh A / B trong test
  const ids = (S.slots || []).filter(Boolean), pool = P.actives.filter(a => ids.includes(a.id));
  if (pool.length < 2) return [];
  const byDps = pool.slice().sort((a, b) => b.dps - a.dps), top = byDps[0].dps, keep = new Set(byDps.filter((a, i) => i < 2 || a.dps >= top * 0.4));   // it nhat 2 chieu manh nhat, them chieu >= 40% DPS chieu manh nhat
  return ids.map(id => pool.find(a => a.id === id)).filter(a => a && keep.has(a));
}
function pickAttack(P, hard) {
  if (S.auto && S.auto.mainSkillId > 0) {
    const chosen = (P.actives || []).find(a => a.id === S.auto.mainSkillId);
    if (chosen && R.mana >= chosen.cost) return chosen;
  }
  const comboOn = (S.auto && S.auto.combo !== false);
  const pool = (hard || !comboOn) ? [] : rotPool(P);                  // gap trum / khong bat combo: danh chieu chinh manh nhat
  if (pool.length < 2) {
    if (P.main && R.mana >= P.main.cost) return P.main;
    return P.basic || basicAttack(P);
  }
  const n = pool.length; R.rotI = (R.rotI || 0) % n;
  for (let k = 0; k < n; k++) { const a = pool[(R.rotI + k) % n]; if (R.mana >= a.cost) { R.rotI = (R.rotI + k + 1) % n; return a; } }
  return (P.main && R.mana >= P.main.cost) ? P.main : (P.basic || basicAttack(P));
}
function heroAttack() {
  if (S && S.jailUntil && S.jailUntil > Date.now()) {
    R.moveTo = null;
    return 0.5;
  }
  const P = R.P, list = alive();
  if (!list.length) {
    R.moveTo = null;
    return 0.2;
  }
  // Khi Auto Chiến Đấu đang TẮT: Nhân vật TUYỆT ĐỐI không tự động tấn công
  // Chỉ xuất chiêu nếu người chơi bấm tay (R.manualAttack) hoặc chọn mục tiêu (R.manualTarget)
  if (!S || !S.auto || S.auto.on === false) {
    if (!R.manualAttack && !R.manualTarget) {
      R.moveTo = null;
      return 0.3;
    }
  }

  const a = pickAttack(P, list.some(e => e.cls === 'boss' || e.cls === 'elite' || e.goldBoss));
  const t = (R.manualTarget && !R.manualTarget.dead && R.manualTarget.hp > 0) ? R.manualTarget : nearest(list);
  if (!t) return 0.3;
  const d = Math.hypot(t.x - H.x, t.y - H.y) - t.r;
  if (d > a.rad) {
    // Nếu Auto đang tắt và không phải đang đuổi theo mục tiêu chỉ định tay thì dừng lại
    if (S.auto && S.auto.on === false && !R.manualTarget) {
      R.moveTo = null;
      R.manualAttack = false;
      return 0.2;
    }
    R.moveTo = manual() ? null : t;
    if (!manual() && d > 320 && typeof autoRide === 'function' && autoRide() && typeof setMount === 'function') {
      setMount(true, true);
    }
    return 0.05;
  }
  if (typeof rideForAttack === 'function') {
    const rf = rideForAttack(a);
    if (rf === true) return 0.25;
  }
  R.moveTo = null;
  R.mana -= a.cost;
  const c = a.around ? H : t, splash = a.around ? a.rad + 40 : 110; // form 7: quanh nguoi danh
  const targets = list.filter(e => e !== t && Math.hypot(e.x - c.x, e.y - c.y) < (a.targets > 1 ? splash : 0)).slice(0, a.targets - 1);
  targets.unshift(t);
  for (const e of targets) { heroHit(a, e); }
  skillFx(H, t, a);
  H.face = t.x >= H.x ? 1 : -1; H.dir = dirOf(t.x - H.x, t.y - H.y); H.act = 'at'; H.actT = 0;
  if (a.id) skillSfx(a.id); else npcSfx(W.hero[S.fac] && W.hero[S.fac].anim, 'at', 0.4);
  if (typeof sendMultiplayerSkill === 'function') sendMultiplayerSkill(a, t);

  // Xóa cờ tấn công thủ công sau khi tung chiêu
  R.manualAttack = false;
  if (R.manualTarget && (R.manualTarget.dead || R.manualTarget.hp <= 0)) {
    R.manualTarget = null;
  }

  return 1 / a.rate;
}
function enemyAI(e, dt) {
  if (e.stun > 0) { e.stun -= dt; return; }
  if (e.poison > 0) { e.poison -= dt; e.hp -= e.poisonDmg * dt; }
  if (e.home) {
    if (typeof fieldLeash === 'function') fieldLeash(e);
    if (typeof fieldIdle === 'function' && fieldIdle(e, dt)) return;
  }
  const d = Math.hypot(H.x - e.x, H.y - e.y), reach = e.ranged ? 200 : e.r + 24;
  e.face = H.x >= e.x ? 1 : -1; e.dir = dirOf(H.x - e.x, H.y - e.y);
  // Nếu ở quá xa (ngoài 360px) và chưa bị đánh, không cần tính toán đuổi theo (tránh quái cả map ùa vào)
  if (d > 360 && e.hp >= (e.max || 1) && !e.stageBoss) {
    e.moving = false;
    return;
  }
  // Gán góc bao vây nếu quái chưa có (tránh chụm một điểm)
  if (e._encircleAngle === undefined) {
    const idx = (R.enemies && R.enemies.indexOf(e) >= 0) ? R.enemies.indexOf(e) : 0;
    const tot = (R.enemies && R.enemies.length > 0) ? R.enemies.length : 1;
    e._encircleAngle = (idx / tot) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
    e._encircleDist = e.ranged ? (160 + Math.random() * 40) : (e.r + 28 + Math.random() * 18);
  }
  let tx = H.x, ty = H.y;
  if (d <= 220 && !e.ranged) {
    tx = H.x + Math.cos(e._encircleAngle) * e._encircleDist;
    ty = H.y + Math.sin(e._encircleAngle) * e._encircleDist;
  }
  const distToTarget = Math.hypot(tx - e.x, ty - e.y);
  e.moving = (d > reach) || (distToTarget > 14);
  if (e.moving) {
    if (d > 220 || e.ranged) obsChase(e, H.x, H.y, e.spd * dt);
    else obsChase(e, tx, ty, e.spd * dt);
  }
  e.atkCd -= dt;
  if (d <= reach + 6 && e.atkCd <= 0) {
    e.atkCd = e.cd;
    enemyHit(e);
    e.act = 'at';
    e.actT = 0;
    npcSfx(e.animKey || MON[e.tid].anim, 'at', 0.35);
    if (e.ranged) fxLine(e, H, { parts: { phys: 1 } });
  }
}

// Lực đẩy mềm (Soft Collision / Separation) tránh quái đè trùng tọa độ dồn 1 cục
function separateEnemies(dt) {
  const list = R.enemies;
  const n = list ? list.length : 0;
  if (n <= 1) return;
  const minDist = 38;
  const minDist2 = minDist * minDist;
  for (let i = 0; i < n; i++) {
    const a = list[i];
    if (!a || a.hp <= 0 || a.dead) continue;
    let pushX = 0, pushY = 0;
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const b = list[j];
      if (!b || b.hp <= 0 || b.dead) continue;
      let dx = a.x - b.x, dy = a.y - b.y;
      let d2 = dx * dx + dy * dy;
      if (d2 < 0.01) {
        // Trùng khít: tách theo góc phân bố đều để bung đều mọi hướng
        const ang = (i / n) * Math.PI * 2;
        dx = Math.cos(ang);
        dy = Math.sin(ang);
        d2 = 1;
      }
      if (d2 < minDist2) {
        const d = Math.sqrt(d2);
        const overlap = (minDist - d) / minDist;
        const force = overlap * 260 * dt;
        pushX += (dx / d) * force;
        pushY += (dy / d) * force;
      }
    }
    if (pushX !== 0 || pushY !== 0) {
      if (typeof obsMove === 'function') obsMove(a, a.x + pushX, a.y + pushY);
      else { a.x += pushX; a.y += pushY; }
    }
  }
}
let _patrolTarget = null, _patrolT = 0;
function autoPatrol(dt) {
  if (manual() || !S || !S.auto || !S.auto.on) return;
  if (R.town || R.tower || (typeof SV !== 'undefined' && SV.on)) return;
  _patrolT = (_patrolT || 0) + dt;
  if (!_patrolTarget || _patrolT > 3.5 || Math.hypot(_patrolTarget.x - H.x, _patrolTarget.y - H.y) < 25 || (H._stuck && H._stuck > 8)) {
    _patrolT = 0;
    H._stuck = 0;
    let chosen = null;
    for (let tryI = 0; tryI < 8; tryI++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 140 + Math.random() * 120;
      const [px, py] = inWorld(H.x + Math.cos(ang) * dist, H.y + Math.sin(ang) * dist);
      if (typeof obsWalk === 'function' && obsWalk(px, py)) {
        chosen = { x: px, y: py };
        break;
      }
    }
    if (!chosen && typeof inWorld === 'function') {
      const [cx, cy] = inWorld(WORLD.w / 2, WORLD.h / 2);
      chosen = { x: cx, y: cy };
    }
    _patrolTarget = chosen || { x: H.x, y: H.y };
  }
  const sp = (S && S.mounted ? 240 : 160) * (R.P ? R.P.speed : 1);
  obsSteer(H, _patrolTarget.x, _patrolTarget.y, sp * dt);
  H.face = _patrolTarget.x >= H.x ? 1 : -1;
}

function pkDecayTick(dt) {
  if (!S) return;
  const now = Date.now();
  const TWO_HOURS = 2 * 60 * 60 * 1000;
  if (!S.lastPkReduceT) S.lastPkReduceT = now;
  if (S.pkValue > 0 && now - S.lastPkReduceT >= TWO_HOURS) {
    const dec = Math.floor((now - S.lastPkReduceT) / TWO_HOURS);
    S.pkValue = Math.max(0, S.pkValue - dec);
    S.lastPkReduceT = now;
    if (typeof log === 'function') log(`<span style="color:#4ade80;">[Tu Tâm] Đã qua 2 giờ tu dưỡng, điểm PK giảm còn: ${S.pkValue}.</span>`);
    if (typeof updatePkModeBtn === 'function') updatePkModeBtn();
    if (typeof save === 'function') save();
  }
  if (S.jailUntil && now >= S.jailUntil) {
    S.jailUntil = 0;
    if (typeof toast === 'function') toast('🎉 Bạn đã mãn hạn tù 1 ngày và được Quan Phủ phóng thích!');
    if (typeof log === 'function') log('<b style="color:#4ade80;font-size:13px;">[Thiên Lao] Bạn đã mãn hạn tù 1 ngày! Đã được Quan Phủ ân xá phóng thích.</b>');
    if (typeof updatePkModeBtn === 'function') updatePkModeBtn();
    if (typeof save === 'function') save();
  }
}

function tick(dt) {
  obsFrame();
  if ((R.sweepT = (R.sweepT || 0) + dt) > 30) { R.sweepT = 0; autoEquipAll(); sweepJunk(); autoBuyWeapon(); autoForge(); checkHints(); }
  if (R.dirty) recalc();
  const P = R.P;
  if (R.deadT > 0) {
    R.deadT -= dt;
    if (R.deadT <= 0) {
      R.life = P.life;
      R.mana = P.mana;
      S.wave = 1;
      if (S.jailUntil && S.jailUntil > Date.now()) {
        if (typeof getCurZoneId === 'function' && getCurZoneId() !== 37 && typeof travelToZone === 'function') {
          travelToZone(37);
        }
      } else {
        spawnWave();
      }
    }
    return;
  }
  pkDecayTick(dt);
  R.life = Math.min(P.life, R.life + P.regen * dt); R.mana = Math.min(P.mana, R.mana + P.manaRegen * dt);
  autoPotion(dt);
  if (R.hurtT > 0) R.hurtT -= dt;
  if (R.tpCd > 0) R.tpCd -= dt;
  if (R.potCd) { R.potCd.life = Math.max(0, R.potCd.life - dt); R.potCd.mana = Math.max(0, R.potCd.mana - dt); }
  goldBossTick(dt); petTick(dt);                                         // phan thuong: trum Hoang Kim, dong hanh (rewards.js)
  if (typeof rideTick === 'function') rideTick(dt);
  if (typeof skillSysTick === 'function') skillSysTick(dt);
  if (typeof COMPANION_SYSTEM !== 'undefined' && COMPANION_SYSTEM.update) COMPANION_SYSTEM.update(dt);
  if (typeof MAP_EXPANSION !== 'undefined' && MAP_EXPANSION.maintainCampMobs) MAP_EXPANSION.maintainCampMobs(dt);
  if (typeof campTick === 'function') campTick(dt);
  if (typeof autoBuffTick === 'function') autoBuffTick(dt);
  if (typeof autoOmniTick === 'function') autoOmniTick(dt);
  if (typeof autoPartyFollowTick === 'function') autoPartyFollowTick(dt);
  if (typeof autoPartyInviteTick === 'function') autoPartyInviteTick(dt);
  if (typeof teambarFollowTick === 'function') teambarFollowTick(dt);
  if (R.town) { townTick(dt); return; }                                // trong thanh (Tho Dia Phu)
  if (typeof boatOn === 'function' && boatOn()) {
    if (R.dg) R.dg.t += dt;
    if (!R.enemies.length) {
      if (R.spawnT > 0) { R.spawnT -= dt; return; }
      boatSpawn();
      return;
    }
  }
  if (typeof fieldMode === 'function' && fieldMode()) {
    fieldTick(dt);
  }
  R.activeT = (R.activeT || 0) + dt;                                    // thoi gian danh quai thuc (khong tinh tab an, trong thanh, Luyen Cong) -> S.kps
  const looting = updateGround(dt);                       // di nhat do (cham tay, hoac het quai + khop bo loc)
  if (!R.enemies.length) {
    if (looting && R.lootWait < 8) { R.lootWait += dt; return; }   // doi nhat xong (toi da 8 giay) moi goi dot moi
    if (R.spawnT > 0) { R.spawnT -= dt; return; }
    R.lootWait = 0;
    if (R.tower) towerSpawn(); else if (R.dungeon) dungeonSpawn(); else { spawnWave(); if (goldBossDue()) spawnGoldBoss(); }
    if (R.serverMobsActive && typeof MP !== 'undefined' && MP.connected) {
      if (typeof requestZoneMobs === 'function') requestZoneMobs();
      autoPatrol(dt);
    }
    return;
  }
  if (manual()) moveManual(dt);                             // tu dieu khien: joystick / phim / diem cham
  if (!looting) {
    if (manual()) { /* dung yen hoac di theo tay, khong tu chay toi quai */ }
    else if (R.moveTo && R.moveTo.hp > 0 && !R.moveTo.dead) {
      const chaseSpeed = (S && S.mounted ? 260 : 185) * (P ? P.speed : 1);
      obsSteer(H, R.moveTo.x, R.moveTo.y, chaseSpeed * dt);
      H.face = R.moveTo.x >= H.x ? 1 : -1;
      if (H._stuck && H._stuck > 10) {
        if (R.moveTo) R.moveTo._unreachable = Date.now() + 10000;
        R.moveTo = null;
        H._stuck = 0;
        if (typeof obsSnap === 'function') {
          const [sx, sy] = obsSnap(H.x, H.y);
          H.x = sx; H.y = sy;
        }
      }
    } else if (!alive().length && S.auto && S.auto.on && !manual()) {
      // Chỉ tuần tra tìm quái khi trên bản đồ không còn quái nào sống
      autoPatrol(dt);
      if (R.serverMobsActive && typeof requestZoneMobs === 'function') requestZoneMobs();
    }
  }
  // Nhan vat van co the tung don danh quai neu quai trong tam danh khi dang di chuyen nhat do
  R.atkT -= dt; if (R.atkT <= 0) R.atkT = heroAttack();
  for (const e of alive()) enemyAI(e, dt);
  separateEnemies(dt);
  killCheck();
  R.stall += dt; if (R.stall > 180) stallOut();
  if (R.life <= 0) heroDeath();
}
/* Đợt quái quá lâu (không có hành động tiêu diệt hoặc đánh trúng trong 180s): làm mới đợt quái, không tụt ải/cấp */
function stallOut() {
  R.stall = 0;
  if (R.tower) { towerExit(false); return; }
  if (R.enemies.some(e => e.goldBoss && !e.dead)) RW().gbT = GB_RETRY;
  log('<span class="dim">Làm mới đợt quái luyện công.</span>');
  if (!R.serverMobsActive || typeof MP === 'undefined' || !MP.connected) spawnWave();
  if (typeof refresh === 'function') refresh();
  if (typeof save === 'function') save();
}

function killCheck() {
  for (const e of R.enemies) if (e.hp <= 0 && !e.dead) {
    e.dead = true;
    if (e.worldBoss && typeof pvkOnWorldBossKill === 'function') pvkOnWorldBossKill(e);
    onKill(e);
    npcSfx(MON[e.tid].anim, 'die', 0.5);
    if (!R.quiet) { e.act = 'die'; e.actT = 0; R.corpses.push(e); }
  }
  if (R.enemies.length && R.enemies.every(e => e.dead)) { R.enemies = []; waveCleared(); }
}

function onKill(e) {
  R.stall = 0; // Đang tiêu diệt quái thành công -> xóa bộ đếm stall
  R.kills++; S.totalKills = (S.totalKills || 0) + 1;
  const lvDiff = e.L - S.lvl;
  let mult = 1.0;
  if (lvDiff > 10) mult = 0.1;
  else if (lvDiff > 5) mult = 0.5;
  else if (lvDiff < -10) mult = 0.2;
  else if (lvDiff < -5) mult = 0.6;
  const xpL = Math.min(e.L, S.lvl + 5);
  gainXp(expFor(xpL) * CLS[e.cls].xp * mult * diffOf().rew);
  const g = Math.round(moneyDrop(e) * diffOf().rew); S.gold += g;
  burst(e.x, e.y, SERIES_COL[e.series]);
  for (const it of rollDrops(e)) dropToGround(it, e);
  const matDrops = typeof allDrops === 'function' ? allDrops(e) : [];
  for (const m of matDrops) log(`Nhặt được <b style="color:${RAR_COL[3]}">${esc(m)}</b>`);
  const isBoss = !!(e.cls === 'boss' || e.stageBoss || e.goldBoss || e.worldBoss);
  if (isBoss) {
    const shardCount = (e.worldBoss || e.goldBoss) ? (2 + Math.floor(Math.random() * 3)) : (1 + (Math.random() < 0.35 ? 1 : 0));
    if (typeof matAdd === 'function') {
      matAdd('shard', 'gold_shard', shardCount);
      addText(e.x, e.y - 48, `+${shardCount} Mảnh HK`, '#ffd700', 13);
      log(`💎 Tiêu diệt Boss thu thập được <b style="color:#fbbf24">${shardCount} Mảnh Hoàng Kim</b>!`);
    }
  }
  // Boss xanh (elite/leader) có xác xuất 10% rơi lửa trại tại vị trí đánh, tối đa 3 lửa trại
  const isBlueBoss = (e.cls === 'elite' || e.isElite || e.cls === 'leader');
  if (isBlueBoss && Math.random() < 0.10) {
    if (!R.campfires) R.campfires = [];
    if (R.campfires.length < 3) {
      const newCamp = {
        x: e.x,
        y: e.y,
        dur: 300,
        maxDur: 300
      };
      R.campfires.push(newCamp);
      const campTotal = R.campfires.length;
      if (typeof toast === 'function') toast(`🔥 Boss xanh rơi Lửa Trại (+10% EXP, hiện có ${campTotal}/3)!`);
      log(`<b style="color:#ffaa44">🔥 Tiêu diệt Boss Xanh rơi Lửa Trại tại (${Math.round(e.x)}, ${Math.round(e.y)})! +10% EXP quái (cộng dồn ${campTotal * 10}% EXP, ${campTotal}/3 đống lửa).</b>`);
      if (typeof burst === 'function') burst(e.x, e.y, '#ffaa44');
      if (R) R.dirty = true;
    } else {
      if (typeof toast === 'function') toast('🔥 Đã có tối đa 3 Lửa Trại đang cháy (+30% EXP)!');
    }
  }
  if (Math.random() < 0.03 && typeof pvkEnsureMount === 'function') {
    pvkEnsureMount(); S.mount.fodder = (S.mount.fodder || 0) + 1;
    addText(e.x, e.y - 48, '+1 Cỏ Linh Chi', '#66ffaa', 11);
  }
  rwOnKill(e);
  if (typeof vipAddExp === 'function') {
    if (e.dungeonBoss) vipAddExp(100, 'Hạ Trùm Phó Bản');
    else if (e.goldBoss) vipAddExp(50, 'Hạ Trùm Hoàng Kim');
    else if (e.cls === 'boss' || e.stageBoss) vipAddExp(20, 'Hạ Boss');
  }
  if (typeof horseOnKill === 'function') horseOnKill(e);
  if (typeof sk9OnKill === 'function') sk9OnKill(e);
  if (typeof fieldOnKill === 'function') fieldOnKill();
  if (typeof smDrop === 'function') smDrop(e);
  if (typeof nhDrop === 'function') nhDrop(e);

  // TIẾN TRÌNH VƯỢT ẢI (PUSH STAGE PROGRESSION)
  if (S.push) {
    const KILLS_PER_WAVE = 5;
    if (e.stageBoss || (e.cls === 'boss' && S.wave === WAVES)) {
      // Đã tiêu diệt Trùm Ải thành công!
      stageCleared();
    } else if (S.wave < WAVES) {
      R.waveKills = (R.waveKills || 0) + 1;
      if (R.waveKills >= KILLS_PER_WAVE) {
        R.waveKills = 0;
        S.wave++;
        heal(R.P.life * 0.15, true);
        R.mana = Math.min(R.P.mana, R.mana + R.P.mana * 0.2);
        if (S.wave === WAVES) {
          spawnStageBoss();
        } else {
          log(`<span style="color:#ffd700;">[Vượt Ải] Hoàn thành đợt ${S.wave - 1}! Tiến vào <b>Đợt ${S.wave}/${WAVES}</b></span>`);
          if (typeof toast === 'function') toast(`⚔ Đợt ${S.wave}/${WAVES}`);
        }
        if (typeof refresh === 'function') refresh();
        if (typeof save === 'function') save();
      }
    }
  }
}

function spawnStageBoss() {
  if (R.enemies && R.enemies.some(e => e.stageBoss && !e.dead && e.hp > 0)) return;
  const z = zoneOf(Math.min(S.stage, STAGES)), L = stageLevel(S.stage);
  const bp = inWorld(H.x + rnd(140, 200), H.y + rnd(-60, 60));
  const bossTid = z.boss || (z.m && z.m[0]) || 1;
  const bossEnemy = makeEnemy(bossTid, L + 1, 'boss', bp[0], bp[1]);
  bossEnemy.stageBoss = true;
  bossEnemy.n = `[Trùm Ải ${S.stage}] ` + (MON[bossTid] ? MON[bossTid].n : 'Thủ Lĩnh');
  R.enemies = R.enemies || [];
  R.enemies.push(bossEnemy);

  if (typeof burst === 'function') burst(bp[0], bp[1], '#ffd700');
  log(`<b class="boss" style="color:#ef4444;font-size:12.5px;">⚔ TRÙM ẢI ${S.stage}: ${esc(bossEnemy.n)} xuất hiện! Tiêu diệt để vượt ải!</b>`);
  if (typeof toast === 'function') toast(`⚔ Trùm Ải ${S.stage} xuất hiện!`);
}

function stageCleared() {
  const clearedStage = S.stage;
  S.stage++;
  S.maxStage = Math.max(S.maxStage, S.stage);
  S.wave = 1;
  R.waveKills = 0;
  questTick('stages');

  if (typeof uiSfx === 'function') uiSfx('levelup');
  log(`<b class="up" style="color:#22c55e;font-size:13px;">🎉 VƯỢT ẢI ${clearedStage} THÀNH CÔNG!</b> Tiến vào Ải ${S.stage}.`);
  if (typeof toast === 'function') toast(`🎉 Vượt Ải ${clearedStage} Thành Công!`);

  const oldZ = zoneOf(clearedStage);
  const newZ = zoneOf(S.stage);
  if (oldZ && newZ && oldZ.id !== newZ.id) {
    log(`Tiến vào vùng đất mới: <b>${esc(newZ.n)}</b> (Cấp ${newZ.lo}–${newZ.hi})`);
    gotoStage(S.stage, true);
  }

  if (typeof onStageChange === 'function') onStageChange();
  if (typeof save === 'function') save();
  if (typeof refresh === 'function') refresh();
}

function togglePushMode(forceVal) {
  if (typeof S === 'undefined' || !S) return;
  if (forceVal !== undefined) {
    S.push = !!forceVal;
  } else {
    S.push = !S.push;
  }

  R.farm = 0;
  R.waveKills = 0;

  if (S.push) {
    S.wave = 1;
    R.stall = 0;
    log('<b style="color:#f59e0b;">[Chiến Trường] Đã bật chế độ VƯỢT ẢI!</b> Tiến đánh quái và Trùm ải.');
    if (typeof toast === 'function') toast('⚔ Đã bật chế độ VƯỢT ẢI!');
    if (!R.serverMobsActive || typeof MP === 'undefined' || !MP.connected) {
      spawnWave();
    }
  } else {
    R.stall = 0;
    log('<b style="color:#38bdf8;">[Chiến Trường] Đã chuyển sang LUYỆN CÔNG!</b> Cố định bản đồ để cày cấp và thu thập tài nguyên.');
    if (typeof toast === 'function') toast('🛡 Đã chuyển sang chế độ LUYỆN CÔNG!');
    // Nếu có Boss ải đang tồn tại, xóa boss để không gây áp lực
    if (R.enemies) {
      R.enemies = R.enemies.filter(e => !e.stageBoss);
    }
  }

  if (typeof save === 'function') save();
  if (typeof refresh === 'function') refresh();
  if (typeof renderLog === 'function') renderLog();
}

function gainXp(x, maxLevels = 2) {
  if (S.lvl >= MAX_LEVEL) return;
  const campMul = typeof campExpMul === 'function' ? campExpMul() : 1;
  const vipMul = typeof vipExpMul === 'function' ? vipExpMul() : 1;
  const partyMul = (typeof PARTY !== 'undefined' && PARTY.data && PARTY.data.members && PARTY.data.members.length > 1) ? (1 + (PARTY.data.members.length - 1) * 0.1) : 1;
  const addedXp = x * campMul * vipMul * partyMul * (1 + rebornBonus().xp) / xpSlow(S.lvl);
  window._legitExpGain = true;
  try {
    S.xp = Math.max(0, (S.xp || 0) + addedXp);
  } finally {
    window._legitExpGain = false;
  }
  let allowedLevels = (maxLevels !== undefined && maxLevels !== null) ? maxLevels : 2;
  while (S.lvl < MAX_LEVEL && S.xp >= (J.exp[S.lvl - 1] || Infinity) && allowedLevels > 0) {
    allowedLevels--;
    window._legitExpGain = true;
    window._legitLevelTransition = true;
    try {
      S.xp -= J.exp[S.lvl - 1];
      S.lvl++;
      S.attrPts += PTS_PER_LEVEL;
      S.skPts += SKILL_PTS_PER_LEVEL;
    } finally {
      window._legitExpGain = false;
      window._legitLevelTransition = false;
    }
    R.dirty = true;
    uiSfx('levelup');
    log(`<b class="up">Lên cấp ${S.lvl}!</b> +${PTS_PER_LEVEL} tiềm năng, +${SKILL_PTS_PER_LEVEL} kỹ năng`);
    if (typeof onLevelUp === 'function') onLevelUp();
    if (typeof sendProfile === 'function') sendProfile();
    checkAutoMap();
  }
  if (allowedLevels <= 0 && S.xp >= (J.exp[S.lvl - 1] || Infinity)) {
    S.xp = Math.min(S.xp, (J.exp[S.lvl - 1] || 1000) * 0.95);
  }
}

function waveCleared() {
  if (typeof boatOn === 'function' && boatOn()) { boatCleared(); return; }
  if (R.dungeon) { dungeonClearedWave(); return; }
  if (R.tower) { towerCleared(); return; }
  heal(R.P.life * 0.15, true); R.mana = Math.min(R.P.mana, R.mana + R.P.mana * 0.2);

  if (S.push) {
    stageCleared();
  } else {
    // Đang Luyện công: giữ nguyên bản đồ, tuyệt đối không tự ý bật S.push
    S.wave = 1;
    R.waveKills = 0;
    checkAutoMap();
    if (!R.serverMobsActive || typeof MP === 'undefined' || !MP.connected) {
      spawnWave();
    } else {
      if (typeof requestZoneMobs === 'function') requestZoneMobs();
    }
  }

  if (typeof onStageChange === 'function') onStageChange();
  if (typeof save === 'function') save();
  if (typeof refresh === 'function') refresh();
}

function heroDeath(pvpPenalty = false) {
  if (R.enemies.some(e => e.goldBoss && !e.dead)) RW().gbT = GB_RETRY;
  R.deadT = 3; R.life = 0; R.enemies = [];
  log('<span class="bad">Bạn đã trọng thương.</span>');

  // "PK = 10 khi bị đánh chết thì văng hết tiền và đồ đang mặc"
  if (pvpPenalty || (S && S.pkValue >= 10)) {
    let droppedItemsCount = 0;
    if (S.eq) {
      for (const slot of Object.keys(S.eq)) {
        const it = S.eq[slot];
        if (it) {
          if (typeof dropToGround === 'function') dropToGround(it, H);
          delete S.eq[slot];
          droppedItemsCount++;
        }
      }
    }
    const droppedGold = S.gold || 0;
    S.gold = 0;
    log(`<b style="color:#ef4444;font-size:13px;">💥 [Ác Giả Ác Báo] Điểm PK = ${S.pkValue}! Bạn đã bị đánh bại, toàn bộ ${droppedItemsCount} món trang bị trên người và ${fmt(droppedGold)} Lượng ngân lượng đều bị văng rơi sạch!</b>`);
    if (typeof toast === 'function') toast(`💥 PK 10 bị đánh chết: Văng toàn bộ đồ và tiền!`);
    R.dirty = true;
    if (typeof invDirty !== 'undefined') invDirty = true;
  }

  if (typeof boatOn === 'function' && boatOn()) { boatExit(); return; }
  if (R.dungeon) { dungeonFinish(false); return; }
  if (R.tower) { towerExit(true); return; }

  // Nếu đang Vượt ải mà bị chết -> Thất bại, tự động chuyển về Luyện công!
  if (S.push) {
    S.push = false;
    S.wave = 1;
    R.waveKills = 0;
    log(`<b style="color:#ef4444;">[Vượt Ải Thất Bại]</b> Chưa đủ sức vượt qua Ải ${S.stage}. Tự động chuyển về Luyện Công để tích lũy thêm sức mạnh!`);
    if (typeof toast === 'function') toast(`🛡 Chưa đủ sức vượt Ải ${S.stage}, chuyển về Luyện Công!`);
  }
  if (typeof onStageChange === 'function') onStageChange();
  if (typeof refresh === 'function') refresh();
  if (typeof save === 'function') save();
}
function recalc() {
  const fl = R.P ? R.life / R.P.life : 1, fm = R.P ? R.mana / R.P.mana : 1;
  R.P = calc();
  R.life = Math.min(R.P.life, R.P.life * fl); R.mana = Math.min(R.P.mana, R.P.mana * fm);
  R.power = power(R.P); R.dirty = false;
  if (typeof sk9SyncBranch === 'function') sk9SyncBranch();
  if (typeof heroLook === 'function') R.look = heroLook();
  if (typeof jxSetup === 'function') {
    const oldK = R.jx && R.jx.key;
    R.jx = (typeof jxOn === 'function' && jxOn()) ? jxSetup() : null;
    if (R.jx && R.jx.key !== oldK && typeof jxPreload === 'function') jxPreload();
  }
}

/* ---------- mo phong nhanh (kiem thu, tien trinh offline) ---------- */
function simulate(seconds, step = 0.05) { const q = R.quiet; R.quiet = true; for (let t = 0; t < seconds; t += step) tick(step); R.quiet = q; }
