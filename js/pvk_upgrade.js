/* ==========================================================================
   PVK UPGRADE SYSTEM (Nang cap Phong Van Kiem x64 cho Vo Lam Web Idle)
   Bao gom 5 Module lon:
   1. He thong Dong Hanh (Partner / Pet) chuyen sau Ngu Hanh & Tien Hoa 3 bac
   2. Mon phai Hoa Son (Huashan) & Chuyen Phai Tay Tuy
   3. He thong Lua Trai & Ruou Nu Nhi Hong (Campfire & Wine EXP Boost)
   4. He thong Tien Hoa Than Ma 11 Bac (Mount Progression)
   5. Khieu Chien Boss Hoang Kim The Gioi (World Golden Boss Challenge)
   ========================================================================== */
'use strict';

/* ==========================================================================
   MODULE 1: HE THONG DONG HANH (PET / PARTNER) CHUAN PVK
   ========================================================================== */
const PVK_PETS = {
  loikiem: {
    id: 'loikiem',
    n: 'Lôi Kiếm',
    series: 0, // Kim
    elem: 'phys',
    elemCol: '#f3d35b',
    icon: 'img/s/321.png',
    anim: 'ani049',
    desc: 'Linh vật hệ Kim chí tôn, kiếm khí lôi đình sắc bén như chớp giật.',
    skillN: 'Lôi Động Cửu Thiên',
    skillDesc: 'Kiếm khí kèm lôi sát đánh trúng nhiều mục tiêu, làm choáng đối thủ.',
    stages: [
      { name: 'Thiếu Niên Lôi Kiếm', reqLvl: 1, mul: 1.0 },
      { name: 'Thanh Niên Lôi Kiếm', reqLvl: 30, mul: 1.5 },
      { name: 'Thành Niên Lôi Kiếm', reqLvl: 60, mul: 2.2 }
    ],
    calcBuff(p) {
      const m = petStageMul(p);
      return {
        addphysicsdamage_p: [[Math.round((10 + (p.str || 0) * 0.5) * m), -1, 0]],
        deadlystrikeenhance_p: [[Math.round((5 + (p.dex || 0) * 0.3) * m), -1, 0]],
        attackratingenhance_p: [[Math.round((20 + (p.dex || 0) * 0.8) * m), -1, 0]]
      };
    }
  },
  tieudao: {
    id: 'tieudao',
    n: 'Tiêu Dao Nhi',
    series: 1, // Mộc
    elem: 'poison',
    elemCol: '#6fd46a',
    icon: 'img/s/343.png',
    anim: 'ani052',
    desc: 'Dược đồng hệ Mộc thông tuệ, di chuyển thoăn thoắt, độc thuật tinh thông.',
    skillN: 'Huyền Âm Độc Khí',
    skillDesc: 'Phóng phấn độc làm giảm tốc và rút máu quái vật liên tục.',
    stages: [
      { name: 'Thiếu Niên Tiêu Dao', reqLvl: 1, mul: 1.0 },
      { name: 'Thanh Niên Tiêu Dao', reqLvl: 30, mul: 1.5 },
      { name: 'Thành Niên Tiêu Dao', reqLvl: 60, mul: 2.2 }
    ],
    calcBuff(p) {
      const m = petStageMul(p);
      return {
        attackspeed_v: [[Math.round((10 + (p.dex || 0) * 0.4) * m), -1, 0]],
        fastwalkrun_p: [[Math.round((8 + (p.dex || 0) * 0.3) * m), -1, 0]],
        poisontimereduce_p: [[Math.round((15 + (p.vit || 0) * 0.4) * m), -1, 0]]
      };
    }
  },
  nguyetnhi: {
    id: 'nguyetnhi',
    n: 'Nguyệt Nhi',
    series: 2, // Thủy
    elem: 'cold',
    elemCol: '#5fb8ff',
    icon: 'img/s/80.png',
    anim: 'ani013',
    desc: 'Băng Tuyết tiên linh thuần khiết, ngưng sương hộ thể thanh tâm trừ tà.',
    skillN: 'Băng Ngưng Sương Hoa',
    skillDesc: 'Băng sát cực hàn đóng băng và làm chậm toàn bộ kẻ địch xung quanh.',
    stages: [
      { name: 'Thiếu Niên Nguyệt Nhi', reqLvl: 1, mul: 1.0 },
      { name: 'Thanh Niên Nguyệt Nhi', reqLvl: 30, mul: 1.5 },
      { name: 'Thành Niên Nguyệt Nhi', reqLvl: 60, mul: 2.2 }
    ],
    calcBuff(p) {
      const m = petStageMul(p);
      return {
        lifemax_p: [[Math.round((12 + (p.vit || 0) * 0.5) * m), -1, 0]],
        coldres_p: [[Math.round((15 + (p.eng || 0) * 0.4) * m), -1, 0]],
        allres_p: [[Math.round((5 + (p.eng || 0) * 0.25) * m), -1, 0]]
      };
    }
  },
  viemtuong: {
    id: 'viemtuong',
    n: 'Viêm Tướng',
    series: 3, // Hỏa
    elem: 'fire',
    elemCol: '#ff6a3a',
    icon: 'img/s/124.png',
    anim: 'ani015',
    desc: 'Hỏa diệm chiến linh cuồng nhiệt, sát thương bùng nổ tựa núi lửa trào dâng.',
    skillN: 'Liệt Hỏa Liêu Nguyên',
    skillDesc: 'Bão lửa thiêu rụi kẻ địch, chuyển hóa sát thương thành sinh lực.',
    stages: [
      { name: 'Thiếu Niên Viêm Tướng', reqLvl: 1, mul: 1.0 },
      { name: 'Thanh Niên Viêm Tướng', reqLvl: 30, mul: 1.5 },
      { name: 'Thành Niên Viêm Tướng', reqLvl: 60, mul: 2.2 }
    ],
    calcBuff(p) {
      const m = petStageMul(p);
      return {
        addfiremagic_v: [[Math.round((20 + (p.eng || 0) * 0.8) * m), -1, 0]],
        steallife_p: [[Math.round((3 + (p.str || 0) * 0.15) * m), -1, 0]],
        adddefense_p: [[Math.round((10 + (p.dex || 0) * 0.4) * m), -1, 0]]
      };
    }
  },
  thachma: {
    id: 'thachma',
    n: 'Thạch Ma',
    series: 4, // Thổ
    elem: 'light',
    elemCol: '#c8965a',
    icon: 'img/s/160.png',
    anim: 'ani025',
    desc: 'Càn Khôn Thạch Linh ngàn năm, thể phách kiên cố bất khả xâm phạm.',
    skillN: 'Địa Liệt Sơn Băng',
    skillDesc: 'Chấn động mặt đất gây choáng váng và phản đòn công kích đối thủ.',
    stages: [
      { name: 'Thiếu Niên Thạch Ma', reqLvl: 1, mul: 1.0 },
      { name: 'Thanh Niên Thạch Ma', reqLvl: 30, mul: 1.5 },
      { name: 'Thành Niên Thạch Ma', reqLvl: 60, mul: 2.2 }
    ],
    calcBuff(p) {
      const m = petStageMul(p);
      return {
        lifemax_v: [[Math.round((120 + (p.vit || 0) * 8) * m), -1, 0]],
        sorbdamage_p: [[Math.round((5 + (p.vit || 0) * 0.25) * m), -1, 0]],
        meleedamagereturn_p: [[Math.round((8 + (p.str || 0) * 0.3) * m), -1, 0]]
      };
    }
  }
};

function petStage(p) {
  if (!p) return 0;
  return p.lvl >= 60 ? 2 : p.lvl >= 30 ? 1 : 0;
}

function petStageMul(p) {
  const st = petStage(p);
  return st === 2 ? 2.2 : st === 1 ? 1.5 : 1.0;
}

function petStageName(p) {
  const cfg = PVK_PETS[p.id || 'loikiem'] || PVK_PETS.loikiem;
  const st = petStage(p);
  return cfg.stages[st].name;
}

function partnerAttr(A) {
  if (!S || !S.rw || !S.rw.pet) return;
  const p = S.rw.pet;
  const cfg = PVK_PETS[p.id || 'loikiem'] || PVK_PETS.loikiem;
  if (!cfg.calcBuff) return;
  const buffs = cfg.calcBuff(p);
  for (const name in buffs) {
    for (const val of buffs[name]) {
      addAttr(A, name, val);
    }
  }
}

