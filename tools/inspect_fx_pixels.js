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
                    const testFiles = ['fx/c1.webp', 'fx/c6.webp', 'fx/m216_hit.webp', 'fx/m66_fly.webp', 'fx/m86_hit.webp'];
                    const results = [];
                    for (const f of testFiles) {
                      const img = new Image();
                      img.src = f;
                      await new Promise(r => { img.onload = r; img.onerror = r; });
                      if (!img.naturalWidth) { results.push({ f, error: 'not loaded' }); continue; }
                      const cv = document.createElement('canvas');
                      cv.width = img.naturalWidth;
                      cv.height = img.naturalHeight;
                      const ctx = cv.getContext('2d');
                      ctx.drawImage(img, 0, 0);
                      const idata = ctx.getImageData(0, 0, Math.min(cv.width, 50), Math.min(cv.height, 50));
                      const d = idata.data;
                      let blackPixels = 0, transparentPixels = 0, colorPixels = 0;
                      let sampleColors = [];
                      for (let i = 0; i < d.length; i += 4) {
                        const r = d[i], g = d[i+1], b = d[i+2], a = d[i+3];
                        if (a === 0) transparentPixels++;
                        else if (r < 25 && g < 25 && b < 25) blackPixels++;
                        else {
                          colorPixels++;
                          if (sampleColors.length < 5) sampleColors.push([r, g, b, a]);
                        }
                      }
                      results.push({
                        f,
                        w: img.naturalWidth,
                        h: img.naturalHeight,
                        transparentPixels,
                        blackPixels,
                        colorPixels,
                        sampleColors
                      });
                    }
                    return JSON.stringify(results);
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
            console.log('[FX WEBP INSPECT]:', res.result.result.value);
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
