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

        // Bấm đăng nhập qua UI chuẩn
        setTimeout(() => {
          send('Runtime.evaluate', {
            expression: `
              (async () => {
                const uInput = document.getElementById('logUser');
                const pInput = document.getElementById('logPass');
                const btn = document.getElementById('btnDoLogin');
                if (uInput && pInput && btn) {
                  // Đăng nhập tài khoản testplayer1 có sẵn trong db
                  // Nếu không nhớ pass, đăng ký tài khoản mới qua form đăng ký
                  const tabReg = document.getElementById('tabAuthReg');
                  if (tabReg) {
                    tabReg.click();
                    setTimeout(() => {
                      const regU = document.getElementById('regUser');
                      const regP = document.getElementById('regPass');
                      const regP2 = document.getElementById('regPass2');
                      const regHero = document.getElementById('regHeroName');
                      const btnReg = document.getElementById('btnDoReg');
                      const rnd = Math.floor(Math.random() * 90000 + 10000);
                      if (regU) regU.value = 'user_' + rnd;
                      if (regP) regP.value = '123456';
                      if (regP2) regP2.value = '123456';
                      if (regHero) regHero.value = 'Hiệp Khách ' + rnd;
                      console.log('[DEBUG] Form reg filled, clicking btnDoReg...');
                      if (btnReg) btnReg.click();
                    }, 300);
                  }
                }
              })()
            `
          });
        }, 1200);

        // Sau 4 giây, inspect trạng thái chi tiết
        setTimeout(() => {
          send('Runtime.evaluate', {
            expression: `
              (() => {
                const cv = document.getElementById('arena');
                return JSON.stringify({
                  isLoggedIn: typeof ACC !== 'undefined' ? ACC.isLoggedIn : false,
                  user: typeof ACC !== 'undefined' && ACC.user ? ACC.user.username : null,
                  hasS: !!window.S,
                  stage: window.S ? window.S.stage : null,
                  fac: window.S ? window.S.fac : null,
                  H: typeof H !== 'undefined' ? { x: H.x, y: H.y, moving: H.moving, act: H.act, dir: H.dir } : null,
                  CAM: typeof CAM !== 'undefined' ? { x: CAM.x, y: CAM.y } : null,
                  WORLD: typeof WORLD !== 'undefined' ? { w: WORLD.w, h: WORLD.h } : null,
                  enemiesCount: typeof R !== 'undefined' && R.enemies ? R.enemies.length : 0,
                  enemiesSample: typeof R !== 'undefined' && R.enemies && R.enemies[0] ? { x: R.enemies[0].x, y: R.enemies[0].y, n: R.enemies[0].n, hp: R.enemies[0].hp } : null,
                  bgImg: typeof R !== 'undefined' && R.bgImg ? { src: R.bgImg.src, complete: R.bgImg.complete, w: R.bgImg.naturalWidth, h: R.bgImg.naturalHeight } : null,
                  arena: cv ? { w: cv.width, h: cv.height, styleW: cv.style.width, styleH: cv.style.height } : null,
                  renderLoopActive: typeof loopLast !== 'undefined' ? (Date.now() - loopLast < 1000) : false,
                  loopErr: typeof loopErr !== 'undefined' ? loopErr : null,
                  loopLast: window._loopLast || null,
                  loopErrDetail: window._loopErrDetail || null
                });
              })()
            `,
            returnByValue: true
          });
        }, 4500);

        // Chụp screenshot
        setTimeout(() => {
          send('Page.captureScreenshot', { format: 'png' });
        }, 6000);
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
          fs.writeFileSync('g:/jxweb/jx/test_live_ingame.png', Buffer.from(obj.result.data, 'base64'));
          console.log('[LIVE SCREENSHOT SAVED] -> test_live_ingame.png');
          p.kill();
          process.exit(0);
        }
      });
    });
  });
}, 2500);
