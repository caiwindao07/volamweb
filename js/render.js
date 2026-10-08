/* ======================= VE SAN DAU (canvas) ======================= */
'use strict';
let CV, CX, DPR = 1;
const MON_SCALE = 1.4, HERO_SCALE = 1.35; // bang hoat anh xuat o 0.6 kich thuoc goc
const IMG = {};
function img(src) { if (!src) return null; let i = IMG[src]; if (!i) { i = new Image(); i.src = src; IMG[src] = i; } return i; }
function addText(x, y, t, color, size = 12) { const max = S.lowFx ? 20 : 60; if (R.quiet || R.txt.length > max) return; R.txt.push({ x, y, t, color, size, life: S.lowFx ? 0.6 : 0.9 }); }
function burst(x, y, color) { if (R.quiet) return; R.fx.push({ k: 'ring', x, y, color, life: 0.45, max: 0.45 }); }
function addSparks(x, y, color = '#ffd700', count = 8, spd = 140) {
  if ((typeof S !== 'undefined' && S && S.lowFx) || R.quiet || R.fx.length > 80) return;
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const s = spd * (0.5 + Math.random() * 0.9);
    R.fx.push({
      k: 'spark',
      x, y,
      vx: Math.cos(ang) * s,
      vy: Math.sin(ang) * s,
      color,
      size: 2 + Math.random() * 2.5,
      life: 0.22 + Math.random() * 0.16,
      max: 0.38
    });
  }
}
function fxLine(a, b, atk) {
  if (R.quiet || R.fx.length > 80) return;
  let el = 'phys', v = 0; for (const e in atk.parts) if (atk.parts[e] > v) { v = atk.parts[e]; el = e; }
  R.fx.push({ k: 'line', x1: a.x, y1: a.y - 20, x2: b.x, y2: b.y - 14, color: ELEM_COL[el], life: 0.18, max: 0.18 });
}
/* ---------- hieu ung chieu goc (Missles.txt -> tools/extract_fx.py -> fx.js): dan bay theo huong + no tai muc tieu ----------
   chieu can chien: phat hoat anh tai muc tieu; thieu hinh thi ve tia nhu cu */
const JFX = window.JFX || { m: {}, s: {}, c: {}, f: {} }, FX_SCALE = 1.4, FX_MAX = 90;
const dir16 = (vx, vy) => (((Math.round(Math.atan2(-vx, vy) / (Math.PI / 8)) % 16) + 16) % 16);
const animDur = s => s ? Math.min(3.2, (s.n || 1) * (s.ms || 60) / 1000) : 0.5;
let lastCastT = 0;
function skillFxColor(atk) {
  let el = 'phys', v = 0;
  for (const e in atk && atk.parts || {}) {
    if (atk.parts[e] > v) { v = atk.parts[e]; el = e; }
  }
  return ELEM_COL[el] || ELEM_COL.phys;
}
/* hieu ung tai cho nguoi ra chieu (PreCastSpr cua skills.txt) */
function castFx(atk, caster) {
  const now = Date.now();
  if (now - lastCastT < 40) return;
  lastCastT = now;
  const cst = caster || (typeof H !== 'undefined' ? H : { x: 0, y: 0 });
  const f = atk && atk.id && JFX.f && JFX.f[atk.id], c = f && f.pre && JFX.c && JFX.c[f.pre];
  if (!c || R.quiet || R.fx.length > FX_MAX) return;
  R.fx.push({ k: 'boom', s: c, x: cst.x, y: cst.y - 6, t: 0, life: animDur(c), dir: 0, scale: 1.6, color: skillFxColor(atk) });
}

function drawFxFallback(f) {
  const c = CX || (CV && CV.getContext('2d')) || (typeof window !== 'undefined' && window.CX);
  if (!c) return false;
  const color = f.sparkCol || f.color || ELEM_COL.phys;
  c.save();
  c.strokeStyle = color;
  c.fillStyle = color;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  if (f.k === 'mis') {
    const k = clamp(f.t / Math.max(0.01, f.life), 0, 1), x = f.x1 + (f.x2 - f.x1) * k, y = f.y1 + (f.y2 - f.y1) * k;
    c.globalAlpha = 0.75;
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(f.x1, f.y1);
    for (let i = 1; i <= 5; i++) {
      const q = i / 5, wobble = q < k ? Math.sin(f.t * 34 + i * 1.7) * 5 : 0;
      c.lineTo(f.x1 + (x - f.x1) * q, f.y1 + (y - f.y1) * q + wobble);
    }
    c.stroke();
    c.globalAlpha = 1;
    c.beginPath();
    c.arc(x, y, 4.5, 0, 7);
    c.fill();
  } else {
    const k = clamp(f.t / Math.max(0.01, f.life), 0, 1), r = 7 + k * 35;
    c.globalAlpha = 0.9 * (1 - k * 0.55);
    c.lineWidth = 3 - k;
    c.beginPath();
    c.ellipse(f.x, f.y, r, r * 0.55, 0, 0, 7);
    c.stroke();
    c.globalAlpha = 0.7 * (1 - k);
    c.beginPath();
    c.arc(f.x, f.y, 3 + (1 - k) * 3, 0, 7);
    c.fill();
  }
  c.restore();
  return true;
}

function skillFx(a, b, atk) {
  if (typeof window !== 'undefined' && typeof window.skillFx === 'function' && window.skillFx !== skillFx) {
    return window.skillFx(a, b, atk);
  }
  castFx(atk, a);
  fxLine(a, b, atk);
}

function drawFxSprite(s, dir, t, x, y, loop, scale = FX_SCALE, alpha = 1) {
  const im = img(s.f); if (!im || !im.complete || !im.naturalWidth) return false;
  const c = CX || (CV && CV.getContext('2d')) || (typeof window !== 'undefined' && window.CX);
  if (!c) return false;
  const fr = loop ? Math.floor(t * 1000 / s.ms) % s.n : Math.min(s.n - 1, Math.floor(t * 1000 / s.ms));
  const row = s.d > 1 ? Math.round(dir * s.d / 16) % s.d : 0;
  const sc = scale || FX_SCALE;
  const dw = s.w * sc, dh = s.h * sc;
  const dx = x - s.ax * sc, dy = y - s.ay * sc;

  const prevAlpha = c.globalAlpha;
  c.globalAlpha = clamp(alpha * prevAlpha, 0, 1);
  c.drawImage(im, fr * s.w, row * s.h, s.w, s.h, dx, dy, dw, dh);

  // Hiệu ứng hào quang phát sáng (glow layer) nhẹ nhàng tôn màu sắc võ lâm
  if (!S.lowFx && (s.f.includes('hit') || sc >= 1.65)) {
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = clamp(0.32 * alpha * prevAlpha, 0, 1);
    c.drawImage(im, fr * s.w, row * s.h, s.w, s.h, dx, dy, dw, dh);
    c.globalCompositeOperation = 'source-over';
  }
  c.globalAlpha = prevAlpha;
  return true;
}

