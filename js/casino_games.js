/* ==========================================================================
   TỬU QUÁN TIÊU DAO & SÒNG BẠC GIANG HỒ (MINIGAMES)
   1. Tài Xỉu Giang Hồ (Sicbo / Lắc 3 Xí Ngầu, Cửa Tài - Xỉu - Tam Hoa Bão)
   2. Bầu Cua Tôm Cá (Bầu, Cua, Tôm, Cá, Gà, Nai với x1, x2, x3 cược)
   3. Oản Tù Tì Đấu Trí Chưởng Quầy (Kéo, Búa, Bao với chuỗi thắng Streak Multiplier)
   ========================================================================== */
'use strict';

/* State lưu lịch sử và số liệu minigames */
function getCasinoState() {
  if (!S.casino || typeof S.casino !== 'object') {
    S.casino = {
      txHistory: ['T', 'X', 'T', 'T', 'X', 'X', 'T'],
      ottStreak: 0,
      ottBestStreak: 0,
      totalWon: 0,
      totalLost: 0
    };
  }
  return S.casino;
}

/* ==========================================================================
   1. TÀI XỈU GIANG HỒ (SICBO)
   ========================================================================== */
let _txBetChoice = 'tai'; // 'tai' | 'xiu' | 'bao'
let _txBetAmount = 1000;
let _txRolling = false;
let _txLastDices = [4, 5, 6];

function rollDice3() {
  return [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1
  ];
}

const DICE_CHARS = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

