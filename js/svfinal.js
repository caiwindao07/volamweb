"use strict";
/* Luyện công: Trùm Hoàng Kim cuối ván.
   - Phút thứ 9 (hoặc sớm hơn nếu đã hạ đủ 4 trùm), mọi quái con tan biến, trùm Hoàng Kim xuất hiện.
   - Trùm mạnh gấp nhiều lần trùm thường: máu ×3,5, sát thương ×2, đòn dậm chân báo trước 1,1 giây.
   - Hạ được: chọn 1 món đồ Cực phẩm (6 dòng, mỗi dòng đạt giá trị tối đa) HOẶC +50% EXP mọi bản đồ trong 30 phút.
   - Tối đa 3 lần nhận thưởng mỗi ngày; hết lượt thì ván chơi như cũ (không có trùm). */

const SV_FB_T = 540;          // giây: mốc cố định nếu chưa hạ đủ 4 trùm
const SV_FB_WARN = 8;         // báo trước (giây)
const SV_FB_HP = 3.5, SV_FB_DMG = 2, SV_FB_SPD = 50;
const SV_FB_DAY = 3;          // số lần nhận thưởng mỗi ngày
const SV_FB_WAVE = { every: 4.5, tele: 1.1, r: 150, pct: .3 };   // dậm chân: 30% máu tối đa nếu đứng trong vòng
const SV_FB_XP50_MIN = 30;

if (typeof SV_HIT_CAP !== "undefined") SV_HIT_CAP.final = .45;       // trần sát thương mỗi đòn của trùm cuối (trùm thường 30%)

function svGbState() {
  const r = RW(), d = today();
  if (!r.svGb || r.svGb.d !== d) r.svGb = { d: d, n: 0 };
  return r.svGb;
}

// Gọi cuối svStart.
function svFbInit() {
  const g = svGbState();
  SV.fb = null; SV.fbOn = false; SV.fbDone = false; SV.fbWarn = false; SV.fbAt = 0; SV.fbMsg = "";
  SV.fbOk = g.n < SV_FB_DAY;
  log(SV.fbOk
    ? `Trùm Hoàng Kim cuối ván: còn <b>${SV_FB_DAY - g.n}/${SV_FB_DAY}</b> lượt thưởng hôm nay.`
    : `<span class="dim">Hôm nay đã nhận đủ ${SV_FB_DAY} lần thưởng Trùm Hoàng Kim, ván này không có trùm cuối.</span>`);
}

function svFbStart() {
  SV.fbDone = true; SV.fbOn = true;
  const cleared = SV.en.length;
  for (let i = 0; i < Math.min(cleared, 40); i++) burst(SV.en[i].x, SV.en[i].y, "#ffd24a");
  SV.spawned = Math.max(0, (SV.spawned || 0) - cleared);   // quái tan biến không bị tính là bỏ sót khi quy đổi thưởng
  SV.en = [];
  const e = svSpawn("boss");
  { const a = rnd(0, Math.PI * 2); [e.x, e.y] = svFree(H.x + Math.cos(a) * 330, H.y + Math.sin(a) * 330) }   // xuất hiện gần để kịp giao chiến trong 60 giây
  e.final = true;
  e.n = "Trùm Hoàng Kim · " + e.n;
  e.hp = e.max = e.hp * SV_FB_HP;
  e.dmg *= SV_FB_DMG;
  e.spd = SV_FB_SPD;
  e.r *= 1.3;
  SV.fb = { e: e, waveT: 3, wave: null };
  SV.shake = .8;
  R.banner = { t: 3, text: "Trùm Hoàng Kim xuất hiện!", sub: "Hạ trùm trước khi hết giờ" };
  log(`<b class="boss">${esc(e.n)}</b> xuất hiện! Quái con đã tan biến.`);
}