function stepFx(f, dt) { // tra ve false khi het; dan toi dich thi doi sang no
  f.t += dt; if (f.t < 0) return true;     // dang cho (phat dan lien tiep)
  if (f.k === 'mis') {
    // Luu lich su toa do cho tan anh (ghost trail)
    if (f.trail && f.curX !== undefined) {
      if (!f.history) f.history = [];
      f.history.unshift({ x: f.curX, y: f.curY, dir: f.curDir !== undefined ? f.curDir : f.dir, t: f.t });
      if (f.history.length > 4) f.history.pop();
    }
    if (f.t >= f.life) {
      if (f.hit) {
        Object.assign(f, {
          k: 'boom',
          s: f.hit,
          s2: f.end || null,
          x: f.x2,
          y: f.y2,
          t: 0,
          life: Math.max(animDur(f.hit), f.end ? animDur(f.end) : 0),
          scale: f.scale || FX_SCALE
        });
        if (f.shake) shakeCamera(f.shake, 0.16);
        if (f.sparks) addSparks(f.x2, f.y2, f.sparkCol || '#ffd700', f.sparks, 150);
        return true;
      }
      return false;
    }
  }
  return f.t < f.life;
}

function drawFx(f) {
  if (f.t < 0) return false;
  if (f.k === 'mis') {
    const k = clamp(f.t / f.life, 0, 1);
    let curX = f.x1 + (f.x2 - f.x1) * k;
    let curY = f.y1 + (f.y2 - f.y1) * k;
    let curDir = f.dir;

    // 1. Quỹ đạo sóng uốn lượn (sin-wave) cho rồng Cái Bang / ám khí
    if (f.wave) {
      const ang = Math.atan2(f.y2 - f.y1, f.x2 - f.x1);
      const perpX = -Math.sin(ang), perpY = Math.cos(ang);
      const wPhase = (f.wavePhase || 0) + k * (f.waveFreq || (Math.PI * 4));
      const envelope = Math.sin(k * Math.PI);
      const offset = Math.sin(wPhase) * f.wave * envelope;
      curX += perpX * offset;
      curY += perpY * offset;
      if (f.curX !== undefined && (Math.abs(curX - f.curX) > 0.5 || Math.abs(curY - f.curY) > 0.5)) {
        curDir = dir16(curX - f.curX, curY - f.curY);
      }
    }

    // 2. Quỹ đạo cung tròn (arc) cho lựu đạn / bẫy ném
    if (f.arc) {
      curY -= Math.sin(k * Math.PI) * f.arc;
    }

    f.curX = curX;
    f.curY = curY;
    f.curDir = curDir;

    // 3. Vẽ tàn ảnh (ghost trail)
    if (f.trail && f.history && f.history.length > 0) {
      for (let h = 0; h < f.history.length; h++) {
        const hist = f.history[h];
        const hAlpha = 0.32 / (h + 1.2);
        drawFxSprite(f.s, hist.dir, hist.t, hist.x, hist.y, true, (f.scale || FX_SCALE) * 0.96, hAlpha);
      }
    }

    const drawn = drawFxSprite(f.s, curDir, f.t, curX, curY, true, f.scale || FX_SCALE, 1);
    if (!drawn) return drawFxFallback(f);
    return true;
  }
  if (f.s2 && f.t < animDur(f.s2)) drawFxSprite(f.s2, f.dir, f.t, f.x, f.y, false, f.scale || FX_SCALE);
  if (f.t < (f.s && f.s.n ? animDur(f.s) : Infinity)) {
    const drawn = drawFxSprite(f.s, f.dir, f.t, f.x, f.y, false, f.scale || FX_SCALE, 1);
    if (!drawn) return drawFxFallback(f);
    return true;
  }
  return !!f.s2;
}
/* Giao dien di dong ti le 1:1 chuan responsive, toa do cam ung va canvas sac net tuyet doi */
const UI_SCALE_MOBILE = 1;
const isMobileUI = () => !(typeof isDesktopLandscape === 'function' && isDesktopLandscape()) && !!(window.matchMedia && (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 700));
const uiScale = () => 1;
function resizeArena() {
  const b = $('#battle'), box = { width: b.offsetWidth, height: b.offsetHeight };
  DPR = Math.min(2, window.devicePixelRatio || 1);
  CV.width = Math.round(box.width * DPR); CV.height = Math.round(box.height * DPR);
  AR.w = box.width; AR.h = box.height; AR.top = 58; AR.bot = box.height - 12;   // khung nhin (man hinh)
  snapCamera();
}
/* ---------- camera chay theo nhan vat, khong ra ngoai mep ban do ---------- */
/* ---------- camera chay theo nhan vat, khong ra ngoai mep ban do ---------- */
const CAM = { x: 0, y: 0, sx: 0, sy: 0, shakeT: 0, shakeDur: 0, shakeMag: 0 };
const camTarget = () => [clamp(H.x - AR.w / 2, 0, Math.max(0, WORLD.w - AR.w)), clamp(H.y - AR.h * 0.55, 0, Math.max(0, WORLD.h - AR.h))];
function snapCamera() { [CAM.x, CAM.y] = camTarget(); CAM.sx = 0; CAM.sy = 0; }
function updateCamera(dt) {
  const [tx, ty] = camTarget(), k = Math.min(1, dt * 6);
  CAM.x += (tx - CAM.x) * k;
  CAM.y += (ty - CAM.y) * k;
  if (CAM.shakeT > 0) {
    CAM.shakeT -= dt;
    const progress = Math.max(0, CAM.shakeT / (CAM.shakeDur || 0.15));
    const curMag = CAM.shakeMag * progress;
    CAM.sx = (Math.random() - 0.5) * 2 * curMag;
    CAM.sy = (Math.random() - 0.5) * 2 * curMag;
  } else {
    CAM.sx = 0;
    CAM.sy = 0;
  }
}
function shakeCamera(mag = 4, dur = 0.15) {
  if (typeof S !== 'undefined' && S && (S.lowFx || S.noShake)) return;
  CAM.shakeMag = Math.max(CAM.shakeMag || 0, mag);
  CAM.shakeDur = dur;
  CAM.shakeT = dur;
}
/* ---------- nen ban do: anh 3x3 vung that (BG_TILE diem) lat guong xen ke -> ghep lien, khong thay mep, the gioi rong tuy y ---------- */
const BG_TILE = 1536;
let _defaultBgImg = null;
function getDefaultBg() {
  if (!_defaultBgImg) _defaultBgImg = img('img/z/140.jpg');
  return _defaultBgImg;
}
function drawTiledBg(c, bg) {
  if (!(bg && bg.complete && bg.naturalWidth)) {
    const def = getDefaultBg();
    if (def && def.complete && def.naturalWidth) bg = def;
    else { c.fillStyle = '#26301f'; c.fillRect(CAM.x - 40, CAM.y - 40, AR.w + 80, AR.h + 80); return; }
  }
  if (R.town || OBS.g || (typeof S !== 'undefined' && S && S.chosenZone === 386)) { c.drawImage(bg, 0, 0, WORLD.w || 3072, WORLD.h || 3072); return; }          // ban do that rong, khong lat guong
  const T = BG_TILE, i0 = Math.floor((CAM.x - 40) / T), i1 = Math.floor((CAM.x + AR.w + 40) / T), j0 = Math.floor((CAM.y - 40) / T), j1 = Math.floor((CAM.y + AR.h + 40) / T);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const fx = i & 1, fy = j & 1;
    if (!fx && !fy) { c.drawImage(bg, i * T, j * T, T, T); continue; }
    c.save(); c.translate(i * T + (fx ? T : 0), j * T + (fy ? T : 0)); c.scale(fx ? -1 : 1, fy ? -1 : 1); c.drawImage(bg, 0, 0, T, T); c.restore();
  }
}
/* ---------- ban do nho: anh ban do that thu nho, quai = cham theo ngu hanh / trum, nhan vat = mui ten, khung = tam nhin ---------- */
const MINI = { s: 92, m: 8, top: 62 };
function drawMinimap(c) {
  if (R.town || S.miniMap === false) return;
  c.save();
  const s = MINI.s, x0 = AR.w - s - MINI.m, y0 = MINI.top, k = s / (WORLD.w || 3072);
  let bg = R.bgImg || (typeof zoneOf === 'function' && typeof S !== 'undefined' && S ? (R.bgImg = img(zoneOf(S.stage || 1).bg)) : null);
  if (!(bg && bg.complete && bg.naturalWidth)) bg = getDefaultBg();
  if (bg && bg.complete && bg.naturalWidth) {
    if (OBS.g) c.drawImage(bg, x0, y0, s, s);
    else { const n = Math.round((WORLD.w || 3072) / BG_TILE), h = s / n;                   // cung cach ghep lat guong nhu nen tran dau
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { c.save(); c.translate(x0 + i * h + (i & 1 ? h : 0), y0 + j * h + (j & 1 ? h : 0)); c.scale(i & 1 ? -1 : 1, j & 1 ? -1 : 1); c.drawImage(bg, 0, 0, h, h); c.restore(); } }
  } else { c.fillStyle = '#26301f'; c.fillRect(x0, y0, s, s); }
  c.globalAlpha = 1;
  c.strokeStyle = '#fff6'; c.lineWidth = 1; c.strokeRect(x0 + CAM.x * k, y0 + CAM.y * k, Math.min(s, AR.w * k), Math.min(s, AR.h * k));
  if (typeof MAP_EXPANSION !== 'undefined' && MAP_EXPANSION.drawMinimapCamps) MAP_EXPANSION.drawMinimapCamps(c, x0, y0, s, k);
  for (const d of R.ground) if (lootMatch(d.it)) { c.fillStyle = RAR_COL[d.it.r]; c.fillRect(x0 + d.x * k - 1, y0 + d.y * k - 1, 2, 2); }
  for (const e of R.enemies) {
    if (e.dead) continue;
    const r = e.cls === 'boss' ? 3.2 : e.cls === 'elite' ? 2.4 : 1.8;
    c.fillStyle = e.goldBoss ? '#ffd24a' : e.cls === 'boss' ? '#ff4a3a' : SERIES_COL[e.series];
    c.beginPath(); c.arc(x0 + e.x * k, y0 + e.y * k, r, 0, 7); c.fill();
  }
  // Cham nguoi choi khac tren ban do nho (mau xanh cyan)
  if (typeof MP !== 'undefined' && MP.otherPlayers) {
    const curZone = typeof getCurZoneId === 'function' ? getCurZoneId() : null;
    for (const id in MP.otherPlayers) {
      const p = MP.otherPlayers[id];
      if (curZone && p.zoneId && p.zoneId !== curZone) continue;
      c.fillStyle = '#38bdf8';
      c.beginPath(); c.arc(x0 + p.x * k, y0 + p.y * k, 2.5, 0, 7); c.fill();
    }
  }
  if (R.petPos) { c.fillStyle = '#9fe36a'; c.fillRect(x0 + R.petPos.x * k - 1.5, y0 + R.petPos.y * k - 1.5, 3, 3); }
  const hx = x0 + H.x * k, hy = y0 + H.y * k, a = Math.PI / 2 + (H.dir || 0) * Math.PI / 4;   // huong 0 = nam (xuong duoi)
  c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.beginPath();
  c.moveTo(hx + Math.cos(a) * 5, hy + Math.sin(a) * 5); c.lineTo(hx + Math.cos(a + 2.5) * 4, hy + Math.sin(a + 2.5) * 4); c.lineTo(hx + Math.cos(a - 2.5) * 4, hy + Math.sin(a - 2.5) * 4);
  c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = '#c8a45a'; c.strokeRect(x0 - 2, y0 - 2, s + 4, s + 4);
  c.font = '9px "IBM Plex Mono", monospace'; c.textAlign = 'center'; c.fillStyle = '#f3d88a';
  c.fillText(R.tower ? `Tháp · tầng ${R.tower.floor}` : zoneOf(Math.min(S.stage, STAGES)).n, x0 + s / 2, y0 + s + 11);
  c.restore();
}
const onScreen = (x, y, m = 120) => x > CAM.x - m && x < CAM.x + AR.w + m && y > CAM.y - m && y < CAM.y + AR.h + m;
function drawSprite(im, sz, x, y, scale, flip, alpha = 1) {
  if (!im || !im.complete || !im.naturalWidth) return false;
  const w = im.naturalWidth * scale, h = im.naturalHeight * scale;
  // diem chan lay tu tam spr; mot so spr co tam nam ngoai khung da cat -> dung giua-duoi anh
  const okFoot = sz && sz[2] >= 0 && sz[2] <= im.naturalWidth && sz[3] >= im.naturalHeight * 0.5 && sz[3] <= im.naturalHeight * 1.2;
  const fx = okFoot ? sz[2] * scale : w / 2, fy = okFoot ? sz[3] * scale : h * 0.95;
  CX.save(); CX.globalAlpha = alpha; CX.translate(x, y); if (flip) CX.scale(-1, 1);
  CX.drawImage(im, -fx, -fy, w, h); CX.restore();
  return true;
}
/* ---------- hoat anh 8 huong (img/a/<npcres>_<hanh dong>.webp) ----------
   huong 0 = quay mat ve nguoi xem, tang theo chieu kim dong ho: N(am), TN, T, TB, B, DB, D, DN */
