// tools/build_horse_sprites.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

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
  const idat = zlib.deflateSync(rawScanlines, { level: 9 });
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

const sprDir = 'H:/JxPhaThien/scratch/horse_spr';
const outDir = path.join(__dirname, '..', 'img', 'horse');
fs.mkdirSync(outDir, { recursive: true });

// Kích thước chuẩn mỗi frame crop quanh tâm (160, 160)
// Vùng crop: x: 160 - 64 = 96, y: 160 - 72 = 88, w: 128, h: 128
const FRAME_W = 128;
const FRAME_H = 128;
const CROP_X = 96;
const CROP_Y = 88;
const FRAMES_PER_DIR = 8; // Lấy 8 frame mỗi hướng cho mượt mà và nhẹ
const DIRS = 8;

function cropFrame(srcRgba, sprW) {
  const out = Buffer.alloc(FRAME_W * FRAME_H * 4, 0);
  for (let y = 0; y < FRAME_H; y++) {
    const srcY = CROP_Y + y;
    for (let x = 0; x < FRAME_W; x++) {
      const srcX = CROP_X + x;
      const srcOffset = (srcY * sprW + srcX) * 4;
      const dstOffset = (y * FRAME_W + x) * 4;
      out[dstOffset] = srcRgba[srcOffset];
      out[dstOffset + 1] = srcRgba[srcOffset + 1];
      out[dstOffset + 2] = srcRgba[srcOffset + 2];
      out[dstOffset + 3] = srcRgba[srcOffset + 3];
    }
  }
  return out;
}

// Ghép sprite sheet: DIRS hàng x FRAMES_PER_DIR cột
// Kích thước sheet: (FRAMES_PER_DIR * FRAME_W) x (DIRS * FRAME_H) = 1024 x 1024
function buildSheet(sprFiles) {
  const sheetW = FRAMES_PER_DIR * FRAME_W;
  const sheetH = DIRS * FRAME_H;
  const sheetBuf = Buffer.alloc(sheetW * sheetH * 4, 0);

  // Đọc tất cả các file layer (ví dụ [MA_HT] hoặc [MA_HB])
  const buffers = sprFiles.map(f => fs.readFileSync(path.join(sprDir, f)));
  const totalFramesInSpr = buffers[0].readUInt16LE(12);
  const sprDirs = buffers[0].readUInt16LE(16);
  const framesInDir = totalFramesInSpr / sprDirs;

  for (let dir = 0; dir < DIRS; dir++) {
    for (let f = 0; f < FRAMES_PER_DIR; f++) {
      // Tính index frame trong SPR gốc
      const origFrameIdx = Math.floor(dir * framesInDir + (f * framesInDir / FRAMES_PER_DIR));
      
      // Hợp nhất các layer
      const compRgba = Buffer.alloc(320 * 320 * 4, 0);
      for (const b of buffers) {
        const decoded = decodeSprFrame(b, origFrameIdx);
        for (let i = 0; i < compRgba.length; i += 4) {
          if (decoded.rgba[i + 3] > 0) {
            compRgba[i] = decoded.rgba[i];
            compRgba[i + 1] = decoded.rgba[i + 1];
            compRgba[i + 2] = decoded.rgba[i + 2];
            compRgba[i + 3] = 255;
          }
        }
      }

      const cropped = cropFrame(compRgba, 320);

      // Copy cropped frame vào vị trí (f * FRAME_W, dir * FRAME_H) trên sheet
      const dstStartX = f * FRAME_W;
      const dstStartY = dir * FRAME_H;
      for (let y = 0; y < FRAME_H; y++) {
        for (let x = 0; x < FRAME_W; x++) {
          const srcIdx = (y * FRAME_W + x) * 4;
          const dstIdx = ((dstStartY + y) * sheetW + (dstStartX + x)) * 4;
          sheetBuf[dstIdx] = cropped[srcIdx];
          sheetBuf[dstIdx + 1] = cropped[srcIdx + 1];
          sheetBuf[dstIdx + 2] = cropped[srcIdx + 2];
          sheetBuf[dstIdx + 3] = cropped[srcIdx + 3];
        }
      }
    }
  }

  return encodePNG(sheetW, sheetH, sheetBuf);
}

// 1. Xuất các loại ngựa
const horses = [
  { id: '009', name: 'bachma' },
  { id: '010', name: 'tuyetanh' },
  { id: '011', name: 'bontieu' },
  { id: '012', name: 'phienvu' },
  { id: '013', name: 'phivan' },
  { id: '036', name: 'xichlongcau' }
];

console.log('Generating authentic JX1 horse sprites...');

horses.forEach(h => {
  // Lớp Thân Sau (Back): MA_HB
  // Lớp Thân Trước (Front): MA_HT + MA_HH
  const backStFiles = [`MA_HB_${h.id}_RD01.spr`];
  const frontStFiles = [`MA_HH_${h.id}_RD01.spr`, `MA_HT_${h.id}_RD01.spr`];

  const backRunFiles = [`MA_HB_${h.id}_HR01.spr`];
  const frontRunFiles = [`MA_HH_${h.id}_HR01.spr`, `MA_HT_${h.id}_HR01.spr`];

  const pngBackSt = buildSheet(backStFiles);
  fs.writeFileSync(path.join(outDir, `horse_${h.id}_back_st.png`), pngBackSt);

  const pngFrontSt = buildSheet(frontStFiles);
  fs.writeFileSync(path.join(outDir, `horse_${h.id}_front_st.png`), pngFrontSt);

  const pngBackRun = buildSheet(backRunFiles);
  fs.writeFileSync(path.join(outDir, `horse_${h.id}_back_run.png`), pngBackRun);

  const pngFrontRun = buildSheet(frontRunFiles);
  fs.writeFileSync(path.join(outDir, `horse_${h.id}_front_run.png`), pngFrontRun);

  console.log(`Generated sprites for horse ${h.name} (${h.id})`);
});

// 2. Xuất chân kỵ mã (Rider Legs)
const pngLegsSt = buildSheet(['MA_HD_012_RD01.spr']);
fs.writeFileSync(path.join(outDir, 'rider_legs_st.png'), pngLegsSt);

const pngLegsRun = buildSheet(['MA_HD_012_HR01.spr']);
fs.writeFileSync(path.join(outDir, 'rider_legs_run.png'), pngLegsRun);

console.log('Generated rider legs sprites.');
console.log('All horse sprites generated successfully!');
