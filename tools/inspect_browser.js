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
            JSON.stringify({
              H: typeof H !== 'undefined' ? { x: H.x, y: H.y, moving: H.moving, act: H.act } : null,
              CAM: typeof CAM !== 'undefined' ? CAM : null,
              WORLD: typeof WORLD !== 'undefined' ? WORLD : null,
              OBS_g: typeof OBS !== 'undefined' && OBS.g ? { w: OBS.g.w, h: OBS.g.h } : null,
              stage: typeof S !== 'undefined' ? S.stage : null,
              fac: typeof S !== 'undefined' ? S.fac : null,
              enemiesLen: typeof R !== 'undefined' && R.enemies ? R.enemies.length : 0,
              bgImg: typeof R !== 'undefined' && R.bgImg ? { src: R.bgImg.src, complete: R.bgImg.complete, w: R.bgImg.naturalWidth } : null,
              loopErr: typeof loopErr !== 'undefined' ? loopErr : null,
              loopLast: typeof loopLast !== 'undefined' ? loopLast : null,
              isLoggedIn: typeof ACC !== 'undefined' ? ACC.isLoggedIn : null
            })
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
          console.log('[GAME STATE RESULT]:', obj.result.result.value);
          p.kill();
          process.exit(0);
        }
      });
    });
  });
}, 2500);
