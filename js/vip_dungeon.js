/* ==========================================================================
   VIP SYSTEM & DUNGEON CHALLENGE HUB (VO LAM WEB IDLE)
   Module chuyen biet cho:
   1. He thong VIP 1 - 10: Dac quyen hut do toan map, x2 EXP/Vang, tu dong ban rac,
      kho tu xa, tien thao lo, qua VIP moi ngay, tu luyen VIP mien phi.
   2. Pho Ban Kiem Vuc (Dungeon Hub): Thien Lao, Van Hoa Coc, Duoc Vuong, Kiem Trung.
   3. Hoat Dong Hub Tong Hop: Leo Thap (Van Trung Thap + Can Quet), Sinh Ton 10 Phut,
      Boss Hoang Kim The Gioi, Vuot Ai Tram Tuong.
   ========================================================================== */
'use strict';

/* ==========================================================================
   1. HE THONG VIP TOAN DIEN (VIP 1 - VIP 10)
   ========================================================================== */
const VIP_EXP_TABLE = [
  0,       // VIP 0 (khong dung)
  0,       // VIP 1: Mac dinh tang ngay khi tham gia giang ho
  300,     // VIP 2: 300 diem (= 8tr x VIP 1)
  900,     // VIP 3: +600 diem (= 16tr x VIP 2) -> tong 900
  1800,    // VIP 4: +900 diem (= 24tr x VIP 3) -> tong 1800
  3000,    // VIP 5: +1200 diem (= 32tr x VIP 4) -> tong 3000
  4500,    // VIP 6: +1500 diem (= 40tr x VIP 5) -> tong 4500
  6300,    // VIP 7: +1800 diem (= 48tr x VIP 6) -> tong 6300
  8400,    // VIP 8: +2100 diem (= 56tr x VIP 7) -> tong 8400
  10800,   // VIP 9: +2400 diem (= 64tr x VIP 8) -> tong 10800
  13500    // VIP 10: +2700 diem (= 72tr x VIP 9) -> tong 13500: Vo Lam Chi Ton
];

