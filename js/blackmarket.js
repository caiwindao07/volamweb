/* ==========================================================================
   VÕ LÂM TRUYỀN KỲ - CHỢ ĐEN / HẮC THỊ (BLACK MARKET / KỲ TRÂN CÁC)
   - Port từ module Choden_Temp_Port & UiShopOnline trong H:\JxPhaThien
   - Bán các kỳ trân dị bảo giá hời, làm mới theo khung giờ
   - Mua bằng Vàng và Kim Nguyên Bảo (KNB)
   ========================================================================== */

(function(window) {
  'use strict';

  const BLACK_MARKET_ITEMS = [
    { id: 1, name: 'Huyền Tinh Cấp 6', desc: 'Dùng để nâng cấp trang bị lên +12', priceGold: 2400000, priceKnb: 10, limit: 3, icon: '💎' },
    { id: 2, name: 'Huyền Tinh Cấp 7', desc: 'Dùng để nâng cấp trang bị lên +14', priceGold: 5400000, priceKnb: 25, limit: 2, icon: '💠' },
    { id: 3, name: 'Lam Thủy Tinh', desc: 'Khắc phục dòng thuộc tính ẩn trang bị', priceGold: 1800000, priceKnb: 8, limit: 5, icon: '🔷' },
    { id: 4, name: 'Tử Thủy Tinh', desc: 'Tinh luyện trang bị Hoàng Kim', priceGold: 2700000, priceKnb: 12, limit: 3, icon: '🔮' },
    { id: 5, name: 'Tẩy Tủy Đan', desc: 'Tẩy toàn bộ điểm tiềm năng để cộng lại', priceGold: 1500000, priceKnb: 5, limit: 2, icon: '💊' },
    { id: 6, name: 'Võ Lâm Mật Tịch', desc: 'Đọc xong vĩnh viễn nhận +1 Điểm Kỹ Năng', priceGold: 7500000, priceKnb: 35, limit: 1, icon: '📜' },
    { id: 7, name: 'Tẩy Tủy Kinh', desc: 'Đọc xong vĩnh viễn nhận +5 Điểm Tiềm Năng', priceGold: 9000000, priceKnb: 40, limit: 1, icon: '📕' },
    { id: 8, name: 'Bách Niên Linh Chi', desc: 'Quà tặng quý hiếm cho Bạn Đồng Hành (+50 Thân Mật, +500 EXP)', priceGold: 1200000, priceKnb: 5, limit: 10, icon: '🍄' },
    { id: 9, name: 'Chiếu Dạ Ngọc Sư Tử', desc: 'Thần mã cực phẩm tăng 40% Tốc chạy và 1000 Sinh lực', priceGold: 15000000, priceKnb: 60, limit: 1, icon: '🐎' }
  ];

  const BLACK_MARKET = {
    init() {
      if (!window.S) return;
      if (!S.blackMarket) {
        S.blackMarket = { bought: {}, refreshCount: 0 };
      }
      console.log('[BlackMarket] Đã khởi tạo Chợ Đen Hắc Thị.');
    },

    toggleWindow() {
      let win = document.getElementById('fw-blackmarket');
      if (!win) {
        win = document.createElement('div');
        win.id = 'fw-blackmarket';
        win.className = 'jx-float-win';
        win.style.cssText = 'width: 520px; z-index: 1000;';
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

    // Mua vật phẩm
    buyItem(itemId, useKnb = false) {
      const it = BLACK_MARKET_ITEMS.find(x => x.id === itemId);
      if (!it) return;

      if (!S.blackMarket) S.blackMarket = { bought: {}, refreshCount: 0 };
      const boughtCount = S.blackMarket.bought[itemId] || 0;
      if (boughtCount >= it.limit) {
        if (typeof toast === 'function') toast('❌ Đã đạt giới hạn mua hôm nay!');
        return;
      }

      if (useKnb) {
        const cost = it.priceKnb;
        if ((S.knb || 0) < cost) {
          if (typeof toast === 'function') toast(`❌ Không đủ ${cost} KNB!`);
          return;
        }
        S.knb -= cost;
      } else {
        const cost = it.priceGold;
        if ((S.gold || 0) < cost) {
          if (typeof toast === 'function') toast(`❌ Không đủ ${cost.toLocaleString()} Vàng!`);
          return;
        }
        S.gold -= cost;
      }

      S.blackMarket.bought[itemId] = boughtCount + 1;

      // Xử lý hiệu ứng vật phẩm
      if (it.id === 5) { // Tẩy Tủy Đan
        if (typeof S.statPts !== 'undefined') {
          S.statPts += (S.str - 20) + (S.dex - 20) + (S.vit - 20) + (S.eng - 20);
          S.str = 20; S.dex = 20; S.vit = 20; S.eng = 20;
        }
      } else if (it.id === 6) { // Võ Lâm Mật Tịch
        S.skPts = (S.skPts || 0) + 1;
      } else if (it.id === 7) { // Tẩy Tủy Kinh
        S.statPts = (S.statPts || 0) + 5;
      } else if (it.id === 8) { // Bách Niên Linh Chi
        if (S.companion && S.companion.activeId && S.companion.list[S.companion.activeId]) {
          const pet = S.companion.list[S.companion.activeId];
          pet.intimacy = Math.min(100, pet.intimacy + 30);
          pet.exp += 300;
        }
      }

      if (typeof toast === 'function') toast(`🛒 Mua thành công [${it.name}]!`);
      if (typeof uiSfx === 'function') uiSfx('buy');
      if (typeof save === 'function') save();
      if (typeof recalcStats === 'function') recalcStats();
      this.renderWindow();
    },

    // Làm mới hàng Chợ Đen
    refreshShop() {
      const cost = 600000;
      if ((S.gold || 0) < cost) {
        if (typeof toast === 'function') toast('❌ Cần 600,000 Vàng để làm mới Chợ Đen!');
        return;
      }
      S.gold -= cost;
      if (!S.blackMarket) S.blackMarket = { bought: {}, refreshCount: 0 };
      S.blackMarket.bought = {};
      S.blackMarket.refreshCount++;

      if (typeof toast === 'function') toast('🔄 Làm mới Chợ Đen thành công!');
      if (typeof uiSfx === 'function') uiSfx('upgrade');
      if (typeof save === 'function') save();
      this.renderWindow();
    },

    renderWindow() {
      const win = document.getElementById('fw-blackmarket');
      if (!win) return;

      const bought = (S.blackMarket && S.blackMarket.bought) ? S.blackMarket.bought : {};

      let listHtml = BLACK_MARKET_ITEMS.map(it => {
        const count = bought[it.id] || 0;
        const outOfStock = count >= it.limit;
        return `
          <div style="background:#1e1610;border:1px solid ${outOfStock ? '#332215' : '#5a4425'};border-radius:4px;padding:8px 10px;display:flex;justify-content:space-between;align-items:center;opacity:${outOfStock ? '0.6' : '1'};">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:24px;">${it.icon}</span>
              <div>
                <b style="color:${outOfStock ? '#888' : '#ffd700'};font-size:13px;">${it.name}</b>
                <div style="font-size:11px;color:#aaa;margin-top:2px;">${it.desc}</div>
                <div style="font-size:10px;color:#ff9999;margin-top:2px;">Còn lại: ${it.limit - count} / ${it.limit}</div>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;">
              <button onclick="BLACK_MARKET.buyItem(${it.id}, false)" ${outOfStock ? 'disabled' : ''} 
                style="background:#3c2d1c;border:1px solid #7d5e2a;color:#ffd700;font-size:11px;padding:3px 8px;border-radius:3px;cursor:${outOfStock ? 'default' : 'pointer'};">
                💰 ${it.priceGold.toLocaleString()} Vàng
              </button>
              <button onclick="BLACK_MARKET.buyItem(${it.id}, true)" ${outOfStock ? 'disabled' : ''} 
                style="background:#203b20;border:1px solid #4ade80;color:#a0ffa0;font-size:11px;padding:3px 8px;border-radius:3px;cursor:${outOfStock ? 'default' : 'pointer'};">
                💎 ${it.priceKnb} KNB
              </button>
            </div>
          </div>
        `;
      }).join('');

      let html = `
        <div class="jx-window-header" style="background:#2b1f13;border-bottom:2px solid #7d5e2a;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;">
          <b style="color:#ffd700;font-size:14px;">🏪 CHỢ ĐEN / HẮC THỊ (KỲ TRÂN CÁC)</b>
          <button onclick="document.getElementById('fw-blackmarket').classList.add('hidden')" style="background:none;border:none;color:#ff9999;font-size:16px;cursor:pointer;">✕</button>
        </div>

        <div style="padding:12px;background:#15100c;color:#d8cbb8;font-family:sans-serif;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <span style="font-size:12px;color:#aaa;">Vật phẩm quý hiếm giới hạn mỗi ngày</span>
            <button onclick="BLACK_MARKET.refreshShop()" style="background:#4a3820;border:1px solid #b89040;color:#ffd700;font-size:11px;padding:4px 8px;border-radius:3px;cursor:pointer;">
              🔄 Làm Mới (60 Vạn)
            </button>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;max-height:340px;overflow-y:auto;">
            ${listHtml}
          </div>
        </div>
      `;

      win.innerHTML = html;
      win.classList.remove('hidden');
    }
  };

  window.BLACK_MARKET = BLACK_MARKET;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => BLACK_MARKET.init());
  } else {
    BLACK_MARKET.init();
  }

})(window);
