/* ==========================================================================
   VÕ LÂM IDLE - HỆ THỐNG AUTO TOÀN DIỆN (AUTO KIM YẾN / VLTK NATIVE)
   1. Bơm Máu / Bơm Mana / Tự Mua Thuốc / Thổ Địa Phù Cứu Nguy
   2. Tự Đánh Quái / Chọn Chiêu Tấn Công / Combo / Phạm Vi / Mục Tiêu
   3. Tự Động Buff Chiêu Thức Hỗ Trợ / Chiến Mã
   4. Tự Động Tổ Đội (Party): Tự Nhận, Tự Mời, Đi Theo Đội Trưởng
   5. Tự Nhặt Đồ / Bán Rác / Rèn Đồ
   ========================================================================== */
'use strict';

let curAutoTab = 'heal'; // 'heal' | 'combat' | 'buff' | 'party' | 'loot'
let autoPartyInviteCooldown = 0;

function initAutoSettings() {
  if (!S) return;
  if (!S.auto || typeof S.auto !== 'object') {
    S.auto = (typeof defaultAutoSettings === 'function') ? defaultAutoSettings() : {
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
}

function getFactionAttackSkills() {
  if (!S || !S.fac || typeof FAC === 'undefined' || !FAC[S.fac] || typeof SK === 'undefined') return [];
  const f = FAC[S.fac];
  return (f.skills || []).map(id => SK[id]).filter(s => s && s.enemy === 1 && s.style !== 3);
}

function getFactionBuffSkills() {
  if (!S || !S.fac || typeof FAC === 'undefined' || !FAC[S.fac] || typeof SK === 'undefined') return [];
  const f = FAC[S.fac];
  return (f.skills || []).map(id => SK[id]).filter(s => s && (s.self === 1 || s.aura === 1 || (s.prop && s.prop.toLowerCase().includes('hỗ trợ'))) && s.style !== 3);
}

/* ==========================================
   GIAO DIỆN BẢNG ĐIỀU KHIỂN AUTO
   ========================================== */
function renderAutoWin(targetContainer) {
  initAutoSettings();
  const box = targetContainer || (isLandscape() ? $('#t-auto-f') : $('#t-auto'));
  if (!box) return;

  const cfg = S.auto;
  const isRunning = !!cfg.on;

  let html = `
    <div class="auto-container">
      <!-- Master Switch Bar -->
      <div class="auto-master-bar">
        <div class="auto-status-indicator ${isRunning ? 'active' : ''}">
          <div class="dot"></div>
          <span>TRẠNG THÁI: <b style="color:${isRunning ? '#4ade80' : '#ef4444'}">${isRunning ? 'ĐANG CHẠY' : 'TẠM TẮT'}</b></span>
        </div>
        <button class="auto-switch-btn ${isRunning ? '' : 'off'}" id="btnAutoMasterSwitch">
          ${isRunning ? '⏹ TẮT AUTO' : '▶ BẬT AUTO'}
        </button>
      </div>

      <!-- 6 Sub-tabs Navigation -->
      <div class="auto-subtabs">
        <button class="auto-stab ${curAutoTab === 'heal' ? 'on' : ''}" data-atab="heal">❤️ Phục Hồi</button>
        <button class="auto-stab ${curAutoTab === 'combat' ? 'on' : ''}" data-atab="combat">⚔️ Chiến Đấu</button>
        <button class="auto-stab ${curAutoTab === 'activity' ? 'on' : ''}" data-atab="activity">📜 Hoạt Động</button>
        <button class="auto-stab ${curAutoTab === 'buff' ? 'on' : ''}" data-atab="buff">✨ Tự Buff</button>
        <button class="auto-stab ${curAutoTab === 'party' ? 'on' : ''}" data-atab="party">👥 Tổ Đội</button>
        <button class="auto-stab ${curAutoTab === 'loot' ? 'on' : ''}" data-atab="loot">🎒 Tiện Ích</button>
      </div>

      <!-- Tab Content Area -->
      <div class="auto-tab-body">
  `;

  if (curAutoTab === 'heal') {
    html += renderAutoHealTab(cfg);
  } else if (curAutoTab === 'combat') {
    html += renderAutoCombatTab(cfg);
  } else if (curAutoTab === 'activity') {
    html += renderAutoActivityTab(cfg);
  } else if (curAutoTab === 'buff') {
    html += renderAutoBuffTab(cfg);
  } else if (curAutoTab === 'party') {
    html += renderAutoPartyTab(cfg);
  } else if (curAutoTab === 'loot') {
    html += renderAutoLootTab(cfg);
  }

  html += `
      </div>
    </div>
  `;

  box.innerHTML = html;
  bindAutoEvents(box);
  updateAutoUiIndicators();
}

function renderAutoHealTab(cfg) {
  return `
    <div class="auto-card">
      <div class="auto-card-title">❤️ BƠM SINH LỰC (HP)</div>
      <div class="auto-row">
        <span>Bơm khi Sinh Lực dưới:</span>
        <div class="auto-slider-wrap">
          <input type="range" id="slAutoHp" min="20" max="95" value="${cfg.hpPct != null ? cfg.hpPct : 70}">
          <span class="auto-slider-val" id="valAutoHp">${cfg.hpPct != null ? cfg.hpPct : 70}%</span>
        </div>
      </div>
    </div>

    <div class="auto-card">
      <div class="auto-card-title">💙 BƠM NỘI LỰC (MP)</div>
      <div class="auto-row">
        <span>Bơm khi Nội Lực dưới:</span>
        <div class="auto-slider-wrap">
          <input type="range" id="slAutoMp" min="10" max="90" value="${cfg.mpPct != null ? cfg.mpPct : 50}">
          <span class="auto-slider-val" id="valAutoMp">${cfg.mpPct != null ? cfg.mpPct : 50}%</span>
        </div>
      </div>
    </div>

    <div class="auto-card">
      <div class="auto-card-title">💊 DƯỢC PHẨM & CỨU NGUY</div>
      <div class="auto-row">
        <label>
          <input type="checkbox" id="chkAutoBuyPot" ${cfg.autoBuyPot !== false ? 'checked' : ''}>
          <span>Tự động mua dược phẩm khi dùng hết trong túi (trừ lượng)</span>
        </label>
      </div>
      <div class="auto-row" style="margin-top:6px;">
        <label>
          <input type="checkbox" id="chkAutoTp" ${cfg.autoTp !== false ? 'checked' : ''}>
          <span>Tự dùng Thổ Địa Phù về thành khi nguy cấp</span>
        </label>
      </div>
      <div class="auto-row" style="padding-left: 20px;">
        <span>Về thành khi Sinh Lực dưới:</span>
        <div class="auto-slider-wrap">
          <input type="range" id="slAutoTp" min="10" max="40" value="${cfg.tpPct != null ? cfg.tpPct : 20}">
          <span class="auto-slider-val" id="valAutoTp">${cfg.tpPct != null ? cfg.tpPct : 20}%</span>
        </div>
      </div>
      <div class="auto-row" style="padding-left: 20px;">
        <label>
          <input type="checkbox" id="chkAutoTpOutPot" ${cfg.tpOnOutPot !== false ? 'checked' : ''}>
          <span>Tự về thành khi túi cạn kiệt bình máu</span>
        </label>
      </div>
    </div>
  `;
}

function renderAutoCombatTab(cfg) {
  const atks = getFactionAttackSkills();
  let skillOptions = `<option value="0" ${!cfg.mainSkillId ? 'selected' : ''}>⚡ Tự động (Chiêu mạnh nhất đã học)</option>`;
  for (const sk of atks) {
    const isLearned = !!(S.sk && S.sk[sk.id] > 0);
    if (!isLearned) continue; // Chỉ hiển thị chiêu thức đã thực sự học điểm
    const sel = cfg.mainSkillId === sk.id ? 'selected' : '';
    skillOptions += `<option value="${sk.id}" ${sel}>⚔ ${sk.n} (${sk.cost || 0} MP)</option>`;
  }

  return `
    <div class="auto-card">
      <div class="auto-card-title">🎯 CHIÊU THỨC TẤN CÔNG</div>
      <div class="auto-row">
        <span>Chọn chiêu đánh chính:</span>
        <select class="auto-select" id="selAutoMainSkill">
          ${skillOptions}
        </select>
      </div>
      <div class="auto-row" style="margin-top:6px;">
        <label>
          <input type="checkbox" id="chkAutoCombo" ${cfg.combo !== false ? 'checked' : ''}>
          <span>Tự động xoay Combo các chiêu thức đang gắn ở ô 1 - 4</span>
        </label>
      </div>
    </div>

    <div class="auto-card">
      <div class="auto-card-title">🔍 PHẠM VI TÌM QUÁI</div>
      <div class="auto-radio-group">
        <label class="auto-radio-label">
          <input type="radio" name="autoRange" value="300" ${cfg.range === 300 ? 'checked' : ''}>
          <span>Quanh điểm (300px)</span>
        </label>
        <label class="auto-radio-label">
          <input type="radio" name="autoRange" value="650" ${(cfg.range !== 300 && cfg.range !== 3000) ? 'checked' : ''}>
          <span>Toàn màn hình (650px)</span>
        </label>
        <label class="auto-radio-label">
          <input type="radio" name="autoRange" value="3000" ${cfg.range === 3000 ? 'checked' : ''}>
          <span>Toàn bản đồ (Chạy khắp nơi)</span>
        </label>
      </div>
    </div>

    <div class="auto-card">
      <div class="auto-card-title">⚔️ ƯU TIÊN MỤC TIÊU</div>
      <div class="auto-radio-group">
        <label class="auto-radio-label">
          <input type="radio" name="autoPrio" value="near" ${(cfg.targetPrio !== 'low_hp' && cfg.targetPrio !== 'boss') ? 'checked' : ''}>
          <span>Quái gần nhất</span>
        </label>
        <label class="auto-radio-label">
          <input type="radio" name="autoPrio" value="low_hp" ${cfg.targetPrio === 'low_hp' ? 'checked' : ''}>
          <span>Máu ít nhất (Dứt điểm)</span>
        </label>
        <label class="auto-radio-label">
          <input type="radio" name="autoPrio" value="boss" ${cfg.targetPrio === 'boss' ? 'checked' : ''}>
          <span>Ưu tiên Boss & Tinh Anh</span>
        </label>
      </div>
    </div>
  `;
}

function renderAutoActivityTab(cfg) {
  return `
    <div class="auto-card">
      <div class="auto-card-title">⚔️ VƯỢT ẢI & THÁP THỬ THÁCH</div>
      <div class="auto-row">
        <label>
          <input type="checkbox" id="chkAutoPush" ${cfg.autoPush !== false ? 'checked' : ''}>
          <span>Tự động Vượt Ải (tiến đánh từng đợt & diệt Trùm Ải)</span>
        </label>
      </div>
      <div class="auto-row" style="margin-top:6px;">
        <label>
          <input type="checkbox" id="chkAutoTower" ${cfg.autoTower !== false ? 'checked' : ''}>
          <span>Tự động Leo Tháp Thử Thách khi đủ điều kiện</span>
        </label>
      </div>
    </div>

    <div class="auto-card">
      <div class="auto-card-title">📜 NHIỆM VỤ DÃ TẨU CHUẨN VLTK</div>
      <div class="auto-row">
        <label>
          <input type="checkbox" id="chkAutoDatau" ${cfg.autoDatau !== false ? 'checked' : ''}>
          <span>Tự động nhận nhiệm vụ, kiểm tra tiến độ và trả thưởng Dã Tẩu</span>
        </label>
      </div>
    </div>

    <div class="auto-card">
      <div class="auto-card-title">🏰 PHÓ BẢN & BOSS HOÀNG KIM</div>
      <div class="auto-row">
        <label>
          <input type="checkbox" id="chkAutoDungeon" ${cfg.autoDungeon !== false ? 'checked' : ''}>
          <span>Tự động vào Phó Bản khi có lượt (Thiên Lao, Vạn Hoa Cốc...)</span>
        </label>
      </div>
      <div class="auto-row" style="margin-top:6px;">
        <label>
          <input type="checkbox" id="chkAutoWorldBoss" ${cfg.autoWorldBoss !== false ? 'checked' : ''}>
          <span>Tự động khiêu chiến Boss Hoàng Kim Thế Giới khi có vé</span>
        </label>
      </div>
    </div>

    <div class="auto-card">
      <div class="auto-card-title">🎁 PHÚC LỢI & THÀNH TỰU</div>
      <div class="auto-row">
        <label>
          <input type="checkbox" id="chkAutoClaimReward" ${cfg.autoClaimReward !== false ? 'checked' : ''}>
          <span>Tự động nhận Điểm danh ngày, Mốc cấp, Nhiệm vụ ngày và Phúc lợi VIP</span>
        </label>
      </div>
    </div>
  `;
}

function renderAutoBuffTab(cfg) {
  const buffs = getFactionBuffSkills();
  let buff1Opts = `<option value="0" ${!cfg.buffSkill1 ? 'selected' : ''}>-- Không dùng --</option>`;
  let buff2Opts = `<option value="0" ${!cfg.buffSkill2 ? 'selected' : ''}>-- Không dùng --</option>`;

  for (const sk of buffs) {
    const isLearned = !!(S.sk && S.sk[sk.id] > 0);
    if (!isLearned) continue; // Chỉ hiển thị chiêu thức đã thực sự học điểm
    buff1Opts += `<option value="${sk.id}" ${cfg.buffSkill1 === sk.id ? 'selected' : ''}>✨ ${sk.n}</option>`;
    buff2Opts += `<option value="${sk.id}" ${cfg.buffSkill2 === sk.id ? 'selected' : ''}>✨ ${sk.n}</option>`;
  }

  return `
    <div class="auto-card">
      <div class="auto-card-title">✨ TỰ ĐỘNG THI TRIỂN BUFF</div>
      <div class="auto-row">
        <label>
          <input type="checkbox" id="chkAutoBuff" ${cfg.autoBuff !== false ? 'checked' : ''}>
          <span>Tự động kích hoạt võ công hỗ trợ / hộ thân</span>
        </label>
      </div>
      <div class="auto-row">
        <span>Chiêu Buff 1:</span>
        <select class="auto-select" id="selAutoBuff1">
          ${buff1Opts}
        </select>
      </div>
      <div class="auto-row">
        <span>Chiêu Buff 2:</span>
        <select class="auto-select" id="selAutoBuff2">
          ${buff2Opts}
        </select>
      </div>
      <div class="auto-row">
        <span>Thời gian giãn cách buff:</span>
        <div style="display:flex;align-items:center;gap:6px;">
          <input type="number" id="numAutoBuffInterval" min="5" max="180" value="${cfg.buffInterval || 25}" style="width:60px;background:#090705;border:1px solid #5a4425;color:#ffd700;padding:4px;border-radius:4px;text-align:center;">
          <span>giây</span>
        </div>
      </div>
    </div>

    <div class="auto-card">
      <div class="auto-card-title">🐎 CHIẾN MÃ & DI CHUYỂN</div>
      <div class="auto-row">
        <label>
          <input type="checkbox" id="chkAutoMount" ${cfg.autoMount !== false ? 'checked' : ''}>
          <span>Tự động lên ngựa khi di chuyển xa giữa các bãi quái</span>
        </label>
      </div>
    </div>
  `;
}

function renderAutoPartyTab(cfg) {
  const pData = (typeof PARTY !== 'undefined') ? PARTY.data : null;
  const inParty = !!(pData && Array.isArray(pData.members) && pData.members.length > 0);

  let membersHtml = '';
  if (inParty) {
    for (const m of pData.members) {
      const isLeader = m.id === pData.leaderId;
      const isMe = (typeof MP !== 'undefined' && m.id === MP.myId);
      membersHtml += `
        <div class="auto-member-card">
          <div>
            <span class="auto-member-name">${esc(m.name)} ${isMe ? '(Tôi)' : ''}</span>
            <div class="auto-member-sub">Cấp ${m.lvl || 1} · ${esc(W.hero[m.fac] ? W.hero[m.fac].n : (m.fac || 'Hiệp Khách'))}</div>
          </div>
          <div>
            ${isLeader ? '<span class="auto-badge-leader">Đội Trưởng</span>' : '<span style="color:#a39276;font-size:10px;">Thành viên</span>'}
          </div>
        </div>
      `;
    }
  } else {
    membersHtml = `<div style="text-align:center;color:#a39276;padding:12px;font-style:italic;">Chưa tham gia tổ đội nào.</div>`;
  }

  // Lấy danh sách người chơi online xung quanh để mời
  let nearbyPlayersHtml = '';
  if (typeof MP !== 'undefined' && MP.otherPlayers) {
    const curZone = (typeof getCurZoneId === 'function') ? getCurZoneId() : 0;
    const others = Object.values(MP.otherPlayers).filter(p => p.zoneId === curZone);
    if (others.length > 0) {
      for (const op of others) {
        nearbyPlayersHtml += `
          <div class="auto-member-card">
            <div>
              <span class="auto-member-name">${esc(op.name)}</span>
              <div class="auto-member-sub">Cấp ${op.lvl || 1} · ${esc(W.hero[op.fac] ? W.hero[op.fac].n : (op.fac || 'Hiệp Khách'))}</div>
            </div>
            <button class="jx-action-btn gold sm" onclick="sendPartyInvite(${op.id})">Mời đội</button>
          </div>
        `;
      }
    } else {
      nearbyPlayersHtml = `<div style="text-align:center;color:#a39276;padding:8px;font-size:11px;">Không có người chơi nào khác ở bản đồ này.</div>`;
    }
  }

  return `
    <div class="auto-card">
      <div class="auto-card-title">👥 THIẾT LẬP TỔ ĐỘI TỰ ĐỘNG</div>
      <div class="auto-row">
        <label>
          <input type="checkbox" id="chkAutoPartyAccept" ${cfg.autoPartyAccept !== false ? 'checked' : ''}>
          <span>Tự động chấp nhận khi có lời mời vào tổ đội</span>
        </label>
      </div>
      <div class="auto-row">
        <label>
          <input type="checkbox" id="chkAutoPartyInvite" ${cfg.autoPartyInvite ? 'checked' : ''}>
          <span>Tự động mời người chơi cùng bản đồ vào đội</span>
        </label>
      </div>
      <div class="auto-row">
        <label>
          <input type="checkbox" id="chkAutoFollowLeader" ${cfg.followLeader ? 'checked' : ''}>
          <span>Tự động chạy theo đội trưởng khi cùng bản đồ</span>
        </label>
      </div>
    </div>

    <div class="auto-card">
      <div class="auto-card-title" style="display:flex;justify-content:space-between;">
        <span>👥 TỔ ĐỘI HIỆN TẠI ${inParty ? `(${pData.members.length}/5)` : ''}</span>
        ${inParty ? `<span style="font-size:10px;color:#4ade80;">+${(pData.members.length - 1) * 10}% EXP</span>` : ''}
      </div>
      <div class="auto-party-members">
        ${membersHtml}
      </div>
      <div style="display:flex;gap:8px;margin-top:8px;justify-content:flex-end;">
        ${!inParty
          ? `<button class="jx-action-btn gold sm" onclick="sendPartyCreate()">+ Tạo Đội Mới</button>`
          : `<button class="jx-action-btn sm" onclick="sendPartyLeave()" style="color:#ef4444;border-color:#b91c1c;">Rời Đội</button>`
        }
      </div>
    </div>

    <div class="auto-card">
      <div class="auto-card-title">🗺️ NGƯỜI CHƠI CÙNG BẢN ĐỒ</div>
      <div class="auto-party-members">
        ${nearbyPlayersHtml}
      </div>
    </div>
  `;
}

function renderAutoLootTab(cfg) {
  return `
    <div class="auto-card">
      <div class="auto-card-title">🎒 NHẶT ĐỒ & TRANG BỊ</div>
      <div class="auto-row">
        <label>
          <input type="checkbox" id="chkAutoLoot" ${cfg.autoLoot !== false ? 'checked' : ''}>
          <span>Tự động nhặt trang bị, lượng và bảo vật rơi trên đất</span>
        </label>
      </div>
      <div class="auto-row">
        <label>
          <input type="checkbox" id="chkAutoEquip" ${cfg.autoEquip ? 'checked' : ''}>
          <span>Tự động thay mặc trang bị có chỉ số mạnh hơn</span>
        </label>
      </div>
      <div class="auto-row">
        <label>
          <input type="checkbox" id="chkAutoSellWhite" ${cfg.autoSellWhite !== false ? 'checked' : ''}>
          <span>Tự động bán trang bị trắng (không có dòng thuộc tính)</span>
        </label>
      </div>
      <div class="auto-row">
        <label>
          <input type="checkbox" id="chkAutoForge" ${S.autoForge ? 'checked' : ''}>
          <span>Tự động rèn đồ (ghép mảnh Hoàng Kim, hợp Huyền Tinh mỗi 30s)</span>
        </label>
      </div>
    </div>
  `;
}

/* ==========================================
   BẮT SỰ KIỆN ĐIỀU KHIỂN AUTO
   ========================================== */
function bindAutoEvents(box) {
  // Master Switch button
  const bSwitch = box.querySelector('#btnAutoMasterSwitch');
  if (bSwitch) bSwitch.onclick = () => toggleAutoFight();

  // Subtab switching
  box.querySelectorAll('[data-atab]').forEach(tabBtn => {
    tabBtn.onclick = () => {
      curAutoTab = tabBtn.dataset.atab;
      renderAutoWin(box);
    };
  });

  // Slider events
  const slHp = box.querySelector('#slAutoHp');
  if (slHp) slHp.oninput = e => {
    S.auto.hpPct = Number(e.target.value);
    const v = box.querySelector('#valAutoHp'); if (v) v.textContent = e.target.value + '%';
    save();
  };

  const slMp = box.querySelector('#slAutoMp');
  if (slMp) slMp.oninput = e => {
    S.auto.mpPct = Number(e.target.value);
    const v = box.querySelector('#valAutoMp'); if (v) v.textContent = e.target.value + '%';
    save();
  };

  const slTp = box.querySelector('#slAutoTp');
  if (slTp) slTp.oninput = e => {
    S.auto.tpPct = Number(e.target.value);
    const v = box.querySelector('#valAutoTp'); if (v) v.textContent = e.target.value + '%';
    save();
  };

  // Checkboxes
  const bindChk = (id, key) => {
    const el = box.querySelector(id);
    if (el) el.onchange = e => { S.auto[key] = e.target.checked; save(); };
  };
  bindChk('#chkAutoBuyPot', 'autoBuyPot');
  bindChk('#chkAutoTp', 'autoTp');
  bindChk('#chkAutoTpOutPot', 'tpOnOutPot');
  bindChk('#chkAutoCombo', 'combo');
  bindChk('#chkAutoBuff', 'autoBuff');
  bindChk('#chkAutoMount', 'autoMount');
  bindChk('#chkAutoPartyAccept', 'autoPartyAccept');
  bindChk('#chkAutoPartyInvite', 'autoPartyInvite');
  bindChk('#chkAutoFollowLeader', 'followLeader');
  const elEquip = box.querySelector('#chkAutoEquip');
  if (elEquip) {
    elEquip.checked = !!S.autoEquip;
    elEquip.onchange = e => {
      S.autoEquip = e.target.checked;
      S.autoEquipExplicit = true;
      if (S.auto) {
        S.auto.autoEquip = S.autoEquip;
        S.auto.autoEquipExplicit = true;
      }
      save();
      toast(S.autoEquip ? 'Đã BẬT tự mặc đồ tốt hơn' : 'Đã TẮT tự mặc đồ tốt');
    };
  }
  bindChk('#chkAutoSellWhite', 'autoSellWhite');
  bindChk('#chkAutoPush', 'autoPush');
  bindChk('#chkAutoTower', 'autoTower');
  bindChk('#chkAutoDatau', 'autoDatau');
  bindChk('#chkAutoDungeon', 'autoDungeon');
  bindChk('#chkAutoWorldBoss', 'autoWorldBoss');
  bindChk('#chkAutoClaimReward', 'autoClaimReward');

  const chkForge = box.querySelector('#chkAutoForge');
  if (chkForge) chkForge.onchange = e => { S.autoForge = e.target.checked; if (S.autoForge) autoForge(); save(); };

  // Selects
  const selMain = box.querySelector('#selAutoMainSkill');
  if (selMain) selMain.onchange = e => { S.auto.mainSkillId = Number(e.target.value); save(); };

  const selBuff1 = box.querySelector('#selAutoBuff1');
  if (selBuff1) selBuff1.onchange = e => { S.auto.buffSkill1 = Number(e.target.value); save(); };

  const selBuff2 = box.querySelector('#selAutoBuff2');
  if (selBuff2) selBuff2.onchange = e => { S.auto.buffSkill2 = Number(e.target.value); save(); };

  const numInterval = box.querySelector('#numAutoBuffInterval');
  if (numInterval) numInterval.onchange = e => { S.auto.buffInterval = Math.max(5, Number(e.target.value) || 25); save(); };

  // Radios
  box.querySelectorAll('input[name="autoRange"]').forEach(r => {
    r.onchange = e => { if (e.target.checked) { S.auto.range = Number(e.target.value); save(); } };
  });

  box.querySelectorAll('input[name="autoPrio"]').forEach(r => {
    r.onchange = e => { if (e.target.checked) { S.auto.targetPrio = e.target.value; save(); } };
  });
}

function updateAutoUiIndicators() {
  if (!S) return;
  initAutoSettings();
  const isRunning = !!S.auto.on;
  const btnToggle = $('#btnAutoToggle');
  if (btnToggle) {
    btnToggle.innerHTML = isRunning ? `⚔ Auto: BẬT (F)` : `⏸ Auto: TẮT (F)`;
    btnToggle.style.color = isRunning ? '#4ade80' : '#f87171';
    btnToggle.title = isRunning ? 'Auto đang chạy. Nhấn F để tạm dừng' : 'Auto đang tắt. Nhấn F để bắt đầu';
  }
}

function toggleAutoFight() {
  if (!S) return;
  initAutoSettings();
  S.auto.on = !S.auto.on;
  S.ctrl = S.auto.on ? 'auto' : 'manual';
  save();
  const isRunning = S.auto.on;
  if (typeof uiSfx === 'function') uiSfx('click');
  if (typeof toast === 'function') toast(isRunning ? '🤖 Auto Chiến Đấu: ĐÃ BẬT' : '🛑 Auto Chiến Đấu: ĐÃ TẮT');
  updateAutoUiIndicators();
  if (typeof renderPad === 'function') renderPad();
  if (isLandscape() && !$('#fw-auto').classList.contains('hidden')) renderAutoWin();
  else if (!isLandscape() && curTab === 'auto') renderAutoWin();
}

function refreshAutoPartyTab() {
  if (curAutoTab === 'party') {
    if (isLandscape() && !$('#fw-auto').classList.contains('hidden')) renderAutoWin();
    else if (!isLandscape() && curTab === 'auto') renderAutoWin();
  }
  // Đồng bộ bảng Tổ Đội riêng ngoài Auto
  if (typeof renderPartyWin === 'function') {
    if (isLandscape() && $('#fw-party') && !$('#fw-party').classList.contains('hidden')) renderPartyWin();
    else if (!isLandscape() && typeof curTab !== 'undefined' && curTab === 'party') renderPartyWin();
  }
}

/* ==========================================
   BẢNG QUẢN LÝ TỔ ĐỘI ĐỘC LẬP NGOÀI AUTO
   ========================================== */
function renderPartyWin(targetContainer) {
  initAutoSettings();
  const box = targetContainer || (isLandscape() ? $('#t-party-f') : $('#t-party'));
  if (!box) return;

  const cfg = S.auto || {};
  const html = `
    <div class="auto-container" style="gap:8px;">
      ${renderAutoPartyTab(cfg)}
    </div>
  `;
  box.innerHTML = html;
  bindPartyEvents(box);
}

function bindPartyEvents(box) {
  const bindChk = (id, key) => {
    const el = box.querySelector(id);
    if (el) el.onchange = e => { S.auto[key] = e.target.checked; save(); };
  };
  bindChk('#chkAutoPartyAccept', 'autoPartyAccept');
  bindChk('#chkAutoPartyInvite', 'autoPartyInvite');
  bindChk('#chkAutoFollowLeader', 'followLeader');
}

/* ==========================================
   LOGIC THI TRIỂN TỰ BUFF & HỖ TRỢ
   ========================================== */

/* Tạo action object đúng format cho buff skill (tương tự activeInfo nhưng nhẹ, dành cho self-cast) */
function makeBuffAction(sk) {
  if (!sk) return null;
  const P = R.P;
  const L = (S.sk && S.sk[sk.id]) ? Math.max(1, S.sk[sk.id]) : 1;
  const cost = (typeof skVal === 'function' && skVal(sk, 'skill_cost_v', L))
    ? (skVal(sk, 'skill_cost_v', L) || [0])[0]
    : (sk.cost || 0);
  const form = sk.form !== undefined ? sk.form : 7; // mặc định form 7 = "tại người ra chiêu"
  return {
    id: sk.id, n: sk.n, L,
    parts: { phys: 0 }, tot: 0, rad: 80, melee: true,
    targets: 1, around: form === 7, cost,
    crit: 0, series5: 0, ignore: 0, stun: 0,
    series: P ? P.series : 0,
    rate: 1, dps: 0, useAR: false, isBuff: true, form
  };
}

/* Màu hào quang theo loại buff */
function buffAuraColor(sk) {
  if (!sk || !sk.n) return '#38bdf8';
  const n = sk.n.toLowerCase();
  if (n.includes('hỏa') || n.includes('lửa') || n.includes('phong ma')) return '#ff6b35';
  if (n.includes('kim') || n.includes('bạch') || n.includes('thiết')) return '#e2e8f0';
  if (n.includes('mộc') || n.includes('lâm') || n.includes('diệp')) return '#4ade80';
  if (n.includes('thổ') || n.includes('địa')) return '#fbbf24';
  if (n.includes('thủy') || n.includes('băng') || n.includes('hàn')) return '#60a5fa';
  if (n.includes('hộ') || n.includes('bất động') || n.includes('hàng phổ')) return '#a78bfa';
  return '#38bdf8';
}

/* Hiệu ứng hào quang (aura ring) khi buff được kích hoạt */
function buffAuraFx(col, label) {
  if (!R || R.quiet) return;
  R.fx = R.fx || [];
  if (R.fx.length < 80) {
    R.fx.push({ k: 'ring', x: H.x, y: H.y, color: col || '#38bdf8', life: 0.65, max: 0.65 });
    R.fx.push({ k: 'ring', x: H.x, y: H.y, color: col || '#7dd3fc', life: 0.45, max: 0.45 });
  }
  if (typeof addText === 'function' && label) {
    addText(H.x, H.y - 55, `✨ ${label}`, col || '#38bdf8', 13);
  }
  if (H) { H.act = 'at'; H.actT = 0; }
}

function castAutoBuffs() {
  if (!S || !S.fac || !S.auto || !S.auto.autoBuff || R.town || R.deadT > 0) return;
  const buffIds = [S.auto.buffSkill1, S.auto.buffSkill2].filter(id => id && id > 0);
  if (!buffIds.length) return;

  for (const skId of buffIds) {
    const sk = (typeof SK !== 'undefined') ? SK[skId] : null;
    if (!sk) continue;
    const isLearned = !!(S.sk && S.sk[skId] > 0);
    if (!isLearned) continue;

    const action = makeBuffAction(sk);
    if (!action) continue;
    if (R.mana < action.cost) continue;
    R.mana -= action.cost;

    const col = buffAuraColor(sk);
    buffAuraFx(col, sk.n);

    if (typeof castFx === 'function') castFx(action, H);
    if (typeof skillFx === 'function') skillFx(H, H, action);
    if (typeof skillSfx === 'function') skillSfx(sk.id);
    if (typeof sendMultiplayerSkill === 'function') sendMultiplayerSkill(action, H);

    R.buffs = R.buffs || {};
    R.buffs[sk.id] = { name: sk.n, dur: 30, col };

    if (typeof heal === 'function') {
      const n = sk.n || '';
      if (n.includes('Từ Hàng Phổ Độ')) heal(R.P.life * 0.25);
      else if (n.includes('Hồi Xuân') || n.includes('Sinh Khí')) heal(R.P.life * 0.15);
    }
  }
}

function autoBuffTick(dt) {
  if (!S || !S.auto || !S.auto.autoBuff || R.town || R.deadT > 0) return;
  R.buffTimer = (R.buffTimer || 0) + dt;
  const interval = S.auto.buffInterval || 25;
  if (R.buffTimer >= interval) {
    R.buffTimer = 0;
    castAutoBuffs();
  }
  if (R.buffs) {
    for (const id in R.buffs) {
      R.buffs[id].dur -= dt;
      if (R.buffs[id].dur <= 0) delete R.buffs[id];
    }
  }
}

/* ==========================================
   TỰ ĐỘNG THEO ĐỘI TRƯỞNG & MỜI TỔ ĐỘI
   ========================================== */
function autoPartyFollowTick(dt) {
  if (!S || !S.auto || !S.auto.followLeader || R.town || R.deadT > 0) return;
  if (typeof PARTY === 'undefined' || !PARTY.data || !PARTY.data.leaderId) return;
  if (typeof MP === 'undefined' || PARTY.data.leaderId === MP.myId) return; // Là đội trưởng thì không cần theo

  const leader = MP.otherPlayers[PARTY.data.leaderId];
  if (!leader || leader.zoneId !== (typeof getCurZoneId === 'function' ? getCurZoneId() : 0)) return;

  const d = Math.hypot(leader.x - H.x, leader.y - H.y);
  if (d > 180 && typeof obsSteer === 'function') {
    obsSteer(H, leader.x, leader.y, 160 * (R.P ? R.P.speed : 1) * dt);
  }
}

function autoPartyInviteTick(dt) {
  if (!S || !S.auto || !S.auto.autoPartyInvite || R.town || R.deadT > 0) return;
  if (typeof MP === 'undefined' || !MP.connected || !MP.otherPlayers) return;

  autoPartyInviteCooldown = (autoPartyInviteCooldown || 0) - dt;
  if (autoPartyInviteCooldown <= 0) {
    autoPartyInviteCooldown = 15; // Mỗi 15s tìm mời 1 lần
    const curZone = (typeof getCurZoneId === 'function') ? getCurZoneId() : 0;
    const others = Object.values(MP.otherPlayers).filter(p => p.zoneId === curZone);
    if (others.length > 0) {
      const target = others[Math.floor(Math.random() * others.length)];
      sendPartyInvite(target.id);
    }
  }
}

/* ==========================================
   TỰ ĐỘNG HÓA TOÀN DIỆN (OMNI-AUTO SYSTEM)
   Vượt ải, Leo tháp, Dã tẩu, Phó bản, Boss, Phúc lợi
   ========================================== */
let _omniDatauTimer = 2;
let _omniTowerTimer = 10;
let _omniDungeonTimer = 15;
let _omniBossTimer = 20;
let _omniRewardTimer = 5;
let _omniPushTimer = 2;

function autoOmniTick(dt) {
  if (!S || !S.auto || !S.auto.on) return;
  if (typeof R === 'undefined' || !R || R.town || R.deadT > 0) return;

  // 1. Tự động Vượt Ải (Auto Push Stage)
  _omniPushTimer -= dt;
  if (_omniPushTimer <= 0) {
    _omniPushTimer = 3;
    if (S.auto.autoPush !== false && !R.tower && !R.dungeon) {
      if (!S.push) {
        if (typeof togglePushMode === 'function') {
          togglePushMode(true);
        } else {
          S.push = true;
        }
      }
    }
  }

  // 2. Tự động làm Dã Tẩu (Auto Dã Tẩu Quest)
  _omniDatauTimer -= dt;
  if (_omniDatauTimer <= 0) {
    _omniDatauTimer = 4;
    if (S.auto.autoDatau !== false && typeof DATAU !== 'undefined') {
      if (DATAU.completed) {
        DATAU.claim('exp');
      } else if (!DATAU.curTask) {
        DATAU.accept();
      } else if (DATAU.curTask) {
        DATAU.check();
      }
    }
  }

  // 3. Tự động Leo Tháp (Auto Tower)
  _omniTowerTimer -= dt;
  if (_omniTowerTimer <= 0) {
    _omniTowerTimer = 15;
    if (S.auto.autoTower !== false && !R.tower && !R.dungeon && R.P && (R.life > R.P.life * 0.6)) {
      if (S.lvl >= 10 && typeof towerStart === 'function') {
        towerStart();
      }
    }
  }

  // 4. Tự động Phó Bản (Auto Dungeon)
  _omniDungeonTimer -= dt;
  if (_omniDungeonTimer <= 0) {
    _omniDungeonTimer = 20;
    if (S.auto.autoDungeon !== false && !R.tower && !R.dungeon && R.P && (R.life > R.P.life * 0.7)) {
      if (typeof getDungeonState === 'function' && typeof DUNGEONS !== 'undefined' && typeof dungeonStart === 'function') {
        const ds = getDungeonState();
        if (ds && ds.tickets > 0) {
          const availDungeons = DUNGEONS.filter(d => S.lvl >= d.reqLvl).sort((a, b) => b.reqLvl - a.reqLvl);
          if (availDungeons.length > 0) {
            dungeonStart(availDungeons[0].id);
          }
        }
      }
    }
  }

  // 5. Tự động Săn Boss Hoàng Kim Thế Giới (Auto World Boss)
  _omniBossTimer -= dt;
  if (_omniBossTimer <= 0) {
    _omniBossTimer = 25;
    if (S.auto.autoWorldBoss !== false && !R.tower && !R.dungeon && R.P && (R.life > R.P.life * 0.7)) {
      if (typeof pvkEnsureBoss === 'function' && typeof PVK_WORLD_BOSSES !== 'undefined' && typeof bossChallenge === 'function') {
        pvkEnsureBoss();
        if (S.bossState && S.bossState.tickets > 0) {
          const availBosses = PVK_WORLD_BOSSES.filter(b => S.lvl >= b.reqLvl).sort((a, b) => b.lvl - a.lvl);
          if (availBosses.length > 0) {
            bossChallenge(availBosses[0].id);
          }
        }
      }
    }
  }

  // 6. Tự động Nhận Thưởng (Auto Claim Daily, Milestones, VIP)
  _omniRewardTimer -= dt;
  if (_omniRewardTimer <= 0) {
    _omniRewardTimer = 15;
    if (S.auto.autoClaimReward !== false && typeof RW === 'function') {
      if (typeof claimLogin === 'function') claimLogin();
      if (typeof lvMsReady === 'function' && typeof claimLvMs === 'function') {
        const ready = lvMsReady();
        if (ready && ready.length) {
          ready.forEach(m => claimLvMs(m[0]));
        }
      }
      if (typeof dailyQuests === 'function' && typeof claimQuest === 'function') {
        const dq = dailyQuests();
        if (dq && dq.list) {
          dq.list.forEach((q, idx) => {
            if (!q.done && q.have >= q.need) claimQuest(idx);
          });
        }
      }
      if (typeof claimDailyVip === 'function') claimDailyVip();
    }
  }
}

// Lắng nghe sự kiện click mở bảng Auto
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      const bToggle = $('#btnAutoToggle');
      if (bToggle) bToggle.onclick = () => toggleAutoFight();
      updateAutoUiIndicators();
    }, 500);
  });
}