// Gọi mỗi nhịp svTick.
function svFbTick(dt) {
  if (!SV.fbOk) return;
  if (!SV.fbOn) {
    if (SV.fbDone) return;
    if (!SV.fbAt && SV.bossKills >= SV_BOSS_T.length) SV.fbAt = Math.min(SV_FB_T, SV.t + SV_FB_WARN + 2);   // hạ đủ 4 trùm thì trùm cuối đến sớm
    const at = SV.fbAt || SV_FB_T;
    if (!SV.fbWarn && SV.t >= at - SV_FB_WARN) {
      SV.fbWarn = true;
      R.banner = { t: 2.6, text: "Trùm Hoàng Kim sắp xuất hiện", sub: "Quái con sắp tan biến, chuẩn bị chiến đấu" };
    }
    if (SV.t >= at) svFbStart();
    return;
  }
  const fb = SV.fb;
  if (!fb || fb.e.hp <= 0) return;
  fb.waveT -= dt;
  if (!fb.wave && fb.waveT <= 0) { fb.wave = { x: H.x, y: H.y, t: SV_FB_WAVE.tele }; fb.waveT = SV_FB_WAVE.every }
  if (fb.wave) {
    fb.wave.t -= dt;
    if (fb.wave.t <= 0) {
      const w = fb.wave; fb.wave = null;
      SV.shake = .4; burst(w.x, w.y, "#ff4a3a");
      if (Math.hypot(H.x - w.x, H.y - w.y) < SV_FB_WAVE.r + 10) {
        SV.hp -= SV.maxhp * SV_FB_WAVE.pct * (1 - Math.min(.6, R.P.absorb || 0));
        SV.hurtT = .3;
      }
    }
  }
}

/* ---- Phần thưởng ---- */
function maximumMagicLines(it, count = 6) {
  const level = clamp(it.lvl + 1, 1, 10);
  const candidates = J.affix.filter(a => (a.s < 0 || a.s === it.s) && a.lvl <= level &&
    (a.w[it.d] || 0) > 0 && !(typeof DEAD_AFFIX !== "undefined" && DEAD_AFFIX.has(canonAttr(attrName(a.a)))));
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const used = new Set(), lines = [];
  let visits = 0;
  function search(index) {
    if (index === count) return true;
    if (++visits > 10000) return false;
    const pre = index % 2 === 0 ? 1 : 0;
    for (const row of candidates) {
      if (row.pre !== pre || used.has(row.a)) continue;
      used.add(row.a);
      lines.push({ a: row.a, n: row.n, pre, p: row.p.map(([mn, mx]) =>
        mn === -1 && mx === -1 ? -1 : Math.abs(mx) >= Math.abs(mn) ? mx : mn) });
      if (search(index + 1)) return true;
      lines.pop(); used.delete(row.a);
    }
    return false;
  }
  return search(0) ? lines : null;
}

function svCpItem() {
  const f = FAC[S.fac], tier = clamp(Math.round(S.lvl / 12) + 2, 1, 10);
  let it = null;
  for (let t = 0; t < 16 && !it; t++) {
    let d = irnd(0, 9), part = 0;
    if (Math.random() < .35 && f && f.wcode >= 0) [d, part] = f.wcode === 7 ? [1, irnd(0, 2)] : [0, f.wcode === 9 ? 6 : f.wcode];
    part = sexPart(d, part);
    const row = baseRow(d, part, tier);
    if (!row || !sexReqOk(row.req)) continue;
    DROP_BOSS = true;                        // may mắn ×2 như trùm thường
    try { it = makeItem(d, part, tier, 6) } finally { DROP_BOSS = false }
    if (it && !sexOk(it)) it = null;
    if (it) {
      const lines = maximumMagicLines(it);
      if (lines) it.mag = lines;
      else it = null; // never advertise a shorter roll as a six-line reward
    }
  }
  if (!it) return null;
  for (const m of it.mag) {                  // mỗi dòng đạt giá trị tối đa của thuộc tính
    const row = J.affix.find(x => x.a === m.a && x.n === m.n);
    if (row) m.p = row.p.map(([mn, mx]) => mn === -1 && mx === -1 ? -1 : (Math.abs(mx) >= Math.abs(mn) ? mx : mn));
  }
  it.cpx = 1;
  return it;
}

