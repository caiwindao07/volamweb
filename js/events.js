"use strict";
/* Cập nhật 2026-10-07: sự kiện Ngũ Hành Tương Sinh, Lệnh bài Triệu hồi, Lò rèn, thông cáo cập nhật.
   Dữ liệu lưu trong RW() (S.rw): nh = sự kiện, sm = lệnh bài Triệu hồi. */

/* ---------- Lệnh bài Triệu hồi: x3 số quái trong 30 phút ---------- */
const SUMMON_P = .0005;           // 0,05% mỗi quái đủ điều kiện (1/2000)
const SUMMON_MAX = 5;             // giữ tối đa 5 lệnh bài
const SUMMON_MIN = 30, SUMMON_CAP_MIN = 60;   // mỗi lần dùng +30 phút, cộng dồn tối đa 60 phút
const SUMMON_MUL = 3;

function smState() { const r = RW(), s = r.sm || (r.sm = { n: 0, rem: 0 }); s.n = Math.max(0, s.n | 0); s.rem = Math.max(0, +s.rem || 0); return s }
// Chỉ nhân quái ở đường cày thường (tháp, Tống Kim, công thành đã có đợt quái riêng nên không qua spawnWave).
const smMul = () => (S && S.fac && S.rw && S.rw.sm && S.rw.sm.rem > 0 ? SUMMON_MUL : 1);
const smFarmPath = () => !R.tower && !R.tk && !S.siege && !R.town && !(typeof SV !== "undefined" && SV.on);

function smDrop(e) {
  const s = smState();
  if (s.rem > 0 || s.n >= SUMMON_MAX || !smFarmPath() || Math.random() >= SUMMON_P) return;
  s.n++;
  R.dirty = true;
  if (typeof addText === "function") addText(e.x, e.y - 64, "+1 Lệnh bài Triệu hồi", "#ff9a5a", 12);
  log(`<i class="ji ji-gift"></i>Nhặt được <b>Lệnh bài Triệu hồi</b> (${s.n}/${SUMMON_MAX}). Dùng ở cột nút bên phải.`);
  smRefresh();
}

function smUse() {
  const s = smState();
  if (s.n <= 0) { toast("Không có Lệnh bài Triệu hồi"); return }
  if (s.rem >= SUMMON_CAP_MIN * 60 - 1) { toast(`Đã đạt tối đa ${SUMMON_CAP_MIN} phút`); return }
  s.n--;
  s.rem = Math.min(SUMMON_CAP_MIN * 60, s.rem + SUMMON_MIN * 60);
  R.dirty = true;
  uiSfx("learn");
  toast(`Triệu hồi: số quái ×${SUMMON_MUL} trong ${Math.ceil(s.rem / 60)} phút`);
  log(`<i class="ji ji-gift"></i>Dùng Lệnh bài Triệu hồi: số quái mỗi đợt ×${SUMMON_MUL} (còn ${Math.ceil(s.rem / 60)} phút).`);
  save();
  smRefresh();
}

const fmtClock = sec => { sec = Math.max(0, Math.ceil(sec)); return String(Math.floor(sec / 60)).padStart(2, "0") + ":" + String(sec % 60).padStart(2, "0") };

let smShown = null;
function smRefresh() {
  const b = document.getElementById("jxSummon");
  if (!b || !S || !S.fac) return;
  const s = smState(), show = s.n > 0 || s.rem > 0;
  const lbl = b.querySelector(".sk");
  const txt = s.rem > 0 ? `×${SUMMON_MUL} ${fmtClock(s.rem)}` : `Triệu ×${s.n}`;
  if (lbl && lbl.textContent !== txt) lbl.textContent = txt;
  b.classList.toggle("on", s.rem > 0);
  b.title = s.rem > 0 ? `Đang x${SUMMON_MUL} số quái. Bấm để cộng thêm ${SUMMON_MIN} phút (còn ${s.n} lệnh bài)` : `Dùng 1 Lệnh bài Triệu hồi: x${SUMMON_MUL} số quái trong ${SUMMON_MIN} phút (có ${s.n})`;
  if (show !== smShown) {
    smShown = show;
    b.classList.toggle("hidden", !show);
    if (typeof jxLayout === "function") jxLayout();
  }
}