function openTaiXiuModal() {
  const cs = getCasinoState();
  const sum = _txLastDices[0] + _txLastDices[1] + _txLastDices[2];
  const isBao = (_txLastDices[0] === _txLastDices[1] && _txLastDices[1] === _txLastDices[2]);
  const resultType = isBao ? 'BÃO' : (sum >= 11 ? 'TÀI' : 'XỈU');

  const historyHtml = cs.txHistory.slice(-14).map(h => {
    const col = h === 'T' ? '#ef4444' : h === 'X' ? '#3b82f6' : '#eab308';
    return `<span style="display:inline-block;width:20px;height:20px;line-height:20px;text-align:center;border-radius:50%;background:${col};color:#fff;font-weight:bold;font-size:10px;margin:0 2px;">${h}</span>`;
  }).join('');

  modal(`
    <div class="jx-client-window" style="margin:-14px;border:none;box-shadow:none;">
      <div class="jx-window-header">
        <div class="jx-window-title">
          <span>🎲 TÀI XỈU ĐẠI NÁO TỬU QUÁN</span>
        </div>
        <span style="font-size:11px;color:#ffd700;">Ngân lượng: <b>${fmt(S.gold)}</b></span>
      </div>

      <div style="padding:12px;background:radial-gradient(ellipse at center, #261b11 0%, #0d0a07 100%);">
        
        <!-- Bat dia xuc xac -->
        <div style="background:#15100c;border:2px solid #8e6c38;border-radius:12px;padding:16px;text-align:center;box-shadow:inset 0 0 20px #000;margin-bottom:12px;">
          <div id="txDiceBox" style="font-size:52px;line-height:1;margin-bottom:8px;letter-spacing:12px;color:#ffd700;text-shadow:0 0 10px rgba(255,215,0,0.5);">
            ${DICE_CHARS[_txLastDices[0]]} ${DICE_CHARS[_txLastDices[1]]} ${DICE_CHARS[_txLastDices[2]]}
          </div>
          <div id="txResultTxt" style="font-size:14px;color:#cbd5e1;font-weight:bold;">
            Tổng: <span style="color:#ffd700;font-size:18px;">${sum}</span> nút ➔ 
            <span style="color:${resultType === 'TÀI' ? '#ef4444' : resultType === 'XỈU' ? '#3b82f6' : '#eab308'};font-size:18px;">
              ${resultType}
            </span>
          </div>
        </div>

        <!-- Cac cua dat cuoc -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">
          <button class="jx-action-btn ${_txBetChoice === 'xiu' ? 'gold' : ''}" id="bBetXiu" style="padding:10px 4px;text-align:center;background:${_txBetChoice === 'xiu' ? 'rgba(59,130,246,0.3)' : 'rgba(20,16,12,0.85)'};border-color:${_txBetChoice === 'xiu' ? '#3b82f6' : '#5a4425'};">
            <div style="font-size:16px;color:#3b82f6;font-weight:bold;">XỈU</div>
            <div style="font-size:10px;color:#a39276;">4 - 10 Nút (1:1)</div>
          </button>

          <button class="jx-action-btn ${_txBetChoice === 'bao' ? 'gold' : ''}" id="bBetBao" style="padding:10px 4px;text-align:center;background:${_txBetChoice === 'bao' ? 'rgba(234,179,8,0.3)' : 'rgba(20,16,12,0.85)'};border-color:${_txBetChoice === 'bao' ? '#eab308' : '#5a4425'};">
            <div style="font-size:16px;color:#eab308;font-weight:bold;">BÃO</div>
            <div style="font-size:10px;color:#a39276;">3 Con Cùng Nút (1:30)</div>
          </button>

          <button class="jx-action-btn ${_txBetChoice === 'tai' ? 'gold' : ''}" id="bBetTai" style="padding:10px 4px;text-align:center;background:${_txBetChoice === 'tai' ? 'rgba(239,68,68,0.3)' : 'rgba(20,16,12,0.85)'};border-color:${_txBetChoice === 'tai' ? '#ef4444' : '#5a4425'};">
            <div style="font-size:16px;color:#ef4444;font-weight:bold;">TÀI</div>
            <div style="font-size:10px;color:#a39276;">11 - 17 Nút (1:1)</div>
          </button>
        </div>

        <!-- Chon muc cuoc -->
        <div class="jx-box" style="margin-bottom:12px;padding:8px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-size:11px;color:#cbd5e1;">Mức cược hiện tại: <b style="color:#ffd700;font-size:13px;">${fmt(_txBetAmount)} lượng</b></span>
          </div>
          <div style="display:flex;gap:4px;flex-wrap:wrap;">
            ${[1000, 5000, 20000, 50000, 200000].map(amt => `
              <button class="jx-action-btn ${_txBetAmount === amt ? 'gold' : ''}" onclick="_txBetAmount=${amt};openTaiXiuModal();" style="padding:3px 8px;font-size:11px;">
                ${fmt(amt)}
              </button>
            `).join('')}
            <button class="jx-action-btn" onclick="_txBetAmount=Math.max(1000, Math.floor(S.gold));openTaiXiuModal();" style="padding:3px 8px;font-size:11px;color:#f87171;">
              Tất Tay
            </button>
          </div>
        </div>

        <!-- Soi cau lich su -->
        <div class="jx-box" style="margin-bottom:12px;padding:6px 8px;">
          <div style="font-size:10px;color:#a39276;margin-bottom:4px;">Lịch sử cầu gần nhất (Đỏ: Tài · Xanh: Xỉu · Vàng: Bão):</div>
          <div style="display:flex;align-items:center;overflow-x:auto;">
            ${historyHtml}
          </div>
        </div>

        <!-- Nut quay / lac bat -->
        <button class="jx-action-btn gold" id="bRollTx" style="width:100%;padding:10px;font-size:15px;font-weight:bold;text-align:center;" ${_txRolling ? 'disabled' : ''}>
          ${_txRolling ? '🎲 ĐANG LẮC BÁT...' : `🎲 LẮC BÁT (CƯỢC ${fmt(_txBetAmount)} LƯỢNG)`}
        </button>

      </div>

      <div style="padding:8px 12px;border-top:1px solid #3d2f1d;background:#0d0a07;display:flex;justify-content:space-between;align-items:center;">
        <button class="jx-action-btn" onclick="openTavernHub();">◀ Quay Lại Tửu Quán</button>
        <button class="jx-action-btn" onclick="closeModal();">Rời Sòng</button>
      </div>
    </div>
  `, () => {
    $('#bBetXiu').onclick = () => { _txBetChoice = 'xiu'; openTaiXiuModal(); };
    $('#bBetBao').onclick = () => { _txBetChoice = 'bao'; openTaiXiuModal(); };
    $('#bBetTai').onclick = () => { _txBetChoice = 'tai'; openTaiXiuModal(); };
    $('#bRollTx').onclick = playTaiXiu;
  });
}

