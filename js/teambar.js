/* ==========================================================================
   VÕ LÂM IDLE - THANH TỔ ĐỘI CHUẨN PC (TEAMBAR NATIVE VLTK / JxPhaThien)
   Trích xuất từ UiTeamManageBar.ini & Spr\Ui3\UiTeamManageBar (H:\JxPhaThien)
   1. Hiển thị danh sách 8 thành viên tổ đội theo thời gian thực (Real-time HP/MP)
   2. Biểu tượng môn phái 11 phái, cờ đội trưởng, cấp độ, thanh máu, thanh nội lực
   3. Tự động thu gọn / mở rộng, kéo thả tự do vị trí (Moveable)
   4. Tự động đi theo (Follow) thành viên / đội trưởng khi nhấp vào slot
   5. Menu thao tác nhanh: Nhường trưởng nhóm, Trục xuất, Rời đội
   ========================================================================== */
'use strict';

const FAC_TEAM_ICONS = {
  shaolin: 'img/team/icon_zd_sl.png',
  tianwang: 'img/team/icon_zd_tw.png',
  tangmen: 'img/team/icon_zd_tm.png',
  wudu: 'img/team/icon_zd_wu.png',
  emei: 'img/team/icon_zd_em.png',
  cuiyan: 'img/team/icon_zd_cy.png',
  gaibang: 'img/team/icon_zd_gb.png',
  tianren: 'img/team/icon_zd_tr.png',
  wudang: 'img/team/icon_zd_wd.png',
  kunlun: 'img/team/icon_zd_kl.png',
  huashan: 'img/team/icon_zd_hsp.png'
};

const FAC_SHORT_NAMES = {
  shaolin: 'Thiếu Lâm',
  tianwang: 'Thiên Vương',
  tangmen: 'Đường Môn',
  wudu: 'Ngũ Độc',
  emei: 'Nga My',
  cuiyan: 'Thúy Yên',
  gaibang: 'Cái Bang',
  tianren: 'Thiên Nhẫn',
  wudang: 'Võ Đang',
  kunlun: 'Côn Lôn',
  huashan: 'Hoa Sơn'
};

let isTeambarCollapsed = false;
let teambarFollowTarget = null; // { id, name }
let teambarLastRenderT = 0;

function initTeambar() {
  const bar = document.getElementById('teambar');
  if (!bar) return;

  // Khôi phục vị trí đã lưu nếu có
  try {
    const saved = localStorage.getItem('teambar_pos');
    if (saved) {
      const pos = JSON.parse(saved);
      if (pos.left != null) bar.style.left = pos.left + 'px';
      if (pos.top != null) bar.style.top = pos.top + 'px';
    }
  } catch (e) {}

  // Kéo thả di chuyển (Draggable) giống bản PC (Moveable=1)
  const header = document.getElementById('teambarHeader');
  if (header) {
    let isDragging = false, startX = 0, startY = 0, origX = 0, origY = 0;

    header.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      isDragging = true;
      header.setPointerCapture && header.setPointerCapture(e.pointerId);
      startX = e.clientX;
      startY = e.clientY;
      const rect = bar.getBoundingClientRect();
      const parentRect = bar.offsetParent ? bar.offsetParent.getBoundingClientRect() : { left: 0, top: 0 };
      origX = rect.left - parentRect.left;
      origY = rect.top - parentRect.top;
      e.stopPropagation();
    });

    header.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const newLeft = Math.max(0, origX + dx);
      const newTop = Math.max(0, origY + dy);
      bar.style.left = newLeft + 'px';
      bar.style.top = newTop + 'px';
      e.stopPropagation();
    });

    const stopDrag = () => {
      if (!isDragging) return;
      isDragging = false;
      try {
        localStorage.setItem('teambar_pos', JSON.stringify({
          left: parseInt(bar.style.left) || 0,
          top: parseInt(bar.style.top) || 0
        }));
      } catch (e) {}
    };

    header.addEventListener('pointerup', stopDrag);
    header.addEventListener('pointercancel', stopDrag);
  }

  // Nút thu gọn / mở rộng
  const btnToggle = document.getElementById('btnTeambarToggle');
  if (btnToggle) {
    btnToggle.onclick = (e) => {
      e.stopPropagation();
      isTeambarCollapsed = !isTeambarCollapsed;
      updateTeambar();
    };
  }

  // Nút mở bảng quản lý tổ đội
  const btnManage = document.getElementById('btnTeambarManage');
  if (btnManage) {
    btnManage.onclick = (e) => {
      e.stopPropagation();
      if (typeof toggleWin === 'function') toggleWin('party');
    };
  }

  // Cập nhật giao diện ban đầu
  updateTeambar();
}

