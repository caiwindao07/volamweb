const { spawn } = require('child_process');
const WebSocket = require('ws');
const http = require('http');

const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const p = spawn(edge, ['--remote-debugging-port=9222', '--headless', '--disable-gpu', 'about:blank']);

setTimeout(() => {
  http.get('http://127.0.0.1:9222/json', (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      const tabs = JSON.parse(data);
      const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);

      ws.on('open', () => {
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
        ws.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
        ws.send(JSON.stringify({ id: 3, method: 'Page.navigate', params: { url: 'http://localhost:8080/' } }));
      });

      ws.on('message', (msg) => {
        const obj = JSON.parse(msg);
        if (obj.method === 'Runtime.consoleAPICalled') {
          console.log('[LOG ' + obj.params.type + ']', obj.params.args.map(a => a.value || a.description).join(' '));
        }
        if (obj.method === 'Runtime.exceptionThrown') {
          console.log('[EXCEPTION]', obj.params.exceptionDetails.text, obj.params.exceptionDetails.exception ? obj.params.exceptionDetails.exception.description : '');
        }
        if (obj.method === 'Page.loadEventFired') {
          // Bắt đầu test đăng nhập
          setTimeout(() => {
            ws.send(JSON.stringify({
              id: 10,
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
          }, 1500);

          setTimeout(() => {
            p.kill();
            process.exit(0);
          }, 8000);
        }
      });
    });
  });
}, 2000);
