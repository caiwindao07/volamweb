/* ==========================================================================
   XƯỞNG RÈN & ĐÚC ĐỒ THẦN BINH (MASTER FORGE & CRAFTING HUB)
   Module chuyen sau cho:
   1. Cuong Hoa Trang Bi (+1 den +16) voi hao quang ruc ro.
   2. Che Tao & Duc Do Bo Hoang Kim Mon Phai (An Bang, Dinh Quoc, Hiep Cot, Mon Phai).
   3. Thang Hoa Bach Kim Chi Ton (+1 den +10).
   4. Tay Luyen Ma Phap & Kham Nam Huyen Tinh 6 Dong.
   ========================================================================== */
'use strict';

const FORGE_MAX_ENH = 16;

function openForgeHub(initialTab = 'enh') {
  let curTab = initialTab; // 'enh' | 'craft' | 'plat' | 'fuse'
  
  // Danh sach trang bi co the cuong hoa (dang mac + trong tui)
  const equippedList = Object.entries(S.eq).filter(([k, it]) => it).map(([k, it]) => ({ slot: k, it, isEq: true }));
  const invList = (S.inv || []).filter(it => it && it.d <= 9).map(it => ({ it, isEq: false }));
  const allGear = [...equippedList, ...invList];

  function renderHubContent() {
    let bodyHtml = '';

    if (curTab === 'enh') {
      // TAB 1: CUONG HOA TRANG BI
      const gearRows = allGear.map(({ it, isEq, slot }, idx) => {
        const enh = it.enh || 0;
        const max = enh >= FORGE_MAX_ENH;
        const cost = typeof enhCost === 'function' ? enhCost(it) : 5000;
        const chance = Math.round((typeof enhChance === 'function' ? enhChance(it) : 0.5) * 100);
        const glowClass = enh >= 14 ? 'glow-purple' : (enh >= 10 ? 'glow-gold' : (enh >= 6 ? 'glow-blue' : ''));

        return `
          <div style="background:rgba(20,16,12,0.9);border:1.5px solid ${enh >= 10 ? '#ffd700' : '#4d3a22'};border-radius:6px;padding:8px 10px;display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="position:relative;">
                ${itemCell(it)}
              </div>
              <div>
                <b style="color:${RAR_COL[it.r]};font-size:12.5px;">${esc(it.n)} <span style="color:#4ade80;">+${enh}</span></b>
                ${isEq ? '<span style="font-size:9.5px;background:#3b82f6;color:#fff;padding:1px 4px;border-radius:3px;margin-left:4px;">Đang mặc</span>' : ''}
                <div style="font-size:10.5px;color:#a39276;margin-top:2px;">
                  Cấp ${it.lvl} · Thuộc tính gốc: <b style="color:#ffd700;">+${Math.round(enh * 8)}%</b>
                </div>
              </div>
            </div>
            <div style="text-align:right;">
              ${max ? '<span style="font-size:11px;color:#4ade80;font-weight:bold;">Đã đạt +16 Max</span>' : `
                <div style="font-size:10px;color:#cbd5e1;margin-bottom:3px;">
                  Giá: <b style="color:#ffd700;">${fmt(cost)}</b> · Tỷ lệ: <b style="color:${chance > 50 ? '#4ade80' : '#ef4444'};">${chance}%</b>
                </div>
                <button class="jx-action-btn gold" onclick="forgeHubEnhance(${idx})" style="padding:4px 10px;font-size:11px;">
                  Cường Hóa +${enh + 1}
                </button>
              `}
            </div>
          </div>
        `;
      }).join('') || '<div style="text-align:center;color:#a39276;padding:20px;">Không có trang bị nào để cường hóa.</div>';

      bodyHtml = `
        <div style="font-size:11px;color:#cbd5e1;margin-bottom:8px;padding:6px;background:rgba(0,0,0,0.4);border-radius:4px;">
          ⚡ <b>Cường Hóa Thần Binh (+1 đến +16)</b>: Mỗi cấp tăng +8% thuộc tính gốc trang bị. Đạt +10 phát hào quang Hoàng Kim, đạt +14 phát hào quang Tử Sắc cực đỉnh!
        </div>
        <div style="max-height:55vh;overflow-y:auto;">
          ${gearRows}
        </div>
      `;
    } else if (curTab === 'craft') {
      // TAB 2: CHE TAO DO HOANG KIM MON PHAI
      const f = FAC[S.fac];
      const goldSets = (J.sets && J.sets.gold) ? J.sets.gold.filter(s => sexReqOk(s.req)) : [];
      
      const setRows = goldSets.slice(0, 8).map(s => {
        const canMake = S.gold >= 30000 && ((typeof RW === 'function' && RW().fd >= 15) || true);
        return `
          <div style="background:rgba(25,18,12,0.9);border:1.5px solid #d4af37;border-radius:6px;padding:8px 10px;display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <div>
              <b style="color:#ffd700;font-size:13px;">${esc(s.n)}</b>
              <div style="font-size:11px;color:#cbd5e1;margin-top:2px;">Bộ Hoàng Kim Môn Phái · Yêu cầu cấp ${s.req.find(q => q[0] === 36) ? s.req.find(q => q[0] === 36)[1] : 50}</div>
              <div style="font-size:10px;color:#a39276;margin-top:2px;">Đúc ngẫu nhiên 1 món trong bộ: Vũ khí, Áo, Mũ, Nhẫn, Giày...</div>
            </div>
            <div>
              <button class="jx-action-btn gold" onclick="craftGoldSetItem('${esc(s.n)}')" style="padding:5px 12px;font-size:11px;">
                Đúc Đồ (30,000 lượng)
              </button>
            </div>
          </div>
        `;
      }).join('');

      bodyHtml = `
        <div style="font-size:11px;color:#cbd5e1;margin-bottom:8px;padding:6px;background:rgba(0,0,0,0.4);border-radius:4px;">
          🔮 <b>Chế Tạo Đồ Bộ Hoàng Kim</b>: Dùng ngân lượng đúc trực tiếp các bảo vật Hoàng Kim trấn phái cực phẩm của phái <b>${esc(f.n)}</b>!
        </div>
        <div style="max-height:55vh;overflow-y:auto;">
          ${setRows}
        </div>
      `;
    } else if (curTab === 'plat') {
      // TAB 3: THANG HOA BACH KIM
      const platGear = allGear.filter(({ it }) => it.set && it.set.kind === 'platina');
      const goldGear = allGear.filter(({ it }) => it.set && it.set.kind === 'gold');

      const platRows = platGear.map(({ it, slot, isEq }) => {
        const plv = it.plv || 0;
        return `
          <div style="background:rgba(20,20,30,0.9);border:1.5px solid #c084fc;border-radius:6px;padding:8px 10px;display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <div style="display:flex;align-items:center;gap:10px;">
              ${itemCell(it)}
              <div>
                <b style="color:#c084fc;font-size:13px;">${esc(it.n)} <span style="color:#ffd700;">(Bạch Kim +${plv})</span></b>
                <div style="font-size:10.5px;color:#cbd5e1;">Thuộc tính gốc: +${Math.round(plv * 10)}% · Dòng ẩn Bạch Kim</div>
              </div>
            </div>
            <div>
              ${plv < 10 ? `
                <button class="jx-action-btn gold" onclick="forgeUpgradePlat('${it.uid}')" style="padding:4px 10px;font-size:11px;">
                  Thăng Cấp +${plv + 1}
                </button>
              ` : '<b style="color:#4ade80;font-size:11px;">Bạch Kim Cực Phẩm</b>'}
            </div>
          </div>
        `;
      }).join('');

      bodyHtml = `
        <div style="font-size:11px;color:#cbd5e1;margin-bottom:8px;padding:6px;background:rgba(0,0,0,0.4);border-radius:4px;">
          💎 <b>Thăng Hoa Bạch Kim Tối Thượng</b>: Nâng cấp đồ bộ Bạch Kim lên cấp +10, kích hoạt tiềm năng vô cực!
        </div>
        <div style="max-height:55vh;overflow-y:auto;">
          ${platRows || `
            <div style="text-align:center;padding:20px;color:#a39276;">
              Chưa có trang bị Bạch Kim nào. Có thể chế tạo Bạch Kim tại Lò Huyền Tinh bằng 2 món Hoàng Kim cùng loại!
              <div style="margin-top:10px;">
                <button class="jx-action-btn gold" onclick="closeModal();htModal();">Mở Lò Huyền Tinh & Chế Bạch Kim</button>
              </div>
            </div>
          `}
        </div>
      `;
    }

    return `
      <div class="jx-client-window" style="margin:-14px;border:none;box-shadow:none;">
        <div class="jx-window-header">
          <div class="jx-window-title">
            <span>🔨 DÃ LUYỆN ĐẠI SƯ (XƯỞNG RÈN THẦN BINH)</span>
          </div>
          <span style="font-size:11px;color:#ffd700;">Ngân lượng: <b>${fmt(S.gold)}</b></span>
        </div>

        <!-- Thanh chuyen Tab -->
        <div style="display:flex;background:#0d0a07;border-bottom:1.5px solid #5a4425;padding:4px 8px;gap:6px;flex-wrap:wrap;">
          <button class="jx-action-btn ${curTab === 'enh' ? 'gold' : ''}" id="tabBtnEnh" style="padding:4px 10px;font-size:11px;">⚡ Cường Hóa (+16)</button>
          <button class="jx-action-btn ${curTab === 'craft' ? 'gold' : ''}" id="tabBtnCraft" style="padding:4px 10px;font-size:11px;">🔮 Đúc Đồ Hoàng Kim</button>
          <button class="jx-action-btn ${curTab === 'plat' ? 'gold' : ''}" id="tabBtnPlat" style="padding:4px 10px;font-size:11px;">💎 Thăng Cấp Bạch Kim</button>
          <button class="jx-action-btn" id="tabBtnHtLo" style="padding:4px 10px;font-size:11px;">🏺 Lò Huyền Tinh & Khảm</button>
          <button class="jx-action-btn" id="tabBtnEquipShard" style="padding:4px 10px;font-size:11px;color:#60a5fa;">💠 Rã & Ghép Mảnh</button>
        </div>

        <div style="padding:10px 12px;background:radial-gradient(ellipse at center, #261b11 0%, #0d0a07 100%);">
          ${bodyHtml}
        </div>

        <div style="padding:8px 12px;border-top:1px solid #3d2f1d;background:#0d0a07;display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:10.5px;color:#a39276;">Thần binh xuất thế, thiên hạ thái bình!</span>
          <button class="jx-action-btn" onclick="closeModal();">Đóng</button>
        </div>
      </div>
    `;
  }

  modal(renderHubContent(), () => {
    const b1 = $('#tabBtnEnh'); if (b1) b1.onclick = () => { curTab = 'enh'; openForgeHub('enh'); };
    const b2 = $('#tabBtnCraft'); if (b2) b2.onclick = () => { curTab = 'craft'; openForgeHub('craft'); };
    const b3 = $('#tabBtnPlat'); if (b3) b3.onclick = () => { curTab = 'plat'; openForgeHub('plat'); };
    const b4 = $('#tabBtnHtLo'); if (b4) b4.onclick = () => { closeModal(); if (typeof htModal === 'function') htModal(); };
    const b5 = $('#tabBtnEquipShard'); if (b5) b5.onclick = () => { closeModal(); if (window.EQUIP_SHARD) window.EQUIP_SHARD.openModal(); };
  });
}

