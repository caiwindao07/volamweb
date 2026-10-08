/* ======================= DIEU KHIEN: joystick, o ky nang, thuoc, Tho Dia Phu (mau GD_Idle) ======================= */
'use strict';
const INPUT = { active: false, id: null, fromJoy: false, ox: 0, oy: 0, x: 0, y: 0, moved: false, keys: {}, target: null };
const JOY_R = 45, TAP_MOVE = 8, TP_CD = 20, POT_CD = 1.5;
const manual = () => {
  if (!S) return false;
  // Khi Auto Kim Yến đang BẬT, nhan vat tu do tim quai va danh, tru khi nguoi choi dang giu chuot / phim
  if (S.auto && S.auto.on) {
    if (INPUT && (INPUT.target || INPUT.mouse || (INPUT.fromJoy && INPUT.active))) return true;
    if (INPUT && INPUT.keys && ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].some(k => INPUT.keys[k])) return true;
    return false;
  }
  return S.ctrl === 'manual';
};
const joyFixed = () => S ? S.joy !== 'float' : true;
/* Che do dieu khien: tren may tinh man hinh ngang co chuot -> chuot (bam / giu chuot de di, bam do tren dat de nhat) hoac joystick, doi bang nut tren san dau.
   Dien thoai / may bang / man hinh doc: luon joystick (nut doi khong hien). */
const isDesktopLandscape = () => !!(window.matchMedia && window.matchMedia('(orientation: landscape) and (min-width: 900px) and (hover: hover) and (pointer: fine)').matches);
const inputMode = () => isDesktopLandscape() ? ((S && S.inputMode === 'joy') ? 'joy' : 'mouse') : 'joy';
const mouseMode = () => inputMode() === 'mouse';
function refreshRotBtn() { const b = $('#rotBtn'); if (!b) return; const on = S ? S.rot !== false : true; b.textContent = '⟳ Xoay chiêu: ' + (on ? 'Bật' : 'Tắt'); b.classList.toggle('on', on); }
function toggleRot() { if (!S) return; S.rot = S.rot === false; refreshRotBtn(); R.dirty = true; save(); toast(S.rot !== false ? 'Xoay chiêu: luân phiên các chiêu ở ô 1 đến 4 khi tự đánh' : 'Xoay chiêu tắt: chỉ đánh chiêu chính'); }
function refreshInputBtn() {
  const on = isDesktopLandscape(); document.body.classList.toggle('deskland', on);
  const b = $('#inBtn'); if (b) b.textContent = mouseMode() ? '🖱 Chuột' : '🕹 Joystick';
}
const joyAnchor = () => ({ x: JOY_R + 14, y: AR.h - JOY_R - 14 });   // goc trai duoi san dau

