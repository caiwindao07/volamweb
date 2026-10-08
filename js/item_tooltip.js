/* ==========================================================================
   HỆ THỐNG TOOLTIP SO SÁNH TRANG BỊ & CHỌN BÁN HÀNG LOẠT (VÕ LÂM IDLE)
   - Rê chuột (Hover) xem Tooltip chi tiết phong cách Võ Lâm.
   - So sánh song song từng chỉ số (Sát thương, Thuộc tính, Dòng ẩn, Lực chiến, DPS, HP, Kháng)
     với trang bị đang mặc cùng vị trí (Slot).
   - Chế độ "Chọn Bán": Check chọn nhiều món đồ trong rương để bán đồng loạt 1-click.
   ========================================================================== */
'use strict';

(function(window) {
  // Trạng thái chọn nhiều để bán
  window.INV_SELECT_MODE = false;
  window.INV_SELECTED = new Set();

  /* ==========================================================================
     PHẦN 1: HỆ THỐNG FLOATING TOOLTIP & SO SÁNH TRANG BỊ CHI TIẾT
     ========================================================================== */
  let tooltipEl = null;
  let activeTooltipUid = null;

  function ensureTooltipElement() {
    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.id = 'jx-item-hover-tooltip';
      tooltipEl.style.cssText = `
        position: fixed;
        z-index: 1000000;
        pointer-events: none;
        display: none;
        max-width: 540px;
        background: radial-gradient(ellipse at top left, #231911 0%, #0d0a07 100%);
        border: 2px solid #8e6c38;
        box-shadow: 0 12px 36px rgba(0,0,0,0.95), inset 0 0 16px rgba(142,108,56,0.25);
        border-radius: 8px;
        padding: 10px 12px;
        color: #cbd5e1;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        font-size: 11.5px;
        line-height: 1.45;
        transition: opacity 0.12s ease-out;
      `;
      document.body.appendChild(tooltipEl);
    }
    return tooltipEl;
  }

  // Bóc tách map thuộc tính ma pháp của một trang bị để so sánh từng chỉ số
  function extractItemStatsMap(it) {
    if (!it) return { mag: {}, dmin: 0, dmax: 0, base: {} };
    const k = (typeof enhMul === 'function') ? enhMul(it) : 1;
    const dmin = it.base ? it.base.find(b => b[0] === 28) : null;
    const dmax = it.base ? it.base.find(b => b[0] === 29) : null;

    const mag = {};
    if (it.mag) {
      it.mag.forEach(m => {
        if (!m || m.a === undefined) return;
        const name = (typeof attrName === 'function') ? attrName(m.a) : String(m.a);
        let val = 0;
        if (Array.isArray(m.p)) {
          val = (m.p[0] === -1 || m.p[0] === undefined) ? 0 : m.p[0];
          if (val === 0 && m.p.some(x => x > 0)) {
            val = m.p.find(x => x > 0) || 0;
          }
        }
        mag[name] = (mag[name] || 0) + val;
      });
    }

    const base = {};
    if (it.base) {
      it.base.forEach(([id, mn, mx]) => {
        if (id === 28 || id === 29) return;
        const name = (typeof attrName === 'function') ? attrName(id) : String(id);
        const avg = Math.round((mn + mx) / 2 * k);
        base[name] = (base[name] || 0) + avg;
      });
    }

    return {
      dmin: dmin ? Math.round(dmin[1] * k) : 0,
      dmax: dmax ? Math.round(dmax[1] * k) : (dmin ? Math.round(dmin[1] * k) : 0),
      mag,
      base
    };
  }

  // Tạo HTML hiển thị thông tin 1 item dạng thẻ gọn gàng
  function buildItemCardHTML(it, isEquippedBadge, diffBadge) {
    if (!it) return '';
    const rarCol = (typeof RAR_COL !== 'undefined' && RAR_COL[it.r]) ? RAR_COL[it.r] : '#ffd700';
    const seriesTxt = (typeof SERIES !== 'undefined' && it.s >= 0) ? SERIES[it.s] : '';
    const seriesCol = (typeof SERIES_COL !== 'undefined' && it.s >= 0) ? SERIES_COL[it.s] : '#ffd700';
    const detailName = (typeof J !== 'undefined' && J.items && J.items[it.d]) ? J.items[it.d].n : '';
    const lines = (typeof itemLines === 'function') ? itemLines(it) : [];

    let badgeHtml = '';
    if (isEquippedBadge) {
      badgeHtml = `<span style="background:#065f46;color:#6ee7b7;border:1px solid #059669;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:bold;margin-left:6px;">Đang mặc</span>`;
    }

    const linesHtml = lines.map(([k, t]) => {
      let col = '#cbd5e1';
      if (k === 'b') col = '#fef08a'; // thuộc tính cơ bản
      else if (k === 'm') col = '#60a5fa'; // ma pháp
      else if (k === 'h on') col = '#a855f7'; // ẩn kích hoạt
      else if (k === 'h') col = '#64748b'; // ẩn chưa kích hoạt
      else if (k === 'r') col = '#f87171'; // yêu cầu
      return `<div style="color:${col};font-size:11px;margin:1px 0;">${esc(t)}</div>`;
    }).join('');

    return `
      <div style="flex:1;min-width:230px;">
        <div style="display:flex;align-items:center;gap:8px;padding-bottom:6px;border-bottom:1px solid #3d2f1d;margin-bottom:6px;">
          <div style="width:38px;height:38px;border-radius:5px;border:1.5px solid ${rarCol};background:#000;display:grid;place-items:center;flex-shrink:0;">
            ${it.ic ? `<img src="${esc(it.ic)}" style="max-width:32px;max-height:32px;">` : ''}
          </div>
          <div>
            <div style="display:flex;align-items:center;">
              <b style="color:${rarCol};font-size:12.5px;">${esc(it.n)}${it.enh ? ` <span style="color:#f59e0b;">+${it.enh}</span>` : ''}</b>
              ${badgeHtml}
            </div>
            <div style="font-size:10px;color:#a39276;margin-top:1px;">
              ${esc(detailName)} · Cấp ${it.lvl}${seriesTxt ? ` · <span style="color:${seriesCol};font-weight:bold;">Hệ ${seriesTxt}</span>` : ''}
            </div>
          </div>
        </div>
        <div style="max-height:220px;overflow-y:auto;padding-right:2px;">
          ${linesHtml}
        </div>
      </div>
    `;
  }

  // Tạo phần so sánh từng chỉ số vi mô & vĩ mô
  function buildComparisonDetailsHTML(newItem, curItem) {
    if (!newItem || !curItem) return '';
    const nStats = extractItemStatsMap(newItem);
    const cStats = extractItemStatsMap(curItem);
    const diffRows = [];

    // 1. So sánh Sát thương vũ khí
    if (nStats.dmin || cStats.dmin) {
      const dMinDiff = nStats.dmin - cStats.dmin;
      const dMaxDiff = nStats.dmax - cStats.dmax;
      const diffStr = (dMinDiff > 0 ? `+${dMinDiff}` : `${dMinDiff}`) + ` ~ ` + (dMaxDiff > 0 ? `+${dMaxDiff}` : `${dMaxDiff}`);
      const isBetter = (dMinDiff + dMaxDiff) > 0;
      const isWorse = (dMinDiff + dMaxDiff) < 0;
      const col = isBetter ? '#4ade80' : (isWorse ? '#ef4444' : '#94a3b8');
      const icon = isBetter ? '▲' : (isWorse ? '▼' : '=');
      diffRows.push(`
        <div style="display:flex;justify-content:space-between;align-items:center;padding:2px 0;font-size:10.5px;gap:8px;">
          <span style="color:#e2e8f0;white-space:nowrap;">⚔️ Sát thương:</span>
          <span style="color:${col};font-weight:bold;white-space:nowrap;margin-left:auto;">${nStats.dmin}-${nStats.dmax} <small>(${diffStr} ${icon})</small></span>
        </div>
      `);
    }

    // 2. So sánh từng dòng thuộc tính cơ bản
    const allBaseKeys = new Set([...Object.keys(nStats.base), ...Object.keys(cStats.base)]);
    allBaseKeys.forEach(key => {
      const vNew = nStats.base[key] || 0;
      const vCur = cStats.base[key] || 0;
      const diff = vNew - vCur;
      if (diff !== 0) {
        const isBetter = diff > 0;
        const col = isBetter ? '#4ade80' : '#ef4444';
        const sign = diff > 0 ? `+${diff}` : `${diff}`;
        const rawDesc = (typeof J !== 'undefined' && J.attrDesc && J.attrDesc[key]) ? J.attrDesc[key].replace(/#.*/, '').trim() : key;
        const descName = rawDesc.replace(/[:：\s]+$/, '');
        const isPct = key.endsWith('_p') || (typeof J !== 'undefined' && J.attrDesc && J.attrDesc[key] && J.attrDesc[key].includes('%'));
        const unit = isPct ? '%' : '';
        diffRows.push(`
          <div style="display:flex;justify-content:space-between;align-items:center;padding:2px 0;font-size:10.5px;gap:8px;">
            <span style="color:#cbd5e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${descName}">${descName}:</span>
            <span style="color:${col};font-weight:bold;white-space:nowrap;margin-left:auto;">${vNew}${unit} <small>(${sign}${unit} ${isBetter ? '▲' : '▼'})</small></span>
          </div>
        `);
      }
    });

    // 3. So sánh từng dòng thuộc tính ma pháp
    const allMagKeys = new Set([...Object.keys(nStats.mag), ...Object.keys(cStats.mag)]);
    allMagKeys.forEach(key => {
      const vNew = nStats.mag[key] || 0;
      const vCur = cStats.mag[key] || 0;
      const diff = vNew - vCur;
      if (diff !== 0) {
        const isBetter = diff > 0;
        const col = isBetter ? '#4ade80' : '#ef4444';
        const sign = diff > 0 ? `+${diff}` : `${diff}`;
        const rawDesc = (typeof J !== 'undefined' && J.attrDesc && J.attrDesc[key]) ? J.attrDesc[key].replace(/#.*/, '').trim() : key;
        const descName = rawDesc.replace(/[:：\s]+$/, '');
        const isPct = key.endsWith('_p') || (typeof J !== 'undefined' && J.attrDesc && J.attrDesc[key] && J.attrDesc[key].includes('%'));
        const unit = isPct ? '%' : '';
        diffRows.push(`
          <div style="display:flex;justify-content:space-between;align-items:center;padding:2px 0;font-size:10.5px;gap:8px;">
            <span style="color:#cbd5e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${descName}">${descName}:</span>
            <span style="color:${col};font-weight:bold;white-space:nowrap;margin-left:auto;">${vNew}${unit} <small>(${sign}${unit} ${isBetter ? '▲' : '▼'})</small></span>
          </div>
        `);
      }
    });

    // 4. So sánh Lực chiến & Macro Stats (equipCompare)
    let macroHtml = '';
    if (typeof equipCompare === 'function') {
      try {
        const ok = (typeof reqOk === 'function') ? reqOk(newItem) : true;
        const c = equipCompare(newItem, !ok);
        const colGain = c.gain > 0.0005 ? '#4ade80' : (c.gain < -0.0005 ? '#ef4444' : '#94a3b8');
        const colDps = c.dps > 0.0005 ? '#4ade80' : (c.dps < -0.0005 ? '#ef4444' : '#94a3b8');
        const colLife = c.life > 0.5 ? '#4ade80' : (c.life < -0.5 ? '#ef4444' : '#94a3b8');
        const colDef = c.def > 0.5 ? '#4ade80' : (c.def < -0.5 ? '#ef4444' : '#94a3b8');
        const colRes = c.res > 0.5 ? '#4ade80' : (c.res < -0.5 ? '#ef4444' : '#94a3b8');

        macroHtml = `
          <div style="display:grid;grid-template-columns:repeat(5, 1fr);gap:4px;background:#150f09;border:1px solid #3d2f1d;border-radius:4px;padding:5px 6px;margin-top:6px;text-align:center;">
            <div>
              <div style="font-size:9.5px;color:#a39276;">LỰC CHIẾN</div>
              <div style="font-size:11px;font-weight:bold;color:${colGain};">${(c.gain >= 0 ? '+' : '')}${(c.gain * 100).toFixed(1)}%</div>
            </div>
            <div>
              <div style="font-size:9.5px;color:#a39276;">DPS</div>
              <div style="font-size:11px;font-weight:bold;color:${colDps};">${(c.dps >= 0 ? '+' : '')}${(c.dps * 100).toFixed(1)}%</div>
            </div>
            <div>
              <div style="font-size:9.5px;color:#a39276;">MÁU</div>
              <div style="font-size:11px;font-weight:bold;color:${colLife};">${(c.life >= 0 ? '+' : '')}${Math.round(c.life)}</div>
            </div>
            <div>
              <div style="font-size:9.5px;color:#a39276;">NÉ</div>
              <div style="font-size:11px;font-weight:bold;color:${colDef};">${(c.def >= 0 ? '+' : '')}${Math.round(c.def)}</div>
            </div>
            <div>
              <div style="font-size:9.5px;color:#a39276;">KHÁNG</div>
              <div style="font-size:11px;font-weight:bold;color:${colRes};">${(c.res >= 0 ? '+' : '')}${Math.round(c.res)}%</div>
            </div>
          </div>
        `;
      } catch (e) {}
    }

    if (!diffRows.length && !macroHtml) return '';

    return `
      <div style="border-top:1px dashed #5a4425;margin-top:8px;padding-top:6px;">
        <div style="font-size:10.5px;font-weight:bold;color:#ffd700;margin-bottom:4px;display:flex;align-items:center;gap:4px;">
          <span>⚖️ SO SÁNH TỪNG CHỈ SỐ VỚI ĐỒ ĐANG MẶC:</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 14px;max-height:140px;overflow-y:auto;padding-right:4px;">
          ${diffRows.join('')}
        </div>
        ${macroHtml}
      </div>
    `;
  }

  // Hiển thị Tooltip cho trang bị
  function showItemTooltip(it, mouseEvent) {
    if (!it) return;
    const tt = ensureTooltipElement();
    activeTooltipUid = it.uid;

    const slot = (typeof slotFor === 'function') ? slotFor(it) : null;
    const curEquipped = (slot && S && S.eq && S.eq[slot] && S.eq[slot].uid !== it.uid) ? S.eq[slot] : null;

    let contentHtml = '';
    if (curEquipped) {
      // Có trang bị đang mặc cùng slot: hiển thị so sánh song song
      contentHtml = `
        <div style="display:flex;gap:12px;align-items:flex-start;">
          ${buildItemCardHTML(it, false)}
          <div style="width:1px;background:#3d2f1d;align-self:stretch;"></div>
          ${buildItemCardHTML(curEquipped, true)}
        </div>
        ${buildComparisonDetailsHTML(it, curEquipped)}
      `;
    } else {
      // Không có món đang mặc (ô trống hoặc chính là món đang mặc)
      const isWearing = (slot && S && S.eq && S.eq[slot] && S.eq[slot].uid === it.uid);
      contentHtml = `
        <div style="min-width:260px;">
          ${buildItemCardHTML(it, isWearing)}
          <div style="border-top:1px dashed #5a4425;margin-top:6px;padding-top:4px;font-size:10px;color:#a39276;text-align:center;">
            ${isWearing ? '🛡️ [Trang bị này hiện đang được mặc trên người]' : '✨ [Vị trí này trên người hiện đang để trống]'}
          </div>
        </div>
      `;
    }

    tt.innerHTML = contentHtml;
    tt.style.display = 'block';
    tt.style.opacity = '1';

    updateTooltipPosition(mouseEvent);
  }

  // Cập nhật vị trí Tooltip thông minh tránh tràn màn hình và tránh che lấp nút bấm rương
  function updateTooltipPosition(e) {
    if (!tooltipEl || tooltipEl.style.display === 'none') return;
    const x = e.clientX, y = e.clientY;
    const pad = 12;
    const tw = tooltipEl.offsetWidth, th = tooltipEl.offsetHeight;
    const winW = window.innerWidth, winH = window.innerHeight;

    let posX = x + pad;
    let posY = y + pad;

    // Nếu chuột đang ở trong cửa sổ rương đồ: ưu tiên đặt tooltip ở bên phải hoặc bên trái rương để không che nút
    const invCol = e.target && e.target.closest && e.target.closest('.jx-inv-layout-split');
    if (invCol) {
      const rect = invCol.getBoundingClientRect();
      if (rect.right + tw + pad < winW) {
        posX = rect.right + pad;
        posY = Math.max(10, Math.min(y - 20, winH - th - 10));
      } else if (rect.left - tw - pad > 10) {
        posX = rect.left - tw - pad;
        posY = Math.max(10, Math.min(y - 20, winH - th - 10));
      } else {
        if (posX + tw > winW - 10) posX = Math.max(10, x - tw - pad);
      }
    } else {
      // Tràn phải -> lật sang trái
      if (posX + tw > winW - 10) {
        posX = x - tw - pad;
        if (posX < 10) posX = 10;
      }
    }

    // Tràn dưới -> đẩy lên trên
    if (posY + th > winH - 10) {
      posY = winH - th - 10;
      if (posY < 10) posY = 10;
    }

    tooltipEl.style.left = posX + 'px';
    tooltipEl.style.top = posY + 'px';
  }

  function hideItemTooltip() {
    if (tooltipEl) {
      tooltipEl.style.display = 'none';
      tooltipEl.style.opacity = '0';
    }
    activeTooltipUid = null;
  }

  /* ==========================================================================
     PHẦN 2: HỆ THỐNG CHỌN NHIỀU ĐỂ BÁN TRONG RƯƠNG (MULTI-SELECT SELL)
     ========================================================================== */
  function toggleInvSelectMode(enable) {
    window.INV_SELECT_MODE = (enable !== undefined) ? enable : !window.INV_SELECT_MODE;
    if (!window.INV_SELECT_MODE) {
      window.INV_SELECTED.clear();
    }
    if (typeof renderInv === 'function') {
      renderInv();
    }
  }

  function toggleItemSelection(uid) {
    uid = +uid;
    if (window.INV_SELECTED.has(uid)) {
      window.INV_SELECTED.delete(uid);
    } else {
      window.INV_SELECTED.add(uid);
    }
    updateMultiSellStateUI();
  }

  function selectAllWhiteItems() {
    if (!S || !S.inv) return;
    S.inv.forEach(it => {
      if (it && it.r === 0 && !(typeof sellProtected === 'function' && sellProtected(it))) {
        window.INV_SELECTED.add(it.uid);
      }
    });
    updateMultiSellStateUI();
  }

  function selectAllBlueItems() {
    if (!S || !S.inv) return;
    S.inv.forEach(it => {
      const isBlue = (typeof window.EQUIP_SHARD !== 'undefined' && window.EQUIP_SHARD.isBlueGear)
        ? window.EQUIP_SHARD.isBlueGear(it)
        : ((it.r === 1 || it.r === 2) && it.d <= 9 && !it.set && !it.plv && !it.vio && it.r !== 3);
      if (it && isBlue && !(typeof sellProtected === 'function' && sellProtected(it))) {
        window.INV_SELECTED.add(it.uid);
      }
    });
    updateMultiSellStateUI();
  }

  function selectAllInvItems() {
    if (!S || !S.inv) return;
    // Tự bật chế độ chọn nhiều nếu chưa bật
    if (!window.INV_SELECT_MODE) {
      window.INV_SELECT_MODE = true;
      if (typeof renderInv === 'function') renderInv();
    }
    S.inv.forEach(it => {
      if (it) window.INV_SELECTED.add(it.uid);
    });
    updateMultiSellStateUI();
  }

  function clearInvSelection() {
    window.INV_SELECTED.clear();
    updateMultiSellStateUI();
  }

  // Phân rã đồ Hoàng Kim đã chọn → Mảnh Hoàng Kim (mỗi món 2~4 mảnh)
  function dismantleSelectedGold() {
    if (!S || !S.inv || !window.INV_SELECTED.size) {
      if (typeof toast === 'function') toast('Chọn ít nhất 1 món đồ Hoàng Kim để phân rã!');
      return;
    }
    const isGold = it => it && it.set && it.set.kind === 'gold';
    const items = S.inv.filter(it => window.INV_SELECTED.has(it.uid) && isGold(it));
    if (!items.length) {
      if (typeof toast === 'function') toast('Không có đồ Hoàng Kim nào được chọn!');
      return;
    }
    if (!confirm(`Phân rã ${items.length} đồ Hoàng Kim thành Mảnh Hoàng Kim? Không thể hoàn tác!`)) return;

    let totalShards = 0;
    items.forEach(it => {
      const shards = 2 + Math.floor(Math.random() * 3); // 2~4 mảnh/món
      totalShards += shards;
      S.inv.splice(S.inv.indexOf(it), 1);
    });

    S.mats = S.mats || {};
    S.mats.shard = S.mats.shard || {};
    S.mats.shard.gold_shard = (S.mats.shard.gold_shard || 0) + totalShards;
    if (typeof matAdd === 'function') matAdd('shard', 'gold_shard', 0); // sync

    window.INV_SELECTED.clear();
    window.invDirty = true;
    if (typeof uiSfx === 'function') uiSfx('dropOther');
    if (typeof toast === 'function') toast(`🔨 Phân rã ${items.length} Hoàng Kim → +${totalShards} Mảnh Hoàng Kim!`);
    if (typeof save === 'function') save();
    if (typeof renderInv === 'function') renderInv();
  }

  // Ghép Mảnh Hoàng Kim → đồ Hoàng Kim cấp cao (cần 10 mảnh)
  function craftGoldFromShards() {
    const SHARDS_NEEDED = 10;
    if (!S) return;
    S.mats = S.mats || {}; S.mats.shard = S.mats.shard || {};
    const have = S.mats.shard.gold_shard || 0;
    if (have < SHARDS_NEEDED) {
      if (typeof toast === 'function') toast(`❌ Cần ${SHARDS_NEEDED} Mảnh Hoàng Kim (đang có: ${have})!`);
      return;
    }
    if (!confirm(`Dùng ${SHARDS_NEEDED} Mảnh Hoàng Kim ghép 1 trang bị Hoàng Kim ngẫu nhiên?`)) return;

    S.mats.shard.gold_shard -= SHARDS_NEEDED;

    let newItem = null;
    if (typeof makeSetItem === 'function' && typeof J !== 'undefined' && J.sets && J.sets.gold) {
      const fid = (typeof FAC !== 'undefined' && FAC[S.fac]) ? FAC[S.fac].id : -1;
      const reqOf = (r, id) => (r.req.find(q => q[0] === id) || [0, -1])[1];
      let pool = J.sets.gold.filter(r => reqOf(r, 36) <= S.lvl + 10 && (typeof sexReqOk === 'function' ? sexReqOk(r.req) : true));
      const mine = pool.filter(r => reqOf(r, 39) === fid);
      if (mine.length) pool = mine;
      if (pool.length) {
        newItem = makeSetItem('gold', pool[Math.floor(Math.random() * pool.length)], 8);
        if (newItem && typeof addItem === 'function') addItem(newItem, false, true);
      }
    }

    window.invDirty = true;
    if (typeof uiSfx === 'function') uiSfx('levelup');
    if (typeof toast === 'function') {
      toast(newItem ? `✨ Ghép thành công: ${newItem.n}!` : `✨ Ghép thành công 1 trang bị Hoàng Kim!`);
    }
    if (typeof save === 'function') save();
    if (typeof renderInv === 'function') renderInv();
  }

  // Gởi tất cả đồ đã chọn vào kho chung
  function stashSelectedItems() {
    if (!S || !S.inv || !window.INV_SELECTED.size) {
      if (typeof toast === 'function') toast('Chọn ít nhất 1 món đồ để gởi kho!');
      return;
    }
    const items = S.inv.filter(it => window.INV_SELECTED.has(it.uid));
    if (!items.length) { window.INV_SELECTED.clear(); updateMultiSellStateUI(); return; }

    let success = 0, failFull = false;
    for (const it of [...items]) {
      if (typeof stashDeposit === 'function') {
        const r = stashDeposit(it);
        if (r && r.ok) { success++; window.INV_SELECTED.delete(it.uid); }
        else if (r && r.msg && r.msg.includes('đầy')) { failFull = true; break; }
      }
    }

    window.invDirty = true;
    if (typeof uiSfx === 'function') uiSfx('dropOther');
    let msg = `📦 Đã gởi ${success} món vào kho chung!`;
    if (failFull) msg += ' (Kho đầy 200 ô)';
    if (typeof toast === 'function') toast(msg);
    if (typeof save === 'function') save();
    if (typeof renderInv === 'function') renderInv();
    updateMultiSellStateUI();
  }

  // Cập nhật giao diện nút Bán và đánh dấu các ô item mà không cần re-render toàn bộ DOM
  function updateMultiSellStateUI() {
    const count = window.INV_SELECTED.size;
    let totalVal = 0;
    if (S && S.inv) {
      S.inv.forEach(it => {
        if (window.INV_SELECTED.has(it.uid)) {
          totalVal += (typeof itemValue === 'function') ? itemValue(it) : 100;
        }
      });
    }

    const lblCount = document.getElementById('lblSelCount');
    if (lblCount) lblCount.textContent = count;

    const btnExec = document.getElementById('btnExecuteMultiSell');
    if (btnExec) {
      btnExec.disabled = (count === 0);
      btnExec.innerHTML = `🗑️ Bán <b>${count}</b> món (+<b>${typeof fmt === 'function' ? fmt(totalVal) : totalVal}</b> lượng)`;
      if (count > 0) {
        btnExec.style.background = '#b91c1c';
        btnExec.style.borderColor = '#ef4444';
        btnExec.style.color = '#fff';
      } else {
        btnExec.style.background = '#450a0a';
        btnExec.style.borderColor = '#7f1d1d';
        btnExec.style.color = '#991b1b';
      }
    }

    const isBlueFn = (typeof window.EQUIP_SHARD !== 'undefined' && window.EQUIP_SHARD.isBlueGear)
      ? window.EQUIP_SHARD.isBlueGear
      : (it => (it.r === 1 || it.r === 2) && it.d <= 9 && !it.set && !it.plv && !it.vio && it.r !== 3);
    const blueCount = S && S.inv ? S.inv.filter(it => window.INV_SELECTED.has(it.uid) && isBlueFn(it)).length : 0;
    const btnDis = document.getElementById('btnExecuteMultiDismantle');
    if (btnDis) {
      btnDis.style.display = (blueCount > 0) ? 'block' : 'none';
      btnDis.innerHTML = `🔨 Rã <b>${blueCount}</b> món Đồ Xanh (+Mảnh)`;
    }

    // Đánh dấu trực quan trên từng ô đồ trong rương
    document.querySelectorAll('.jx-inv-grid-10 .it[data-uid]').forEach(el => {
      const uid = +el.dataset.uid;
      const isSel = window.INV_SELECTED.has(uid);
      el.classList.toggle('chk-sel', isSel);

      let badge = el.querySelector('.chk-mark');
      if (window.INV_SELECT_MODE) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'chk-mark';
          el.appendChild(badge);
        }
        badge.textContent = isSel ? '✓' : '';
        badge.style.display = 'block';
        badge.style.background = isSel ? '#ef4444' : '#00000088';
        badge.style.borderColor = isSel ? '#fca5a5' : '#5a4425';
      } else {
        if (badge) badge.style.display = 'none';
      }
    });
  }

  // Thực hiện bán toàn bộ món đã chọn
  function executeMultiSell() {
    if (!S || !S.inv || !window.INV_SELECTED.size) {
      if (typeof toast === 'function') toast('Vui lòng chọn ít nhất 1 món đồ để bán!');
      return;
    }

    const itemsToSell = S.inv.filter(it => window.INV_SELECTED.has(it.uid));
    if (!itemsToSell.length) {
      window.INV_SELECTED.clear();
      updateMultiSellStateUI();
      return;
    }

    let totalGain = 0;
    itemsToSell.forEach(it => {
      totalGain += (typeof itemValue === 'function') ? itemValue(it) : 100;
    });

    // Xóa đồ khỏi rương và cộng vàng
    S.inv = S.inv.filter(it => !window.INV_SELECTED.has(it.uid));
    S.gold += totalGain;
    window.invDirty = true;

    if (window.reportLegitGoldGain) {
      window.reportLegitGoldGain(totalGain);
    }

    if (typeof uiSfx === 'function') uiSfx('dropOther');
    if (typeof toast === 'function') {
      toast(`🎉 Đã bán ${itemsToSell.length} món đồ đã chọn, thu về +${typeof fmt === 'function' ? fmt(totalGain) : totalGain} lượng!`);
    }

    window.INV_SELECTED.clear();
    if (typeof save === 'function') save();
    if (typeof renderInv === 'function') renderInv();
  }

  /* ==========================================================================
     PHẦN 3: ĐĂNG KÝ EVENT LISTENERS TOÀN CỤC CHO TOOLTIP & CLICK CHỌN ĐỒ
     ========================================================================== */
  function initHoverTooltipListeners() {
    // 1. Hover vào bất kỳ ô đồ nào (.it[data-uid])
    document.addEventListener('mouseover', e => {
      const itEl = e.target.closest('.it[data-uid]');
      if (itEl) {
        const uid = itEl.dataset.uid;
        if (typeof findItem === 'function') {
          const item = findItem(uid);
          if (item) {
            showItemTooltip(item, e);
          }
        }
      }
    });

    // 2. Di chuyển chuột cập nhật vị trí Tooltip
    document.addEventListener('mousemove', e => {
      if (activeTooltipUid) {
        updateTooltipPosition(e);
      }
    });

    // 3. Rời chuột khỏi ô đồ
    document.addEventListener('mouseout', e => {
      const itEl = e.target.closest('.it[data-uid]');
      if (itEl && !itEl.contains(e.relatedTarget)) {
        hideItemTooltip();
      }
    });

    // 4. Click, cuộn chuột hoặc mở modal ẩn ngay Tooltip
    window.addEventListener('scroll', hideItemTooltip, true);
    document.addEventListener('pointerdown', e => {
      // Nếu click vào ô đồ thì ẩn tooltip để không che modal
      if (e.target.closest('.it')) {
        hideItemTooltip();
      }
    });

    // 5. Thao tác Mặc / Tháo Đồ Nhanh:
    // - Chuột phải (contextmenu): Tự động chặn menu ngữ cảnh của trình duyệt và thực hiện mặc/tháo đồ ngay lập tức
    // - Double click (dblclick): Mặc đồ từ rương hoặc tháo đồ từ người
    function handleFastEquipAction(e) {
      const itEl = e.target.closest('.it[data-uid]');
      if (!itEl) return;
      const uid = +itEl.dataset.uid;
      if (!uid || typeof findItem !== 'function') return;
      const item = findItem(uid);
      if (!item) return;

      e.preventDefault();
      e.stopPropagation();
      hideItemTooltip();

      // Nếu đang ở ô trang bị trên người (.jx-equip-slot) -> Tháo đồ về rương
      const equipSlotEl = itEl.closest('.jx-equip-slot');
      if (equipSlotEl && equipSlotEl.dataset.slot && typeof unequip === 'function') {
        if (typeof closeModal === 'function') closeModal();
        unequip(equipSlotEl.dataset.slot);
        return;
      }

      // Nếu đang ở trong rương hành trang (S.inv) -> Mặc đồ ngay lập tức
      if (typeof S !== 'undefined' && S && S.inv && S.inv.includes(item) && typeof equip === 'function') {
        if (typeof closeModal === 'function') closeModal();
        equip(item);
        return;
      }
    }

    // Chặn menu chuột phải trên toàn bộ ô item và thực hiện mặc/tháo đồ
    document.addEventListener('contextmenu', e => {
      const itEl = e.target.closest('.it[data-uid]');
      if (itEl) {
        handleFastEquipAction(e);
      }
    });

    // Double click mặc/tháo đồ
    document.addEventListener('dblclick', e => {
      const itEl = e.target.closest('.it[data-uid]');
      if (itEl) {
        handleFastEquipAction(e);
      }
    });
  }

  // Khởi động khi DOM sẵn sàng
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initHoverTooltipListeners);
    } else {
      initHoverTooltipListeners();
    }
  }

  // Xuất các API ra window
  window.ITEM_TOOLTIP = {
    show: showItemTooltip,
    hide: hideItemTooltip,
    toggleSelectMode: toggleInvSelectMode,
    toggleItem: toggleItemSelection,
    selectAllWhite: selectAllWhiteItems,
    selectAllBlue: selectAllBlueItems,
    selectAll: selectAllInvItems,
    clearSelection: clearInvSelection,
    executeSell: executeMultiSell,
    dismantleGold: dismantleSelectedGold,
    craftGold: craftGoldFromShards,
    stashSelected: stashSelectedItems,
    updateUI: updateMultiSellStateUI
  };

})(window);
