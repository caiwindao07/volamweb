const { spawn } = require('child_process');
const WebSocket = require('ws');
const http = require('http');

const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const p = spawn(edge, ['--remote-debugging-port=9222', '--headless', '--disable-gpu', 'http://localhost:8080/']);

setTimeout(() => {
  http.get('http://127.0.0.1:9222/json', (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      const tabs = JSON.parse(data);
      const pageTab = tabs.find(t => t.title === 'Võ Lâm Idle');
      if (!pageTab) {
        console.error('Võ Lâm Idle tab not found!');
        p.kill(); process.exit(1);
      }
      const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

      ws.on('open', () => {
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
        ws.send(JSON.stringify({ id: 2, method: 'Log.enable' }));

        setTimeout(() => {
          const expr = `
            (() => {
              // 1. Setup mock game state
              window.S = newSave();
              S.fac = 'shaolin';
              S.lvl = 20;
              S.heroName = 'Thiếu Hiệp Test';
              recalc();

              // 2. Test Pet Button click (#btnOpenPet)
              const petBtn = document.getElementById('btnOpenPet');
              if (petBtn) petBtn.click();
              const companionWin = document.getElementById('fw-companion');
              const companionWinVisible = companionWin && !companionWin.classList.contains('hidden');
              const companionWinHtml = companionWin ? companionWin.innerHTML : '';
              const hasCompanionTitle = companionWinHtml.includes('THÔNG TIN BẠN ĐỒNG HÀNH');
              const hasPetName = companionWinHtml.includes('Yến Tiểu Lâu');

              // 3. Test Cloak Button click (#btnOpenCloak)
              const cloakBtn = document.getElementById('btnOpenCloak');
              if (cloakBtn) cloakBtn.click();
              const cloakWin = document.getElementById('fw-cloak-meridian');
              const cloakWinVisible = cloakWin && !cloakWin.classList.contains('hidden');
              const cloakWinHtml = cloakWin ? cloakWin.innerHTML : '';
              const hasCloakTitle = cloakWinHtml.includes('PHI PHONG & ĐẢ THÔNG KINH MẠCH');
              const hasCloakTierName = cloakWinHtml.includes('Phi Phong Lăng Tuyệt');

              // 4. Test renderCharAttrib
              renderCharAttrib();
              const charEl = isLandscape() ? document.getElementById('t-char-attrib-f') : document.getElementById('t-char');
              const charHtml = charEl ? charEl.innerHTML : '';
              const hasCloakInProfile = charHtml.includes('Phi Phong Lăng Tuyệt (Bậc 1/6)');
              const hasCloakResInProfile = charHtml.includes('+15% Kháng');
              const hasCloakSlotInPaperdoll = charHtml.includes('Bậc 1/6') && charHtml.includes('jx-equip-slot');
              const hasCloakInCombatStats = charHtml.includes('Phi Phong (Kháng)') && charHtml.includes('(+15%)');
              const hasMeridianInCombatStats = charHtml.includes('Kinh Mạch (Đới)');

              // 5. Test Stats calculation
              const P = R.P;
              const coldRes = P && P.res ? P.res.cold : 0;
              const poisonRes = P && P.res ? (P.res.poison || P.res.pois) : 0;

              return JSON.stringify({
                hasPetBtn: !!petBtn,
                companionWinVisible,
                hasCompanionTitle,
                hasPetName,
                hasCloakBtn: !!cloakBtn,
                cloakWinVisible,
                hasCloakTitle,
                hasCloakTierName,
                hasCloakInProfile,
                hasCloakResInProfile,
                hasCloakSlotInPaperdoll,
                hasCloakInCombatStats,
                hasMeridianInCombatStats,
                coldRes,
                poisonRes,
                cloakTier: S.cloak ? S.cloak.tier : 0,
                companionActive: S.companion ? S.companion.activeId : null
              });
            })()
          `;
          ws.send(JSON.stringify({ id: 3, method: 'Runtime.evaluate', params: { expression: expr } }));
        }, 1500);
      });

      ws.on('message', (msg) => {
        const obj = JSON.parse(msg);
        if (obj.method === 'Runtime.consoleAPICalled') {
          console.log('[BROWSER CONSOLE]', obj.params.type, obj.params.args.map(a => a.value || a.description).join(' '));
        }
        if (obj.method === 'Runtime.exceptionThrown') {
          console.error('[BROWSER EXCEPTION]', obj.params.exceptionDetails.text, obj.params.exceptionDetails.exception);
        }
        if (obj.id === 3) {
          console.log('[LIVE TEST RESULT]:', obj.result && obj.result.result ? obj.result.result.value : obj);
          p.kill();
          process.exit(0);
        }
      });
    });
  });
}, 1500);
