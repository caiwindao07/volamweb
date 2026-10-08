/* ==========================================================================
   VÕ LÂM TRUYỀN KỲ - HỆ THỐNG BẠN ĐỒNG HÀNH (PARTNER / COMPANION SYSTEM)
   - Port chuẩn từ module DongHanh_Temp_Port & KPlayerPartner trong H:\JxPhaThien
   - Xuất chiến Pet hỗ trợ chiến đấu, đi theo sau lưng chủ nhân trên Canvas
   - 5 Bạn Đồng Hành danh tiếng ngũ hành với avatar & sprite động chuẩn PC
   - 5 Ô Trang Bị Đồng Hành (Vũ khí, Nón, Áo, Hộ uyển, Giày)
   - 10 Kỹ năng Pet & Buff điểm tiềm năng (STR, DEX, VIT, ENG, Kháng, Hút máu)
   ========================================================================== */

(function(window) {
  'use strict';

  // Danh mục 5 Bạn Đồng Hành Danh Tiếng
  const COMPANIONS_DB = {
    1: {
      id: 1,
      name: 'Yến Tiểu Lâu',
      title: 'Kiếm Ảnh Giang Hồ',
      series: 0, // Kim
      seriesName: 'Kim',
      avatar: 'img/pet/boss025.png',
      desc: 'Xuất thân danh gia vọng tộc, kiếm pháp xuất thần nhập hóa, chuyên khắc chế hệ Mộc.',
      baseBuff: { str: 45, atkPct: 15, resAll: 15, runSpd: 10 },
      skills: ['Kiếm Vũ Cửu Thiên', 'Kim Chung Tráo', 'Phá Giáp Kích', 'Thiên Cang Khí']
    },
    2: {
      id: 2,
      name: 'Độc Cô Cửu Kiếm',
      title: 'Kiếm Ma Truyền Nhân',
      series: 1, // Mộc
      seriesName: 'Mộc',
      avatar: 'img/pet/boss026.png',
      desc: 'Độc cô cầu bại, chiêu thức biến ảo vô cùng, gây sát thương trúng độc liên hoàn.',
      baseBuff: { dex: 50, critPct: 12, poisonDmg: 200, dodgePct: 8 },
      skills: ['Phá Kiếm Thức', 'Vạn Kiếm Quy Tông', 'Độc Cốt Chưởng', 'Bất Diệt Ý']
    },
    3: {
      id: 3,
      name: 'Đường Bất Nhiễm',
      title: 'Thiên Cơ Các Chủ',
      series: 2, // Thủy
      seriesName: 'Thủy',
      avatar: 'img/pet/boss027.png',
      desc: 'Tuyệt đỉnh ám khí và bẫy rập Đường Môn, làm chậm và đóng băng kẻ địch xung quanh.',
      baseBuff: { vit: 55, hpMax: 1500, slowRes: 25, lifeSteal: 6 },
      skills: ['Bạo Vũ Lê Hoa', 'Băng Phách Ngân Châm', 'Hộ Thể Chân Khí', 'Thiên Cơ Lôi']
    },
    4: {
      id: 4,
      name: 'Huyền Giác Thiền Sư',
      title: 'Bồ Đề Cao Tăng',
      series: 4, // Thổ
      seriesName: 'Thổ',
      avatar: 'img/pet/boss028.png',
      desc: 'Đại sư Thiếu Lâm phái, thân thể kim cang bất hoại, tăng phòng ngự và sinh lực tối đa.',
      baseBuff: { vit: 60, eng: 40, resAll: 30, dmgReduce: 12 },
      skills: ['Kim Cang Phục Ma', 'Sư Tử Hống', 'Bồ Đề Tâm Pháp', 'Đại Lực Kim Cương']
    },
    5: {
      id: 5,
      name: 'Thanh Y Nữ Hiệp',
      title: 'Thúy Yên Tiên Tử',
      series: 3, // Hỏa
      seriesName: 'Hỏa',
      avatar: 'img/pet/boss029.png',
      desc: 'Nhu tình song kiếm rực lửa, tăng tốc độ xuất chiêu và sát thương chí mạng cực đại.',
      baseBuff: { str: 40, dex: 40, atkSpd: 20, critDmg: 35 },
      skills: ['Liệt Hỏa Băng Tâm', 'Bách Hoa Loạn Vũ', 'Phượng Vũ Cửu Thiên', 'Lưu Ly Thể']
    }
  };

  const COMPANION_SYSTEM = {
    petPos: { x: 0, y: 0, dir: 0, atkT: 0 },
    imgCache: {},

    // Khởi tạo dữ liệu người chơi
    init() {
      if (window.S) {
        if (!S.companion || !S.companion.list) {
          S.companion = {
            activeId: null, // Chưa có pet xuất chiến
            selectedTabId: 1,
            list: {
              1: { id: 1, lvl: 1, exp: 0, intimacy: 0, maxIntimacy: 100, star: 0, equips: { weapon: 0, helm: 0, armor: 0, gloves: 0, boots: 0 } },
              2: { id: 2, lvl: 1, exp: 0, intimacy: 0, maxIntimacy: 100, star: 0, equips: { weapon: 0, helm: 0, armor: 0, gloves: 0, boots: 0 } },
              3: { id: 3, lvl: 1, exp: 0, intimacy: 0, maxIntimacy: 100, star: 0, equips: { weapon: 0, helm: 0, armor: 0, gloves: 0, boots: 0 } },
              4: { id: 4, lvl: 1, exp: 0, intimacy: 0, maxIntimacy: 100, star: 0, equips: { weapon: 0, helm: 0, armor: 0, gloves: 0, boots: 0 } },
              5: { id: 5, lvl: 1, exp: 0, intimacy: 0, maxIntimacy: 100, star: 0, equips: { weapon: 0, helm: 0, armor: 0, gloves: 0, boots: 0 } }
            }
          };
        }
      }
      this.preloadImages();
      this.setupHudButton();
    },

    // Nạp trước ảnh sprite đồng hành
    preloadImages() {
      for (const id in COMPANIONS_DB) {
        const c = COMPANIONS_DB[id];
        if (!this.imgCache[c.avatar]) {
          const img = new Image();
          img.src = c.avatar;
          this.imgCache[c.avatar] = img;
        }
      }
    },

    // Nút mở Bạn Đồng Hành đã có trên thanh điều hướng dưới (btnOpenPet)
    setupHudButton() {
      // Đã chuyển xuống thanh chức năng bên dưới
    },

    // Bật/tắt cửa sổ Bạn Đồng Hành
    toggleWindow() {
      this.init();
      let win = document.getElementById('fw-companion');
      if (!win) {
        this.renderWindow();
        return;
      }
      if (win.classList.contains('hidden')) {
        this.renderWindow();
        win.classList.remove('hidden');
      } else {
        win.classList.add('hidden');
      }
    },

    // Lấy thông tin đồng hành đang xuất chiến
    getActiveCompanion() {
      if (!window.S || !S.companion || !S.companion.activeId || !S.companion.list) return null;
      const data = S.companion.list[S.companion.activeId];
      const meta = COMPANIONS_DB[S.companion.activeId];
      if (!data || !meta) return null;
      return { ...meta, ...data };
    },

    // Xuất chiến / Thu hồi
    toggleCallOut(petId) {
      this.init();
      if (!window.S || !S.companion) return;
      if (S.companion.activeId === petId) {
        S.companion.activeId = null;
        if (typeof toast === 'function') toast('🐾 Đã thu hồi Bạn Đồng Hành.');
      } else {
        S.companion.activeId = petId;
        const pet = COMPANIONS_DB[petId];
        if (typeof toast === 'function') toast(`🐾 Bạn Đồng Hành [${pet ? pet.name : petId}] đã xuất chiến!`);
        if (typeof uiSfx === 'function') uiSfx('levelup');
      }
      if (typeof save === 'function') save();
      if (typeof recalcStats === 'function') recalcStats();
      this.renderWindow();
    },

    // Tặng quà tăng Thân Mật và EXP cho Bạn Đồng Hành
    giftCompanion(petId) {
      this.init();
      if (!window.S || !S.companion || !S.companion.list) return;
      const p = S.companion.list[petId];
      if (!p) return;

      const costGold = 50000;
      if ((S.gold || 0) < costGold) {
        if (typeof toast === 'function') toast('❌ Không đủ 50,000 Vàng để mua Quà Tặng Đồng Hành!');
        return;
      }

      S.gold -= costGold;
      p.intimacy = Math.min(100, p.intimacy + 15);
      p.exp += 120;
      const needExp = p.lvl * 100;
      if (p.exp >= needExp) {
        p.exp -= needExp;
        p.lvl++;
        if (typeof toast === 'function') toast(`🎉 Đồng Hành [${COMPANIONS_DB[petId] ? COMPANIONS_DB[petId].name : petId}] đã lên cấp ${p.lvl}!`);
        if (typeof uiSfx === 'function') uiSfx('levelup');
      } else {
        if (typeof toast === 'function') toast(`🎁 Tặng quà thành công! Thân mật +15, EXP +120.`);
      }

      if (typeof save === 'function') save();
      if (typeof recalcStats === 'function') recalcStats();
      this.renderWindow();
    },

    // Nâng cấp trang bị đồng hành
    upgradeEquip(petId, slot) {
      this.init();
      if (!window.S || !S.companion || !S.companion.list) return;
      const p = S.companion.list[petId];
      if (!p) return;

      p.equips = p.equips || { weapon: 0, helm: 0, armor: 0, gloves: 0, boots: 0 };
      const curLv = p.equips[slot] || 0;
      const costGold = (curLv + 1) * 60000;
      if ((S.gold || 0) < costGold) {
        if (typeof toast === 'function') toast(`❌ Cần ${costGold.toLocaleString()} Vàng để nâng cấp trang bị!`);
        return;
      }

      S.gold -= costGold;
      p.equips[slot] = curLv + 1;
      if (typeof toast === 'function') toast(`🔨 Nâng cấp trang bị Đồng Hành lên Cấp ${curLv + 1}!`);
      if (typeof save === 'function') save();
      if (typeof recalcStats === 'function') recalcStats();
      this.renderWindow();
    },

    // Mở popup chọn trang bị từ túi của chủ nhân để mặc cho Bạn Đồng Hành
    openEquipSelectModal(petId, slot) {
      this.init();
      if (!window.S || !S.companion || !S.companion.list) return;
      const p = S.companion.list[petId];
      if (!p) return;
      p.items = p.items || { weapon: null, helm: null, armor: null, gloves: null, boots: null };

      const slotNames = { weapon: 'Vũ Khí', helm: 'Mũ (Nón)', armor: 'Áo Giáp', gloves: 'Hộ Uyển', boots: 'Giày' };
      // Map slot đồng hành sang mã detail d trong JX:
      // weapon: d === 0 || d === 1
      // helm: d === 7
      // armor: d === 2
      // gloves: d === 8
      // boots: d === 5
      const validDetails = {
        weapon: [0, 1],
        helm: [7],
        armor: [2],
        gloves: [8],
        boots: [5]
      }[slot] || [];

      const curItem = p.items[slot];
      const invCandidates = (S.inv || []).filter(it => it && validDetails.includes(it.d));

      const candHtml = invCandidates.map(it => {
        const rarCol = (typeof RAR_COL !== 'undefined' && RAR_COL[it.r]) || '#ffd700';
        return `
          <div style="background:#1a140d;border:1px solid #5a4425;border-radius:4px;padding:6px 8px;display:flex;justify-content:space-between;align-items:center;">
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:34px;height:34px;border:1px solid ${rarCol};border-radius:4px;background:#000;display:grid;place-items:center;flex-shrink:0;">
                ${it.ic ? `<img src="${esc(it.ic)}" style="max-width:28px;max-height:28px;">` : ''}
              </div>
              <div>
                <b style="color:${rarCol};font-size:12px;">${esc(it.n)}${it.enh ? ` +${it.enh}` : ''}</b>
                <div style="font-size:10px;color:#a39276;">Cấp ${it.lvl} · ${(it.mag || []).length} dòng ma pháp</div>
              </div>
            </div>
            <div>
              <button class="jx-action-btn gold" onclick="COMPANION_SYSTEM.equipPlayerItem(${petId}, '${slot}', ${it.uid})" style="padding:4px 8px;font-size:11px;">
                Mặc Cho Pet
              </button>
            </div>
          </div>
        `;
      }).join('');

      const modalHtml = `
        <div class="jx-client-window" style="margin:-14px;border:none;box-shadow:none;min-width:440px;">
          <div class="jx-window-header">
            <span class="jx-window-title">🐾 TRANG BỊ CHO ĐỒNG HÀNH: ${slotNames[slot]}</span>
          </div>
          <div style="padding:10px;background:#15100c;">
            ${curItem ? `
              <div style="background:#22150b;border:1.5px solid #d4af37;border-radius:5px;padding:8px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <div style="width:36px;height:36px;border:1px solid #ffd700;background:#000;display:grid;place-items:center;">
                    ${curItem.ic ? `<img src="${esc(curItem.ic)}" style="max-width:30px;max-height:30px;">` : ''}
                  </div>
                  <div>
                    <span style="font-size:10px;color:#cbd5e1;">Đang trang bị:</span>
                    <div style="color:#ffd700;font-weight:bold;font-size:12px;">${esc(curItem.n)}${curItem.enh ? ` +${curItem.enh}` : ''}</div>
                  </div>
                </div>
                <button class="jx-action-btn" onclick="COMPANION_SYSTEM.unequipPlayerItem(${petId}, '${slot}')" style="padding:4px 10px;font-size:11px;color:#ef4444;border-color:#ef4444;">
                  Tháo Về Túi
                </button>
              </div>
            ` : '<div style="color:#888;font-size:11px;margin-bottom:8px;text-align:center;">Vị trí này đang trống. Hãy chọn trang bị từ túi của bạn bên dưới:</div>'}

            <div style="font-size:11px;font-weight:bold;color:#ffd700;margin-bottom:6px;">TRANG BỊ HỢP LỆ TRONG HÀNH TRANG:</div>
            <div style="display:flex;flex-direction:column;gap:5px;max-height:240px;overflow-y:auto;">
              ${candHtml || '<div style="text-align:center;padding:20px;color:#888;">Không có trang bị loại này trong hành trang.</div>'}
            </div>
          </div>
          <div style="padding:6px 12px;border-top:1px solid #3d2f1d;background:#0d0a07;text-align:right;">
            <button class="jx-action-btn" onclick="closeModal();">Đóng</button>
          </div>
        </div>
      `;

      if (typeof modal === 'function') {
        modal(modalHtml, () => {});
      }
    },

    // Mặc trang bị từ túi vào cho Bạn Đồng Hành
    equipPlayerItem(petId, slot, uid) {
      if (!window.S || !S.inv) return;
      const p = S.companion.list[petId];
      if (!p) return;
      p.items = p.items || { weapon: null, helm: null, armor: null, gloves: null, boots: null };

      const itemIdx = S.inv.findIndex(x => x && x.uid === uid);
      if (itemIdx === -1) {
        if (typeof toast === 'function') toast('Trang bị không còn trong túi!');
        return;
      }
      const itemToEquip = S.inv.splice(itemIdx, 1)[0];

      // Nếu pet đang mặc món cũ -> tháo về túi
      if (p.items[slot]) {
        S.inv.push(p.items[slot]);
      }

      p.items[slot] = itemToEquip;
      if (typeof closeModal === 'function') closeModal();
      if (typeof uiSfx === 'function') uiSfx('dropWeapon');
      if (typeof toast === 'function') toast(`🐾 Đã mặc [${itemToEquip.n}] cho Bạn Đồng Hành!`);
      if (typeof save === 'function') save();
      if (typeof recalcStats === 'function') recalcStats();
      if (typeof refresh === 'function') refresh();
      this.renderWindow();
    },

    // Tháo trang bị của đồng hành về túi
    unequipPlayerItem(petId, slot) {
      if (!window.S || !S.inv) return;
      const p = S.companion.list[petId];
      if (!p || !p.items || !p.items[slot]) return;

      if (S.inv.length >= (typeof INV_MAX !== 'undefined' ? INV_MAX : 1000)) {
        if (typeof toast === 'function') toast('❌ Hành trang đã đầy!');
        return;
      }

      const item = p.items[slot];
      p.items[slot] = null;
      S.inv.push(item);

      if (typeof closeModal === 'function') closeModal();
      if (typeof uiSfx === 'function') uiSfx('dropOther');
      if (typeof toast === 'function') toast(`🐾 Đã tháo [${item.n}] về hành trang!`);
      if (typeof save === 'function') save();
      if (typeof recalcStats === 'function') recalcStats();
      if (typeof refresh === 'function') refresh();
      this.renderWindow();
    },

    // Tính tổng chỉ số buff cho người chơi
    getBuffStats() {
      const active = this.getActiveCompanion();
      if (!active) return null;

      const lvlMult = 1 + (active.lvl - 1) * 0.08;
      const intimMult = (active.intimacy >= 60) ? 1.0 : (active.intimacy / 60);

      const buff = {
        str: Math.round((active.baseBuff.str || 0) * lvlMult * intimMult),
        dex: Math.round((active.baseBuff.dex || 0) * lvlMult * intimMult),
        vit: Math.round((active.baseBuff.vit || 0) * lvlMult * intimMult),
        eng: Math.round((active.baseBuff.eng || 0) * lvlMult * intimMult),
        resAll: Math.round((active.baseBuff.resAll || 0) * lvlMult * intimMult),
        hpMax: Math.round((active.baseBuff.hpMax || 0) * lvlMult * intimMult),
        atkPct: Math.round((active.baseBuff.atkPct || 0) * lvlMult * intimMult),
        critPct: Math.round((active.baseBuff.critPct || 0) * lvlMult * intimMult),
        lifeSteal: Math.round((active.baseBuff.lifeSteal || 0) * lvlMult * intimMult)
      };

      // 1. Cộng thêm từ cấp cường hóa 5 món trang bị pet cơ bản
      if (active.equips) {
        for (const slot in active.equips) {
          const eqLv = active.equips[slot] || 0;
          buff.str += eqLv * 5;
          buff.dex += eqLv * 5;
          buff.hpMax += eqLv * 150;
        }
      }

      // 2. CỘNG THÊM TỪ TRANG BỊ CHỦ NHÂN MẶC CHO ĐỒNG HÀNH (S.items)
      if (active.items) {
        for (const slot in active.items) {
          const it = active.items[slot];
          if (!it) continue;
          // Thuộc tính cơ bản của trang bị (base)
          if (it.base) {
            for (const [id, mn, mx] of it.base) {
              const val = Math.round((mn + mx) / 2);
              if (id === 34 || id === 105) buff.hpMax += val; // Sinh lực
              else if (id === 32) buff.str += val;           // Sức mạnh
              else if (id === 33) buff.dex += val;           // Thân pháp
              else if (id === 35) buff.eng += val;           // Nội công
              else if (id === 98 || id === 101) buff.resAll += val; // Kháng
            }
          }
          // Dòng ma pháp của trang bị (mag)
          if (it.mag) {
            for (const m of it.mag) {
              const p = m.p || [];
              const val = p[0] || 0;
              const aName = (typeof attrName === 'function') ? attrName(m.a) : '';
              if (aName === 'allres_p') buff.resAll += val;
              else if (aName === 'lifemax_v') buff.hpMax += val;
              else if (aName === 'strength_v') buff.str += val;
              else if (aName === 'dexterity_v') buff.dex += val;
              else if (aName === 'vitality_v') buff.vit += val;
              else if (aName === 'energy_v') buff.eng += val;
              else if (aName === 'steallifeenhance_p') buff.lifeSteal += val;
              else if (aName === 'deadlystrike_p') buff.critPct += val;
            }
          }
        }
      }

      return buff;
    },

    // Cập nhật vị trí và chiến đấu của Pet theo sau người chơi
    update(dt) {
      const active = this.getActiveCompanion();
      if (!active || typeof H === 'undefined' || !H.x) return;

      // Vị trí mục tiêu: đi sau lưng chủ nhân cách 55px
      const targetDist = 55;
      const angle = (H.dir || 0) * Math.PI / 4 + Math.PI; // Ngược hướng chủ nhân
      const tx = H.x + Math.cos(angle) * targetDist;
      const ty = H.y + Math.sin(angle) * targetDist;

      if (!this.petPos.x) {
        this.petPos.x = tx;
        this.petPos.y = ty;
      } else {
        const dx = tx - this.petPos.x;
        const dy = ty - this.petPos.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 5) {
          const moveDist = Math.min(dist, 160 * dt);
          this.petPos.x += (dx / dist) * moveDist;
          this.petPos.y += (dy / dist) * moveDist;
        }
      }

      // Hỗ trợ tấn công quái
      if (this.petPos.atkT > 0) this.petPos.atkT -= dt;
      if (this.petPos.atkT <= 0 && typeof R !== 'undefined' && R.enemies && R.enemies.length) {
        const target = R.enemies.find(e => e && e.hp > 0 && !e.dead);
        if (target) {
          const dTarget = Math.hypot(target.x - this.petPos.x, target.y - this.petPos.y);
          if (dTarget < 450) {
            this.petPos.atkT = 2.2; // Tấn công mỗi 2.2 giây
            // Tạo hiệu ứng kiếm khí / chưởng pháp hỗ trợ
            if (typeof R.fx !== 'undefined') {
              R.fx.push({
                x0: this.petPos.x,
                y0: this.petPos.y - 15,
                x1: target.x,
                y1: target.y - 20,
                t: 0,
                dur: 0.35,
                col: '#ffd700',
                txt: `🐾 ${active.skills[0]}`
              });
            }
            // Gây sát thương phụ trợ cho quái
            const petDmg = Math.round((R.power || 500) * 0.22);
            target.hp -= petDmg;
            if (typeof R.txt !== 'undefined') {
              R.txt.push({ x: target.x, y: target.y - 30, text: `-${petDmg} [Đồng Hành]`, col: '#ff9900', t: 1.2 });
            }
          }
        }
      }
    },

    // Vẽ Bạn Đồng Hành trên Canvas
    drawPet(ctx, dt) {
      const active = this.getActiveCompanion();
      if (!active || !this.petPos.x) return;

      const px = this.petPos.x;
      const py = this.petPos.y;

      ctx.save();

      // 1. Bóng chân
      ctx.beginPath();
      ctx.ellipse(px, py, 14, 7, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fill();

      // 2. Sprite Bạn Đồng Hành
      const img = this.imgCache[active.avatar];
      if (img && img.complete && img.naturalWidth) {
        // Vẽ thu nhỏ vừa vặn kích thước hiệp khách (khoảng 48x48)
        const dw = 48, dh = 48;
        ctx.drawImage(img, px - dw / 2, py - dh + 6, dw, dh);
      } else {
        // Fallback vẽ avatar mặc định
        ctx.beginPath();
        ctx.arc(px, py - 20, 16, 0, Math.PI * 2);
        ctx.fillStyle = '#ffcc00';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // 3. Tên và danh hiệu trên đầu Pet
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';

      // Danh hiệu
      ctx.fillStyle = '#66ccff';
      ctx.fillText(`[${active.title}]`, px, py - 46);

      // Tên bạn đồng hành
      ctx.fillStyle = '#ffd700';
      ctx.fillText(`${active.name} (Lv.${active.lvl})`, px, py - 35);

      ctx.restore();
    },

    // Hiển thị giao diện cửa sổ Bạn Đồng Hành
    renderWindow() {
      this.init();
      let win = document.getElementById('fw-companion');
      if (!win) {
        win = document.createElement('div');
        win.id = 'fw-companion';
        win.className = 'jx-float-win';
        win.style.cssText = 'width: 520px; z-index: 1000;';
        const container = document.querySelector('.jx-float-windows-layer') || document.body;
        container.appendChild(win);
      }

      const curId = (window.S && S.companion && (S.companion.selectedTabId || S.companion.activeId)) || 1;
      const meta = COMPANIONS_DB[curId] || COMPANIONS_DB[1];
      const data = (window.S && S.companion && S.companion.list && S.companion.list[curId]) || { lvl: 1, exp: 0, intimacy: 80, equips: {} };
      const isActive = !!(window.S && S.companion && S.companion.activeId === curId);

      let petTabsHtml = '';
      for (const id in COMPANIONS_DB) {
        const c = COMPANIONS_DB[id];
        const isSel = Number(id) === Number(curId);
        const isAct = !!(window.S && S.companion && S.companion.activeId === Number(id));
        petTabsHtml += `
          <button onclick="if(window.S&&S.companion)S.companion.selectedTabId=${id};COMPANION_SYSTEM.renderWindow();" 
            style="background:${isSel ? '#4a3820' : '#221810'};border:1px solid ${isSel ? '#ffd700' : '#5a4425'};color:${isSel ? '#ffd700' : '#aaa'};padding:6px 10px;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;display:flex;align-items:center;gap:4px;">
            <span>${c.name}</span>
            ${isAct ? '<span style="color:#a0ffa0;font-size:10px;">[Xuất chiến]</span>' : ''}
          </button>
        `;
      }

      const needExp = data.lvl * 100;
      const expPct = Math.min(100, Math.round((data.exp / needExp) * 100));

      const buff = this.getBuffStats() || {};

      let html = `
        <div class="jx-window-header" style="background:#2b1f13;border-bottom:2px solid #7d5e2a;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;">
          <b style="color:#ffd700;font-size:14px;">🐾 THÔNG TIN BẠN ĐỒNG HÀNH (PARTNER)</b>
          <button onclick="document.getElementById('fw-companion').classList.add('hidden')" style="background:none;border:none;color:#ff9999;font-size:16px;cursor:pointer;">✕</button>
        </div>

        <div style="padding:12px;background:#15100c;color:#d8cbb8;font-family:sans-serif;">
          <!-- Tabs chọn đồng hành -->
          <div style="display:flex;gap:6px;margin-bottom:12px;overflow-x:auto;padding-bottom:4px;">
            ${petTabsHtml}
          </div>

          <!-- Khung chi tiết đồng hành -->
          <div style="display:grid;grid-template-columns:160px 1fr;gap:14px;background:#1e1610;border:1px solid #4a3820;padding:12px;border-radius:6px;">
            <!-- Cột trái: Avatar & Xuất chiến -->
            <div style="text-align:center;">
              <div style="width:130px;height:140px;background:#0d0906;border:2px solid #7d5e2a;border-radius:6px;margin:0 auto 10px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;">
                <img src="${meta.avatar}" style="max-width:100%;max-height:100%;object-fit:contain;">
                <span style="position:absolute;bottom:4px;right:4px;background:#7d5e2a;color:#fff;font-size:10px;padding:1px 5px;border-radius:3px;">Hệ ${meta.seriesName}</span>
              </div>
              <b style="color:#ffd700;font-size:14px;display:block;">${meta.name}</b>
              <span style="color:#66ccff;font-size:11px;display:block;margin-bottom:8px;">[${meta.title}]</span>

              <button onclick="COMPANION_SYSTEM.toggleCallOut(${meta.id})" 
                style="width:100%;background:${isActive ? '#8b2500' : '#2e6b2e'};border:1px solid ${isActive ? '#ff6666' : '#66ff66'};color:#fff;padding:6px;border-radius:4px;font-weight:bold;font-size:12px;cursor:pointer;">
                ${isActive ? 'Thu Hồi' : 'Xuất Chiến'}
              </button>

              <button onclick="COMPANION_SYSTEM.giftCompanion(${meta.id})" 
                style="width:100%;margin-top:6px;background:#4a3820;border:1px solid #b89040;color:#ffd700;padding:5px;border-radius:4px;font-size:11px;cursor:pointer;" title="Tốn 50,000 Vàng tăng Thân Mật và EXP">
                🎁 Tặng Quà (5 Vạn)
              </button>
            </div>

            <!-- Cột phải: Chỉ số, kinh nghiệm, kỹ năng & trang bị -->
            <div>
              <div style="margin-bottom:8px;">
                <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px;">
                  <span>Cấp độ: <b style="color:#fff;">${data.lvl}</b></span>
                  <span>Kinh nghiệm: <b style="color:#66ccff;">${data.exp} / ${needExp} (${expPct}%)</b></span>
                </div>
                <div style="background:#090705;height:8px;border-radius:4px;overflow:hidden;border:1px solid #443322;">
                  <div style="width:${expPct}%;height:100%;background:#38bdf8;"></div>
                </div>
              </div>

              <div style="margin-bottom:10px;">
                <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px;">
                  <span>Độ thân mật: <b style="color:#a0ffa0;">${data.intimacy} / 100</b></span>
                  <span style="font-size:11px;color:#888;">(>=60 phát huy 100% thuộc tính)</span>
                </div>
                <div style="background:#090705;height:8px;border-radius:4px;overflow:hidden;border:1px solid #443322;">
                  <div style="width:${data.intimacy}%;height:100%;background:#4ade80;"></div>
                </div>
              </div>

              <!-- 5 Ô Trang Bị Đồng Hành (Cho phép mặc đồ từ rương người chơi) -->
              <div style="border-top:1px solid #3c2a1a;padding-top:8px;margin-bottom:10px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                  <b style="font-size:12px;color:#ffd700;">Trang Bị Đồng Hành (5 ô):</b>
                  <span style="font-size:9.5px;color:#cbd5e1;">Bấm vào ô để mặc đồ từ túi</span>
                </div>
                <div style="display:grid;grid-template-columns:repeat(5, 1fr);gap:4px;">
                  ${['weapon', 'helm', 'armor', 'gloves', 'boots'].map(slot => {
                    const slotNames = { weapon: 'Vũ Khí', helm: 'Mũ', armor: 'Áo', gloves: 'Hộ Uyển', boots: 'Giày' };
                    const curEqItem = data.items && data.items[slot];
                    const lv = (data.equips && data.equips[slot]) || 0;
                    const rarCol = curEqItem ? ((typeof RAR_COL !== 'undefined' && RAR_COL[curEqItem.r]) || '#ffd700') : '#5a4425';
                    return `
                      <button onclick="COMPANION_SYSTEM.openEquipSelectModal(${meta.id}, '${slot}')" 
                        style="background:#110c08;border:1.5px solid ${curEqItem ? rarCol : '#5a4425'};color:#d8cbb8;padding:4px 2px;border-radius:4px;font-size:10px;text-align:center;cursor:pointer;min-height:52px;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;" title="${curEqItem ? `[${curEqItem.n}] - Bấm để thay hoặc tháo đồ` : `[${slotNames[slot]}] Chưa mặc - Bấm để chọn từ túi`}">
                        ${curEqItem && curEqItem.ic ? `<img src="${esc(curEqItem.ic)}" style="max-width:24px;max-height:24px;margin-bottom:2px;">` : `<div style="font-size:16px;line-height:1;margin-bottom:2px;">⚔️</div>`}
                        <div style="font-size:9.5px;color:${curEqItem ? rarCol : '#a39276'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:54px;">${curEqItem ? esc(curEqItem.n) : slotNames[slot]}</div>
                        <span style="font-size:8.5px;color:#fbbf24;">+${lv}</span>
                      </button>
                    `;
                  }).join('')}
                </div>
              </div>

              <!-- Kỹ Năng & Thuộc Tính Buff -->
              <div style="border-top:1px solid #3c2a1a;padding-top:8px;">
                <b style="font-size:12px;color:#ffd700;display:block;margin-bottom:4px;">Kỹ Năng & Thuộc Tính Hỗ Trợ:</b>
                <div style="font-size:11px;color:#ccc;display:grid;grid-template-columns:1fr 1fr;gap:4px;">
                  <div>• Sức mạnh: <b style="color:#a0ffa0;">+${buff.str || 0}</b></div>
                  <div>• Thân pháp: <b style="color:#a0ffa0;">+${buff.dex || 0}</b></div>
                  <div>• Sinh khí: <b style="color:#a0ffa0;">+${buff.vit || 0}</b></div>
                  <div>• Nội công: <b style="color:#a0ffa0;">+${buff.eng || 0}</b></div>
                  <div>• Sinh lực tối đa: <b style="color:#66ccff;">+${buff.hpMax || 0}</b></div>
                  <div>• Kháng tất cả: <b style="color:#ffd700;">+${buff.resAll || 0}</b></div>
                </div>
                <div style="margin-top:6px;font-size:11px;color:#ffcc66;">
                  Chiêu thức xuất trận: <b>${meta.skills.join(', ')}</b>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      win.innerHTML = html;
      win.classList.remove('hidden');
    }
  };

  window.COMPANION_SYSTEM = COMPANION_SYSTEM;

  // Khởi tạo khi sẵn sàng
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => COMPANION_SYSTEM.init());
  } else {
    COMPANION_SYSTEM.init();
  }

})(window);
