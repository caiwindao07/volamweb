const { spawn } = require('child_process');
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');

const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const p = spawn(edge, [
  '--remote-debugging-port=9222',
  '--headless',
  '--disable-gpu',
  '--window-size=920,520',
  'http://localhost:8080/'
]);

setTimeout(() => {
  http.get('http://127.0.0.1:9222/json', (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      const tabs = JSON.parse(data);
      const pageTab = tabs.find(t => t.title === 'Võ Lâm Idle');
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

        setTimeout(() => {
          send('Runtime.evaluate', {
            expression: `
              (async () => {
                const tabReg = document.getElementById('tabAuthReg');
                if (tabReg) tabReg.click();
                setTimeout(() => {
                  const rnd = Math.floor(Math.random() * 90000 + 10000);
                  document.getElementById('regUser').value = 'mob_' + rnd;
                  document.getElementById('regPass').value = '123456';
                  document.getElementById('regPass2').value = '123456';
                  document.getElementById('regHeroName').value = 'Tiểu Hiệp ' + rnd;
                  document.getElementById('btnDoReg').click();
                }, 200);
              })()
            `
          });
        }, 1200);

        setTimeout(() => {
          send('Runtime.evaluate', {
            expression: `
              (() => {
                return JSON.stringify({
                  stage: S ? S.stage : null,
                  heroPos: H ? { x: H.x, y: H.y } : null,
                  camPos: CAM ? { x: CAM.x, y: CAM.y } : null,
                  enemies: R.enemies ? R.enemies.length : 0,
                  loopErr: typeof loopErr !== 'undefined' ? loopErr : null,
                  pet: S && S.companion ? S.companion.activeId : null
                });
              })()
            `,
            returnByValue: true
          });
        }, 4500);

        setTimeout(() => {
          send('Page.captureScreenshot', { format: 'png' });
        }, 6000);
      });

      ws.on('message', (msg) => {
        const obj = JSON.parse(msg);
        if (obj.result && obj.result.result && obj.result.result.value) {
          console.log('[MOBILE TEST RESULT]:', obj.result.result.value);
        }
        if (obj.result && obj.result.data) {
          fs.writeFileSync('g:/jxweb/jx/test_mobile_view.png', Buffer.from(obj.result.data, 'base64'));
          console.log('[MOBILE VIEW SCREENSHOT SAVED] -> test_mobile_view.png');
          p.kill();
          process.exit(0);
        }
      });
    });
  });
}, 2500);