const VIP_PERKS = [
  null,
  {
    lvl: 1,
    title: 'Hiệp Khách Nhập Môn',
    expBonus: 10,
    goldBonus: 10,
    vacRadius: 350,
    features: [
      '⚡ Tự động hút đồ x3 phạm vi (bán kính 350px)',
      '🎒 Tự động bán trang bị rác trắng/xanh khi đầy túi',
      '📈 Tăng +10% Kinh nghiệm (EXP) & +10% Ngân lượng quái rơi',
      '🎁 Hộp quà phúc lợi VIP 1 hàng ngày'
    ]
  },
  {
    lvl: 2,
    title: 'Hào Kiệt Giang Hồ',
    expBonus: 15,
    goldBonus: 15,
    vacRadius: 500,
    features: [
      '🏃 Tốc độ di chuyển nhân vật tăng +25%',
      '✨ Tỷ lệ rớt Đồ Cực Phẩm & Hoàng Kim tăng +15%',
      '🗼 Tặng thêm +1 lượt Leo Tháp & +1 lượt Boss mỗi ngày',
      '🎁 Hộp quà phúc lợi VIP 2 hàng ngày'
    ]
  },
  {
    lvl: 3,
    title: 'Danh Bất Hư Truyền',
    expBonus: 20,
    goldBonus: 20,
    vacRadius: 1200,
    features: [
      '🧲 Hút vật phẩm toàn màn hình tức thì (Full Map Vacuum)',
      '🔍 Tự động giám định trang bị ma pháp quý',
      '📈 Tăng +20% Kinh nghiệm (EXP) & +20% Ngân lượng',
      '🎁 Hộp quà phúc lợi VIP 3 hàng ngày (Tặng Tiên Thảo Lộ)'
    ]
  },
  {
    lvl: 4,
    title: 'Võ Lâm Danh Túc',
    expBonus: 30,
    goldBonus: 30,
    vacRadius: 1500,
    features: [
      '📦 Mở Rương Kho Chung Từ Xa mọi lúc mọi nơi',
      '🧪 Tự động cắn Tiên Thảo Lộ duy trì x2 EXP liên tục',
      '🐉 Tặng thêm +2 lượt Boss Hoàng Kim & +2 lượt Phó Bản Dungeon',
      '🎁 Hộp quà phúc lợi VIP 4 hàng ngày (Rương Hoàng Kim)'
    ]
  },
  {
    lvl: 5,
    title: 'Nhất Phương Bá Chủ',
    expBonus: 40,
    goldBonus: 40,
    vacRadius: 1800,
    features: [
      '🛡 Thần Thú Hộ Thân: Tăng 25% Sát thương kỹ năng, Giảm 20% sát thương nhận',
      '⚡ Quét Nhanh Vạn Trùng Tháp (nhận ngay quà tầng đã qua)',
      '🔥 Tăng 50% hiệu suất buff Lửa Trại',
      '🎁 Hộp quà phúc lợi VIP 5 hàng ngày (Thảo Dược Thần Mã)'
    ]
  },
  {
    lvl: 6,
    title: 'Tuyệt Đỉnh Cao Thủ',
    expBonus: 50,
    goldBonus: 50,
    vacRadius: 2000,
    features: [
      '👑 Danh hiệu Hào Quang Hoàng Kim: Võ Lâm Danh Tôn',
      '⚔ Tăng +20% Tỷ lệ đòn đánh chí mạng (Bạo kích)',
      '🎁 Tặng x2 Rương Hoàng Kim và 50 Điểm Phúc Duyên mỗi ngày'
    ]
  },
  {
    lvl: 7,
    title: 'Khai Sơn Lập Phái',
    expBonus: 65,
    goldBonus: 65,
    vacRadius: 2000,
    features: [
      '⚔ Bỏ qua 20% Kháng tính của toàn bộ Quái & Boss',
      '🐎 Tốc độ di chuyển tăng thêm +30%',
      '🎁 Hộp quà phúc lợi VIP 7 hàng ngày'
    ]
  },
  {
    lvl: 8,
    title: 'Độc Cô Cầu Bại',
    expBonus: 80,
    goldBonus: 80,
    vacRadius: 2000,
    features: [
      '💫 Hút 10% sát thương chuyển thành Sinh Lực & Nội Lực',
      '⚡ Giảm 20% thời gian hồi mọi kỹ năng phái',
      '🎁 Hộp quà phúc lợi VIP 8 hàng ngày'
    ]
  },
  {
    lvl: 9,
    title: 'Thiên Hạ Vô Song',
    expBonus: 100,
    goldBonus: 100,
    vacRadius: 2500,
    features: [
      '🌟 Tăng 100% (Gấp đôi) toàn bộ phần thưởng Vượt Ải & Tháp',
      '🛡 Miễn nhiễm toàn bộ hiệu ứng Choáng & Đóng Băng',
      '🎁 Hộp quà phúc lợi VIP 9 hàng ngày'
    ]
  },
  {
    lvl: 10,
    title: 'Võ Lâm Chí Tôn',
    expBonus: 150,
    goldBonus: 150,
    vacRadius: 3000,
    features: [
      '👑 Danh Hiệu Tối Cao Chí Tôn: VÕ LÂM CHÍ TÔN VẠN KIẾM QUY TÔNG',
      '💥 Tăng x2.5 Toàn bộ Sát Thương & x2.5 Kinh Nghiệm / Ngân Lượng',
      '🌟 Nhận Toàn Bộ Thần Khí & Bí Kíp Trấn Phái Tối Thượng',
      '🎁 Đại Lễ Bao VIP 10 Hàng Ngày Cực Phẩm'
    ]
  }
];

function getVipState() {
  if (!window.S || typeof S !== 'object') {
    return { lvl: 1, exp: 0, lastClaim: '', pts: 0 };
  }
  if (!S.vip || typeof S.vip !== 'object') {
    S.vip = { lvl: 1, exp: 0, lastClaim: '', pts: 0 };
  }
  if (!S.vip.lvl || S.vip.lvl < 1) S.vip.lvl = 1;
  return S.vip;
}

function vipLevel() {
  const v = getVipState();
  return v.lvl || 1;
}

