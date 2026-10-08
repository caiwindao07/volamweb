/* ==========================================================================
   VÕ LÂM IDLE - ĐẠI CHIẾN TỐNG KIM CHUẨN VLTK (SONG-JIN BATTLEGROUND)
   Trích xuất từ Server\script\battles & TONGKIM_V9_PORT_NOTES.md (H:\JxPhaThien)
   1. Đại chiến 2 phe: Tống (Cờ Xanh) vs Kim (Cờ Đỏ) trên bản đồ Chiến Trường 386
   2. Hệ thống điểm Quân Công & Bảng Báo Cáo Nhanh Tống Kim (ËÎ½ð¿ì±¨ Fast Report)
   3. Binh lính Tống - Kim giao tranh, Đại Boss Trương Tông Chính & Liễu Thanh Thanh
   4. Cửa hàng Quân Nhu Tống Kim đổi Chiến Mã, Quân Công Bài, Rương Trang Bị
   ========================================================================== */
'use strict';

const TONGKIM = {
  inBattle: false,
  camp: null,          // 'song' | 'jin'
  phase: 'idle',       // 'register' | 'staging' | 'battle' | 'ended' | 'idle'
  phaseName: 'Chờ trận kế',
  timeLeft: 600,
  songScore: 0,
  jinScore: 0,
  myScore: 0,
  myKills: 0,
  myCombo: 0,
  quanco: 0,           // Điểm Quân Công tích lũy
  ladder: [],

  init() {
    this.updateHud();
    // Tự động đếm nhịp mỗi giây nếu ở map Tống Kim hoặc để cập nhật đồng hồ
    if (!this._timer) {
      this._timer = setInterval(() => {
        if (!this.inBattle) {
          const s = this.getSchedule();
          this.phase = s.phase;
          this.phaseName = s.phaseName;
          this.timeLeft = s.timeLeft;
        } else if (this.timeLeft > 0) {
          this.timeLeft--;
          this.updateHud();
        }
      }, 1000);
    }
  },

  // Tính lịch trình Tống Kim theo đồng hồ thực (mỗi giờ 1 trận, trận 30 phút)
  getSchedule() {
    const now = new Date();
    const m = now.getMinutes();
    const s = now.getSeconds();
    const secInHour = m * 60 + s;

    if (secInHour < 300) {
      return { phase: 'register', phaseName: 'BÁO DANH', timeLeft: 300 - secInHour, total: 300 };
    } else if (secInHour < 480) {
      return { phase: 'staging', phaseName: 'DOANH TRẠI ĐỢI', timeLeft: 480 - secInHour, total: 180 };
    } else if (secInHour < 1680) {
      return { phase: 'battle', phaseName: 'GIAO TRANH', timeLeft: 1680 - secInHour, total: 1200 };
    } else if (secInHour < 1800) {
      return { phase: 'ended', phaseName: 'TỔNG KẾT', timeLeft: 1800 - secInHour, total: 120 };
    } else {
      return { phase: 'idle', phaseName: 'NGHỈ NGƠI CHỜ TRẬN KẾ', timeLeft: 3600 - secInHour, total: 1800 };
    }
  },

  // 1. Mở bảng Báo Danh Tống Kim
  openRegisterModal() {
    const s = this.getSchedule();
    const mins = Math.floor(s.timeLeft / 60);
    const secs = s.timeLeft % 60;
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    let statusBadge = '';
    let actionButtons = '';

    if (s.phase === 'register') {
      statusBadge = `<div style="background:#166534;border:1px solid #4ade80;color:#86efac;padding:6px 10px;border-radius:4px;font-size:12px;margin:8px 0;text-align:center;">
        🟢 <b>ĐANG MỞ BÁO DANH!</b> Thời gian còn: <b style="color:#fff;">${timeStr}</b>
      </div>`;
      actionButtons = `
        <div class="tongkim-camp-select">
          <button class="tk-camp-btn song" onclick="TONGKIM.join('song'); closeModal();">
            <span class="tk-camp-flag">🚩</span>
            <b>GIA NHẬP PHE TỐNG</b>
            <small>Cờ Xanh Biển · Đại Doanh Tống</small>
          </button>
          <button class="tk-camp-btn jin" onclick="TONGKIM.join('jin'); closeModal();">
            <span class="tk-camp-flag">🚩</span>
            <b>GIA NHẬP PHE KIM</b>
            <small>Cờ Đỏ Cam · Đại Doanh Kim</small>
          </button>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px;">
          <button class="jx-action-btn gold" onclick="TONGKIM.join('auto'); closeModal();" style="flex:1;">
            🎲 Báo Danh Ngẫu Nhiên (+10% Quân Công)
          </button>
          <button class="jx-action-btn" onclick="TONGKIM.openShopModal();" style="padding:8px 14px;">
            🎖️ Quân Nhu
          </button>
        </div>
      `;
    } else if (s.phase === 'staging') {
      statusBadge = `<div style="background:#854d0e;border:1px solid #facc15;color:#fef08a;padding:6px 10px;border-radius:4px;font-size:12px;margin:8px 0;text-align:center;">
        ⏳ <b>HẾT GIỜ BÁO DANH! ĐANG TẬP KẾT ĐẠI DOANH!</b> Xuất kích sau: <b style="color:#fff;">${timeStr}</b>
      </div>`;
      actionButtons = `
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px;">
          <button class="jx-action-btn gold" onclick="TONGKIM.join('auto'); closeModal();" style="padding:10px;">
            ⚔️ Vào Đại Doanh Chờ Xuất Kích
          </button>
          <button class="jx-action-btn" onclick="TONGKIM.openShopModal();">
            🎖️ Mở Cửa Hàng Quân Nhu
          </button>
        </div>
      `;
    } else if (s.phase === 'battle') {
      statusBadge = `<div style="background:#991b1b;border:1px solid #f87171;color:#fecaca;padding:6px 10px;border-radius:4px;font-size:12px;margin:8px 0;text-align:center;">
        🔥 <b>CHIẾN TRƯỜNG ĐANG GIAO TRANH ÁC LIỆT!</b> Thời gian còn: <b style="color:#fff;">${timeStr}</b>
      </div>`;
      actionButtons = `
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px;">
          <button class="jx-action-btn gold" onclick="TONGKIM.join('auto'); closeModal();" style="padding:10px;font-size:13px;font-weight:bold;">
            ⚔️ LẬP TỨC TIẾP VIỆN THAM CHIẾN!
          </button>
          <div style="display:flex;gap:8px;">
            <button class="jx-action-btn" onclick="TONGKIM.toggleReport(); closeModal();" style="flex:1;">📊 Xem BXH</button>
            <button class="jx-action-btn" onclick="TONGKIM.openShopModal();" style="flex:1;">🎖️ Quân Nhu</button>
          </div>
        </div>
      `;
    } else {
      // ended or idle
      const nextHour = (new Date().getHours() + 1) % 24;
      statusBadge = `<div style="background:#1e293b;border:1px solid #64748b;color:#cbd5e1;padding:8px 10px;border-radius:4px;font-size:12px;margin:8px 0;text-align:center;line-height:1.5;">
        🌿 <b>CHIẾN TRƯỜNG TỐNG KIM TẠM NGHỈ</b><br>
        Trận kế tiếp mở báo danh lúc <b>${String(nextHour).padStart(2, '0')}:00</b> (còn lại: <b style="color:#fde047;">${timeStr}</b>)
      </div>`;
      actionButtons = `
        <div style="display:flex;gap:8px;margin-top:10px;">
          <button class="jx-action-btn gold" onclick="TONGKIM.openShopModal();" style="flex:1;padding:10px;">
            🎖️ Mở Cửa Hàng Quân Nhu Đổi Thưởng
          </button>
          <button class="jx-action-btn" onclick="TONGKIM.toggleReport(); closeModal();" style="flex:1;">
            📊 Xem BXH Trận Trước
          </button>
        </div>
      `;
    }

    if (typeof modal === 'function') {
      modal(`
        <div class="tongkim-modal-wrap">
          <div class="tongkim-modal-header">
            <span class="tk-flag-icon">⚔️</span>
            <div>
              <h3 style="color:#ffd700;font-size:14px;margin:0;">CHIẾN TRƯỜNG TỐNG KIM (HOÀNG SA LÂM)</h3>
              <span style="color:#a39276;font-size:11px;">Lịch: Mỗi giờ 1 trận (Báo danh 5p -> Doanh đợi 3p -> Đánh 20p)</span>
            </div>
          </div>

          ${statusBadge}

          <p style="font-size:12px;color:#f5ede0;line-height:1.6;margin:10px 0;">
            "Giang sơn phân tranh, hai bờ sông Hoàng Hà khói lửa ngập trời! Hiệp khách tham chiến lập chiến công, quy đổi Chiến Mã & Quân Công Bài!"
          </p>

          ${actionButtons}
        </div>
      `);
    }
  },

  // 2. Vào chiến trường
  join(camp) {
    this.inBattle = true;
    this.camp = (camp === 'auto' || !camp) ? (Math.random() < 0.5 ? 'song' : 'jin') : camp;
    if (MP && MP.connected && MP.ws) {
      MP.ws.send(JSON.stringify({
        type: 'tongkim_join',
        camp: this.camp
      }));
      if (typeof uiSfx === 'function') uiSfx('quest');
    }
    // Lập tức dịch chuyển vào Map 386 (Chiến Trường Tống Kim Chu Tiên Trấn / Giới Kiều)
    if (typeof travelToZone === 'function') travelToZone(386);
    if (typeof H !== 'undefined') {
      if (this.camp === 'song') {
        H.x = 950; H.y = 950;
      } else {
        H.x = 2600; H.y = 2600;
      }
    }
    if (typeof toast === 'function') toast(`⚔️ Đã tham chiến Tống Kim! Phe: ${this.camp === 'song' ? 'Tống (Cờ Xanh)' : 'Kim (Cờ Đỏ)'}`);
    this.updateHud();
  },

  // 3. Rời chiến trường
  leave() {
    if (typeof modal === 'function') {
      modal(`
        <div style="padding:14px;text-align:center;">
          <h4 style="color:#ffd700;font-size:13px;margin-bottom:8px;">⚔️ RỜI CHIẾN TRƯỜNG</h4>
          <p style="font-size:12px;color:#f5ede0;margin-bottom:12px;">
            Ngươi có chắc muốn rời khỏi Chiến Trường Tống Kim để trở về Biện Kinh?
          </p>
          <div style="display:flex;gap:8px;justify-content:center;">
            <button class="jx-action-btn gold" onclick="TONGKIM.doLeave(); closeModal();">Xác Nhận Rời</button>
            <button class="jx-action-btn" onclick="closeModal();">Ở Lại</button>
          </div>
        </div>
      `);
    }
  },

  doLeave() {
    this.inBattle = false;
    this.updateHud();
    if (MP && MP.connected && MP.ws) {
      MP.ws.send(JSON.stringify({ type: 'tongkim_leave' }));
    }
    if (typeof travelToTown === 'function') {
      travelToTown(0); // Trở về Biện Kinh
    } else if (typeof travelToZone === 'function') {
      travelToZone(0);
    }
  },

  // 4. Đồng bộ dữ liệu Tống Kim từ Server
  onSync(msg) {
    const wasInBattle = this.inBattle;
    this.inBattle = !!msg.inBattle;
    if (msg.phase !== undefined) this.phase = msg.phase;
    if (msg.phaseName !== undefined) this.phaseName = msg.phaseName;
    if (msg.camp !== undefined) this.camp = msg.camp;
    if (msg.timeLeft !== undefined) this.timeLeft = msg.timeLeft;
    if (msg.songScore !== undefined) this.songScore = msg.songScore;
    if (msg.jinScore !== undefined) this.jinScore = msg.jinScore;
    if (msg.myScore !== undefined) this.myScore = msg.myScore;
    if (msg.myKills !== undefined) this.myKills = msg.myKills;
    if (msg.myCombo !== undefined) this.myCombo = msg.myCombo;
    if (msg.quanco !== undefined) this.quanco = msg.quanco;
    if (msg.ladder) this.ladder = msg.ladder;

    // Tự động chuyển map 386 khi server báo đã vào trận
    if (this.inBattle) {
      const curZ = (typeof S !== 'undefined' && S) ? S.chosenZone : 0;
      if (curZ !== 386 && typeof travelToZone === 'function') {
        travelToZone(386);
        if (typeof H !== 'undefined') {
          if (this.camp === 'song') { H.x = 950; H.y = 950; }
          else { H.x = 2600; H.y = 2600; }
        }
      }
    } else if (wasInBattle && !this.inBattle) {
      // Hết trận, trở về Biện Kinh
      if (typeof travelToTown === 'function') travelToTown(0);
    }

    this.updateHud();

    // Cập nhật lại Bảng Báo Cáo Nhanh nếu đang mở
    const rep = document.getElementById('tongkimReportModal');
    if (rep) this.renderReportContent(rep);
  },

  // 5. Cập nhật HUD chiến trường thời gian thực trên màn hình
  updateHud() {
    let hud = document.getElementById('tongkimHud');
    // Chỉ hiện HUD khi đang ở trong trận chiến hoặc đang ở map 386
    const curZ = (typeof getCurZoneId === 'function') ? getCurZoneId() : (window.S ? window.S.stage : 0);
    const inMap386 = (curZ === 386);

    if (!this.inBattle && !inMap386) {
      if (hud) hud.remove();
      return;
    }

    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'tongkimHud';
      hud.className = 'tongkim-hud';
      const battleEl = document.getElementById('battle') || document.body;
      battleEl.appendChild(hud);
    }

    const mins = Math.floor(this.timeLeft / 60);
    const secs = this.timeLeft % 60;
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    const myCampName = this.camp === 'song' ? 'TỐNG' : this.camp === 'jin' ? 'KIM' : 'TỰ DO';
    const myCampClass = this.camp === 'song' ? 'song' : 'jin';
    const phaseLabel = this.phase === 'register' ? 'Báo Danh' :
                       this.phase === 'staging' ? 'Đại Doanh Đợi' :
                       this.phase === 'battle' ? 'Giao Tranh' :
                       this.phase === 'ended' ? 'Tổng Kết' : 'Chờ Trận Kế';

    hud.innerHTML = `
      <div class="tk-hud-content">
        <!-- Tỷ Số 2 Phe & Giai Đoạn -->
        <div class="tk-score-board">
          <div class="tk-team-score song">
            <span class="tk-flag">🚩</span>
            <span class="tk-name">TỐNG</span>
            <b class="tk-pts">${fmt(this.songScore)}</b>
          </div>
          <div class="tk-time-box" title="Giai đoạn: ${phaseLabel}">
            <span style="font-size:10px;color:#fde047;display:block;line-height:1;">[${phaseLabel}]</span>
            ⏱️ <span>${timeStr}</span>
          </div>
          <div class="tk-team-score jin">
            <b class="tk-pts">${fmt(this.jinScore)}</b>
            <span class="tk-name">KIM</span>
            <span class="tk-flag">🚩</span>
          </div>
        </div>

        <!-- Thông Tin Cá Nhân -->
        <div class="tk-personal-stats">
          <span class="tk-my-camp ${myCampClass}">Phe ${myCampName}</span>
          <span>Điểm: <b style="color:#ffd700;">${fmt(this.myScore)}</b></span>
          <span>Hạ: <b style="color:#4ade80;">${this.myKills}</b></span>
          ${this.myCombo >= 3 ? `<span class="tk-combo-badge">🔥 Liên Trảm x${this.myCombo}</span>` : ''}
          <button class="tk-hud-btn" onclick="TONGKIM.toggleReport()" title="Xem Bảng Báo Cáo Nhanh (Fast Report)">📊 BXH</button>
          <button class="tk-hud-btn leave" onclick="TONGKIM.leave()" title="Rời Chiến Trường">🚪 Rời</button>
        </div>
      </div>
    `;
  },

  openFastReport() {
    this.toggleReport();
  },

  // 6. Bảng Báo Cáo Nhanh Tống Kim (ËÎ½ð¿ì±¨ / Song-Jin Fast Report)
  toggleReport() {
    let rep = document.getElementById('tongkimReportModal');
    if (rep) {
      rep.remove();
      return;
    }

    rep = document.createElement('div');
    rep.id = 'tongkimReportModal';
    rep.className = 'tongkim-report-modal';
    document.body.appendChild(rep);
    this.renderReportContent(rep);
  },

  renderReportContent(rep) {
    const list = this.ladder || [];
    let rowsHtml = '';
    for (let i = 0; i < Math.max(10, list.length); i++) {
      const p = list[i];
      if (p) {
        const campClass = p.camp === 'song' ? 'song' : 'jin';
        const rankColor = i === 0 ? '#ffd700' : i === 1 ? '#e2e8f0' : i === 2 ? '#b45309' : '#a39276';
        rowsHtml += `
          <tr class="${p.isMe ? 'is-me' : ''}">
            <td style="color:${rankColor};font-weight:700;text-align:center;">#${i + 1}</td>
            <td style="color:#f5ede0;font-weight:600;">${esc(p.name)}</td>
            <td class="tk-camp-cell ${campClass}">${p.camp === 'song' ? 'Tống' : 'Kim'}</td>
            <td style="text-align:center;color:#4ade80;">${p.kills || 0}</td>
            <td style="text-align:right;color:#fbbf24;font-weight:700;">${fmt(p.score || 0)}</td>
          </tr>
        `;
      } else {
        rowsHtml += `
          <tr class="empty-row">
            <td style="text-align:center;color:#555;">#${i + 1}</td>
            <td style="color:#666;">-- Trống --</td>
            <td style="color:#666;">--</td>
            <td style="text-align:center;color:#666;">0</td>
            <td style="text-align:right;color:#666;">0</td>
          </tr>
        `;
      }
    }

    rep.innerHTML = `
      <div class="tk-report-box">
        <div class="tk-report-header">
          <span style="font-weight:700;color:#ffd700;font-size:13px;">📊 BÁO CÁO NHANH TỐNG KIM (TOP 10)</span>
          <button class="trade-close-btn" onclick="TONGKIM.toggleReport()">✕</button>
        </div>

        <div class="tk-report-summary">
          <div style="color:#60a5fa;">TỔNG ĐIỂM TỐNG: <b>${fmt(this.songScore)}</b></div>
          <div style="color:#f87171;">TỔNG ĐIỂM KIM: <b>${fmt(this.jinScore)}</b></div>
          <div style="color:#fbbf24;">QUÂN CÔNG TÍCH LŨY: <b>${fmt(this.quanco)}</b></div>
        </div>

        <table class="tk-report-table">
          <thead>
            <tr>
              <th style="width:40px;text-align:center;">Hạng</th>
              <th>Hiệp Khách</th>
              <th style="width:60px;text-align:center;">Phe</th>
              <th style="width:60px;text-align:center;">Hạ Gục</th>
              <th style="width:80px;text-align:right;">Chiến Công</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div style="padding:8px;text-align:center;border-top:1px solid #3d2f1d;">
          <button class="jx-action-btn gold" onclick="TONGKIM.toggleReport()">Đóng Bảng Điểm</button>
        </div>
      </div>
    `;
  },

  // 7. Cửa Hàng Quân Nhu Tống Kim
  openShopModal() {
    if (typeof modal === 'function') {
      modal(`
        <div class="tongkim-shop-wrap">
          <div class="tongkim-modal-header">
            <span class="tk-flag-icon">🎖️</span>
            <div>
              <h3 style="color:#ffd700;font-size:14px;margin:0;">QUÂN NHU TỐNG KIM</h3>
              <span style="color:#4ade80;font-size:11px;">Điểm Quân Công của bạn: <b>${fmt(this.quanco)}</b></span>
            </div>
          </div>

          <div class="tk-shop-grid">
            <div class="tk-shop-item">
              <span class="tk-shop-icon">🐎</span>
              <div class="tk-shop-info">
                <b style="color:#ffd700;">Chiến Mã Tống Kim (Cấp 80)</b>
                <p>Tốc độ di chuyển +50%, Né tránh +150, Kháng ngũ hành +15%</p>
                <div class="tk-price">1.000 Quân Công</div>
              </div>
              <button class="jx-action-btn gold" onclick="TONGKIM.buy('mount')">Đổi</button>
            </div>

            <div class="tk-shop-item">
              <span class="tk-shop-icon">📜</span>
              <div class="tk-shop-info">
                <b style="color:#60a5fa;">Quân Công Bài (1 Giờ)</b>
                <p>Tăng gấp đôi điểm chiến trường và +20% EXP nhận được</p>
                <div class="tk-price">250 Quân Công</div>
              </div>
              <button class="jx-action-btn gold" onclick="TONGKIM.buy('card')">Đổi</button>
            </div>

            <div class="tk-shop-item">
              <span class="tk-shop-icon">🎁</span>
              <div class="tk-shop-info">
                <b style="color:#c084fc;">Rương Trang Bị Tống Kim</b>
                <p>Mở ra ngẫu nhiên Huyền Tinh cấp 4-6, Lam/Tử Thủy Tinh, Định Quốc</p>
                <div class="tk-price">300 Quân Công</div>
              </div>
              <button class="jx-action-btn gold" onclick="TONGKIM.buy('box')">Đổi</button>
            </div>

            <div class="tk-shop-item">
              <span class="tk-shop-icon">💊</span>
              <div class="tk-shop-info">
                <b style="color:#fbbf24;">Đại Lực Hoàn Tống Kim</b>
                <p>Tăng 100 điểm lực tay và sinh lực tối đa trong 30 phút</p>
                <div class="tk-price">100 Quân Công</div>
              </div>
              <button class="jx-action-btn gold" onclick="TONGKIM.buy('potion')">Đổi</button>
            </div>
          </div>

          <div style="padding:10px;text-align:right;border-top:1px solid #3d2f1d;">
            <button class="jx-action-btn" onclick="closeModal()">Đóng</button>
          </div>
        </div>
      `);
    }
  },

  buy(itemId) {
    if (MP && MP.connected && MP.ws) {
      MP.ws.send(JSON.stringify({
        type: 'tongkim_buy',
        itemId: itemId
      }));
    }
  }
};

if (typeof window !== 'undefined') {
  window.TONGKIM = TONGKIM;
}