const dirOf = (vx, vy) => (((Math.round(Math.atan2(-vx, vy) / (Math.PI / 4)) % 8) + 8) % 8);
const ONCE = { at: 1, hurt: 1, die: 1 };
function animLen(key, act) { const m = W.anim && W.anim[key] && W.anim[key][act]; return m ? m.n * m.ms / 1000 : 0; }
function drawAnim(key, act, dir, t, x, y, sc, alpha = 1) {
  const set = W.anim && W.anim[key]; if (!set) return false;
  const m = set[act] || set.st; if (!m) return false;
  const im = img('img/a/' + m.f); if (!im || !im.complete || !im.naturalWidth) return false;
  let fr = Math.floor(t * 1000 / m.ms); fr = ONCE[act] ? Math.min(fr, m.n - 1) : fr % m.n;
  const d = m.d >= 8 ? dir : Math.floor(dir * m.d / 8);
  const sx = Math.min(fr * m.w, Math.max(0, im.naturalWidth - m.w));
  const sy = Math.min(d * m.h, Math.max(0, im.naturalHeight - m.h));
  const sw = Math.min(m.w, im.naturalWidth - sx);
  const sh = Math.min(m.h, im.naturalHeight - sy);
  if (sw <= 0 || sh <= 0) return false;
  CX.globalAlpha = alpha;
  CX.drawImage(im, sx, sy, sw, sh, x - m.ax * sc, y - m.ay * sc, sw * sc, sh * sc);
  CX.globalAlpha = 1;
  return sh * sc;
}
function setAct(o, act) { if (o.act !== act) { o.act = act; o.actT = 0; } }
function stepAct(o, dt, idle) { // het hoat anh mot lan (danh / trung don) -> ve trang thai nen
  o.actT = (o.actT || 0) + dt;
  if ((o.act === 'at' || o.act === 'hurt') && o.actT >= Math.max(0.25, animLen(o.animKey, o.act))) setAct(o, idle);
}
/* ten tren dau (nhan vat, quai, dong hanh): chu mot nen, vien den cho de doc tren moi nen ban do */
const NAME_COL = { boss: '#ffb070', elite: '#8fc6ff', normal: '#e8dcc8', hero: '#fff3c0', pet: '#9fe36a', gold: '#ffd24a' };
/* Nhan (ten + thanh mau) tren dau: xep vao hang cho, cuoi khung moi tranh chong: nhan nao de len nhan khac thi day len cao hon.
   y = diem sat dau; thanh mau nam duoi cung, ten ngay tren thanh. hp < 0: khong ve thanh. */
