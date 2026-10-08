const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function encodePNG(width, height, rgbaBuffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type, 'ascii');
    const body = Buffer.concat([t, data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(body), 0);
    return Buffer.concat([len, t, data, crc]);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const rowSize = width * 4;
  const rawScanlines = Buffer.alloc((1 + rowSize) * height);
  for (let y = 0; y < height; y++) {
    rawScanlines[y * (1 + rowSize)] = 0;
    rgbaBuffer.copy(rawScanlines, y * (1 + rowSize) + 1, y * rowSize, (y + 1) * rowSize);
  }
  const idat = zlib.deflateSync(rawScanlines);
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function decodeSprFrame(buf, frameIdx = 0) {
  const sprW = buf.readUInt16LE(4);
  const sprH = buf.readUInt16LE(6);
  const frames = buf.readUInt16LE(12);
  const colors = buf.readUInt16LE(14);
  const offTableStart = 32 + colors * 3;
  const frame0Off = buf.readUInt32LE(offTableStart + frameIdx * 8);
  const frameStart = offTableStart + frames * 8 + frame0Off;

  const fw = buf.readUInt16LE(frameStart);
  const fh = buf.readUInt16LE(frameStart + 2);
  const fox = buf.readInt16LE(frameStart + 4);
  const foy = buf.readInt16LE(frameStart + 6);

  const rgba = Buffer.alloc(sprW * sprH * 4, 0);
  let ptr = frameStart + 8;
  for (let row = 0; row < fh; row++) {
    let sx = 0;
    while (sx < fw && ptr < buf.length) {
      const len = buf[ptr++];
      const alpha = buf[ptr++];
      if (alpha !== 0) {
        for (let i = 0; i < len; i++) {
          const px = fox + sx + i;
          const py = foy + row;
          if (px >= 0 && px < sprW && py >= 0 && py < sprH) {
            const c_idx = buf[ptr + i];
            const r = buf[32 + c_idx * 3];
            const g = buf[32 + c_idx * 3 + 1];
            const b = buf[32 + c_idx * 3 + 2];
            const offset = (py * sprW + px) * 4;
            rgba[offset] = r;
            rgba[offset + 1] = g;
            rgba[offset + 2] = b;
            rgba[offset + 3] = 255;
          }
        }
        ptr += len;
      }
      sx += len;
    }
  }
  return { sprW, sprH, rgba };
}

const dir = 'H:/JxPhaThien/client/Spr/Ui3/UiTeamManageBar';
const outDir = path.join(__dirname, '..', 'img', 'team');
fs.mkdirSync(outDir, { recursive: true });

const files = fs.readdirSync(dir).filter(f => f.endsWith('.spr'));
for (const file of files) {
  try {
    const buf = fs.readFileSync(path.join(dir, file));
    const res = decodeSprFrame(buf, 0);
    const png = encodePNG(res.sprW, res.sprH, res.rgba);
    const baseName = file.replace('.spr', '');
    fs.writeFileSync(path.join(outDir, baseName + '.png'), png);
    console.log('Converted', file, '->', baseName + '.png', res.sprW + 'x' + res.sprH);
  } catch (err) {
    console.error('Error converting', file, err.message);
  }
}