function vipExpMul() {
  const lvl = vipLevel();
  const perk = VIP_PERKS[lvl] || VIP_PERKS[1];
  return 1 + (perk.expBonus / 100);
}

function vipGoldMul() {
  const lvl = vipLevel();
  const perk = VIP_PERKS[lvl] || VIP_PERKS[1];
  return 1 + (perk.goldBonus / 100);
}

function vipVacuumRadius() {
  const lvl = vipLevel();
  const perk = VIP_PERKS[lvl] || VIP_PERKS[1];
  return perk.vacRadius || 350;
}

function vipAddExp(pts, reason) {
  const v = getVipState();
  if (v.lvl >= 10) return;
  v.exp += pts;
  if (reason) log(`👑 Tích lũy VIP: +${pts} điểm (${reason})`);
  
  // Kiem tra thang cap VIP
  while (v.lvl < 10 && v.exp >= VIP_EXP_TABLE[v.lvl + 1]) {
    v.lvl++;
    log(`<b style="color:#ffd700;font-size:13px;">🎉 Chúc mừng bạn đã thăng cấp VIP ${v.lvl} - ${VIP_PERKS[v.lvl].title}!</b>`);
    toast(`🎉 Thăng cấp VIP ${v.lvl}! Mở khóa đặc quyền mới!`);
    if (typeof uiSfx === 'function') uiSfx('learn');
  }
  updateVipTopBtn();
  save();
}

function updateVipTopBtn() {
  const btn = $('#vipBtn');
  if (btn) {
    const lvl = vipLevel();
    btn.innerHTML = `👑 VIP ${lvl}`;
  }
}

function claimDailyVip() {
  const v = getVipState();
  const t = typeof today === 'function' ? today() : new Date().toDateString();
  if (v.lastClaim === t) {
    toast('Hôm nay bạn đã nhận quà VIP rồi!');
    return;
  }
  v.lastClaim = t;
  const lvl = v.lvl;
  const gold = 5000 * lvl;
  const fd = 5 * lvl;
  S.gold = (S.gold || 0) + gold;
  if (typeof RW === 'function') RW().fd = (RW().fd || 0) + fd;
  
  // Tang them thuoc va bao ruong theo cap
  if (typeof potStock === 'function') {
    const st = potStock('life');
    st[Math.min(5, Math.ceil(lvl / 2))] = (st[Math.min(5, Math.ceil(lvl / 2))] || 0) + (5 * lvl);
  }
  if (lvl >= 3 && typeof forceSetItem === 'function') {
    const it = forceSetItem();
    if (it) addItem(it, true, true);
  }

  // Thuong them 100 diem VIP moi ngay
  vipAddExp(100, 'Điểm danh VIP mỗi ngày');
  
  toast(`🎁 Đã nhận Quà VIP ${lvl}: +${fmt(gold)} lượng, +${fd} Phúc Duyên!`);
  if (typeof uiSfx === 'function') uiSfx('learn');
  save();
  refresh();
  vipModal();
}

function trainVipWithGold() {
  const v = getVipState();
  if (v.lvl >= 10) {
    toast('Bạn đã đạt cấp VIP 10 Chí Tôn tối đa!');
    return;
  }
  const curLvl = Math.max(1, v.lvl);
  const cost = 800000000 * curLvl;
  if (S.gold < cost) {
    toast(`Không đủ ngân lượng! Cần ${fmt(cost)} lượng (800.000.000 x VIP ${curLvl}) để nhận +300 điểm VIP.`);
    return;
  }
  S.gold -= cost;
  vipAddExp(300, `Tu luyện ngân lượng (VIP ${curLvl})`);
  toast(`Tu luyện thành công! +300 điểm VIP (-${fmt(cost)} lượng).`);
  save();
  refresh();
  vipModal();
}

