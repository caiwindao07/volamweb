const { spawn } = require('child_process');
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');

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

      let msgId = 1;
      function send(method, params) {
        const id = msgId++;
        ws.send(JSON.stringify({ id, method, params }));
        return id;
      }

      ws.on('open', () => {
        send('Runtime.enable');
        send('Log.enable');
        send('Page.enable');

        // Thực hiện đăng ký/đăng nhập tài khoản test_agent
        setTimeout(() => {
          send('Runtime.evaluate', {
            expression: `
              (async () => {
                try {
                  const regRes = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      username: 'test_auto_' + Math.floor(Math.random()*10000),
                      password: 'password123',
                      heroName: 'Tiêu Dao Khách',
                      fac: 'shaolin'
                    })
                  });
                  const regData = await regRes.json();
                  console.log('[DEBUG] Register result:', regData);
                  if (regData.ok && regData.token) {
                    localStorage.setItem('jx_auth_token', regData.token);
                    ACC.token = regData.token;
                    ACC.user = regData.user;
                    ACC.isLoggedIn = true;
                    if (regData.state) {
                      window.S = typeof migrate === 'function' ? migrate(regData.state) : regData.state;
                    }
                    if (typeof enterGameWorld === 'function') enterGameWorld();
                    const authModal = document.getElementById('modalAuth') || document.querySelector('.auth-window');
                    if (authModal) authModal.style.display = 'none';
                    const overlay = document.querySelector('.jx-modal-backdrop') || document.querySelector('.modal-overlay');
                    if (overlay) overlay.style.display = 'none';
                  }
                } catch (e) {
                  console.error('[DEBUG] Reg/Login error:', e);
                }
              })()
            `
          });
        }, 1200);

        // Sau 4 giây, inspect trạng thái chi tiết của Render Loop, Canvas, Entities, Hero, Mobs
        setTimeout(() => {
          send('Runtime.evaluate', {
            expression: `
              (() => {
                const cv = document.getElementById('gameCanvas');
                const ctx = cv ? cv.getContext('2d') : null;
                return JSON.stringify({
                  hasS: !!window.S,
                  stage: window.S ? window.S.stage : null,
                  fac: window.S ? window.S.fac : null,
                  H: typeof H !== 'undefined' ? { x: H.x, y: H.y, moving: H.moving, act: H.act, dir: H.dir } : null,
                  CAM: typeof CAM !== 'undefined' ? { x: CAM.x, y: CAM.y, w: CAM.w, h: CAM.h } : null,
                  WORLD: typeof WORLD !== 'undefined' ? { w: WORLD.w, h: WORLD.h } : null,
                  R: typeof R !== 'undefined' ? {
                    enemiesLen: R.enemies ? R.enemies.length : 0,
                    zone: R.zone ? R.zone.name : null,
                    town: R.town,
                    hasBgImg: !!R.bgImg,
                    bgComplete: R.bgImg ? R.bgImg.complete : false,
                    bgSrc: R.bgImg ? R.bgImg.src : null,
                    bgSize: R.bgImg ? (R.bgImg.naturalWidth + 'x' + R.bgImg.naturalHeight) : null
                  } : null,
                  enemies: typeof R !== 'undefined' && R.enemies ? R.enemies.slice(0, 3).map(e => ({ x: e.x, y: e.y, name: e.name, hp: e.hp, maxHp: e.maxHp })) : [],
                  companion: typeof window.COMPANION_SYSTEM !== 'undefined' ? !!window.COMPANION_SYSTEM : false,
                  petData: window.S && window.S.companion ? window.S.companion.activeId : null,
                  canvasDisplay: cv ? { display: cv.style.display, visibility: cv.style.visibility, opacity: cv.style.opacity, w: cv.width, h: cv.height, clientW: cv.clientWidth, clientH: cv.clientHeight } : null,
                  renderLoopActive: typeof loopLast !== 'undefined' ? (Date.now() - loopLast < 1000) : false,
                  loopErr: typeof loopErr !== 'undefined' ? loopErr : null
                });
              })()
            `,
            returnByValue: true
          });
        }, 5000);

        // Chụp screenshot
        setTimeout(() => {
          send('Page.captureScreenshot', { format: 'png' });
        }, 6500);
      });

      ws.on('message', (msg) => {
        const obj = JSON.parse(msg);
        if (obj.method === 'Runtime.consoleAPICalled') {
          console.log('[BROWSER CONSOLE]', obj.params.type, obj.params.args.map(a => a.value || a.description).join(' '));
        }
        if (obj.method === 'Runtime.exceptionThrown') {
          console.error('[BROWSER EXCEPTION]', obj.params.exceptionDetails.text, obj.params.exceptionDetails.exception);
        }
        if (obj.result && obj.result.result && obj.result.result.value) {
          console.log('[GAME STATE INSPECT]:', obj.result.result.value);
        }
        if (obj.result && obj.result.data) {
          fs.writeFileSync('g:/jxweb/jx/test_ingame.png', Buffer.from(obj.result.data, 'base64'));
          console.log('[INGAME SCREENSHOT SAVED] -> test_ingame.png');
          p.kill();
          process.exit(0);
        }
      });
    });
  });
}, 2500);