/* ---------- tay cam (Gamepad API): analog / D-pad di chuyen, A B X Y = chieu 1-4, LB / RB = thuoc HP / MP, Start = tam dung Luyen Cong ---------- */
const GP = { v: [0, 0], prev: [] };
function gamepadPoll() {
  const list = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [], p = list.find(x => x && x.connected);
  if (!p) { GP.v = [0, 0]; GP.prev = []; return; }
  const b = i => !!(p.buttons[i] && p.buttons[i].pressed);
  let x = p.axes[0] || 0, y = p.axes[1] || 0; if (Math.hypot(x, y) < 0.25) { x = 0; y = 0; }
  if (b(14)) x = -1; if (b(15)) x = 1; if (b(12)) y = -1; if (b(13)) y = 1;
  GP.v = [x, y];
  if ((x || y) && S && S.fac && !SV.on && !R.town && !manual()) setCtrl('manual', true);
  const edge = i => b(i) && !GP.prev[i];
  if (S && S.fac) {
    if (SV.on) { if (edge(9)) svPause(); if (edge(4)) svUseHp(); }
    else {
      for (let i = 0; i < 4; i++) if (edge(i)) pressSlot(i);
      if (edge(4)) drinkNow('life'); if (edge(5)) drinkNow('mana'); if (edge(8)) R.town ? backFromTown() : goTown();
    }
  }
  GP.prev = p.buttons.map(bt => !!bt.pressed);
}
/* Vector di chuyen: keo tren san (joystick noi), phim WASD / mui ten, hoac diem da cham */
function inputVec() {
  if (INPUT.active && INPUT.moved) {
    const x = INPUT.x - INPUT.ox, y = INPUT.y - INPUT.oy, l = Math.hypot(x, y);
    if (l < 6) return [0, 0];
    const k = Math.min(1, l / JOY_R) / l; return [x * k, y * k];
  }
  if (GP.v[0] || GP.v[1]) { INPUT.target = null; const l = Math.hypot(GP.v[0], GP.v[1]); return l > 1 ? [GP.v[0] / l, GP.v[1] / l] : GP.v.slice(); }
  const K = INPUT.keys; let x = 0, y = 0;
  if (K.ArrowLeft || K.a) x -= 1; if (K.ArrowRight || K.d) x += 1; if (K.ArrowUp || K.w) y -= 1; if (K.ArrowDown || K.s) y += 1;
  const l = Math.hypot(x, y); if (l) { INPUT.target = null; return [x / l, y / l]; }
  if (INPUT.target) {
    const dx = INPUT.target.x - H.x, dy = INPUT.target.y - H.y, d = Math.hypot(dx, dy);
    if (d < 6) { INPUT.target = null; return [0, 0]; }
    return [dx / d, dy / d];
  }
  return [0, 0];
}
function moveManual(dt) {
  const [vx, vy] = inputVec(); if (!vx && !vy) return false;
  const sp = 150 * (R.P ? R.P.speed : 1);
  const [nx, ny] = clampWorld(H.x + vx * sp * dt, H.y + vy * sp * dt);
  if (!obsMove(H, nx, ny) && INPUT.target) INPUT.target = null;      // cham vat can: bo diem cham
  R.pickTarget = null; return true;
}
function setCtrl(mode, quiet) {
  if (S) {
    S.ctrl = mode;
    if (S.auto) S.auto.on = (mode === 'auto');
  }
  INPUT.target = null;
  renderPad();
  if (typeof updateAutoUiIndicators === 'function') updateAutoUiIndicators();
  if (!quiet) toast(mode === 'manual' ? 'Tự điều khiển: kéo trên sân để đi, nhân vật tự đánh quái trong tầm' : 'Tự động: nhân vật tự đi đánh và nhặt đồ');
}

/* ---------- Che do PK (Luyen Cong / PK / Do Sat) ---------- */
function cyclePkMode(targetMode) {
  if (!S) return;
  if (S.jailUntil && S.jailUntil > Date.now()) {
    const remM = Math.ceil((S.jailUntil - Date.now()) / 60000);
    const remH = Math.floor(remM / 60);
    const remMMod = remM % 60;
    if (typeof toast === 'function') toast(`⚖️ Bạn đang bị giam trong Thiên Lao vì PK = 10! Còn ${remH}h${remMMod}m, không thể đổi chế độ PK!`);
    return;
  }
  const modes = ['peace', 'pk', 'slaughter'];
  let next = targetMode;
  if (!next) {
    const curIdx = modes.indexOf(S.pkMode || 'peace');
    next = modes[(curIdx + 1) % modes.length];
  }
  S.pkMode = next;

  if (typeof uiSfx === 'function') uiSfx('upgrade');

  if (next === 'peace') {
    if (typeof toast === 'function') toast('🛡️ Chế độ [LUYỆN CÔNG]: Chỉ đánh quái, không đánh người!');
    if (typeof log === 'function') log('<span style="color:#4ade80;">[PK] Đã chuyển sang chế độ <b>[LUYỆN CÔNG]</b> (Hòa bình). Chỉ đánh quái, không đánh người.</span>');
  } else if (next === 'pk') {
    if (typeof toast === 'function') toast('⚔️ Chế độ [PK] (F9): Tuyên chiến với người cùng bật PK!');
    if (typeof log === 'function') log('<span style="color:#f59e0b;">[PK] Đã chuyển sang chế độ <b>[PK]</b> (Tuyên chiến). Có thể tấn công người cùng bật PK.</span>');
  } else if (next === 'slaughter') {
    if (typeof uiSfx === 'function') uiSfx('warn');
    if (typeof toast === 'function') toast('🩸 Chế độ [ĐỒ SÁT]: Đổi máu hồng, có thể tấn công bất kỳ ai!');
    if (typeof log === 'function') log('<span style="color:#ec4899;font-weight:bold;">[ĐỒ SÁT] Bạn đã bật chế độ [ĐỒ SÁT]! Máu chuyển sang màu hồng, có thể tấn công bất kỳ ai!</span>');
  }

  // Đồng bộ trạng thái PK ngay tới Server qua WebSocket
  if (typeof MP !== 'undefined' && MP.ws && MP.ws.readyState === 1) {
    MP.ws.send(JSON.stringify({
      type: 'pk_mode_change',
      pkMode: S.pkMode
    }));
  }

  if (typeof updatePkModeBtn === 'function') updatePkModeBtn();
  if (typeof refresh === 'function') refresh();
  if (typeof save === 'function') save();
}
window.cyclePkMode = cyclePkMode;

