"use strict";

/* Data-backed weapon compatibility for factions with more than one branch.
 * Thiên Vương has both Thương (k=3) and Chùy (k=4) skills. The legacy
 * weaponCode() API returns the primary code, so keep that API stable while
 * treating both branches as valid for equipment/filter/autobuy checks. */
const TIANWANG_WEAPON_BRANCHES = new Set([3, 4]);
const legacyTagItemForPolicy = typeof tagItem === "function" ? tagItem : null;
if (legacyTagItemForPolicy) {
  tagItem = function (item) {
    const out = legacyTagItemForPolicy.apply(this, arguments);
    return typeof normalizeElementSkillItem === "function" ? normalizeElementSkillItem(out) : out;
  };
}
const legacyWeaponCode = typeof weaponCode === "function" ? weaponCode : null;
if (legacyWeaponCode) {
  weaponCode = function (eq) {
    const w = eq && eq.weapon;
    if (typeof S !== "undefined" && S && S.fac === "tianwang" && w && w.d === 0 && TIANWANG_WEAPON_BRANCHES.has(w.k))
      return FAC[S.fac].wcode;
    return legacyWeaponCode.apply(this, arguments);
  };
}

/* Only the drop path uses this context. It lets the existing drop count and
 * rarity policy stay unchanged while making the valid Chùy branch reachable. */
const legacyMakeItemForWeaponPolicy = typeof makeItem === "function" ? makeItem : null;
const legacyRollDropsForWeaponPolicy = typeof rollDrops === "function" ? rollDrops : null;
let WEAPON_DROP_CONTEXT = false;
if (legacyMakeItemForWeaponPolicy && legacyRollDropsForWeaponPolicy) {
  makeItem = function (detail, particular) {
    if (WEAPON_DROP_CONTEXT && typeof S !== "undefined" && S && S.fac === "tianwang" && detail === 0 && particular === 3 && Math.random() < .5)
      particular = 4;
    return legacyMakeItemForWeaponPolicy.apply(this, arguments);
  };
  rollDrops = function (...args) {
    WEAPON_DROP_CONTEXT = true;
    try { return legacyRollDropsForWeaponPolicy.apply(this, args); }
    finally { WEAPON_DROP_CONTEXT = false; }
  };
}
