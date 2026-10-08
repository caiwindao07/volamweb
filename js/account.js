/* ==========================================================================
   HỆ THỐNG TÀI KHOẢN & ĐỒNG BỘ ĐÁM MÂY (VO LAM IDLE ACCOUNT SYSTEM)
   Bắt buộc người chơi phải có tài khoản (Đăng nhập / Đăng ký) trước khi vào game.
   Dữ liệu nhân vật, cấp độ, trang bị, ngân lượng được lưu trực tiếp vào Server DB.
   ========================================================================== */
'use strict';

const ACC = {
  token: null,
  user: null,
  isLoggedIn: false,
  lastCloudSaveT: 0
};

// Khởi tạo và kiểm tra trạng thái đăng nhập
let _authChecking = false;
function initAccountSystem(onReady) {
  if (ACC.isLoggedIn) {
    if (onReady) onReady(true);
    return;
  }
  if (_authChecking) return;
  _authChecking = true;
  try {
    ACC.token = localStorage.getItem('jx_auth_token') || null;
  } catch (e) {
    ACC.token = null;
  }

  if (ACC.token) {
    fetch('/api/me', {
      headers: { 'Authorization': 'Bearer ' + ACC.token }
    })
    .then(res => {
      if (!res.ok) throw new Error('Token không hợp lệ hoặc đã hết hạn');
      return res.json();
    })
    .then(data => {
      if (data && data.ok && data.user) {
        ACC.user = data.user;
        ACC.isLoggedIn = true;
        _authChecking = false;
        console.log(`[Account] Đã xác thực tài khoản: ${ACC.user.username} (${ACC.user.heroName})`);
        
        // Cập nhật game state từ server
        if (data.state && typeof data.state === 'object' && data.state.fac) {
          try {
            if (typeof migrate === 'function') {
              S = migrate(data.state);
            } else {
              S = data.state;
            }
            window.S = S;
            if (typeof recalc === 'function') recalc();
            if (typeof refresh === 'function') refresh();
          } catch (e) {
            console.error('[Account] Error migrating server state:', e);
          }
        }
        
        updateAccountHeaderUI();
        if (typeof enterGameWorld === 'function') enterGameWorld();
        if (onReady) onReady(true);
      } else {
        // Token hết hạn -> yêu cầu đăng nhập lại
        try { localStorage.removeItem('jx_auth_token'); } catch (e) {}
        ACC.token = null;
        ACC.isLoggedIn = false;
        _authChecking = false;
        updateAccountHeaderUI();
        showAuthModal(onReady);
      }
    })
    .catch(err => {
      console.warn('[Account] Không thể kết nối API auth:', err);
      try { localStorage.removeItem('jx_auth_token'); } catch (e) {}
      ACC.token = null;
      ACC.isLoggedIn = false;
      _authChecking = false;
      updateAccountHeaderUI();
      showAuthModal(onReady);
    });
  } else {
    // Chưa đăng nhập -> hiển thị modal
    _authChecking = false;
    updateAccountHeaderUI();
    showAuthModal(onReady);
  }
}