function playTaiXiu() {
  if (_txRolling) return;
  if (S.gold < _txBetAmount) {
    toast('Không đủ ngân lượng để đặt cược!');
    return;
  }
  S.gold -= _txBetAmount;
  _txRolling = true;
  if (typeof uiSfx === 'function') uiSfx('click');

  const diceBox = $('#txDiceBox');
  const resTxt = $('#txResultTxt');
  const rollBtn = $('#bRollTx');
  if (rollBtn) rollBtn.disabled = true;

  let ticks = 0;
  const interval = setInterval(() => {
    ticks++;
    const temp = rollDice3();
    if (diceBox) {
      diceBox.innerHTML = `${DICE_CHARS[temp[0]]} ${DICE_CHARS[temp[1]]} ${DICE_CHARS[temp[2]]}`;
    }
    if (ticks >= 12) {
      clearInterval(interval);
      _txRolling = false;
      finishTaiXiu();
    }
  }, 80);
}

function finishTaiXiu() {
  _txLastDices = rollDice3();
  const sum = _txLastDices[0] + _txLastDices[1] + _txLastDices[2];
  const isBao = (_txLastDices[0] === _txLastDices[1] && _txLastDices[1] === _txLastDices[2]);
  const cs = getCasinoState();

  let won = false;
  let winMul = 0;
  let historyChar = 'T';

  if (isBao) {
    historyChar = 'B';
    if (_txBetChoice === 'bao') { won = true; winMul = 30; }
  } else if (sum >= 11) {
    historyChar = 'T';
    if (_txBetChoice === 'tai') { won = true; winMul = 2; }
  } else {
    historyChar = 'X';
    if (_txBetChoice === 'xiu') { won = true; winMul = 2; }
  }

  cs.txHistory.push(historyChar);
  if (cs.txHistory.length > 30) cs.txHistory.shift();

  if (won) {
    const winAmt = _txBetAmount * winMul;
    S.gold += winAmt;
    cs.totalWon += winAmt - _txBetAmount;
    if (typeof uiSfx === 'function') uiSfx('learn');
    toast(`🎉 Thắng lớn! +${fmt(winAmt)} lượng!`);
    log(`<b style="color:#ffd700;">Thắng Tài Xỉu: +${fmt(winAmt)} lượng (${_txLastDices.join('-')} = ${sum})</b>`);
  } else {
    cs.totalLost += _txBetAmount;
    if (typeof uiSfx === 'function') uiSfx('use');
    toast(`Trượt rồi! Chúc bạn may mắn lần sau.`);
  }

  save();
  refresh();
  openTaiXiuModal();
}

/* ==========================================================================
   2. BẦU CUA TÔM CÁ DÂN GIAN
   ========================================================================== */
const BC_ITEMS = [
  { id: 'bau', n: 'Bầu', icon: '🍐', col: '#4ade80' },
  { id: 'cua', n: 'Cua', icon: '🦀', col: '#ef4444' },
  { id: 'tom', n: 'Tôm', icon: '🦐', col: '#fb923c' },
  { id: 'ca',  n: 'Cá',  icon: '🐟', col: '#60a5fa' },
  { id: 'ga',  n: 'Gà',  icon: '🐓', col: '#eab308' },
  { id: 'nai', n: 'Nai', icon: '🦌', col: '#c084fc' }
];

let _bcBets = { bau: 0, cua: 0, tom: 0, ca: 0, ga: 0, nai: 0 };
let _bcLastDices = ['bau', 'cua', 'tom'];
let _bcRolling = false;
let _bcChip = 1000;