function petGainXp(n) {
  if (!S || !S.rw || !S.rw.pet) return;
  const p = S.rw.pet;
  p.xp = (p.xp || 0) + n;
  const need = 20 + (p.lvl || 1) * 15;
  if (p.xp >= need && p.lvl < 99) {
    p.xp -= need;
    p.lvl++;
    p.pts = (p.pts || 0) + 4;
    const oldStage = p.lvl === 30 ? 0 : p.lvl === 60 ? 1 : -1;
    if (oldStage !== -1) {
      toast(`⭐ Đồng hành đã TIẾN HÓA lên ${petStageName(p)}!`);
      log(`<b class="up">⭐ Đồng hành tiến hóa lên ${petStageName(p)}!</b>`);
      p.pts += 15; // Thuong them diem khi dot pha giai doan
    } else {
      log(`Đồng hành ${esc(p.n || 'Đồng hành')} lên cấp ${p.lvl}! (+4 tiềm năng)`);
    }
    if (R) R.dirty = true;
  }
}

function petDmg(p) {
  const mul = petStageMul(p);
  const base = 12 + (p.lvl || 1) * 8 + (p.str || 10) * 3 + (p.eng || 10) * 2;
  const reb = typeof rebornBonus === 'function' ? (1 + rebornBonus().dmg) : 1;
  return Math.round(base * mul * reb);
}

function petTick(dt) {
  const p = S.rw && S.rw.pet;
  if (!p || R.town) { R.petPos = null; return; }
  const cfg = PVK_PETS[p.id || 'loikiem'] || PVK_PETS.loikiem;
  const pp = R.petPos || (R.petPos = { x: H.x - 32, y: H.y + 12, t: 0, act: 'st', actT: 0, dir: 0 });
  const t = alive().sort((a, b) => Math.hypot(a.x - pp.x, a.y - pp.y) - Math.hypot(b.x - pp.x, b.y - pp.y))[0];
  const goal = t || { x: H.x - 36, y: H.y + 12 };
  const d = Math.hypot(goal.x - pp.x, goal.y - pp.y);
  const reach = t ? t.r + 20 : 10;
  pp.moving = d > reach;
  if (pp.moving) {
    const k = Math.min(1, 180 * dt / d);
    pp.dir = dirOf(goal.x - pp.x, goal.y - pp.y);
    pp.x += (goal.x - pp.x) * k;
    pp.y += (goal.y - pp.y) * k;
  }
  if (Math.hypot(H.x - pp.x, H.y - pp.y) > 450) {
    pp.x = H.x - 30; pp.y = H.y + 10;
  }
  pp.t -= dt;
  if (t && !pp.moving && pp.t <= 0) {
    pp.t = 1.1; // Gioi han tan cong Pet
    const dmg = petDmg(p);
    t.hp -= dmg;
    t.hitT = 0.12;
    pp.act = 'at';
    pp.actT = 0;
    pp.dir = dirOf(t.x - pp.x, t.y - pp.y);
    addText(t.x, t.y - 32, fmt(dmg) + ' 🐾', cfg.elemCol, 12);
    // Hieu ung doc mon cua Pet theo he
    if (cfg.series === 0 && Math.random() < 0.25) { t.stun = 0.8; addText(t.x, t.y - 48, 'Choáng!', '#f3d35b', 11); }
    else if (cfg.series === 1 && Math.random() < 0.35) { t.poison = 3; t.poisonDmg = Math.round(dmg * 0.25); addText(t.x, t.y - 48, 'Trúng độc!', '#6fd46a', 11); }
    else if (cfg.series === 2 && Math.random() < 0.30) { t.spd = Math.max(10, (t.spd || 30) * 0.6); addText(t.x, t.y - 48, 'Làm chậm!', '#5fb8ff', 11); }
    else if (cfg.series === 3 && Math.random() < 0.25) { heal(Math.round(dmg * 0.15), true); addText(H.x, H.y - 35, '+' + Math.round(dmg * 0.15), '#ff6a3a', 11); }
  }
}

function drawPet(c, dt) {
  if (!window.S || !S.rw) return;
  const p = S.rw.pet, pp = R.petPos;
  if (!p || !pp) return;
  const cfg = PVK_PETS[p.id || 'loikiem'] || PVK_PETS.loikiem;
  pp.animKey = cfg.anim;
  stepAct(pp, dt, pp.moving ? 'run' : 'st');
  if (pp.act !== 'at') setAct(pp, pp.moving ? 'run' : 'st');

  // Hao quang bac tien hoa
  const st = petStage(p);
  c.fillStyle = '#0007';
  c.beginPath();
  c.ellipse(pp.x, pp.y, 11 + st * 2, 4 + st, 0, 0, 7);
  c.fill();

  if (st > 0) {
    c.strokeStyle = cfg.elemCol;
    c.lineWidth = st === 2 ? 2 : 1;
    c.globalAlpha = 0.65;
    c.beginPath();
    c.arc(pp.x, pp.y - 12, 14 + st * 4, 0, 7);
    c.stroke();
    c.globalAlpha = 1;
  }

  drawAnim(pp.animKey, pp.act || 'st', pp.dir || 0, pp.actT || 0, pp.x, pp.y, (0.75 + st * 0.15) * MON_SCALE);
  label(pp.x, pp.y - 42 - st * 4, `${p.n || cfg.n} · Lv${p.lvl}`, cfg.elemCol, 10, -1);
}

function petAdopt(petKey) {
  const cfg = PVK_PETS[petKey];
  if (!cfg) return;
  const old = RW().pet;
  RW().pet = {
    id: petKey,
    n: cfg.n,
    series: cfg.series,
    lvl: old ? old.lvl : 1,
    xp: old ? old.xp : 0,
    str: old ? old.str : 10,
    dex: old ? old.dex : 10,
    vit: old ? old.vit : 10,
    eng: old ? old.eng : 10,
    pts: old ? old.pts : 0
  };
  R.petPos = null;
  R.dirty = true;
  toast('Đã chiêu mộ: ' + cfg.n);
  save();
  refreshGift();
}

function petAddAttr(attrKey) {
  const p = RW().pet;
  if (!p || (p.pts || 0) <= 0) return;
  p.pts--;
  p[attrKey] = (p[attrKey] || 10) + 1;
  R.dirty = true;
  save();
  refreshGift();
}

function petResetAttr() {
  const p = RW().pet;
  if (!p) return;
  const total = (p.str - 10) + (p.dex - 10) + (p.vit - 10) + (p.eng - 10) + (p.pts || 0);
  p.str = 10; p.dex = 10; p.vit = 10; p.eng = 10;
  p.pts = total;
  R.dirty = true;
  toast('Đã tẩy tủy điểm tiềm năng Đồng Hành!');
  save();
  refreshGift();
}

function petAutoAttr() {
  const p = RW().pet;
  if (!p || (p.pts || 0) <= 0) return;
  const cfg = PVK_PETS[p.id || 'loikiem'] || PVK_PETS.loikiem;
  while (p.pts > 0) {
    if (cfg.series === 0) p.str = (p.str || 10) + 1;
    else if (cfg.series === 1) p.dex = (p.dex || 10) + 1;
    else if (cfg.series === 2) p.vit = (p.vit || 10) + 1;
    else if (cfg.series === 3) p.eng = (p.eng || 10) + 1;
    else p.vit = (p.vit || 10) + 1;
    p.pts--;
  }
  R.dirty = true;
  toast('Đã tự động cộng tiềm năng theo hệ!');
  save();
  refreshGift();
}

function petRename() {
  const p = RW().pet;
  if (!p) return;
  const name = prompt('Nhập tên mới cho Đồng Hành:', p.n);
  if (name && name.trim()) {
    p.n = name.trim().slice(0, 16);
    toast('Đã đổi tên: ' + p.n);
    save();
    refreshGift();
  }
}

/* ==========================================================================
   MODULE 3: HE THONG LUA TRAI & RUOU NU NHI HONG (CAMPFIRE & WINE)
   ========================================================================== */
function pvkEnsureCamp() {
  if (!S) return;
  if (!S.camp) {
    S.camp = { wood: 5, wine: 2, fireT: 0, wineT: 0, fireX: 0, fireY: 0 };
  }
}

function campExpMul() {
  pvkEnsureCamp();
  const c = S.camp;
  let mul = 1;
  const numFires = (typeof R !== 'undefined' && R && R.campfires) ? R.campfires.length : 0;
  if (numFires > 0) {
    mul += numFires * 0.10; // mỗi lửa trại + 10% exp từ quái, có cộng dồn (tối đa 3 đống = +30%)
  } else if (c && c.fireT > 0) {
    mul += 0.10;
  }
  if (c && c.wineT > 0) mul *= 2; // Ruou Nu Nhi Hong: them x2 EXP
  return mul;
}

function campAttr(A) {
  pvkEnsureCamp();
  const c = S.camp;
  if (c.wineT > 0) {
    addAttr(A, 'lucky_v', [30, 0, 0]); // Ruou tang +30% may man
  }
  const numFires = (typeof R !== 'undefined' && R && R.campfires) ? R.campfires.length : 0;
  if (numFires > 0 || c.fireT > 0) {
    addAttr(A, 'lifereplenish_p', [100, 0, 0]); // Am ap lua trai tang hoi phuc
  }
}

