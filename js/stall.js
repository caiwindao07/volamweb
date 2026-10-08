/* ==========================================================================
   HỆ THỐNG BÀY BÁN HÀNG RONG (PLAYER STALL / BÀY BÁN)
   Trích xuất từ UiPlayerShop.ini và spr/Ui3/°ÚÌ¯ của H:\JxPhaThien
   ========================================================================== */
'use strict';

window.STALL = (function () {
  let stallItems = []; // Danh sách vật phẩm đang chuẩn bị bày bán: [{ it, price }]
  let currentViewingStall = null; // { sellerId, sellerName, title, items: [...] }

  function getMyStall() {
    return (window.S && window.S.stall) ? window.S.stall : null;
  }

  function isStalling() {
    return !!getMyStall();
  }

  function toggle() {
    if (isStalling()) {
      openManage();
    } else {
      openSetup();
    }
  }

  // Mở giao diện thiết lập sạp hàng
  function openSetup() {
    const fw = document.getElementById('fw-stall');
    if (!fw) return;

    if (!R.town) {
      if (typeof toast === 'function') toast('⚠️ Chỉ có thể bày bán tại khu vực an toàn (Thành thị & Thôn trấn)!');
      return;
    }

    stallItems = [];
    renderSetup();
    fw.classList.remove('hidden');
    if (!fw.style.top || fw.style.top === '0px') {
      fw.style.top = '90px';
      fw.style.left = 'calc(50% - 220px)';
    }
  }

  function openManage() {
    const fw = document.getElementById('fw-stall');
    if (!fw) return;
    renderManage();
    fw.classList.remove('hidden');
  }

  function close() {
    const fw = document.getElementById('fw-stall');
    if (fw) fw.classList.add('hidden');
    const fv = document.getElementById('fw-stall-view');
    if (fv) fv.classList.add('hidden');
  }

  function addItemToStall(uid) {
    if (!Array.isArray(S.inv)) return;
    const it = S.inv.find(i => i.uid === uid);
    if (!it) return;

    if (stallItems.find(x => x.it.uid === uid)) {
      if (typeof toast === 'function') toast('Vật phẩm này đã được xếp vào sạp hàng!');
      return;
    }

    if (stallItems.length >= 12) {
      if (typeof toast === 'function') toast('Sạp hàng tối đa 12 vật phẩm!');
      return;
    }

    const defaultPrice = (typeof itemValue === 'function' ? itemValue(it) : 5000) * 3;
    const priceStr = prompt(`Nhập giá bán (Ngân lượng) cho "${it.n}":`, defaultPrice);
    if (!priceStr) return;

    const price = Math.max(1, Math.min(200000000, parseInt(priceStr) || defaultPrice));
    stallItems.push({ it, price });
    if (typeof toast === 'function') toast(`Đã thêm [${it.n}] với giá ${fmt(price)} lượng`);
    renderSetup();
  }

  function removeItemFromStall(uid) {
    stallItems = stallItems.filter(x => x.it.uid !== uid);
    renderSetup();
  }

  function startStall() {
    const titleInput = document.getElementById('stall-title-input');
    const title = (titleInput ? titleInput.value.trim() : '') || 'Tiệm Tạp Hóa Ba Lăng';

    if (stallItems.length === 0) {
      if (typeof toast === 'function') toast('Hãy chọn ít nhất 1 món đồ từ hành trang để bày bán!');
      return;
    }

    const itemsToSend = stallItems.map(x => ({
      uid: x.it.uid,
      n: x.it.n,
      r: x.it.r,
      d: x.it.d,
      lvl: x.it.lvl,
      s: x.it.s,
      ic: x.it.ic,
      props: x.it.props,
      enh: x.it.enh,
      price: x.price
    }));

    S.stall = {
      title: title,
      items: itemsToSend
    };

    // Gửi packet lên server
    if (window.MP && MP.ws && MP.ws.readyState === 1) {
      MP.ws.send(JSON.stringify({
        type: 'stall_open',
        title: title,
        items: itemsToSend
      }));
    }

    // Tắt tự đánh khi đang bày bán
    if (S.auto) {
      S.auto = false;
      if (typeof toast === 'function') toast('Đã tạm dừng Tự đánh để tập trung bày bán.');
    }

    if (typeof uiSfx === 'function') uiSfx('use');
    if (typeof toast === 'function') toast(`🏪 Bạn đã mở sạp hàng [${title}] thành công!`);
    if (typeof log === 'function') log(`🏪 Bạn đã dựng sạp hàng <b>${esc(title)}</b> bày bán ${itemsToSend.length} vật phẩm.`);
    close();
  }

  function stopStall() {
    if (!S.stall) return;
    S.stall = null;

    if (window.MP && MP.ws && MP.ws.readyState === 1) {
      MP.ws.send(JSON.stringify({
        type: 'stall_close'
      }));
    }

    if (typeof toast === 'function') toast('Đã thu dẹp sạp hàng!');
    close();
  }

  function renderSetup() {
    const fw = document.getElementById('fw-stall');
    if (!fw) return;

    let itemsHtml = '';
    for (let i = 0; i < 12; i++) {
      const entry = stallItems[i];
      if (entry) {
        itemsHtml += `
          <div class="stall-slot filled r${entry.it.r}" onclick="STALL.removeItemFromStall(${entry.it.uid})" title="Bấm để gỡ bỏ khỏi sạp">
            <img src="${entry.it.ic || 'img/it/gold.png'}" alt="${entry.it.n}">
            <span class="slot-price">${fmt(entry.price)} L</span>
          </div>
        `;
      } else {
        itemsHtml += `<div class="stall-slot empty"><span>Trống</span></div>`;
      }
    }

    // Danh sách đồ trong túi có thể bán
    let bagHtml = '';
    if (Array.isArray(S.inv)) {
      bagHtml = S.inv.map(it => {
        const isChosen = stallItems.some(x => x.it.uid === it.uid);
        return `
          <div class="stall-bag-it ${isChosen ? 'chosen' : ''} r${it.r}" onclick="STALL.addItemToStall(${it.uid})" title="${it.n} (Cấp ${it.lvl})">
            <img src="${it.ic || 'img/it/gold.png'}" alt="${it.n}">
            <div class="bag-it-meta">
              <span class="name" style="color:${RAR_COL[it.r] || '#fff'}">${it.n}</span>
              <span class="lvl">Cấp ${it.lvl}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    fw.innerHTML = `
      <div class="jx-float-header" id="fw-stall-header">
        <span class="jx-float-title">🏪 THIẾT LẬP BÀY BÁN HÀNG RONG</span>
        <button class="jx-close-btn" onclick="STALL.close()">✕</button>
      </div>
      <div class="stall-body">
        <div class="stall-title-row">
          <label>Tên biển hiệu:</label>
          <input type="text" id="stall-title-input" value="${(S.stall && S.stall.title) || 'Tiệm Đồ Hiếm Ba Lăng'}" maxlength="24" placeholder="Nhập tên sạp hàng...">
        </div>

        <div class="stall-section-title">Vật phẩm đang bày bán (Tối đa 12 món):</div>
        <div class="stall-grid">
          ${itemsHtml}
        </div>

        <div class="stall-section-title">Chọn vật phẩm từ hành trang:</div>
        <div class="stall-bag-picker">
          ${bagHtml || '<div class="empty-dim">Túi đồ rỗng!</div>'}
        </div>

        <div class="stall-btn-row">
          <button class="btn-stall-start" onclick="STALL.startStall()">🏪 Bắt Đầu Bày Bán</button>
          <button class="btn-stall-cancel" onclick="STALL.close()">Hủy Bỏ</button>
        </div>
      </div>
    `;
    setupDrag('fw-stall', 'fw-stall-header');
  }

  function renderManage() {
    const fw = document.getElementById('fw-stall');
    if (!fw || !S.stall) return;

    let itemsHtml = (S.stall.items || []).map(x => `
      <div class="stall-slot filled r${x.r}">
        <img src="${x.ic || 'img/it/gold.png'}" alt="${x.n}">
        <div class="stall-m-desc">
          <b style="color:${RAR_COL[x.r] || '#fff'}">${x.n}</b>
          <span style="color:#ffd700">${fmt(x.price)} lượng</span>
        </div>
      </div>
    `).join('');

    fw.innerHTML = `
      <div class="jx-float-header" id="fw-stall-header">
        <span class="jx-float-title">🏪 QUẢN LÝ SẠP HÀNG: ${esc(S.stall.title)}</span>
        <button class="jx-close-btn" onclick="STALL.close()">✕</button>
      </div>
      <div class="stall-body">
        <div class="stall-active-banner">
          <h3>Đang mở sạp tại ${esc(R.currentTown || 'Thành Thị')}</h3>
          <p>Người chơi khác có thể nhấp vào bạn để xem và mua vật phẩm!</p>
        </div>
        <div class="stall-section-title">Vật phẩm còn lại trong sạp:</div>
        <div class="stall-manage-list">
          ${itemsHtml || '<div class="empty-dim">Đã bán hết sạch hàng!</div>'}
        </div>
        <div class="stall-btn-row">
          <button class="btn-stall-cancel" onclick="STALL.stopStall()" style="width:100%;background:#ef4444;color:#fff;">⛔ Đóng Cửa Sạp Hàng</button>
        </div>
      </div>
    `;
    setupDrag('fw-stall', 'fw-stall-header');
  }

  // Xem sạp hàng của người chơi khác
  function openViewStall(sellerId, stallData, sellerName) {
    currentViewingStall = {
      sellerId: sellerId,
      sellerName: sellerName || 'Hiệp Khách',
      title: stallData.title || 'Sạp Hàng',
      items: stallData.items || []
    };

    const fv = document.getElementById('fw-stall-view');
    if (!fv) return;

    renderViewStall();
    fv.classList.remove('hidden');
    if (!fv.style.top || fv.style.top === '0px') {
      fv.style.top = '100px';
      fv.style.left = 'calc(50% - 210px)';
    }
  }

  function renderViewStall() {
    const fv = document.getElementById('fw-stall-view');
    if (!fv || !currentViewingStall) return;

    const listHtml = currentViewingStall.items.map(it => `
      <div class="stall-view-row r${it.r}">
        <div class="v-icon">
          <img src="${it.ic || 'img/it/gold.png'}" alt="${it.n}">
        </div>
        <div class="v-details">
          <b style="color:${RAR_COL[it.r] || '#fff'}">${esc(it.n)}${it.enh ? ` +${it.enh}` : ''}</b>
          <small class="dim">Cấp ${it.lvl || 1}${it.s >= 0 ? ` · Hệ ${SERIES[it.s]}` : ''}</small>
          <div class="v-price">Giá: <b style="color:#ffd700">${fmt(it.price)} lượng</b></div>
        </div>
        <button class="btn-buy-stall-it" onclick="STALL.buyItem(${it.uid})">Mua</button>
      </div>
    `).join('');

    fv.innerHTML = `
      <div class="jx-float-header" id="fw-stall-view-header">
        <span class="jx-float-title">🏪 SẠP HÀNG: ${esc(currentViewingStall.title)} (${esc(currentViewingStall.sellerName)})</span>
        <button class="jx-close-btn" onclick="STALL.close()">✕</button>
      </div>
      <div class="stall-body">
        <div class="stall-view-list">
          ${listHtml || '<div class="empty-dim">Sạp hàng này hiện không còn vật phẩm!</div>'}
        </div>
      </div>
    `;
    setupDrag('fw-stall-view', 'fw-stall-view-header');
  }

  function buyItem(itemUid) {
    if (!currentViewingStall) return;
    const it = currentViewingStall.items.find(x => x.uid === itemUid);
    if (!it) {
      if (typeof toast === 'function') toast('Vật phẩm không còn tồn tại trong sạp!');
      return;
    }

    if ((S.gold || 0) < it.price) {
      if (typeof toast === 'function') toast(`Không đủ ngân lượng! Cần ${fmt(it.price)} lượng (bạn có ${fmt(S.gold)}).`);
      return;
    }

    const maxCap = typeof INV_MAX !== 'undefined' ? INV_MAX : 1000;
    if (Array.isArray(S.inv) && S.inv.length >= maxCap) {
      if (typeof toast === 'function') toast('Hành trang đã đầy!');
      return;
    }

    if (!confirm(`Bạn có chắc muốn mua [${it.n}] với giá ${fmt(it.price)} ngân lượng?`)) return;

    if (window.MP && MP.ws && MP.ws.readyState === 1) {
      MP.ws.send(JSON.stringify({
        type: 'stall_buy',
        sellerId: currentViewingStall.sellerId,
        itemUid: itemUid
      }));
    }
  }

  function setupDrag(winId, headerId) {
    const el = document.getElementById(winId);
    const hd = document.getElementById(headerId);
    if (!el || !hd) return;

    let isDown = false, offX = 0, offY = 0;
    hd.onmousedown = (e) => {
      isDown = true;
      offX = e.clientX - el.offsetLeft;
      offY = e.clientY - el.offsetTop;
      document.onmousemove = (ev) => {
        if (!isDown) return;
        el.style.left = (ev.clientX - offX) + 'px';
        el.style.top = (ev.clientY - offY) + 'px';
      };
      document.onmouseup = () => {
        isDown = false;
        document.onmousemove = null;
        document.onmouseup = null;
      };
    };
  }

  return {
    toggle,
    openSetup,
    openManage,
    close,
    addItemToStall,
    removeItemFromStall,
    startStall,
    stopStall,
    openViewStall,
    buyItem,
    isStalling,
    getMyStall
  };
})();
