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
      const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

      ws.on('open', () => {
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
        setTimeout(() => {
          ws.send(JSON.stringify({
            id: 2,
            method: 'Runtime.evaluate',
            params: {
              expression: `
                (async () => {
                  const tabReg = document.getElementById('tabAuthReg');
                  if (tabReg) tabReg.click();
                  setTimeout(() => {
                    const rnd = Math.floor(Math.random() * 90000 + 10000);
                    document.getElementById('regUser').value = 'u_' + rnd;
                    document.getElementById('regPass').value = '123456';
                    document.getElementById('regPass2').value = '123456';
                    document.getElementById('regHeroName').value = 'HiepKhach_' + rnd;
                    document.getElementById('btnDoReg').click();
                  }, 200);
                })()
              `
            }
          }));
        }, 1000);

        setTimeout(() => {
          ws.send(JSON.stringify({
            id: 3,
            method: 'Runtime.evaluate',
            params: {
              expression: 'window.loopLast',
              returnByValue: true
            }
          }));
        }, 3500);
      });

      ws.on('message', (msg) => {
        const obj = JSON.parse(msg);
        if (obj.method === 'Runtime.consoleAPICalled') {
          console.log('[CONSOLE]', obj.params.args.map(a => a.value || a.description).join(' '));
        }
        if (obj.id === 3) {
          console.log('[LOOP LAST ERROR]:', obj.result.result.value);
          p.kill();
          process.exit(0);
        }
      });
    });
  });
}, 2500);
