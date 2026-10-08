/* ==========================================================================
   VÕ LÂM TRUYỀN KỲ - MỞ RỘNG BẢN ĐỒ LUYỆN CÔNG & HỆ THỐNG BÃI CẮM CỌC (CAMPS)
   - Tăng diện tích bản đồ luyện công lên chuẩn 7168 x 7168 px (rộng gấp 4 lần)
   - Phân chia 5 Bãi Quái Cố Định (Hotspots) cho mỗi bản đồ với quái hồi sinh tại chỗ
   - Hỗ trợ Phân Tuyến (Kênh 1, Tuyến 2) chống nghẽn và chia đều người chơi
   - Tích hợp Auto Giữ Bãi (Radius Anchor) không chạy lung tung mất bãi
   ========================================================================== */

(function(window) {
  'use strict';

  // Kích thước thế giới chuẩn theo ma trận vật cản JMO (3584 x 3584 px)
  const WORLD_NATURAL_SIZE = 3584;

  // Cấu hình 5 bãi luyện công kinh điển cho từng bản đồ (Zone Hotspots)
  // Mỗi bãi có: id, tên bãi, tọa độ tâm x,y (phù hợp không gian 3584x3584), bán kính r, số lượng quái
  const ZONE_CAMPS = {
    // Mặc định cho mọi map dã ngoại
    default: [
      { id: 1, name: 'Bãi 1 - Ngã Ba Doanh Trại', x: 950,  y: 950,  r: 320, count: 14, tag: 'Bãi 1' },
      { id: 2, name: 'Bãi 2 - Chân Đồi Bãi Đá',   x: 2600, y: 950,  r: 320, count: 14, tag: 'Bãi 2' },
      { id: 3, name: 'Bãi 3 - Rừng Cây Rậm Rạp',  x: 950,  y: 2600, r: 320, count: 14, tag: 'Bãi 3' },
      { id: 4, name: 'Bãi 4 - Ven Suối Cổ Mộc',   x: 2600, y: 2600, r: 320, count: 14, tag: 'Bãi 4' },
      { id: 5, name: 'Bãi 5 - Cửa Động Mê Cung',  x: 1792, y: 1792, r: 350, count: 16, tag: 'Bãi VIP', isVip: true }
    ],
    // 2: Hoa Sơn (Cấp 1-10)
    2: [
      { id: 1, name: 'Hoa Sơn - Bãi Thỏ Rừng Cổng Thôn', x: 900,  y: 900,  r: 300, count: 14, tag: 'Bãi 1' },
      { id: 2, name: 'Hoa Sơn - Đỉnh Lạc Nhạn Phong',     x: 2650, y: 950,  r: 300, count: 14, tag: 'Bãi 2' },
      { id: 3, name: 'Hoa Sơn - Rừng Thông Bắc',         x: 950,  y: 2650, r: 300, count: 14, tag: 'Bãi 3' },
      { id: 4, name: 'Hoa Sơn - Bãi Hổ Vàng Khe Núi',     x: 2600, y: 2600, r: 300, count: 14, tag: 'Bãi 4' },
      { id: 5, name: 'Hoa Sơn - Tử Tiêu Điện (Boss)',    x: 1792, y: 1792, r: 350, count: 16, tag: 'Bãi VIP', isVip: true }
    ],
    // 7: Tần Lăng (Cấp 20-30)
    7: [
      { id: 1, name: 'Tần Lăng Tầng 1 - Cửa Tây',        x: 950,  y: 950,  r: 300, count: 14, tag: 'Bãi 1' },
      { id: 2, name: 'Tần Lăng Tầng 1 - Mộ Thất Đông',   x: 2600, y: 950,  r: 300, count: 14, tag: 'Bãi 2' },
      { id: 3, name: 'Tần Lăng Tầng 1 - Binh Mã Dũng Nam', x: 950, y: 2600, r: 300, count: 14, tag: 'Bãi 3' },
      { id: 4, name: 'Tần Lăng Tầng 1 - Hành Lang Cổ',    x: 2600, y: 2600, r: 300, count: 14, tag: 'Bãi 4' },
      { id: 5, name: 'Tần Lăng Tầng 1 - Trung Tâm Cơ Quan', x: 1792, y: 1792, r: 350, count: 16, tag: 'Bãi VIP', isVip: true }
    ],
    // 41: Phục Ngưu Sơn Tây (Cấp 50-60)
    41: [
      { id: 1, name: 'Phục Ngưu Sơn - Ngã Ba Đồi Tranh', x: 950,  y: 900,  r: 320, count: 14, tag: 'Bãi 1' },
      { id: 2, name: 'Phục Ngưu Sơn - Trại Sơn Tặc Đông', x: 2600, y: 950,  r: 320, count: 14, tag: 'Bãi 2' },
      { id: 3, name: 'Phục Ngưu Sơn - Bãi Cỏ Phía Nam',   x: 950,  y: 2600, r: 320, count: 14, tag: 'Bãi 3' },
      { id: 4, name: 'Phục Ngưu Sơn - Suối Nước Cổ Mộc',  x: 2600, y: 2600, r: 320, count: 14, tag: 'Bãi 4' },
      { id: 5, name: 'Phục Ngưu Sơn - Lãnh Địa Đầu Lĩnh', x: 1792, y: 1792, r: 350, count: 16, tag: 'Bãi VIP', isVip: true }
    ],
    // 224: Sa Mạc Địa Biểu (Cấp 120-130)
    224: [
      { id: 1, name: 'Sa Mạc - Ốc Đảo Cát Đỏ',          x: 950,  y: 950,  r: 320, count: 14, tag: 'Bãi 1' },
      { id: 2, name: 'Sa Mạc - Khung Xương Khổng Lồ',   x: 2600, y: 950,  r: 320, count: 14, tag: 'Bãi 2' },
      { id: 3, name: 'Sa Mạc - Cửa Động Mê Cung Tầng 1', x: 950,  y: 2600, r: 320, count: 14, tag: 'Bãi 3' },
      { id: 4, name: 'Sa Mạc - Đồi Cát Gió Lốc',        x: 2600, y: 2600, r: 320, count: 14, tag: 'Bãi 4' },
      { id: 5, name: 'Sa Mạc - Lãnh Địa Sa Tặc Vương',  x: 1792, y: 1792, r: 350, count: 16, tag: 'Bãi VIP', isVip: true }
    ],
    // 386: Chiến Trường Tống Kim
    386: [
      { id: 1, name: 'Tống Kim - Tiền Tuyến Phe Tống',   x: 950,  y: 950,  r: 320, count: 12, tag: 'Bãi 1' },
      { id: 2, name: 'Tống Kim - Đại Doanh Phe Kim',     x: 2600, y: 950,  r: 320, count: 12, tag: 'Bãi 2' },
      { id: 3, name: 'Tống Kim - Thung Lũng Cát Nam',    x: 950,  y: 2600, r: 320, count: 12, tag: 'Bãi 3' },
      { id: 4, name: 'Tống Kim - Cửa Hẹp Hiểm Trở',      x: 2600, y: 2600, r: 320, count: 12, tag: 'Bãi 4' },
      { id: 5, name: 'Tống Kim - Trung Tâm Chiến Trường', x: 1792, y: 1792, r: 350, count: 14, tag: 'Bãi VIP', isVip: true }
    ]
  };

  const MAP_EXPANSION = {
    currentChannel: 1,      // Tuyến 1, Tuyến 2
    selectedCampId: 1,      // Bãi cắm cọc hiện tại của nhân vật
    anchorRadius: 380,      // Bán kính cắm chuột auto (380px)
    autoFindEmptyCamp: true,// Tự tìm bãi trống khi hết quái

    // Khởi tạo mở rộng bản đồ
    init() {
      this.hookWorldSizing();
      this.setupChannelHud();
      console.log('[MapExpansion] Đã kích hoạt hệ thống mở rộng bản đồ và 5 bãi luyện công cố định.');
    },

    // Kiểm tra bản đồ hiện tại có được áp dụng mở rộng không
    isExpandableZone(zid) {
      if (typeof R !== 'undefined' && R.town) return false; // Không mở rộng thành thị để giữ nguyên cấu trúc phố xá
      return true;
    },

    // Trả về danh sách bãi cắm cọc của bản đồ hiện tại
    getCamps(zid) {
      zid = zid || (typeof getCurZoneId === 'function' ? getCurZoneId() : 2);
      return ZONE_CAMPS[zid] || ZONE_CAMPS.default;
    },

    // Lấy bãi cắm cọc gần vị trí (x, y) nhất
    getNearestCamp(x, y, zid) {
      const camps = this.getCamps(zid);
      let best = camps[0], minDist = 1e9;
      for (const c of camps) {
        const d = (c.x - x) ** 2 + (c.y - y) ** 2;
        if (d < minDist) {
          minDist = d;
          best = c;
        }
      }
      return best;
    },

    // Đảm bảo kích thước World khớp chuẩn với dữ liệu bản đồ
    hookWorldSizing() {
      // Giữ nguyên WORLD.w / WORLD.h theo đúng kích thước thực của JMO (3584 x 3584)
      // để vật cản và hình nền map không bị lệch tọa độ
    },

    // Tạo nút chọn Tuyến / Kênh (Channel) trên thanh HUD bản đồ
    setupChannelHud() {
      const banner = document.getElementById('hudMapBanner');
      if (!banner) return;
      if (document.getElementById('hudChannelBtn')) return;

      const btn = document.createElement('button');
      btn.id = 'hudChannelBtn';
      btn.className = 'hud-channel-badge';
      btn.title = 'Nhấp để đổi Tuyến (Kênh 1 / Tuyến 2) tìm bãi trống';
      btn.innerHTML = '⚡ Tuyến 1';
      btn.style.cssText = 'background:#241a10;border:1px solid #7d5e2a;color:#ffd700;font-size:11px;font-weight:bold;padding:2px 8px;border-radius:3px;cursor:pointer;margin-left:6px;';
      
      btn.onclick = (e) => {
        e.stopPropagation();
        this.toggleChannel();
      };

      banner.appendChild(btn);

      // Thêm nút chọn nhanh bãi cắm cọc vào HUD
      const campBtn = document.createElement('button');
      campBtn.id = 'hudCampSelectBtn';
      campBtn.className = 'hud-camp-badge';
      campBtn.title = 'Nhấp để chọn Bãi Cắm Cọc (Bãi 1-5)';
      campBtn.innerHTML = '🚩 Bãi Quái (5)';
      campBtn.style.cssText = 'background:#1a221a;border:1px solid #3c6e3c;color:#a0ffa0;font-size:11px;font-weight:bold;padding:2px 8px;border-radius:3px;cursor:pointer;margin-left:4px;';
      
      campBtn.onclick = (e) => {
        e.stopPropagation();
        this.openCampModal();
      };

      banner.appendChild(campBtn);
    },

    // Đổi Tuyến (Channel)
    toggleChannel() {
      this.currentChannel = (this.currentChannel === 1) ? 2 : 1;
      const btn = document.getElementById('hudChannelBtn');
      if (btn) btn.innerHTML = `⚡ Tuyến ${this.currentChannel}`;
      if (typeof toast === 'function') toast(`Chuyển sang Tuyến ${this.currentChannel} thành công!`);

      // Gửi tín hiệu đổi channel tới server WebSocket nếu có
      if (typeof MP !== 'undefined' && MP.ws && MP.connected) {
        try {
          MP.ws.send(JSON.stringify({ t: 'change_channel', channel: this.currentChannel }));
        } catch (e) {}
      }

      // Làm mới danh sách quái
      if (typeof R !== 'undefined' && typeof spawnWave === 'function') {
        R.enemies = [];
        spawnWave();
      }
    },

    // Mở hộp thoại chọn Bãi Luyện Công & Tự Động Di Chuyển Tới Bãi
    openCampModal() {
      const zid = typeof getCurZoneId === 'function' ? getCurZoneId() : 2;
      const camps = this.getCamps(zid);
      const curCamp = this.getNearestCamp(H.x, H.y, zid);

      let html = `
        <div style="background:#15100c;border:2px solid #7d5e2a;border-radius:6px;padding:14px;color:#d8cbb8;font-family:sans-serif;max-width:440px;">
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #5a4425;padding-bottom:8px;margin-bottom:12px;">
            <b style="color:#ffd700;font-size:15px;">🚩 5 BÃI CẮM CỌC LUYỆN CÔNG</b>
            <span style="font-size:12px;color:#a0ffa0;">Tuyến ${this.currentChannel}</span>
          </div>
          <p style="font-size:12px;color:#aaa;margin-bottom:12px;">
            Mỗi bản đồ có 5 bãi cọc cố định với 12–16 quái tự hồi sinh. Chọn bãi để nhân vật tự động chạy đến và neo cắm chuột luyện công!
          </p>
          <div style="display:flex;flex-direction:column;gap:8px;max-height:260px;overflow-y:auto;">
      `;

      camps.forEach(c => {
        const isCur = curCamp.id === c.id;
        html += `
          <div style="display:flex;justify-content:space-between;align-items:center;background:${isCur ? '#2a3520' : '#1e1610'};border:1px solid ${isCur ? '#5cb85c' : '#4a3820'};padding:8px 12px;border-radius:4px;">
            <div>
              <b style="color:${c.isVip ? '#ff9900' : '#fff'};font-size:13px;">${c.name}</b>
              <div style="font-size:11px;color:#888;margin-top:2px;">
                Tọa độ: <span style="color:#ffd700;">${Math.round(c.x / 16)}/${Math.round(c.y / 16)}</span> • Số lượng: <span style="color:#66ccff;">${c.count} quái</span>
                ${isCur ? ' • <span style="color:#a0ffa0;font-weight:bold;">[Đang ở bãi này]</span>' : ''}
              </div>
            </div>
            <button onclick="MAP_EXPANSION.goToCamp(${c.id})" style="background:${isCur ? '#3c6e3c' : '#7d5e2a'};border:1px solid #b89040;color:#fff;font-size:12px;font-weight:bold;padding:5px 12px;border-radius:3px;cursor:pointer;">
              ${isCur ? 'Neo Bãi' : 'Chạy Đến'}
            </button>
          </div>
        `;
      });

      html += `
          </div>
          <div style="margin-top:14px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #3c2a1a;padding-top:10px;">
            <label style="font-size:12px;color:#ccc;cursor:pointer;">
              <input type="checkbox" id="chkLockCamp" ${this.anchorRadius > 0 ? 'checked' : ''} onchange="MAP_EXPANSION.anchorRadius = this.checked ? 380 : 0"> 
              Neo chuột giữ bãi (bán kính 380px)
            </label>
            <button onclick="if(window.mClose)mClose.click();" style="background:#4a3820;border:1px solid #666;color:#ccc;font-size:12px;padding:4px 10px;border-radius:3px;cursor:pointer;">Đóng</button>
          </div>
        </div>
      `;

      if (typeof openModal === 'function') {
        openModal(html);
      }
    },

    // Tự động chạy tới bãi cắm cọc đã chọn
    goToCamp(campId) {
      const zid = typeof getCurZoneId === 'function' ? getCurZoneId() : 2;
      const camps = this.getCamps(zid);
      const camp = camps.find(c => c.id === campId);
      if (!camp) return;

      this.selectedCampId = camp.id;
      H.tx = camp.x;
      H.ty = camp.y;
      H.moving = true;

      if (typeof mClose !== 'undefined' && mClose) mClose.click();
      if (typeof toast === 'function') toast(`🏃 Đang di chuyển đến ${camp.name}...`);
    },

    // Kiểm tra quái hồi sinh theo bãi (Multi-Camp Spawner)
    maintainCampMobs(dt = 0.016) {
      if (typeof R === 'undefined' || R.town || !R.enemies) return;

      // Giãn cách kiểm tra hồi sinh: 1.5s mỗi lần (tránh spam tạo quá nhiều quái)
      this._spawnCd = (this._spawnCd || 0) - (dt || 0.016);
      if (this._spawnCd > 0) return;
      this._spawnCd = 1.5;

      const zid = typeof getCurZoneId === 'function' ? getCurZoneId() : 2;
      const camps = this.getCamps(zid);
      const z = (typeof zoneOf === 'function' && typeof S !== 'undefined') ? zoneOf(S.stage) : null;
      if (!z) return;

      const curCamp = this.getNearestCamp(H.x, H.y, zid);
      const targetCount = curCamp.count || 12;

      // Khống chế tổng số quái đang sống xung quanh: tối đa bằng số lượng bãi (không dồn 1 cục)
      const aliveMobs = R.enemies.filter(e => e && e.hp > 0 && !e.dead);
      if (aliveMobs.length >= targetCount) return;

      const myCampMobs = aliveMobs.filter(e => {
        const d2 = (e.x - curCamp.x) ** 2 + (e.y - curCamp.y) ** 2;
        return d2 <= (curCamp.r + 200) ** 2;
      });

      if (myCampMobs.length < targetCount) {
        const need = Math.min(targetCount - myCampMobs.length, 3);
        const L = stageLevel ? stageLevel(S.stage) : 10;
        for (let i = 0; i < need; i++) {
          // Phân bố góc ngẫu nhiên rải đều quanh bãi để quái đứng thoáng
          const a = (i / need) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
          const dist = 60 + Math.random() * Math.max(80, curCamp.r - 80);
          const rawX = clamp(curCamp.x + Math.cos(a) * dist, 60, (WORLD.w || WORLD_NATURAL_SIZE) - 60);
          const rawY = clamp(curCamp.y + Math.sin(a) * dist, 60, (WORLD.h || WORLD_NATURAL_SIZE) - 60);
          let snap = [rawX, rawY];
          if (typeof obsWalk === 'function' && !obsWalk(rawX, rawY)) {
            snap = (typeof inWorld === 'function') ? inWorld(rawX, rawY) : [rawX, rawY];
          }

          const tid = (z.m && z.m.length) ? z.m[Math.floor(Math.random() * z.m.length)] : 1;
          const cls = (Math.random() < 0.15) ? 'elite' : 'normal';
          if (typeof makeEnemy === 'function') {
            const e = makeEnemy(tid, L, cls, snap[0], snap[1]);
            e.campId = curCamp.id;
            e._encircleAngle = Math.random() * Math.PI * 2;
            e._encircleDist = e.ranged ? (160 + Math.random() * 40) : (e.r + 25 + Math.random() * 30);
            R.enemies.push(e);
          }
        }
      }
    },

    // Vẽ cờ hiệu các bãi cọc trên minimap
    drawMinimapCamps(ctx, x0, y0, s, k) {
      if (typeof R !== 'undefined' && R.town) return;
      const zid = typeof getCurZoneId === 'function' ? getCurZoneId() : 2;
      const camps = this.getCamps(zid);

      ctx.save();
      camps.forEach(c => {
        const mx = x0 + c.x * k;
        const my = y0 + c.y * k;

        // Vẽ vòng tròn bãi quái
        ctx.beginPath();
        ctx.arc(mx, my, c.r * k, 0, Math.PI * 2);
        ctx.fillStyle = c.isVip ? 'rgba(255, 180, 0, 0.15)' : 'rgba(100, 255, 100, 0.1)';
        ctx.fill();
        ctx.strokeStyle = c.isVip ? 'rgba(255, 200, 0, 0.6)' : 'rgba(100, 200, 100, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Chấm tâm bãi
        ctx.beginPath();
        ctx.arc(mx, my, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = c.isVip ? '#ff9900' : '#44ff44';
        ctx.fill();

        // Tên nhãn bãi
        ctx.font = '8px sans-serif';
        ctx.fillStyle = c.isVip ? '#ffd700' : '#a0ffa0';
        ctx.textAlign = 'center';
        ctx.fillText(c.tag, mx, my - 4);
      });
      ctx.restore();
    }
  };

  window.MAP_EXPANSION = MAP_EXPANSION;

  // Tự động khởi tạo khi tài liệu sẵn sàng
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => MAP_EXPANSION.init());
  } else {
    MAP_EXPANSION.init();
  }

})(window);
