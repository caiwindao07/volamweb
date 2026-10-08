/* ==========================================================================
   VÕ LÂM TRUYỀN KỲ - HỆ THỐNG PHI PHONG (CLOAK) & ĐẢ THÔNG KINH MẠCH (MERIDIANS)
   - 1. Phi Phong 6 Bậc (Lăng Tuyệt, Kình Lôi, Sồ Phượng, Tiềm Long, Chí Tôn, Vô Song)
        Hiệu ứng áo choàng bay phấp phới & hào quang chân nhân vật trên Canvas
   - 2. Đả thông 8 đường Kỳ Kinh Bát Mạch (Nhâm, Đốc, Xung, Đới, Âm Duy, Dương Duy...)
   ========================================================================== */

(function(window) {
  'use strict';

  // 6 Bậc Phi Phong Danh Vọng
  const CLOAK_TIERS = [
    { tier: 0, name: 'Chưa trang bị', color: '#888', auraCol: null, hp: 0, res: 0, crit: 0, lifesteal: 0 },
    { tier: 1, name: 'Phi Phong Lăng Tuyệt', color: '#4ade80', auraCol: 'rgba(74, 222, 128, 0.45)', hp: 800, res: 15, crit: 2, lifesteal: 0, costRep: 100 },
    { tier: 2, name: 'Phi Phong Kình Lôi', color: '#38bdf8', auraCol: 'rgba(56, 189, 248, 0.5)', hp: 1800, res: 30, crit: 4, lifesteal: 2, costRep: 300 },
    { tier: 3, name: 'Phi Phong Sồ Phượng', color: '#c084fc', auraCol: 'rgba(192, 132, 252, 0.55)', hp: 3500, res: 50, crit: 7, lifesteal: 4, costRep: 800 },
    { tier: 4, name: 'Phi Phong Tiềm Long', color: '#ffd700', auraCol: 'rgba(255, 215, 0, 0.65)', hp: 6000, res: 75, crit: 10, lifesteal: 6, costRep: 2000 },
    { tier: 5, name: 'Phi Phong Chí Tôn', color: '#f87171', auraCol: 'rgba(248, 113, 113, 0.75)', hp: 10000, res: 110, crit: 14, lifesteal: 9, costRep: 5000 },
    { tier: 6, name: 'Phi Phong Vô Song', color: '#f43f5e', auraCol: 'rgba(244, 63, 94, 0.85)', hp: 20000, res: 160, crit: 20, lifesteal: 14, costRep: 12000 }
  ];

  // 8 Mạch Kỳ Kinh
  const MERIDIANS = [
    { id: 'nham', name: 'Nhâm Mạch', desc: 'Gia tăng Sinh Lực tối đa và hồi phục', stat: 'HP +300 / cấp' },
    { id: 'doc', name: 'Đốc Mạch', desc: 'Gia tăng Nội Lực tối đa và hồi phục', stat: 'MP +200 / cấp' },
    { id: 'xung', name: 'Xung Mạch', desc: 'Gia tăng Sát Thương đòn đánh', stat: 'Tấn Công +4% / cấp' },
    { id: 'doi', name: 'Đới Mạch', desc: 'Gia tăng Kháng Tất Cả các hệ', stat: 'Kháng +8 / cấp' },
    { id: 'amduy', name: 'Âm Duy Mạch', desc: 'Gia tăng Tỷ Lệ Né Tránh', stat: 'Né Tránh +3% / cấp' },
    { id: 'duongduy', name: 'Dương Duy Mạch', desc: 'Gia tăng Tốc Độ Xuất Chiêu', stat: 'Tốc Đánh +4% / cấp' },
    { id: 'amkieu', name: 'Âm Kiều Mạch', desc: 'Gia tăng Tỷ Lệ Đòn Chí Mạng', stat: 'Bạo Kích +2.5% / cấp' },
    { id: 'duongkieu', name: 'Dương Kiều Mạch', desc: 'Giảm Thời Gian Bị Thọ Thương', stat: 'Giảm Choáng +5% / cấp' }
  ];

  const CLOAK_MERIDIAN = {
    init() {
      if (!window.S) return;
      if (!S.cloak || typeof S.cloak !== 'object') S.cloak = { tier: 0 };
      if (S.cloak.tier === undefined) S.cloak.tier = 0;
      if (!S.meridian || typeof S.meridian !== 'object') {
        S.meridian = {
          qi: 0,
          levels: { nham: 0, doc: 0, xung: 0, doi: 0, amduy: 0, duongduy: 0, amkieu: 0, duongkieu: 0 }
        };
      } else if (!S.meridian.levels) {
        S.meridian.levels = { nham: 0, doc: 0, xung: 0, doi: 0, amduy: 0, duongduy: 0, amkieu: 0, duongkieu: 0 };
      }
      console.log('[CloakMeridian] Đã khởi tạo Hệ Thống Phi Phong & Kinh Mạch.');
    },

    getCloakInfo() {
      if (!window.S) return null;
      const tier = (S.cloak && typeof S.cloak.tier === 'number') ? S.cloak.tier : 0;
      if (tier <= 0) return null;
      return CLOAK_TIERS[tier] || null;
    },

    toggleWindow() {
      this.init();
      let win = document.getElementById('fw-cloak-meridian');
      if (!win) {
        win = document.createElement('div');
        win.id = 'fw-cloak-meridian';
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

    // Nâng cấp Phi Phong
    upgradeCloak() {
      const curTier = S.cloak ? S.cloak.tier : 0;
      if (curTier >= 6) {
        if (typeof toast === 'function') toast('🎉 Đã đạt cấp Phi Phong Vô Song tối cao!');
        return;
      }
      const next = CLOAK_TIERS[curTier + 1];
      const costGold = (curTier + 1) * 150000;
      if ((S.gold || 0) < costGold) {
        if (typeof toast === 'function') toast(`❌ Cần ${costGold.toLocaleString()} Vàng để thăng bậc Phi Phong!`);
        return;
      }

      S.gold -= costGold;
      S.cloak.tier = curTier + 1;

      if (typeof toast === 'function') toast(`🎉 Thăng bậc thành công [${next.name}]!`);
      if (typeof log === 'function') log(`<b style="color:${next.color};font-size:14px;">🎉 Chúc mừng đại hiệp đã xuất sư đắc ngộ [${next.name}]! Hào quang vạn trượng!</b>`);
      if (typeof uiSfx === 'function') uiSfx('levelup');
      if (typeof save === 'function') save();
      if (typeof recalcStats === 'function') recalcStats();
      this.renderWindow();
    },

    // Đả thông kinh mạch
    upgradeMeridian(mId) {
      if (!S.meridian) this.init();
      const curLv = S.meridian.levels[mId] || 0;
      if (curLv >= 10) {
        if (typeof toast === 'function') toast('Đã đả thông viên mãn mạch này (Cấp 10)!');
        return;
      }

      const costQi = (curLv + 1) * 200;
      if ((S.meridian.qi || 0) < costQi) {
        if (typeof toast === 'function') toast(`❌ Cần ${costQi} Điểm Chân Khí để đả thông huyệt đạo tiếp theo!`);
        return;
      }

      S.meridian.qi -= costQi;
      S.meridian.levels[mId] = curLv + 1;

      if (typeof toast === 'function') toast(`⚡ Đả thông ${MERIDIANS.find(x => x.id === mId).name} lên Cấp ${curLv + 1}!`);
      if (typeof uiSfx === 'function') uiSfx('upgrade');
      if (typeof save === 'function') save();
      if (typeof recalcStats === 'function') recalcStats();
      this.renderWindow();
    },

    // Cộng chỉ số vào nhân vật (gọi từ stats.js)
    applyStats(P) {
      if (!window.S) return;
      if (!S.cloak || typeof S.cloak !== 'object') S.cloak = { tier: 0 };
      // 1. Chỉ số Phi Phong (Chỉ áp dụng khi đã thăng bậc tier >= 1)
      const tier = (S.cloak && typeof S.cloak.tier === 'number') ? S.cloak.tier : 0;
      if (tier > 0 && CLOAK_TIERS[tier]) {
        const c = CLOAK_TIERS[tier];
        P.life += c.hp;
        if (!P.res) P.res = { phys: 0, cold: 0, fire: 0, light: 0, poison: 0 };
        for (const e of ELEM) P.res[e] = (P.res[e] || 0) + c.res;
        P.crit = (P.crit || 0) + c.crit;
      }

      // 2. Chỉ số Kinh Mạch
      if (S && S.meridian && S.meridian.levels) {
        const m = S.meridian.levels;
        P.life += (m.nham || 0) * 300;
        P.mana += (m.doc || 0) * 200;
        P.dmgMul = (P.dmgMul || 1) + (m.xung || 0) * 0.04;
        for (const e of ELEM) P.res[e] = (P.res[e] || 0) + (m.doi || 0) * 8;
        P.crit = (P.crit || 0) + (m.amkieu || 0) * 2.5;
      }
    },

    // Vẽ Áo Choàng Phi Phong (Cloak Res) chuẩn phía sau lưng nhân vật
    // Vẽ Áo Choàng Phi Phong (Cloak Res) chuẩn phía sau vai và lưng nhân vật (hỗ trợ cả bản thân & người chơi khác)
    drawCloak(ctx, px, py, dir, customTier, isOtherMoving = false) {
      const tier = customTier !== undefined ? Number(customTier) : ((S && S.cloak) ? S.cloak.tier : 0);
      if (!tier) return;
      const c = CLOAK_TIERS[tier];
      if (!c) return;

      ctx.save();

      // Hướng quay mặt của nhân vật (dir: 0..7)
      const d = dir || 0;
      const isMoving = isOtherMoving || !!(customTier === undefined && typeof H !== 'undefined' && H.moving);
      const isMounted = !!(typeof S !== 'undefined' && S.mounted);
      const now = Date.now();
      const waveT = (now / (isMoving ? 130 : 280));
      const windWave = Math.sin(waveT) * (isMoving ? 8 : 3);
      const windFlutter = Math.cos(waveT * 1.6) * (isMoving ? 5 : 2);

      // Điểm neo cổ / vai áo choàng (ngay bờ vai nhân vật: py - 49, khi cưỡi ngựa áo rủ theo lưng ngựa)
      const neckY = py - 49;
      const hemY = py - 6 + Math.abs(windWave * 0.4); // Vạt áo rủ dài xuống gần gót chân

      // Độ bay dạt về sau ngược hướng di chuyển
      let driftX = 0;
      if (d === 1 || d === 2 || d === 3) driftX = 7 + (isMoving ? 6 : 0);  // Sang phải khi quay trái
      else if (d === 5 || d === 6 || d === 7) driftX = -7 - (isMoving ? 6 : 0); // Sang trái khi quay phải
      else driftX = (Math.sin(waveT * 0.7) * 2);

      // Phân loại hướng nhìn của nhân vật:
      // - isFacingFront (d = 0, 1, 7): Quay mặt về phía người xem -> Áo choàng ở sau lưng, thân người che phần giữa. Chỉ thấy 2 vạt tà xòe 2 bên hông và hào quang sau vai!
      // - isFacingBack (d = 3, 4, 5): Quay lưng lại -> Thấy trọn vẹn lưng áo choàng phủ từ vai xuống vạt áo.
      // - isFacingSide (d = 2, 6): Quay ngang -> Áo choàng bay dạt hẳn về phía sau lưng.
      const isFacingFront = (d === 0 || d === 1 || d === 7);
      const isFacingBack = (d === 3 || d === 4 || d === 5);

      // Chiều rộng bờ vai
      const shoulderW = (d === 2 || d === 6) ? 7 : (isFacingBack ? 9.5 : 8.5);
      const leftShoulderX = px - shoulderW;
      const rightShoulderX = px + shoulderW;

      // 1. DẢI HÀO QUANG CÁNH LINH KHÍ TỎA SAU VAI (ETHEREAL WINGS AURA) THEO CẤP
      if (tier >= 2) {
        ctx.save();
        ctx.globalAlpha = isMoving ? 0.45 : 0.32;
        const auraR = 16 + tier * 4;
        // Đôi cánh hào quang 2 bên vai
        const gradAuraL = ctx.createRadialGradient(leftShoulderX - 4 + driftX * 0.3, neckY + 12, 2, leftShoulderX - 4 + driftX * 0.3, neckY + 12, auraR);
        gradAuraL.addColorStop(0, c.color);
        if (tier >= 5) gradAuraL.addColorStop(0.5, tier === 6 ? 'rgba(255, 215, 0, 0.45)' : 'rgba(239, 68, 68, 0.38)');
        gradAuraL.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradAuraL;
        ctx.beginPath();
        ctx.arc(leftShoulderX - 4 + driftX * 0.3, neckY + 12, auraR, 0, Math.PI * 2);
        ctx.fill();

        const gradAuraR = ctx.createRadialGradient(rightShoulderX + 4 + driftX * 0.3, neckY + 12, 2, rightShoulderX + 4 + driftX * 0.3, neckY + 12, auraR);
        gradAuraR.addColorStop(0, c.color);
        if (tier >= 5) gradAuraR.addColorStop(0.5, tier === 6 ? 'rgba(255, 215, 0, 0.45)' : 'rgba(239, 68, 68, 0.38)');
        gradAuraR.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradAuraR;
        ctx.beginPath();
        ctx.arc(rightShoulderX + 4 + driftX * 0.3, neckY + 12, auraR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Màu sắc gradient đặc trưng cho từng bậc
      const capeGrad = ctx.createLinearGradient(px, neckY, px + driftX, hemY);
      if (tier === 1) {
        capeGrad.addColorStop(0, '#dcfce7');
        capeGrad.addColorStop(0.3, '#22c55e');
        capeGrad.addColorStop(1, '#14532d');
      } else if (tier === 2) {
        capeGrad.addColorStop(0, '#e0f2fe');
        capeGrad.addColorStop(0.3, '#0284c7');
        capeGrad.addColorStop(1, '#0c4a6e');
      } else if (tier === 3) {
        capeGrad.addColorStop(0, '#f3e8ff');
        capeGrad.addColorStop(0.3, '#9333ea');
        capeGrad.addColorStop(1, '#3b0764');
      } else if (tier === 4) {
        capeGrad.addColorStop(0, '#fef9c3');
        capeGrad.addColorStop(0.25, '#ffd700');
        capeGrad.addColorStop(0.7, '#ca8a04');
        capeGrad.addColorStop(1, '#713f12');
      } else if (tier === 5) {
        capeGrad.addColorStop(0, '#fee2e2');
        capeGrad.addColorStop(0.25, '#ef4444');
        capeGrad.addColorStop(0.7, '#b91c1c');
        capeGrad.addColorStop(1, '#450a0a');
      } else {
        capeGrad.addColorStop(0, '#fff1f2');
        capeGrad.addColorStop(0.2, '#f43f5e');
        capeGrad.addColorStop(0.6, '#ffd700');
        capeGrad.addColorStop(1, '#881337');
      }

      ctx.fillStyle = capeGrad;
      ctx.shadowColor = c.color;
      ctx.shadowBlur = tier >= 5 ? 8 : (tier >= 3 ? 5 : 2);
      ctx.strokeStyle = tier >= 4 ? '#fef08a' : (tier === 3 ? '#e9d5ff' : (tier === 2 ? '#bae6fd' : '#bbf7d0'));
      ctx.lineWidth = tier >= 4 ? 1.4 : 1.1;

      // 2. VẼ ÁO CHOÀNG THEO GÓC NHÌN CHUẨN XÁC
      if (isFacingFront) {
        // KHI NHÌN TỪ PHÍA TRƯỚC (QUAY MẶT VÀO CAMERA):
        // Thân người che lưng! Áo choàng rủ phía sau chỉ thấy 2 vạt tà xòe nhẹ ra 2 bên sườn.
        // Tuyệt đối không vẽ mảng vải đặc che giữa hai chân!
        const flapWidth = 5 + tier * 0.9;
        const flapHemY = py - 8 + Math.abs(windWave * 0.3);

        // Vạt tà áo sau sườn trái
        ctx.beginPath();
        ctx.moveTo(leftShoulderX, neckY + 4);
        ctx.bezierCurveTo(leftShoulderX - 5 + driftX * 0.4, neckY + 20, leftShoulderX - flapWidth + driftX, flapHemY - 8, leftShoulderX - flapWidth + driftX + windWave * 0.8, flapHemY);
        ctx.lineTo(leftShoulderX - 1 + driftX * 0.5, flapHemY - 2);
        ctx.bezierCurveTo(leftShoulderX - 2, neckY + 24, leftShoulderX - 1, neckY + 12, leftShoulderX, neckY + 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Vạt tà áo sau sườn phải
        ctx.beginPath();
        ctx.moveTo(rightShoulderX, neckY + 4);
        ctx.bezierCurveTo(rightShoulderX + 5 + driftX * 0.4, neckY + 20, rightShoulderX + flapWidth + driftX, flapHemY - 8, rightShoulderX + flapWidth + driftX + windWave * 0.8 + windFlutter * 0.5, flapHemY);
        ctx.lineTo(rightShoulderX + 1 + driftX * 0.5, flapHemY - 2);
        ctx.bezierCurveTo(rightShoulderX + 2, neckY + 24, rightShoulderX + 1, neckY + 12, rightShoulderX, neckY + 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

      } else {
        // KHI QUAY LƯNG LẠI (isFacingBack) HOẶC QUAY NGHIÊNG:
        // Lưng nhân vật hướng ra ngoài màn hình -> Thấy trọn vẹn thân áo choàng phủ xuống!
        const hemWidthBase = (isFacingBack ? 12 : 9) + tier * 1.8;
        const leftHemX = px - hemWidthBase + driftX + windWave;
        const rightHemX = px + hemWidthBase + driftX + windWave + windFlutter;
        const midHemX = (leftHemX + rightHemX) / 2 + driftX * 0.2;

        ctx.beginPath();
        ctx.moveTo(leftShoulderX, neckY);
        ctx.bezierCurveTo(
          leftShoulderX - 4 + driftX * 0.4, neckY + 16,
          leftHemX - 3, neckY + 32,
          leftHemX, hemY
        );

        if (tier === 1) {
          ctx.lineTo(midHemX, hemY + 2);
          ctx.lineTo(rightHemX, hemY);
        } else if (tier === 2) {
          const slitY = hemY - 5;
          ctx.quadraticCurveTo((leftHemX + midHemX) / 2, hemY + 4, midHemX - 2, hemY + 3);
          ctx.lineTo(midHemX, slitY);
          ctx.lineTo(midHemX + 2, hemY + 3);
          ctx.quadraticCurveTo((midHemX + rightHemX) / 2, hemY + 4, rightHemX, hemY);
        } else if (tier === 3) {
          const p1X = leftHemX + (midHemX - leftHemX) * 0.5;
          const p2X = midHemX + (rightHemX - midHemX) * 0.5;
          ctx.quadraticCurveTo(p1X, hemY - 2, leftHemX + (p1X - leftHemX) * 0.5, hemY + 5);
          ctx.quadraticCurveTo(midHemX, hemY - 3, midHemX, hemY + 6);
          ctx.quadraticCurveTo(p2X, hemY - 3, p2X, hemY + 5);
          ctx.quadraticCurveTo((p2X + rightHemX) / 2, hemY - 2, rightHemX, hemY);
        } else if (tier === 4) {
          ctx.quadraticCurveTo(leftHemX + 4, hemY + 4, midHemX, hemY + 8);
          ctx.quadraticCurveTo(rightHemX - 4, hemY + 4, rightHemX, hemY);
        } else {
          const flapLeft = leftHemX + 5, flapRight = rightHemX - 5;
          ctx.quadraticCurveTo(flapLeft, hemY - 3, flapLeft, hemY + 6);
          ctx.quadraticCurveTo(midHemX, hemY - 2, midHemX, hemY + 9);
          ctx.quadraticCurveTo(flapRight, hemY - 2, flapRight, hemY + 6);
          ctx.quadraticCurveTo((flapRight + rightHemX) / 2, hemY - 2, rightHemX, hemY);
        }

        ctx.bezierCurveTo(
          rightHemX + 3, neckY + 32,
          rightShoulderX + 4 + driftX * 0.4, neckY + 16,
          rightShoulderX, neckY
        );
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Nếp gấp lụa và hoa văn lưng áo (chỉ vẽ khi nhìn từ sau lưng)
        ctx.beginPath();
        ctx.moveTo(px, neckY + 2);
        ctx.quadraticCurveTo(px + driftX * 0.5, neckY + 22, midHemX, hemY);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Dải hoa văn tia sét (Kình Lôi) hoặc vảy rồng (Tiềm Long/Vô Song)
        if (tier === 2) {
          ctx.strokeStyle = '#7dd3fc';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(px - 3, neckY + 10);
          ctx.lineTo(px - 1, neckY + 20);
          ctx.lineTo(px - 4, neckY + 26);
          ctx.lineTo(midHemX - 2, hemY - 3);
          ctx.stroke();
        } else if (tier >= 4) {
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(px + driftX * 0.3, neckY + 16, 2.5, 0, Math.PI * 2);
          ctx.arc(px + driftX * 0.3, neckY + 25, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Lớp lót nhung bên trong (cấp 5 & 6)
        if (tier >= 5) {
          ctx.save();
          ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(leftShoulderX + 2, neckY + 2);
          ctx.quadraticCurveTo(px + driftX * 0.3, neckY + 20, midHemX, hemY + 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      ctx.shadowBlur = 0;

      // 6. NGÙ VAI KIM GIÁP & KHUYÊN CÀI ÁO (SHOULDER EPAULETS)
      const epauletR = 2.2 + tier * 0.4;
      const epauletCol = tier >= 4 ? '#ffd700' : (tier === 3 ? '#d8b4fe' : (tier === 2 ? '#93c5fd' : '#cbd5e1'));
      ctx.fillStyle = epauletCol;
      ctx.beginPath();
      ctx.arc(leftShoulderX, neckY + 1, epauletR, 0, Math.PI * 2);
      ctx.arc(rightShoulderX, neckY + 1, epauletR, 0, Math.PI * 2);
      ctx.fill();

      // Dây xích / ngực áo nối 2 vai
      ctx.strokeStyle = epauletCol;
      ctx.lineWidth = tier >= 4 ? 1.4 : 1;
      ctx.beginPath();
      ctx.moveTo(leftShoulderX, neckY + 1);
      ctx.quadraticCurveTo(px, neckY + 3.5, rightShoulderX, neckY + 1);
      ctx.stroke();

      // 7. ĐỐM SÁNG / LINH KHÍ BAY LÊN (SPARKLES & STARS CHO CẤP CAO)
      if (tier >= 3) {
        const sparkCount = tier >= 6 ? 6 : (tier >= 5 ? 4 : 2);
        const sparkColors = tier === 6 ? ['#ffd700', '#f43f5e', '#fff'] : (tier === 5 ? ['#ffd700', '#f87171'] : ['#fef08a', '#c084fc']);
        for (let i = 0; i < sparkCount; i++) {
          const sparkT = (now / (450 + i * 50) + i * 1.8) % 1;
          const sx = px + (Math.sin(now / 350 + i * 2) * (12 + tier * 2)) + driftX;
          const sy = hemY + 4 - sparkT * (30 + tier * 5);
          const sa = (1 - sparkT) * 0.85;
          ctx.globalAlpha = sa;
          ctx.fillStyle = sparkColors[i % sparkColors.length];
          ctx.beginPath();
          ctx.arc(sx, sy, 1.2 + (tier >= 5 ? 0.6 : 0), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    },

    renderWindow() {
      this.init();
      const win = document.getElementById('fw-cloak-meridian');
      if (!win) return;

      const curTier = (S && S.cloak && typeof S.cloak.tier === 'number') ? S.cloak.tier : 0;
      const curCloak = curTier > 0 ? (CLOAK_TIERS[curTier] || CLOAK_TIERS[1]) : null;
      const nextCloak = CLOAK_TIERS[curTier + 1];

      const qi = (S.meridian && S.meridian.qi) ? S.meridian.qi : 0;
      const mLevels = (S.meridian && S.meridian.levels) ? S.meridian.levels : {};

      let html = `
        <div class="jx-window-header" style="background:#2b1f13;border-bottom:2px solid #7d5e2a;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;">
          <b style="color:#ffd700;font-size:14px;">✨ PHI PHONG & ĐẢ THÔNG KINH MẠCH</b>
          <button onclick="document.getElementById('fw-cloak-meridian').classList.add('hidden')" style="background:none;border:none;color:#ff9999;font-size:16px;cursor:pointer;">✕</button>
        </div>

        <div style="padding:12px;background:#15100c;color:#d8cbb8;font-family:sans-serif;">
          <!-- Phần 1: Phi Phong -->
          <div style="background:#1e1610;border:1px solid #5a4425;border-radius:6px;padding:12px;margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <div>
                <span style="font-size:11px;color:#aaa;">Phi Phong Hiện Tại:</span>
                <b style="color:${curCloak ? curCloak.color : '#94a3b8'};font-size:14px;display:block;">${curCloak ? `${curCloak.name} (Bậc ${curTier}/6)` : 'Chưa Kích Hoạt Phi Phong'}</b>
              </div>
              ${nextCloak ? `
                <button onclick="CLOAK_MERIDIAN.upgradeCloak()" style="background:#7d5e2a;border:1px solid #ffd700;color:#fff;padding:6px 14px;border-radius:4px;font-size:12px;font-weight:bold;cursor:pointer;">
                  ${curTier === 0 ? `Kích Hoạt [${nextCloak.name}]` : 'Thăng Bậc'} (${((curTier + 1) * 150000).toLocaleString()} Vàng)
                </button>
              ` : '<span style="color:#ffd700;font-weight:bold;">Đỉnh Phong</span>'}
            </div>
            <div style="font-size:11px;color:#ccc;display:flex;gap:12px;">
              <span>• Sinh Lực: <b style="color:#66ccff;">+${curCloak ? curCloak.hp : 0}</b></span>
              <span>• Kháng Tất Cả: <b style="color:#ffd700;">+${curCloak ? curCloak.res : 0}</b></span>
              <span>• Bạo Kích: <b style="color:#ff9900;">+${curCloak ? curCloak.crit : 0}%</b></span>
            </div>
          </div>

          <!-- Phần 2: Kỳ Kinh Bát Mạch -->
          <div style="background:#1e1610;border:1px solid #5a4425;border-radius:6px;padding:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:1px solid #4a3820;padding-bottom:6px;">
              <b style="color:#38bdf8;font-size:13px;">☯️ KỲ KINH BÁT MẠCH</b>
              <span style="font-size:12px;color:#a0ffa0;">Chân Khí: <b>${qi.toLocaleString()}</b></span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              ${MERIDIANS.map(m => {
                const lv = mLevels[m.id] || 0;
                const cost = (lv + 1) * 200;
                return `
                  <div style="background:#120c08;border:1px solid #4a3820;border-radius:4px;padding:6px 8px;display:flex;justify-content:space-between;align-items:center;">
                    <div>
                      <b style="color:#ffd700;font-size:12px;">${m.name}</b>
                      <span style="color:#66ccff;font-size:11px;margin-left:4px;">Cấp ${lv}/10</span>
                      <div style="font-size:10px;color:#888;margin-top:2px;">${m.stat}</div>
                    </div>
                    <button onclick="CLOAK_MERIDIAN.upgradeMeridian('${m.id}')" ${lv >= 10 ? 'disabled' : ''} 
                      style="background:${lv >= 10 ? '#333' : '#3c2a1a'};border:1px solid ${lv >= 10 ? '#555' : '#7d5e2a'};color:${lv >= 10 ? '#888' : '#ffd700'};font-size:10px;padding:4px 6px;border-radius:3px;cursor:${lv >= 10 ? 'default' : 'pointer'};">
                      ${lv >= 10 ? 'Viên Mãn' : `Đả Thông (${cost})`}
                    </button>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      `;

      win.innerHTML = html;
      win.classList.remove('hidden');
    }
  };

  window.CLOAK_SYSTEM = {
    applyStats: (P) => CLOAK_MERIDIAN.applyStats(P),
    drawCloak: (ctx, px, py, dir, customTier, isOtherMoving) => CLOAK_MERIDIAN.drawCloak(ctx, px, py, dir, customTier, isOtherMoving)
  };
  window.MERIDIAN_SYSTEM = {
    applyStats: (P) => {} // đã tích hợp chung trong applyStats
  };
  window.CLOAK_MERIDIAN = CLOAK_MERIDIAN;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CLOAK_MERIDIAN.init());
  } else {
    CLOAK_MERIDIAN.init();
  }

})(window);
