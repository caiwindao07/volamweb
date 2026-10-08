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
  if (frameIdx >= frames) frameIdx = 0;
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
  return { sprW, sprH, rgba, frames, fw, fh, fox, foy };
}

// 1. Extract Companion skill icons
const petIconSrc = 'H:/JxPhaThien/DongHanh_Temp_Port/spr/Ui3/UiDongHanh/icon/36';
const petIconDst = path.join(__dirname, '..', 'img', 'pet');
fs.mkdirSync(petIconDst, { recursive: true });

if (fs.existsSync(petIconSrc)) {
  const files = fs.readdirSync(petIconSrc).filter(f => f.endsWith('.spr'));
  for (let i = 0; i < Math.min(files.length, 30); i++) {
    const f = files[i];
    try {
      const buf = fs.readFileSync(path.join(petIconSrc, f));
      const res = decodeSprFrame(buf, 0);
      const png = encodePNG(res.sprW, res.sprH, res.rgba);
      fs.writeFileSync(path.join(petIconDst, f.replace('.spr', '.png')), png);
    } catch (e) {}
  }
  console.log('Extracted companion skill icons to img/pet');
}

// 2. Extract companion main UI bg
const petUiSrc = 'H:/JxPhaThien/DongHanh_Temp_Port/spr/Ui3/UiDongHanh/main.spr';
if (fs.existsSync(petUiSrc)) {
  try {
    const buf = fs.readFileSync(petUiSrc);
    const res = decodeSprFrame(buf, 0);
    const png = encodePNG(res.sprW, res.sprH, res.rgba);
    fs.writeFileSync(path.join(petIconDst, 'pet_bg.png'), png);
    console.log('Extracted pet_bg.png:', res.sprW, 'x', res.sprH);
  } catch (e) {
    console.error('pet_bg err:', e.message);
  }
}

// 3. Extract companion model sprites (frame 0 for avatar & idle)
const partnerDir = 'H:/JxPhaThien/spr_unpack/donghanh_partner';
if (fs.existsSync(partnerDir)) {
  const folders = fs.readdirSync(partnerDir);
  for (const f of folders) {
    const spFile = path.join(partnerDir, f, f + '_st01.spr');
    if (fs.existsSync(spFile)) {
      try {
        const buf = fs.readFileSync(spFile);
        const res = decodeSprFrame(buf, 0);
        
        // Crop the non-empty bounding box if possible or write standard sprite
        const png = encodePNG(res.sprW, res.sprH, res.rgba);
        fs.writeFileSync(path.join(petIconDst, f + '.png'), png);
        console.log('Extracted companion sprite', f, res.sprW, 'x', res.sprH);
      } catch (e) {
        console.error('Err partner', f, e.message);
      }
    }
  }
}

// 4. Extract Activity tabs (UiHoatDong)
const actSrc = 'H:/JxPhaThien/HoatDong_Temp_Port/spr/ui_hh/UiHoatDong';
const actDst = path.join(__dirname, '..', 'img', 'act');
fs.mkdirSync(actDst, { recursive: true });

if (fs.existsSync(actSrc)) {
  const files = fs.readdirSync(actSrc).filter(f => f.endsWith('.spr'));
  for (const f of files) {
    try {
      const buf = fs.readFileSync(path.join(actSrc, f));
      const res = decodeSprFrame(buf, 0);
      const png = encodePNG(res.sprW, res.sprH, res.rgba);
      fs.writeFileSync(path.join(actDst, f.replace('.spr', '.png')), png);
      console.log('Extracted act tab:', f, res.sprW, 'x', res.sprH);
    } catch (e) {}
  }
}

console.log('Extraction complete!');
