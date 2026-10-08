"use strict";

const POT_LIFE_DEFAULT = 50;
const potionLifeThreshold = () => {
  if (!S || !Number.isFinite(+S.potLifePct)) return POT_LIFE_DEFAULT;
  return Math.max(5, Math.min(95, Math.floor(+S.potLifePct)));
};

/* Keep the existing shared potion/cooldown/CTC-cap path, but make the HP
 * trigger an explicit saved percentage instead of a hidden constant. */
if (typeof autoPotion === "function") {
  autoPotion = function (dt) {
    R.hot = R.hot || { life: 0, mana: 0, lifeT: 0, manaT: 0 };
    const h = R.hot, p = R.P;
    for (const k of ["life", "mana"]) {
      if (h[k + "T"] > 0) {
        const d = Math.min(dt, h[k + "T"]);
        h[k + "T"] -= dt;
        if (k === "life") R.life = Math.min(p.life, R.life + h.life * d);
        else R.mana = Math.min(p.mana, R.mana + h.mana * d);
      }
    }
    if (S.potOff || S.chal === "nopot") return;
    const needLife = R.life < p.life * potionLifeThreshold() / 100;
    const needMana = p.main.cost > 0 && R.mana < p.main.cost * 2;
    h.cd = Math.max(0, (h.cd || 0) - dt);
    for (const [kind, need] of [["life", needLife], ["mana", needMana]]) {
      const urgent = kind === "life" && R.life < p.life * .3 && h.cd <= 0;
      if (!need || h[kind + "T"] > 0 && !urgent) continue;
      if (kind === "life" && S.siege && typeof siegePotLeft === "function" && siegePotLeft() <= 0) continue;
      const own = takeStock(kind), potion = own || bestPotion(kind);
      if (!potion) continue;
      usePotion(kind, potion, !!own);
      if (kind === "life") h.cd = 1;
    }
  };
}

/* Add the control to the existing settings view without changing the save
 * schema: the default is applied lazily and old saves retain 50%. */
if (typeof renderMore === "function") {
  const legacyRenderMoreForPotion = renderMore;
  renderMore = function (...args) {
    const out = legacyRenderMoreForPotion.apply(this, args);
    const checkbox = document.getElementById("cPot");
    if (!checkbox || document.getElementById("potLifePct")) return out;
    const row = document.createElement("label");
    row.id = "potLifePctRow";
    row.innerHTML = `Ngưỡng tự bơm HP: <input id="potLifePct" type="range" min="5" max="95" step="5" value="${potionLifeThreshold()}"> <output>${potionLifeThreshold()}%</output>`;
    const label = checkbox.parentNode, host = label.parentNode || label;
    host.insertBefore(row, label.nextSibling);
    const slider = row.querySelector("#potLifePct"), output = row.querySelector("output");
    slider.oninput = () => {
      S.potLifePct = Math.max(5, Math.min(95, Math.floor(+slider.value || POT_LIFE_DEFAULT)));
      output.value = output.textContent = `${S.potLifePct}%`;
      save();
    };
    return out;
  };
}