function vipModal() {
  const v = getVipState();
  const curLvl = v.lvl;
  const nextExp = curLvl < 10 ? VIP_EXP_TABLE[curLvl + 1] : VIP_EXP_TABLE[10];
  const prevExp = VIP_EXP_TABLE[curLvl] || 0;
  const pct = curLvl >= 10 ? 100 : Math.min(100, Math.floor((v.exp - prevExp) / (nextExp - prevExp) * 100));
  const t = typeof today === 'function' ? today() : new Date().toDateString();
  const claimed = v.lastClaim === t;
  const curTrainCost = 800000000 * Math.max(1, curLvl);

  let perkListHtml = '';
  for (let i = 1; i <= 10; i++) {
    const p = VIP_PERKS[i];
    const isCur = i === curLvl;
    const isUnlocked = i <= curLvl;
    perkListHtml += `
      <div style="border:1.5px solid ${isCur ? '#ffd700' : isUnlocked ? '#4ade80' : '#3d2f1d'};border-radius:6px;padding:8px 10px;background:${isCur ? 'rgba(212,175,55,0.15)' : 'rgba(18,14,10,0.85)'};margin-bottom:6px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <b style="color:${isCur ? '#ffd700' : isUnlocked ? '#4ade80' : '#888'};font-size:13px;">
            👑 VIP ${i} - ${p.title} ${isCur ? '<span style="font-size:10px;background:#ffd700;color:#000;padding:1px 4px;border-radius:3px;font-weight:bold;margin-left:4px;">HIỆN TẠI</span>' : ''}
          </b>
          <span style="font-size:10px;color:#a39276;">Yêu cầu: ${VIP_EXP_TABLE[i]} điểm</span>
        </div>
        <div style="font-size:11px;color:#cbd5e1;line-height:1.4;">
          ${p.features.map(f => `<div>• ${f}</div>`).join('')}
        </div>
      </div>
    `;
  }

  modal(`
    <div class="jx-client-window" style="margin:-14px;border:none;box-shadow:none;">
      <div class="jx-window-header">
        <div class="jx-window-title">
          <span>👑 ĐẶC QUYỀN VIP VÕ LÂM CHÍ TÔN</span>
        </div>
        <span style="font-size:11px;color:#ffd700;">Cấp: <b>VIP ${curLvl}</b></span>
      </div>
      
      <!-- VIP Status Card -->
      <div style="padding:10px 12px;background:linear-gradient(135deg, rgba(30,22,12,0.95), rgba(10,8,6,0.98));border-bottom:1px solid #5a4425;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:42px;height:42px;border:2px solid #ffd700;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle,#3d2f1d,#110d08);font-size:18px;">
              👑
            </div>
            <div>
              <b style="color:#ffd700;font-size:14px;">VIP ${curLvl} · ${VIP_PERKS[curLvl].title}</b>
              <div style="font-size:11px;color:#a39276;">Tiến độ: <b style="color:#4ade80;">${v.exp}</b> / ${curLvl < 10 ? nextExp : 'Tối đa'} điểm VIP</div>
            </div>
          </div>
          <div>
            <button class="jx-action-btn ${claimed ? '' : 'gold'}" id="bClaimVip" style="padding:5px 12px;font-size:11px;" ${claimed ? 'disabled' : ''}>
              ${claimed ? '✔ Đã nhận quà' : '🎁 Nhận Quà Ngày'}
            </button>
          </div>
        </div>
        <div class="bar xp" style="height:10px;margin-bottom:6px;">
          <i style="width:${pct}%;background:linear-gradient(90deg,#eab308,#facc15);"></i>
          <span style="font-size:9px;">${pct}%</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:10px;color:#cbd5e1;">Quy đổi: 300 điểm VIP = 800.000.000 x Cấp VIP (${fmt(curTrainCost)} lượng)</span>
          <button class="jx-action-btn" id="bTrainVip" style="padding:2px 8px;font-size:10px;">
            ⚡ Tu luyện (+300 điểm / ${fmt(curTrainCost)} lượng)
          </button>
        </div>
      </div>

      <!-- Perks List -->
      <div style="padding:10px 12px;max-height:50vh;overflow-y:auto;">
        ${perkListHtml}
      </div>

      <div style="padding:8px 12px;border-top:1px solid #3d2f1d;background:#0d0a07;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#a39276;">
        <span>Kiếm thêm điểm VIP: Vượt ải, Đánh Boss, Leo tháp, Sinh tồn!</span>
        <button class="jx-action-btn" onclick="closeModal();">Đóng</button>
      </div>
    </div>
  `, () => {
    const bc = $('#bClaimVip');
    if (bc) bc.onclick = claimDailyVip;
    const bt = $('#bTrainVip');
    if (bt) bt.onclick = trainVipWithGold;
  });
}

