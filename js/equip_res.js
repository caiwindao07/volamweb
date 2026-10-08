/* ==========================================================================
   HỆ THỐNG NGOẠI TRANG & HIỂN THỊ RES TRANG BỊ (VO LAM IDLE)
   Hiển thị trực quan Vũ Khí, Chiến Giáp, Hộ Kiên, Khôi Giáp,
   Hào Quang Thần Binh Hoàng Kim / Bạch Kim / Cường Hóa +16 trên nhân vật.
   Áp dụng đồng bộ cho cả bản thân (Hero), người chơi khác và BOT.
   ========================================================================== */
'use strict';

(function () {
  const SERIES_AURA = [
    { main: '#fbbf24', light: '#fef08a', name: 'Kim' },   // Kim - Hoàng Kim
    { main: '#22c55e', light: '#86efac', name: 'Mộc' },   // Mộc - Lục Ngọc
    { main: '#38bdf8', light: '#bae6fd', name: 'Thủy' },  // Thủy - Hàn Băng
    { main: '#ef4444', light: '#fca5a5', name: 'Hỏa' },   // Hỏa - Xích Diễm
    { main: '#f59e0b', light: '#fed7aa', name: 'Thổ' }    // Thổ - Tử Hoàng
  ];

  function getSeriesColor(s) {
    const idx = (s != null && s >= 0 && s < 5) ? s : 0;
    return SERIES_AURA[idx];
  }

  // Vẽ ngoại trang hiển thị (Equip Res) trên nhân vật
  function drawHeroEquipment(ctx, x, y, dir, face, act, actT, eq, series) {
    if (!eq || typeof eq !== 'object') return;
    const facing = face >= 0 ? 1 : -1;
    const now = Date.now();
    const t = now / 1000;
    const sCol = getSeriesColor(series);

    // 1. CHIẾN BÀO / ÁO GIÁP (ARMOR RES)
    if (eq.armor) {
      const ar = eq.armor;
      const arLvl = Math.max(1, Math.min(10, Number(ar.lvl) || 1));
      const arR = Number(ar.r) || 0;
      const arSeriesCol = (ar.s >= 0 && ar.s < 5) ? SERIES_AURA[ar.s] : sCol;

      ctx.save();
      // A. Hào quang hộ thể Hoàng Kim / Bạch Kim (Body Aura Shield)
      if (arR >= 2 || (ar.enh && ar.enh >= 8)) {
        ctx.save();
        const pulse = 0.25 + Math.sin(t * 3.5) * 0.12;
        ctx.globalAlpha = pulse;
        const auraCol = arR >= 4 ? '#38bdf8' : (arR === 3 ? '#c084fc' : '#ffd700');
        ctx.strokeStyle = auraCol;
        ctx.shadowColor = auraCol;
        ctx.shadowBlur = 10;
        ctx.lineWidth = arR >= 4 ? 2.5 : 1.8;
        ctx.beginPath();
        ctx.ellipse(x, y - 26, 16, 22, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // B. Hộ Kiên & Giáp Ngực (Shoulder Pauldrons & Breastplate)
      const armorColor = arSeriesCol.main;
      const armorHighlight = arSeriesCol.light;

      // Giáp ngực (Breastplate)
      ctx.fillStyle = armorColor;
      ctx.strokeStyle = arR >= 2 ? '#ffd700' : '#1e293b';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(x, y - 27, 7, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Hộ tâm kính sáng bóng ở tâm ngực
      ctx.fillStyle = arR >= 2 ? '#fffbeb' : '#f8fafc';
      ctx.beginPath();
      ctx.arc(x + facing * 1, y - 28, arLvl >= 7 ? 2.8 : 2, 0, Math.PI * 2);
      ctx.fill();

      // Cầu vai hộ kiên (Shoulder Pauldrons)
      if (arLvl >= 4) {
        ctx.fillStyle = arR >= 2 ? '#ffd700' : armorHighlight;
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        // Vai trái
        ctx.beginPath();
        ctx.arc(x - 9, y - 34, arLvl >= 8 ? 3.5 : 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Vai phải
        ctx.beginPath();
        ctx.arc(x + 9, y - 34, arLvl >= 8 ? 3.5 : 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. KHÔI GIÁP / MŨ (HELM RES)
    if (eq.helm) {
      const hm = eq.helm;
      const hmLvl = Math.max(1, Math.min(10, Number(hm.lvl) || 1));
      const hmR = Number(hm.r) || 0;

      ctx.save();
      const helmY = y - 46;
      // Khôi giáp / Kim hoàn đới trên trán
      ctx.fillStyle = hmR >= 2 ? '#ffd700' : (hmLvl >= 5 ? '#e2e8f0' : sCol.main);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x, helmY, 7.5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Ngọc đính giữa khôi giáp
      ctx.fillStyle = hmR >= 2 ? '#ef4444' : sCol.main;
      ctx.beginPath();
      ctx.arc(x + facing * 1.5, helmY - 1, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. THẦN BINH / VŨ KHÍ HIỂN THỊ (WEAPON RES)
    if (eq.weapon) {
      const wp = eq.weapon;
      const wDetail = Number(wp.d) || 0;
      const wKind = Number(wp.k) || 0;
      const wRarity = Number(wp.r) || 0;
      const wEnh = Number(wp.enh) || 0;

      ctx.save();

      // Tọa độ tay cầm vũ khí
      let handX = x + facing * 11;
      let handY = y - 23;

      // Góc nghiêng theo hành động
      let rotAngle = 0;
      if (act === 'at') {
        // Vung chém cực mạnh khi xuất chiêu
        const progress = Math.min(1, Math.max(0, (actT || 0) / 0.35));
        rotAngle = facing * (-1.1 + progress * 2.5);
      } else if (act === 'run') {
        // Chếch ra sau theo nhịp chạy
        rotAngle = facing * (0.6 + Math.sin(t * 12) * 0.15);
      } else {
        // Tư thế thủ sẵn sàng
        rotAngle = facing * (-0.35 + Math.sin(t * 2) * 0.05);
      }

      ctx.translate(handX, handY);
      ctx.rotate(rotAngle);

      // Màu hào quang phát sáng theo phẩm chất vũ khí
      let auraGlowColor = null;
      let bladeMainColor = '#e2e8f0';
      let bladeEdgeColor = '#94a3b8';
      let hiltColor = '#78350f';

      if (wRarity >= 4) {
        // Bạch Kim: Lôi điện tuyết lam
        auraGlowColor = '#38bdf8';
        bladeMainColor = '#f0f9ff';
        bladeEdgeColor = '#0284c7';
        hiltColor = '#1e293b';
      } else if (wRarity === 3) {
        // Tím: Tử quang ma kiếm
        auraGlowColor = '#c084fc';
        bladeMainColor = '#faf5ff';
        bladeEdgeColor = '#9333ea';
        hiltColor = '#581c87';
      } else if (wRarity >= 2) {
        // Hoàng Kim: Ánh vàng kim hoàng rực rỡ
        auraGlowColor = '#ffd700';
        bladeMainColor = '#fef08a';
        bladeEdgeColor = '#ca8a04';
        hiltColor = '#b45309';
      }

      if (auraGlowColor) {
        ctx.shadowColor = auraGlowColor;
        ctx.shadowBlur = wEnh >= 8 ? 14 : 9;
      }

      // Vẽ hình dáng từng loại vũ khí
      if (wDetail === 0) {
        // VŨ KHÍ CẬN CHIẾN
        if (wKind === 1) {
          // A. ĐAO (Broadsword): Lưỡi đao cong bản rộng
          // Cán đao
          ctx.fillStyle = hiltColor;
          ctx.fillRect(-2, 0, 4, 7);
          // Hộ thủ đao
          ctx.fillStyle = auraGlowColor || '#f59e0b';
          ctx.fillRect(-5, -2, 10, 2.5);
          // Thân & lưỡi đao
          ctx.fillStyle = bladeMainColor;
          ctx.strokeStyle = bladeEdgeColor;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(-2.5, -2);
          ctx.lineTo(-3.5, -20);
          ctx.quadraticCurveTo(-1, -27, 4, -25);
          ctx.lineTo(2.5, -2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (wKind === 2) {
          // B. CÔN / BỔNG (Staff - Đả Cẩu Bổng): Thân gậy ngọc/thiết bọc đồng 2 đầu
          ctx.fillStyle = (wRarity >= 2) ? '#22c55e' : '#78350f';
          ctx.fillRect(-2, -26, 4, 38);
          // Bọc kim loại 2 đầu
          ctx.fillStyle = auraGlowColor || '#ffd700';
          ctx.fillRect(-2.8, -26, 5.6, 6);
          ctx.fillRect(-2.8, 6, 5.6, 6);
        } else if (wKind === 3) {
          // C. THƯƠNG / MÂU (Spear): Cán dài và mũi thương nhọn có tua đỏ
          ctx.fillStyle = '#78350f';
          ctx.fillRect(-1.5, -26, 3, 40);
          // Tua đỏ
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(0, -25, 3.5, 0, Math.PI * 2);
          ctx.fill();
          // Mũi thương nhọn
          ctx.fillStyle = bladeMainColor;
          ctx.strokeStyle = bladeEdgeColor;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(-3, -25);
          ctx.lineTo(0, -36);
          ctx.lineTo(3, -25);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (wKind === 4) {
          // D. CHÙY (Warhammer): Chùy nặng bát giác
          ctx.fillStyle = '#475569';
          ctx.fillRect(-2, -18, 4, 26);
          ctx.fillStyle = bladeMainColor;
          ctx.strokeStyle = bladeEdgeColor;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(0, -20, 6.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else {
          // E. KIẾM (Sword - Mặc định): Kiếm thanh thoát, mũi nhọn 2 lưỡi
          // Cán kiếm
          ctx.fillStyle = hiltColor;
          ctx.fillRect(-1.5, 0, 3, 6);
          // Chuôi kiếm (Pommel)
          ctx.fillStyle = auraGlowColor || '#f59e0b';
          ctx.beginPath();
          ctx.arc(0, 7, 2.5, 0, Math.PI * 2);
          ctx.fill();
          // Hộ thủ kiếm (Crossguard)
          ctx.fillRect(-5, -2, 10, 2.5);
          // Lưỡi kiếm sắc bén
          ctx.fillStyle = bladeMainColor;
          ctx.strokeStyle = bladeEdgeColor;
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.moveTo(-2, -2);
          ctx.lineTo(-2, -22);
          ctx.lineTo(0, -28);
          ctx.lineTo(2, -22);
          ctx.lineTo(2, -2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          // Sống kiếm phản quang (Fuller groove)
          ctx.strokeStyle = auraGlowColor || '#fff';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(0, -2);
          ctx.lineTo(0, -23);
          ctx.stroke();
        }
      } else {
        // VŨ KHÍ ÁM KHÍ / CUNG
        if (wKind === 1) {
          // Cung tên
          ctx.strokeStyle = auraGlowColor || '#d97706';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(0, -5, 14, -Math.PI * 0.4, Math.PI * 0.4);
          ctx.stroke();
          // Dây cung
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(5, -16);
          ctx.lineTo(5, 6);
          ctx.stroke();
        } else {
          // Phi Đao / Ám Khí
          ctx.fillStyle = bladeMainColor;
          ctx.strokeStyle = auraGlowColor || '#38bdf8';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, -18);
          ctx.lineTo(3.5, -6);
          ctx.lineTo(0, -2);
          ctx.lineTo(-3.5, -6);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }

      // Tia sét lôi điện thần binh (Cường hóa cao +8..+16)
      if (wEnh >= 8 || wRarity >= 4) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.2;
        const sparkPhase = Math.floor(t * 15) % 3;
        ctx.beginPath();
        if (sparkPhase === 0) {
          ctx.moveTo(-3, -12); ctx.lineTo(-1, -16); ctx.lineTo(-4, -20);
        } else if (sparkPhase === 1) {
          ctx.moveTo(3, -10); ctx.lineTo(1, -15); ctx.lineTo(4, -19);
        } else {
          ctx.moveTo(-2, -22); ctx.lineTo(2, -24); ctx.lineTo(0, -28);
        }
        ctx.stroke();
      }

      ctx.restore();

      // 4. VỆT KIẾM KHÍ / ĐAO KHÍ KHI TẤN CÔNG (SLASH ARC EFFECT)
      if (act === 'at') {
        ctx.save();
        const slashProgress = Math.min(1, Math.max(0, (actT || 0) / 0.35));
        const slashAlpha = Math.max(0, 1 - slashProgress * 1.3);
        if (slashAlpha > 0.05) {
          ctx.globalAlpha = slashAlpha;
          ctx.strokeStyle = auraGlowColor || sCol.main;
          ctx.shadowColor = auraGlowColor || sCol.main;
          ctx.shadowBlur = 10;
          ctx.lineWidth = 3;
          ctx.beginPath();
          const startArc = facing > 0 ? -Math.PI * 0.45 : Math.PI * 0.55;
          const endArc = facing > 0 ? Math.PI * 0.35 : Math.PI * 1.35;
          ctx.arc(handX + facing * 8, handY, 28, startArc, endArc, facing < 0);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }

  window.drawHeroEquipment = drawHeroEquipment;
})();
