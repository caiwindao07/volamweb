/* ==========================================================================
   HỆ THỐNG ĐIỂM DANH HẰNG NGÀY & 28 NGÀY (DAILY SIGN-IN & ATTENDANCE SYSTEM)
   Trích xuất từ kịch bản gốc và UiSignIn.ini của H:\JxPhaThien
   ========================================================================== */
'use strict';

window.SIGNIN = (function () {
  // Bảng 28 phần thưởng điểm danh hàng ngày
  const DAILY_REWARDS = [
    { day: 1, name: '5 vạn Lượng + 5 Tiên Thảo Lộ', icon: 'img/it/ttl.png', gold: 50000, desc: 'Ngân lượng khởi đầu cùng Tiên Thảo Lộ x2 EXP trong 1 giờ.' },
    { day: 2, name: 'Huyền Tinh Cấp 4 + 10 Đại Lực Hoàn', icon: 'img/it/ht4.png', gold: 10000, desc: 'Khoáng thạch quý ép trang bị và đan dược tăng lực công kích.' },
    { day: 3, name: '10 vạn Lượng + 200 Phúc Duyên', icon: 'img/it/gold.png', gold: 100000, desc: 'Tích lũy ngân lượng và điểm phúc duyên đổi vật phẩm quý.' },
    { day: 4, name: '1 Tử Thủy Tinh + Thiết La Hán', icon: 'img/it/ttt.png', gold: 20000, desc: 'Thủy tinh màu nhiệm dùng để tẩy điểm và kích hoạt thuộc tính.' },
    { day: 5, name: '15 vạn Lượng + 5 Lệnh Bài', icon: 'img/tongkim/battlefield_icon.png', gold: 150000, desc: 'Lệnh bài dùng tham chiến Tống Kim và quy đổi quân nhu.' },
    { day: 6, name: '1 Lam Thủy Tinh + 1 Lục Thủy Tinh', icon: 'img/it/ltt.png', gold: 30000, desc: 'Cặp đôi thủy tinh nguyên bản huyền thoại của giang hồ Võ Lâm.' },
    { day: 7, name: '🎁 Rương Mốc 7 Ngày: Trang Bị Cam', icon: 'img/signin/chest_7.png', gold: 300000, isMilestone: true, milestoneId: 7, desc: 'Nhận ngay 1 Trang Bị Hoàng Kim Môn Phái cấp cao + 30 vạn lượng!' },

    { day: 8, name: '10 vạn Lượng + Bát Nhã Ba La Mật', icon: 'img/it/bnblm.png', gold: 100000, desc: 'Tâm kinh Phật môn giúp ngộ đạo võ học, tăng điểm kỹ năng.' },
    { day: 9, name: '2 Huyền Tinh Cấp 5 + Đại Lực Hoàn', icon: 'img/it/ht5.png', gold: 50000, desc: 'Khoáng thạch cấp 5 nâng cấp trang bị hoàng kim.' },
    { day: 10, name: '20 vạn Lượng + 500 Phúc Duyên', icon: 'img/it/gold.png', gold: 200000, desc: 'Túi tiền dồi dào bôn tẩu giang hồ.' },
    { day: 11, name: '2 Tinh Hồng Bảo Thạch', icon: 'img/it/thbt.png', gold: 50000, desc: 'Bảo thạch rèn thần binh phát sáng ngũ sắc.' },
    { day: 12, name: '25 vạn Lượng + 10 Chiến Lệnh', icon: 'img/tongkim/battlefield_icon.png', gold: 250000, desc: 'Bổng lộc chiến trận gia tăng.' },
    { day: 13, name: '2 Lam Thủy Tinh + 2 Tử Thủy Tinh', icon: 'img/it/ttt.png', gold: 60000, desc: 'Bộ sưu tập thủy tinh cường hóa vũ khí cực phẩm.' },
    { day: 14, name: '🎁 Rương Mốc 14 Ngày: Tuyệt Học 90', icon: 'img/signin/chest_14.png', gold: 500000, isMilestone: true, milestoneId: 14, desc: 'Bí kíp trấn phái cấp 90 uy chấn thiên hạ + 50 vạn lượng!' },

    { day: 15, name: '20 vạn Lượng + 10 Tiên Thảo Lộ', icon: 'img/it/ttl.png', gold: 200000, desc: 'Nguồn lực tu luyện cấp tốc.' },
    { day: 16, name: '2 Huyền Tinh Cấp 6', icon: 'img/it/ht6.png', gold: 80000, desc: 'Nguyên liệu quý hiếm bậc nhất chốn giang hồ.' },
    { day: 17, name: '30 vạn Lượng + 1000 Phúc Duyên', icon: 'img/it/gold.png', gold: 300000, desc: 'Ngân lượng dồi dào mua sắm thỏa thích.' },
    { day: 18, name: '3 Lam Thủy Tinh + 3 Tử Thủy Tinh', icon: 'img/it/ltt.png', gold: 100000, desc: 'Thủy tinh tôi luyện thần binh.' },
    { day: 19, name: '35 vạn Lượng + 15 Chiến Lệnh', icon: 'img/tongkim/battlefield_icon.png', gold: 350000, desc: 'Quân lương tiếp tế hào phóng.' },
    { day: 20, name: '3 Huyền Tinh Cấp 6 + Bảo Thạch', icon: 'img/it/ht6.png', gold: 120000, desc: 'Củng cố giáp trụ và vũ khí.' },
    { day: 21, name: '🎁 Rương Mốc 21 Ngày: Huyền Tinh 7', icon: 'img/signin/chest_21.png', gold: 1000000, isMilestone: true, milestoneId: 21, desc: 'Thần thạch Huyền Tinh Cấp 7 huyền thoại + 100 vạn lượng!' },

    { day: 22, name: '40 vạn Lượng + 20 Đại Lực Hoàn', icon: 'img/it/gold.png', gold: 400000, desc: 'Tăng cường thể lực và ngân khố.' },
    { day: 23, name: '2 Thần Bí Quặng Thạch', icon: 'img/it/tbqt.png', gold: 150000, desc: 'Đá thiên thạch chế tạo đồ Bạch Kim.' },
    { day: 24, name: '50 vạn Lượng + 2000 Phúc Duyên', icon: 'img/it/gold.png', gold: 500000, desc: 'Tích lũy phúc duyên đổi trang bị Định Quốc.' },
    { day: 25, name: 'Bộ Tam Thủy Tinh (Lam+Lục+Tử)', icon: 'img/it/ttt.png', gold: 200000, desc: 'Đủ bộ ba loại thủy tinh tinh hoa đất trời.' },
    { day: 26, name: '2 Huyền Tinh Cấp 7', icon: 'img/it/ht7.png', gold: 300000, desc: 'Bộ đôi thần thạch vô giá.' },
    { day: 27, name: '60 vạn Lượng + 30 Chiến Lệnh', icon: 'img/tongkim/battlefield_icon.png', gold: 600000, desc: 'Phần thưởng dành cho chiến binh bất khuất.' },
    { day: 28, name: '🎁 Rương Đại Mốc 28 Ngày: Thần Thú', icon: 'img/signin/chest_28.png', gold: 2000000, isMilestone: true, milestoneId: 28, desc: 'Thần Thú Bôn Tiêu / Chiếu Dạ Ngọc Sư Tử + 200 vạn lượng!' }
  ];

  // Lấy dữ liệu điểm danh hiện tại của người chơi
  function getSignData() {
    if (!window.S) return { count: 0, lastDate: '', claimedDays: [], claimedMilestones: [] };
    if (!S.signin) {
      S.signin = {
        count: 0,
        lastDate: '',
        claimedDays: [],
        claimedMilestones: []
      };
    }
    return S.signin;
  }

  function getTodayString() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function canSignToday() {
    const data = getSignData();
    const today = getTodayString();
    return data.lastDate !== today;
  }

  function claimToday() {
    if (!canSignToday()) {
      if (typeof toast === 'function') toast('Hôm nay bạn đã điểm danh rồi, hãy quay lại vào ngày mai!');
      return;
    }
    const data = getSignData();
    const today = getTodayString();
    data.count = (data.count || 0) + 1;
    if (data.count > 28) data.count = 1; // Hết chu kỳ 28 ngày tự động lặp lại chu kỳ mới
    data.lastDate = today;
    if (!data.claimedDays) data.claimedDays = [];
    data.claimedDays.push(data.count);

    const currentReward = DAILY_REWARDS[data.count - 1];
    if (currentReward) {
      if (currentReward.gold) {
        S.gold = (S.gold || 0) + currentReward.gold;
        if (typeof window.reportLegitGoldGain === 'function') {
          window.reportLegitGoldGain(currentReward.gold);
        }
      }

      // Tạo phần thưởng trang bị nếu là ngày có mốc hoặc thưởng đặc biệt
      if (currentReward.isMilestone) {
        giveMilestoneItem(currentReward.milestoneId);
      }

      if (typeof toast === 'function') {
        toast(`🎉 Điểm danh Ngày ${data.count} thành công! Nhận: ${currentReward.name}`);
      }
      if (typeof log === 'function') {
        log(`[Điểm Danh] Ngày ${data.count}: Nhận <b>${currentReward.name}</b> (+${fmt(currentReward.gold)} lượng).`);
      }
    }

    if (typeof uiSfx === 'function') uiSfx('use');
    if (typeof save === 'function') save();
    if (typeof refresh === 'function') refresh();
    renderWindow();
  }

  function claimMilestone(milestoneId) {
    const data = getSignData();
    if (!data.claimedMilestones) data.claimedMilestones = [];
    if (data.claimedMilestones.includes(milestoneId)) {
      if (typeof toast === 'function') toast(`Rương mốc ${milestoneId} ngày đã nhận rồi!`);
      return;
    }
    if (data.count < milestoneId) {
      if (typeof toast === 'function') toast(`Chưa đủ điều kiện! Cần tích lũy điểm danh đủ ${milestoneId} ngày (hiện tại: ${data.count}/${milestoneId}).`);
      return;
    }

    data.claimedMilestones.push(milestoneId);
    giveMilestoneItem(milestoneId);
    if (typeof uiSfx === 'function') uiSfx('equipWeapon');
    if (typeof save === 'function') save();
    if (typeof refresh === 'function') refresh();
    renderWindow();
  }

  function giveMilestoneItem(milestoneId) {
    // Tặng trang bị / vật phẩm cực phẩm theo mốc
    if (!Array.isArray(S.inv)) S.inv = [];
    if (milestoneId === 7) {
      // Trang bị hoàng kim cam cấp 80
      const gear = {
        uid: Date.now() + Math.floor(Math.random() * 1000),
        n: 'Trang Bị Hoàng Kim 7 Ngày',
        d: 0, // Vũ khí kiếm
        r: 3, // Cam
        lvl: Math.max(50, Math.min(80, S.lvl || 50)),
        s: S.fac ? (FAC[S.fac] ? FAC[S.fac].s : 0) : 0,
        ic: 'img/it/w_1.png',
        props: [
          ['physDmgP', 80],
          ['atkSpd', 25],
          ['lifeMax', 350],
          ['allRes', 20]
        ]
      };
      if (S.inv.length < (typeof INV_MAX !== 'undefined' ? INV_MAX : 1000)) S.inv.push(gear);
      if (typeof toast === 'function') toast('🎁 Đã nhận được Rương Mốc 7 Ngày!');
    } else if (milestoneId === 14) {
      if (S.skPts !== undefined) S.skPts += 5;
      if (typeof toast === 'function') toast('🎁 Đã mở Rương Bí Kíp 90 (+5 điểm kỹ năng)!');
    } else if (milestoneId === 21) {
      if (S.attrPts !== undefined) S.attrPts += 50;
      if (typeof toast === 'function') toast('🎁 Đã mở Rương Huyền Tinh 7 (+50 điểm tiềm năng)!');
    } else if (milestoneId === 28) {
      // Thần Thú Bôn Tiêu
      if (typeof S.mount !== 'undefined') {
        S.mount = { id: 'bontieu', n: 'Chiến Mã Bôn Tiêu (Hoàng Kim)', spd: 45, hp: 1000, res: 25 };
      }
      if (typeof toast === 'function') toast('🐎 Chúc mừng bạn đã nhận được THẦN THÚ BÔN TIÊU 28 Ngày!');
    }
  }

  function renderWindow() {
    const fw = document.getElementById('fw-signin');
    if (!fw) return;

    const data = getSignData();
    const isSignedToday = !canSignToday();
    const count = data.count || 0;

    let gridHtml = '';
    for (let i = 0; i < DAILY_REWARDS.length; i++) {
      const rew = DAILY_REWARDS[i];
      const dayNum = rew.day;
      const isPast = dayNum <= count;
      const isToday = dayNum === count + (isSignedToday ? 0 : 1);
      const isClaimed = (data.claimedDays || []).includes(dayNum);

      gridHtml += `
        <div class="signin-cell ${isClaimed ? 'claimed' : ''} ${isToday ? 'current' : ''}" title="${rew.name}: ${rew.desc}">
          <div class="cell-day">Ngày ${dayNum}</div>
          <div class="cell-icon">
            <img src="${rew.icon}" alt="${rew.name}" onerror="this.src='img/it/gold.png'">
            ${isClaimed ? '<div class="cell-stamped"><img src="img/signin/signed.png" alt="Đã nhận"></div>' : ''}
          </div>
          <div class="cell-name">${dayNum === 7 || dayNum === 14 || dayNum === 21 || dayNum === 28 ? '<b style="color:#ffd700">Rương Quý</b>' : fmt(rew.gold) + ' L'}</div>
        </div>
      `;
    }

    const milestones = [
      { id: 7, days: 7, icon: 'img/signin/chest_7.png', name: 'Mốc 7 Ngày' },
      { id: 14, days: 14, icon: 'img/signin/chest_14.png', name: 'Mốc 14 Ngày' },
      { id: 21, days: 21, icon: 'img/signin/chest_21.png', name: 'Mốc 21 Ngày' },
      { id: 28, days: 28, icon: 'img/signin/chest_28.png', name: 'Mốc 28 Ngày' }
    ];

    let milestoneHtml = '';
    for (const m of milestones) {
      const claimed = (data.claimedMilestones || []).includes(m.id);
      const reachable = count >= m.days;
      milestoneHtml += `
        <div class="milestone-box ${claimed ? 'claimed' : reachable ? 'ready' : 'locked'}" onclick="SIGNIN.claimMilestone(${m.id})">
          <img src="${m.icon}" alt="${m.name}">
          <div class="m-info">
            <span class="m-title">${m.name}</span>
            <span class="m-status">${claimed ? '✓ Đã nhận' : reachable ? '✨ Nhận ngay' : `${count}/${m.days} ngày`}</span>
          </div>
        </div>
      `;
    }

    fw.innerHTML = `
      <div class="jx-float-header" id="fw-signin-header">
        <span class="jx-float-title">🎁 ĐIỂM DANH HẰNG NGÀY & PHÚC LỢI VÕ LÂM</span>
        <button class="jx-close-btn" onclick="SIGNIN.close()">✕</button>
      </div>
      <div class="signin-body">
        <div class="signin-top-banner">
          <div class="banner-text">
            <h3>Chu Kỳ Điểm Danh: Đã tích lũy <span style="color:#ffd700;font-size:16px;">${count}/28</span> ngày</h3>
            <p>Mỗi ngày online bấm Điểm Danh để nhận Ngân Lượng, Thủy Tinh, Huyền Tinh và Thần Thú!</p>
          </div>
          <button class="btn-signin-action ${isSignedToday ? 'disabled' : ''}" onclick="SIGNIN.claimToday()">
            ${isSignedToday ? '✓ ĐÃ ĐIỂM DANH' : '🎁 ĐIỂM DANH NGAY'}
          </button>
        </div>

        <div class="signin-milestones-row">
          ${milestoneHtml}
        </div>

        <div class="signin-calendar-grid">
          ${gridHtml}
        </div>
      </div>
    `;

    // Thiết lập kéo thả cửa sổ
    setupDrag('fw-signin', 'fw-signin-header');
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

  function open() {
    const fw = document.getElementById('fw-signin');
    if (!fw) return;
    renderWindow();
    fw.classList.remove('hidden');
    // Căn giữa nếu chưa có vị trí
    if (!fw.style.top || fw.style.top === '0px') {
      fw.style.top = '100px';
      fw.style.left = 'calc(50% - 290px)';
    }
  }

  function close() {
    const fw = document.getElementById('fw-signin');
    if (fw) fw.classList.add('hidden');
  }

  function toggle() {
    const fw = document.getElementById('fw-signin');
    if (!fw) return;
    if (fw.classList.contains('hidden')) open();
    else close();
  }

  return {
    open,
    close,
    toggle,
    claimToday,
    claimMilestone,
    renderWindow
  };
})();