function updateTeambar() {
  const bar = document.getElementById('teambar');
  if (!bar) return;

  const partyData = (typeof PARTY !== 'undefined') ? PARTY.data : null;
  const inParty = !!(partyData && Array.isArray(partyData.members) && partyData.members.length > 0);

  // Nếu không ở trong tổ đội -> Ẩn thanh Teambar
  if (!inParty) {
    bar.classList.add('hidden');
    teambarFollowTarget = null;
    return;
  }

  // Đang trong tổ đội -> Hiển thị thanh Teambar
  bar.classList.remove('hidden');

  const members = partyData.members;
  const isLeader = (typeof MP !== 'undefined' && MP.myId === partyData.leaderId);

  // Cập nhật Header
  const titleEl = document.getElementById('teambarTitle');
  if (titleEl) {
    titleEl.textContent = `TỔ ĐỘI (${members.length}/8)`;
    titleEl.title = `Tổ đội: ${members.length} thành viên (+${(members.length - 1) * 10}% EXP)`;
  }

  const btnToggle = document.getElementById('btnTeambarToggle');
  if (btnToggle) {
    btnToggle.className = `teambar-toggle-btn ${isTeambarCollapsed ? 'collapsed' : ''}`;
    btnToggle.title = isTeambarCollapsed ? 'Mở rộng thanh tổ đội' : 'Thu gọn thanh tổ đội';
  }

  const listEl = document.getElementById('teambarList');
  if (!listEl) return;

  // Nếu đang thu gọn -> Ẩn danh sách
  if (isTeambarCollapsed) {
    listEl.style.display = 'none';
    return;
  }
  listEl.style.display = 'flex';

  const myId = (typeof MP !== 'undefined') ? MP.myId : -1;
  const curZone = (typeof getCurZoneId === 'function') ? getCurZoneId() : 0;

  let html = '';
  for (let i = 0; i < members.length; i++) {
    const m = members[i];
    const isMe = (m.id === myId);
    const isCaptain = (m.id === partyData.leaderId);
    const isFollowing = (teambarFollowTarget && teambarFollowTarget.id === m.id);

    // Môn phái icon
    const facKey = m.fac || 'shaolin';
    const facIcon = FAC_TEAM_ICONS[facKey] || 'img/team/icon_zd_new.png';
    const facName = FAC_SHORT_NAMES[facKey] || 'Võ Lâm';

    // Tính toán HP & MP
    let curHp = m.hp != null ? m.hp : 100;
    let maxHp = m.maxHp || 100;
    let curMp = m.mp != null ? m.mp : 100;
    let maxMp = m.maxMp || 100;

    // Nếu là bản thân, lấy chỉ số trực tiếp từ client để siêu mượt
    if (isMe && typeof R !== 'undefined' && R) {
      curHp = Math.round(R.life);
      maxHp = Math.round(R.P ? R.P.life : 100);
      curMp = Math.round(R.mana);
      maxMp = Math.round(R.P ? R.P.mana : 100);
    }

    const hpPct = Math.max(0, Math.min(100, Math.round((curHp / Math.max(1, maxHp)) * 100)));
    const mpPct = Math.max(0, Math.min(100, Math.round((curMp / Math.max(1, maxMp)) * 100)));

    // Bản đồ & Khoảng cách
    const sameMap = (m.zoneId == null || m.zoneId === curZone);
    let distText = '';
    if (!sameMap) {
      const zObj = (typeof JW !== 'undefined' && JW.zones) ? JW.zones.find(z => z.id === m.zoneId) : null;
      distText = `<span class="tb-dist-diff" title="Đang ở bản đồ khác">[${zObj ? zObj.n : 'Xa'}]</span>`;
    } else if (!isMe && typeof H !== 'undefined') {
      const d = Math.round(Math.hypot((m.x || 0) - H.x, (m.y || 0) - H.y));
      distText = `<span class="tb-dist-same" title="Khoảng cách: ${d}px">${d < 300 ? 'Gần' : Math.round(d / 10) + 'm'}</span>`;
    }

    html += `
      <div class="teambar-slot ${isMe ? 'is-me' : ''} ${isFollowing ? 'is-following' : ''} ${!sameMap ? 'diff-zone' : ''}"
           data-mid="${m.id}" data-mname="${esc(m.name)}" title="${isMe ? 'Bản thân' : 'Nhấp chuột trái: Đi theo · Nhấp chuột phải: Thao tác'}">
        <!-- Cờ Đội Trưởng -->
        ${isCaptain ? `<img src="img/team/flag-captain.png" class="tb-captain-flag" title="Đội Trưởng" alt="Cờ">` : ''}

        <!-- Icon Môn Phái -->
        <div class="tb-fac-box" title="${facName}">
          <img src="${facIcon}" class="tb-fac-icon" alt="${facName}">
          <span class="tb-level">Lv.${m.lvl || 1}</span>
        </div>

        <!-- Thông Tin Tên & Trạng Thái -->
        <div class="tb-info-box">
          <div class="tb-name-row">
            <span class="tb-name ${isMe ? 'gold' : ''}">${esc(m.name)}${isMe ? ' <small>(Tôi)</small>' : ''}</span>
            ${distText}
          </div>

          <!-- Thanh Máu (HP Bar) -->
          <div class="tb-bar-container hp" title="Sinh Lực: ${curHp}/${maxHp} (${hpPct}%)">
            <div class="tb-bar-fill hp" style="width:${hpPct}%;"></div>
            <span class="tb-bar-text">${curHp}/${maxHp}</span>
          </div>

          <!-- Thanh Nội Lực (MP Bar) -->
          <div class="tb-bar-container mp" title="Nội Lực: ${curMp}/${maxMp} (${mpPct}%)">
            <div class="tb-bar-fill mp" style="width:${mpPct}%;"></div>
          </div>
        </div>

        <!-- Menu Nút Nhanh -->
        ${(!isMe) ? `
          <div class="tb-actions">
            <button class="tb-act-btn ${isFollowing ? 'on' : ''}" onclick="toggleFollowPartyMember(${m.id}, event)" title="${isFollowing ? 'Hủy đi theo' : 'Đi theo sau'}">
              ${isFollowing ? '🏃' : '👣'}
            </button>
            ${isLeader ? `
              <button class="tb-act-btn" onclick="openMemberMenu(${m.id}, event)" title="Thao tác đội trưởng">
                ⋮
              </button>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }

  listEl.innerHTML = html;

  // Gắn sự kiện click slot để đi theo
  listEl.querySelectorAll('.teambar-slot').forEach(el => {
    el.onclick = (e) => {
      if (e.target.closest('button')) return;
      const mId = Number(el.dataset.mid);
      if (mId && mId !== myId) {
        toggleFollowPartyMember(mId, e);
      }
    };

    el.oncontextmenu = (e) => {
      e.preventDefault();
      const mId = Number(el.dataset.mid);
      if (mId && mId !== myId) {
        openMemberMenu(mId, e);
      }
    };
  });
}

// Bật / Tắt đi theo sau một thành viên tổ đội
function toggleFollowPartyMember(memberId, ev) {
  if (ev) ev.stopPropagation();
  const partyData = (typeof PARTY !== 'undefined') ? PARTY.data : null;
  const target = partyData && partyData.members ? partyData.members.find(m => m.id === memberId) : null;
  const memberName = target ? target.name : 'Đồng đội';

  if (teambarFollowTarget && teambarFollowTarget.id === memberId) {
    teambarFollowTarget = null;
    if (typeof toast === 'function') toast(`Đã dừng đi theo ${memberName}`);
  } else {
    teambarFollowTarget = { id: memberId, name: memberName };
    if (typeof toast === 'function') toast(`🏃 Đang đi theo sau: <b>${memberName}</b>`);
  }
  updateTeambar();
}

// Menu hành động với thành viên (Dành cho Đội trưởng)
function openMemberMenu(targetId, ev) {
  if (ev) ev.stopPropagation();
  const partyData = (typeof PARTY !== 'undefined') ? PARTY.data : null;
  if (!partyData) return;

  const target = partyData.members ? partyData.members.find(m => m.id === targetId) : null;
  const targetName = target ? target.name : 'Đồng đội';
  const isLeader = (typeof MP !== 'undefined' && MP.myId === partyData.leaderId);

  let actionsHtml = `
    <div style="padding:10px 12px;text-align:center;min-width:180px;">
      <h4 style="color:#ffd700;font-size:13px;margin-bottom:8px;">👥 ${esc(targetName)}</h4>
      <div style="display:flex;flex-direction:column;gap:6px;">
        <button class="jx-action-btn gold" onclick="toggleFollowPartyMember(${targetId}); closeModal();">
          🏃 Đi theo sau
        </button>
        <button class="jx-action-btn" onclick="if(window.TRADE)TRADE.request(${targetId},'${esc(targetName)}'); closeModal();">
          🤝 Mời Giao Dịch
        </button>
  `;

  const otherPl = (typeof MP !== 'undefined' && MP.otherPlayers) ? MP.otherPlayers[targetId] : null;
  if (otherPl && otherPl.stall && Array.isArray(otherPl.stall.items) && otherPl.stall.items.length > 0) {
    actionsHtml += `
      <button class="jx-action-btn gold" onclick="if(window.STALL)STALL.openViewStall(${targetId}, MP.otherPlayers[${targetId}].stall, '${esc(targetName)}'); closeModal();" style="background:#eab308;color:#000;font-weight:bold;">
        🏪 Xem Sạp Hàng [${esc(otherPl.stall.title)}]
      </button>
    `;
  }

  if (isLeader) {
    actionsHtml += `
      <button class="jx-action-btn" onclick="sendPartyTransfer(${targetId}); closeModal(); toast('Đã nhường trưởng nhóm');">
        👑 Nhường Đội Trưởng
      </button>
      <button class="jx-action-btn" onclick="sendPartyKick(${targetId}); closeModal(); toast('Đã mời thành viên rời đội');" style="color:#ef4444;border-color:#b91c1c;">
        🚫 Trục Xuất Khỏi Đội
      </button>
    `;
  }

  actionsHtml += `
      </div>
    </div>
  `;

  if (typeof modal === 'function') modal(actionsHtml);
}

// Vòng lặp cập nhật vị trí đi theo (Teambar Follow Tick)
function teambarFollowTick(dt) {
  if (!teambarFollowTarget || typeof H === 'undefined' || !H) return;
  if (typeof manual === 'function' && manual()) {
    // Nếu người chơi chủ động bấm phím di chuyển, tạm dừng đi theo
    teambarFollowTarget = null;
    updateTeambar();
    return;
  }

  const partyData = (typeof PARTY !== 'undefined') ? PARTY.data : null;
  if (!partyData || !partyData.members) {
    teambarFollowTarget = null;
    return;
  }

  const curZone = (typeof getCurZoneId === 'function') ? getCurZoneId() : 0;
  const targetMem = partyData.members.find(m => m.id === teambarFollowTarget.id);

  if (!targetMem || (targetMem.zoneId != null && targetMem.zoneId !== curZone)) {
    // Khác bản đồ thì không thể bám theo
    return;
  }

  // Tọa độ mục tiêu
  let tx = targetMem.x, ty = targetMem.y;
  if (typeof MP !== 'undefined' && MP.otherPlayers && MP.otherPlayers[targetMem.id]) {
    const pl = MP.otherPlayers[targetMem.id];
    tx = pl.x; ty = pl.y;
  }

  if (tx == null || ty == null) return;

  const dist = Math.hypot(tx - H.x, ty - H.y);
  // Nếu cách xa hơn 70px, tự động chạy theo
  if (dist > 70 && typeof obsSteer === 'function') {
    const speed = (S && S.mounted ? 260 : 185) * (R && R.P ? R.P.speed : 1);
    obsSteer(H, tx, ty, speed * dt);
    H.face = tx >= H.x ? 1 : -1;
  }
}

// Định kỳ cập nhật teambar mỗi 500ms
setInterval(() => {
  if (typeof PARTY !== 'undefined' && PARTY.data && PARTY.data.members && PARTY.data.members.length > 0) {
    updateTeambar();
  }
}, 500);