function forgeHubEnhance(idx) {
  const equippedList = Object.entries(S.eq).filter(([k, it]) => it).map(([k, it]) => ({ slot: k, it, isEq: true }));
  const invList = (S.inv || []).filter(it => it && it.d <= 9).map(it => ({ it, isEq: false }));
  const allGear = [...equippedList, ...invList];
  const target = allGear[idx];
  if (!target || !target.it) return;

  const it = target.it;
  const cost = typeof enhCost === 'function' ? enhCost(it) : 5000;
  if (S.gold < cost) {
    toast(`Không đủ ngân lượng! Cần ${fmt(cost)} lượng.`);
    return;
  }
  S.gold -= cost;

  const enh = it.enh || 0;
  const chance = typeof enhChance === 'function' ? enhChance(it) : 0.5;
  if (Math.random() < chance) {
    it.enh = enh + 1;
    if (typeof uiSfx === 'function') uiSfx('learn');
    toast(`🎉 Cường hóa thành công ${it.n} lên +${it.enh}!`);
    log(`<b style="color:#ffd700;">Cường hóa thành công: ${esc(it.n)} lên +${it.enh}!</b>`);
  } else {
    if (typeof uiSfx === 'function') uiSfx('use');
    toast(`Cường hóa thất bại (mất ${fmt(cost)} lượng).`);
  }

  R.dirty = true;
  invDirty = true;
  save();
  refresh();
  openForgeHub('enh');
}

function craftGoldSetItem(setName) {
  const cost = 30000;
  if (S.gold < cost) {
    toast(`Không đủ ngân lượng! Cần ${fmt(cost)} lượng.`);
    return;
  }
  if (S.inv.length >= INV_MAX) {
    toast('Hành trang đã đầy! Hãy dọn dẹp trước khi đúc đồ.');
    return;
  }
  S.gold -= cost;

  // Tao do hoang kim
  if (typeof forceSetItem === 'function') {
    const it = forceSetItem();
    if (it) {
      addItem(it, true, true);
      if (typeof uiSfx === 'function') uiSfx('learn');
      toast(`🎉 Đúc đồ thành công: Nhận được ${it.n}!`);
      log(`<b style="color:#ffd700;font-size:13px;">Đúc đồ Hoàng Kim: Nhận được ${esc(it.n)}!</b>`);
    }
  }

  save();
  refresh();
  openForgeHub('craft');
}

function forgeUpgradePlat(uid) {
  const it = findItem(+uid);
  if (!it) return;
  if (typeof upgradePlatina === 'function') {
    const r = upgradePlatina(it);
    if (typeof afterRc === 'function') {
      afterRc(r, () => openForgeHub('plat'));
    }
  }
}
