"use strict";
(function () {
  const $ = s => document.querySelector(s);
  const SPEEDS = [1, 1.5, 2.5];
  const ready = () => typeof S !== "undefined" && S && S.fac;
  const click = () => { if (typeof uiSfx === "function") uiSfx("click"); };
  const rerender = t => { if (typeof curTab !== "undefined" && curTab === t && typeof refresh === "function") refresh(); };

  function cycleSpeed() {
    if (!ready()) return;
    const sp = (typeof modeSpeeds === "function" ? modeSpeeds() : null) || SPEEDS;
    const cur = typeof gameSpeed === "function" ? gameSpeed() : (S.speed || 1);
    const i = sp.indexOf(cur);
    if (sp.length < 2) {
      toast("Chế độ hiện tại chỉ hỗ trợ tốc độ x1");
      return;
    }
    S.speed = sp[(i + 1) % sp.length];
    save();
    click();
    toast(`⚡ Tốc độ game x${S.speed}`);
    sync();
    rerender("more");
  }
  window.cycleSpeed = cycleSpeed;

  function togglePick() {
    if (!ready()) return;
    const f = typeof lootFilter === "function" ? lootFilter() : (S.lootF || (S.lootF = { auto: true }));
    f.auto = !f.auto;
    save();
    click();
    toast(f.auto ? "Đã bật tự nhặt đồ (theo bộ lọc Hành trang)" : "Đã tắt tự nhặt đồ");
    sync();
    rerender("inv");
    rerender("more");
  }
  window.togglePick = togglePick;

  function toggleSmartAuto() {
    if (!ready()) return;
    const f = typeof lootFilter === "function" ? lootFilter() : (S.lootF || (S.lootF = { auto: true }));
    const curOn = !!(S.push && S.rot !== false && f.auto);
    const on = !curOn;
    S.push = on;
    S.rot = on;
    f.auto = on;
    if (on && typeof manual === "function" && manual()) setCtrl("auto", true);
    if (typeof refreshRotBtn === "function") refreshRotBtn();
    if (typeof updateTop === "function") updateTop();
    save();
    click();
    toast(on ? "⚡ Cày thông minh: Đã bật Vượt ải + Tự nhặt + Xoay chiêu" : "⚡ Cày thông minh: Đã tắt");
    sync();
    rerender("more");
  }
  window.toggleSmartAuto = toggleSmartAuto;

  function sweepJunkAndAutoEquip() {
    if (!ready()) return;
    const a = typeof sweepJunk === "function" ? sweepJunk() : { n: 0 };
    const b = typeof autoEquipAll === "function" ? autoEquipAll(true) : 0;
    if (typeof recalc === "function") recalc();
    click();
    toast(`🧹 Dọn đồ: Đã bán ${a.n || 0} món rác · Thay ${b || 0} món tốt hơn`);
    if (typeof refresh === "function") refresh();
  }
  window.sweepJunkAndAutoEquip = sweepJunkAndAutoEquip;

  function todayRows() {
    const r = typeof RW === "function" ? RW() : (S.rw || {});
    const rows = [];
    const add = (tab, name, st, ready) => rows.push({ tab, name, st, ready: !!ready });

    // 1. Điểm danh
    const L = (r && r.login) || {};
    add("login", "Điểm danh hàng ngày", L.claimed ? "✔ Đã nhận hôm nay" : "Chưa điểm danh", !L.claimed);

    // 2. Quà mốc cấp
    const ms = typeof lvMsReady === "function" ? lvMsReady().length : 0;
    if (ms) add("lvms", "Quà mốc cấp", `${ms} mốc nhận ngay`, true);

    // 3. Nhiệm vụ ngày
    if (typeof dailyQuests === "function") {
      const dq = dailyQuests().list || [];
      const qd = dq.filter(q => q.done).length;
      const qr = dq.filter(q => !q.done && q.have >= q.need).length;
      add("quest", "Nhiệm vụ ngày", `${qd}/${dq.length} hoàn thành${qr ? ` · ${qr} chờ nhận` : ""}`, qr > 0);
    }

    // 4. Dã Tẩu
    if (typeof ytState === "function") {
      const y = ytState();
      const step = typeof ytStep === "function" ? ytStep() : { n: 10 };
      add("yt", "Nhiệm vụ Dã Tẩu", `${y.have || 0}/${step.n} lượt hoàn thành`, y.done || (typeof ytDeliverable === "function" && ytDeliverable()));
    }

    // 5. Công Thành Chiến
    if (typeof siegeOpen === "function" && siegeOpen()) {
      const st = typeof siegeState === "function" ? siegeState() : {};
      const un = typeof modeId === "function" && modeId() === "g2";
      const can = un || !st.used;
      add("siege", "Công Thành Chiến", can ? (un ? "Không giới hạn lượt" : "Còn lượt tuần này") : "Đã hoàn thành", can);
    }

    // 6. Tống Kim
    if (typeof unlocked === "function" ? unlocked(30) : S.lvl >= 30) {
      const t = typeof tkState === "function" ? tkState() : {};
      add("tk", "Chiến trường Tống Kim", t.used ? "Đã tham gia hôm nay" : "Sẵn sàng tham chiến", !t.used);
    }

    // 7. Tháp thử thách
    const towerLv = typeof TOWER_LV !== "undefined" ? TOWER_LV : 40;
    if (typeof unlocked === "function" ? unlocked(towerLv) : S.lvl >= towerLv) {
      const un = typeof towerUnlimited === "function" && towerUnlimited();
      const tries = typeof towerTries === "function" ? towerTries() : { n: 0 };
      const maxTries = typeof TOWER_TRIES !== "undefined" ? TOWER_TRIES : 3;
      const left = maxTries - (tries.n || 0);
      add("tower", "Tháp thử thách", un ? "Không giới hạn lượt" : `Còn ${left}/${maxTries} lượt`, un || left > 0);
    }

    // 8. Rương Phúc Duyên
    const fdCost = typeof FD_COST !== "undefined" ? FD_COST : 100;
    if ((r.fd || 0) >= fdCost) {
      add("chest", "Rương Phúc Duyên", `Có ${r.fd} điểm Phúc Duyên`, true);
    }

    return rows.sort((a, b) => b.ready - a.ready);
  }

  function openTodayAgendaModal() {
    if (!ready()) return;
    click();
    const r = typeof RW === "function" ? RW() : (S.rw || {});
    const rows = todayRows();
    const buff = typeof xpBuffLeft === "function" ? xpBuffLeft() : 0;
    const xp50Left = r.xp50 ? Math.max(0, Math.ceil((r.xp50 - Date.now()) / 6e4)) : 0;
    let buffTxt = "";
    if (buff > 0) buffTxt += ` · EXP +25% (${Math.ceil(buff / 6e4)}p)`;
    if (xp50Left > 0) buffTxt += ` · Tu Luyện +50% (${xp50Left}p)`;

    modal(`<h3>Việc Hôm Nay${buffTxt ? `<small style="color:#4ade80">${buffTxt}</small>` : ""}</h3>` +
      `<p class="desc">Danh sách hoạt động và phần thưởng trong ngày. Nhấp <b>Vào Ngay</b> để mở trực tiếp tính năng.</p>` +
      `<div class="card" style="display:flex;flex-direction:column;gap:6px;max-height:55vh;overflow-y:auto;">` +
      rows.map(w => `<div class="qrow${w.ready ? " ready" : " lock"}" style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.06);">
        <span style="display:flex;flex-direction:column;gap:2px;">
          <b style="color:${w.ready ? "#ffd700" : "inherit"}">${esc(w.name)}</b>
          <small class="dim">${esc(w.st)}</small>
        </span>
        <button class="btn sm ${w.ready ? "on" : ""}" data-td="${w.tab}">${w.ready ? "Vào Ngay" : "Xem"}</button>
      </div>`).join("") +
      `</div><div class="btnrow"><button class="btn" onclick="closeModal(true)">Đóng</button></div>`, () => {
      document.querySelectorAll("#mBody [data-td]").forEach(b => {
        b.onclick = () => {
          closeModal(true);
          const tab = b.dataset.td;
          if (tab === "yt" && typeof DATAU !== "undefined" && DATAU.openModal) {
            DATAU.openModal();
          } else if (typeof giftModal === "function") {
            giftTab = tab;
            giftModal();
          }
        };
      });
    }, true);
  }
  window.openTodayAgendaModal = openTodayAgendaModal;

  function togglePot() {
    if (!ready()) return;
    if (S.chal === "nopot") {
      toast("Thử thách Bất dược: không dùng thuốc");
      return;
    }
    S.potOff = !S.potOff;
    save();
    click();
    toast(S.potOff ? "Tắt tự dùng thuốc" : "Bật tự dùng thuốc");
    sync();
    rerender("more");
  }
  window.togglePotAuto = togglePot;

  function soundOn() {
    const c = typeof sndCfg === "function" ? sndCfg() : { on: true };
    return !!(c.on || c.music);
  }

  function toggleSound() {
    if (!ready()) return;
    const c = typeof sndCfg === "function" ? sndCfg() : {};
    const on = !soundOn();
    c.on = on;
    c.music = on;
    save();
    if (typeof audApply === "function") audApply();
    toast(on ? "Bật âm thanh" : "Tắt âm thanh");
    sync();
    rerender("more");
  }
  window.toggleSound = toggleSound;

  const AFK_KEY = "jxidle_afk";
  let afkPrev = null;
  const ov = document.createElement("div");
  ov.id = "afk";
  ov.className = "hidden";
  ov.innerHTML = '<div class="afkbox"><i class="afkic"></i><b>ĐANG TREO MÁY</b><div class="afkst" id="afkSt"></div><small>Chạm bất kỳ đâu để tiếp tục</small></div>';
  const appEl = $("#app") || document.body;
  appEl.appendChild(ov);
  ov.addEventListener("pointerdown", e => {
    e.preventDefault();
    e.stopPropagation();
    setAfk(false);
  });

  function afkStats() {
    if (!ready()) return;
    const z = typeof zoneOf === "function" ? zoneOf(Math.min(S.stage, STAGES)) : null;
    const curSpd = typeof gameSpeed === "function" ? gameSpeed() : 1;
    $("#afkSt").innerHTML = `Cấp <b>${S.lvl}</b> · ${z ? esc(z.n) + " · Ải " + inZone(Math.min(S.stage, STAGES)) : ""}<br>Ngân lượng <b>${fmt(S.gold)}</b> · Tốc độ <b>x${curSpd}</b>`;
  }

  function setAfk(on) {
    if (!!on === !!window.JXAFK || (on && !ready())) return;
    const c = typeof sndCfg === "function" ? sndCfg() : {};
    if (on) {
      afkPrev = { saver: uiPrefs().saver, lowFx: S.lowFx, snd: c.on, music: c.music };
      try { localStorage.setItem(AFK_KEY, JSON.stringify(afkPrev)); } catch (e) {}
      window.JXAFK = true;
      setUiPref({ saver: true });
      S.lowFx = 1;
      c.on = false;
      c.music = false;
      if (typeof jxClosePanel === "function") jxClosePanel();
      afkStats();
      ov.classList.remove("hidden");
    } else {
      restore(afkPrev);
      window.JXAFK = false;
      ov.classList.add("hidden");
      toast("Thoát chế độ treo máy");
    }
    if (typeof audApply === "function") audApply();
    save();
    sync();
    rerender("more");
  }
  function restore(p) {
    if (!p) return;
    const c = typeof sndCfg === "function" ? sndCfg() : {};
    setUiPref({ saver: !!p.saver });
    S.lowFx = p.lowFx;
    c.on = p.snd;
    c.music = p.music;
    afkPrev = null;
    try { localStorage.removeItem(AFK_KEY); } catch (e) {}
  }
  window.jxAfk = setAfk;
  setInterval(() => { if (window.JXAFK) afkStats(); }, 2000);

  const fixAfk = (n = 0) => {
    try {
      const p = JSON.parse(localStorage.getItem(AFK_KEY) || "null");
      if (!p) return;
      if (!ready()) { if (n < 20) setTimeout(() => fixAfk(n + 1), 500); return; }
      restore(p);
      if (typeof audApply === "function") audApply();
      save();
    } catch (e) {}
  };
  fixAfk();

  const HOLD = 550;
  [["#bHp", "life"], ["#bMp", "mana"]].forEach(([sel, kind]) => {
    const b = $(sel);
    if (!b) return;
    let t = null, held = false, down = false;
    b.addEventListener("pointerdown", e => {
      e.preventDefault();
      e.stopPropagation();
      down = true;
      held = false;
      clearTimeout(t);
      t = setTimeout(() => {
        held = true;
        togglePot();
        if (navigator.vibrate) navigator.vibrate(20);
      }, HOLD);
    });
    b.addEventListener("pointerup", e => {
      e.preventDefault();
      e.stopPropagation();
      clearTimeout(t);
      if (!down) return;
      down = false;
      if (!held) {
        if (typeof drinkNow === "function") drinkNow(kind);
        if (ready() && typeof hint === "function") setTimeout(() => hint("potHold"), 900);
      }
    });
    const cancel = () => { clearTimeout(t); down = false; };
    b.addEventListener("pointercancel", cancel);
    b.addEventListener("pointerleave", cancel);
    b.addEventListener("contextmenu", e => e.preventDefault());
  });

  if (typeof HINTS === "object") {
    HINTS.potHold = "Mẹo: nhấn giữ ô bình HP / MP để bật / tắt tự dùng thuốc (phím Shift+Q).";
  }

  addEventListener("keydown", ev => {
    if (ev.repeat || /INPUT|TEXTAREA|SELECT/.test(ev.target.tagName) || !ready()) return;
    if (typeof SV !== "undefined" && SV.on) return;
    const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    if (window.JXAFK) {
      if (k === "b" || k === "Escape") setAfk(false);
      return;
    }
    if (ev.shiftKey && (k === "q" || k === "e")) {
      togglePot();
      return;
    }
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (k === "x") cycleSpeed();
    else if (k === "g") togglePick();
    else if (k === "z") toggleSmartAuto();
    else if (k === "b") setAfk(true);
  });

  // Attach button click listeners
  function bindQuickButtons() {
    const spdBtn = $("#jxSpd");
    if (spdBtn) spdBtn.onclick = cycleSpeed;
    const autoBtn = $("#jxAuto");
    if (autoBtn) autoBtn.onclick = toggleSmartAuto;
    const todayBtn = $("#jxToday");
    if (todayBtn) todayBtn.onclick = openTodayAgendaModal;
    const pickBtn = $("#jxPick");
    if (pickBtn) pickBtn.onclick = togglePick;
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindQuickButtons);
  } else {
    bindQuickButtons();
  }

  const IDLE_BACK = 3000;
  let lastAct = Date.now();
  window.JXM = () => (typeof manual === "function" && manual() && !INPUT.active && !INPUT.target)
    ? Math.max(0, IDLE_BACK - (Date.now() - lastAct)) : 0;
  setInterval(() => {
    if (!ready() || typeof manual !== "function" || !manual()) {
      lastAct = Date.now();
      return;
    }
    const K = INPUT.keys || {}, busy = INPUT.active || INPUT.target || (typeof GP !== "undefined" && GP.v && (GP.v[0] || GP.v[1])) || ["w", "a", "s", "d", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].some(k => K[k]);
    if (busy || (typeof SV !== "undefined" && SV.on) || (typeof R !== "undefined" && R.town)) {
      lastAct = Date.now();
      return;
    }
    if (Date.now() - lastAct > IDLE_BACK) {
      setCtrl("auto", true);
      toast("Tiếp tục tự đánh");
    }
  }, 250);

  function sync() {
    if (!ready()) return;
    const v = typeof gameSpeed === "function" ? gameSpeed() : (S.speed || 1);
    const sp = $("#jxSpd");
    if (sp) {
      sp.classList.toggle("on", v > 1);
      sp.textContent = `⚡ x${v}`;
      sp.title = `Tốc độ game: x${v} (Bấm hoặc phím X để đổi x1 / x1.5 / x2.5)`;
    }

    const f = typeof lootFilter === "function" ? lootFilter() : (S.lootF || {});
    const isAutoOn = !!(S.push && S.rot !== false && f.auto);
    const autoBtn = $("#jxAuto");
    if (autoBtn) {
      autoBtn.classList.toggle("on", isAutoOn);
      autoBtn.title = isAutoOn ? "Cày thông minh: ĐANG BẬT (phím Z)" : "Cày thông minh: ĐANG TẮT (bấm để bật Vượt ải + Tự nhặt + Xoay chiêu)";
    }

    const todayBtn = $("#jxToday");
    if (todayBtn) {
      const anyReady = todayRows().some(r => r.ready);
      todayBtn.classList.toggle("on", anyReady);
      todayBtn.title = anyReady ? "Việc hôm nay: CÓ PHẦN THƯỞNG CHỜ NHẬN!" : "Lịch trình việc cần làm hôm nay";
    }

    const pk = $("#jxPick");
    if (pk) {
      const on = !!f.auto;
      pk.classList.toggle("on", on);
      pk.classList.toggle("off", !on);
    }

    const autoPot = !S.potOff && S.chal !== "nopot";
    ["#bHp", "#bMp"].forEach(s => {
      const b = $(s);
      if (b) {
        b.classList.toggle("auto", autoPot);
        b.title = (s === "#bHp" ? "Bình HP (Q)" : "Bình MP (E)") + " · nhấn giữ: " + (autoPot ? "tắt" : "bật") + " tự dùng thuốc";
      }
    });
  }
  setInterval(sync, 500);
  sync();

  const XS = [];
  setInterval(() => {
    if (!ready()) return;
    const t = Date.now();
    XS.push([t, (typeof R !== "undefined" && R.xpTot) || 0]);
    while (XS.length > 2 && t - XS[0][0] > 12e4) XS.shift();
  }, 1000);

  const dur = s => s >= 3600 ? Math.floor(s / 3600) + " giờ " + Math.round(s % 3600 / 60) + " phút" : s >= 60 ? Math.round(s / 60) + " phút" : Math.max(1, Math.round(s)) + " giây";
  const xpBox = document.querySelector(".hslot.xp");
  if (xpBox) {
    xpBox.addEventListener("click", () => {
      if (!ready()) return;
      const a = XS[0], b = XS[XS.length - 1], dt = a && b ? (b[0] - a[0]) / 1e3 : 0, rate = dt >= 5 ? (b[1] - a[1]) / dt : 0, need = Math.max(0, expNeed(S.lvl) - S.xp), buff = typeof xpBuffLeft === "function" ? xpBuffLeft() : 0;
      click();
      toast(S.lvl >= (typeof MAX_LEVEL !== "undefined" ? MAX_LEVEL : 200) ? "Đã đạt cấp tối đa" : rate > 0 ? `Lên cấp ${S.lvl + 1} sau khoảng ${dur(need / rate)} · ${fmt(Math.round(rate * 60))} EXP/phút${buff > 0 ? ` · buff EXP +25% còn ${Math.ceil(buff / 6e4)} phút` : ""}` : "Chưa đủ dữ liệu: hãy để nhân vật đánh quái thêm vài giây");
    });
  }
})();