/* ==========================================================================
   2. HE THONG PHO BAN KIEM VUC (DUNGEON CHALLENGE)
   ========================================================================== */
const DUNGEONS = [
  {
    id: 'thienlao',
    name: 'Thiên Lao Mật Đạo',
    desc: 'Hầm ngục ngầm giam giữ các trọng phạm giang hồ, đầy rẫy bẫy ngầm và đao phủ.',
    reqLvl: 20,
    bossLvl: 30,
    bossName: 'Ác Tăng Hộ Pháp',
    series: 0, // Kim
    icon: '🏰',
    drops: 'Nhiều Kim Sáng Dược, Đồ Xanh Cực Phẩm, 3000 Lượng, Bí Kíp'
  },
  {
    id: 'vanhoa',
    name: 'Vạn Hoa Cốc Trận',
    desc: 'Mê cung hoa độc huyền bí, kỳ hoa dị thảo tỏa hương độc sát thương người xâm nhập.',
    reqLvl: 40,
    bossLvl: 50,
    bossName: 'Tuyệt Tình Cốc Chủ',
    series: 1, // Moc
    icon: '🌸',
    drops: 'Rượu Nữ Nhi Hồng, Bí Kíp Tinh Anh, Đá Giám Định, 6000 Lượng'
  },
  {
    id: 'duocvuong',
    name: 'Dược Vương Cấm Địa',
    desc: 'Cấm địa ngàn năm của Dược Vương Thần Y, canh giữ bởi kiếm ma điên cuồng.',
    reqLvl: 60,
    bossLvl: 70,
    bossName: 'Độc Cô Kiếm Ma',
    series: 3, // Hoa
    icon: '🌿',
    drops: 'Thảo Dược Thần Mã, Đồ Hoàng Kim Môn Phái, 12,000 Lượng'
  },
  {
    id: 'kiemtrung',
    name: 'Kiếm Trũng Cổ Mộ',
    desc: 'Nơi chôn cất vạn thanh bảo kiếm cổ xưa, tàn tích của bậc tiền bối kiếm thuật đỉnh cao.',
    reqLvl: 80,
    bossLvl: 90,
    bossName: 'Vô Danh Kiếm Thánh',
    series: 4, // Tho
    icon: '⚔️',
    drops: 'Thần Binh Tối Thượng, Mảnh Bạch Kim, Rương Phúc Duyên Đại, 25,000 Lượng'
  }
];

function getDungeonState() {
  if (!S.dungeonState || typeof S.dungeonState !== 'object') {
    S.dungeonState = { tickets: 3, lastDate: '', cleared: {} };
  }
  const t = typeof today === 'function' ? today() : new Date().toDateString();
  if (S.dungeonState.lastDate !== t) {
    const vipBonusTickets = vipLevel() >= 4 ? 2 : (vipLevel() >= 2 ? 1 : 0);
    S.dungeonState.tickets = 3 + vipBonusTickets;
    S.dungeonState.lastDate = t;
  }
  return S.dungeonState;
}

function dungeonStart(dId) {
  const d = DUNGEONS.find(x => x.id === dId);
  if (!d) return;
  if (S.lvl < d.reqLvl) {
    toast(`Cần đạt đẳng cấp ${d.reqLvl} để tiến vào ${d.name}!`);
    return;
  }
  const ds = getDungeonState();
  if (ds.tickets <= 0) {
    toast('Hôm nay đã hết lượt đi Phó Bản! Nâng VIP để nhận thêm lượt.');
    return;
  }
  ds.tickets--;
  save();

  if (R.town && typeof backFromTown === 'function') backFromTown();
  closeModal(true);

  // Thiet lap tran dau Pho Ban
  R.dungeon = {
    cfg: d,
    wave: 1,
    maxWave: 3,
    kills: 0
  };
  R.enemies = [];
  R.corpses = [];
  R.spawnT = 0.5;

  R.banner = {
    t: 2.5,
    text: `🏰 ${d.name}`,
    sub: `Tiêu diệt thủ vệ để triệu hồi ${d.bossName}!`
  };
  log(`<b style="color:#f59e0b;">Tiến vào phó bản ${d.name}! Tiêu diệt quái thủ hộ.</b>`);
  toast(`Tiến vào ${d.name}!`);
}