function openBauCuaModal() {
  const totalBet = Object.values(_bcBets).reduce((a, b) => a + b, 0);

  const diceIcons = _bcLastDices.map(id => {
    const it = BC_ITEMS.find(x => x.id === id) || BC_ITEMS[0];
    return `<span style="font-size:42px;margin:0 6px;">${it.icon}</span>`;
  }).join('');

  const gridHtml = BC_ITEMS.map(it => {
    const bet = _bcBets[it.id] || 0;
    return `
      <div style="background:rgba(20,16,12,0.9);border:1.5px solid ${bet > 0 ? '#ffd700' : '#4d3a22'};border-radius:8px;padding:8px 4px;text-align:center;cursor:pointer;position:relative;" onclick="addBcBet('${it.id}')">
        <div style="font-size:36px;line-height:1;">${it.icon}</div>
        <b style="color:${it.col};font-size:13px;display:block;margin-top:2px;">${it.n}</b>
        <div style="font-size:11px;color:${bet > 0 ? '#ffd700' : '#a39276'};font-weight:bold;margin-top:2px;">
          ${bet > 0 ? `+${fmt(bet)}` : 'Đặt cược'}
        </div>
      </div>
    `;
  }).join('');

  modal(`
    <div class="jx-client-window" style="margin:-14px;border:none;box-shadow:none;">
      <div class="jx-window-header">
        <div class="jx-window-title">
          <span>🍐 BẦU CUA TÔM CÁ GIANG HỒ</span>
        </div>
        <span style="font-size:11px;color:#ffd700;">Ngân lượng: <b>${fmt(S.gold)}</b></span>
      </div>

      <div style="padding:12px;background:radial-gradient(ellipse at center, #261b11 0%, #0d0a07 100%);">
        
        <!-- Bat Dia -->
        <div style="background:#15100c;border:2px solid #8e6c38;border-radius:12px;padding:12px;text-align:center;box-shadow:inset 0 0 20px #000;margin-bottom:12px;">
          <div id="bcDiceBox" style="margin-bottom:4px;">
            ${diceIcons}
          </div>
          <div style="font-size:12px;color:#a39276;">
            Kết quả: <b style="color:#ffd700;">${_bcLastDices.map(id => (BC_ITEMS.find(x => x.id === id) || {}).n).join(' · ')}</b>
          </div>
        </div>

        <!-- 6 O Dat Cuoc -->
        <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;margin-bottom:12px;">
          ${gridHtml}
        </div>

        <!-- Chon Chip Cuoc -->
        <div class="jx-box" style="margin-bottom:12px;padding:8px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-size:11px;color:#cbd5e1;">Mức cược mỗi lần chạm: <b style="color:#ffd700;">${fmt(_bcChip)}</b></span>
            <span style="font-size:11px;color:#ffd700;">Tổng cược: <b style="color:#4ade80;">${fmt(totalBet)} lượng</b></span>
          </div>
          <div style="display:flex;gap:4px;justify-content:space-between;">
            <div style="display:flex;gap:4px;">
              ${[1000, 5000, 20000, 50000].map(amt => `
                <button class="jx-action-btn ${_bcChip === amt ? 'gold' : ''}" onclick="_bcChip=${amt};openBauCuaModal();" style="padding:2px 8px;font-size:10px;">
                  ${fmt(amt)}
                </button>
              `).join('')}
            </div>
            <button class="jx-action-btn" onclick="clearBcBets();openBauCuaModal();" style="padding:2px 8px;font-size:10px;color:#f87171;">
              Xóa Cược
            </button>
          </div>
        </div>

        <!-- Nut Lac Bat -->
        <button class="jx-action-btn gold" id="bRollBc" style="width:100%;padding:10px;font-size:15px;font-weight:bold;text-align:center;" ${_bcRolling || totalBet <= 0 ? 'disabled' : ''}>
          ${_bcRolling ? '🎲 ĐANG MỞ BÁT...' : `🎲 MỞ BÁT (CƯỢC ${fmt(totalBet)} LƯỢNG)`}
        </button>

      </div>

      <div style="padding:8px 12px;border-top:1px solid #3d2f1d;background:#0d0a07;display:flex;justify-content:space-between;align-items:center;">
        <button class="jx-action-btn" onclick="openTavernHub();">◀ Quay Lại Tửu Quán</button>
        <button class="jx-action-btn" onclick="closeModal();">Rời Sòng</button>
      </div>
    </div>
  `, () => {
    const rb = $('#bRollBc');
    if (rb) rb.onclick = playBauCua;
  });
}

function addBcBet(id) {
  if (_bcRolling) return;
  const currentTotal = Object.values(_bcBets).reduce((a, b) => a + b, 0);
  if (S.gold < currentTotal + _bcChip) {
    toast('Không đủ ngân lượng để cược thêm!');
    return;
  }
  _bcBets[id] = (_bcBets[id] || 0) + _bcChip;
  if (typeof uiSfx === 'function') uiSfx('click');
  openBauCuaModal();
}

function clearBcBets() {
  _bcBets = { bau: 0, cua: 0, tom: 0, ca: 0, ga: 0, nai: 0 };
}

