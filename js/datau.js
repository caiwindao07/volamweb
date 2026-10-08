/* ==========================================================================
   VÕ LÂM IDLE - HỆ THỐNG NHIỆM VỤ DÃ TẨU CHUẨN VLTK (DA TAU QUEST SYSTEM)
   Trích xuất từ Server\script\global\npcchucnang\datau.lua (H:\JxPhaThien)
   1. Chuỗi 1000 nhiệm vụ Dã Tẩu: Đánh quái, Tìm trang bị, Giao khoáng thạch/bảo thạch
   2. Phần thưởng 3 lựa chọn kinh điển: Kinh Nghiệm / Ngân Lượng / Bảo Vật Ngẫu Nhiên
   3. Mốc thưởng chuỗi: 10, 20, 50, 100, 200, 500 nhiệm vụ (Thủy Tinh, Huyền Tinh, Hoàng Kim)
   4. Cho phép Đổi / Hủy nhiệm vụ khi gặp nhiệm vụ quá khó
   ========================================================================== */
'use strict';

const DATAU = {
  streak: 0,
  totalDone: 0,
  curTask: null,
  completed: false,
  lastReward: null,

  init() {
    // Tự động kiểm tra dữ liệu khi kết nối máy chủ
    if (typeof MP !== 'undefined') {
      const origOnMessage = MP.onMessage;
    }
  },

  open() {
    this.requestInfo();
    const fw = document.getElementById('fw-datau');
    if (fw) {
      fw.classList.remove('hidden');
      if (typeof bringToFront === 'function') bringToFront(fw);
    }
    this.render();
  },

  close() {
    const fw = document.getElementById('fw-datau');
    if (fw) fw.classList.add('hidden');
  },

  toggle() {
    const fw = document.getElementById('fw-datau');
    if (!fw) return;
    if (fw.classList.contains('hidden')) this.open();
    else this.close();
  },

  requestInfo() {
    if (MP && MP.connected && MP.ws) {
      MP.ws.send(JSON.stringify({ type: 'datau_info' }));
    }
  },

  accept() {
    if (MP && MP.connected && MP.ws) {
      MP.ws.send(JSON.stringify({ type: 'datau_accept' }));
      if (typeof uiSfx === 'function') uiSfx('quest');
    }
  },

  check() {
    if (MP && MP.connected && MP.ws) {
      MP.ws.send(JSON.stringify({ type: 'datau_check' }));
      if (typeof uiSfx === 'function') uiSfx('equip');
    }
  },

  claim(choice) {
    if (MP && MP.connected && MP.ws) {
      MP.ws.send(JSON.stringify({ type: 'datau_claim', choice: choice }));
      if (typeof uiSfx === 'function') uiSfx('levelup');
    }
  },

  skip() {
    const curGold = (typeof S !== 'undefined' && S.gold) ? S.gold : 0;
    if (curGold < 10000) {
      if (typeof toast === 'function') toast('Không đủ 10.000 lượng để đổi nhiệm vụ!');
      return;
    }
    if (typeof modal === 'function') {
      modal(`
        <div style="padding:14px;text-align:center;">
          <h4 style="color:#ffd700;font-size:13px;margin-bottom:8px;">📜 ĐỔI NHIỆM VỤ DÃ TẨU</h4>
          <p style="font-size:12px;color:#f5ede0;margin-bottom:12px;">
            Ngươi có chắc muốn bỏ ra <b style="color:#fbbf24;">10.000 lượng</b> để đổi sang nhiệm vụ khác không?
          </p>
          <div style="display:flex;gap:8px;justify-content:center;">
            <button class="jx-action-btn gold" onclick="DATAU.doSkip(); closeModal();">Xác Nhận Đổi</button>
            <button class="jx-action-btn" onclick="closeModal();">Hủy Bỏ</button>
          </div>
        </div>
      `);
    }
  },

  doSkip() {
    if (MP && MP.connected && MP.ws) {
      MP.ws.send(JSON.stringify({ type: 'datau_skip' }));
    }
  },

  onSync(msg) {
    if (msg.streak !== undefined) this.streak = msg.streak;
    if (msg.totalDone !== undefined) this.totalDone = msg.totalDone;
    this.curTask = msg.curTask || null;
    this.completed = !!msg.completed;
    if (msg.lastReward) this.lastReward = msg.lastReward;
    this.render();
  },

  // Hook khi quái bị tiêu diệt để tăng thanh tiến độ mượt mà
  onMonsterKilled(zoneId) {
    if (!this.curTask || this.curTask.type !== 'monster' || this.completed) return;
    if (!this.curTask.zoneId || this.curTask.zoneId === zoneId) {
      this.curTask.progress = Math.min(this.curTask.targetCount, (this.curTask.progress || 0) + 1);
      if (this.curTask.progress >= this.curTask.targetCount) {
        this.completed = true;
        if (typeof toast === 'function') toast('🎉 <b>Nhiệm vụ Dã Tẩu đã hoàn thành!</b> Hãy quay lại nhận thưởng.');
      }
      this.render();
    }
  },

  render() {
    const fw = document.getElementById('fw-datau');
    if (!fw) return;

    const streak = this.streak || 0;
    const task = this.curTask;
    const isDone = this.completed;

    // Tính mốc sắp tới (10, 20, 50, 100, 200, 500, 1000)
    const milestones = [10, 20, 50, 100, 200, 500, 1000];
    const nextMs = milestones.find(m => m > streak) || 1000;
    const msProgress = Math.min(100, Math.round((streak / nextMs) * 100));

    let taskBody = '';
    if (!task) {
      taskBody = `
        <div class="datau-empty-state">
          <p class="datau-dialogue">
            "Lão phu ngao du khắp chốn giang hồ, thu thập vô số kỳ trân dị bảo. Ngươi có muốn giúp lão phu hoàn thành một tâm nguyện không?"
          </p>
          <button class="jx-action-btn gold datau-btn-big" onclick="DATAU.accept()">
            📜 Nhận Nhiệm Vụ Dã Tẩu
          </button>
        </div>
      `;
    } else if (isDone) {
      taskBody = `
        <div class="datau-done-state">
          <div class="datau-congrats">
            🎉 <b>HOÀN THÀNH NHIỆM VỤ!</b>
          </div>
          <p style="font-size:12px;color:#a5ffcb;margin:6px 0 12px;text-align:center;">
            "Khá lắm đại hiệp! Lão phu có 3 phần thưởng này, ngươi hãy chọn lấy một thứ vừa ý:"
          </p>

          <div class="datau-reward-choices">
            <div class="datau-choice-card" onclick="DATAU.claim('exp')">
              <span class="choice-icon">⚡</span>
              <span class="choice-title">Kinh Nghiệm</span>
              <span class="choice-desc">+${fmt((typeof S !== 'undefined' ? S.lvl : 50) * 8000)} EXP</span>
              <button class="jx-action-btn gold" style="width:100%;font-size:11px;margin-top:6px;">Nhận EXP</button>
            </div>

            <div class="datau-choice-card" onclick="DATAU.claim('money')">
              <span class="choice-icon">🪙</span>
              <span class="choice-title">Ngân Lượng</span>
              <span class="choice-desc">+${fmt((typeof S !== 'undefined' ? S.lvl : 50) * 2000)} Lượng</span>
              <button class="jx-action-btn gold" style="width:100%;font-size:11px;margin-top:6px;">Nhận Bạc</button>
            </div>

            <div class="datau-choice-card" onclick="DATAU.claim('treasure')">
              <span class="choice-icon">🎁</span>
              <span class="choice-title">Bảo Vật</span>
              <span class="choice-desc">Thủy Tinh / Huyền Tinh</span>
              <button class="jx-action-btn gold" style="width:100%;font-size:11px;margin-top:6px;">Nhận Bảo Vật</button>
            </div>
          </div>
        </div>
      `;
    } else {
      // Đang làm nhiệm vụ
      const pct = Math.min(100, Math.round(((task.progress || 0) / Math.max(1, task.targetCount || 1)) * 100));
      taskBody = `
        <div class="datau-active-state">
          <div class="datau-task-card">
            <div class="datau-task-header">
              <span class="datau-task-type">[${esc(task.typeName || 'Nhiệm vụ')}]</span>
              <span class="datau-task-streak">Nhiệm vụ thứ #${streak + 1}</span>
            </div>

            <div class="datau-task-desc">
              ${esc(task.desc || 'Hoàn thành yêu cầu')}
            </div>

            <div class="datau-progress-box">
              <div class="datau-progress-fill" style="width:${pct}%;"></div>
              <span class="datau-progress-text">${task.progress || 0} / ${task.targetCount || 1} (${pct}%)</span>
            </div>

            ${task.itemIcon ? `
              <div class="datau-item-req">
                <img src="${task.itemIcon}" alt="Vật phẩm" class="datau-req-icon">
                <span style="color:#ffd700;font-size:12px;">${esc(task.itemName || '')}</span>
              </div>
            ` : ''}
          </div>

          <div class="datau-action-row">
            <button class="jx-action-btn gold" onclick="DATAU.check()" style="flex:1;padding:8px;">
              🔍 Kiểm Tra / Giao Nộp
            </button>
            <button class="jx-action-btn" onclick="DATAU.skip()" style="padding:8px 12px;color:#f87171;border-color:#b91c1c;">
              🔄 Đổi Nhiệm Vụ (1v)
            </button>
          </div>
        </div>
      `;
    }

    fw.innerHTML = `
      <div class="jx-float-header">
        <span class="jx-float-title">📜 NHIỆM VỤ DÃ TẨU (VLTK)</span>
        <button class="jx-close-btn" onclick="DATAU.close()">✕</button>
      </div>

      <div class="datau-container">
        <!-- Banner Dã Tẩu & Mốc Chuỗi -->
        <div class="datau-milestone-bar">
          <div class="datau-avatar-box">
            <span class="datau-avatar-icon">👴</span>
            <div class="datau-avatar-text">
              <span style="color:#ffd700;font-weight:700;">Dã Tẩu Tiên Sinh</span>
              <span style="color:#a39276;font-size:11px;">Chuỗi liên tiếp: <b style="color:#4ade80;">${streak}</b> lượt</span>
            </div>
          </div>
          <div class="datau-ms-target" title="Mốc thưởng lớn tiếp theo: ${nextMs} lượt">
            <span>Mốc Thưởng: <b>${streak}/${nextMs}</b></span>
            <div class="datau-ms-progress"><div style="width:${msProgress}%;"></div></div>
          </div>
        </div>

        <!-- Thân nhiệm vụ -->
        <div class="datau-body">
          ${taskBody}
        </div>

        <!-- Mốc phần thưởng danh giá -->
        <div class="datau-milestones-list">
          <span class="ms-title">🎁 MỐC THƯỞNG ĐẶC BIỆT:</span>
          <div class="ms-tags">
            <span class="ms-tag ${streak >= 10 ? 'done' : ''}">10: Lam Thủy Tinh</span>
            <span class="ms-tag ${streak >= 20 ? 'done' : ''}">20: Tử Thủy Tinh</span>
            <span class="ms-tag ${streak >= 50 ? 'done' : ''}">50: Lục Thủy Tinh</span>
            <span class="ms-tag ${streak >= 100 ? 'done' : ''}">100: Hoàng Kim Cụ</span>
            <span class="ms-tag ${streak >= 200 ? 'done' : ''}">200: Định Quốc</span>
          </div>
        </div>
      </div>
    `;
  }
};

if (typeof window !== 'undefined') {
  window.DATAU = DATAU;
}