function dungeonSpawn() {
  if (!R.dungeon) return;
  const d = R.dungeon.cfg;
  R.enemies = [];
  R.stall = 0;

  if (R.dungeon.wave < R.dungeon.maxWave) {
    // Wave quai tinh anh
    const n = 4;
    for (let i = 0; i < n; i++) {
      const [x, y] = inWorld(H.x + rnd(-260, 260), H.y + rnd(-200, 200));
      const z = ZONES[Math.min(ZONES.length - 1, Math.floor(d.bossLvl / 10))];
      const monId = pick(z.m);
      const en = makeEnemy(monId, d.bossLvl - 4, 'elite', x, y);
      en.n = `Thủ Vệ · ${en.n}`;
      R.enemies.push(en);
    }
    R.banner = { t: 1.5, text: `Đợt ${R.dungeon.wave}/${R.dungeon.maxWave}`, sub: 'Quét sạch thủ vệ ngục tối' };
  } else {
    // Wave Boss cuoi
    const [x, y] = inWorld(H.x + 180, H.y - 100);
    const z = ZONES[Math.min(ZONES.length - 1, Math.floor(d.bossLvl / 10))];
    const en = makeEnemy(z.boss, d.bossLvl, 'boss', x, y);
    en.n = `Trùm Phó Bản · ${d.bossName}`;
    en.hp = en.max = en.max * 2.5;
    en.dmg *= 1.25;
    en.dungeonBoss = true;
    R.enemies.push(en);
    R.banner = { t: 2.5, text: `⚠️ ${d.bossName} Xuất Hiện!`, sub: 'Quyết chiến sinh tử trảm trùm ngục tối' };
    log(`<b style="color:#ef4444;font-size:13px;">⚠️ ${d.bossName} đã xuất hiện! Toàn lực quyết chiến!</b>`);
  }
}

function dungeonClearedWave() {
  if (!R.dungeon) return;
  if (R.dungeon.wave < R.dungeon.maxWave) {
    R.dungeon.wave++;
    R.spawnT = 1.2;
    heal(R.P.life * 0.3, true);
    R.mana = Math.min(R.P.mana, R.mana + R.P.mana * 0.3);
  } else {
    // Hoan thanh pho ban!
    dungeonFinish(true);
  }
}

function dungeonFinish(victory) {
  if (!R.dungeon) return;
  const d = R.dungeon.cfg;
  if (victory) {
    log(`<b style="color:#4ade80;font-size:14px;">🎉 Chúc mừng bạn đã phá tan Phó Bản ${d.name}!</b>`);
    R.banner = { t: 3, text: '🎉 PHÁ ĐẢO PHÓ BẢN!', sub: `Hạ gục ${d.bossName}` };
    
    // Thuong
    const goldReward = 5000 + d.bossLvl * 200;
    const fdReward = 10 + Math.floor(d.bossLvl / 5);
    S.gold += goldReward;
    if (typeof RW === 'function') RW().fd = (RW().fd || 0) + fdReward;
    vipAddExp(60, `Vượt phó bản ${d.name}`);
    
    // Roi do hoang kim
    if (typeof forceSetItem === 'function') {
      const it = forceSetItem();
      if (it) addItem(it, true, true);
    }
    toast(`Vượt thành công ${d.name}: +${fmt(goldReward)} lượng, +${fdReward} Phúc Duyên!`);
  } else {
    log(`Gục ngã tại phó bản ${d.name}. Hãy cường hóa trang bị và thử lại.`);
  }
  R.dungeon = null;
  R.enemies = [];
  S.wave = 1;
  R.spawnT = 0.5;
  save();
  refresh();
}

/* ==========================================================================
   3. HOAT DONG HUB TONG HOP (ACTIVITY CENTRAL HUB)
   ========================================================================== */