const LABELS = [];
function label(x, y, text, col, size, hp, barCol) { LABELS.push({ x, y, text, col, size, hp, barCol }); }
function flushLabels() {
  if (!LABELS.length) return;
  CX.textAlign = 'center'; CX.lineJoin = 'round';
  const placed = [];
  for (const L of LABELS.sort((a, b) => b.y - a.y)) {                 // tu duoi len: nhan thap giu cho, nhan cao day len khi de
    CX.font = `${L.size}px "IBM Plex Mono", monospace`; L.w = Math.max(CX.measureText(L.text).width, 44); L.h = L.size + 4 + (L.hp >= 0 ? 7 : 0);
    let y = L.y;
    for (let k = 0; k < 8; k++) { const hit = placed.find(p => Math.abs(p.x - L.x) < (p.w + L.w) / 2 && y > p.top && y - L.h < p.y); if (!hit) break; y = hit.top - 1; }
    L.py = y; L.top = y - L.h; placed.push({ x: L.x, w: L.w, y, top: L.top });
  }
  for (const L of LABELS) {
    const y = L.py, bw = Math.min(L.w, 56);
    if (L.hp >= 0) { CX.fillStyle = '#000c'; CX.fillRect(L.x - bw / 2 - 1, y - 6, bw + 2, 6); CX.fillStyle = L.barCol; CX.fillRect(L.x - bw / 2, y - 5, bw * clamp(L.hp, 0, 1), 4); }
    CX.font = `${L.size}px "IBM Plex Mono", monospace`; CX.lineWidth = 3; CX.strokeStyle = '#000c';
    const ty = y - (L.hp >= 0 ? 8 : 1); CX.strokeText(L.text, L.x, ty); CX.fillStyle = L.col; CX.fillText(L.text, L.x, ty);
  }
  LABELS.length = 0;
}
function nameTag(x, y, text, col, size = 11) {
  CX.font = `${size}px "IBM Plex Mono", monospace`; CX.textAlign = 'center'; CX.lineJoin = 'round'; CX.lineWidth = 3; CX.strokeStyle = '#000c';
  CX.strokeText(text, x, y); CX.fillStyle = col; CX.fillText(text, x, y);
}
const enemyName = e => `${e.n} · Lv${e.L}`;
function bar(x, y, w, h, f, col) { CX.fillStyle = '#000a'; CX.fillRect(x, y, w, h); CX.fillStyle = col; CX.fillRect(x, y, w * clamp(f, 0, 1), h); }

/* ---------- HOẠT ẢNH & HIỂN THỊ CHIẾN MÃ (MOUNT RES) ---------- */
function getHorseResId(tier) {
  tier = tier || 1;
  switch (tier) {
    case 1: return '009'; // Túc Sương (Bạch Mã)
    case 2: return '010'; // Tuyệt Ảnh
    case 3: return '010'; // Ô Vân Đạp Tuyết
    case 4: return '009'; // Đích Lô
    case 5: return '036'; // Xích Thố
    case 6: return '009'; // Chiếu Dạ Ngọc Sư Tử
    case 7: return '013'; // Phi Vân
    case 8: return '011'; // Bôn Tiêu
    case 9: return '012'; // Phiên Vũ
    case 10: return '012'; // Siêu Quang
    case 11:
    default: return '036'; // Xích Long Câu
  }
}

function preloadHorseSprites() {
  const ids = ['009', '010', '011', '012', '013', '036'];
  const acts = ['st', 'run'];
  acts.forEach(a => {
    img('img/horse/rider_legs_' + a + '.png');
    img('img/horse/rider_body_man_' + a + '.png');
    img('img/horse/rider_body_lady_' + a + '.png');
    ids.forEach(id => {
      img('img/horse/horse_' + id + '_back_' + a + '.png');
      img('img/horse/horse_' + id + '_front_' + a + '.png');
    });
  });
}
if (typeof window !== 'undefined') {
  setTimeout(preloadHorseSprites, 500);
}

/* Vẽ thân kỵ mã ngồi trên yên ngựa chuẩn Kingsoft JX1 PC (ma_bd_120_rd/hr & fm_bd_120_rd/hr) */
function drawHorseRiderBody(c, x, y, dir, act, actT, isLady, bob) {
  const isMoving = act === 'run';
  const actKey = isMoving ? 'run' : 'st';
  const fps = isMoving ? 12 : 6;
  const frameIdx = Math.floor((actT || 0) * fps) % 8;
  const dirIdx = (((dir || 0) % 8) + 8) % 8;
  const sexKey = isLady ? 'lady' : 'man';
  const riderImg = img('img/horse/rider_body_' + sexKey + '_' + actKey + '.png');
  if (riderImg && riderImg.complete && riderImg.naturalWidth) {
    const sx = frameIdx * 128;
    const sy = dirIdx * 128;
    const sw = 128, sh = 128;
    const dx = x - 64;
    const dy = y - 74 + (isMoving ? (bob || 0) : 0);
    c.drawImage(riderImg, sx, sy, sw, sh, dx, dy, sw, sh);
    return true;
  }
  return false;
}