/* ---------- o ky nang ---------- */
function learnedAttacks() {
  if (!S || !S.sk) return [];
  return Object.keys(S.sk).map(Number).filter(id => S.sk[id] && isAttack(SK[id]));
}
function fillSlots() {
  if (!S) return;
  S.slots = (S.slots || [0, 0, 0, 0]).map(id => (id && S.sk[id] ? id : 0));
  for (const id of learnedAttacks().sort((a, b) => SK[b].req - SK[a].req)) {
    if (S.slots.includes(id)) continue;
    const i = S.slots.indexOf(0); if (i < 0) break; S.slots[i] = id;
  }
}
function assignSlot(i, id) { fillSlots(); const j = S.slots.indexOf(id); if (j >= 0) S.slots[j] = S.slots[i]; S.slots[i] = id; renderPad(); save(); }
function pressSlot(i) {
  fillSlots(); const id = S.slots[i]; if (!id) { toast('Ô trống: gán chiêu ở thẻ Võ công'); return; }
  if (S.jailUntil && S.jailUntil > Date.now()) {
    toast('⚖️ Đang thụ án trong Thiên Lao! Không thể xuất chiêu tấn công!');
    return;
  }
  S.main = id; S.mainLock = true;
  if (typeof R !== 'undefined' && R) {
    R.manualAttack = true;
    R.atkT = 0;
  }
  R.dirty = true; recalc(); renderPad(); toast('Chiêu chính: ' + SK[id].n);
  if (typeof heroAttack === 'function') heroAttack();
}

/* ---------- thuoc & Tho Dia Phu ---------- */
function drinkNow(kind) {
  R.potCd = R.potCd || { life: 0, mana: 0 };
  if (R.potCd[kind] > 0) return;
  const own = takeStock(kind);                                 // thuoc da mua o cua hang dung truoc
  const p = own || bestPotion(kind); if (!p) { toast('Không đủ ngân lượng mua thuốc'); return; }
  usePotion(kind, p, !!own); R.potCd[kind] = POT_CD; toast(own ? `${p.n} (còn ${stockCount(kind)})` : `${p.n} (-${fmt(potPrice(p))} lượng)`);
}
function goTown() {
  if (R.town) return;
  if ((R.tpCd || 0) > 0) { toast(`Thổ Địa Phù hồi sau ${Math.ceil(R.tpCd)} giây`); return; }
  R.town = true; R.enemies = []; R.corpses = []; R.pickTarget = null; R.moveTo = null; INPUT.target = null;
  obsLoad('town'); [H.x, H.y] = inWorld(WORLD.w / 2, WORLD.h / 2); snapCamera();
  R.bgImg = img(W.town.bg); uiSfx('use');
  playMusic(W.town.id);
  $('#townName').textContent = W.town.n; $('#townBar').classList.remove('hidden');
  R.banner = { t: 2.2, text: W.town.n, sub: 'Hồi phục · bán đồ · trở lại ải' };
  log(`Dùng Thổ Địa Phù về <b>${esc(W.town.n)}</b>.`);
}
function backFromTown() {
  if (!R.town) return;
  if (S.jailUntil && S.jailUntil > Date.now()) {
    toast('⚖️ Bạn đang bị giam cầm trong Thiên Lao! Không thể ra bãi luyện công!');
    return;
  }
  R.town = false;
  const z = zoneOf(Math.min(S.stage, STAGES));
  obsLoad(z.id);
  R.bgImg = img(z.bg);
  [H.x, H.y] = inWorld(H.x, H.y);
  snapCamera();
  R.tpCd = TP_CD;
  S.wave = 1;
  R.spawnT = 0.5;
  R.zoneShown = null;
  const tb = $('#townBar');
  if (tb) tb.classList.add('hidden');
  onZoneChange(z);
  toast(`Đã trở lại ải luyện công ${z.n}!`);
}
function townTick(dt) { // trong thanh thi / thon tran: nghi ngoi hoi day, an toan tuyet doi, khong danh nhau
  if (R.P) {
    R.life = Math.min(R.P.life, R.life + R.P.life * 0.25 * dt);
    R.mana = Math.min(R.P.mana, R.mana + R.P.mana * 0.25 * dt);
  }
  if (S && S.pkMode && S.pkMode !== 'peace') S.pkMode = 'peace'; // Khu vuc an toan, cam PK do sat
  R.enemies = []; // Khong co quai vat
  R.moveTo = null;
  moveManual(dt);
}