// Bảng giao diện Đăng Nhập / Đăng Ký
function showAuthModal(onSuccess) {
  const facOptions = [
    { id: 'shaolin', n: 'Thiếu Lâm (Kim)' },
    { id: 'tianwang', n: 'Thiên Vương (Kim)' },
    { id: 'tangmen', n: 'Đường Môn (Mộc)' },
    { id: 'wudu', n: 'Ngũ Độc (Mộc)' },
    { id: 'emei', n: 'Nga Mi (Thủy)' },
    { id: 'cuiyan', n: 'Thúy Yên (Thủy)' },
    { id: 'gaibang', n: 'Cái Bang (Hỏa)' },
    { id: 'tianren', n: 'Thiên Nhẫn (Hỏa)' },
    { id: 'wudang', n: 'Võ Đang (Thổ)' },
    { id: 'kunlun', n: 'Côn Lôn (Thổ)' },
    { id: 'huashan', n: 'Hoa Sơn (Thủy)' }
  ];

  const html = `
    <div class="jx-client-window auth-window" style="margin:-14px;border:none;box-shadow:none;">
      <div class="jx-window-header" style="background:linear-gradient(180deg,#3d2b14,#1b1308);border-bottom:1px solid #c89b3c;">
        <div class="jx-window-title">
          <span style="color:#ffd700;font-size:13px;letter-spacing:1px;font-weight:bold;">⚔ VÕ LÂM TRUYỀN KỲ - ĐĂNG NHẬP / TẠO TÀI KHOẢN</span>
        </div>
      </div>

      <div style="padding:14px 16px;">
        <div style="display:flex;gap:8px;margin-bottom:14px;border-bottom:1px solid #3d2f1d;padding-bottom:10px;">
          <button id="tabAuthLogin" class="jx-action-btn gold" style="flex:1;padding:8px 0;font-size:13px;font-weight:bold;">ĐĂNG NHẬP</button>
          <button id="tabAuthReg" class="jx-action-btn" style="flex:1;padding:8px 0;font-size:13px;font-weight:bold;">ĐĂNG KÝ MỚI</button>
        </div>

        <!-- FORM ĐĂNG NHẬP -->
        <div id="formLogin">
          <div style="margin-bottom:10px;">
            <label style="display:block;font-size:11px;color:#c89b3c;margin-bottom:4px;font-weight:bold;">TÊN TÀI KHOẢN</label>
            <input type="text" id="logUser" placeholder="Nhập tài khoản..." maxlength="20" style="width:100%;background:#090705;border:1px solid #5a4425;color:#ffd700;padding:8px 10px;border-radius:4px;font-size:13px;outline:none;">
          </div>
          <div style="margin-bottom:14px;">
            <label style="display:block;font-size:11px;color:#c89b3c;margin-bottom:4px;font-weight:bold;">MẬT KHẨU</label>
            <input type="password" id="logPass" placeholder="Nhập mật khẩu..." maxlength="30" style="width:100%;background:#090705;border:1px solid #5a4425;color:#ffd700;padding:8px 10px;border-radius:4px;font-size:13px;outline:none;">
          </div>
          <div id="logErr" style="color:#ef4444;font-size:11.5px;margin-bottom:10px;display:none;"></div>
          <button id="btnDoLogin" class="jx-action-btn gold" style="width:100%;padding:10px 0;font-size:13px;font-weight:bold;letter-spacing:1px;">⚔ ĐĂNG NHẬP VÀO GAME</button>
          <div style="margin-top:12px;text-align:center;font-size:11.5px;color:#94a3b8;">
            Chưa có tài khoản? <a href="javascript:void(0)" id="linkGoReg" style="color:#ffd700;font-weight:bold;text-decoration:underline;">Đăng ký tài khoản mới tại đây</a>
          </div>
        </div>

        <!-- FORM ĐĂNG KÝ -->
        <div id="formReg" style="display:none;">
          <div style="margin-bottom:8px;">
            <label style="display:block;font-size:11px;color:#c89b3c;margin-bottom:3px;font-weight:bold;">TÊN TÀI KHOẢN (3-20 ký tự, viết liền)</label>
            <input type="text" id="regUser" placeholder="Ví dụ: volam6868..." maxlength="20" style="width:100%;background:#090705;border:1px solid #5a4425;color:#ffd700;padding:7px 10px;border-radius:4px;font-size:12px;outline:none;">
          </div>
          <div style="margin-bottom:8px;">
            <label style="display:block;font-size:11px;color:#c89b3c;margin-bottom:3px;font-weight:bold;">MẬT KHẨU</label>
            <input type="password" id="regPass" placeholder="Tối thiểu 4 ký tự..." maxlength="30" style="width:100%;background:#090705;border:1px solid #5a4425;color:#ffd700;padding:7px 10px;border-radius:4px;font-size:12px;outline:none;">
          </div>
          <div style="margin-bottom:8px;">
            <label style="display:block;font-size:11px;color:#c89b3c;margin-bottom:3px;font-weight:bold;">NHẬP LẠI MẬT KHẨU</label>
            <input type="password" id="regPass2" placeholder="Xác nhận mật khẩu..." maxlength="30" style="width:100%;background:#090705;border:1px solid #5a4425;color:#ffd700;padding:7px 10px;border-radius:4px;font-size:12px;outline:none;">
          </div>
          <div style="display:flex;gap:8px;margin-bottom:12px;">
            <div style="flex:1;">
              <label style="display:block;font-size:11px;color:#c89b3c;margin-bottom:3px;font-weight:bold;">TÊN NHÂN VẬT</label>
              <input type="text" id="regHeroName" placeholder="Tên hiệp khách..." maxlength="16" style="width:100%;background:#090705;border:1px solid #5a4425;color:#ffd700;padding:7px 10px;border-radius:4px;font-size:12px;outline:none;">
            </div>
            <div style="flex:1;">
              <label style="display:block;font-size:11px;color:#c89b3c;margin-bottom:3px;font-weight:bold;">MÔN PHÁI</label>
              <select id="regFac" style="width:100%;background:#090705;border:1px solid #5a4425;color:#ffd700;padding:7px 8px;border-radius:4px;font-size:12px;outline:none;">
                ${facOptions.map(f => `<option value="${f.id}">${f.n}</option>`).join('')}
              </select>
            </div>
          </div>
          <div id="regErr" style="color:#ef4444;font-size:11.5px;margin-bottom:10px;display:none;"></div>
          <button id="btnDoReg" class="jx-action-btn gold" style="width:100%;padding:10px 0;font-size:13px;font-weight:bold;letter-spacing:1px;">✨ TẠO TÀI KHOẢN & BẮT ĐẦU</button>
          <div style="margin-top:12px;text-align:center;font-size:11.5px;color:#94a3b8;">
            Đã có tài khoản? <a href="javascript:void(0)" id="linkGoLog" style="color:#ffd700;font-weight:bold;text-decoration:underline;">Đăng nhập ngay tại đây</a>
          </div>
        </div>
      </div>
    </div>
  `;

  // Mở modal bắt buộc
  modal(html, () => {
    const modalEl = $('#modal');
    if (modalEl) modalEl.dataset.locked = '1';
    const mx = $('#mClose');
    if (mx) mx.style.display = 'none';

    const tabLog = $('#tabAuthLogin');
    const tabReg = $('#tabAuthReg');
    const fLog = $('#formLogin');
    const fReg = $('#formReg');

    const switchToLogin = () => {
      if (tabLog) tabLog.className = 'jx-action-btn gold';
      if (tabReg) tabReg.className = 'jx-action-btn';
      if (fLog) fLog.style.display = 'block';
      if (fReg) fReg.style.display = 'none';
    };

    const switchToReg = () => {
      if (tabReg) tabReg.className = 'jx-action-btn gold';
      if (tabLog) tabLog.className = 'jx-action-btn';
      if (fLog) fLog.style.display = 'none';
      if (fReg) fReg.style.display = 'block';
    };

    if (tabLog) tabLog.onclick = switchToLogin;
    if (tabReg) tabReg.onclick = switchToReg;
    const linkReg = $('#linkGoReg');
    if (linkReg) linkReg.onclick = switchToReg;
    const linkLog = $('#linkGoLog');
    if (linkLog) linkLog.onclick = switchToLogin;

    // Hàm áp dụng trạng thái sau khi đăng nhập/đăng ký thành công
    const onAuthSuccess = (res) => {
      ACC.token = res.token;
      ACC.user = res.user;
      ACC.isLoggedIn = true;
      try {
        localStorage.setItem('jx_auth_token', res.token);
      } catch (e) {
        console.warn('[Account] Không thể ghi localStorage (chế độ ẩn danh):', e);
      }

      if (res.state && typeof res.state === 'object' && res.state.fac) {
        try {
          if (typeof migrate === 'function') {
            S = migrate(res.state);
          } else {
            S = res.state;
          }
          window.S = S;
          // Lưu cache cục bộ (account-keyed)
          if (typeof save === 'function') save();
        } catch (e) {
          console.error('[Account] Error migrating state:', e);
        }
      }

      // Đóng modal cưỡng chế
      try {
        const modalEl = $('#modal');
        if (modalEl) modalEl.dataset.locked = '';
        if (typeof closeModal === 'function') closeModal(true);
        if (modalEl) modalEl.classList.add('hidden');
      } catch (e) {}

      if (mx) mx.style.display = '';

      // Cập nhật lại giao diện và thế giới game
      try {
        if (typeof enterGameWorld === 'function') {
          enterGameWorld();
        } else {
          if (typeof recalc === 'function') recalc();
          if (typeof refresh === 'function') refresh();
          if (typeof showTab === 'function') showTab('log');
        }
      } catch (e) {
        console.error('[Account] enterGameWorld error:', e);
      }

      // Kết nối WebSocket multiplayer (nếu chưa kết nối)
      if (!MP.connected && typeof initMultiplayer === 'function') {
        initMultiplayer();
      }

      updateAccountHeaderUI();
      if (typeof toast === 'function') {
        toast(`⚔ Chào mừng hiệp khách ${res.user.heroName || res.user.username} gia nhập giang hồ!`);
      }
      if (typeof sendProfile === 'function') sendProfile();
      if (onSuccess) onSuccess(true);
    };

    // Xử lý nút ĐĂNG NHẬP
    const doLogin = () => {
      const u = ($('#logUser') ? $('#logUser').value : '').trim();
      const p = $('#logPass') ? $('#logPass').value : '';
      const err = $('#logErr');

      if (!u || !p) {
        if (err) {
          err.textContent = 'Vui lòng nhập đầy đủ tên tài khoản và mật khẩu!';
          err.style.display = 'block';
        }
        return;
      }
      if (err) err.style.display = 'none';

      fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p })
      })
      .then(r => {
        if (!r.ok && r.status >= 500) throw new Error('Máy chủ đang khởi động hoặc quá tải (' + r.status + '). Vui lòng thử lại sau giây lát!');
        return r.json();
      })
      .then(res => {
        if (!res.ok) {
          if (err) {
            err.textContent = res.error || 'Đăng nhập thất bại!';
            err.style.display = 'block';
          }
          return;
        }
        onAuthSuccess(res);
      })
      .catch(e => {
        console.error('[Auth Login Error]', e);
        if (err) {
          err.textContent = (e && e.message && !e.message.toLowerCase().includes('fetch'))
            ? 'Lỗi: ' + e.message
            : 'Lỗi kết nối tới máy chủ! Vui lòng thử lại.';
          err.style.display = 'block';
        }
      });
    };

    const btnLogin = $('#btnDoLogin');
    if (btnLogin) btnLogin.onclick = doLogin;
    const inpPass = $('#logPass');
    if (inpPass) inpPass.onkeydown = e => { if (e.key === 'Enter') doLogin(); };

    // Xử lý nút ĐĂNG KÝ
    const doReg = () => {
      const u = ($('#regUser') ? $('#regUser').value : '').trim();
      const p = $('#regPass') ? $('#regPass').value : '';
      const p2 = $('#regPass2') ? $('#regPass2').value : '';
      const heroName = ($('#regHeroName') ? $('#regHeroName').value : '').trim() || u;
      const fac = $('#regFac') ? $('#regFac').value : 'shaolin';
      const err = $('#regErr');

      if (!u || !p || !p2) {
        if (err) {
          err.textContent = 'Vui lòng điền đầy đủ các thông tin bắt buộc!';
          err.style.display = 'block';
        }
        return;
      }
      if (p !== p2) {
        if (err) {
          err.textContent = 'Mật khẩu xác nhận không trùng khớp!';
          err.style.display = 'block';
        }
        return;
      }
      if (p.length < 4) {
        if (err) {
          err.textContent = 'Mật khẩu phải từ 4 ký tự trở lên!';
          err.style.display = 'block';
        }
        return;
      }
      if (err) err.style.display = 'none';

      fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: u,
          password: p,
          heroName: heroName,
          fac: fac
        })
      })
      .then(r => {
        if (!r.ok && r.status >= 500) throw new Error('Máy chủ đang khởi động hoặc quá tải (' + r.status + '). Vui lòng thử lại sau giây lát!');
        return r.json();
      })
      .then(res => {
        if (!res.ok) {
          if (err) {
            err.textContent = res.error || 'Đăng ký thất bại!';
            err.style.display = 'block';
          }
          return;
        }
        onAuthSuccess(res);
      })
      .catch(e => {
        console.error('[Auth Reg Error]', e);
        if (err) {
          err.textContent = (e && e.message && !e.message.toLowerCase().includes('fetch'))
            ? 'Lỗi: ' + e.message
            : 'Lỗi kết nối tới máy chủ! Vui lòng thử lại.';
          err.style.display = 'block';
        }
      });
    };

    const btnReg = $('#btnDoReg');
    if (btnReg) btnReg.onclick = doReg;
    const inpPass2 = $('#regPass2');
    if (inpPass2) inpPass2.onkeydown = e => { if (e.key === 'Enter') doReg(); };
  }, true);
}