function campLight() {
  pvkEnsureCamp();
  const c = S.camp;
  if (c.wood <= 0) {
    toast('Cần Gỗ Đốt Lửa! Đánh quái dã ngoại hoặc mua tại Tiệm.');
    return;
  }
  c.wood--;
  c.fireT = 300; // 5 phut
  c.fireX = H.x;
  c.fireY = H.y;
  toast('🔥 Đã đốt Lửa Trại ấm áp! Nhận x2 EXP trong 5 phút.');
  log('<b class="up">🔥 Đã đốt Lửa Trại ấm áp (x2 EXP trong 5 phút)!</b>');
  if (R) R.dirty = true;
  save();
  updateCampHud();
}

function campDrink() {
  pvkEnsureCamp();
  const c = S.camp;
  if (c.wine <= 0) {
    toast('Cần Rượu Nữ Nhi Hồng! Đánh quái hoặc tham gia sự kiện.');
    return;
  }
  c.wine--;
  c.wineT = 600; // 10 phut
  toast('🍶 Đã uống Nữ Nhi Hồng! Nhận thêm x2 EXP & +30 May Mắn trong 10 phút.');
  log('<b class="up">🍶 Uống Rượu Nữ Nhi Hồng (+100% EXP, +30 May Mắn trong 10 phút)!</b>');
  if (R) R.dirty = true;
  save();
  updateCampHud();
}

function campTick(dt) {
  pvkEnsureCamp();
  // Đếm ngược thời gian các đống lửa trại xuất hiện từ Boss Xanh
  if (typeof R !== 'undefined' && R && R.campfires && R.campfires.length > 0) {
    for (let i = R.campfires.length - 1; i >= 0; i--) {
      const f = R.campfires[i];
      f.dur -= dt;
      if (f.dur <= 0) {
        R.campfires.splice(i, 1);
        log('<span class="dim">Một đống lửa trại đã tàn.</span>');
        if (R) R.dirty = true;
      }
    }
    // Hồi phục sinh lực nhẹ khi có lửa trại (0.5% mỗi giây mỗi đống lửa)
    if (R.P && R.campfires.length > 0) {
      heal(R.P.life * 0.005 * R.campfires.length * dt, true);
      R.mana = Math.min(R.P.mana, R.mana + R.P.mana * 0.005 * R.campfires.length * dt);
    }
  }

  const c = S.camp;
  if (c && c.wineT > 0) {
    c.wineT = Math.max(0, c.wineT - dt);
    if (c.wineT === 0) {
      log('<span class="dim">Hơi rượu đã tan.</span>');
      if (R) R.dirty = true;
    }
  }
  updateCampHud();
}

let _campImg = null;
function drawCampfire(c, dt) {
  if (typeof R === 'undefined' || !R || !R.campfires || !R.campfires.length) return;

  if (!_campImg) {
    _campImg = new Image();
    _campImg.src = 'img/a/domlua.png';
  }

  for (let idx = 0; idx < R.campfires.length; idx++) {
    const f = R.campfires[idx];
    const x = f.x, y = f.y;

    // Vang sang vang cam lap lanh xung quanh dong lua
    const pulse = Math.sin((Date.now() + idx * 750) * 0.006);
    const glow = 42 + pulse * 6;
    const grad = c.createRadialGradient(x, y - 10, 8, x, y - 10, glow);
    grad.addColorStop(0, 'rgba(255, 170, 40, 0.45)');
    grad.addColorStop(0.4, 'rgba(255, 80, 0, 0.22)');
    grad.addColorStop(1, 'rgba(200, 40, 0, 0)');
    c.fillStyle = grad;
    c.beginPath();
    c.arc(x, y - 10, glow, 0, 7);
    c.fill();

    // Sprite animated domlua.png
    if (_campImg.complete && _campImg.naturalWidth) {
      const totalFrames = 8;
      const fw = 114, fh = 200;
      const animSpeed = 10;
      const frame = Math.floor((Date.now() / 1000 * animSpeed) + idx * 2) % totalFrames;
      const sx = frame * fw;

      const scale = 0.55;
      const drawW = fw * scale;
      const drawH = fh * scale;
      const drawX = x - (63 * scale);
      const drawY = y - (159 * scale);

      c.drawImage(_campImg, sx, 0, fw, fh, drawX, drawY, drawW, drawH);
    } else {
      c.fillStyle = '#ff660088';
      c.beginPath();
      c.arc(x, y - 12, 16, 0, 7);
      c.fill();
    }

    // Nhan thoi gian & EXP
    const m = Math.floor(f.dur / 60), s = Math.floor(f.dur % 60);
    if (typeof label === 'function') {
      label(x, y - 48, `🔥 Lửa Trại (+10% EXP) ${m}:${s < 10 ? '0' : ''}${s}`, '#ffd24a', 11, -1);
    }
  }
}

function updateCampHud() {
  const btn = $('#campBtn');
  if (!btn) return;
  pvkEnsureCamp();
  const c = S.camp;
  if (c.fireT > 0 || c.wineT > 0) {
    btn.classList.add('on');
    const fStr = c.fireT > 0 ? `🔥${Math.ceil(c.fireT)}s` : '';
    const wStr = c.wineT > 0 ? `🍶${Math.ceil(c.wineT)}s` : '';
    btn.innerHTML = `${fStr} ${wStr}`.trim();
  } else {
    btn.classList.remove('on');
    btn.innerHTML = '🔥 Lửa Trại';
  }
}

function campModal() {
  pvkEnsureCamp();
  const c = S.camp;
  const fMin = Math.floor(c.fireT / 60), fSec = Math.floor(c.fireT % 60);
  const wMin = Math.floor(c.wineT / 60), wSec = Math.floor(c.wineT % 60);
  const expMul = campExpMul();

  modal(`
    <h3>🔥 Hệ Thống Lửa Trại & Rượu (PVK)</h3>
    <p class="desc">Đốt lửa trại và uống rượu dã ngoại nhận cấp số nhân kinh nghiệm và tăng may mắn!</p>
    <div class="card stats">
      <span>Trạng thái Lửa Trại</span><span>${c.fireT > 0 ? `<b style="color:#ff9830">Đang cháy (${fMin}p ${fSec}s) - x2 EXP</b>` : '<span class="dim">Chưa đốt</span>'}</span>
      <span>Trạng thái Hơi Rượu</span><span>${c.wineT > 0 ? `<b style="color:#6affaa">Say nồng (${wMin}p ${wSec}s) - x2 EXP, +30 May Mắn</b>` : '<span class="dim">Chưa uống</span>'}</span>
      <span>Hệ số EXP hiện tại</span><span style="color:#ffd24a;font-weight:bold">x${expMul} Lần Kinh Nghiệm!</span>
      <span>Gỗ Đốt Lửa dự trữ</span><span><b>${c.wood}</b> thanh</span>
      <span>Rượu Nữ Nhi Hồng</span><span><b>${c.wine}</b> bình</span>
    </div>
    <div class="btnrow">
      <button class="btn on" onclick="campLight();campModal();">🔥 Đốt Lửa Trại (-1 Gỗ)</button>
      <button class="btn on" onclick="campDrink();campModal();">🍶 Uống Rượu (-1 Bình)</button>
    </div>
    <div class="btnrow" style="margin-top:6px;">
      <button class="btn sm" onclick="pvkBuyCampMat('wood');campModal();">Mua 5 Gỗ (500 lượng)</button>
      <button class="btn sm" onclick="pvkBuyCampMat('wine');campModal();">Mua 1 Rượu (1000 lượng)</button>
    </div>
    <p class="desc" style="font-size:11px;margin-top:8px;">Mẹo: Đánh quái dã ngoại và diệt Boss Hoàng Kim đều có tỷ lệ rớt Gỗ và Rượu Nữ Nhi Hồng.</p>
  `);
}

function pvkBuyCampMat(k) {
  pvkEnsureCamp();
  const cost = k === 'wood' ? 500 : 1000;
  if (S.gold < cost) { toast('Không đủ ngân lượng!'); return; }
  S.gold -= cost;
  if (k === 'wood') S.camp.wood += 5;
  else S.camp.wine += 1;
  toast('Mua thành công!');
  save();
}

/* ==========================================================================
   MODULE 4: HE THONG TIEN HOA THAN MA 11 BAC (MOUNT PROGRESSION)
   ========================================================================== */