function playBauCua() {
  const totalBet = Object.values(_bcBets).reduce((a, b) => a + b, 0);
  if (totalBet <= 0) {
    toast('Vui lòng chọn cửa đặt trước khi mở bát!');
    return;
  }
  if (S.gold < totalBet) {
    toast('Không đủ ngân lượng để đặt cược!');
    return;
  }
  S.gold -= totalBet;
  _bcRolling = true;
  if (typeof uiSfx === 'function') uiSfx('click');

  const diceBox = $('#bcDiceBox');
  let ticks = 0;
  const interval = setInterval(() => {
    ticks++;
    const temp = [pick(BC_ITEMS).id, pick(BC_ITEMS).id, pick(BC_ITEMS).id];
    if (diceBox) {
      diceBox.innerHTML = temp.map(id => {
        const it = BC_ITEMS.find(x => x.id === id);
        return `<span style="font-size:42px;margin:0 6px;">${it.icon}</span>`;
      }).join('');
    }
    if (ticks >= 12) {
      clearInterval(interval);
      _bcRolling = false;
      finishBauCua();
    }
  }, 80);
}

function finishBauCua() {
  _bcLastDices = [pick(BC_ITEMS).id, pick(BC_ITEMS).id, pick(BC_ITEMS).id];
  let totalReward = 0;

  for (const item of BC_ITEMS) {
    const bet = _bcBets[item.id] || 0;
    if (bet <= 0) continue;
    const matchCount = _bcLastDices.filter(d => d === item.id).length;
    if (matchCount > 0) {
      // Hoan von + thuong gap n lan
      totalReward += bet + (bet * matchCount);
    }
  }

  if (totalReward > 0) {
    S.gold += totalReward;
    if (typeof uiSfx === 'function') uiSfx('learn');
    toast(`🎉 Thắng lớn! Nhận về +${fmt(totalReward)} lượng!`);
    log(`<b style="color:#ffd700;">Thắng Bầu Cua: +${fmt(totalReward)} lượng (${_bcLastDices.map(id => (BC_ITEMS.find(x => x.id === id) || {}).n).join('-')})</b>`);
  } else {
    if (typeof uiSfx === 'function') uiSfx('use');
    toast(`Không trúng con nào! Chúc bạn may mắn lần sau.`);
  }

  clearBcBets();
  save();
  refresh();
  openBauCuaModal();
}

/* ==========================================================================
   3. OẢN TÙ TÌ ĐẤU TRÍ CHƯỞNG QUẦY (KÉO - BÚA - BAO)
   ========================================================================== */
let _ottBet = 2000;
let _ottPlaying = false;
let _ottPlayerPick = null;
let _ottDealerPick = null;

const OTT_CHOICES = [
  { id: 'bua',  n: 'Búa',  icon: '✊', beats: 'keo' },
  { id: 'keo',  n: 'Kéo',  icon: '✌️', beats: 'bao' },
  { id: 'bao',  n: 'Bao',  icon: '🖐️', beats: 'bua' }
];