function drawHorseMount(c, x, y, dir, act, actT, mountData) {
  const tier = (mountData && mountData.tier) || (typeof S !== 'undefined' && S && S.mount ? S.mount.tier : 1);
  const isMoving = act === 'run';
  const actKey = isMoving ? 'run' : 'st';
  const fps = isMoving ? 12 : 6;
  const frameIdx = Math.floor((actT || 0) * fps) % 8;
  const dirIdx = (((dir || 0) % 8) + 8) % 8;
  const bob = isMoving ? Math.sin((actT || 0) * 12) * 2.5 : Math.sin((actT || 0) * 3) * 0.8;

  // 1. Bóng ngựa dưới chân
  c.fillStyle = '#0008';
  c.beginPath();
  c.ellipse(x, y + 2, 22, 9, 0, 0, Math.PI * 2);
  c.fill();

  // 2. Vòng hào quang huyền ảo theo bậc ngựa (Tier >= 7)
  if (tier >= 7) {
    const auraCol = tier >= 11 ? '#f43f5e' : (tier >= 10 ? '#fb923c' : (tier >= 9 ? '#eab308' : (tier >= 8 ? '#f97316' : '#a855f7')));
    const pulse = Math.sin((actT || 0) * 5);
    c.save();
    c.strokeStyle = auraCol;
    c.lineWidth = 2;
    c.globalAlpha = 0.5 + pulse * 0.25;
    c.beginPath();
    c.ellipse(x, y + 2, 28 + (tier >= 9 ? 4 : 0), 11 + (tier >= 9 ? 2 : 0), 0, 0, Math.PI * 2);
    c.stroke();
    // Vệt hào quang móng ngựa khi di chuyển
    if (isMoving) {
      c.fillStyle = auraCol;
      c.globalAlpha = 0.7;
      const legW = Math.sin((actT || 0) * 14) * 12;
      c.beginPath();
      c.arc(x - 14 + legW * 0.4, y + 3, 2.5, 0, Math.PI * 2);
      c.arc(x + 14 - legW * 0.4, y + 3, 2.5, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }

  // 3. Lớp thân sau ngựa (Sprite Sheet JX1 - Layer 1 Back)
  const horseId = getHorseResId(tier);
  const backImg = img('img/horse/horse_' + horseId + '_back_' + actKey + '.png');
  const sx = frameIdx * 128;
  const sy = dirIdx * 128;
  const sw = 128, sh = 128;
  const dx = x - 64;
  const dy = y - 74;

  if (backImg && backImg.complete && backImg.naturalWidth) {
    c.drawImage(backImg, sx, sy, sw, sh, dx, dy, sw, sh);
  }

  return bob;
}

/* Vẽ các chi tiết phía trước của ngựa (Layer 3: Chân kỵ mã & Thân trước, đầu, cổ, yên, bàn đạp) phủ lên trước người cưỡi */
function drawHorseForeground(c, x, y, dir, act, actT, mountData) {
  const tier = (mountData && mountData.tier) || (typeof S !== 'undefined' && S && S.mount ? S.mount.tier : 1);
  const horseId = getHorseResId(tier);
  const isMoving = act === 'run';
  const actKey = isMoving ? 'run' : 'st';
  const fps = isMoving ? 12 : 6;
  const frameIdx = Math.floor((actT || 0) * fps) % 8;
  const dirIdx = (((dir || 0) % 8) + 8) % 8;
  const sx = frameIdx * 128;
  const sy = dirIdx * 128;
  const sw = 128, sh = 128;
  const dx = x - 64;
  const dy = y - 74;

  // 1. Chân kỵ mã (Rider Legs gác trên bàn đạp ngựa) phủ lên che chân đứng của avatar
  const legsImg = img('img/horse/rider_legs_' + actKey + '.png');
  if (legsImg && legsImg.complete && legsImg.naturalWidth) {
    c.drawImage(legsImg, sx, sy, sw, sh, dx, dy, sw, sh);
  }

  // 2. Lớp thân trước & đầu & yên ngựa (MA_HT + MA_HH)
  const frontImg = img('img/horse/horse_' + horseId + '_front_' + actKey + '.png');
  if (frontImg && frontImg.complete && frontImg.naturalWidth) {
    c.drawImage(frontImg, sx, sy, sw, sh, dx, dy, sw, sh);
  }
}

function draw(dt) {
  const c = CX || (CV && CV.getContext('2d')) || (typeof window !== 'undefined' && window.CX);
  if (!c) return;
  if (typeof window !== 'undefined') window.CX = c;
  c.setTransform(DPR, 0, 0, DPR, 0, 0); c.clearRect(0, 0, AR.w, AR.h);
  updateCamera(dt);
  c.setTransform(DPR, 0, 0, DPR, -Math.round(CAM.x + (CAM.sx || 0)) * DPR, -Math.round(CAM.y + (CAM.sy || 0)) * DPR);
  const bg = R.bgImg || (typeof zoneOf === 'function' && typeof S !== 'undefined' && S ? (R.bgImg = img(zoneOf(S.stage || 1).bg)) : null);
  drawTiledBg(c, bg);
  // do roi tren dat: vien theo do hiem, ten cho do khop bo loc / mon dang chon
  c.textAlign = 'center';
  for (const d of R.town ? [] : R.ground) {
    const im = d.it.ic ? img(d.it.ic) : null, match = lootMatch(d.it), sel = R.pickTarget === d;
    const bob = Math.sin((d.age + d.x) * 3) * 1.5;
    c.fillStyle = '#0008'; c.beginPath(); c.ellipse(d.x, d.y + 2, 11, 4, 0, 0, 7); c.fill();
    c.strokeStyle = RAR_COL[d.it.r]; c.lineWidth = sel ? 2.5 : match ? 1.6 : 0.8; c.globalAlpha = match || sel ? 1 : 0.55;
    c.beginPath(); c.ellipse(d.x, d.y + 2, 12, 5, 0, 0, 7); c.stroke();
    if (im && im.complete && im.naturalWidth) { const k = Math.min(26 / im.naturalWidth, 26 / im.naturalHeight); c.drawImage(im, d.x - im.naturalWidth * k / 2, d.y - im.naturalHeight * k + bob, im.naturalWidth * k, im.naturalHeight * k); }
    if (match || sel || d.it.r >= 2) { c.font = '9px "IBM Plex Mono", monospace'; c.fillStyle = '#000'; c.fillText(d.it.n, d.x + 1, d.y - 27); c.fillStyle = RAR_COL[d.it.r]; c.fillText(d.it.n, d.x, d.y - 28); }
    c.globalAlpha = 1;
  }
  // xac quai: phat hoat anh chet roi mo dan (xu ly nguoc de splice khong sinh rac GC)
  for (let i = R.corpses.length - 1; i >= 0; i--) {
    const e = R.corpses[i];
    e.actT += dt;
    if (e.actT >= 1.6) {
      R.corpses.splice(i, 1);
      continue;
    }
    const a = clamp(1.6 - e.actT, 0, 1);
    const sc = e.cls === 'boss' ? 1.15 : e.cls === 'elite' ? 0.95 : 0.8;
    if (!(e.animKey && drawAnim(e.animKey, 'die', e.dir || 0, e.actT, e.x, e.y, sc * MON_SCALE, a))) {
      c.globalAlpha = a * 0.5;
      drawSprite(e.img, e.sz, e.x, e.y, sc, e.face < 0);
      c.globalAlpha = 1;
    }
  }
  if (typeof drawCampfire === 'function') drawCampfire(c, dt);              // lua trai (pvk_upgrade.js)
  drawPet(c, dt);                                                           // dong hanh (rewards.js / pvk_upgrade.js)
  if (typeof updateOtherPlayers === 'function') updateOtherPlayers(dt);     // cap nhat vi tri nguoi choi khac
  if (typeof sendMove === 'function') sendMove(dt);                         // gui toa do nhan vat len server

  // Toi uu GC: Tai su dung mang _renderEnts thay vi tao moi 4 mang moi frame
  if (!window._renderEnts) {
    window._renderEnts = [];
    window._heroRenderEnt = { hero: true, y: 0 };
  }
  const ents = window._renderEnts;
  ents.length = 0;
  for (let i = 0; i < R.enemies.length; i++) {
    const e = R.enemies[i];
    if (!e.dead) ents.push(e);
  }
  window._heroRenderEnt.y = H.y;
  ents.push(window._heroRenderEnt);
  if (typeof getVisibleOtherPlayers === 'function') {
    const othersList = getVisibleOtherPlayers();
    for (let i = 0; i < othersList.length; i++) {
      const p = othersList[i];
      ents.push({ otherPlayer: true, p: p, y: p.y });
    }
  }
  // NPC Thành Thị & Thôn Trấn khi ở trong khu vực an toàn
  if (R.town && typeof TOWN_NPC !== 'undefined' && TOWN_NPC.getCurNpcs) {
    const townNpcs = TOWN_NPC.getCurNpcs();
    for (let i = 0; i < townNpcs.length; i++) {
      ents.push(townNpcs[i]);
    }
  }
  // Bạn Đồng Hành (Companion / Pet) xuất chiến đi theo sau
  if (typeof COMPANION_SYSTEM !== 'undefined' && COMPANION_SYSTEM.getActiveCompanion && COMPANION_SYSTEM.getActiveCompanion()) {
    ents.push({ companion: true, y: COMPANION_SYSTEM.petPos.y || H.y });
  }
  ents.sort((a, b) => a.y - b.y);
  for (let i = 0; i < ents.length; i++) {
    const e = ents[i];
    if (e.companion) {
      if (typeof COMPANION_SYSTEM !== 'undefined' && COMPANION_SYSTEM.drawPet) {
        COMPANION_SYSTEM.drawPet(c, dt);
      }
      continue;
    }
    if (e.isNpc) {
      if (typeof TOWN_NPC !== 'undefined' && TOWN_NPC.drawNpc) {
        TOWN_NPC.drawNpc(c, dt, e);
      }
      continue;
    }
    if (e.otherPlayer) {
      if (typeof drawSingleOtherPlayer === 'function') drawSingleOtherPlayer(c, dt, e.p);
      continue;
    }
    if (e.hero) {
      const hw = W.hero[S.fac];
      H.animKey = hw && hw.anim;
      const mvx = H.x - (H.px ?? H.x), mvy = H.y - (H.py ?? H.y); H.px = H.x; H.py = H.y;
      H.moving = Math.hypot(mvx, mvy) > 0.4; if (H.moving && H.act !== 'at') H.dir = dirOf(mvx, mvy);
      stepAct(H, dt, H.moving ? 'run' : 'st');
      if (R.deadT > 0) setAct(H, 'die'); else if (H.act !== 'at' && H.act !== 'hurt') setAct(H, H.moving ? 'run' : 'st');

      let heroY = H.y;
      let mountBob = 0;
      if (S && S.mounted) {
        if (!R.jx && typeof drawHorseMount === 'function') {
          mountBob = drawHorseMount(c, H.x, H.y, H.dir || 0, H.act || 'st', H.actT || 0, S.mount);
        }
        heroY = H.y - 14 + mountBob;
      } else {
        c.fillStyle = '#0007'; c.beginPath(); c.ellipse(H.x, H.y, 16, 6, 0, 0, 7); c.fill();
      }

      // Rider body sprite cũ đã thay bằng paperdoll clip ở trên

      // Vẽ Phi Phong hào quang & cánh áo choàng phát sáng
      if (typeof CLOAK_SYSTEM !== 'undefined' && CLOAK_SYSTEM.drawCloak) {
        CLOAK_SYSTEM.drawCloak(c, H.x, heroY, H.dir || 0);
      }

      // Vẽ hào quang buff đang active (pulse quanh nhân vật)
      if (R.buffs && Object.keys(R.buffs).length > 0) {
        const buffList = Object.values(R.buffs).filter(b => b.dur > 0);
        if (buffList.length > 0) {
          const t = Date.now() / 1000;
          buffList.forEach((b, i) => {
            const pulse = 0.35 + Math.sin(t * 2 + i * 1.2) * 0.2;
            const r = 22 + i * 6;
            c.globalAlpha = pulse;
            c.strokeStyle = b.col || '#38bdf8';
            c.lineWidth = 2;
            c.beginPath(); c.ellipse(H.x, H.y, r, r * 0.38, 0, 0, 7); c.stroke();
          });
          c.globalAlpha = 1;
        }
      }

      if (typeof drawMount === 'function') drawMount(c, dt);
      if (typeof drawAura === 'function') drawAura(c);
      if (typeof drawHeroStates === 'function') drawHeroStates(c, 'under', 0);

      let drawn = false;
      let dollH = 0;
      if (typeof drawHeroAnim === 'function') {
        const jh = drawHeroAnim(H.animKey, H.act || 'st', H.dir || 0, H.actT || 0, H.x, H.y, HERO_SCALE, R.deadT > 0 ? 0.45 : 1);
        if (jh > 0) {
          drawn = jh;
          dollH = jh;
        }
      }
      if (!drawn && typeof drawDoll === 'function') {
        const dollScale = (typeof HERO_DOLL_SCALE !== 'undefined') ? HERO_DOLL_SCALE : (1 / 0.6);
        // Khi cưỡi ngựa: đẩy paperdoll lên để ngồi trên yên (y-20),
        // thân trước ngựa (drawHorseForeground) vẽ sau sẽ tự che chân
        const drawY = (S && S.mounted) ? (H.y - 20 + mountBob) : heroY;
        dollH = drawDoll(c, H.x, drawY, H.act || 'st', H.dir || 0, H.actT || 0, dollScale, R.deadT > 0 ? 0.45 : 1, S);
        if (dollH > 0) drawn = dollH;
      }
      const mountedDrawY = (S && S.mounted) ? (H.y - 20 + mountBob) : heroY;
      if (!drawn && hw && hw.anim && typeof drawAnim === 'function') {
        drawn = drawAnim(hw.anim, H.act || 'st', H.dir || 0, H.actT || 0, H.x, mountedDrawY, HERO_SCALE);
      }
      if (!drawn && hw && typeof drawSprite === 'function' && typeof img === 'function') {
        drawn = drawSprite(img(hw.img), hw.sz, H.x, mountedDrawY, 0.9, H.face < 0, R.deadT > 0 ? 0.35 : 1);
      }
      if (!drawn) {
        c.fillStyle = (typeof SERIES_COL !== 'undefined' && typeof heroSeries === 'function') ? SERIES_COL[heroSeries()] : '#ffd700';
        c.beginPath();
        c.arc(H.x, mountedDrawY - 20, 14, 0, 7);
        c.fill();
        drawn = 30;
      }

      // Vẽ Ngoại Trang & Res Trang Bị trực quan (Vũ khí, Giáp, Khôi, Hào quang Thần Binh)
      if (typeof drawHeroEquipment === 'function' && typeof S !== 'undefined' && S && S.eq) {
        drawHeroEquipment(c, H.x, mountedDrawY, H.dir || 0, H.face || 1, H.act || 'st', H.actT || 0, S.eq, (typeof heroSeries === 'function' ? heroSeries() : 0));
      }

      // Vẽ các chi tiết phía trước của Chiến Mã (chỉ khi không dùng JX native sheet)
      if (!R.jx && S && S.mounted && typeof drawHorseForeground === 'function') {
        drawHorseForeground(c, H.x, H.y, H.dir || 0, H.act || 'st', H.actT || 0, S.mount);
      }
      if (typeof drawLookFx === 'function') drawLookFx(c, dt);
      if (typeof drawHeroStates === 'function') drawHeroStates(c, 'over', drawn || 50);

      if (R.hurtT > 0) { c.fillStyle = '#f004'; c.beginPath(); c.arc(H.x, heroY - 24, 20, 0, 7); c.fill(); }

      const heroLabelY = heroY - (drawn ? Math.min(drawn, 90) * 0.9 : 52) - 6;
      let heroBarCol = '#4fd04f';
      let heroTagPrefix = '';
      let heroTagCol = NAME_COL.hero;
      if (S.jailUntil && S.jailUntil > Date.now()) {
        heroBarCol = '#ef4444';
        heroTagPrefix = '[Thiên Lao] ';
        heroTagCol = '#ef4444';
      } else if (S.pkValue > 0) {
        if (S.pkMode === 'slaughter') {
          heroBarCol = '#ec4899';
          heroTagPrefix = `[Đồ sát · PK:${S.pkValue}] `;
          heroTagCol = '#f472b6';
        } else {
          heroBarCol = '#f59e0b';
          heroTagPrefix = `[PK:${S.pkValue}] `;
          heroTagCol = '#fbbf24';
        }
      } else if (S.pkMode === 'slaughter') {
        heroBarCol = '#ec4899'; // Hồng cánh sen Đồ Sát
        heroTagPrefix = '[Đồ sát] ';
        heroTagCol = '#f472b6';
      } else if (S.pkMode === 'pk') {
        heroBarCol = '#f59e0b'; // Vàng cam PK
        heroTagPrefix = '[PK] ';
        heroTagCol = '#fbbf24';
      }
      const heroMaxLife = (R.P && R.P.life) ? Math.max(1, R.P.life) : 100;
      label(H.x, heroLabelY, `${heroTagPrefix}${S.name || (FAC[S.fac] && FAC[S.fac].n) || ''} · Lv${S.lvl}`, heroTagCol, 12, R.life / heroMaxLife, heroBarCol);

      // Biển hiệu sạp hàng của bản thân (nếu đang bày bán)
      if (S.stall && S.stall.title) {
        const stallText = `🏪 [${S.stall.title}]`;
        c.font = 'bold 11px "IBM Plex Mono", sans-serif';
        const textW = c.measureText(stallText).width;
        const badgeW = textW + 16, badgeH = 20;
        const badgeX = H.x - badgeW / 2, badgeY = heroLabelY - 22;
        c.fillStyle = 'rgba(20, 15, 10, 0.9)';
        c.strokeStyle = '#eab308';
        c.lineWidth = 1.4;
        c.beginPath();
        if (c.roundRect) c.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
        else c.rect(badgeX, badgeY, badgeW, badgeH);
        c.fill();
        c.stroke();
        c.fillStyle = '#fef08a';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(stallText, H.x, badgeY + badgeH / 2);
      }
      continue;
    }
    const sc = e.cls === 'boss' ? 1.15 : e.cls === 'elite' ? 0.95 : 0.8;
    c.fillStyle = '#0007'; c.beginPath(); c.ellipse(e.x, e.y, e.r, e.r * 0.38, 0, 0, 7); c.fill();
    c.strokeStyle = SERIES_COL[e.series]; c.lineWidth = e.cls === 'normal' ? 1.2 : 2.4; c.beginPath(); c.ellipse(e.x, e.y, e.r, e.r * 0.38, 0, 0, 7); c.stroke();
    e.animKey = MON[e.tid].anim; stepAct(e, dt, e.moving ? 'run' : 'st');
    const ah = e.animKey && drawAnim(e.animKey, e.act || 'st', e.dir || 0, e.actT || 0, e.x, e.y, sc * MON_SCALE, e.hitT > 0 ? 0.75 : 1);
    if (!ah && !drawSprite(e.img, e.sz, e.x, e.y, sc, e.face < 0, e.hitT > 0 ? 0.6 : 1)) { c.fillStyle = SERIES_COL[e.series]; c.beginPath(); c.arc(e.x, e.y - e.r, e.r, 0, 7); c.fill(); }
    if (typeof drawEnemyCurses === 'function') drawEnemyCurses(c, e, sc);
    if (typeof drawEnemyState === 'function') drawEnemyState(c, e, ah, sc, dt);
    if (e.hitT > 0) e.hitT -= dt;
    const top = e.y - (ah ? Math.min(ah, 90) * 0.85 : e.img && e.img.naturalHeight ? e.img.naturalHeight * sc : e.r * 2) - 8;
    label(e.x, top, enemyName(e), e.goldBoss ? NAME_COL.gold : NAME_COL[e.cls] || NAME_COL.normal, e.cls === 'boss' ? 12 : 11, e.hp / e.max, e.cls === 'boss' ? '#ff5030' : '#e03a2a');
    if (e.poison > 0) { c.fillStyle = '#8fe34a'; c.fillRect(e.x - 22, top + 5, 44 * e.poison / 3, 2); }
  }
  // hieu ung
  R.fx = R.fx.filter(f => {
    if (f.k === 'spark') {
      f.life -= dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vy += 150 * dt; // gia toc roi nhe
      const a = clamp(f.life / f.max, 0, 1);
      c.globalAlpha = a;
      c.fillStyle = f.color;
      c.beginPath();
      c.arc(f.x, f.y, Math.max(0.6, f.size * a), 0, Math.PI * 2);
      c.fill();
      return f.life > 0;
    }
    if (f.k === 'jm') {
      const s = typeof jmStep === 'function' ? jmStep(f, dt) : false;
      if (s && typeof jmDraw === 'function') jmDraw(f);
      return s;
    }
    if (f.k !== 'mis' && f.k !== 'boom') return true;
    const ok = stepFx(f, dt);
    if (ok) drawFx(f);
    return ok;
  });
  if (R.fxQ && R.fxQ.length) {
    for (const t of R.fxQ) R.fx.push(t);
    R.fxQ.length = 0;
  }
  for (const f of R.fx) {
    if (f.k === 'mis' || f.k === 'boom' || f.k === 'jm' || f.k === 'spark') continue;
    f.life -= dt; const a = clamp(f.life / f.max, 0, 1);
    c.globalAlpha = a; c.strokeStyle = f.color;
    if (f.k === 'line') { c.lineWidth = 3; c.beginPath(); c.moveTo(f.x1, f.y1); c.lineTo(f.x2, f.y2); c.stroke(); }
    else { c.lineWidth = 2; c.beginPath(); c.arc(f.x, f.y - 10, 8 + (1 - a) * 30, 0, 7); c.stroke(); }
  }
  c.globalAlpha = 1; R.fx = R.fx.filter(f => f.life > 0);
  c.textAlign = 'center';
  flushLabels();                                                            // ten + thanh mau tren dau (chong chong nhau)
  if (typeof drawOtherPlayerSpeechBubbles === 'function') drawOtherPlayerSpeechBubbles(c); // bong bong chat nguoi choi khac
  for (const t of R.txt) { t.life -= dt; t.y -= 32 * dt; c.globalAlpha = clamp(t.life / 0.5, 0, 1); c.font = `${t.size}px "IBM Plex Mono", monospace`; c.fillStyle = '#000'; c.fillText(t.t, t.x + 1, t.y + 1); c.fillStyle = t.color; c.fillText(t.t, t.x, t.y); }
  c.globalAlpha = 1; R.txt = R.txt.filter(t => t.life > 0);
  c.setTransform(DPR, 0, 0, DPR, 0, 0);                                     // lop giao dien: toa do man hinh
  if (typeof drawJoystick === 'function') drawJoystick(c);
  // HUD buff icons: hiện buff đang active (góc trên trái, cạnh icon HP/MP)
  if (R.buffs) {
    const buffList = Object.entries(R.buffs).filter(([, b]) => b.dur > 0);
    if (buffList.length > 0) {
      const bx0 = 8, by0 = AR.top + 4, bsz = 22, bpad = 4;
      buffList.forEach(([, b], i) => {
        const bx = bx0 + i * (bsz + bpad);
        const dur = Math.max(0, b.dur), maxDur = 30;
        const frac = dur / maxDur;
        // Nền ô
        c.globalAlpha = 0.82;
        c.fillStyle = '#0a0806cc';
        c.strokeStyle = b.col || '#38bdf8';
        c.lineWidth = 1.5;
        c.beginPath();
        if (c.roundRect) c.roundRect(bx, by0, bsz, bsz, 4);
        else c.rect(bx, by0, bsz, bsz);
        c.fill(); c.stroke();
        // Vòng đếm ngược buff
        const cx = bx + bsz / 2, cy = by0 + bsz / 2, r = bsz / 2 - 2;
        c.globalAlpha = 0.55;
        c.fillStyle = (b.col || '#38bdf8') + '44';
        c.beginPath(); c.moveTo(cx, cy);
        c.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); c.closePath(); c.fill();
        // Tên buff ngắn
        c.globalAlpha = 1;
        c.font = '6px "IBM Plex Mono", monospace';
        c.fillStyle = b.col || '#38bdf8';
        c.textAlign = 'center';
        const shortName = (b.name || '').slice(0, 4);
        c.fillText(shortName, cx, by0 + bsz - 4);
        // Thời gian còn
        if (dur > 0) {
          c.font = 'bold 7px "IBM Plex Mono", monospace';
          c.fillStyle = '#fff';
          c.fillText(Math.ceil(dur) + 's', cx, by0 + bsz / 2 + 2);
        }
      });
      c.globalAlpha = 1;
    }
  }
  drawMinimap(c);
  if (R.banner && R.banner.t > 0) {
    R.banner.t -= dt;
    c.globalAlpha = clamp(R.banner.t, 0, 1);
    c.font = 'bold 15px "IBM Plex Mono", monospace';
    const tw = Math.max(c.measureText(R.banner.text).width, R.banner.sub ? c.measureText(R.banner.sub).width : 0);
    const bw = Math.min(Math.max(tw + 48, 180), AR.w - 32);
    const bh = R.banner.sub ? 52 : 36;
    const bx = (AR.w - bw) / 2, by = AR.h * 0.35;

    // Dark radial/linear background with gold border
    const bgGrad = c.createLinearGradient(bx, by, bx, by + bh);
    bgGrad.addColorStop(0, '#2b1f13ee');
    bgGrad.addColorStop(0.5, '#15100cee');
    bgGrad.addColorStop(1, '#0a0806fa');
    c.fillStyle = bgGrad;
    c.beginPath();
    c.roundRect(bx, by, bw, bh, 8);
    c.fill();

    // Outer & inner gold stroke
    c.strokeStyle = '#c89b3c';
    c.lineWidth = 1.8;
    c.stroke();
    c.strokeStyle = '#5a4425';
    c.lineWidth = 1;
    c.strokeRect(bx + 3, by + 3, bw - 6, bh - 6);

    // Decorative corner dots
    c.fillStyle = '#ffd700';
    c.beginPath();
    c.arc(bx + 8, by + bh / 2, 2.5, 0, 7);
    c.arc(bx + bw - 8, by + bh / 2, 2.5, 0, 7);
    c.fill();

    // Text rendering
    c.textAlign = 'center';
    c.shadowColor = '#000000';
    c.shadowBlur = 4;
    c.fillStyle = '#ffd700';
    c.fillText(R.banner.text, AR.w / 2, by + (R.banner.sub ? 23 : 23));
    if (R.banner.sub) {
      c.font = '11px "IBM Plex Mono", monospace';
      c.fillStyle = '#e2d5b5';
      c.fillText(R.banner.sub, AR.w / 2, by + 41);
    }
    c.shadowBlur = 0;
    c.globalAlpha = 1;
  }
}