/* ==========================================================================
   GIỮ NGUYÊN CÁC TÍNH NĂNG TỰ RÈN & TỰ MUA ĐỒ
   ========================================================================== */
const AUTO_FORGE_MAX = { fuse: 5, ench: 6, up: 8 };
function enchaseTargets() {
  const worn = Object.values(S.eq).filter(Boolean), pool = worn.concat(S.inv);
  return pool.filter(it => !it.set && it.d >= 0 && it.d <= 9 && (it.mag || []).length < VIO_SLOTS && ((it.mag || []).length === 0 ? it.r === 0 : it.vio))
    .sort((a, b) => (worn.includes(b) - worn.includes(a)) || (b.lvl - a.lvl));
}
function findEnchase() {
  const hts = Object.keys(mats().ht).map(Number).sort((a, b) => b - a), ores = Object.keys(mats().ore);
  if (!hts.length || !ores.length) return null;
  for (const it of enchaseTargets()) {
    const n = it.mag.length;
    for (const key of ores) {
      if (oreParse(key).place !== n) continue;
      for (const ht of hts) if (typeof enchaseCheck(it, ht, key) !== 'string') return { it, ht, key };
    }
  }
  return null;
}
const forgeReadyCounts = () => ({
  shard: Object.keys(mats().shard).filter(n => SHARDS[n] && matHave('shard', n) >= SHARDS[n]).length,
  up: Object.keys(mats().ht).map(Number).filter(l => l < HT_MAX && matHave('ht', l) >= 3).length,
  ench: findEnchase() ? 1 : 0,
  fuse: fusePool().length >= 3 && S.gold >= fuseCost() * 2 ? 1 : 0,
});
function fusePool() { return S.inv.filter(canFuse).filter(x => !betterThanEquipped(x)).sort((a, b) => itemPower(a) - itemPower(b)); }
function autoForge() {
  if (!S || !S.fac || !S.autoForge) return null;
  const st = { shard: 0, ench: 0, fuse: 0, up: 0, fail: 0 };
  for (const n of Object.keys(mats().shard)) if (SHARDS[n] && matHave('shard', n) >= SHARDS[n] && S.inv.length < INV_MAX) { if (combineShards(n).ok) st.shard++; }
  for (let g = 0; g < AUTO_FORGE_MAX.ench; g++) { const f = findEnchase(); if (!f) break; const r = enchase(f.it, f.ht, f.key); if (r.ok) st.ench++; else st.fail++; }
  for (let g = 0; g < AUTO_FORGE_MAX.fuse; g++) { const p = fusePool().slice(0, 3); if (p.length < 3 || S.gold < fuseCost() * 2 || !fuse(p).ok) break; st.fuse++; }
  let ups = 0;
  for (let l = 1; l < HT_MAX; l++) while (matHave('ht', l) >= 3 && ups < AUTO_FORGE_MAX.up) { ups++; const r = upgradeHT(l); if (r.ok) st.up++; else st.fail++; }
  const parts = [];
  if (st.shard) parts.push(`ghép ${st.shard} món Hoàng Kim`);
  if (st.ench) parts.push(`khảm ${st.ench} dòng Tím`);
  if (st.fuse) parts.push(`hợp ${st.fuse} Huyền Tinh`);
  if (st.up) parts.push(`thăng cấp ${st.up} Huyền Tinh`);
  if (st.fail) parts.push(`${st.fail} lần thất bại`);
  if (parts.length) { R.dirty = true; invDirty = true; log(`<span class="dim">Tự rèn: ${parts.join(', ')}.</span>`); }
  return st;
}