const PVK_MOUNTS = [
  { tier: 1, n: 'Túc Sương', minLvl: 10, expNeed: 1000, spd: 20, hpPct: 8, allRes: 0, dmgPct: 0, col: '#f8fafc', horseCol: '#e2e8f0', maneCol: '#94a3b8', ic: 'img/i/10_0.png' },
  { tier: 2, n: 'Tuyệt Ảnh', minLvl: 20, expNeed: 2500, spd: 25, hpPct: 12, allRes: 4, dmgPct: 2, col: '#38bdf8', horseCol: '#1e293b', maneCol: '#38bdf8', ic: 'img/i/10_10.png' },
  { tier: 3, n: 'Ô Vân Đạp Tuyết', minLvl: 30, expNeed: 5000, spd: 30, hpPct: 16, allRes: 6, dmgPct: 5, col: '#60a5fa', horseCol: '#0f172a', maneCol: '#f8fafc', ic: 'img/i/10_20.png' },
  { tier: 4, n: 'Đích Lô', minLvl: 40, expNeed: 9000, spd: 35, hpPct: 20, allRes: 8, dmgPct: 9, col: '#fde047', horseCol: '#ca8a04', maneCol: '#fef08a', ic: 'img/i/10_30.png' },
  { tier: 5, n: 'Xích Thố', minLvl: 50, expNeed: 15000, spd: 40, hpPct: 25, allRes: 10, dmgPct: 14, col: '#ef4444', horseCol: '#b91c1c', maneCol: '#f87171', ic: 'img/i/10_40.png' },
  { tier: 6, n: 'Chiếu Dạ Ngọc Sư Tử', minLvl: 60, expNeed: 24000, spd: 45, hpPct: 30, allRes: 13, dmgPct: 18, col: '#c084fc', horseCol: '#f1f5f9', maneCol: '#e0e7ff', ic: 'img/i/10_50.png' },
  { tier: 7, n: 'Phi Vân', minLvl: 70, expNeed: 36000, spd: 50, hpPct: 35, allRes: 16, dmgPct: 22, col: '#a855f7', horseCol: '#6b21a8', maneCol: '#d8b4fe', ic: 'img/i/10_51.png' },
  { tier: 8, n: 'Bôn Tiêu', minLvl: 80, expNeed: 52000, spd: 55, hpPct: 40, allRes: 20, dmgPct: 28, col: '#f97316', horseCol: '#c2410c', maneCol: '#fdba74', ic: 'img/i/10_52.png' },
  { tier: 9, n: 'Phiên Vũ', minLvl: 90, expNeed: 75000, spd: 65, hpPct: 48, allRes: 25, dmgPct: 34, col: '#eab308', horseCol: '#854d0e', maneCol: '#fef08a', ic: 'img/i/10_53.png' },
  { tier: 10, n: 'Siêu Quang', minLvl: 100, expNeed: 110000, spd: 75, hpPct: 58, allRes: 30, dmgPct: 40, col: '#fb923c', horseCol: '#ea580c', maneCol: '#fed7aa', ic: 'img/i/10_80.png' },
  { tier: 11, n: 'Xích Long Câu', minLvl: 120, expNeed: 0, spd: 90, hpPct: 70, allRes: 36, dmgPct: 50, col: '#f43f5e', horseCol: '#be123c', maneCol: '#fda4af', ic: 'img/i/10_220.png' }
];

function pvkEnsureMount() {
  if (typeof S === 'undefined' || !S) return;
  if (!S.mount || typeof S.mount !== 'object') {
    S.mount = { tier: 1, lvl: 1, exp: 0, fodder: 10 };
  }
  if (S.mount.tier == null) S.mount.tier = 1;
  if (S.mount.exp == null) S.mount.exp = 0;
  if (S.mount.fodder == null) S.mount.fodder = 10;
}

function mountCurrent() {
  pvkEnsureMount();
  if (typeof S === 'undefined' || !S || !S.mount) return PVK_MOUNTS[0];
  const t = clamp(S.mount.tier || 1, 1, 11);
  return PVK_MOUNTS[t - 1] || PVK_MOUNTS[0];
}

function mountAttr(A) {
  pvkEnsureMount();
  const m = mountCurrent();
  if (!m) return;
  if (m.spd) addAttr(A, 'fastwalkrun_p', [m.spd, -1, 0]);
  if (m.hpPct) addAttr(A, 'lifemax_p', [m.hpPct, -1, 0]);
  if (m.allRes) addAttr(A, 'allres_p', [m.allRes, -1, 0]);
  if (m.dmgPct) addAttr(A, 'addphysicsdamage_p', [m.dmgPct, -1, 0]);
}

function mountFeed(useFodder) {
  pvkEnsureMount();
  const m = S.mount;
  const cfg = mountCurrent();
  if (cfg.tier >= 11) { toast('Chiến mã đã đạt bậc cảnh giới cao nhất!'); return; }
  if (useFodder) {
    if ((m.fodder || 0) <= 0) { toast('Hết Cỏ Linh Chi! Đánh quái hoặc diệt Boss để nhận.'); return; }
    m.fodder--;
    m.exp = (m.exp || 0) + 250;
    toast('+250 EXP Thần Mã!');
  } else {
    const cost = 800 + cfg.tier * 400;
    if (S.gold < cost) { toast(`Cần ${cost} lượng để luyện ngựa!`); return; }
    S.gold -= cost;
    m.exp = (m.exp || 0) + 120;
    toast('+120 EXP Thần Mã!');
  }
  if (m.exp >= cfg.expNeed && cfg.tier < 11) {
    m.exp -= cfg.expNeed;
    m.tier++;
    const newM = mountCurrent();
    toast(`⭐ CHIẾN MÃ TIẾN HÓA LÊN [${newM.n}]!`);
    log(`<b class="up">⭐ Chiến mã đột phá lên bậc [${newM.n}]!</b>`);
    // Dong bo slot trang bi horse dung dinh dang item ma thuat
    if (S.eq) {
      S.eq.horse = {
        uid: S.uid++, n: newM.n, d: 10, r: newM.tier >= 8 ? 4 : newM.tier >= 5 ? 3 : 2,
        s: heroSeries(), req: [[36, newM.minLvl]],
        ic: newM.ic || 'img/i/10_0.png',
        base: [[106, newM.spd, newM.spd], [82, newM.hpPct, newM.hpPct]],
        mag: [
          { a: 109, p: [newM.allRes, -1, 0], pre: 1 },
          { a: 65, p: [newM.dmgPct, -1, 0], pre: 1 }
        ]
      };
    }
  }
  if (R) R.dirty = true;
  if (typeof recalc === 'function') recalc();
  if (typeof refresh === 'function') refresh();
  save();
  if (document.getElementById('giftTabs')) {
    if (typeof refreshGift === 'function') refreshGift();
  } else {
    mountModal();
  }
}

function mountModal() {
  pvkEnsureMount();
  const m = S.mount;
  const cur = mountCurrent();
  const next = PVK_MOUNTS[cur.tier] || null;
  const pct = next ? Math.min(100, Math.floor(m.exp * 100 / cur.expNeed)) : 100;

  modal(`
    <h3>🐎 Hệ Thống Thần Mã (PVK 11 Bậc)</h3>
    <p class="desc">Thuần dưỡng và đột phá chuỗi 11 danh mã kinh điển từ Túc Sương đến Xích Long Câu.</p>
    <div style="text-align:center;padding:12px;background:var(--panel2);border:1px solid var(--line);border-radius:8px;margin-bottom:8px;">
      <h2 style="color:${cur.col};margin:4px 0;">${cur.n} (Bậc ${cur.tier}/11)</h2>
      <p style="font-size:12px;color:var(--dim);">Yêu cầu cấp nhân vật: ${cur.minLvl}</p>
      <div class="bar xp" style="height:16px;margin:8px auto;max-width:320px;">
        <i style="width:${pct}%;background:linear-gradient(#f0c040,#a07010);"></i>
        <span style="line-height:16px;">${next ? `${m.exp} / ${cur.expNeed} (${pct}%)` : 'Đỉnh Phong'}</span>
      </div>
    </div>
    <div class="card stats">
      <span>Tốc độ di chuyển</span><span style="color:#7fe3ff">+${cur.spd}%</span>
      <span>Sinh lực tối đa</span><span style="color:#ff7a55">+${cur.hpPct}%</span>
      <span>Kháng tất cả</span><span style="color:#a87fff">+${cur.allRes}%</span>
      <span>Tăng sát thương</span><span style="color:#ffd24a">+${cur.dmgPct}%</span>
      <span>Cỏ Linh Chi có sẵn</span><span><b>${m.fodder || 0}</b> bó</span>
      <span>Ngân lượng</span><span>${fmt(S.gold)} lượng</span>
    </div>
    ${next ? `
      <div class="btnrow">
        <button class="btn on" onclick="mountFeed(true);">Cho ăn Cỏ (+250 EXP)</button>
        <button class="btn" onclick="mountFeed(false);">Nuôi bằng Ngân Lượng (+120 EXP)</button>
      </div>
      <p class="desc" style="font-size:11px;margin-top:6px;">Bậc tiếp theo: <b style="color:${next.col}">${next.n}</b> (+${next.spd}% tốc, +${next.hpPct}% máu, +${next.allRes}% kháng, +${next.dmgPct}% st)</p>
    ` : `<p class="desc" style="color:#4fd04f;text-align:center;font-weight:bold;">Đã đạt Thần Thú Cực Phẩm Xích Long Câu!</p>`}
    <div class="btnrow" style="margin-top:8px;border-top:1px dashed var(--line);padding-top:8px;">
      <button class="btn gold" onclick="if(typeof openStableModal==='function')openStableModal();">🐎 Mở Mã Trường & Bộ Sưu Tập Danh Mã</button>
      <button class="btn" onclick="if(typeof horsePickModal==='function')horsePickModal();">📋 Chọn Ngựa Cưỡi</button>
    </div>
  `);
}