// Cập nhật hiển thị tên tài khoản trên header game
function updateAccountHeaderUI() {
  const heroNameEl = $('#heroName');
  if (!heroNameEl) return;
  if (ACC.isLoggedIn && ACC.user) {
    const dispName = typeof esc === 'function' ? esc(ACC.user.heroName || ACC.user.username) : (ACC.user.heroName || ACC.user.username);
    heroNameEl.innerHTML = `${dispName} <span style="font-size:10px;color:#a3e635;cursor:pointer;margin-left:4px;font-weight:normal;" title="Đăng xuất / Đổi tài khoản" onclick="logoutAccount()">[Đổi TK]</span>`;
    heroNameEl.title = `Tài khoản: ${ACC.user.username}`;
  } else {
    heroNameEl.innerHTML = `<span style="color:#ffd700;cursor:pointer;font-weight:bold;text-decoration:underline;" onclick="showAuthModal()">[🔐 ĐĂNG NHẬP / ĐĂNG KÝ]</span>`;
    heroNameEl.title = 'Nhấn để mở bảng Đăng nhập / Đăng ký';
  }
}

// Lưu dữ liệu đám mây (Cloud Save) & đồng bộ thẩm quyền Server
function syncCloudSave() {
  if (!ACC.isLoggedIn || !ACC.token || typeof S === 'undefined' || !S || !S.fac) return;
  const now = Date.now();
  if (now - ACC.lastCloudSaveT < 8000) return; // giới hạn tối đa 1 lần / 8s
  ACC.lastCloudSaveT = now;

  fetch('/api/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + ACC.token
    },
    body: JSON.stringify({ state: S })
  })
  .then(res => res.json())
  .then(data => {
    if (data && data.ok && data.state && typeof S !== 'undefined' && S) {
      // Đồng bộ lại các chỉ số chuẩn từ server nếu có sự chênh lệch do can thiệp F12
      const st = data.state;
      window._legitLevelTransition = true;
      window._legitExpGain = true;
      try {
        if (st.gold !== undefined) S.gold = st.gold;
        if (st.lvl !== undefined) S.lvl = st.lvl;
        if (st.xp !== undefined) S.xp = st.xp;
        if (st.attrPts !== undefined) S.attrPts = st.attrPts;
        if (st.skPts !== undefined) S.skPts = st.skPts;
      } finally {
        window._legitLevelTransition = false;
        window._legitExpGain = false;
      }
      if (st.attr && typeof S.attr === 'object') Object.assign(S.attr, st.attr);
      if (st.sk && typeof S.sk === 'object') Object.assign(S.sk, st.sk);
      if (typeof _updateLastAuthoritativeState === 'function') {
        _updateLastAuthoritativeState(S);
      }
      if (typeof recalc === 'function') recalc();
      if (typeof refresh === 'function') refresh();
    }
  })
  .catch(() => {});
}

// Đăng xuất tài khoản
function logoutAccount() {
  if (!confirm('Bạn có chắc chắn muốn đăng xuất tài khoản này?')) return;
  if (ACC.token) {
    fetch('/api/logout', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + ACC.token }
    }).catch(() => {});
  }
  try {
    localStorage.removeItem('jx_auth_token');
  } catch (e) {}
  ACC.token = null;
  ACC.user = null;
  ACC.isLoggedIn = false;
  location.reload();
}

// Hook tự động đồng bộ đám mây định kỳ 20 giây một lần
setInterval(syncCloudSave, 20000);

// Xuất ra window toàn cục
window.ACC = ACC;
window.initAccountSystem = initAccountSystem;
window.showAuthModal = showAuthModal;
window.logoutAccount = logoutAccount;
window.updateAccountHeaderUI = updateAccountHeaderUI;
