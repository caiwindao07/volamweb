const { spawn } = require('child_process');
const http = require('http');

const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const p = spawn(edge, ['--remote-debugging-port=9222', '--headless', '--disable-gpu', 'http://localhost:8080/']);

p.on('error', e => console.error('Spawn error:', e));

setTimeout(() => {
  http.get('http://127.0.0.1:9222/json', (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      console.log('Edge tabs:', data);
      p.kill();
      process.exit(0);
    });
  }).on('error', e => {
    console.error('HTTP Error:', e.message);
    p.kill();
    process.exit(1);
  });
}, 3000);
