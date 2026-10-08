/* ======================= REN DO: CUONG HOA + TAY LUYEN (cho tieu ngan luong lau dai) =======================
   Cuong hoa +1..+10: moi cap +8% thuoc tinh goc (ENH_STEP, core.js). Gia tang x1.8 moi cap va theo cap nhan vat,
   ti le thanh cong giam dan (thap nhat 35%); that bai chi mat ngan luong, khong vo do.
   Tay luyen: gieo lai toan bo dong thuoc tinh ma thuat (dung luat magicattrib.txt: he, loai do, tien / hau to);
   do Hoang Kim / Bach Kim co dong co dinh nen khong tay luyen duoc. */
'use strict';
const enhCost = it => Math.round((1000 + it.lvl * 1000 + (it.r || 0) * 2000) * Math.pow(1.8, it.enh || 0) * (1 + S.lvl / 10));
const enhChance = it => Math.max(0.35, 1 - 0.07 * (it.enh || 0));
const rerollCost = it => Math.round((500 + it.lvl * 400) * (1 + (it.mag || []).length * 0.5) * (1 + S.lvl / 15));
const canReroll = it => !it.set && !it.vio && (it.mag || []).length > 0;
function payGold(c) { if (S.gold < c) { toast('Không đủ ngân lượng'); return false; } S.gold -= c; return true; }
function enhance(it) {
  if (!owned(it)) { closeModal(); return; }
  if ((it.enh || 0) >= ENH_MAX || !payGold(enhCost(it))) return;
  if (Math.random() < enhChance(it)) { it.enh = (it.enh || 0) + 1; toast(`Cường hóa thành công: +${it.enh}`); uiSfx('learn'); log(`Cường hóa <b>${esc(it.n)}</b> lên +${it.enh}`); }
  else { toast('Cường hóa thất bại (mất ngân lượng)'); uiSfx('use'); }
  R.dirty = true; invDirty = true; save(); forgeModal(it);
}
function reroll(it) {
  if (!owned(it)) { closeModal(); return; }
  if (!canReroll(it) || !payGold(rerollCost(it))) return;
  it.mag = rollMagic(it, magicLevels(it.mag.length, it.lvl), R.P ? R.P.lucky : 0); delete it.leg;
  toast('Tẩy luyện xong'); uiSfx('learn');
  R.dirty = true; invDirty = true; save(); forgeModal(it);
}
const oreLabel = k => { const o = oreParse(k), r = oreRows(o.a)[0]; return `Dòng ${o.place + 1} (${o.place % 2 ? 'ẩn' : 'hiện'}) · ${r ? r.n : attrName(o.a)} · cấp ${o.lvl} ×${matHave('ore', k)}`; };
function afterRc(r, reopen) {
  toast(r.msg); uiSfx(r.ok ? 'learn' : 'use'); log(esc(r.msg));
  R.dirty = true; invDirty = true; save(); reopen();
}
function enchaseCard(it) {
  const n = (it.mag || []).length, can = !it.set && it.d >= 0 && it.d <= 9 && (n === 0 ? it.r === 0 : it.vio) && n < VIO_SLOTS;
  if (!can) return `<div class="card"><b>Khảm Tím</b> <small class="dim">${it.set ? 'Đồ bộ không khảm được' : n >= VIO_SLOTS ? 'Đã đủ 6 dòng' : 'Chỉ khảm đồ trắng hoặc đồ Tím chưa đủ dòng'}</small></div>`;
  const hts = Object.keys(mats().ht).map(Number).sort((a, b) => a - b);
  const ores = Object.keys(mats().ore).filter(k => oreParse(k).place === n);
  return `<div class="card"><b>Khảm Tím</b> <small class="dim">dòng ${n + 1}/6 (${n % 2 ? 'ẩn' : 'hiện'}) · thất bại 5% mất đá</small><br>
    <div class="btnrow"><select id="cHt">${hts.map(l => `<option value="${l}">Huyền Tinh cấp ${l} ×${matHave('ht', l)}</option>`).join('') || '<option value="">Chưa có Huyền Tinh</option>'}</select></div>
    <div class="btnrow"><select id="cOre">${ores.map(k => `<option value="${k}">${esc(oreLabel(k))}</option>`).join('') || `<option value="">Chưa có khoáng dòng ${n + 1}</option>`}</select></div>
    <div class="btnrow"><button class="btn" id="fKham" ${hts.length && ores.length ? '' : 'disabled'}>Khảm</button><button class="btn" id="fHtLo">Lò Huyền Tinh</button></div></div>`;
}
function platCard(it) {
  if (!it.set || it.set.kind !== 'platina') return '';
  const lv = it.plv || 0; if (lv >= PLAT_MAX) return '<div class="card"><b>Thăng cấp Bạch Kim</b> <small class="dim">Đã tối đa +10</small></div>';
  const u = PLAT_UP[lv], ok = S.gold >= platCost(u.cost.van) && matHave('misc', 'wc') >= u.inputs[0].qty && matHave('misc', 'mys') >= u.inputs[1].qty;
  return `<div class="card"><b>Thăng cấp Bạch Kim</b> <small class="dim">+${lv} → +${lv + 1} · thành công ${u.rate}% · mỗi cấp +${Math.round(PLAT_STEP * 100)}% thuộc tính gốc</small><br>
    <small>${u.inputs[0].qty} Thủy Tinh Trắng (có ${matHave('misc', 'wc')}) · ${u.inputs[1].qty} Thần Bí Khoáng Thạch (có ${matHave('misc', 'mys')}) · ${fmt(platCost(u.cost.van))} lượng</small>
    <div class="btnrow"><button class="btn" id="fPlat" ${ok ? '' : 'disabled'}>Thăng cấp</button></div></div>`;
}
function forgeModal(it) {
  const max = (it.enh || 0) >= ENH_MAX;
  modal(`<h3>Rèn đồ <small>${fmt(S.gold)} lượng</small></h3>${itemHTML(it)}
    <div class="card"><b>Cường hóa</b> <small class="dim">+${it.enh || 0} / +${ENH_MAX} · mỗi cấp +${Math.round(ENH_STEP * 100)}% thuộc tính gốc</small><br>
      ${max ? '<small class="dim">Đã cường hóa tối đa</small>' : `<small>Giá ${fmt(enhCost(it))} lượng · thành công ${Math.round(enhChance(it) * 100)}% · thất bại chỉ mất ngân lượng</small>`}
      <div class="btnrow"><button class="btn" id="fEnh" ${max || S.gold < enhCost(it) ? 'disabled' : ''}>Cường hóa lên +${(it.enh || 0) + 1}</button></div></div>
    <div class="card"><b>Tẩy luyện</b> <small class="dim">gieo lại ${(it.mag || []).length} dòng thuộc tính</small><br>
      ${canReroll(it) ? `<small>Giá ${fmt(rerollCost(it))} lượng</small>` : '<small class="dim">Đồ trắng / đồ bộ / đồ Tím không tẩy luyện được</small>'}
      <div class="btnrow"><button class="btn red" id="fRe" ${canReroll(it) && S.gold >= rerollCost(it) ? '' : 'disabled'}>Tẩy luyện</button></div></div>
    ${enchaseCard(it)}${platCard(it)}`, () => {
    $('#fEnh').onclick = () => enhance(it); $('#fRe').onclick = () => reroll(it);
    const k = $('#fKham'), lo = $('#fHtLo');
    if (k) k.onclick = () => afterRc(enchase(it, +$('#cHt').value, $('#cOre').value), () => forgeModal(it));
    if (lo) lo.onclick = () => htModal();
    const pu = $('#fPlat'); if (pu) pu.onclick = () => afterRc(upgradePlatina(it), () => forgeModal(it));
  });
}
/* Lo Huyen Tinh: hop tu 3 mon, thang cap Huyen Tinh va khoang */
let htSel = [], pkSel = [];
function htModal() {
  const pool = S.inv.filter(canFuse), hts = Object.keys(mats().ht).map(Number).sort((a, b) => a - b), ores = Object.keys(mats().ore).sort();
  htSel = htSel.filter(i => pool.includes(i));
  const shards = Object.keys(mats().shard), gpool = S.inv.filter(canPlatBase); pkSel = pkSel.filter(i => gpool.includes(i));
  modal(`<h3>Lò Huyền Tinh · Mảnh · Bạch Kim <small>${fmt(S.gold)} lượng</small></h3>
    <div class="card"><b>Hợp thành</b> <small class="dim">3 món nhẫn / dây chuyền / ngọc bội → Huyền Tinh · ${fmt(fuseCost())} lượng</small>
      <div class="btnrow" id="htPool">${pool.map(i => `<button class="btn ${htSel.includes(i) ? 'red' : ''}" data-u="${i.uid}">${esc(i.n)}</button>`).join('') || '<small class="dim">Hành trang không có món phù hợp</small>'}</div>
      <div class="btnrow"><button class="btn" id="htFuse" ${htSel.length === 3 && S.gold >= fuseCost() ? '' : 'disabled'}>Hợp (${htSel.length}/3)</button></div></div>
    <div class="card"><b>Huyền Tinh</b> <small class="dim">3 viên cùng cấp → 1 viên cấp +1 (rủi ro 2/11)</small>
      ${hts.map(l => `<div class="btnrow"><small>Cấp ${l} ×${matHave('ht', l)}</small><button class="btn" data-up="${l}" ${matHave('ht', l) >= 3 && l < HT_MAX ? '' : 'disabled'}>Thăng cấp</button></div>`).join('') || '<small class="dim">Chưa có Huyền Tinh</small>'}</div>
    <div class="card"><b>Mảnh Hoàng Kim</b> <small class="dim">đủ mảnh ghép thành món bộ (rơi từ trùm)</small>
      ${shards.map(n => `<div class="btnrow"><small>${esc(n)} ${matHave('shard', n)}/${SHARDS[n]}</small><button class="btn" data-sh="${esc(n)}" ${matHave('shard', n) >= SHARDS[n] ? '' : 'disabled'}>Ghép</button></div>`).join('') || '<small class="dim">Chưa có mảnh</small>'}</div>
    <div class="card"><b>Chế Bạch Kim</b> <small class="dim">2 Hoàng Kim giống nhau + ${PLAT_MAKE.inputs[1].qty} Thủy Tinh Trắng (có ${matHave('misc', 'wc')}) + ${PLAT_MAKE.inputs[2].qty} Thần Bí Khoáng Thạch (có ${matHave('misc', 'mys')}) + ${fmt(platCost(PLAT_MAKE.cost.van))} lượng · thành công ${PLAT_MAKE.rate}%</small>
      <div class="btnrow" id="pkPool">${gpool.map(i => `<button class="btn ${pkSel.includes(i) ? 'red' : ''}" data-p="${i.uid}">${esc(i.n)}</button>`).join('') || '<small class="dim">Hành trang chưa có Hoàng Kim bộ</small>'}</div>
      <div class="btnrow"><button class="btn" id="pkMake" ${pkSel.length === 2 && pkSel[0].n === pkSel[1].n ? '' : 'disabled'}>Chế (${pkSel.length}/2)</button></div></div>
    <div class="card"><b>Khoáng thạch</b> <small class="dim">+1 cấp, rủi ro 2/11 vỡ</small>
      ${ores.map(k => `<div class="btnrow"><small>${esc(oreLabel(k))}</small><button class="btn" data-ore="${k}" ${oreParse(k).lvl < ORE_MAX ? '' : 'disabled'}>Thăng cấp</button></div>`).join('') || '<small class="dim">Chưa có khoáng thạch (rơi từ trùm và tinh anh)</small>'}</div>`, () => {
    document.querySelectorAll('#mBody #htPool [data-u]').forEach(b => b.onclick = () => {
      const it = pool.find(i => i.uid === +b.dataset.u), k = htSel.indexOf(it);
      if (k >= 0) htSel.splice(k, 1); else if (htSel.length < 3) htSel.push(it);
      htModal();
    });
    document.querySelectorAll('#mBody [data-sh]').forEach(b => b.onclick = () => afterRc(combineShards(b.dataset.sh), htModal));
    document.querySelectorAll('#mBody #pkPool [data-p]').forEach(b => b.onclick = () => {
      const it = gpool.find(i => i.uid === +b.dataset.p), k = pkSel.indexOf(it);
      if (k >= 0) pkSel.splice(k, 1); else if (pkSel.length < 2) pkSel.push(it);
      htModal();
    });
    $('#pkMake').onclick = () => { const r = makePlatina(pkSel[0], pkSel[1]); pkSel = []; afterRc(r, htModal); };
    $('#htFuse').onclick = () => { const r = fuse(htSel.slice()); htSel = []; afterRc(r, htModal); };
    document.querySelectorAll('#mBody [data-up]').forEach(b => b.onclick = () => afterRc(upgradeHT(+b.dataset.up), htModal));
    document.querySelectorAll('#mBody [data-ore]').forEach(b => b.onclick = () => afterRc(upgradeOre(b.dataset.ore), htModal));
  });
}