function openSlotSkillPicker(slotIndex) {
  if (!S || !S.fac) return;
  const attacks = learnedAttacks();
  if (!attacks.length) {
    if (typeof toast === 'function') toast('Chưa học kỹ năng tấn công nào! Hãy nâng điểm trong bảng Võ công (phím K).');
    return;
  }
  const curId = S.slots && S.slots[slotIndex];
  const listHtml = attacks.map(id => {
    const s = SK[id], lv = S.sk[id] || 0;
    const isCur = curId === id;
    const a = (typeof activeInfo === 'function' && R.P) ? activeInfo(R.P, s, lv) : null;
    return `
      <div class="jx-slot-pick-item" data-id="${id}" style="display:flex;align-items:center;gap:10px;padding:8px 10px;margin-bottom:6px;background:${isCur ? '#3a2d18' : '#1b140c'};border:1px solid ${isCur ? '#ffd700' : '#5a4425'};border-radius:6px;cursor:pointer;transition:all 0.15s;">
        <img src="${esc(s.ic || '')}" style="width:36px;height:36px;border-radius:4px;border:1px solid #c89b3c;background:#000;">
        <div style="flex:1;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <b style="color:${isCur ? '#ffd700' : '#fef08a'};font-size:13px;">${esc(s.n)}</b>
            <span style="font-size:11px;color:#c89b3c;">Cấp ${lv}/${s.max}</span>
          </div>
          <div style="font-size:10.5px;color:#94a3b8;margin-top:2px;">
            ${a ? `Sát thương: <span style="color:#f87171;">${fmt(a.tot)}</span> · Tiêu hao MP: <span style="color:#60a5fa;">${Math.round(a.cost)}</span>` : ''}
          </div>
        </div>
        ${isCur ? '<span style="color:#ffd700;font-size:11px;font-weight:bold;padding:2px 6px;border:1px solid #ffd700;border-radius:3px;">Đang gán</span>' : '<button class="jx-action-btn" style="padding:4px 10px;font-size:11px;">Gán</button>'}
      </div>
    `;
  }).join('');

  if (typeof modal === 'function') {
    modal(`⚔ Đổi Kỹ Năng Cho Ô ${slotIndex + 1}`, `
      <div style="min-width:320px;max-width:440px;">
        <div style="font-size:11.5px;color:#c89b3c;margin-bottom:10px;">
          Chọn chiêu thức để gán vào <b>Ô ${slotIndex + 1}</b> (Phím tắt [${slotIndex + 1}]):
        </div>
        <div style="max-height:280px;overflow-y:auto;padding-right:4px;">
          ${listHtml}
        </div>
      </div>
    `, () => {
      document.querySelectorAll('.jx-slot-pick-item').forEach(item => {
        item.onclick = () => {
          const id = +item.dataset.id;
          assignSlot(slotIndex, id);
          if (typeof toast === 'function') toast(`Đã gán [${SK[id].n}] vào Ô ${slotIndex + 1}!`);
          if (typeof closeModal === 'function') closeModal();
        };
      });
    });
  }
}
window.openSlotSkillPicker = openSlotSkillPicker;