/* ==========================================================================
   MODULE 5: KHIEU CHIEN BOSS HOANG KIM THE GIOI (WORLD BOSS CHALLENGE)
   ========================================================================== */
const PVK_WORLD_BOSSES = [
  { id: 'lamyy', n: 'Lam Y Y', title: 'Tà Hiệp Kiếm Các', lvl: 40, series: 2, hpMul: 18, dmgMul: 1.4, reqLvl: 30, dropGold: 6000, anim: 'enemy122' },
  { id: 'huyengiac', n: 'Huyền Giác Thiền Sư', title: 'Thiếu Lâm Giới Luật Viện', lvl: 60, series: 0, hpMul: 30, dmgMul: 1.7, reqLvl: 50, dropGold: 15000, anim: 'enemy107' },
  { id: 'cobac', n: 'Cổ Bách', title: 'Dược Vương Cao Đồ', lvl: 80, series: 1, hpMul: 45, dmgMul: 2.1, reqLvl: 70, dropGold: 30000, anim: 'enemy081' },
  { id: 'hanhannga', n: 'Hà Nhân Ngã', title: 'Cái Bang Bang Chủ', lvl: 90, series: 3, hpMul: 65, dmgMul: 2.5, reqLvl: 80, dropGold: 50000, anim: 'enemy089' },
  { id: 'duongbatnhiem', n: 'Đường Bất Nhiễm', title: 'Đường Môn Môn Chủ', lvl: 95, series: 1, hpMul: 90, dmgMul: 2.9, reqLvl: 85, dropGold: 80000, anim: 'enemy028' },
  { id: 'doanmucdue', n: 'Đoan Mộc Duệ', title: 'Thúy Yên Viện Chủ', lvl: 100, series: 2, hpMul: 120, dmgMul: 3.3, reqLvl: 90, dropGold: 120000, anim: 'enemy040' },
  { id: 'doccotiem', n: 'Độc Cô Kiếm', title: 'Võ Lâm Minh Chủ', lvl: 120, series: 0, hpMul: 160, dmgMul: 3.8, reqLvl: 95, dropGold: 200000, anim: 'boss006' }
];

function pvkEnsureBoss() {
  if (!S) return;
  if (!S.bossState) {
    S.bossState = { tickets: 3, lastDay: today(), defeated: {} };
  }
  if (S.bossState.lastDay !== today()) {
    S.bossState.lastDay = today();
    S.bossState.tickets = 3; // Reset 3 luot mien phi moi ngay
  }
}

function bossChallenge(bossId) {
  pvkEnsureBoss();
  const b = PVK_WORLD_BOSSES.find(x => x.id === bossId);
  if (!b) return;
  if (S.lvl < b.reqLvl) { toast(`Cần đạt cấp ${b.reqLvl} để khiêu chiến!`); return; }
  if (S.bossState.tickets <= 0) { toast('Đã hết lượt khiêu chiến hôm nay! Đợi ngày mai hoặc nhận vé từ sự kiện.'); return; }

  S.bossState.tickets--;
  closeModal(true);

  // Tao tran danh Boss
  const st = enemyStats(b.lvl, 'boss');
  st.hp *= b.hpMul * 0.45;
  st.dmg *= b.dmgMul;

  const bossMob = {
    id: Math.random(),
    tid: 141, // default template
    n: b.n,
    title: b.title,
    goldBoss: true,
    worldBoss: true,
    pvkId: b.id,
    animKey: b.anim,
    img: null,
    sz: [60, 90, 30, 90],
    L: b.lvl,
    cls: 'boss',
    series: b.series,
    res: { phys: 45, poison: 45, cold: 45, fire: 45, light: 45 },
    hp: st.hp,
    max: st.hp,
    dmg: st.dmg,
    ar: st.ar * 1.5,
    def: st.def * 1.5,
    x: H.x + 80,
    y: H.y,
    r: 34,
    spd: 45,
    atkCd: 1.0,
    cd: 1.2,
    stun: 0,
    poison: 0,
    poisonDmg: 0,
    hitT: 0,
    face: -1
  };

  R.enemies = [bossMob];
  R.banner = { t: 3.0, text: `⚔ TRÙM: ${b.n}`, sub: `${b.title} · Cấp ${b.lvl}` };
  toast(`Bắt đầu khiêu chiến ${b.n}!`);
  log(`<b class="boss">⚔ Bắt đầu khiêu chiến ${b.n} (${b.title})!</b>`);
  save();
}

function pvkOnWorldBossKill(e) {
  const b = PVK_WORLD_BOSSES.find(x => x.id === e.pvkId);
  if (!b) return;
  pvkEnsureBoss();
  S.bossState.defeated[b.id] = (S.bossState.defeated[b.id] || 0) + 1;
  S.gold += b.dropGold;
  pvkEnsureCamp();
  S.camp.wood += 3;
  S.camp.wine += 2;
  pvkEnsureMount();
  S.mount.fodder = (S.mount.fodder || 0) + 5;

  toast(`🎉 ĐẠI THẮNG! Hạ gục ${b.n}! Nhận quà cực phẩm!`);
  log(`<b class="up">🎉 Đại thắng hạ gục ${b.n}! +${fmt(b.dropGold)} lượng, +2 Rượu, +3 Gỗ, +5 Cỏ Thần Mã!</b>`);
  // Rơi 1 trang bị hoàng kim môn phái chắc chắn
  const setIt = forceSetItem();
  if (setIt) {
    addItem(setIt, false, true, true);
    toast(`Nhận bảo vật: ${setIt.n}`);
  }
  save();
}

