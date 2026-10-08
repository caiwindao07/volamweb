const { spawn } = require('child_process');
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const tmpDir = path.join(os.tmpdir(), 'edge_snap_' + Date.now());

const p = spawn(edge, [
  '--remote-debugging-port=9225',
  '--headless',
  '--disable-gpu',
  '--window-size=1280,720',
  '--no-first-run',
  '--no-default-browser-check',
  `--user-data-dir=${tmpDir}`,
  'about:blank'
]);

setTimeout(() => {
  http.get('http://127.0.0.1:9225/json', (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      const tabs = JSON.parse(data);
      const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);

      ws.on('open', () => {
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
        ws.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
        ws.send(JSON.stringify({ id: 4, method: 'Emulation.setDeviceMetricsOverride', params: { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false } }));
        ws.send(JSON.stringify({ id: 3, method: 'Page.navigate', params: { url: 'http://localhost:8080/' } }));
      });

      ws.on('message', (msg) => {
        const obj = JSON.parse(msg);
        if (obj.method === 'Page.loadEventFired') {
          setTimeout(() => {
            ws.send(JSON.stringify({
              id: 10,
              method: 'Runtime.evaluate',
              params: {
                expression: `
                  (() => {
                    window.S = newSave();
                    S.name = 'Hiệp Khách';
                    S.fac = 'shaolin';
                    S.lvl = 45;
                    S.gold = 12500;
                    S.eq = {};
                    S.inv = [];
                    // Trang bi tren nguoi
                    S.eq.weapon = makeItem(0, 0, 3, 2); // Kiem bac 3 xanh
                    S.eq.armor = makeItem(2, 0, 3, 2);
                    
                    // Do trong ruong
                    for (let i = 0; i < 4; i++) {
                      S.inv.push(makeItem(0, 0, 4, 3)); // Kiem bac 4 vang/tim
                    }
                    for (let i = 0; i < 6; i++) {
                      S.inv.push(makeItem(2, 0, 2, 0)); // Ao trang
                    }
                    for (let i = 0; i < 4; i++) {
                      S.inv.push(makeItem(5, 0, 3, 1)); // Giay xanh
                    }

                    window.R = { P: calc(S.eq) };
                    // Dong modal dang nhap
                    if (typeof closeModal === 'function') closeModal();
                    const modalEl = document.getElementById('modal');
                    if (modalEl) {
                      modalEl.classList.add('hidden');
                      modalEl.style.display = 'none';
                    }

                    // Mo cua so ruong do
                    const fwInv = document.getElementById('fw-inv');
                    if (fwInv) {
                      fwInv.classList.remove('hidden');
                      fwInv.style.left = '30px';
                      fwInv.style.top = '30px';
                      fwInv.style.display = 'block';
                    }
                    if (typeof switchTab === 'function') switchTab('inv');
                    if (typeof renderInv === 'function') renderInv();

                    // Kich hoat che do chon ban nhieu va chon cac mon do trang
                    if (window.ITEM_TOOLTIP) {
                      window.ITEM_TOOLTIP.toggleSelectMode(true);
                      window.ITEM_TOOLTIP.selectAllWhite();
                    }

                    // Hien thi Tooltip so sanh mon vu khi bac 4 trong ruong voi vu khi dang mac o ben phai
                    const compItem = S.inv[0];
                    if (window.ITEM_TOOLTIP && compItem) {
                      window.ITEM_TOOLTIP.show(compItem, { clientX: 620, clientY: 60 });
                    }

                    return 'setup_complete';
                  })()
                `,
                returnByValue: true
              }
            }));
          }, 1500);
        }

        if (obj.id === 10) {
          // Cho DOM render xong roi chup anh
          setTimeout(() => {
            ws.send(JSON.stringify({
              id: 20,
              method: 'Page.captureScreenshot',
              params: { format: 'png' }
            }));
          }, 800);
        }

        if (obj.id === 20 && obj.result && obj.result.data) {
          const imgBuffer = Buffer.from(obj.result.data, 'base64');
          fs.writeFileSync('tools/multi_select_and_tooltip.png', imgBuffer);
          console.log('[SCREENSHOT SAVED]: tools/multi_select_and_tooltip.png, size:', imgBuffer.length);
          p.kill();
          process.exit(0);
        }
      });
    });
  });
}, 2000);
