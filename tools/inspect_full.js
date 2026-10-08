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

        // Bấm login guest hoặc tài khoản test
        setTimeout(() => {
          send('Runtime.evaluate', {
            expression: `
              (async () => {
                // Kiểm tra form đăng nhập hoặc tự đăng nhập
                const guestBtn = document.querySelector('button[onclick*="loginGuest"]') || document.querySelector('#btnGuest') || document.querySelector('.btn-guest');
                console.log('[DEBUG] Guest button:', guestBtn);
                if (guestBtn) {
                  guestBtn.click();
                } else if (typeof doLogin === 'function') {
                  doLogin('test', '123456');
                } else if (typeof ACC !== 'undefined' && ACC.guestLogin) {
                  ACC.guestLogin();
                }
              })()
            `
          });
        }, 1000);

        // Sau 3 giây khi đã vào game, inspect toàn bộ state và render loop
        setTimeout(() => {
          send('Runtime.evaluate', {
            expression: `
              (() => {
                return JSON.stringify({
                  hasS: !!window.S,
                  hero: typeof H !== 'undefined' ? { x: H.x, y: H.y, moving: H.moving, act: H.act, dir: H.dir } : null,
                  cam: typeof CAM !== 'undefined' ? CAM : null,
                  world: typeof WORLD !== 'undefined' ? WORLD : null,
                  stage: window.S ? window.S.stage : null,
                  fac: window.S ? window.S.fac : null,
                  enemiesCount: typeof R !== 'undefined' && R.enemies ? R.enemies.length : 0,
                  enemiesSample: typeof R !== 'undefined' && R.enemies && R.enemies[0] ? { x: R.enemies[0].x, y: R.enemies[0].y, name: R.enemies[0].name, hp: R.enemies[0].hp } : null,
                  bgImg: typeof R !== 'undefined' && R.bgImg ? { src: R.bgImg.src, complete: R.bgImg.complete, w: R.bgImg.naturalWidth, h: R.bgImg.naturalHeight } : null,
                  drawCalls: typeof window.__drawCallCount !== 'undefined' ? window.__drawCallCount : 'none',
                  heroAnim: typeof W !== 'undefined' && W.hero && window.S ? !!W.hero[window.S.fac] : false,
                  wKeys: typeof W !== 'undefined' ? Object.keys(W) : [],
                  canvas: (() => {
                    const cv = document.getElementById('gameCanvas');
                    return cv ? { w: cv.width, h: cv.height, clientW: cv.clientWidth, clientH: cv.clientHeight } : null;
                  })()
                });
              })()
            `,
            returnByValue: true
          });
        }, 4000);

        // Chụp screenshot
        setTimeout(() => {
          send('Page.captureScreenshot', { format: 'png' });
        }, 5000);
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
          console.log('[INSPECT RESULT]:', obj.result.result.value);
        }
        if (obj.result && obj.result.data) {
          fs.writeFileSync('g:/jxweb/jx/test_screenshot.png', Buffer.from(obj.result.data, 'base64'));
          console.log('[SCREENSHOT SAVED] -> test_screenshot.png');
          p.kill();
          process.exit(0);
        }
      });
    });
  });
}, 2500);
