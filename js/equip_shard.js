/* ==========================================================================
   HỆ THỐNG RÃ & GHÉP TRANG BỊ XANH (BLUE GEAR DISMANTLE & SYNTHESIS SYSTEM)
   - Rã đồ xanh (phẩm chất r === 1): Mỗi món ngẫu nhiên ra 1 -> 3 Mảnh Trang Bị.
   - Ghép Mảnh Trang Bị: Tùy loại trang bị, cấp độ (Tier 1..10) và phẩm cách mà tính số lượng mảnh cần.
   ========================================================================== */
'use strict';

(function () {
  // Cấu hình các vị trí trang bị ghép
  const CRAFT_SLOTS = [
    { d: 0, n: 'Vũ khí cận chiến', ic: 'ui/w_sword.png', mult: 1.25, dName: 'Kiếm / Đao / Côn / Thương / Chùy' },
    { d: 1, n: 'Ám khí (Tầm xa)', ic: 'ui/w_dart.png', mult: 1.25, dName: 'Phi Đao / Tiêu / Tụ Tiễn' },
    { d: 2, n: 'Áo giáp', ic: 'ui/slot_armor.png', mult: 1.20, dName: 'Ngoại Y / Áo Giáp' },
    { d: 7, n: 'Mũ (Nón)', ic: 'ui/slot_helm.png', mult: 1.00, dName: 'Mũ Khôi' },
    { d: 5, n: 'Giày', ic: 'ui/slot_boot.png', mult: 1.00, dName: 'Hài Ngoa' },
    { d: 6, n: 'Đai lưng', ic: 'ui/slot_belt.png', mult: 0.90, dName: 'Yêu Đái' },
    { d: 8, n: 'Hộ uyển (Bao tay)', ic: 'ui/slot_cuff.png', mult: 0.90, dName: 'Hộ Uyển' },
    { d: 4, n: 'Dây chuyền', ic: 'ui/slot_amulet.png', mult: 0.85, dName: 'Hạng Liên' },
    { d: 3, n: 'Nhẫn', ic: 'ui/slot_ring.png', mult: 0.85, dName: 'Giới Chỉ' },
    { d: 9, n: 'Ngọc bội', ic: 'ui/slot_pendant.png', mult: 0.85, dName: 'Bội Hoàn' }
  ];

  // Chi phí mảnh cơ bản theo Tier (Cấp 1 = Cấp 10 ... Cấp 10 = Cấp 100)
  const BASE_TIER_COSTS = {
    1: 6,
    2: 10,
    3: 16,
    4: 24,
    5: 34,
    6: 46,
    7: 60,
    8: 76,
    9: 95,
    10: 120
  };

  // Lấy số lượng Mảnh Trang Bị đang có
  function getEquipShards() {
    if (typeof matHave === 'function') {
      return matHave('misc', 'equip_shard');
    }
    if (window.S && S.mats && S.mats.misc) {
      return S.mats.misc.equip_shard || 0;
    }
    return 0;
  }

  // Thêm / bớt Mảnh Trang Bị
  function addEquipShards(amount) {
    if (typeof matAdd === 'function') {
      matAdd('misc', 'equip_shard', amount);
    } else if (window.S) {
      S.mats = S.mats || {};
      S.mats.misc = S.mats.misc || {};
      S.mats.misc.equip_shard = Math.max(0, (S.mats.misc.equip_shard || 0) + amount);
      if (S.mats.misc.equip_shard <= 0) delete S.mats.misc.equip_shard;
    }
  }

  // Kiểm tra một món đồ có phải là Đồ Xanh / Trang bị ngũ hành thường hợp lệ để rã hay không
  function isBlueGear(it) {
    if (!it || typeof it !== 'object') return false;
    // Trang bị ngũ hành thường rơi từ quái: phẩm chất r === 1 (Lam) hoặc r === 2 (Vàng 3-6 dòng), không phải đồ bộ Hoàng Kim (set), không phải Tím (vio / r === 3), không phải Bạch Kim (plv)
    return (it.r === 1 || it.r === 2) && it.d <= 9 && !it.set && !it.plv && !it.vio && it.r !== 3;
  }

  // Lấy danh sách đồ xanh trong rương
  function getInvBlueGearList() {
    if (!window.S || !Array.isArray(S.inv)) return [];
    return S.inv.filter(isBlueGear);
  }

  // Tính số lượng mảnh cần thiết để ghép trang bị
  function calcCraftCost(detail, tier, isSupreme = false) {
    const slot = CRAFT_SLOTS.find(s => s.d === detail);
    const mult = slot ? slot.mult : 1.0;
    const base = BASE_TIER_COSTS[tier] || 20;
    const cost = Math.round(base * mult * (isSupreme ? 1.3 : 1.0));
    return Math.max(4, cost);
  }

  // Rã 1 món đồ xanh đơn lẻ: Nhận ngẫu nhiên 1 -> 3 Mảnh Trang Bị
  function dismantleSingle(it) {
    if (!isBlueGear(it)) {
      if (typeof toast === 'function') toast('Chỉ có thể rã trang bị phẩm chất Xanh (Lam)!');
      return { ok: false };
    }
    if (!window.S || !Array.isArray(S.inv)) return { ok: false };

    const idx = S.inv.findIndex(x => x && x.uid === it.uid);
    if (idx === -1) {
      if (typeof toast === 'function') toast('Trang bị không còn trong rương!');
      return { ok: false };
    }

    // 1 item ra random 1->3 mảnh
    const gained = Math.floor(Math.random() * 3) + 1; // 1, 2, hoặc 3
    S.inv.splice(idx, 1);
    addEquipShards(gained);

    if (typeof uiSfx === 'function') uiSfx('learn');
    if (typeof log === 'function') {
      log(`Rã trang bị <span style="color:#6aa8ff;">${esc(it.n)}</span> thành công, nhận được <b style="color:#60a5fa;">+${gained} Mảnh Trang Bị</b>!`);
    }
    if (typeof toast === 'function') {
      toast(`Rã ${it.n} nhận được +${gained} Mảnh Trang Bị (Có: ${getEquipShards()} mảnh)!`);
    }

    if (window.R) R.dirty = true;
    if (typeof save === 'function') save();
    if (typeof refresh === 'function') refresh();

    return { ok: true, shards: gained };
  }

  // Rã toàn bộ đồ xanh trong rương
  function dismantleAllBlue() {
    const blueList = getInvBlueGearList();
    if (!blueList.length) {
      if (typeof toast === 'function') toast('Không có trang bị Xanh nào trong rương để rã!');
      return { ok: false, count: 0, shards: 0 };
    }

    let totalShards = 0;
    const uidsToRemove = new Set(blueList.map(it => it.uid));

    blueList.forEach(it => {
      const s = Math.floor(Math.random() * 3) + 1; // 1..3 mảnh
      totalShards += s;
    });

    S.inv = S.inv.filter(it => !uidsToRemove.has(it.uid));
    addEquipShards(totalShards);

    if (typeof uiSfx === 'function') uiSfx('learn');
    if (typeof log === 'function') {
      log(`Đã rã <b>${blueList.length} món Đồ Xanh</b>, thu hoạch được <b style="color:#60a5fa;">+${totalShards} Mảnh Trang Bị</b>!`);
    }
    if (typeof toast === 'function') {
      toast(`Đã rã ${blueList.length} món đồ xanh, nhận +${totalShards} Mảnh! (Tổng có: ${getEquipShards()} mảnh)`);
    }

    if (window.R) R.dirty = true;
    if (typeof save === 'function') save();
    if (typeof refresh === 'function') refresh();

    return { ok: true, count: blueList.length, shards: totalShards };
  }

  // Rã các món đồ xanh đã chọn trong chế độ Select
  function dismantleSelectedBlue() {
    if (!window.INV_SELECTED || !window.INV_SELECTED.size) {
      if (typeof toast === 'function') toast('Chưa chọn món đồ nào!');
      return { ok: false };
    }

    const selectedBlue = (S.inv || []).filter(it => window.INV_SELECTED.has(it.uid) && isBlueGear(it));
    if (!selectedBlue.length) {
      if (typeof toast === 'function') toast('Các món đã chọn không có trang bị Xanh nào!');
      return { ok: false };
    }

    let totalShards = 0;
    const uidsToRemove = new Set(selectedBlue.map(it => it.uid));

    selectedBlue.forEach(it => {
      const s = Math.floor(Math.random() * 3) + 1;
      totalShards += s;
      window.INV_SELECTED.delete(it.uid);
    });

    S.inv = S.inv.filter(it => !uidsToRemove.has(it.uid));
    addEquipShards(totalShards);

    if (typeof uiSfx === 'function') uiSfx('learn');
    if (typeof log === 'function') {
      log(`Đã rã chọn lọc <b>${selectedBlue.length} món Đồ Xanh</b>, nhận được <b style="color:#60a5fa;">+${totalShards} Mảnh Trang Bị</b>!`);
    }
    if (typeof toast === 'function') {
      toast(`Rã ${selectedBlue.length} món đã chọn: +${totalShards} Mảnh Trang Bị!`);
    }

    if (window.R) R.dirty = true;
    if (typeof save === 'function') save();
    if (typeof refresh === 'function') refresh();

    return { ok: true, count: selectedBlue.length, shards: totalShards };
  }

  // Thực hiện Ghép Mảnh Trang Bị
  function craftItemFromShards(detail, tier, seriesChoice, isSupreme = false) {
    if (!window.S) return { ok: false, msg: 'Chưa đăng nhập!' };
    if (!Array.isArray(S.inv)) S.inv = [];

    if (S.inv.length >= (typeof INV_MAX !== 'undefined' ? INV_MAX : 100)) {
      if (typeof toast === 'function') toast('Rương hành trang đã đầy! Hãy dọn rương trước khi ghép.');
      return { ok: false, msg: 'Rương đầy' };
    }

    const cost = calcCraftCost(detail, tier, isSupreme);
    const have = getEquipShards();
    if (have < cost) {
      if (typeof toast === 'function') toast(`Không đủ Mảnh Trang Bị! Cần ${cost} mảnh, hiện có ${have} mảnh.`);
      return { ok: false, msg: 'Thiếu mảnh' };
    }

    // Tìm particular thích hợp theo giới tính và phái
    const g = (typeof J !== 'undefined' && J.items) ? J.items[detail] : null;
    if (!g || !g.list || !g.list.length) {
      return { ok: false, msg: 'Dữ liệu trang bị không hợp lệ' };
    }

    // Chọn particular (k)
    let candidateParts = [...new Set(g.list.map(r => r.k))];
    if (detail === 0 && window.FAC && S.fac && FAC[S.fac] && FAC[S.fac].weaponKey) {
      // Ưu tiên vũ khí của môn phái
      const preferredW = FAC[S.fac].weaponKey;
      const fRows = g.list.filter(r => r.k === preferredW);
      if (fRows.length) candidateParts = [preferredW];
    }

    let particular = candidateParts[0];
    if (typeof sexPart === 'function') {
      particular = sexPart(detail, particular);
    }

    // Số dòng thuộc tính ma pháp: Thường = 2 dòng (1 tiền tố hiện, 1 hậu tố ẩn); Cực phẩm = 3 dòng
    const nMagic = isSupreme ? 3 : 2;

    // Tạo trang bị qua makeItem
    let newItem = null;
    if (typeof makeItem === 'function') {
      newItem = makeItem(detail, particular, tier, nMagic);
    }

    if (!newItem) {
      if (typeof toast === 'function') toast('Không thể tạo trang bị cho bậc này!');
      return { ok: false, msg: 'Tạo thất bại' };
    }

    // Gán ngũ hành theo lựa chọn nếu có
    if (seriesChoice >= 0 && seriesChoice <= 4) {
      newItem.s = seriesChoice;
      // Re-roll ma pháp để khớp hệ ngũ hành mới
      if (typeof rollMagic === 'function' && typeof magicLevels === 'function') {
        newItem.mag = rollMagic(newItem, magicLevels(nMagic, newItem.lvl), (window.R && R.P) ? R.P.lucky : 0);
      }
    }

    // Đảm bảo phẩm chất xanh chuẩn
    if (newItem.r === 0) newItem.r = 1;

    // Trừ mảnh
    addEquipShards(-cost);

    // Thêm vào rương
    S.inv.push(newItem);

    if (typeof uiSfx === 'function') uiSfx('learn');
    if (typeof log === 'function') {
      log(`Ghép thành công <span style="color:#6aa8ff;">${esc(newItem.n)}</span> (Tiêu hao <b>${cost} Mảnh Trang Bị</b>)!`);
    }
    if (typeof toast === 'function') {
      toast(`✨ Ghép thành công: ${newItem.n} (-${cost} Mảnh)!`);
    }

    if (window.R) R.dirty = true;
    if (typeof save === 'function') save();
    if (typeof refresh === 'function') refresh();

    return { ok: true, item: newItem, cost };
  }

  // =========================================================================
  // GIAO DIỆN MODAL: LÒ RÃ & GHÉP MẢNH TRANG BỊ
  // =========================================================================
  let curModalTab = 'craft'; // 'craft' | 'dismantle'
  let curCraftSlot = 0;      // 0..9 (detail)
  let curCraftTier = 5;      // 1..10 (cấp 50 mặc định)
  let curCraftSeries = -1;   // -1: Tự do / ngẫu nhiên, 0..4: Kim Mộc Thủy Hỏa Thổ
  let curCraftSupreme = false; // 2 dòng vs 3 dòng

  function openEquipShardModal(initialTab) {
    if (initialTab) curModalTab = initialTab;
    renderShardModalContent();
  }

  function renderShardModalContent() {
    const haveShards = getEquipShards();
    const goldShardGeneric = (typeof matHave === 'function') ? matHave('shard', 'gold_shard') : (S.mats && S.mats.shard && S.mats.shard.gold_shard || 0);
    const blueList = getInvBlueGearList();

    let tabBodyHtml = '';

    if (curModalTab === 'gold') {
      // TAB MẢNH HOÀNG KIM (ĐỒNG BỘ CẢ MẢNH HOÀNG KIM THEO TÊN SET & MẢNH CHUNG)
      const shardsDb = (typeof window.RCP !== 'undefined' && window.RCP.shards) ? window.RCP.shards : {};
      const shardsMap = (typeof mats === 'function') ? mats().shard : (S.mats && S.mats.shard ? S.mats.shard : {});
      
      // Lấy danh sách mảnh trang bị Hoàng Kim người chơi đang có hoặc có thể ghép
      const goldItemsList = [];
      for (const name in shardsDb) {
        const need = shardsDb[name];
        const have = shardsMap[name] || 0;
        goldItemsList.push({ name, need, have, canCraft: have >= need });
      }

      // Sắp xếp: Ưu tiên các mảnh đang có, sau đó đến các mảnh đủ điều kiện ghép
      goldItemsList.sort((a, b) => {
        if (a.canCraft !== b.canCraft) return b.canCraft ? 1 : -1;
        if (a.have !== b.have) return b.have - a.have;
        return a.name.localeCompare(b.name);
      });

      const goldItemsHtml = goldItemsList.map(item => {
        const pct = Math.min(100, Math.round((item.have / item.need) * 100));
        const color = item.canCraft ? '#4ade80' : (item.have > 0 ? '#ffd700' : '#888');
        return `
          <div style="background:rgba(20,15,10,0.85);border:1px solid ${item.canCraft ? '#4ade80' : '#4a381e'};border-radius:5px;padding:6px 10px;display:flex;justify-content:space-between;align-items:center;">
            <div style="flex:1;min-width:0;margin-right:8px;">
              <div style="display:flex;align-items:center;gap:6px;">
                <b style="color:${item.have > 0 ? '#ffd700' : '#94a3b8'};font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Mảnh ${esc(item.name)}</b>
                ${item.canCraft ? '<span style="background:#166534;color:#bbf7d0;font-size:9px;padding:1px 4px;border-radius:3px;font-weight:bold;">ĐỦ GHÉP</span>' : ''}
              </div>
              <div style="display:flex;align-items:center;gap:8px;margin-top:3px;">
                <div style="flex:1;max-width:120px;background:#000;height:6px;border-radius:3px;overflow:hidden;border:1px solid #3d2f1d;">
                  <div style="width:${pct}%;height:100%;background:${item.canCraft ? '#22c55e' : '#eab308'};"></div>
                </div>
                <span style="font-size:10px;color:${color};font-weight:bold;">${item.have}/${item.need} mảnh</span>
              </div>
            </div>
            <div>
              <button class="jx-action-btn ${item.canCraft ? 'gold' : ''}" onclick="window.EQUIP_SHARD.doCombineGold('${esc(item.name)}')" style="padding:4px 10px;font-size:10.5px;" ${item.canCraft ? '' : 'disabled'}>
                ✨ Ghép Đồ
              </button>
            </div>
          </div>
        `;
      }).join('');

      tabBodyHtml = `
        <div>
          <!-- Header Thống Kê Mảnh Hoàng Kim -->
          <div style="background:rgba(25,18,10,0.95);border:1.5px solid #d4af37;border-radius:6px;padding:8px 12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-size:12px;color:#cbd5e1;">
                Mảnh Hoàng Kim Vạn Năng: <b style="color:#ffd700;font-size:13px;">${goldShardGeneric}</b> mảnh
              </div>
              <div style="font-size:10px;color:#a39276;margin-top:2px;">
                Mảnh rơi từ Boss, Tống Kim hoặc phân rã đồ Hoàng Kim thừa (10 mảnh vạn năng = 1 đồ HK ngẫu nhiên).
              </div>
            </div>
            <div>
              <button class="jx-action-btn gold" onclick="if(window.ITEM_TOOLTIP)window.ITEM_TOOLTIP.craftGold();" style="padding:5px 12px;font-size:11px;font-weight:bold;" ${goldShardGeneric >= 10 ? '' : 'disabled'}>
                🎁 Đổi Đồ HK (10 Mảnh)
              </button>
            </div>
          </div>

          <!-- Danh Sách Toàn Bộ Mảnh Hoàng Kim Theo Bộ -->
          <div style="font-size:11px;font-weight:bold;color:#ffd700;margin-bottom:5px;">
            DANH SÁCH MẢNH HOÀNG KIM (THEO MÔN PHÁI & ĐỒ BỘ)
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;max-height:280px;overflow-y:auto;padding-right:2px;">
            ${goldItemsHtml || '<div style="grid-column:1/-1;text-align:center;padding:25px;color:#a39276;">Chưa có mảnh Hoàng Kim nào.</div>'}
          </div>
        </div>
      `;
    } else if (curModalTab === 'craft') {
      // TAB GHÉP MẢNH TRANG BỊ
      const curCost = calcCraftCost(curCraftSlot, curCraftTier, curCraftSupreme);
      const isAffordable = haveShards >= curCost;

      // Danh sách nút chọn slot
      const slotBtnsHtml = CRAFT_SLOTS.map(sl => {
        const isSel = sl.d === curCraftSlot;
        return `
          <button class="jx-action-btn ${isSel ? 'gold' : ''}" onclick="window.EQUIP_SHARD.setSlot(${sl.d})" style="padding:4px 6px;font-size:10.5px;text-align:left;display:flex;align-items:center;gap:5px;">
            <span>${sl.n}</span>
          </button>
        `;
      }).join('');

      // Danh sách nút chọn Tier (Cấp 10 -> 100)
      const tierBtnsHtml = Array.from({ length: 10 }, (_, i) => i + 1).map(t => {
        const isSel = t === curCraftTier;
        const reqLvl = t * 10;
        return `
          <button class="jx-action-btn ${isSel ? 'gold' : ''}" onclick="window.EQUIP_SHARD.setTier(${t})" style="flex:1;min-width:44px;padding:3px 2px;font-size:10px;">
            Cấp ${reqLvl}
          </button>
        `;
      }).join('');

      // Danh sách chọn hệ ngũ hành
      const seriesList = [
        { id: -1, n: 'Ngẫu Nhiên', col: '#cbd5e1' },
        { id: 0, n: 'Hệ Kim', col: '#ffd700' },
        { id: 1, n: 'Hệ Mộc', col: '#4ade80' },
        { id: 2, n: 'Hệ Thủy', col: '#60a5fa' },
        { id: 3, n: 'Hệ Hỏa', col: '#f87171' },
        { id: 4, n: 'Hệ Thổ', col: '#fbbf24' }
      ];

      const seriesBtnsHtml = seriesList.map(sr => {
        const isSel = sr.id === curCraftSeries;
        return `
          <button class="jx-action-btn ${isSel ? 'gold' : ''}" onclick="window.EQUIP_SHARD.setSeries(${sr.id})" style="padding:3px 8px;font-size:10px;color:${sr.col};font-weight:bold;">
            ${sr.n}
          </button>
        `;
      }).join('');

      // Lấy trang bị mẫu đại diện cho cấu hình đang chọn
      const slotObj = CRAFT_SLOTS.find(s => s.d === curCraftSlot);
      const g = (typeof J !== 'undefined' && J.items) ? J.items[curCraftSlot] : null;
      let sampleName = slotObj ? slotObj.n : 'Trang bị';
      let sampleIcon = '';
      if (g && g.list && g.list.length) {
        const matchRow = g.list.find(r => r.lvl === curCraftTier && (typeof sexReqOk === 'function' ? sexReqOk(r.req) : true)) || g.list[0];
        if (matchRow) {
          sampleName = matchRow.n;
          sampleIcon = matchRow.ic || '';
        }
      }

      tabBodyHtml = `
        <div style="display:grid;grid-template-columns:190px 1fr;gap:12px;">
          <!-- Cột Trái: Chọn Vị Trí Trang Bị -->
          <div style="background:rgba(15,10,6,0.85);border:1px solid #5a4425;border-radius:6px;padding:8px;">
            <div style="font-size:11px;font-weight:bold;color:#ffd700;margin-bottom:6px;padding-bottom:3px;border-bottom:1px solid #3d2f1d;">
              1. CHỌN LOẠI TRANG BỊ
            </div>
            <div style="display:flex;flex-direction:column;gap:3px;max-height:280px;overflow-y:auto;padding-right:2px;">
              ${slotBtnsHtml}
            </div>
          </div>

          <!-- Cột Phải: Tùy Chỉnh & Xem Trước -->
          <div style="display:flex;flex-direction:column;gap:8px;">
            <!-- Chọn Cấp Độ / Bậc -->
            <div style="background:rgba(15,10,6,0.85);border:1px solid #5a4425;border-radius:6px;padding:8px;">
              <div style="font-size:11px;font-weight:bold;color:#ffd700;margin-bottom:5px;">
                2. CHỌN ĐẲNG CẤP TRANG BỊ (TIER 1 - 10)
              </div>
              <div style="display:flex;gap:4px;flex-wrap:wrap;">
                ${tierBtnsHtml}
              </div>
            </div>

            <!-- Chọn Ngũ Hành & Chất Lượng -->
            <div style="background:rgba(15,10,6,0.85);border:1px solid #5a4425;border-radius:6px;padding:8px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
                <span style="font-size:11px;font-weight:bold;color:#ffd700;">3. THUỘC TÍNH NGŨ HÀNH</span>
                <label style="display:flex;align-items:center;gap:4px;font-size:10.5px;color:#a855f7;cursor:pointer;font-weight:bold;">
                  <input type="checkbox" id="chkCraftSupreme" ${curCraftSupreme ? 'checked' : ''} onchange="window.EQUIP_SHARD.setSupreme(this.checked)" class="accent-purple-500">
                  Cực Phẩm (+30% Mảnh - 3 Dòng)
                </label>
              </div>
              <div style="display:flex;gap:4px;flex-wrap:wrap;">
                ${seriesBtnsHtml}
              </div>
            </div>

            <!-- Xem Trước & Nút Ghép -->
            <div style="background:rgba(25,18,10,0.95);border:1.5px solid #d4af37;border-radius:6px;padding:10px;display:flex;justify-content:space-between;align-items:center;">
              <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:44px;height:44px;border:1.5px solid #60a5fa;border-radius:6px;background:#000;display:grid;place-items:center;flex-shrink:0;">
                  ${sampleIcon ? `<img src="${esc(sampleIcon)}" style="max-width:36px;max-height:36px;">` : '⚔️'}
                </div>
                <div>
                  <div style="display:flex;align-items:center;gap:6px;">
                    <b style="color:#6aa8ff;font-size:13.5px;">${esc(sampleName)}</b>
                    <span style="background:#1e3a8a;color:#93c5fd;font-size:9.5px;padding:1px 5px;border-radius:3px;font-weight:bold;">Đồ Xanh</span>
                  </div>
                  <div style="font-size:11px;color:#cbd5e1;margin-top:2px;">
                    Cấp yêu cầu: <b>${curCraftTier * 10}</b> · ${curCraftSupreme ? '<span style="color:#c084fc;">3 Dòng Ma Pháp</span>' : '<span style="color:#60a5fa;">2 Dòng Ma Pháp Chuẩn</span>'}
                  </div>
                  <div style="font-size:10.5px;color:#a39276;margin-top:2px;">
                    Chi phí: <b style="color:${isAffordable ? '#4ade80' : '#ef4444'};font-size:12px;">${curCost}</b> Mảnh (Có: <b style="color:#60a5fa;">${haveShards}</b>)
                  </div>
                </div>
              </div>

              <div>
                <button class="jx-action-btn gold" onclick="window.EQUIP_SHARD.doCraft()" style="padding:8px 16px;font-size:12.5px;font-weight:bold;" ${isAffordable ? '' : 'disabled'}>
                  🔮 Ghép Trang Bị
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      // TAB RÃ ĐỒ XANH
      const blueItemsHtml = blueList.map((it, idx) => {
        return `
          <div style="background:rgba(20,15,10,0.85);border:1px solid #4a381e;border-radius:5px;padding:6px 8px;display:flex;justify-content:space-between;align-items:center;">
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:34px;height:34px;border:1px solid #60a5fa;border-radius:4px;background:#000;display:grid;place-items:center;flex-shrink:0;">
                ${it.ic ? `<img src="${esc(it.ic)}" style="max-width:28px;max-height:28px;">` : ''}
              </div>
              <div>
                <b style="color:#6aa8ff;font-size:12px;">${esc(it.n)}</b>
                <div style="font-size:10px;color:#a39276;">Cấp ${it.lvl} · ${(it.mag || []).length} dòng ma pháp</div>
              </div>
            </div>
            <div>
              <button class="jx-action-btn" onclick="window.EQUIP_SHARD.doDismantleSingle(${it.uid})" style="padding:3px 8px;font-size:10px;color:#60a5fa;border-color:#2563eb;">
                🔨 Rã (1~3 Mảnh)
              </button>
            </div>
          </div>
        `;
      }).join('');

      tabBodyHtml = `
        <div>
          <!-- Header Thao Tác Nhanh -->
          <div style="background:rgba(20,15,10,0.9);border:1px solid #5a4425;border-radius:6px;padding:8px 12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-size:11.5px;color:#cbd5e1;">
                Đồ Xanh trong rương: <b style="color:#ffd700;">${blueList.length} món</b> · Thu hoạch dự kiến: <b style="color:#60a5fa;">+${blueList.length * 1} ~ ${blueList.length * 3} Mảnh</b>
              </div>
              <div style="font-size:10px;color:#a39276;margin-top:2px;">
                Mỗi món trang bị xanh khi rã sẽ ngẫu nhiên thu được từ 1 đến 3 Mảnh Trang Bị.
              </div>
            </div>

            <div>
              <button class="jx-action-btn gold" onclick="window.EQUIP_SHARD.doDismantleAll()" style="padding:6px 14px;font-size:11.5px;font-weight:bold;" ${blueList.length ? '' : 'disabled'}>
                🔨 Rã Tất Cả Đồ Xanh
              </button>
            </div>
          </div>

          <!-- Danh sách đồ xanh -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;max-height:260px;overflow-y:auto;padding-right:2px;">
            ${blueItemsHtml || '<div style="grid-column:1/-1;text-align:center;padding:30px;color:#a39276;">Trong rương hiện không có trang bị Xanh nào để rã. Đánh quái hoặc tham gia hoạt động để thu thập thêm!</div>'}
          </div>
        </div>
      `;
    }

    const modalHtml = `
      <div class="jx-client-window" style="margin:-14px;border:none;box-shadow:none;min-width:620px;">
        <div class="jx-window-header">
          <div class="jx-window-title">
            <span>💠 LÒ RÃ & GHÉP MẢNH TRANG BỊ</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="display:flex;align-items:center;gap:5px;background:rgba(30,58,138,0.4);border:1px solid #3b82f6;padding:2px 8px;border-radius:12px;">
              <span style="font-size:10.5px;color:#93c5fd;">Mảnh Trang Bị:</span>
              <b style="color:#60a5fa;font-size:12px;">${haveShards}</b>
            </div>
            <div style="display:flex;align-items:center;gap:5px;background:rgba(120,53,15,0.4);border:1px solid #fbbf24;padding:2px 8px;border-radius:12px;">
              <span style="font-size:10.5px;color:#fde68a;">Mảnh HK:</span>
              <b style="color:#ffd700;font-size:12px;">${goldShardGeneric}</b>
            </div>
          </div>
        </div>

        <!-- Thanh Tabs -->
        <div style="display:flex;background:#0d0a07;border-bottom:1.5px solid #5a4425;padding:4px 8px;gap:6px;">
          <button class="jx-action-btn ${curModalTab === 'craft' ? 'gold' : ''}" onclick="window.EQUIP_SHARD.switchTab('craft')" style="padding:5px 14px;font-size:11.5px;font-weight:bold;">
            🔮 Ghép Trang Bị
          </button>
          <button class="jx-action-btn ${curModalTab === 'gold' ? 'gold' : ''}" onclick="window.EQUIP_SHARD.switchTab('gold')" style="padding:5px 14px;font-size:11.5px;font-weight:bold;color:#fde047;">
            💛 Mảnh Hoàng Kim
          </button>
          <button class="jx-action-btn ${curModalTab === 'dismantle' ? 'gold' : ''}" onclick="window.EQUIP_SHARD.switchTab('dismantle')" style="padding:5px 14px;font-size:11.5px;font-weight:bold;">
            🔨 Rã Đồ Xanh (${blueList.length})
          </button>
        </div>

        <div style="padding:10px 12px;background:radial-gradient(ellipse at center, #23180f 0%, #0d0a07 100%);">
          ${tabBodyHtml}
        </div>

        <div style="padding:6px 12px;border-top:1px solid #3d2f1d;background:#0d0a07;display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:10px;color:#a39276;">Tích lũy mảnh trang bị và mảnh Hoàng Kim để đúc nên thần binh hộ thể!</span>
          <button class="jx-action-btn" onclick="closeModal();">Đóng</button>
        </div>
      </div>
    `;

    modal(modalHtml, () => {});
  }

  // Export module ra window
  window.EQUIP_SHARD = {
    getShards: getEquipShards,
    addShards: addEquipShards,
    isBlue: isBlueGear,
    isBlueGear: isBlueGear,
    getBlueList: getInvBlueGearList,
    calcCost: calcCraftCost,
    dismantleSingle: dismantleSingle,
    dismantleAll: dismantleAllBlue,
    dismantleSelected: dismantleSelectedBlue,
    craftItem: craftItemFromShards,
    openModal: openEquipShardModal,

    // Controls modal
    switchTab: function (tab) {
      curModalTab = tab;
      renderShardModalContent();
    },
    setSlot: function (slot) {
      curCraftSlot = slot;
      renderShardModalContent();
    },
    setTier: function (tier) {
      curCraftTier = tier;
      renderShardModalContent();
    },
    setSeries: function (series) {
      curCraftSeries = series;
      renderShardModalContent();
    },
    setSupreme: function (val) {
      curCraftSupreme = !!val;
      renderShardModalContent();
    },
    doCraft: function () {
      const res = craftItemFromShards(curCraftSlot, curCraftTier, curCraftSeries, curCraftSupreme);
      if (res.ok) {
        renderShardModalContent();
      }
    },
    doDismantleSingle: function (uid) {
      const it = (S.inv || []).find(x => x && x.uid === uid);
      if (it) {
        dismantleSingle(it);
        renderShardModalContent();
      }
    },
    doDismantleAll: function () {
      dismantleAllBlue();
      renderShardModalContent();
    },
    doCombineGold: function (name) {
      if (typeof combineShards === 'function') {
        const res = combineShards(name);
        if (res.ok) {
          if (typeof uiSfx === 'function') uiSfx('levelup');
          if (typeof toast === 'function') toast(`✨ ${res.msg || 'Ghép thành công!'}`);
          renderShardModalContent();
          if (typeof refresh === 'function') refresh();
        } else {
          if (typeof toast === 'function') toast(res.msg || 'Không thể ghép!');
        }
      }
    }
  };
})();
