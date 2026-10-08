/* ==========================================================================
   VÕ LÂM IDLE - HỆ THỐNG GIAO DỊCH CHUẨN VLTK (PLAYER TRADE SYSTEM)
   Trích xuất từ UiTrade.ini & Spr\Ui3\½»Ò× (H:\JxPhaThien)
   1. Giao dịch an toàn 2 bước: Khóa đồ (Lock) -> Xác nhận (Confirm)
   2. Trao đổi trang bị, vật phẩm & ngân lượng giữa 2 người chơi online
   3. Cơ chế chống tráo đồ (Anti-scam): Bất kỳ bên nào đổi đồ/tiền sẽ tự mở khóa
   4. Đồng bộ thời gian thực qua WebSocket với Server Authoritative
   ========================================================================== */
'use strict';

const TRADE = {
  active: false,
  session: null,

  init() {
    // Lắng nghe sự kiện click đồ trong túi để đưa vào sàn giao dịch
    document.addEventListener('click', (e) => {
      if (!this.active || !this.session) return;
      const slot = e.target.closest('.item-slot[data-uid]');
      if (!slot) return;
      // Nếu click vào đồ trong kho giao dịch của mình thì gỡ ra
      if (slot.closest('#tradeMyItems')) {
        const uid = Number(slot.dataset.uid);
        this.removeItem(uid);
        return;
      }
      // Nếu click vào đồ trong hành trang nhân vật thì đưa vào giao dịch
      if (slot.closest('#t-inv') || slot.closest('#fw-inv')) {
        const uid = Number(slot.dataset.uid);
        if (uid) {
          e.stopPropagation();
          this.addItem(uid);
        }
      }
    }, true);
  },

  // 1. Gửi lời mời giao dịch
  request(targetId, targetName) {
    if (!MP || !MP.connected) {
      if (typeof toast === 'function') toast('Chưa kết nối máy chủ!');
      return;
    }
    if (this.active) {
      if (typeof toast === 'function') toast('Bạn đang trong một giao dịch khác!');
      return;
    }
    MP.ws.send(JSON.stringify({
      type: 'trade_req',
      targetId: Number(targetId)
    }));
    if (typeof toast === 'function') toast(`Đã gửi lời mời giao dịch tới <b>${esc(targetName || 'Hiệp khách')}</b>`);
  },

  // 2. Nhận thông báo mời giao dịch từ người khác
  onInvitePrompt(msg) {
    if (typeof modal === 'function') {
      modal(`
        <div style="padding:16px;text-align:center;min-width:260px;">
          <h3 style="color:#ffd700;font-size:14px;margin-bottom:8px;">🤝 LỜI MỜI GIAO DỊCH</h3>
          <p style="font-size:12px;color:#f5ede0;line-height:1.6;margin-bottom:14px;">
            Hiệp khách <b style="color:#60a5fa;">${esc(msg.fromName)}</b> (Cấp ${msg.fromLvl || 1}) muốn giao dịch cùng bạn!
          </p>
          <div style="display:flex;gap:10px;justify-content:center;">
            <button class="jx-action-btn gold" onclick="TRADE.accept(${msg.fromId}); closeModal();" style="min-width:90px;">Đồng Ý</button>
            <button class="jx-action-btn" onclick="TRADE.decline(${msg.fromId}); closeModal();" style="min-width:90px;">Từ Chối</button>
          </div>
        </div>
      `);
    }
  },

  accept(fromId) {
    if (MP.ws && MP.ws.readyState === 1) {
      MP.ws.send(JSON.stringify({ type: 'trade_accept', targetId: Number(fromId) }));
    }
  },

  decline(fromId) {
    if (MP.ws && MP.ws.readyState === 1) {
      MP.ws.send(JSON.stringify({ type: 'trade_decline', targetId: Number(fromId) }));
    }
  },

  // 3. Khởi tạo phiên giao dịch
  onStart(session) {
    this.active = true;
    this.session = session;
    this.render();
    if (typeof uiSfx === 'function') uiSfx('open');
    if (typeof toast === 'function') toast(`Bắt đầu giao dịch cùng <b>${esc(session.partner.name)}</b>!`);
    // Tự động mở hành trang nếu đang đóng
    const invWin = document.getElementById('fw-inv');
    if (invWin && invWin.classList.contains('hidden') && typeof openWin === 'function') {
      openWin('inv');
    }
  },

  // 4. Đồng bộ dữ liệu sàn giao dịch
  onSync(session) {
    if (!this.active) return;
    this.session = session;
    this.render();
  },

  // 5. Thêm vật phẩm vào ô giao dịch
  addItem(itemUid) {
    if (!this.active || !this.session) return;
    if (this.session.myLocked) {
      if (typeof toast === 'function') toast('Đã khóa giao dịch! Không thể thêm đồ.');
      return;
    }
    if (this.session.myItems.length >= 16) {
      if (typeof toast === 'function') toast('Ô giao dịch đã đầy (tối đa 16 món)!');
      return;
    }
    MP.ws.send(JSON.stringify({
      type: 'trade_set_item',
      action: 'add',
      itemUid: Number(itemUid)
    }));
    if (typeof uiSfx === 'function') uiSfx('pickup');
  },

  // 6. Gỡ vật phẩm khỏi ô giao dịch
  removeItem(itemUid) {
    if (!this.active || !this.session) return;
    if (this.session.myLocked) {
      if (typeof toast === 'function') toast('Đã khóa giao dịch! Không thể gỡ đồ.');
      return;
    }
    MP.ws.send(JSON.stringify({
      type: 'trade_set_item',
      action: 'remove',
      itemUid: Number(itemUid)
    }));
    if (typeof uiSfx === 'function') uiSfx('drop');
  },

  // 7. Nhập lượng bạc giao dịch
  setMoney(amt) {
    if (!this.active || !this.session) return;
    if (this.session.myLocked) return;
    let n = Math.max(0, Math.floor(Number(amt) || 0));
    const maxGold = (typeof S !== 'undefined' && S && S.gold) ? S.gold : 0;
    if (n > maxGold) n = maxGold;
    MP.ws.send(JSON.stringify({
      type: 'trade_set_money',
      money: n
    }));
  },

  // 8. Khóa giao dịch
  lock() {
    if (!this.active || !this.session) return;
    MP.ws.send(JSON.stringify({ type: 'trade_lock' }));
    if (typeof uiSfx === 'function') uiSfx('equip');
  },

  // 9. Xác nhận giao dịch
  confirm() {
    if (!this.active || !this.session) return;
    if (!this.session.myLocked || !this.session.partnerLocked) {
      if (typeof toast === 'function') toast('Cả hai bên phải Khóa trước khi Xác Nhận!');
      return;
    }
    MP.ws.send(JSON.stringify({ type: 'trade_confirm' }));
    if (typeof uiSfx === 'function') uiSfx('buy');
  },

  // 10. Hủy giao dịch
  cancel() {
    if (MP.ws && MP.ws.readyState === 1) {
      MP.ws.send(JSON.stringify({ type: 'trade_cancel' }));
    }
    this.close();
  },

  onComplete() {
    if (typeof uiSfx === 'function') uiSfx('buy');
    if (typeof toast === 'function') toast('🎉 <b>Giao dịch thành công!</b>');
    this.close();
  },

  onCancelled(reason) {
    if (typeof toast === 'function') toast(reason || 'Giao dịch đã bị hủy.');
    this.close();
  },

  close() {
    this.active = false;
    this.session = null;
    const w = document.getElementById('tradeWindow');
    if (w) w.remove();
  },

  // Render giao diện chuẩn UiTrade.ini
  render() {
    let w = document.getElementById('tradeWindow');
    if (!w) {
      w = document.createElement('div');
      w.id = 'tradeWindow';
      w.className = 'trade-window';
      document.body.appendChild(w);
    }

    const s = this.session;
    if (!s) return;

    const myLocked = s.myLocked;
    const myConfirmed = s.myConfirmed;
    const partnerLocked = s.partnerLocked;
    const partnerConfirmed = s.partnerConfirmed;
    const canConfirm = myLocked && partnerLocked;

    // Helper render item grid (16 ô)
    const renderGrid = (items, isMe) => {
      let html = '';
      for (let i = 0; i < 16; i++) {
        const it = items[i];
        if (it) {
          const rColor = it.r === 2 ? '#60a5fa' : it.r === 3 ? '#c084fc' : it.r === 4 ? '#ffd700' : '#d1d5db';
          html += `
            <div class="trade-grid-slot occupied" data-uid="${it.uid}" title="${esc(it.n)} (Nhấp để ${isMe ? 'gỡ' : 'xem'})">
              <img src="${it.ic || 'img/i/g1.png'}" alt="${esc(it.n)}" class="trade-item-img">
              <span class="trade-item-name" style="color:${rColor};">${esc(it.n.slice(0, 8))}</span>
            </div>
          `;
        } else {
          html += `<div class="trade-grid-slot empty"></div>`;
        }
      }
      return html;
    };

    w.innerHTML = `
      <div class="trade-frame">
        <!-- Tiêu đề giao diện chuẩn JX -->
        <div class="trade-header">
          <span class="trade-title">🤝 GIAO DỊCH VỚI: <b style="color:#ffd700;">${esc(s.partner.name)}</b> (Lv.${s.partner.lvl || 1})</span>
          <button class="trade-close-btn" onclick="TRADE.cancel()">✕</button>
        </div>

        <div class="trade-body">
          <!-- BÊN TRÁI: ĐỒ & TIỀN CỦA BẢN THÂN -->
          <div class="trade-side self ${myLocked ? 'locked' : ''}">
            <div class="trade-side-header">
              <span class="side-label">Bản Thân <small style="color:#a39276;">(Bấm đồ trong túi để đặt vào)</small></span>
              <span class="side-badge ${myLocked ? 'locked' : 'pending'}">${myLocked ? '🔒 ĐÃ KHÓA' : '⏳ CHƯA KHÓA'}</span>
            </div>

            <div class="trade-grid" id="tradeMyItems">
              ${renderGrid(s.myItems, true)}
            </div>

            <div class="trade-money-row">
              <span class="money-icon">🪙 Bạc:</span>
              <input type="number" id="tradeMyMoneyInput" class="trade-money-input" 
                     value="${s.myMoney || 0}" min="0" max="${(typeof S !== 'undefined' && S.gold) ? S.gold : 0}"
                     ${myLocked ? 'disabled' : ''} onchange="TRADE.setMoney(this.value)">
              <span class="money-max" title="Tối đa ngân lượng hiện có" onclick="if(!${myLocked}){TRADE.setMoney(${typeof S !== 'undefined' ? S.gold : 0});}">Max</span>
            </div>
          </div>

          <!-- BÊN PHẢI: ĐỒ & TIỀN CỦA ĐỐI PHƯƠNG -->
          <div class="trade-side partner ${partnerLocked ? 'locked' : ''}">
            <div class="trade-side-header">
              <span class="side-label">${esc(s.partner.name)}</span>
              <span class="side-badge ${partnerLocked ? 'locked' : 'pending'}">${partnerLocked ? '🔒 ĐÃ KHÓA' : '⏳ CHỜ KHÓA'}</span>
            </div>

            <div class="trade-grid" id="tradePartnerItems">
              ${renderGrid(s.partnerItems, false)}
            </div>

            <div class="trade-money-row">
              <span class="money-icon">🪙 Bạc:</span>
              <div class="trade-money-display">${fmt(s.partnerMoney || 0)} Lượng</div>
            </div>
          </div>
        </div>

        <!-- THANH NÚT ĐIỀU KHIỂN & BẢO MẬT CHUẨN VLTK -->
        <div class="trade-footer">
          <div class="trade-status-hint">
            ${!myLocked ? '👉 Kiểm tra kỹ đồ và tiền, sau đó bấm <b>Khóa</b>.' :
              !partnerLocked ? '⏳ Đang chờ đối phương xác nhận và Khóa...' :
              '✅ Cả hai đã Khóa! Bấm <b>Xác Nhận</b> để hoàn tất trao đổi.'}
          </div>

          <div class="trade-btn-group">
            <button class="trade-act-btn lock ${myLocked ? 'active' : ''}" onclick="TRADE.lock()" ${myLocked ? 'disabled' : ''}>
              ${myLocked ? '🔒 Đã Khóa' : '🔐 Khóa Giao Dịch'}
            </button>
            <button class="trade-act-btn confirm ${myConfirmed ? 'active' : ''}" onclick="TRADE.confirm()" ${!canConfirm || myConfirmed ? 'disabled' : ''}>
              ${myConfirmed ? '✅ Đã Xác Nhận' : '🤝 Xác Nhận'}
            </button>
            <button class="trade-act-btn cancel" onclick="TRADE.cancel()">
              ✕ Hủy Bỏ
            </button>
          </div>
        </div>
      </div>
    `;
  }
};

if (typeof window !== 'undefined') {
  window.TRADE = TRADE;
  TRADE.init();
}