function openOanTuTiModal() {
  const cs = getCasinoState();

  modal(`
    <div class="jx-client-window" style="margin:-14px;border:none;box-shadow:none;">
      <div class="jx-window-header">
        <div class="jx-window-title">
          <span>✌️ OẢN TÙ TÌ VỚI CHƯỞNG QUẦY</span>
        </div>
        <span style="font-size:11px;color:#ffd700;">Chuỗi thắng: <b style="color:#4ade80;">${cs.ottStreak}</b> trận</span>
      </div>

      <div style="padding:12px;background:radial-gradient(ellipse at center, #261b11 0%, #0d0a07 100%);">
        
        <!-- Arena Doi Dau -->
        <div style="background:#15100c;border:2px solid #8e6c38;border-radius:12px;padding:16px;box-shadow:inset 0 0 20px #000;margin-bottom:12px;">
          <div style="display:flex;justify-content:space-around;align-items:center;">
            <div style="text-align:center;">
              <div style="font-size:11px;color:#a39276;margin-bottom:4px;">Bạn Ra</div>
              <div id="ottPlayerBox" style="font-size:52px;line-height:1;">
                ${_ottPlayerPick ? (OTT_CHOICES.find(x => x.id === _ottPlayerPick) || {}).icon : '❓'}
              </div>
            </div>

            <div style="font-size:24px;color:#ef4444;font-weight:bold;">VS</div>

            <div style="text-align:center;">
              <div style="font-size:11px;color:#a39276;margin-bottom:4px;">Chưởng Quầy</div>
              <div id="ottDealerBox" style="font-size:52px;line-height:1;">
                ${_ottDealerPick ? (OTT_CHOICES.find(x => x.id === _ottDealerPick) || {}).icon : '🧔'}
              </div>
            </div>
          </div>
        </div>

        <!-- Bang Chuoi Thang & Nhan Thuong -->
        <div class="jx-box" style="margin-bottom:12px;padding:6px 10px;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <span style="font-size:11px;color:#cbd5e1;">Chuỗi thắng hiện tại: <b style="color:#4ade80;font-size:13px;">${cs.ottStreak}</b> (Kỷ lục: ${cs.ottBestStreak})</span>
            <div style="font-size:10px;color:#ffd700;">Hệ số thưởng chuỗi: <b>x${(1.9 + cs.ottStreak * 0.5).toFixed(1)}</b> cược!</div>
          </div>
          ${cs.ottStreak >= 5 ? '<span style="font-size:11px;color:#ef4444;font-weight:bold;">👑 ĐỆ NHẤT CAO THỦ</span>' : ''}
        </div>

        <!-- Chon Keo / Bua / Bao -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">
          ${OTT_CHOICES.map(c => `
            <button class="jx-action-btn gold" onclick="playOanTuTi('${c.id}')" style="padding:12px 4px;text-align:center;" ${_ottPlaying ? 'disabled' : ''}>
              <div style="font-size:32px;line-height:1;">${c.icon}</div>
              <div style="font-size:13px;font-weight:bold;margin-top:4px;">${c.n}</div>
            </button>
          `).join('')}
        </div>

        <!-- Chon Muc Cuoc -->
        <div class="jx-box" style="margin-bottom:12px;padding:8px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-size:11px;color:#cbd5e1;">Mức cược: <b style="color:#ffd700;">${fmt(_ottBet)} lượng</b></span>
          </div>
          <div style="display:flex;gap:4px;">
            ${[2000, 10000, 50000, 200000].map(amt => `
              <button class="jx-action-btn ${_ottBet === amt ? 'gold' : ''}" onclick="_ottBet=${amt};openOanTuTiModal();" style="padding:2px 8px;font-size:10px;">
                ${fmt(amt)}
              </button>
            `).join('')}
          </div>
        </div>

      </div>

      <div style="padding:8px 12px;border-top:1px solid #3d2f1d;background:#0d0a07;display:flex;justify-content:space-between;align-items:center;">
        <button class="jx-action-btn" onclick="openTavernHub();">◀ Quay Lại Tửu Quán</button>
        <button class="jx-action-btn" onclick="closeModal();">Rời Sòng</button>
      </div>
    </div>
  `);
}

function playOanTuTi(choiceId) {
  if (_ottPlaying) return;
  if (S.gold < _ottBet) {
    toast('Không đủ ngân lượng để khiêu chiến chưởng quầy!');
    return;
  }
  S.gold -= _ottBet;
  _ottPlaying = true;
  _ottPlayerPick = choiceId;
  if (typeof uiSfx === 'function') uiSfx('click');

  const dealerBox = $('#ottDealerBox');
  let ticks = 0;
  const interval = setInterval(() => {
    ticks++;
    if (dealerBox) dealerBox.innerHTML = pick(OTT_CHOICES).icon;
    if (ticks >= 10) {
      clearInterval(interval);
      _ottPlaying = false;
      finishOanTuTi(choiceId);
    }
  }, 70);
}

function finishOanTuTi(playerChoiceId) {
  _ottDealerPick = pick(OTT_CHOICES).id;
  const cs = getCasinoState();
  const playerObj = OTT_CHOICES.find(x => x.id === playerChoiceId);
  const dealerObj = OTT_CHOICES.find(x => x.id === _ottDealerPick);

  if (playerChoiceId === _ottDealerPick) {
    // Hoa
    S.gold += _ottBet;
    toast(`Hòa nhau! Chưởng quầy cũng ra ${dealerObj.n}. Hoàn lại tiền cược.`);
  } else if (playerObj.beats === _ottDealerPick) {
    // Thang!
    cs.ottStreak++;
    if (cs.ottStreak > cs.ottBestStreak) cs.ottBestStreak = cs.ottStreak;
    const mul = 1.9 + (cs.ottStreak * 0.5);
    const winAmt = Math.round(_ottBet * mul);
    S.gold += winAmt;
    if (typeof uiSfx === 'function') uiSfx('learn');
    toast(`🎉 Thắng rồi! (${playerObj.n} thắng ${dealerObj.n}) +${fmt(winAmt)} lượng!`);
    log(`<b style="color:#ffd700;">Thắng Oản Tù Tì: ${playerObj.n} đè ${dealerObj.n} (Chuỗi ${cs.ottStreak}) +${fmt(winAmt)} lượng</b>`);
    
    // Thuong dac biet chuoi 5
    if (cs.ottStreak === 5 && typeof forceSetItem === 'function') {
      const it = forceSetItem();
      if (it) addItem(it, true, true);
      toast('👑 Thắng 5 ván liên tiếp: Nhận thêm 1 Đồ Hoàng Kim Phái!');
    }
  } else {
    // Thua
    cs.ottStreak = 0;
    if (typeof uiSfx === 'function') uiSfx('use');
    toast(`Chưởng quầy ra ${dealerObj.n}! Bạn đã thua.`);
  }

  save();
  refresh();
  openOanTuTiModal();
}

