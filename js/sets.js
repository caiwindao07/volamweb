/* ======================= DO HOANG KIM / BACH KIM (KItemGenerator::Gen_GoldEquipment, KItemList) ======================= */
'use strict';
const GOLD_EXT = 2; // MAX_ITEM_MAGICATTRIB (8) - MAX_ITEM_NORMAL_MAGICATTRIB (6): 2 dong mo rong theo bo
/* gia tri = min + (max - min) * cap_sinh / MAX_ITEM_LUCK (10) */
function geValue(idx, g) {
  const m = J.ge[idx]; if (!m) return null;
  return { a: m.a, p: m.p.map(([lo, hi]) => (lo === -1 && hi === -1 ? -1 : Math.round(lo + (hi - lo) * g / 10))), pre: 1 };
}
function makeSetItem(kind, row, luck) {
  const g = () => clamp(irnd(Math.min(10, luck), 10), 0, 10);
  const it = { uid: S.uid++, d: row.d, k: row.k, n: row.n, ic: row.ic || '', lvl: row.lvl, s: row.s, price: row.price,
    base: row.base.map(x => x.slice()), req: row.req.map(x => x.slice()), r: kind === 'gold' ? 4 : 5,
    set: { kind, grp: row.grp, n1: row.n1 || 99, n2: row.n2 || 99, sid: row.sid } };
  it.mag = row.mag.map(i => geValue(i, g())).filter(Boolean);
  it.ext = row.ext.map(i => geValue(i, g())).filter(Boolean);
  return it;
}
/* Rơi đồ bộ Hoàng Kim & Bạch Kim: Bỏ rơi trực tiếp theo yêu cầu người chơi (chỉ chế tạo/ghép mảnh) */
function rollSetDrop(e) {
  return null;
}
/* IsEnoughToActive: co mot bo dang mac du NeedToActive2 mon -> mo het dong an cua MOI trang bi */
function setCounts(eq) {
  const c = {};
  for (const k in eq) {
    const it = eq[k]; if (!it || !it.set || k === 'horse') continue;
    if (k === 'ring1' && eq.ring2 && eq.ring2.set && eq.ring2.set.grp === it.set.grp && eq.ring2.set.sid === it.set.sid) continue; // 2 nhan giong nhau tinh 1
    c[it.set.grp] = (c[it.set.grp] || 0) + 1;
  }
  return c;
}
function enoughToActive(eq) {
  const c = setCounts(eq);
  for (const k in eq) { const it = eq[k]; if (it && it.set && c[it.set.grp] >= it.set.n2) return true; }
  return false;
}
/* GetGoldEquipEnhance: so dong mo rong = so mon cung bo / NeedToActive1 (du bo hoac ngua: ca 2) */
function goldEnhance(it, eq) {
  const slot = slotOfEquipped(it, eq); if (!slot) return 0;
  if (slot === 'horse' || enoughToActive(eq)) return GOLD_EXT;
  return Math.min(GOLD_EXT, Math.floor((setCounts(eq)[it.set.grp] || 0) / Math.max(1, it.set.n1)));
}
function setMembers(it) {
  const isKhc = it.n.startsWith('[Không hạn chế]');
  return J.sets[it.set.kind].filter(r => r.grp === it.set.grp && (r.n.startsWith('[Không hạn chế]') === isKhc));
}