function openActivityHub() {
  const ds = getDungeonState();
  const tb = (typeof RW === 'function' && RW().stat) ? (RW().stat.towerBest || 0) : 0;
  const curFloor = R.tower ? R.tower.floor : (tb > 0 ? tb : 1);
  const vipLv = vipLevel();

  const dungeonsHtml = DUNGEONS.map(d => {
    const locked = S.lvl < d.reqLvl;
    return `
      <div style="background:rgba(20,16,12,0.85);border:1.5px solid ${locked ? '#3d2f1d' : SERIES_COL[d.series]};border-radius:6px;padding:8px 10px;display:flex;justify-content:space-between;align-items:center;opacity:${locked ? '0.6' : '1'};">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="font-size:24px;">${d.icon}</div>
          <div>
            <b style="color:${SERIES_COL[d.series]};font-size:12.5px;">${d.name}</b>
            <div style="font-size:10.5px;color:#cbd5e1;">Yêu cầu cấp ${d.reqLvl} · Boss: <span style="color:#ffd700;">${d.bossName}</span> (Lv.${d.bossLvl})</div>
            <div style="font-size:10px;color:#a39276;margin-top:2px;">Rơi: ${d.drops}</div>
          </div>
        </div>
        <div>
          ${locked 
            ? `<span style="font-size:11px;color:#ef4444;font-weight:bold;">Cấp ${d.reqLvl}</span>` 
            : `<button class="jx-action-btn gold" onclick="dungeonStart('${d.id}');">Vào Ải</button>`}
        </div>
      </div>
    `;
  }).join('');

  modal(`
    <div class="jx-client-window" style="margin:-14px;border:none;box-shadow:none;">
      <div class="jx-window-header">
        <div class="jx-window-title">
          <span>⚔️ HOẠT ĐỘNG GIANG HỒ & PHÓ BẢN</span>
        </div>
        <span style="font-size:11px;color:#ffd700;">Lượt ngục hôm nay: <b style="color:#4ade80;">${ds.tickets}</b></span>
      </div>

      <div style="padding:10px 12px;max-height:62vh;overflow-y:auto;display:flex;flex-direction:column;gap:10px;">
        
        <!-- CARD 1: VAN TRUNG THAP (LEO THAP) -->
        <div style="background:linear-gradient(135deg,rgba(35,25,15,0.9),rgba(15,12,8,0.95));border:1.5px solid #d4af37;border-radius:6px;padding:10px;box-shadow:0 4px 12px rgba(0,0,0,0.5);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:20px;">🗼</span>
              <div>
                <b style="color:#ffd700;font-size:13px;">Vạn Trùng Tháp (Leo Tháp)</b>
                <div style="font-size:11px;color:#a39276;">Kỷ lục vượt: Tầng <b style="color:#4ade80;">${tb}</b> · Quái cấp ${typeof towerLevel === 'function' ? towerLevel(tb || 1) : 10}</div>
              </div>
            </div>
            <div style="display:flex;gap:4px;">
              ${tb > 3 ? `<button class="jx-action-btn" id="bSweepTower">⚡ Quét Tháp</button>` : ''}
              <button class="jx-action-btn gold" id="bStartTower">${R.tower ? 'Đang Leo Tháp' : '⚔ Khiêu Chiến'}</button>
            </div>
          </div>
          <div style="font-size:11px;color:#cbd5e1;line-height:1.4;">
            Leo từng tầng tháp tiêu diệt đại ma đầu để đoạt Đồ Hoàng Kim, Phúc Duyên và điểm VIP. Cứ mỗi 5 tầng sẽ có Thủ Lĩnh Hoàng Kim canh giữ!
          </div>
        </div>

        <!-- CARD 2: KIEM VU SINH TON (10 PHUT) -->
        <div style="background:linear-gradient(135deg,rgba(25,20,35,0.9),rgba(12,8,18,0.95));border:1.5px solid #a855f7;border-radius:6px;padding:10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:20px;">⚔️</span>
              <div>
                <b style="color:#c084fc;font-size:13px;">Kiếm Vũ Sinh Tồn (10 Phút)</b>
                <div style="font-size:11px;color:#a39276;">Đấu trường vạn quái bao vây phong cách Ma Vương Kiếm Thế</div>
              </div>
            </div>
            <button class="jx-action-btn gold" id="bStartSv">Bắt Đầu</button>
          </div>
          <div style="font-size:11px;color:#cbd5e1;line-height:1.4;">
            Sống sót 10 phút trước biển quái vật khổng lồ! Thu thập ngọc EXP, thăng cấp nội công, bão kiếm, ném bom để càn quét và đoạt rương báu cực đại.
          </div>
        </div>

        <!-- CARD 3: SAN TRUM HOANG KIM THE GIOI -->
        <div style="background:linear-gradient(135deg,rgba(40,15,15,0.9),rgba(18,8,8,0.95));border:1.5px solid #ef4444;border-radius:6px;padding:10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:20px;">👑</span>
              <div>
                <b style="color:#f87171;font-size:13px;">Trùm Hoàng Kim Thế Giới</b>
                <div style="font-size:11px;color:#a39276;">Khiêu chiến 6 Đại Cao Thủ Hoàng Kim: Cổ Hàn Y, Lam Y Y...</div>
              </div>
            </div>
            <button class="jx-action-btn gold" id="bOpenBoss">Săn Trùm</button>
          </div>
          <div style="font-size:11px;color:#cbd5e1;">
            Hạ gục các cao thủ Hoàng Kim để nhận Đồ Bộ Hoàng Kim, Thảo Dược Thần Mã và Rượu Nữ Nhi Hồng.
          </div>
        </div>

        <!-- CARD 4: HE THONG PHO BAN KIEM VUC -->
        <div style="display:flex;flex-direction:column;gap:6px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <b style="color:#ffd700;font-size:12px;">🏰 Phó Bản Kiếm Vực Cổ Mộ:</b>
            <span style="font-size:10.5px;color:#a39276;">Mỗi ngày 3 lượt (+2 lượt cho VIP)</span>
          </div>
          ${dungeonsHtml}
        </div>

      </div>

      <div style="padding:8px 12px;border-top:1px solid #3d2f1d;background:#0d0a07;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:11px;color:#ffd700;">Đặc quyền VIP ${vipLv}: Tăng thêm lượt đi và tỷ lệ rớt đồ cực phẩm!</span>
        <button class="jx-action-btn" onclick="closeModal();">Đóng</button>
      </div>
    </div>
  `, () => {
    const bt = $('#bStartTower');
    if (bt) bt.onclick = () => { if (typeof towerStart === 'function') towerStart(); };
    const bst = $('#bSweepTower');
    if (bst) bst.onclick = sweepTower;
    const bsv = $('#bStartSv');
    if (bsv) bsv.onclick = () => { closeModal(true); if (typeof svStart === 'function') svStart(); };
    const bb = $('#bOpenBoss');
    if (bb) bb.onclick = () => { if (typeof bossModal === 'function') bossModal(); };
  });
}