/* ---------- Sự kiện Ngũ Hành Tương Sinh (tháng 9–10) ---------- */
const NH_SERIES = ["Kim", "Mộc", "Thủy", "Hỏa", "Thổ"];
const NH_DROP_P = .03;                    // mỗi quái thường 3%, boss chắc chắn 1 đèn
const NH_RABBIT_SEC = 20 * 60;            // khoảng 20 phút cày thì Thỏ Ngọc xuất hiện
const NH_CAKE_MIN = 15;                   // ăn Bánh Trung Thu: +EXP 15 phút (cơ chế xpb có sẵn)
const NH_MILESTONES = [
  [10, { ht: 2, gold: 600 }, "10 đèn kéo quân"],
  [30, { fd: 30, gold: 2000 }, "30 đèn kéo quân"],
  [60, { ht: 3, fd: 50 }, "60 đèn kéo quân"],
  [100, { fd: 100, set: 1 }, "100 đèn kéo quân"],
];
const NH_LAMP_TABLE = [[35, { gold: 800 }], [20, { pot: { kind: "life", tier: 3, n: 5 } }], [15, { pot: { kind: "mana", tier: 3, n: 5 } }],
  [12, { item: 4 }], [8, { item: 6 }], [6, { pts: 3 }], [3, { fd: 20 }], [1, { ht: 2 }]];

const nhOn = () => !!(typeof eventNow === "function" && eventNow().nh);
function nhState() {
  const r = RW(), n = r.nh || (r.nh = {});
  if (!Array.isArray(n.lamp) || n.lamp.length !== 5) n.lamp = [0, 0, 0, 0, 0];
  n.kq = n.kq | 0; n.made = n.made | 0; n.ms = n.ms || {}; n.rabbitT = +n.rabbitT || 0; n.rabbitDue = !!n.rabbitDue; n.opened = n.opened | 0;
  return n;
}

function nhMerge() {
  const n = nhState();
  while (n.lamp.every(v => v >= 1)) {
    for (let i = 0; i < 5; i++) n.lamp[i]--;
    n.kq++; n.made++;
    log(`<i class="ji ji-gift"></i>Đủ năm hệ: ghép được <b style="color:#ffd24a">Đèn Kéo Quân</b> (tổng ${n.made}).`);
    for (const [need, g, name] of NH_MILESTONES)
      if (n.made >= need && !n.ms[need]) { n.ms[need] = 1; grant(g, "Ngũ Hành Tương Sinh · mốc " + name) }
  }
  R.dirty = true;
}

function nhDrop(e) {
  if (!nhOn() || !smFarmPath()) return;
  const n = nhState(), s = e.series;
  if (!(s >= 0 && s <= 4)) return;
  if (e.cls === "boss" || Math.random() < NH_DROP_P) {
    n.lamp[s]++;
    if (typeof addText === "function") addText(e.x, e.y - 50, `+1 Đèn ${NH_SERIES[s]}`, SERIES_COL[s], 11);
    nhMerge();
  }
  if (e.rabbit) {
    grant({ xpb: NH_CAKE_MIN }, "Thỏ Ngọc để lại Bánh Trung Thu");
    n.rabbitT = 0; n.rabbitDue = false;
  }
}

// Gọi cuối spawnWave: đến hẹn thì thêm Thỏ Ngọc vào đợt quái.
function nhRabbitSpawn(pickPos) {
  if (!nhOn() || !smFarmPath()) return;
  const n = nhState();
  if (!n.rabbitDue || !R.enemies.length) return;
  const base = R.enemies[0], p = pickPos();
  const e = makeEnemy(base.tid, base.L, "normal", p[0], p[1]);
  e.rabbit = true; e.n = "Thỏ Ngọc"; e.hp = e.max = e.max * 3; e.dmg *= .5;
  R.enemies.push(e);
  log(`<b style="color:#ffd24a">Thỏ Ngọc</b> chạy lẫn vào đợt quái! Hạ nó để nhận Bánh Trung Thu.`);
  n.rabbitDue = false;
}

function nhOpen(all) {
  const n = nhState();
  if (n.kq <= 0) { toast("Chưa có Đèn Kéo Quân"); return }
  const times = all ? n.kq : 1, got = [];
  for (let i = 0; i < times; i++) { n.kq--; n.opened++; got.push(...grant(wpick(NH_LAMP_TABLE, x => x[0])[1], "Đèn Kéo Quân")) }
  R.dirty = true; save();
  toast("Đèn Kéo Quân: " + got.join(", ").replace(/<[^>]+>/g, "").slice(0, 120));
  refreshGift();
}