function bossModal() {
  pvkEnsureBoss();
  const bs = S.bossState;
  modal(`
    <h3>👑 Khiêu Chiến Boss Hoàng Kim Thế Giới</h3>
    <p class="desc">Hạ gục các cao thủ Hoàng Kim để đoạt bảo vật môn phái, rượu ngon và thảo dược thần mã!</p>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <span>Lượt khiêu chiến hôm nay: <b style="color:#ffd24a">${bs.tickets} / 3</b></span>
      ${bs.tickets < 3 ? `<button class="btn sm" onclick="pvkBuyBossTicket();bossModal();">Mua 1 lượt (3000 lượng)</button>` : ''}
    </div>
    <div style="display:grid;gap:6px;max-height:55vh;overflow-y:auto;">
      ${PVK_WORLD_BOSSES.map(b => {
        const locked = S.lvl < b.reqLvl;
        const count = bs.defeated[b.id] || 0;
        return `
          <div style="display:grid;grid-template-columns:1fr auto;gap:6px;align-items:center;padding:8px;border:1px solid ${SERIES_COL[b.series]};border-radius:6px;background:var(--panel2);opacity:${locked ? '0.5' : '1'};">
            <div>
              <b style="color:${SERIES_COL[b.series]}">${b.n}</b> <small style="color:var(--dim)">(${b.title})</small>
              <div style="font-size:11px;color:var(--dim);margin-top:2px;">
                Cấp ${b.lvl} · Hệ ${SERIES[b.series]} · Yêu cầu cấp ${b.reqLvl} · Đã hạ: <b style="color:#7fe3ff">${count}</b> lần
              </div>
              <div style="font-size:11px;color:#ffd24a;margin-top:2px;">
                Thưởng: ${fmt(b.dropGold)} lượng, Đồ Hoàng Kim, Rượu, Gỗ, Cỏ Thần Mã
              </div>
            </div>
            <div>
              ${locked ? `<span class="dim" style="font-size:11px;">Cấp ${b.reqLvl}</span>` : `
                <button class="btn on sm" onclick="bossChallenge('${b.id}');">Khiêu Chiến</button>
              `}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `);
}

function pvkBuyBossTicket() {
  if (S.gold < 3000) { toast('Cần 3000 lượng để mua thêm lượt khiêu chiến!'); return; }
  S.gold -= 3000;
  S.bossState.tickets++;
  toast('Đã mua thêm 1 lượt khiêu chiến!');
  save();
}

/* ==========================================================================
   MODULE 2 HO TRO: CHUYEN PHAI TAY TUY DAU (HOA SON & CAC PHAI)
   ========================================================================== */
function pvkChangeFactionModal() {
  modal(`
    <h3>☯ Tẩy Tủy Đảo: Chuyển Môn Phái</h3>
    <p class="desc">Bạn có thể tự do gia nhập môn phái mới (bao gồm <b>Hoa Sơn phái</b> mới cập nhật)! Điểm kỹ năng và tiềm năng sẽ được hoàn trả đầy đủ.</p>
    <div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:6px;max-height:50vh;overflow-y:auto;">
      ${FACTIONS.map(f => {
        const cur = f.key === S.fac;
        return `
          <button class="btn ${cur ? 'on' : ''}" style="text-align:left;padding:8px;" onclick="pvkSelectFaction('${f.key}')">
            <b style="color:${SERIES_COL[f.series]}">${f.n}</b>
            <div style="font-size:11px;color:var(--dim);">Hệ ${SERIES[f.series]} ${f.key === 'huashan' ? '⭐ Mới!' : ''}</div>
          </button>
        `;
      }).join('')}
    </div>
  `);
}

function pvkSelectFaction(key) {
  if (key === S.fac) { toast('Đang ở môn phái này!'); return; }
  const f = FAC[key];
  if (!f) return;

  // 1. Hoàn trả toàn bộ điểm kỹ năng của phái cũ
  let refundSk = 0;
  for (const id in S.sk) refundSk += (S.sk[id] || 0);
  S.sk = {};

  // Điểm kỹ năng hợp lệ theo cấp = 1 + (lvl - 1) * 1 + điểm thưởng
  const earnedSkPts = 1 + (Math.max(1, S.lvl) - 1) * 1;
  S.skPts = Math.max(earnedSkPts, (S.skPts || 0) + refundSk);

  // 2. Chuyển đổi môn phái, giới tính tương ứng
  S.fac = key;
  S.sex = (key === 'emei' || key === 'cuiyan') ? 1 : 0;

  // 3. Khởi tạo chiêu thức ban đầu môn phái mới
  if (f.starter) {
    S.sk[f.starter] = 1;
    S.skPts = Math.max(0, S.skPts - 1);
  }

  // Tự động phân bổ lại toàn bộ điểm kỹ năng vào các chiêu môn phái mới
  if (typeof autoSpendSkills === 'function') {
    autoSpendSkills();
  }

  // Tự động trang bị các chiêu thức tấn công tốt nhất vào ô phím tắt & chiêu chính
  if (typeof fillSlots === 'function') fillSlots();
  const atks = (typeof learnedAttacks === 'function') ? learnedAttacks().sort((a, b) => ((SK[b] && SK[b].req) || 0) - ((SK[a] && SK[a].req) || 0)) : [];
  const bestAtk = atks[0] || f.starter || 0;
  S.main = bestAtk;
  S.mainLock = false;

  // 4. Thiết lập lại cấu hình auto skill phù hợp phái mới
  if (S.auto) {
    S.auto.mainSkillId = bestAtk;
    const buffSkills = (f.skills || []).filter(id => SK[id] && !isAttack(SK[id]) && (S.sk[id] || 0) > 0);
    S.auto.buffSkill1 = buffSkills[0] || 0;
    S.auto.buffSkill2 = buffSkills[1] || 0;
  }

  // 5. Kiểm tra vũ khí và trang phục: Nếu không phù hợp với môn phái mới thì tháo về túi
  if (S.eq) {
    // Vũ khí
    if (S.eq.weapon && f.wcode >= 0 && typeof weaponCode === 'function' && weaponCode({ weapon: S.eq.weapon }) !== f.wcode) {
      if (S.inv && S.inv.length < INV_MAX) S.inv.push(S.eq.weapon);
      delete S.eq.weapon;
      toast(`Đã tháo vũ khí cũ không phù hợp hệ phái ${f.n}`);
    }
    // Quần áo theo giới tính
    for (const k of ['helm', 'armor', 'belt', 'boots']) {
      if (S.eq[k] && typeof sexReqOkFor === 'function' && !sexReqOkFor(S.eq[k], S.sex)) {
        if (S.inv && S.inv.length < INV_MAX) S.inv.push(S.eq[k]);
        delete S.eq[k];
      }
    }
  }

  // Tự động tìm và mặc trang bị tốt nhất phù hợp phái mới trong túi (nếu người chơi bật tự mặc đồ)
  if (S && S.autoEquip && typeof autoEquipAll === 'function') autoEquipAll(true);

  closeModal(true);
  toast(`Gia nhập thành công môn phái: ${f.n}!`);
  log(`<b class="up" style="color:#ffd700;font-size:13px;">☯ BẠN ĐÃ GIA NHẬP MÔN PHÁI: ${f.n}!</b> Hệ ${SERIES[f.series]}. Kỹ năng đã được khởi tạo.`);

  // 6. Gửi cập nhật môn phái lên Multiplayer WebSocket Server ngay lập tức
  if (typeof MP !== 'undefined' && MP.ws && MP.ws.readyState === 1) {
    MP.ws.send(JSON.stringify({
      type: 'change_faction',
      fac: key,
      series: f.series,
      sk: S.sk,
      skPts: S.skPts,
      main: S.main,
      slots: S.slots
    }));
    if (typeof sendProfile === 'function') sendProfile();
  }

  if (R) R.dirty = true;
  if (typeof recalc === 'function') recalc();
  if (typeof save === 'function') save();
  if (typeof syncCloudSave === 'function') syncCloudSave();
  if (typeof refresh === 'function') refresh();
  if (typeof renderSkill === 'function') renderSkill();
  if (typeof renderChar === 'function') renderChar();
}

/* ==========================================================================
   KỲ TRÂN CÁC (BOUTIQUE) & CHỢ TRỜI (BLACK MARKET) - THAM KHẢO H:\JxPhaThien\AdminWeb
   ========================================================================== */

const KTC_ITEMS = [
  { id: 'tienthao', n: 'Tiên Thảo Lộ (x2 EXP 1 Giờ)', cat: 'item', price: 1500, d: 'Thần dược tiên gia, nhân đôi kinh nghiệm nhận được trong 60 phút.', ic: 'img/it/gold.png', hot: true, buy: () => { S.tienthaoExp = (S.tienthaoExp || Date.now()) + 3600000; toast('Đã sử dụng Tiên Thảo Lộ (+100% EXP)!'); } },
  { id: 'volam_bk', n: 'Võ Lâm Mật Tịch (+2 Kỹ Năng)', cat: 'book', price: 8000, d: 'Mật tịch võ học cổ xưa, gia tăng vĩnh viễn 2 điểm kỹ năng phái.', ic: 'img/s/1347.png', rare: true, hot: true, buy: () => { S.skPts = (S.skPts || 0) + 2; toast('+2 Điểm kỹ năng võ học!'); } },
  { id: 'taytuy_kinh', n: 'Tẩy Tủy Kinh (+10 Tiềm Năng)', cat: 'book', price: 7500, d: 'Bí kíp dịch cân hoán cốt, tăng vĩnh viễn 10 điểm tiềm năng.', ic: 'img/s/1347.png', rare: true, buy: () => { S.attrPts = (S.attrPts || 0) + 10; toast('+10 Điểm tiềm năng!'); } },
  { id: 'taytuy', n: 'Tẩy Tủy Đan Thần Hiệu', cat: 'item', price: 5000, d: 'Tẩy lại toàn bộ điểm tiềm năng môn phái để cộng lại tự do.', ic: 'img/it/gold.png', rare: true, buy: () => {
      const sum = S.attr.str + S.attr.dex + S.attr.vit + S.attr.eng;
      S.attrPts += sum;
      S.attr = { str: 0, dex: 0, vit: 0, eng: 0 };
      recalc();
      toast('Đã tẩy tủy thành công! Nhận lại toàn bộ điểm tiềm năng.');
    }
  },
  { id: 'thanma_lenh', n: 'Thần Mã Chi Lệnh', cat: 'horse', price: 6000, d: 'Thần vật thuần dưỡng: Nhận ngay +2000 EXP Thần Mã & 50 Cỏ Linh Chi.', ic: 'img/i/10_52.png', hot: true, buy: () => { pvkEnsureMount(); S.mount.exp = (S.mount.exp || 0) + 2000; S.mount.fodder = (S.mount.fodder || 0) + 50; toast('+2000 EXP Thần Mã & 50 Cỏ Linh Chi!'); } },
  { id: 'wood', n: 'Bó Gỗ Lửa Trại (x10)', cat: 'item', price: 900, d: 'Dùng đốt lửa trại dã ngoại x2 EXP trong 5 phút.', ic: 'img/it/gold.png', hot: true, buy: () => { pvkEnsureCamp(); S.camp.wood += 10; } },
  { id: 'wine', n: 'Rượu Nữ Nhi Hồng (x3)', cat: 'item', price: 2500, d: 'Uống nhận thêm x2 EXP (cộng dồn x4) & +30 May Mắn.', ic: 'img/it/gold.png', hot: true, buy: () => { pvkEnsureCamp(); S.camp.wine += 3; } },
  { id: 'fodder', n: 'Cỏ Linh Chi Thần Mã (x20)', cat: 'horse', price: 1800, d: 'Thực phẩm thượng hạng bồi dưỡng và tiến hóa chiến mã.', ic: 'img/i/10_0.png', buy: () => { pvkEnsureMount(); S.mount.fodder = (S.mount.fodder || 0) + 20; } },
  { id: 'ht_cap7', n: 'Huyền Tinh Thiết Thạch (Cấp 7)', cat: 'forge', price: 6000, d: 'Nguyên liệu cấp cao nâng cấp trang bị lên cảnh giới thượng thừa.', ic: 'img/it/gold.png', rare: true, buy: () => { S.mats.ht[7] = (S.mats.ht[7] || 0) + 1; toast('+1 Huyền Tinh cấp 7!'); } },
  { id: 'ht_cap8', n: 'Huyền Tinh Thiết Thạch (Cấp 8)', cat: 'forge', price: 12000, d: 'Huyền Tinh thần thánh dùng cho tôi luyện trang bị tối thượng.', ic: 'img/it/gold.png', rare: true, hot: true, buy: () => { S.mats.ht[8] = (S.mats.ht[8] || 0) + 1; toast('+1 Huyền Tinh cấp 8!'); } },
  { id: 'ht_cap9', n: 'Huyền Tinh Thiết Thạch (Cấp 9)', cat: 'forge', price: 25000, d: 'Thần thạch tuyệt phẩm của chốn võ lâm cửu đỉnh.', ic: 'img/it/gold.png', rare: true, hot: true, buy: () => { S.mats.ht[9] = (S.mats.ht[9] || 0) + 1; toast('+1 Huyền Tinh cấp 9!'); } },
  { id: 'tuthuytinh', n: 'Tử Thủy Tinh Bảo Ngọc', cat: 'forge', price: 10000, d: 'Thủy tinh thần bí dùng nâng cấp và tẩy luyện trang bị Hoàng Kim.', ic: 'img/it/gold.png', rare: true, buy: () => { S.mats.thuytinh = (S.mats.thuytinh || 0) + 1; toast('+1 Tử Thủy Tinh!'); } },
  { id: 'boss_tkt', n: 'Lệnh Bài Khiêu Chiến Boss', cat: 'boss', price: 3000, d: 'Thêm 1 lượt khiêu chiến Boss Hoàng Kim Thế Giới.', ic: 'img/it/gold.png', rare: true, buy: () => { pvkEnsureBoss(); S.bossState.tickets += 1; } }
];

let _marketStock = [];
let _marketNextRefresh = 0;
let _playerMarketList = []; // Danh sach items do nguoi choi dang ban
let _marketCurrentTab = 'shop'; // 'shop' | 'sell' | 'my'

function getMarketStock() {
  const now = Date.now();
  if (!_marketStock.length || now > _marketNextRefresh) {
    _marketNextRefresh = now + 15 * 60 * 1000; // 15 phut lam moi
    _marketStock = [];
    const lvl = Math.min(10, Math.max(1, Math.floor(S.lvl / 10) + 1));
    const details = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    for (let i = 0; i < 4; i++) {
      const d = details[Math.floor(Math.random() * details.length)];
      const k = 0;
      const it = makeItem(d, k, lvl, 1);
      if (it) {
        it.r = Math.random() < 0.25 ? 4 : (Math.random() < 0.5 ? 2 : 1);
        const cost = (it.r >= 4 ? 12000 : it.r >= 2 ? 6000 : 3500) + Math.floor(Math.random() * 1000);
        _marketStock.push({ it, cost, sold: false });
      }
    }
  }
  return _marketStock;
}

function openKtcModal() {
  const itemsHtml = KTC_ITEMS.map((item, idx) => `
    <div class="ktc-card ${item.hot ? 'hot' : ''}">
      <div class="pic">
        <img src="${item.ic}" alt="">
      </div>
      <div class="info">
        <b>${item.n} ${item.hot ? '<span class="ktc-badge-hot">HOT</span>' : ''} ${item.rare ? '<span class="ktc-badge-rare">QUÝ</span>' : ''}</b>
        <small>${item.d}</small>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
        <span class="price">💰 ${fmt(item.price)} lượng</span>
        <button class="jx-action-btn gold" onclick="buyKtcItem(${idx})">Mua ngay</button>
      </div>
    </div>
  `).join('');

  modal(`
    <div class="jx-client-window" style="margin:-14px;border:none;box-shadow:none;">
      <div class="jx-window-header">
        <div class="jx-window-title">
          <span>💎 KỲ TRÂN CÁC (VÕ LÂM BẢO KHỐ)</span>
        </div>
        <span style="font-size:12px;color:#ffd700;font-weight:bold;">Ngân lượng: ${fmt(S.gold)}</span>
      </div>
      <div style="padding:12px;display:flex;flex-direction:column;gap:8px;max-height:65vh;overflow-y:auto;">
        ${itemsHtml}
      </div>
    </div>
  `);
}

function buyKtcItem(idx) {
  const item = KTC_ITEMS[idx];
  if (!item) return;
  if (S.gold < item.price) {
    toast('Không đủ ngân lượng!');
    return;
  }
  S.gold -= item.price;
  item.buy();
  uiSfx('dropOther');
  toast(`Mua thành công: ${item.n}!`);
  save();
  refresh();
  openKtcModal();
}

function openMarketModal() {
  const stock = getMarketStock();
  const timeLeftSec = Math.max(0, Math.ceil((_marketNextRefresh - Date.now()) / 1000));
  const min = Math.floor(timeLeftSec / 60), sec = timeLeftSec % 60;
  const myName = S.heroName || S.name || 'Đại Hiệp';

  // 1. Tab Sạp Hàng Chợ Đen (NPC + Người chơi đăng bán)
  const npcItemsHtml = stock.map((s, idx) => `
    <div class="ktc-card ${s.it.r >= 4 ? 'hot' : ''}">
      <div class="pic r${s.it.r}">
        <img src="${s.it.ic}" alt="">
      </div>
      <div class="info">
        <b style="color:${RAR_COL[s.it.r]}">${esc(s.it.n)}${s.it.r >= 4 ? ' <span class="ktc-badge-hot">CỰC PHẨM</span>' : ''}</b>
        <small>Cấp ${s.it.lvl} · Hệ ${SERIES[s.it.s]} · Sạp NPC Chợ Đen</small>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
        <span class="price">💰 ${fmt(s.cost)} lượng</span>
        ${s.sold 
          ? '<span style="font-size:11px;color:#888;font-weight:bold;">Đã Bán</span>' 
          : `<button class="jx-action-btn gold" onclick="buyMarketItem(${idx})">Mua</button>`}
      </div>
    </div>
  `).join('');

  const playerItemsHtml = _playerMarketList.map((m, idx) => `
    <div class="ktc-card hot">
      <div class="pic r${m.it.r}">
        <img src="${m.it.ic}" alt="">
      </div>
      <div class="info">
        <b style="color:${RAR_COL[m.it.r]}">${esc(m.it.n)} <span class="ktc-badge-rare">NGƯỜI CHƠI BÁN</span></b>
        <small>Người bán: <b style="color:#38bdf8;">${esc(m.sellerName)}</b> · Cấp ${m.it.lvl} · Hệ ${SERIES[m.it.s]}</small>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
        <span class="price">💰 ${fmt(m.price)} lượng</span>
        ${m.sellerName === myName 
          ? `<button class="jx-action-btn" onclick="cancelPlayerMarketItem(${idx})">Rút Đồ Về</button>` 
          : `<button class="jx-action-btn gold" onclick="buyPlayerMarketItem(${idx})">Mua Ngay</button>`}
      </div>
    </div>
  `).join('');

  // 2. Tab Đăng Bán Trang Bị (Lấy từ S.inv)
  const sellableItems = S.inv.filter(i => typeof DETAIL_SLOT !== 'undefined' && DETAIL_SLOT[i.d] !== undefined);
  const sellHtml = sellableItems.length ? sellableItems.map(it => `
    <div class="ktc-card">
      <div class="pic r${it.r}">
        <img src="${it.ic}" alt="">
      </div>
      <div class="info">
        <b style="color:${RAR_COL[it.r]}">${esc(it.n)}</b>
        <small>Cấp ${it.lvl} · Phẩm: ${RAR_VI[it.r]} · Hệ ${SERIES[it.s]}</small>
      </div>
      <div>
        <button class="jx-action-btn gold" onclick="promptSellItemToMarket(${it.uid})">Đăng Bán</button>
      </div>
    </div>
  `).join('') : '<div style="text-align:center;color:#a39276;padding:24px;">Không có trang bị nào trong hành trang để đăng bán.</div>';

  // 3. Tab Đang Bán Của Tôi
  const myItems = _playerMarketList.filter(m => m.sellerName === myName);
  const myHtml = myItems.length ? myItems.map((m, idx) => `
    <div class="ktc-card hot">
      <div class="pic r${m.it.r}">
        <img src="${m.it.ic}" alt="">
      </div>
      <div class="info">
        <b style="color:${RAR_COL[m.it.r]}">${esc(m.it.n)}</b>
        <small>Giá niêm yết: <b style="color:#ffd700;">${fmt(m.price)} lượng</b></small>
      </div>
      <div>
        <button class="jx-action-btn" style="color:#ef4444;" onclick="cancelPlayerMarketItem(${idx})">Hủy Bán (Lấy lại)</button>
      </div>
    </div>
  `).join('') : '<div style="text-align:center;color:#a39276;padding:24px;">Bạn chưa đăng bán món hàng nào trên Chợ Đen.</div>';

  modal(`
    <div class="jx-client-window" style="margin:-14px;border:none;box-shadow:none;">
      <div class="jx-window-header">
        <div class="jx-window-title">
          <span>🏮 CHỢ ĐEN (GIAO DỊCH VÕ LÂM)</span>
        </div>
        <span style="font-size:11px;color:#ffd700;">Ngân lượng: ${fmt(S.gold)}</span>
      </div>
      <div class="dtabs" style="margin:6px 12px 4px 12px;">
        <button id="bMTabShop" class="${_marketCurrentTab === 'shop' ? 'on' : ''}">🏮 Sạp Hàng Chợ Đen</button>
        <button id="bMTabSell" class="${_marketCurrentTab === 'sell' ? 'on' : ''}">📦 Đăng Bán Trang Bị</button>
        <button id="bMTabMy" class="${_marketCurrentTab === 'my' ? 'on' : ''}">📋 Hàng Tôi Đang Bán (${myItems.length})</button>
      </div>
      <div style="padding:10px 12px;max-height:60vh;overflow-y:auto;display:flex;flex-direction:column;gap:8px;">
        ${_marketCurrentTab === 'shop' 
          ? (playerItemsHtml + npcItemsHtml) 
          : (_marketCurrentTab === 'sell' ? sellHtml : myHtml)}
      </div>
      <div style="padding:8px 12px;border-top:1px solid #3d2f1d;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:11px;color:#a39276;">Làm mới NPC: <b style="color:#ffd700;">${min}:${sec < 10 ? '0' : ''}${sec}</b></span>
        <button class="jx-action-btn" onclick="_marketNextRefresh=0;openMarketModal();">🔄 Làm Mới Sạp</button>
      </div>
    </div>
  `, () => {
    const tShop = $('#bMTabShop'), tSell = $('#bMTabSell'), tMy = $('#bMTabMy');
    if (tShop) tShop.onclick = () => { _marketCurrentTab = 'shop'; openMarketModal(); };
    if (tSell) tSell.onclick = () => { _marketCurrentTab = 'sell'; openMarketModal(); };
    if (tMy) tMy.onclick = () => { _marketCurrentTab = 'my'; openMarketModal(); };
  });
}

function promptSellItemToMarket(uid) {
  const it = (S.inv || []).find(i => i.uid === uid);
  if (!it) return;
  const priceStr = prompt(`Nhập giá ngân lượng muốn bán [${it.n}] lên Chợ Đen:`, '5000');
  if (!priceStr) return;
  const price = Math.max(10, parseInt(priceStr, 10) || 0);
  if (price <= 0) { toast('Giá bán không hợp lệ!'); return; }

  // Xóa khỏi hành trang
  S.inv = S.inv.filter(i => i.uid !== uid);
  const myName = S.heroName || S.name || 'Đại Hiệp';
  const entry = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    sellerName: myName,
    it: it,
    price: price,
    time: Date.now()
  };
  _playerMarketList.unshift(entry);

  // Gửi lên server multiplayer nếu có
  if (typeof MP !== 'undefined' && MP.ws && MP.ws.readyState === 1) {
    MP.ws.send(JSON.stringify({
      type: 'market_post',
      it: it,
      price: price
    }));
  }

  // Thông báo ra kênh Rao bán
  if (typeof appendChatLine === 'function') {
    appendChatLine('trade', myName, `Vừa đăng bán [${it.n}] với giá ${fmt(price)} lượng lên Chợ Đen!`);
  }
  toast(`Đã đăng bán [${it.n}] giá ${fmt(price)} lượng!`);
  uiSfx('dropOther');
  save();
  refresh();
  openMarketModal();
}

function buyMarketItem(idx) {
  const stock = getMarketStock();
  const itemObj = stock[idx];
  if (!itemObj || itemObj.sold) return;
  if (S.gold < itemObj.cost) {
    toast('Không đủ ngân lượng để giao dịch!');
    return;
  }
  if (S.inv.length >= INV_MAX) {
    toast('Hành trang đầy! Dọn dẹp trước khi mua.');
    return;
  }
  S.gold -= itemObj.cost;
  itemObj.sold = true;
  addItem(itemObj.it, true, true, true);
  uiSfx('dropOther');
  toast(`Giao dịch thành công: ${itemObj.it.n}!`);
  save();
  refresh();
  openMarketModal();
}

function buyPlayerMarketItem(idx) {
  const entry = _playerMarketList[idx];
  if (!entry) return;
  if (S.gold < entry.price) {
    toast('Không đủ ngân lượng!');
    return;
  }
  if (S.inv.length >= INV_MAX) {
    toast('Hành trang đầy!');
    return;
  }
  S.gold -= entry.price;
  addItem(entry.it, true, true, true);
  _playerMarketList.splice(idx, 1);

  if (typeof MP !== 'undefined' && MP.ws && MP.ws.readyState === 1) {
    MP.ws.send(JSON.stringify({
      type: 'market_buy',
      marketId: entry.id
    }));
  }

  toast(`Mua thành công [${entry.it.n}] từ ${entry.sellerName}!`);
  uiSfx('dropOther');
  save();
  refresh();
  openMarketModal();
}

function cancelPlayerMarketItem(idx) {
  const entry = _playerMarketList[idx];
  if (!entry) return;
  if (S.inv.length >= INV_MAX) {
    toast('Hành trang đầy! Không thể rút đồ về.');
    return;
  }
  addItem(entry.it, true, true, true);
  _playerMarketList.splice(idx, 1);

  if (typeof MP !== 'undefined' && MP.ws && MP.ws.readyState === 1) {
    MP.ws.send(JSON.stringify({
      type: 'market_cancel',
      marketId: entry.id
    }));
  }

  toast(`Đã rút [${entry.it.n}] về hành trang!`);
  save();
  refresh();
  openMarketModal();
}

/* ==========================================================================
   HOOK INTEGRATION: KHOI DONG & CAP NHAT GIAO DIEN
   ========================================================================== */
function pvkInit() {
  pvkEnsureCamp();
  pvkEnsureMount();
  pvkEnsureBoss();
  if (S && S.rw && (!S.rw.pet || typeof S.rw.pet.series === 'undefined')) {
    const old = S.rw.pet;
    S.rw.pet = {
      id: 'loikiem',
      n: 'Lôi Kiếm',
      series: 0,
      lvl: old ? old.lvl : 1,
      xp: old ? old.xp : 0,
      str: 10, dex: 10, vit: 10, eng: 10, pts: 0
    };
  }

  // Hook HUD buttons
  const bCamp = $('#campBtn');
  if (bCamp) bCamp.onclick = () => { uiSfx('click'); campModal(); };
  const bMount = $('#mountBtn');
  if (bMount) bMount.onclick = () => { uiSfx('click'); mountModal(); };
  const bBoss = $('#bossBtn');
  if (bBoss) bBoss.onclick = () => { uiSfx('click'); bossModal(); };
  const bKtc = $('#ktcBtn');
  if (bKtc) bKtc.onclick = () => { uiSfx('click'); openKtcModal(); };
  const bMkt = $('#marketBtn');
  if (bMkt) bMkt.onclick = () => { uiSfx('click'); openMarketModal(); };
  const bAct = $('#actChipBtn');
  if (bAct) bAct.onclick = () => { uiSfx('click'); if (typeof openActivityHub === 'function') openActivityHub(); };
  const bCasino = $('#casinoBtn');
  if (bCasino) bCasino.onclick = () => { uiSfx('click'); if (typeof openTavernHub === 'function') openTavernHub(); };
  const bCasinoChip = $('#casinoChipBtn');
  if (bCasinoChip) bCasinoChip.onclick = () => { uiSfx('click'); if (typeof openTavernHub === 'function') openTavernHub(); };
  const bForge = $('#forgeBtn');
  if (bForge) bForge.onclick = () => { uiSfx('click'); if (typeof openForgeHub === 'function') openForgeHub(); };
  const bForgeChip = $('#forgeChipBtn');
  if (bForgeChip) bForgeChip.onclick = () => { uiSfx('click'); if (typeof openForgeHub === 'function') openForgeHub(); };
}

// Auto execute init when loaded
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(pvkInit, 100);
  });
}