function sweepTower() {
  const tb = (typeof RW === 'function' && RW().stat) ? (RW().stat.towerBest || 0) : 0;
  if (tb <= 1) {
    toast('Chưa có tầng tháp nào để quét! Hãy khiêu chiến tháp trước.');
    return;
  }
  const gold = tb * 500;
  const fd = Math.floor(tb / 2);
  S.gold += gold;
  if (typeof RW === 'function') RW().fd = (RW().fd || 0) + fd;
  vipAddExp(30, 'Quét tháp thử thách');
  toast(`⚡ Quét nhanh ${tb} tầng tháp thành công: +${fmt(gold)} lượng, +${fd} Phúc Duyên!`);
  if (typeof uiSfx === 'function') uiSfx('learn');
  save();
  refresh();
  openActivityHub();
}

/* Auto hook buttons on launch */
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      if (typeof window.S !== 'undefined' && window.S) {
        updateVipTopBtn();
      }
      const vb = $('#vipBtn');
      if (vb) vb.onclick = () => { if (typeof uiSfx === 'function') uiSfx('click'); vipModal(); };
      const ab = $('#actBtn');
      if (ab) ab.onclick = () => { if (typeof uiSfx === 'function') uiSfx('click'); openActivityHub(); };
    }, 150);
  });
}