function nhBody() {
  const n = nhState(), ev = eventNow();
  const lamps = NH_SERIES.map((nm, i) => `<span class="nhlamp" style="--c:${SERIES_COL[i]}"><i></i>${nm} <b>${n.lamp[i]}</b></span>`).join("");
  const ms = NH_MILESTONES.map(([need, g, name]) => `<div class="qrow"><span>${giftText(g)}</span><small>${n.made}/${need} ${name}</small><button class="btn sm" disabled>${n.ms[need] ? "Đã nhận" : "Chưa đủ"}</button></div>`).join("");
  const mins = Math.max(0, Math.ceil((NH_RABBIT_SEC - n.rabbitT) / 60));
  const legacy = RW().stat.tokens > 0 ? `<h3>Bánh Trung Thu cũ <small>${RW().stat.tokens}</small></h3>${EVENT_SHOP.map(([c, g], i) => `<div class="qrow"><span>${giftText(g)}</span><small>${c} bánh</small><button class="btn sm" data-e="${i}" ${RW().stat.tokens >= c ? "" : "disabled"}>Đổi</button></div>`).join("")}` : "";
  return `<p class="desc">Sự kiện <b style="color:${ev.col}">${ev.n}</b>. Quái rơi <b>Đèn Ngũ Hành</b> đúng hệ của nó (${Math.round(NH_DROP_P * 100)}%, boss chắc chắn rơi). Đủ <b>5 hệ</b> Kim, Mộc, Thủy, Hỏa, Thổ tự ghép thành <b>Đèn Kéo Quân</b>.</p>
    <div class="nhlamps">${lamps}</div>
    <div class="card lootf"><div class="row">Đèn Kéo Quân đang có <b>${n.kq}</b></div><div class="row">Đã ghép <b>${n.made}</b> · đã mở <b>${n.opened}</b></div>
      <div class="btnrow"><button class="btn" id="gNhOpen" ${n.kq ? "" : "disabled"}>Mở 1 đèn</button><button class="btn" id="gNhOpenAll" ${n.kq > 1 ? "" : "disabled"}>Mở tất cả</button></div></div>
    <h3>Mốc ghép đèn</h3>${ms}
    <p class="desc">Thỏ Ngọc: cứ khoảng 20 phút cày, một con Thỏ Ngọc chạy lẫn vào đợt quái (${n.rabbitDue ? "sắp xuất hiện" : "còn khoảng " + mins + " phút"}). Hạ nó nhận Bánh Trung Thu: +${Math.round(XPB_PCT * 100)}% EXP trong ${NH_CAKE_MIN} phút.</p>${legacy}`;
}

/* ---------- Nhịp 1 giây: lệnh bài + đồng hồ Thỏ Ngọc (tính theo thời gian thực, không theo tốc độ game) ---------- */
let lastTick = Date.now();
setInterval(() => {
  const now = Date.now(), dt = Math.min(60, Math.max(0, (now - lastTick) / 1000));
  lastTick = now;
  if (!S || !S.fac) return;
  const s = smState();
  if (s.rem > 0 && !R.town) { const was = s.rem; s.rem = Math.max(0, s.rem - dt); R.dirty = true; if (was > 0 && s.rem === 0) { log(`<span class="dim">Lệnh bài Triệu hồi hết hiệu lực.</span>`); toast("Hết hiệu lực Triệu hồi") } }
  if (nhOn() && smFarmPath()) { const n = nhState(); if (!n.rabbitDue) { n.rabbitT += dt; if (n.rabbitT >= NH_RABBIT_SEC) n.rabbitDue = true } }
  smRefresh();
}, 1000);

/* ---------- Lò rèn: icon ngoài màn hình (ẩn ở Công Thành Chiến) ---------- */
const forgeHidden = () => !S || !S.fac || S.mode === "ctc";
function forgeRefresh() {
  const b = document.getElementById("jxForge");
  if (!b) return;
  const hide = forgeHidden();
  if (b.classList.contains("hidden") !== hide) { b.classList.toggle("hidden", hide); if (typeof jxLayout === "function") jxLayout() }
}

