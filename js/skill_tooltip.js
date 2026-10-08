/* =====================================================================
   SKILL TOOLTIP - Tooltip kỹ năng kiểu game PC (Võ Lâm Idle)
   Hover vào hàng kỹ năng -> hiện panel nổi bên cạnh với đầy đủ thông tin
   ===================================================================== */
'use strict';

(function () {
  let _tip = null;
  let _hideTimer = null;

  function getTip() {
    if (_tip) return _tip;
    _tip = document.createElement('div');
    _tip.id = 'sk-tooltip';
    _tip.style.cssText = [
      'position:fixed',
      'z-index:99999',
      'pointer-events:none',
      'display:none',
      'max-width:280px',
      'min-width:200px',
      'background:linear-gradient(160deg,#1e1408 60%,#2a1d0a)',
      'border:1px solid #8b6914',
      'border-radius:6px',
      'box-shadow:0 4px 24px #0009,inset 0 1px 0 #c8a23540',
      'color:#e8dcc4',
      'font-family:sans-serif',
      'font-size:12px',
      'line-height:1.55',
      'padding:10px 12px',
      'transition:opacity .12s',
    ].join(';');
    document.body.appendChild(_tip);
    return _tip;
  }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function fmt(n) {
    return typeof n === 'number' ? n.toLocaleString('vi-VN') : n;
  }

  function buildContent(id) {
    if (typeof SK === 'undefined' || typeof S === 'undefined') return '';
    const s = SK[id]; if (!s) return '';
    const L = (S.sk && S.sk[id]) || 0;
    const act = typeof isAttack === 'function' ? isAttack(s) : !!(s.attr && s.attr['skill_attackradius'] !== undefined);
    const show = Math.max(1, L);
    const next = L < s.max ? L + 1 : 0;

    // Hiệu ứng kỹ năng
    const SK_HIDE = /^(skill_attackradius|missle_|skill_cost_v|skill_eventskilllevel|skill_)/;
    function effectLines(lv) {
      const out = [];
      if (typeof skVal === 'function' && typeof attrText === 'function' && typeof J !== 'undefined') {
        for (const name in s.attr) {
          if (name.startsWith('addskilldamage')) continue; // Xử lý riêng ở phần tương hỗ
          if (SK_HIDE.test(name) || !J.attrDesc[name]) continue;
          const p = skVal(s, name, lv); if (!p) continue;
          const t = attrText(name, p); if (t && !/^\s*$/.test(t)) out.push(t);
        }
      }
      return out;
    }

    // Tương hỗ kỹ năng (Kỹ năng này hỗ trợ cho chiêu nào & được chiêu nào hỗ trợ)
    function synergyLines(lv) {
      const out = [];
      // 1. Kỹ năng này hỗ trợ tăng sát thương cho kỹ năng khác (Chiêu này có addskilldamage1..6)
      for (const name in s.attr) {
        if (name.startsWith('addskilldamage')) {
          const p = (typeof skVal === 'function') ? skVal(s, name, lv) : null;
          if (p && p[0] && SK[p[0]]) {
            const targetSk = SK[p[0]];
            const bonus = p[2] || p[1] || 0;
            out.push(`<div style="color:#60a5fa;">✦ Hỗ trợ <b>${esc(targetSk.n)}</b>: +<b style="color:#ffd700;">${bonus}%</b> sát thương</div>`);
          }
        }
      }

      // 2. Kỹ năng này nhận hỗ trợ từ kỹ năng khác trong môn phái
      const f = (typeof FAC !== 'undefined' && typeof S !== 'undefined' && FAC[S.fac]) ? FAC[S.fac] : null;
      if (f && f.skills) {
        for (const otherId of f.skills) {
          if (+otherId === +s.id) continue;
          const otherSk = SK[otherId];
          if (!otherSk || !otherSk.attr) continue;
          const otherLv = (S.sk && S.sk[otherId]) || 0;
          for (const name in otherSk.attr) {
            if (name.startsWith('addskilldamage')) {
              const p = (typeof skVal === 'function') ? skVal(otherSk, name, Math.max(1, otherLv)) : null;
              if (p && +p[0] === +s.id) {
                const bonus = otherLv ? (p[2] || p[1] || 0) : 0;
                out.push(`<div style="color:#a78bfa;">✦ Nhận từ <b>${esc(otherSk.n)}</b> (Lv.${otherLv}): +<b style="color:${otherLv ? '#4ade80' : '#888'};">${bonus}%</b> ST</div>`);
              }
            }
          }
        }
      }
      return out;
    }

    // Thông số chiến đấu
    let atkHtml = '';
    if (act && typeof activeInfo === 'function' && typeof R !== 'undefined' && R.P) {
      try {
        const a = activeInfo(R.P, s, show);
        atkHtml = `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 8px;background:#15100880;border-radius:4px;padding:5px 7px;margin:5px 0;">
            <span style="color:#aaa">Sát thương</span><span style="color:#f87171;font-weight:bold">${fmt(a.tot)}</span>
            <span style="color:#aaa">DPS</span><span style="color:#fb923c;font-weight:bold">${fmt(a.dps)}</span>
            <span style="color:#aaa">Nội lực</span><span style="color:#60a5fa">${Math.round(a.cost)}</span>
            <span style="color:#aaa">Tầm đánh</span><span style="color:#a3e635">${Math.round(a.rad)}</span>
            <span style="color:#aaa">Mục tiêu</span><span style="color:#e2d9c8">${a.targets > 1 ? 'Nhiều (' + a.targets + ')' : 'Đơn'}</span>
          </div>`;
      } catch (e) { /* ignore */ }
    }

    // Hiệu ứng hiện tại
    const curLines = effectLines(show);
    const curHtml = curLines.length
      ? curLines.map(t => `<div style="color:#d4c89a">· ${esc(t)}</div>`).join('')
      : '<div style="color:#666">—</div>';

    // Tương hỗ kỹ năng
    const synList = synergyLines(show);
    const synHtml = synList.length
      ? `<div style="margin-top:5px;padding-top:4px;border-top:1px dashed #5a4425;font-size:10.5px;">${synList.join('')}</div>`
      : '';

    // Hiệu ứng kế tiếp
    let nextHtml = '';
    if (next) {
      const nLines = effectLines(next);
      if (nLines.length) {
        nextHtml = `
          <div style="margin-top:5px;padding-top:5px;border-top:1px solid #5a4425">
            <div style="color:#60a5fa;font-size:11px;font-weight:bold;margin-bottom:2px">Cấp ${next} (kế tiếp):</div>
            ${nLines.map(t => `<div style="color:#93c5fd">· ${esc(t)}</div>`).join('')}
          </div>`;
      }
    }

    // Yêu cầu cấp
    const lvOk = typeof S !== 'undefined' && S.lvl >= s.req;
    const reqColor = lvOk ? '#4ade80' : '#f87171';

    // Số điểm kỹ năng
    const ptsColor = (S.skPts || 0) > 0 ? '#fbbf24' : '#888';

    return `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid #5a4425">
        <img src="${esc(s.ic || '')}" style="width:36px;height:36px;border-radius:4px;border:1px solid #8b6914;background:#0a0600;" onerror="this.style.display='none'">
        <div>
          <div style="font-size:14px;font-weight:bold;color:#ffd700">${esc(s.n)}</div>
          <div style="font-size:11px;margin-top:1px">
            <span style="background:${act ? '#7f1d1d' : '#1e3a5f'};color:${act ? '#fca5a5' : '#93c5fd'};padding:1px 5px;border-radius:3px;font-size:10px">${act ? '⚔ Tấn công' : '✦ Nội tại'}</span>
            <span style="color:#888;margin-left:5px">Cấp ${L}/${s.max}</span>
          </div>
        </div>
      </div>
      ${s.d ? `<div style="color:#c8b47a;font-style:italic;margin-bottom:5px;font-size:11px">${esc(s.d)}</div>` : ''}
      <div style="font-size:11px;margin-bottom:4px">
        Yêu cầu cấp: <b style="color:${reqColor}">${s.req}${!lvOk ? ` (bạn Lv.${S.lvl})` : ''}</b>
        &nbsp;·&nbsp; Điểm SK còn: <b style="color:${ptsColor}">${S.skPts || 0}</b>
      </div>
      ${atkHtml}
      <div style="font-size:11px;color:#a0916c;font-weight:bold;margin-bottom:2px">${L ? `Cấp ${show} hiện tại:` : 'Nếu học (cấp 1):'}</div>
      ${curHtml}
      ${synHtml}
      ${nextHtml}
    `;
  }

  function showTip(id, anchorEl) {
    clearTimeout(_hideTimer);
    const tip = getTip();
    tip.innerHTML = buildContent(id);
    tip.style.display = 'block';
    tip.style.opacity = '0';

    // Định vị
    requestAnimationFrame(() => {
      const rect = anchorEl.getBoundingClientRect();
      const tw = tip.offsetWidth, th = tip.offsetHeight;
      const vw = window.innerWidth, vh = window.innerHeight;
      let left = rect.right + 8;
      let top  = rect.top;
      // Nếu vượt phải -> hiện bên trái
      if (left + tw > vw - 8) left = rect.left - tw - 8;
      // Nếu vượt dưới -> đẩy lên
      if (top + th > vh - 8) top = vh - th - 8;
      if (top < 8) top = 8;
      tip.style.left = left + 'px';
      tip.style.top  = top  + 'px';
      tip.style.opacity = '1';
    });
  }

  function hideTip() {
    clearTimeout(_hideTimer);
    _hideTimer = setTimeout(() => {
      const tip = getTip();
      tip.style.opacity = '0';
      setTimeout(() => { tip.style.display = 'none'; }, 120);
    }, 80);
  }

  /* Gắn tooltip vào danh sách skill (gọi sau mỗi lần renderSkill) */
  function bindSkillTooltips() {
    const skillEl = document.getElementById('fw-skill') || document.querySelector('[data-tab="skill"]') || document.querySelector('.tab-skill');
    // Tìm trong tất cả .skl rows
    document.querySelectorAll('.skl').forEach(row => {
      if (row._tipBound) return;
      row._tipBound = true;
      const id = parseInt(row.dataset.id, 10);
      if (!id) return;
      row.addEventListener('mouseenter', () => showTip(id, row));
      row.addEventListener('mouseleave', hideTip);
      row.addEventListener('touchstart', (e) => { e.preventDefault(); showTip(id, row); }, { passive: false });
      row.addEventListener('touchend', hideTip);
    });
  }

  /* Patch renderSkill để tự động gắn tooltip sau mỗi lần render */
  function patchRenderSkill() {
    if (typeof renderSkill !== 'function') return;
    if (window._skTipPatched) return;
    window._skTipPatched = true;
    const orig = renderSkill;
    window.renderSkill = function () {
      orig.apply(this, arguments);
      setTimeout(bindSkillTooltips, 0);
    };
  }

  /* Khởi động sau khi trang load xong */
  function init() {
    patchRenderSkill();
    // Cũng bind ngay nếu DOM đã có .skl
    bindSkillTooltips();
    // Observer để auto-bind khi DOM thay đổi (tab switch, v.v.)
    const obs = new MutationObserver(() => {
      bindSkillTooltips();
      patchRenderSkill();
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.SKILL_TOOLTIP = { show: showTip, hide: hideTip, bind: bindSkillTooltips };
})();
