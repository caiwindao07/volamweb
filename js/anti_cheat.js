/* ==========================================================================
   HỆ THỐNG BẢO MẬT & CHỐNG HACK CONSOLE / DEVTOOLS F10/F12 (VO LAM IDLE)
   Ngăn chặn và vô hiệu hóa mọi hành vi can thiệp qua Console & DevTools:
   - S.lvl = 99; S.xp = 99999999; S.gold = 99999999;
   - S.attrPts = 9999; S.skPts = 9999;
   - Vô hiệu hóa console methods (log, clear, dir, ...)
   - Debugger trap ngắt thực thi khi mở DevTools
   - Bảo vệ biến toàn cục S, R
   ========================================================================== */
'use strict';

(function () {
  window._legitLevelTransition = false;
  window._legitExpGain = false;
  window._legitGoldGain = false;
  window._legitPtsGain = false;

  // 1. CHỐNG SỬA CÁC THUỘC TÍNH QUAN TRỌNG TRONG ĐỐI TƯỢNG S
  function secureObjectState(obj) {
    if (!obj || typeof obj !== 'object' || obj._securedState) return obj;

    let _realLvl = Math.max(1, Math.min(200, Math.floor(Number(obj.lvl) || 1)));
    let _realXp = Math.max(0, Math.floor(Number(obj.xp) || 0));
    let _realGold = Math.max(0, Math.floor(Number(obj.gold) || 0));
    let _realAttrPts = Math.max(0, Math.floor(Number(obj.attrPts) || 0));
    let _realSkPts = Math.max(0, Math.floor(Number(obj.skPts) || 0));

    try {
      // Cấp độ (lvl)
      Object.defineProperty(obj, 'lvl', {
        get() { return _realLvl; },
        set(val) {
          const target = Math.floor(Number(val) || 1);
          if (window._legitLevelTransition) {
            _realLvl = Math.max(1, Math.min(200, target));
            return;
          }
          console.warn(`[Anti-Cheat] Phát hiện can thiệp cấp độ trái phép (thử đặt: ${val}). Đã khôi phục về Lv.${_realLvl}!`);
          if (typeof toast === 'function') toast(`⚠️ Không thể can thiệp cấp độ qua Console! (Cấp hợp lệ: Lv.${_realLvl})`);
          if (typeof refresh === 'function') refresh();
          if (typeof recalc === 'function') recalc();
        },
        configurable: true,
        enumerable: true
      });

      // Kinh nghiệm (xp)
      Object.defineProperty(obj, 'xp', {
        get() { return _realXp; },
        set(val) {
          const target = Math.max(0, Math.floor(Number(val) || 0));
          if (window._legitExpGain || window._legitLevelTransition) {
            _realXp = target;
            return;
          }
          console.warn(`[Anti-Cheat] Phát hiện can thiệp kinh nghiệm trái phép qua Console!`);
          if (typeof refresh === 'function') refresh();
        },
        configurable: true,
        enumerable: true
      });

      // Ngân lượng (gold)
      Object.defineProperty(obj, 'gold', {
        get() { return _realGold; },
        set(val) {
          const target = Math.max(0, Math.floor(Number(val) || 0));
          // Cho phép tiêu vàng hoặc tăng vàng thông thường dưới ngưỡng đột biến
          if (window._legitGoldGain || target <= _realGold || (target - _realGold <= 500000)) {
            _realGold = target;
            return;
          }
          console.warn(`[Anti-Cheat] Phát hiện can thiệp số dư ngân lượng bất thường (từ ${_realGold} lên ${target})!`);
          if (typeof toast === 'function') toast(`⚠️ Không thể can thiệp số dư ngân lượng qua Console!`);
          if (typeof refresh === 'function') refresh();
        },
        configurable: true,
        enumerable: true
      });

      // Điểm tiềm năng (attrPts)
      Object.defineProperty(obj, 'attrPts', {
        get() { return _realAttrPts; },
        set(val) {
          const target = Math.max(0, Math.floor(Number(val) || 0));
          const maxAllowed = (_realLvl - 1) * 5 + ((obj.rw && obj.rw.stat && obj.rw.stat.reborn) || 0) * 100 + 100;
          if (window._legitPtsGain || target <= _realAttrPts || target <= maxAllowed) {
            _realAttrPts = target;
            return;
          }
          console.warn(`[Anti-Cheat] Phát hiện can thiệp điểm tiềm năng vượt mức cho phép!`);
          if (typeof toast === 'function') toast(`⚠️ Không thể hack điểm tiềm năng!`);
          if (typeof refresh === 'function') refresh();
        },
        configurable: true,
        enumerable: true
      });

      // Điểm kỹ năng (skPts)
      Object.defineProperty(obj, 'skPts', {
        get() { return _realSkPts; },
        set(val) {
          const target = Math.max(0, Math.floor(Number(val) || 0));
          const maxAllowed = 1 + (_realLvl - 1) * 1 + ((obj.rw && obj.rw.stat && obj.rw.stat.reborn) || 0) * 50 + 200;
          if (window._legitPtsGain || target <= _realSkPts || target <= maxAllowed) {
            _realSkPts = target;
            return;
          }
          console.warn(`[Anti-Cheat] Phát hiện can thiệp điểm kỹ năng vượt mức cho phép!`);
          if (typeof toast === 'function') toast(`⚠️ Không thể hack điểm kỹ năng!`);
          if (typeof refresh === 'function') refresh();
        },
        configurable: true,
        enumerable: true
      });

      obj._securedState = true;
    } catch (e) {
      console.error('[Anti-Cheat] Không thể khóa thuộc tính:', e);
    }

    return obj;
  }

  window.secureObjectState = secureObjectState;

  // Tự động kiểm tra và bảo vệ biến S toàn cục
  let _holderS = window.S || null;
  try {
    Object.defineProperty(window, 'S', {
      get() { return _holderS; },
      set(newVal) {
        if (newVal && typeof newVal === 'object') {
          secureObjectState(newVal);
        }
        _holderS = newVal;
      },
      configurable: true,
      enumerable: true
    });
  } catch (e) {}

  if (_holderS) {
    secureObjectState(_holderS);
  }

  // 2. CHẶN PHÍM TẮT MỞ DEVTOOLS & XEM SOURCE
  const blockKeys = (e) => {
    // F12, F10, F11
    if (e.key === 'F12' || e.key === 'F10' || e.key === 'F11' || e.keyCode === 123 || e.keyCode === 121 || e.keyCode === 122) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    // Ctrl + Shift + I / J / C / K / E / S
    if (e.ctrlKey && e.shiftKey) {
      const k = (e.key || '').toLowerCase();
      if (['i', 'j', 'c', 'k', 'e', 's'].includes(k) || [73, 74, 67, 75, 69, 83].includes(e.keyCode)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }
    // Cmd + Option + I / J / C (macOS)
    if (e.metaKey && e.altKey) {
      const k = (e.key || '').toLowerCase();
      if (['i', 'j', 'c'].includes(k) || [73, 74, 67].includes(e.keyCode)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }
    // Ctrl + U (View Source), Ctrl + S (Save Page)
    if (e.ctrlKey && (e.key === 'u' || e.key === 'U' || e.key === 's' || e.key === 'S' || e.keyCode === 85 || e.keyCode === 83)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  };

  window.addEventListener('keydown', blockKeys, true);
  if (typeof document !== 'undefined') {
    document.addEventListener('keydown', blockKeys, true);
  }

  // 3. VÔ HIỆU HÓA CONSOLE METHODS TRÁNH CHẠY LỆNH HOẶC SOI DỮ LIỆU
  try {
    const noop = function () {};
    const methods = ['log', 'debug', 'info', 'warn', 'error', 'table', 'trace', 'dir', 'dirxml', 'clear'];
    for (const m of methods) {
      if (window.console && typeof window.console[m] === 'function') {
        window.console[m] = noop;
      }
    }
  } catch (err) {}

  // 4. DEBUGGER TIMING TRAP: KHI DEVTOOLS MỞ SẼ BỊ VƯỚNG DEBUGGER VÀ ĐÓNG BĂNG
  setInterval(function () {
    const startTime = performance.now();
    try {
      (function () {}['constructor']('debugger')());
    } catch (e) {}
    const endTime = performance.now();
    if (endTime - startTime > 120) {
      if (typeof S !== 'undefined' && S && S.fac) {
        if (typeof toast === 'function') toast('⚠️ Vui lòng đóng DevTools / Console để tiếp tục chơi game!');
      }
    }
  }, 2500);

  // 5. BỘ ĐỆM BẢO VỆ LOCALSTORAGE CHỐNG SỬA TAY QUA DEVTOOLS APPLICATION TAB
  try {
    const disk = window.localStorage;
    const cache = new Map();
    const safeStorage = {
      getItem(k) {
        k = String(k);
        if (!cache.has(k)) {
          const val = disk.getItem(k);
          if (val !== null) cache.set(k, val);
        }
        return cache.has(k) ? cache.get(k) : null;
      },
      setItem(k, v) {
        k = String(k);
        v = String(v);
        cache.set(k, v);
        disk.setItem(k, v);
      },
      removeItem(k) {
        k = String(k);
        cache.delete(k);
        disk.removeItem(k);
      },
      clear() {
        cache.clear();
        disk.clear();
      },
      key(i) { return disk.key(i); },
      get length() { return disk.length; }
    };
    Object.defineProperty(window, 'localStorage', {
      get() { return safeStorage; },
      configurable: true
    });
  } catch (err) {}

  // Khôi phục các hàm tương thích
  window._updateLastAuthoritativeState = function () {};
  window.reportLegitGoldGain = function () {};
  window.secSync = function () {};
})();