const AUTO_BUY_GAIN = 1.25, AUTO_BUY_BUDGET = 0.6;
function bestOwnedWeaponDmg() {
  if (!S || !S.fac) return 0;
  const f = FAC[S.fac]; let best = 0;
  for (const it of S.inv.concat(S.eq.weapon ? [S.eq.weapon] : []))
    if (it.d <= 1 && sexOk(it) && (it.req || []).every(([id, v]) => id !== 36 || S.lvl >= v) && (f.wcode < 0 || weaponCode({ weapon: it }) === f.wcode)) best = Math.max(best, weaponDmg(it));
  return best;
}
function autoBuyWeapon() {
  if (!S || !S.fac) return null;
  const f = FAC[S.fac]; if (!f || S.autoBuy === false || f.wcode < 0 || !J.shops.weapon) return null;
  if (S.inv.length >= INV_MAX) return null;
  const have = bestOwnedWeaponDmg(); let pick = null;
  for (const g of J.shops.weapon.items) {
    if (g.g === 1) continue;
    const it = goodsItem(g); if (!it || it.d > 1 || weaponCode({ weapon: it }) !== f.wcode || !sexOk(it)) continue;
    const price = shopPrice(g), dmg = weaponDmg(it);
    if (price > S.gold * AUTO_BUY_BUDGET || dmg < have * AUTO_BUY_GAIN) continue;
    const lv = (it.req.find(q => q[0] === 36) || [0, 0])[1]; if (lv > S.lvl) continue;
    if ((it.req || []).some(([id, v]) => (id === 37 || id === 39) && v >= 0 && !reqOk(it))) continue;
    const need = Object.values(reqDeficit(it)).reduce((a, b) => a + b, 0);
    if (need > 0 && !(S.autoPts === true && need <= S.attrPts + PTS_PER_LEVEL * REQ_SAVE_LEVELS)) continue;
    if (!pick || dmg > pick.dmg) pick = { g, dmg, price, need };
  }
  if (!pick) return null;
  const it = makeItem(pick.g.d, pick.g.k, pick.g.lvl, 0); if (!it) return null;
  it.s = shopSeries(pick.g, it); S.gold -= pick.price;
  addItem(it, true, true, true);
  log(`<span class="dim">Tự mua <b>${esc(it.n)}</b> ở Biện Kinh (${fmt(pick.price)} lượng).</span>`);
  if (S.autoPts === true) autoSpendAttrs();
  autoEquipAll(); R.dirty = true; invDirty = true;
  return it;
}