/* ==========================================================================
   4. TỬU QUÁN TIÊU DAO CENTRAL HUB (MENU CHỌN TRÒ CHƠI)
   ========================================================================== */
function openTavernHub() {
  const cs = getCasinoState();

  modal(`
    <div class="jx-client-window" style="margin:-14px;border:none;box-shadow:none;">
      <div class="jx-window-header">
        <div class="jx-window-title">
          <span>🏮 TỬU QUÁN TIÊU DAO (SÒNG BẠC GIANG HỒ)</span>
        </div>
        <span style="font-size:11px;color:#ffd700;">Ngân lượng: <b>${fmt(S.gold)}</b></span>
      </div>

      <div style="padding:12px;background:radial-gradient(ellipse at center, #261b11 0%, #0d0a07 100%);">
        <p style="font-size:11px;color:#cbd5e1;line-height:1.4;margin:0 0 10px 0;">
          Nơi các hiệp khách dừng chân giải trí sau những giờ bôn ba hành tẩu giang hồ. Thử vận may đoạt vạn lượng hoàng kim!
        </p>

        <div style="display:flex;flex-direction:column;gap:10px;">
          
          <!-- Game 1: Tai Xiu -->
          <div style="background:linear-gradient(135deg, rgba(35,25,15,0.9), rgba(15,12,8,0.95));border:1.5px solid #d4af37;border-radius:8px;padding:10px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;" onclick="openTaiXiuModal();">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="font-size:32px;">🎲</div>
              <div>
                <b style="color:#ffd700;font-size:14px;">Tài Xỉu Giang Hồ</b>
                <div style="font-size:11px;color:#a39276;">Lắc 3 xí ngầu · Cược Tài / Xỉu / Tam Hoa Bão (Ăn x30)</div>
              </div>
            </div>
            <button class="jx-action-btn gold" style="padding:6px 12px;font-size:11px;">Vào Bàn</button>
          </div>

          <!-- Game 2: Bau Cua -->
          <div style="background:linear-gradient(135deg, rgba(20,30,20,0.9), rgba(10,15,10,0.95));border:1.5px solid #4ade80;border-radius:8px;padding:10px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;" onclick="openBauCuaModal();">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="font-size:32px;">🍐</div>
              <div>
                <b style="color:#4ade80;font-size:14px;">Bầu Cua Tôm Cá</b>
                <div style="font-size:11px;color:#a39276;">6 cửa linh vật dân gian · Ăn gấp 1, 2, 3 lần tiền cược</div>
              </div>
            </div>
            <button class="jx-action-btn gold" style="padding:6px 12px;font-size:11px;">Vào Bàn</button>
          </div>

          <!-- Game 3: Oan Tu Ti -->
          <div style="background:linear-gradient(135deg, rgba(30,20,35,0.9), rgba(15,10,20,0.95));border:1.5px solid #c084fc;border-radius:8px;padding:10px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;" onclick="openOanTuTiModal();">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="font-size:32px;">✌️</div>
              <div>
                <b style="color:#c084fc;font-size:14px;">Oản Tù Tì Đấu Trí Chưởng Quầy</b>
                <div style="font-size:11px;color:#a39276;">Kéo - Búa - Bao · Chuỗi thắng nhân bội số cược cực khủng</div>
              </div>
            </div>
            <button class="jx-action-btn gold" style="padding:6px 12px;font-size:11px;">Khiêu Chiến</button>
          </div>

        </div>
      </div>

      <div style="padding:8px 12px;border-top:1px solid #3d2f1d;background:#0d0a07;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:10.5px;color:#a39276;">Đánh bạc vui vẻ, tiêu dao giải trí chốn võ lâm!</span>
        <button class="jx-action-btn" onclick="closeModal();">Đóng</button>
      </div>
    </div>
  `);
}