/* ---------- nut / phim ---------- */
function renderPad() {
  if (!S || !S.fac) return;
  fillSlots();
  document.querySelectorAll('#pad .sk').forEach(b => {
    const id = S.slots[+b.dataset.i], s = SK[id];
    b.classList.toggle('empty', !s); b.classList.toggle('cur', !!(s && R.P && R.P.main.id === id));
    b.querySelector('i').style.backgroundImage = s && s.ic ? `url('${s.ic}')` : '';
    b.title = s ? `${s.n} (Nhấp trái: Chọn chiêu chính · Chuột phải / Giữ: Đổi chiêu)` : `Ô ${+b.dataset.i + 1} trống (Chuột phải / Giữ để gán chiêu)`;
  });
  const b = $('#ctrlBtn'); if (b) { b.textContent = manual() ? '🕹 Tự điều khiển' : '⚙ Tự động'; b.classList.toggle('on', manual()); }
}
function updatePadCd() {
  const pc = R.potCd || {}, set = (el, v, max) => el && el.querySelector('.cd').style.setProperty('--p', `${clamp(v / max, 0, 1) * 100}%`);
  set($('#bHp'), pc.life || 0, POT_CD); set($('#bMp'), pc.mana || 0, POT_CD); set($('#bTp'), R.tpCd || 0, TP_CD);
}
function bindControls() {
  const pos = ev => { const r = CV.getBoundingClientRect(), k = uiScale(); return [(ev.clientX - r.left) / k, (ev.clientY - r.top) / k]; }; // toa do man hinh
  CV.addEventListener('pointerdown', ev => {
    if (INPUT.active) return;
    if (mouseMode() && ev.pointerType !== 'touch') {              // che do chuot: bam / giu chuot de di toi do, bam do tren dat de nhat
      const [x, y] = pos(ev), d = groundAt(x + CAM.x, y + CAM.y);
      const [wx, wy] = inWorld(x + CAM.x, y + CAM.y);
      if (R.town && typeof TOWN_NPC !== 'undefined' && TOWN_NPC.getNpcAt) {
        const clickedNpc = TOWN_NPC.getNpcAt(wx, wy);
        if (clickedNpc) {
          TOWN_NPC.interact(clickedNpc);
          return;
        }
      }
      if (typeof getOtherPlayerAt === 'function') {
        const clickedPl = getOtherPlayerAt(wx, wy);
        if (clickedPl) {
          showOtherPlayerMenu(clickedPl);
          return;
        }
      }
      Object.assign(INPUT, { active: true, id: ev.pointerId, fromJoy: false, mouse: true, moved: false, x, y });
      CV.setPointerCapture && CV.setPointerCapture(ev.pointerId);
      if (d) { R.pickTarget = R.pickTarget === d ? null : d; if (R.pickTarget) toast(`Đi nhặt: ${d.it.n}`); INPUT.mouse = false; return; }
      if (!manual() && !SV.on && !(S && S.auto && S.auto.on)) setCtrl('manual');
      INPUT.target = { x: wx, y: wy }; R.pickTarget = null;
      return;
    }
    const [x, y] = pos(ev), a = joyAnchor(), fromJoy = !joyFixed() || Math.hypot(x - a.x, y - a.y) <= JOY_R * 1.7;
    Object.assign(INPUT, { active: true, id: ev.pointerId, fromJoy, ox: fromJoy && joyFixed() ? a.x : x, oy: fromJoy && joyFixed() ? a.y : y, x, y, moved: false });
    CV.setPointerCapture && CV.setPointerCapture(ev.pointerId);
  });
  CV.addEventListener('pointermove', ev => {
    if (!INPUT.active || ev.pointerId !== INPUT.id) return;
    const [x, y] = pos(ev); INPUT.x = x; INPUT.y = y;
    if (INPUT.mouse) { const [wx, wy] = inWorld(x + CAM.x, y + CAM.y); INPUT.target = { x: wx, y: wy }; return; }   // giu chuot: di theo con tro
    if (joyFixed() && !INPUT.fromJoy) return;                   // joystick co dinh: keo ngoai vung khong di chuyen
    if (!INPUT.moved && Math.hypot(x - INPUT.ox, y - INPUT.oy) > TAP_MOVE) { INPUT.moved = true; INPUT.target = null; if (!manual() && !(S && S.auto && S.auto.on)) setCtrl('manual'); }
  });
  const up = ev => {
    if (ev.pointerId !== INPUT.id) return;
    const [x, y] = pos(ev), tap = !INPUT.moved && !INPUT.mouse;
    INPUT.mouse = false; INPUT.active = false; INPUT.id = null; INPUT.moved = false;
    if (!tap) return;
    const [wx, wy] = inWorld(x + CAM.x, y + CAM.y);
    if (R.town && typeof TOWN_NPC !== 'undefined' && TOWN_NPC.getNpcAt) {
      const clickedNpc = TOWN_NPC.getNpcAt(wx, wy);
      if (clickedNpc) {
        TOWN_NPC.interact(clickedNpc);
        return;
      }
    }
    if (typeof getOtherPlayerAt === 'function') {
      const clickedPl = getOtherPlayerAt(wx, wy);
      if (clickedPl) {
        showOtherPlayerMenu(clickedPl);
        return;
      }
    }
    const clickedEnemy = (typeof alive === 'function') ? alive().find(e => Math.hypot(e.x - wx, e.y - wy) <= e.r + 20) : null;
    if (clickedEnemy) {
      R.manualTarget = clickedEnemy;
      R.manualAttack = true;
      R.atkT = 0;
      if (typeof heroAttack === 'function') heroAttack();
      return;
    }
    const d = groundAt(x + CAM.x, y + CAM.y);                   // cham vao do: di nhat (doi sang toa do the gioi)
    if (d) { R.pickTarget = R.pickTarget === d ? null : d; if (R.pickTarget) toast(`Đi nhặt: ${d.it.n}`); return; }
    if (manual()) { INPUT.target = { x: wx, y: wy }; }   // cham dat: di toi do
  };
  CV.addEventListener('pointerup', up);
  CV.addEventListener('pointercancel', ev => { if (ev.pointerId === INPUT.id) { INPUT.active = false; INPUT.id = null; INPUT.moved = false; } });
  window.addEventListener('keydown', ev => {
    if (/INPUT|TEXTAREA|SELECT/.test(ev.target.tagName)) return;
    const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key; INPUT.keys[k] = true;
    if (SV.on) { if (!ev.repeat && (k === 'p' || k === 'Escape')) svPause(); return; }   // Luyen Cong: chi di chuyen + tam dung
    if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k) && !manual()) setCtrl('manual');
    if (k === ' ' || k === 'space') {
      ev.preventDefault();
      if (typeof R !== 'undefined' && R) {
        R.manualAttack = true;
        R.atkT = 0;
      }
      if (typeof heroAttack === 'function') heroAttack();
    }
    if ('123'.includes(k)) pressSlot(+k - 1);
    if (k === '4') { if (typeof toggleMountRide === 'function') toggleMountRide(); else pressSlot(3); }
    if (k === 'q') drinkNow('life'); if (k === 'e') drinkNow('mana'); if (k === 't') { if (typeof openMapTravelModal === 'function') openMapTravelModal(); else (R.town ? backFromTown() : goTown()); }
    if (k === 'f') setCtrl(manual() ? 'auto' : 'manual');
    if (k === 'r') toggleRot();
    if (k === 'c' || k === 'F3') { ev.preventDefault(); if (typeof toggleWin === 'function') toggleWin('char-attrib'); }
    if (k === 'b' || k === 'F4') { ev.preventDefault(); if (typeof toggleWin === 'function') toggleWin('inv'); }
    if (k === 'k' || k === 'F5') { ev.preventDefault(); if (typeof toggleWin === 'function') toggleWin('skill'); }
    if (k === 'p') { ev.preventDefault(); if (typeof toggleWin === 'function') toggleWin('party'); }
    if (k === 'm') { ev.preventDefault(); if (typeof toggleWin === 'function') toggleWin('log'); else if (typeof openMapTravelModal === 'function') openMapTravelModal(); }
    if (k === 'z' || k === 'F6') { ev.preventDefault(); if (typeof toggleWin === 'function') toggleWin('auto'); }
    if (k === 'f9' || ev.code === 'F9' || ev.key === 'F9') { ev.preventDefault(); cyclePkMode(); return; }
    if (k === 'Escape') { if (typeof closeAllWindows === 'function') closeAllWindows(); closeModal(); }
    if (k === 'Enter') {
      const inp = $('#chatInlineInput');
      if (inp) {
        ev.preventDefault();
        inp.focus();
      }
    }
  });
  window.addEventListener('keyup', ev => { INPUT.keys[ev.key.length === 1 ? ev.key.toLowerCase() : ev.key] = false; });
  document.querySelectorAll('#pad .sk').forEach(b => {
    let pressTimer = null, didLongPress = false;
    b.addEventListener('pointerdown', e => {
      e.stopPropagation();
      didLongPress = false;
      pressTimer = setTimeout(() => {
        didLongPress = true;
        openSlotSkillPicker(+b.dataset.i);
      }, 400);
    });
    const cancelPress = () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } };
    b.addEventListener('pointerup', e => {
      cancelPress();
      if (!didLongPress && e.button !== 2) {
        pressSlot(+b.dataset.i);
      }
    });
    b.addEventListener('pointercancel', cancelPress);
    b.addEventListener('pointermove', e => {
      if (Math.hypot(e.movementX || 0, e.movementY || 0) > 8) cancelPress();
    });
    b.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
      openSlotSkillPicker(+b.dataset.i);
    });
  });
  const tapBtn = (el, fn) => el && el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); fn(); });
  tapBtn($('#bHp'), () => drinkNow('life')); tapBtn($('#bMp'), () => drinkNow('mana'));
  tapBtn($('#bTp'), () => R.town ? backFromTown() : goTown());
  tapBtn($('#bMount'), () => { if (typeof toggleMountRide === 'function') toggleMountRide(); });
  const bCtrl = $('#ctrlBtn'); if (bCtrl) bCtrl.onclick = () => setCtrl(manual() ? 'auto' : 'manual');
  const pkBtn = $('#btnPkMode'); if (pkBtn) pkBtn.onclick = () => cyclePkMode();
  const pkChip = $('#pkChipBtn'); if (pkChip) pkChip.onclick = () => cyclePkMode();
  const bIn = $('#inBtn'); if (bIn) bIn.onclick = () => { S.inputMode = mouseMode() ? 'joy' : 'mouse'; INPUT.target = null; refreshInputBtn(); save(); toast(mouseMode() ? 'Điều khiển bằng chuột: bấm hoặc giữ chuột để đi' : 'Điều khiển bằng joystick: kéo ở góc trái dưới'); };
  refreshInputBtn(); window.addEventListener('resize', refreshInputBtn);
  $('#rotBtn').onclick = () => toggleRot();
  refreshRotBtn();
  $('#bBack').onclick = backFromTown;
  $('#bShop').onclick = () => shopModal(); $('#bStashT').onclick = () => stashModal();
  $('#bSellTown').onclick = () => { const r = sellUnmatched(); toast(`Bán ${r.n} món`); refresh(); };
}
function drawJoystick(c) {
  if (mouseMode()) return;
  const fixed = joyFixed(), a = joyAnchor(), on = INPUT.active && (fixed ? INPUT.fromJoy : true);
  if (!fixed && !(on && INPUT.moved)) return;
  const ox = fixed ? a.x : INPUT.ox, oy = fixed ? a.y : INPUT.oy;
  c.globalAlpha = on ? 0.35 : 0.12; c.fillStyle = '#000'; c.beginPath(); c.arc(ox, oy, JOY_R, 0, 7); c.fill();
  const ring = img('ui/ring.png');                           // vong sang vang goc (tools/extract_ui.py), thieu thi ve vien
  if (ring && ring.complete && ring.naturalWidth) {
    const n = 4, fw = ring.naturalWidth / n, fr = Math.floor(performance.now() / 90) % n, sz = JOY_R * 2.6;
    c.globalAlpha = on ? 0.9 : 0.4; c.drawImage(ring, fr * fw, 0, fw, ring.naturalHeight, ox - sz / 2, oy - sz / 2, sz, sz);
  } else { c.globalAlpha = on ? 0.8 : 0.35; c.strokeStyle = '#e6c67a'; c.lineWidth = 2; c.beginPath(); c.arc(ox, oy, JOY_R, 0, 7); c.stroke(); }
  if (on) {
    const dx = INPUT.x - ox, dy = INPUT.y - oy, l = Math.hypot(dx, dy), k = l > JOY_R ? JOY_R / l : 1;
    c.globalAlpha = 0.8; c.fillStyle = '#e6c67a'; c.beginPath(); c.arc(ox + dx * k, oy + dy * k, 14, 0, 7); c.fill();
  }
  c.globalAlpha = 1;
}
