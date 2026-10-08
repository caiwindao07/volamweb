/* ==========================================================================
   VÕ LÂM TRUYỀN KỲ - HOẠT ĐỘNG GIỜ VÀNG & BOSS HOÀNG KIM (ACTIVITY SYSTEM)
   - Port từ module HoatDong_Temp_Port trong H:\JxPhaThien
   - 1. Boss Hoàng Kim Thế Giới Theo Giờ (Lịch 12h30, 19h30, 21h30, 23h00)
   - 2. Phong Lăng Độ (PLD) - Đi thuyền đánh Thủy Tặc Đầu Lĩnh nhặt Thủy Tinh
   - 3. Vận Tiêu Liên Thành (Escort Cargo) - Áp tải Tiêu Xa chống cướp tiêu
   ========================================================================== */

(function(window) {
  'use strict';

  // Lịch Boss Hoàng Kim
  const GOLDEN_BOSSES = [
    { id: 1, name: 'Cổ Lăng Thần Điền', series: 'Kim', lvl: 95, hp: 850000, map: 'Cổ Lăng', bossTid: 141, time: '12:30 & 21:30', drop: 'Vũ Khí HKMP, Rương Hoàng Kim, HT cấp 7' },
    { id: 2, name: 'Lam Y Y', series: 'Thủy', lvl: 95, hp: 920000, map: 'Dược Vương Cốc', bossTid: 717, time: '19:30 & 23:00', drop: 'Định Quốc, An Bang, HT cấp 8' },
    { id: 3, name: 'Mạnh Thương Lương', series: 'Hỏa', lvl: 95, hp: 880000, map: 'Biện Kinh Bắc', bossTid: 720, time: '12:30 & 21:30', drop: 'Đao HKMP, Nhẫn An Bang, Lam Thủy Tinh' },
    { id: 4, name: 'Huyền Giác Đại Sư', series: 'Thổ', lvl: 95, hp: 990000, map: 'Tần Lăng Tầng 3', bossTid: 858, time: '19:30 & 23:00', drop: 'Trượng HKMP, Dây Chuyền Định Quốc, Tử Thủy Tinh' },
    { id: 5, name: 'Đường Phi Yến', series: 'Mộc', lvl: 95, hp: 860000, map: 'Kiếm Các', bossTid: 855, time: '12:30 & 21:30', drop: 'Ám Khí HKMP, Ngọc Bội An Bang, Lục Thủy Tinh' }
  ];

  const ACTIVITY_SYSTEM = {
    curTab: 'boss', // 'boss' | 'pld' | 'vantieu'

    init() {
      const actBtn = document.getElementById('actBtn');
      if (actBtn) {
        actBtn.onclick = () => this.toggleWindow();
      }
      console.log('[Activity] Đã kích hoạt Hệ Thống Hoạt Động & Boss Hoàng Kim.');
    },

    toggleWindow() {
      let win = document.getElementById('fw-activity');
      if (!win) {
        win = document.createElement('div');
        win.id = 'fw-activity';
        win.className = 'jx-float-win';
        win.style.cssText = 'width: 540px; z-index: 1000;';
        const container = document.querySelector('.jx-float-windows-layer') || document.body;
        container.appendChild(win);
      }
      if (win.classList.contains('hidden')) {
        this.renderWindow();
        win.classList.remove('hidden');
      } else {
        win.classList.add('hidden');
      }
    },

    setTab(tab) {
      this.curTab = tab;
      this.renderWindow();
    },

    // Khiêu chiến Boss Hoàng Kim Thế Giới
    challengeGoldenBoss(bossId) {
      const b = GOLDEN_BOSSES.find(x => x.id === bossId);
      if (!b) return;

      if (typeof R === 'undefined' || typeof makeEnemy !== 'function') return;

      // Sinh Boss Hoàng Kim trên bản đồ
      const L = stageLevel ? stageLevel(S.stage) : 90;
      const bp = (typeof inWorld === 'function') ? inWorld(H.x + 180, H.y) : [H.x + 180, H.y];
      const boss = makeEnemy(b.bossTid, L + 5, 'boss', bp[0], bp[1]);
      boss.n = `[Đại Hoàng Kim] ${b.name}`;
      boss.goldBoss = true;
      boss.hp = Math.round(boss.max * 3.5);
      boss.max = boss.hp;

      R.enemies.unshift(boss);

      if (typeof toast === 'function') toast(`⚔️ ĐẠI BOSS HOÀNG KIM [${b.name}] ĐÃ XUẤT HIỆN!`);
      if (typeof log === 'function') log(`<b style="color:#ffd700;font-size:14px;">⚔️ ĐẠI BOSS HOÀNG KIM [${b.name}] ĐÃ XUẤT THẾ! Hào kiệt toàn cõi giang hồ hãy nhanh chóng ứng chiến!</b>`);
      if (typeof uiSfx === 'function') uiSfx('levelup');

      // Đóng cửa sổ hoạt động
      const win = document.getElementById('fw-activity');
      if (win) win.classList.add('hidden');
    },

    // Bắt đầu chuyến đi thuyền Phong Lăng Độ (PLD)
    startPLD() {
      if (typeof boatStart === 'function') {
        const win = document.getElementById('fw-activity');
        if (win) win.classList.add('hidden');
        boatStart();
        return;
      }
      if ((S.gold || 0) < 400000) {
        if (typeof toast === 'function') toast('❌ Cần 400,000 Vàng tiền đò qua bến Phong Lăng Độ!');
        return;
      }
      S.gold -= 400000;

      if (typeof toast === 'function') toast('🚢 Bạn đã lên thuyền Phong Lăng Độ sang bờ Bắc! Thủy tặc đang kéo tới!');
      if (typeof log === 'function') log('<b style="color:#38bdf8;">🚢 Thuyền Phong Lăng Độ rẽ sóng ra giữa dòng! Cảnh giới Thủy Tặc Đầu Lĩnh tập kích!</b>');

      // Sinh bầy thủy tặc vây quanh
      const L = stageLevel ? stageLevel(S.stage) : 50;
      R.enemies = [];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const ex = H.x + Math.cos(a) * 220;
        const ey = H.y + Math.sin(a) * 220;
        const m = makeEnemy(163, L, 'elite', ex, ey);
        m.n = 'Thủy Tặc Lãng Khách';
        R.enemies.push(m);
      }

      // Thủy Tặc Đầu Lĩnh
      const boss = makeEnemy(142, L + 2, 'boss', H.x + 200, H.y + 60);
      boss.n = 'Thủy Tặc Đầu Lĩnh';
      boss.onDieReward = () => {
        if (typeof toast === 'function') toast('🎉 Tiêu diệt Thủy Tặc Đầu Lĩnh! Nhận Thủy Tinh quý giá!');
        if (typeof dropItem === 'function') {
          // Rơi Lam Thủy Tinh, Tử Thủy Tinh
          log('<b style="color:#a0ffa0;">💎 Thủy Tặc Đầu Lĩnh đánh rơi Lam Thủy Tinh và Tử Thủy Tinh!</b>');
        }
      };
      R.enemies.push(boss);

      const win = document.getElementById('fw-activity');
      if (win) win.classList.add('hidden');
    },

    // Bắt đầu Vận Tiêu Liên Thành
    startEscort() {
      if ((S.gold || 0) < 600000) {
        if (typeof toast === 'function') toast('❌ Cần 600,000 Vàng tiền thế chấp nhận Tiêu Xa Long Môn!');
        return;
      }
      S.gold -= 600000;

      if (typeof toast === 'function') toast('🚩 Nhận Tiêu Xa Long Môn! Áp tải vượt qua các đợt cướp tiêu!');
      if (typeof log === 'function') log('<b style="color:#ffd700;">🚩 Tiêu Cục Long Môn: Khởi hành vận tiêu từ Biện Kinh! Hãy bảo vệ tiêu xa an toàn!</b>');

      // Sinh tiêu xa và các toán sơn tặc chặn đường
      const L = stageLevel ? stageLevel(S.stage) : 50;
      R.enemies = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const m = makeEnemy(153, L, 'elite', H.x + Math.cos(a) * 200, H.y + Math.sin(a) * 200);
        m.n = 'Sơn Tặc Cướp Tiêu';
        R.enemies.push(m);
      }

      // Thưởng khi hoàn thành tiêu diệt hết sơn tặc
      setTimeout(() => {
        const rewardGold = 2000000;
        const rewardExp = 5000000;
        S.gold += rewardGold;
        if (typeof addExp === 'function') addExp(rewardExp);
        if (typeof toast === 'function') toast(`🎉 Vận tiêu đại thành công! +${rewardGold.toLocaleString()} Vàng, +${rewardExp.toLocaleString()} EXP!`);
        if (typeof log === 'function') log(`<b style="color:#4ade80;">🎉 Vận Tiêu Hoàn Thành: Giao tiêu xa an toàn tại nha môn Tương Dương! +${rewardGold.toLocaleString()} Vàng, +${rewardExp.toLocaleString()} EXP!</b>`);
        if (typeof uiSfx === 'function') uiSfx('levelup');
      }, 12000);

      const win = document.getElementById('fw-activity');
      if (win) win.classList.add('hidden');
    },

    renderWindow() {
      const win = document.getElementById('fw-activity');
      if (!win) return;

      let bodyHtml = '';

      if (this.curTab === 'boss') {
        bodyHtml = `
          <div style="font-size:12px;color:#aaa;margin-bottom:10px;">
            Boss Hoàng Kim xuất hiện theo khung giờ vàng. Đánh Boss rơi Vũ khí Hoàng Kim Môn Phái, Bộ Định Quốc, An Bang và Huyền Tinh cực phẩm!
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;max-height:300px;overflow-y:auto;">
            ${GOLDEN_BOSSES.map(b => `
              <div style="background:#1e1610;border:1px solid #5a4425;border-radius:4px;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <div style="display:flex;align-items:center;gap:6px;">
                    <b style="color:#ffd700;font-size:13px;">${b.name}</b>
                    <span style="background:#7d5e2a;color:#fff;font-size:10px;padding:1px 5px;border-radius:2px;">Hệ ${b.series}</span>
                    <span style="color:#ff6666;font-size:11px;">Cấp ${b.lvl}</span>
                  </div>
                  <div style="font-size:11px;color:#888;margin-top:3px;">
                    Xuất hiện: <span style="color:#a0ffa0;">${b.time}</span> tại <span style="color:#66ccff;">${b.map}</span>
                  </div>
                  <div style="font-size:11px;color:#ffcc66;margin-top:2px;">
                    Vật phẩm: ${b.drop}
                  </div>
                </div>
                <button onclick="ACTIVITY_SYSTEM.challengeGoldenBoss(${b.id})" 
                  style="background:#8b2500;border:1px solid #ff6666;color:#fff;padding:6px 12px;border-radius:4px;font-weight:bold;font-size:12px;cursor:pointer;">
                  Khiêu Chiến
                </button>
              </div>
            `).join('')}
          </div>
        `;
      } else if (this.curTab === 'pld') {
        bodyHtml = `
          <div style="background:#1e1610;border:1px solid #5a4425;border-radius:6px;padding:14px;text-align:center;">
            <b style="color:#38bdf8;font-size:15px;display:block;margin-bottom:8px;">🚢 VƯỢT BẾN PHONG LĂNG ĐỘ (SĂN THỦY TẶC)</b>
            <p style="font-size:12px;color:#ccc;line-height:1.6;margin-bottom:14px;">
              Lên thuyền tại Bến Phong Lăng Độ sang bờ Bắc Trường Giang. Trên sông sẽ gặp phải các toán Thủy Tặc Lãng Khách và Thủy Tặc Đầu Lĩnh phục kích.<br>
              <span style="color:#ffd700;">Phần thưởng:</span> Lam Thủy Tinh, Tử Thủy Tinh, Lục Thủy Tinh (nguyên liệu hợp thành và tinh luyện trang bị).
            </p>
            <div style="font-size:12px;color:#aaa;margin-bottom:14px;">Phí đò qua sông: <b style="color:#ffd700;">400,000 Vàng</b></div>
            <button onclick="ACTIVITY_SYSTEM.startPLD()" 
              style="background:#205081;border:1px solid #4a90e2;color:#fff;padding:8px 24px;border-radius:4px;font-weight:bold;font-size:13px;cursor:pointer;">
              Lên Thuyền Khởi Hành
            </button>
          </div>
        `;
      } else if (this.curTab === 'vantieu') {
        bodyHtml = `
          <div style="background:#1e1610;border:1px solid #5a4425;border-radius:6px;padding:14px;text-align:center;">
            <b style="color:#ffd700;font-size:15px;display:block;margin-bottom:8px;">🚩 VẬN TIÊU LIÊN THÀNH (TIÊU CỤC LONG MÔN)</b>
            <p style="font-size:12px;color:#ccc;line-height:1.6;margin-bottom:14px;">
              Nhận Tiêu Xa từ Xa Phu Biện Kinh áp tải về Tương Dương. Trên đường thiên lý sẽ liên tục bị các toán Sơn Tặc Cướp Tiêu bao vây phục kích.<br>
              <span style="color:#ffd700;">Phần thưởng hoàn thành:</span> <b style="color:#4ade80;">2,000,000 Vàng + 5,000,000 EXP</b> cùng Rương Tiêu Xa.
            </p>
            <div style="font-size:12px;color:#aaa;margin-bottom:14px;">Tiền bảo lãnh tiêu xa: <b style="color:#ffd700;">600,000 Vàng</b></div>
            <button onclick="ACTIVITY_SYSTEM.startEscort()" 
              style="background:#7d5e2a;border:1px solid #ffd700;color:#fff;padding:8px 24px;border-radius:4px;font-weight:bold;font-size:13px;cursor:pointer;">
              Nhận Tiêu Xa Vận Tiêu
            </button>
          </div>
        `;
      }

      let html = `
        <div class="jx-window-header" style="background:#2b1f13;border-bottom:2px solid #7d5e2a;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;">
          <b style="color:#ffd700;font-size:14px;">⚔️ HOẠT ĐỘNG GIANG HỒ & PHÓ BẢN</b>
          <button onclick="document.getElementById('fw-activity').classList.add('hidden')" style="background:none;border:none;color:#ff9999;font-size:16px;cursor:pointer;">✕</button>
        </div>

        <div style="padding:12px;background:#15100c;color:#d8cbb8;font-family:sans-serif;">
          <!-- Tabs Hoạt Động -->
          <div style="display:flex;gap:6px;border-bottom:1px solid #4a3820;padding-bottom:8px;margin-bottom:12px;">
            <button onclick="ACTIVITY_SYSTEM.setTab('boss')" style="background:${this.curTab === 'boss' ? '#4a3820' : '#221810'};border:1px solid ${this.curTab === 'boss' ? '#ffd700' : '#5a4425'};color:${this.curTab === 'boss' ? '#ffd700' : '#aaa'};padding:6px 12px;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;">
              👑 Boss Hoàng Kim
            </button>
            <button onclick="ACTIVITY_SYSTEM.setTab('pld')" style="background:${this.curTab === 'pld' ? '#4a3820' : '#221810'};border:1px solid ${this.curTab === 'pld' ? '#ffd700' : '#5a4425'};color:${this.curTab === 'pld' ? '#ffd700' : '#aaa'};padding:6px 12px;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;">
              🚢 Phong Lăng Độ
            </button>
            <button onclick="ACTIVITY_SYSTEM.setTab('vantieu')" style="background:${this.curTab === 'vantieu' ? '#4a3820' : '#221810'};border:1px solid ${this.curTab === 'vantieu' ? '#ffd700' : '#5a4425'};color:${this.curTab === 'vantieu' ? '#ffd700' : '#aaa'};padding:6px 12px;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;">
              🚩 Vận Tiêu Liên Thành
            </button>
          </div>

          ${bodyHtml}
        </div>
      `;

      win.innerHTML = html;
      win.classList.remove('hidden');
    }
  };

  window.ACTIVITY_SYSTEM = ACTIVITY_SYSTEM;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ACTIVITY_SYSTEM.init());
  } else {
    ACTIVITY_SYSTEM.init();
  }

})(window);
