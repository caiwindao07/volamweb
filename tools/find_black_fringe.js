const { spawn } = require('child_process');
const WebSocket = require('ws');
const http = require('http');

const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const p = spawn(edge, ['--remote-debugging-port=9222', '--headless', '--disable-gpu', 'http://localhost:8080/']);

function connectCDP(retry = 0) {
  if (retry > 20) { p.kill(); process.exit(1); }
  http.get('http://127.0.0.1:9222/json', (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      try {
        const tabs = JSON.parse(data);
        const pageTab = tabs.find(t => t.title === 'Võ Lâm Idle') || tabs[0];
        if (!pageTab || !pageTab.webSocketDebuggerUrl) { setTimeout(() => connectCDP(retry + 1), 500); return; }
        const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
        ws.on('open', () => {
          ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
          setTimeout(() => {
            ws.send(JSON.stringify({
              id: 200,
              method: 'Runtime.evaluate',
              params: {
                expression: `
                  (async () => {
                    // Check all fx/*.webp files for dark/black border or dark pixels with alpha
                    const list = Object.values(JFX.m).map(x => [x.fly && x.fly.f, x.hit && x.hit.f]).flat().filter(Boolean);
                    const uniq = [...new Set(list)];
                    const blackFringeFiles = [];
                    for (const f of uniq) {
                      const img = new Image();
                      img.src = f;
                      await new Promise(r => { img.onload = r; img.onerror = r; });
                      if (!img.naturalWidth) continue;
                      const cv = document.createElement('canvas');
                      cv.width = img.naturalWidth;
                      cv.height = img.naturalHeight;
                      const ctx = cv.getContext('2d');
                      ctx.drawImage(img, 0, 0);
                      const idata = ctx.getImageData(0, 0, cv.width, cv.height);
                      const d = idata.data;
                      let semiTransBlack = 0; // Dark pixels (r,g,b < 40) but alpha > 30 and alpha < 250
                      let totalOpaqueDark = 0;
                      for (let i = 0; i < d.length; i += 4) {
                        const r = d[i], g = d[i+1], b = d[i+2], a = d[i+3];
                        if (a > 15 && r < 45 && g < 45 && b < 45) {
                          semiTransBlack++;
                        }
                      }
                      if (semiTransBlack > 500) {
                        blackFringeFiles.push({ f, semiTransBlack, w: img.naturalWidth, h: img.naturalHeight });
                      }
                    }
                    return JSON.stringify(blackFringeFiles.sort((a,b) => b.semiTransBlack - a.semiTransBlack).slice(0, 15));
                  })()
                `,
                awaitPromise: true,
                returnByValue: true
              }
            }));
          }, 1500);
        });
        ws.on('message', (msg) => {
          const res = JSON.parse(msg);
          if (res.id === 200) {
            console.log('[DARK PIXELS WEBP]:', res.result.result.value);
            ws.close();
            p.kill();
            process.exit(0);
          }
        });
      } catch (e) { setTimeout(() => connectCDP(retry + 1), 500); }
    });
  }).on('error', () => setTimeout(() => connectCDP(retry + 1), 500));
}
setTimeout(() => connectCDP(), 1000);