let fhubItems = [];
function forgeHub() {
  if (forgeHidden()) return;
  const rows = [];
  for (const [slot, it] of Object.entries(S.eq || {})) if (it) rows.push({ it, tag: "Đang mặc" });
  const best = (S.inv || []).filter(it => it && it.base && !(it.enh >= ENH_MAX)).sort((a, b) => itemPower(b) - itemPower(a)).slice(0, 8);
  for (const it of best) rows.push({ it, tag: "Trong túi" });
  fhubItems = rows.map(r => r.it);
  const html = rows.length ? rows.map((r, i) => `<div class="qrow"><span>${esc(r.it.n)}</span><small>${r.tag} · +${r.it.enh || 0}/${ENH_MAX}</small><button class="btn sm" data-fi="${i}">Rèn</button></div>`).join("") : `<p class="desc">Chưa có trang bị để rèn.</p>`;
  modal(`<h3>Lò rèn <small>${fmt(S.gold)} lượng</small></h3><p class="desc">Chọn món cần cường hóa, tẩy luyện hoặc khảm. Đồ đang mặc nằm trước, sau đó là các món mạnh nhất trong túi.</p>${html}<div class="btnrow"><button class="btn" id="fhClose">Đóng</button></div>`, () => {
    document.querySelectorAll("#mBody [data-fi]").forEach(b => b.onclick = () => { const it = fhubItems[+b.dataset.fi]; if (it) forgeModal(it) });
    const c = document.getElementById("fhClose"); if (c) c.onclick = () => closeModal();
  });
}

/* ---------- Thông cáo cập nhật (hiện một lần cho mỗi phiên bản) ---------- */
const UPDATE_VER = "2026-10-07b";
const UPDATE_NOTES = [
  ["Luyện công: Trùm Hoàng Kim cuối ván", "Đến phút thứ 9 (sớm hơn nếu đã hạ đủ 4 trùm), mọi quái con tan biến và Trùm Hoàng Kim xuất hiện: máu gấp 3,5 lần trùm thường, sát thương gấp đôi, có đòn dậm chân báo trước. Hạ được thì chọn 1 trong 2: một món đồ Cực phẩm (6 dòng, mỗi dòng đạt giá trị tối đa) hoặc +50% EXP trên mọi bản đồ trong 30 phút. Tối đa 3 lần nhận thưởng mỗi ngày."],
  ["Sự kiện Ngũ Hành Tương Sinh (tháng 9–10)", "Thay cho sự kiện Bánh Trung Thu. Quái rơi Đèn Ngũ Hành đúng hệ của nó; đủ Kim, Mộc, Thủy, Hỏa, Thổ sẽ tự ghép thành Đèn Kéo Quân để mở quà và nhận thưởng theo mốc. Cứ khoảng 20 phút cày có Thỏ Ngọc xuất hiện, hạ nó nhận Bánh Trung Thu tăng EXP 15 phút. Xem ở Quà › Sự kiện."],
  ["Lệnh bài Triệu hồi", "Quái ở mọi bản đồ cày có 0,5% rơi Lệnh bài Triệu hồi. Dùng một lệnh bài: số quái mỗi đợt ×3 trong 30 phút (dùng thêm cộng dồn, tối đa 60 phút, giữ tối đa 5 lệnh bài). Không tác dụng ở Tháp, Tống Kim, công thành và đợt trùm. Áp dụng cho mọi chế độ."],
  ["Lò rèn ở ngoài màn hình", "Nút Rèn mới ở cột bên phải, bấm để chọn nhanh món đồ cần rèn. Chế độ Công Thành Chiến không có nút này, vẫn rèn được trong Hành trang."],
  ["Chế độ Công Thành Chiến", "Dấu chế độ không phải xác minh online. Từ cấp 40 vào bậc xếp hạng; đăng ký Online để đồng bộ. Hiện chưa có luồng giao chiến PvP."],
  ["Hiển thị và hiệu năng", "Sửa lỗi nhân vật không hiện đúng sprite, ra chiêu mượt hơn, thêm icon ngũ hành và màu tên quái, trùm rơi đồ xịn gấp đôi, tải trò chơi nhanh hơn."],
];
function updateNotice() {
  if (!S || !S.fac || !S.tut) return;
  let seen = ""; try { seen = localStorage.getItem("jx_update_seen") || "" } catch (e) { }
  if (seen === UPDATE_VER || !document.getElementById("modal").classList.contains("hidden")) return;
  modal(`<h3>Thông cáo cập nhật <small>${UPDATE_VER}</small></h3>${UPDATE_NOTES.map(([t, d]) => `<div class="card"><b>${esc(t)}</b><br><small>${esc(d)}</small></div>`).join("")}<div class="btnrow"><button class="btn" id="bUpd">Đã hiểu</button></div>`, () => {
    document.getElementById("bUpd").onclick = () => { try { localStorage.setItem("jx_update_seen", UPDATE_VER) } catch (e) { } closeModal() };
  });
}
setInterval(updateNotice, 4000);
setInterval(forgeRefresh, 1500);
window.addEventListener("load", () => {
  const f = document.getElementById("jxForge"), s = document.getElementById("jxSummon");
  if (f) f.onclick = forgeHub;
  if (s) s.onclick = smUse;
  forgeRefresh(); smRefresh();
});