function svFbKill(e) {
  burst(e.x, e.y, "#ffd24a");
  SV.fbOn = false; SV.choosing = true; INPUT.active = false;
  const g = svGbState();
  modal(`<h3>Hạ Trùm Hoàng Kim!</h3><p class="desc">Chọn một phần thưởng (lượt thưởng hôm nay: ${g.n + 1}/${SV_FB_DAY}).</p>
    <div class="card"><b>A · Cực phẩm</b><br><small>1 món trang bị 6 dòng thuộc tính, mỗi dòng đạt giá trị tối đa.</small>
      <div class="btnrow"><button class="btn" id="fbA">Nhận đồ Cực phẩm</button></div></div>
    <div class="card"><b>B · Tu luyện</b><br><small>+50% EXP trên mọi bản đồ trong ${SV_FB_XP50_MIN} phút.</small>
      <div class="btnrow"><button class="btn" id="fbB">Nhận +50% EXP</button></div></div>`, () => {
    const done = msg => {
      g.n++; SV.fbMsg = msg; SV.choosing = false; R.dirty = true; save();
      svEnd(true);
    };
    document.getElementById("fbA").onclick = () => {
      const it = svCpItem();
      if (!it) { toast("Không tạo được đồ, chọn phần thưởng khác"); return }
      addItem(it, true, true, true);
      log(`<b style="color:${RAR_COL[it.r]}">✦ Cực phẩm</b>: ${esc(it.n)} (6 dòng, giá trị tối đa)`);
      done(`<b>Cực phẩm</b>: <b style="color:${RAR_COL[it.r]}">${esc(it.n)}</b> với 6 dòng thuộc tính tối đa, đã vào túi.`);
    };
    document.getElementById("fbB").onclick = () => {
      RW().xp50 = Date.now() + SV_FB_XP50_MIN * 60e3;
      log(`<i class="ji ji-gift"></i>Tu luyện: +50% EXP trên mọi bản đồ trong ${SV_FB_XP50_MIN} phút.`);
      done(`<b>Tu luyện</b>: +50% EXP trên mọi bản đồ trong ${SV_FB_XP50_MIN} phút.`);
    };
  }, true);
}

/* ---- Vẽ: vòng báo đòn dậm chân và thanh máu trùm ---- */
const _svDraw = svDraw;
svDraw = function (dt) {
  _svDraw(dt);
  const fb = SV.fb;
  if (!SV.on || !SV.fbOn || !fb || fb.e.hp <= 0) return;
  const c = CX;
  if (fb.wave) {
    const p = 1 - fb.wave.t / SV_FB_WAVE.tele;
    c.setTransform(DPR, 0, 0, DPR, -Math.round(CAM.x) * DPR, -Math.round(CAM.y) * DPR);
    c.fillStyle = `rgba(255,60,40,${.12 + .22 * p})`;
    c.beginPath(); c.arc(fb.wave.x, fb.wave.y, SV_FB_WAVE.r, 0, 7); c.fill();
    c.strokeStyle = "#ff5a3a"; c.lineWidth = 2;
    c.beginPath(); c.arc(fb.wave.x, fb.wave.y, SV_FB_WAVE.r, 0, 7); c.stroke();
    c.strokeStyle = "#ffd24a";
    c.beginPath(); c.arc(fb.wave.x, fb.wave.y, SV_FB_WAVE.r * p, 0, 7); c.stroke();
  }
  c.setTransform(DPR, 0, 0, DPR, 0, 0);
  const bar = document.getElementById("svBar"), cvr = CV.getBoundingClientRect(), by = bar && !bar.classList.contains("hidden") ? bar.getBoundingClientRect().bottom - cvr.top + 16 : 64;
  const w = Math.min(AR.w - 40, 320), x = (AR.w - w) / 2, y = Math.max(64, by), e = fb.e, hp = Math.max(0, e.hp / e.max);
  c.fillStyle = "#000b"; c.fillRect(x - 2, y - 2, w + 4, 12);
  c.fillStyle = "#ffb020"; c.fillRect(x, y, w * hp, 8);
  c.strokeStyle = "#ffe49a"; c.lineWidth = 1; c.strokeRect(x - 2, y - 2, w + 4, 12);
  c.font = '12px "Noto Sans", sans-serif'; c.textAlign = "center"; c.lineWidth = 3; c.strokeStyle = "#000c";
  c.strokeText(e.n + `  ${Math.ceil(hp * 100)}%  ·  còn ${Math.max(0, Math.ceil(SV_DUR - SV.t))} giây`, AR.w / 2, y - 6);
  c.fillStyle = "#ffe49a"; c.fillText(e.n + `  ${Math.ceil(hp * 100)}%  ·  còn ${Math.max(0, Math.ceil(SV_DUR - SV.t))} giây`, AR.w / 2, y - 6);
};
