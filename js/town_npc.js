/* ==========================================================================
   HỆ THỐNG THẤT ĐẠI THÀNH THỊ, THẬP ĐẠI THÔN TRẤN & NPC ĐỐI THOẠI (VLTK NPC SYSTEM)
   Trích xuất từ MapList.ini và thư mục script/npcthanhthi, script/npcthon của H:\JxPhaThien
   ========================================================================== */
'use strict';

window.TOWN_NPC = (function () {
  // Danh sách Thất Đại Thành Thị & Thập Đại Thôn Trấn (Chuẩn 100% VLTK 1)
  const TOWNS_CONFIG = [
    // --- THẤT ĐẠI THÀNH THỊ ---
    {
      id: 37,
      type: 'city',
      n: 'Biện Kinh',
      sub: 'Kinh đô phồn hoa phương Bắc (Bắc Tống)',
      desc: 'Trung tâm quyền lực và giao thương tấp nập nhất thiên hạ.',
      music: 'town_bienkinh',
      bg: 'img/z/town_37.jpg',
      ambient: 'Kinh thành tráng lệ rợp bóng cờ hoa, người ngựa nườm nượp qua lại.'
    },
    {
      id: 78,
      type: 'city',
      n: 'Tương Dương',
      sub: 'Chiến địa huyết lệ trung nguyên',
      desc: 'Pháo đài tiền tuyến bất khả xâm phạm, ngã ba sông Hán.',
      music: 'town_tduong',
      bg: 'img/z/town_78.jpg',
      ambient: 'Hào khí chiến trận ngút ngàn, binh sĩ tuần tra canh phòng cẩn mật.'
    },
    {
      id: 176,
      type: 'city',
      n: 'Lâm An',
      sub: 'Kinh đô hoa lệ nam triều (Nam Tống)',
      desc: 'Cảnh sắc Tây Hồ thơ mộng, lâu đài cung điện nguy nga tráng lệ.',
      music: 'town_laman',
      bg: 'img/z/town_176.jpg',
      ambient: 'Gió hồ Tây nhè nhẹ thổi qua những rặng liễu rủ, cảnh sắc tú lệ ngút ngàn.'
    },
    {
      id: 11,
      type: 'city',
      n: 'Thành Đô',
      sub: 'Thục trung danh thắng phì nhiêu',
      desc: 'Đất Thục trù phú, sản vật ngàn năm, cửa ngõ Nga My và Đường Môn.',
      music: 'town_thanhdo',
      bg: 'img/z/town_11.jpg',
      ambient: 'Mảnh đất gấm vóc màu mỡ, tiếng tiêu đồng réo rắt bên sườn đồi.'
    },
    {
      id: 162,
      type: 'city',
      n: 'Đại Lý',
      sub: 'Nam Chiếu vương quốc ngát hương',
      desc: 'Thành trì thanh bình nơi biên thùy phía Nam, phong hoa tuyết nguyệt.',
      music: 'town_daily',
      bg: 'img/z/town_162.jpg',
      ambient: 'Hồ Nhĩ Hải xanh biếc soi bóng rặng Thương Sơn quanh năm mây phủ.'
    },
    {
      id: 1,
      type: 'city',
      n: 'Phượng Tường',
      sub: 'Tây Bắc biên ải quan môn',
      desc: 'Hào khí biên cương lộng gió, ngút ngàn non sông đất trời Tây Bắc.',
      music: 'town_phuongtuong',
      bg: 'img/z/town_1.jpg',
      ambient: 'Gió thảo nguyên thổi lồng lộng qua từng vách đá quan ải sừng sững.'
    },
    {
      id: 80,
      type: 'city',
      n: 'Dương Châu',
      sub: 'Giang Nam đệ nhất thắng cảnh',
      desc: 'Sông nước hữu tình, bến thuyền tấp nập ngày đêm, đô hội phồn vinh.',
      music: 'town_duongchau',
      bg: 'img/z/town_80.jpg',
      ambient: 'Thuyền hoa xuôi ngược dòng kênh đào, tiếng đàn hát rộn rã sớm tối.'
    },

    // --- THẬP ĐẠI TÂN THỦ THÔN ---
    {
      id: 53,
      type: 'village',
      n: 'Ba Lăng Huyện',
      sub: 'Hồ Nam cổ trấn khởi đầu giang hồ',
      desc: 'Thôn trấn yên bình ngàn năm, nơi xuất thân của biết bao bậc hào kiệt.',
      music: 'town_balang',
      bg: 'img/z/town_53.jpg',
      ambient: 'Cây đa giếng nước sân đình, nơi bao thế hệ anh hào bôn tẩu giang hồ.'
    },
    {
      id: 20,
      type: 'village',
      n: 'Giang Tân Thôn',
      sub: 'Làng chài ven sông Ba Thục',
      desc: 'Bến nước êm đềm, tiếng chèo khua sóng nước đón chào lữ khách.',
      music: 'town_giangtan',
      bg: 'img/z/town_20.jpg',
      ambient: 'Sông nước mênh mông, những mái chèo khua nhẹ đưa lữ khách sang sông.'
    },
    {
      id: 99,
      type: 'village',
      n: 'Vĩnh Lạc Trấn',
      sub: 'Giang Nam thôn trấn thái bình',
      desc: 'Khói lam chiều bảng lảng, đất đai trù phú, người dân hiền hòa.',
      music: 'town_vinhlac',
      bg: 'img/z/town_99.jpg',
      ambient: 'Đồng ruộng xanh rì trải dài, người dân chất phác yêu chuộng võ đạo.'
    },
    {
      id: 100,
      type: 'village',
      n: 'Chu Tiên Trấn',
      sub: 'Hà Nam danh trấn trù phú',
      desc: 'Địa linh nhân kiệt, nổi tiếng nghề gốm sứ và chợ phiên đông đúc.',
      music: 'town_chutien',
      bg: 'img/z/town_100.jpg',
      ambient: 'Phố gốm sứ đỏ lửa ngày đêm, thương nhân các nơi tụ hội đông vui.'
    },
    {
      id: 101,
      type: 'village',
      n: 'Đạo Hương Thôn',
      sub: 'Thôn quê hương lúa ngạt ngào',
      desc: 'Những cánh đồng lúa vàng óng ả trải dài tít tắp, thanh bình tĩnh lặng.',
      music: 'town_daohuong',
      bg: 'img/z/town_101.jpg',
      ambient: 'Hương lúa chín ngạt ngào trong gió, tiếng chim hót véo von đầu cành.'
    },
    {
      id: 121,
      type: 'village',
      n: 'Long Môn Trấn',
      sub: 'Cửa ải sa mạc Tây Bắc',
      desc: 'Nơi giáp ranh quan ải và sa mạc cát vàng, hào khí ngất trời.',
      music: 'town_longmon',
      bg: 'img/z/town_121.jpg',
      ambient: 'Gió cát vàng mù mịt biên ải, lữ quán ven đường nhộn nhịp khách dừng chân.'
    },
    {
      id: 153,
      type: 'village',
      n: 'Thạch Cổ Trấn',
      sub: 'Thôn trấn chân núi thanh tịnh',
      desc: 'Vách đá ngàn năm dựng đứng che chở cho cuộc sống êm đềm của thôn dân.',
      music: 'town_thachco',
      bg: 'img/z/town_153.jpg',
      ambient: 'Tiếng suối reo róc rách dưới chân núi Thạch Cổ ngút ngàn mây bay.'
    },
    {
      id: 174,
      type: 'village',
      n: 'Long Tuyền Thôn',
      sub: 'Làng đúc kiếm danh bất hư truyền',
      desc: 'Suối nước lạnh ngắt chuyên dùng tôi luyện những thanh kiếm bén ngọt.',
      music: 'town_longtuyen',
      bg: 'img/z/town_174.jpg',
      ambient: 'Tiếng đe búa chan chát rền vang ngày đêm của các bậc danh sư đúc kiếm.'
    },
    {
      id: 175,
      type: 'village',
      n: 'Tây Sơn Thôn',
      sub: 'Sơn thôn mộc mạc hữu tình',
      desc: 'Thôn xóm ẩn hiện dưới tán rừng thông bạt ngàn, không khí trong lành.',
      music: 'town_tayson',
      bg: 'img/z/town_175.jpg',
      ambient: 'Tiếng lá thông xào xạc trong làn sương sớm mai mờ ảo.'
    },
    {
      id: 54,
      type: 'village',
      n: 'Nam Nhạc Trấn',
      sub: 'Hành Sơn chân núi thánh địa',
      desc: 'Cửa ngõ dẫn lên đỉnh Hành Sơn linh thiêng, hương khói nghi ngút.',
      music: 'town_namnhac',
      bg: 'img/z/town_54.jpg',
      ambient: 'Tiếng chuông chùa ngân vang từ đỉnh Hành Sơn vọng về trấn nhỏ.'
    }
  ];

  // Danh sách mẫu NPC chuẩn xuất hiện tại các khu vực an toàn
  const NPC_TEMPLATES = [
    {
      id: 'xaphu',
      name: 'Xa Phu',
      title: '[Dịch Chuyển]',
      img: 'img/npc/xaphu.png',
      sz: [64, 80],
      scale: 0.9,
      relX: -110,
      relY: -40,
      getGreeting: (town) => `Lão phu thông thuộc mọi nẻo đường non sông Đại Tống. Đại hiệp đang dừng chân tại <b>${town.n}</b>, có muốn lão phu đưa đi đâu chăng?`,
      getOptions: () => [
        { text: '1. Ta muốn dịch chuyển đến thành thị & thôn trấn khác', action: () => openMapTravelModal() },
        { text: '2. Ta muốn đến các bãi luyện công quái vật', action: () => { travelTab = 'zone'; openMapTravelModal(); } },
        { text: '3. Hỏi thăm địa thế bản đồ này', action: (town) => alertNpc(town.ambient) },
        { text: '4. Cáo từ Xa Phu', action: null }
      ]
    },
    {
      id: 'datau',
      name: 'Dã Tẩu Tiên Sinh',
      title: '[Nhiệm Vụ 1000]',
      img: 'img/npc/datau.png',
      sz: [64, 80],
      scale: 0.9,
      relX: 110,
      relY: -60,
      getGreeting: (town) => `Tuổi già sức yếu nhưng tâm nguyện dẹp yên loạn thế của lão vẫn chưa thành. Lão nghe danh đại hiệp đã lâu, nay có việc muốn nhờ cậy ngươi!`,
      getOptions: () => [
        { text: '1. Ta muốn xem & nhận chuỗi nhiệm vụ Dã Tẩu', action: () => { if (window.DATAU) DATAU.toggle(); } },
        { text: '2. Xin hỏi phần thưởng chuỗi nhiệm vụ Dã Tẩu gồm những gì?', action: () => alertNpc('Mỗi khi hoàn thành nhiệm vụ, ngươi sẽ nhận được Ngân Lượng, EXP, và chọn 1 trong 3 phần thưởng quý (Thủy Tinh, Huyền Tinh, Trang Bị Hoàng Kim!). Đạt các mốc 10, 20, 50, 100 sẽ được thưởng thêm đại lễ!') },
        { text: '3. Cáo từ Dã Tẩu', action: null }
      ]
    },
    {
      id: 'tiemthuoc',
      name: 'Chủ Tiệm Thuốc',
      title: '[Dược Điếm]',
      img: 'img/npc/tiemthuoc.png',
      sz: [64, 80],
      scale: 0.88,
      relX: -160,
      relY: 80,
      getGreeting: (town) => `Tiệm thuốc của ta tại ${town.n} gia truyền từ nhiều đời, có đủ các loại linh đan diệu dược, Kim Sáng Dược phục hồi sinh lực, Ngũ Hoa Ngọc Lộ Hoàn dưỡng khí bổ tâm!`,
      getOptions: () => [
        {
          text: '1. Mua 50 bình Kim Sáng Dược (5,000 lượng)',
          action: () => quickBuyPot('hp', 50, 5000)
        },
        {
          text: '2. Mua 50 bình Ngũ Hoa Ngọc Lộ Hoàn (5,000 lượng)',
          action: () => quickBuyPot('mp', 50, 5000)
        },
        {
          text: '3. Mua 10 tấm Thổ Địa Phù về thành (5,000 lượng)',
          action: () => quickBuyPot('tp', 10, 5000)
        },
        { text: '4. Mở cửa hàng thương nghiệp đầy đủ', action: () => shopModal() },
        { text: '5. Cáo từ', action: null }
      ]
    },
    {
      id: 'thoren',
      name: 'Thợ Rèn',
      title: '[Lò Rèn Binh Khí]',
      img: 'img/npc/thoren.png',
      sz: [64, 80],
      scale: 0.88,
      relX: 160,
      relY: 70,
      getGreeting: (town) => `Lửa lò rực sáng, búa thép rền vang! Dù là thần binh lợi khí hay hộ giáp phi phong, qua tay lò rèn ta đều sắc bén vô song!`,
      getOptions: () => [
        { text: '1. Ta muốn cường hóa & nâng cấp trang bị', action: () => { if (typeof openForgeHub === 'function') openForgeHub(); else forgeModal(); } },
        { text: '2. Ta muốn khảm nạm ngọc bích & giám định', action: () => forgeModal() },
        { text: '3. Bán nhanh toàn bộ đồ trắng trong rương', action: () => { sellWhiteItems(); } },
        { text: '4. Bán toàn bộ trang bị chưa mặc trong túi', action: () => { sellAllBagGear(); } },
        { text: '5. Cáo từ Thợ Rèn', action: null }
      ]
    },
    {
      id: 'taphoa',
      name: 'Chủ Tiệm Tạp Hóa',
      title: '[Tạp Hóa & Rương]',
      img: 'img/npc/taphoa.png',
      sz: [64, 80],
      scale: 0.88,
      relX: 0,
      relY: 120,
      getGreeting: (town) => `Tạp hóa khắp thiên hạ tụ hội về ${town.n}, muốn mua gì tích trữ hay gửi đồ vào Rương Chứa, lão đều giúp được!`,
      getOptions: () => [
        { text: '1. Mở Hòm Chứa Đồ (Rương Đồ)', action: () => { if (typeof openStashModal === 'function') openStashModal(); else toast('Rương đồ đã sẵn sàng'); } },
        { text: '2. Mua 1 bình Tiên Thảo Lộ x2 EXP (20,000 lượng)', action: () => buySpecialItem('ttl', 20000, 'Tiên Thảo Lộ') },
        { text: '3. Mở Chợ Đen Hắc Thị (Kỳ Trân Các)', action: () => { if (window.BLACK_MARKET) BLACK_MARKET.toggleWindow(); } },
        { text: '4. Ta muốn dựng sạp Bày Bán Hàng Rong', action: () => { if (window.STALL) STALL.toggle(); } },
        { text: '5. Cáo từ', action: null }
      ]
    },
    {
      id: 'vosi',
      name: 'Võ Sư',
      title: '[Chỉ Điểm Võ Học]',
      img: 'img/npc/vosi.png',
      sz: [63, 81],
      scale: 1.0,
      relX: -120,
      relY: -110,
      getGreeting: (town) => `Võ học giang hồ mênh mông như biển cả. Luyện võ phải chú trọng gốc rễ, phối hợp nội ngoại công cùng ngũ hành sinh khắc mới mong đại thành!`,
      getOptions: () => [
        {
          text: '1. Ta muốn Tẩy Điểm Tiềm Năng (Miễn phí)',
          action: () => resetAttrs()
        },
        {
          text: '2. Ta muốn Tẩy Điểm Kỹ Năng Võ Công (Miễn phí)',
          action: () => resetSkills()
        },
        { text: '3. Xem Phi Phong & Đả Thông Kỳ Kinh Bát Mạch', action: () => { if (window.CLOAK_MERIDIAN) CLOAK_MERIDIAN.toggleWindow(); } },
        { text: '4. Mở bảng Kỹ Năng Võ Công', action: () => openWin('skill') },
        { text: '5. Cáo từ Võ Sư', action: null }
      ]
    },
    {
      id: 'tongkim',
      name: 'Mộ Binh Quan Tống Kim',
      title: '[Chiến Trường Tống Kim]',
      img: 'img/npc/tongkim.png',
      sz: [73, 79],
      scale: 1.0,
      relX: 130,
      relY: -110,
      getGreeting: (town) => `Chiến trường Tống Kim đang hồi ác liệt! Hai phe Tống - Kim đang chiêu mộ nghĩa sĩ thiên hạ đến cứu nguy giang sơn. Đại hiệp đã sẵn sàng vị quốc vong thân?`,
      getOptions: () => [
        { text: '1. Ta muốn Báo Danh tham gia Chiến Trường Tống Kim', action: () => { if (window.TONGKIM) TONGKIM.openRegisterModal(); } },
        { text: '2. Mở Cửa Hàng Quân Nhu Tống Kim', action: () => { if (window.TONGKIM) TONGKIM.openShopModal(); } },
        { text: '3. Xem Bảng Xếp Hạng & Báo Cáo Nhanh', action: () => { if (window.TONGKIM) TONGKIM.openFastReport(); } },
        { text: '4. Cáo từ Quan Quân', action: null }
      ]
    },
    {
      id: 'bachthulam',
      name: 'Bạch Thu Lâm',
      title: '[Sứ Giả Phúc Lợi]',
      img: 'img/npc/bachthulam.png',
      sz: [54, 77],
      scale: 1.1,
      relX: 0,
      relY: -130,
      getGreeting: (town) => `Chào mừng hiệp khách đến với giang hồ ${town.n}! Thu Lâm thay mặt đồng đạo chúc đại hiệp sớm ngày vang danh thiên hạ!`,
      getOptions: () => [
        { text: '1. Mở Bảng Điểm Danh Hằng Ngày & 28 Ngày', action: () => { if (window.SIGNIN) SIGNIN.toggle(); } },
        { text: '2. Quản Lý Bạn Đồng Hành (Pet / Companion)', action: () => { if (window.COMPANION_SYSTEM) COMPANION_SYSTEM.toggleWindow(); } },
        { text: '3. Xem Lịch Hoạt Động & Săn Boss Hoàng Kim', action: () => { if (window.ACTIVITY_SYSTEM) ACTIVITY_SYSTEM.toggleWindow(); } },
        { text: '4. Nhận Quà Tân Thủ Phúc Lợi (100,000 lượng)', action: () => claimWelcomeGift() },
        { text: '5. Cáo từ Thu Lâm cô nương', action: null }
      ]
    },
    {
      id: 'tuuquan',
      name: 'Chủ Tửu Quán',
      title: '[Tin Tức Giang Hồ]',
      img: 'img/npc/tuuquan.png',
      sz: [54, 71],
      scale: 1.1,
      relX: 200,
      relY: -10,
      getGreeting: (town) => `Rượu ngon thịt béo! Lữ khách bốn phương qua tửu quán đều để lại muôn vàn bí mật giang hồ. Đại hiệp có muốn nghe ngóng tin tức chăng?`,
      getOptions: () => [
        {
          text: '1. Uống một vò Nữ Nhi Hồng (Hồi đầy Sinh lực & Nội lực, 1,000 lượng)',
          action: () => drinkWine()
        },
        {
          text: '2. Nghe ngóng tin tức Boss Hoàng Kim Thế Giới',
          action: () => alertNpc('Tin mật: Đại Boss Hoàng Kim Lam Y Y, Cổ Tống, Diệu Như thường xuất hiện vào lúc giao ban tại các bản đồ cấp 80 trở lên. Đánh bại họ sẽ rơi Thần Binh Định Quốc và Thủy Tinh cực phẩm!')
        },
        {
          text: '3. Nghe ngóng tình hình các cao thủ võ lâm',
          action: () => { if (typeof openRankModal === 'function') openRankModal(); else toast('Giang hồ nhân tài lớp lớp xuất hiện!'); }
        },
        { text: '4. Cáo từ', action: null }
      ]
    }
  ];

  let currentTownNpcs = [];
  let currentDialogNpc = null;

  // Lấy danh sách NPC cho thành thị / thôn trấn hiện tại
  function getNpcsForTown(townName) {
    const t = TOWNS_CONFIG.find(x => x.n === townName) || TOWNS_CONFIG[0];
    const centerX = WORLD.w / 2;
    const centerY = WORLD.h / 2;

    const list = NPC_TEMPLATES.map(tpl => {
      return {
        id: tpl.id,
        name: tpl.name,
        title: tpl.title,
        isNpc: true,
        x: centerX + tpl.relX,
        y: centerY + tpl.relY,
        img: img(tpl.img),
        sz: tpl.sz,
        scale: tpl.scale,
        town: t,
        getGreeting: () => tpl.getGreeting(t),
        getOptions: () => tpl.getOptions(t)
      };
    });

    currentTownNpcs = list;
    return list;
  }

  function getCurNpcs() {
    if (!R.town) return [];
    if (!currentTownNpcs.length) {
      getNpcsForTown(R.currentTown || 'Biện Kinh');
    }
    return currentTownNpcs;
  }

  // Tìm NPC tại tọa độ chạm/click chuột
  function getNpcAt(wx, wy, rad = 38) {
    if (!R.town) return null;
    const npcs = getCurNpcs();
    for (const n of npcs) {
      if (Math.hypot(n.x - wx, n.y - wy) <= rad) {
        return n;
      }
    }
    return null;
  }

  // Vẽ NPC lên Canvas
  function drawNpc(c, dt, npc) {
    // 1. Bóng dưới chân
    c.fillStyle = '#0008';
    c.beginPath();
    c.ellipse(npc.x, npc.y + 2, 20, 8, 0, 0, Math.PI * 2);
    c.fill();

    // 2. Sprite NPC
    let drawn = false;
    if (npc.img && npc.img.complete && npc.img.naturalWidth) {
      const sw = npc.sz[0], sh = npc.sz[1];
      const dw = sw * npc.scale, dh = sh * npc.scale;
      // Nhẹ nhàng nhấp nhô thở (breathing idle animation)
      const bob = Math.sin((Date.now() / 350) + (npc.x % 10)) * 1.5;
      c.drawImage(npc.img, 0, 0, sw, sh, npc.x - dw / 2, npc.y - dh + bob, dw, dh);
      drawn = true;
    }

    if (!drawn) {
      c.fillStyle = '#ffd700';
      c.beginPath();
      c.arc(npc.x, npc.y - 30, 16, 0, Math.PI * 2);
      c.fill();
    }

    // 3. Tên & Danh hiệu trên đầu NPC
    const topY = npc.y - (npc.sz ? npc.sz[1] * npc.scale : 60) - 8;
    // Danh hiệu màu xanh ngọc
    c.font = 'bold 10px "IBM Plex Mono", sans-serif';
    c.textAlign = 'center';
    c.fillStyle = '#38bdf8';
    c.fillText(npc.title, npc.x, topY - 14);

    // Tên NPC màu vàng óng có viền đen
    c.font = 'bold 12px "IBM Plex Mono", sans-serif';
    c.fillStyle = '#000';
    c.fillText(npc.name, npc.x + 1, topY + 1);
    c.fillStyle = '#fef08a';
    c.fillText(npc.name, npc.x, topY);
  }

  // Tương tác & Mở Hộp Thoại NPC Dialog
  function interact(npc) {
    if (!npc) return;
    currentDialogNpc = npc;
    if (typeof uiSfx === 'function') uiSfx('use');
    openDialog(npc);
  }

  function openDialog(npc) {
    const fw = document.getElementById('fw-npc-dialog');
    if (!fw) return;

    const town = npc.town || { n: R.currentTown || 'Biện Kinh' };
    const greeting = npc.getGreeting(town);
    const options = npc.getOptions(town);

    let optsHtml = options.map((opt, idx) => `
      <button class="npc-dialog-opt" onclick="TOWN_NPC.chooseOption(${idx})">
        ${esc(opt.text)}
      </button>
    `).join('');

    fw.innerHTML = `
      <div class="npc-dialog-box">
        <div class="npc-dialog-header">
          <div class="npc-badge-info">
            <span class="npc-dlg-title">${esc(npc.title)}</span>
            <span class="npc-dlg-name">${esc(npc.name)}</span>
          </div>
          <button class="npc-dlg-close" onclick="TOWN_NPC.closeDialog()">✕</button>
        </div>
        <div class="npc-dialog-main">
          <div class="npc-portrait">
            <img src="${npc.img ? npc.img.src : 'img/npc/xaphu.png'}" alt="${npc.name}">
          </div>
          <div class="npc-dialog-speech">
            <p>${greeting}</p>
          </div>
        </div>
        <div class="npc-dialog-options">
          ${optsHtml}
        </div>
      </div>
    `;

    fw.classList.remove('hidden');
    // Căn giữa phía dưới màn hình chuẩn game VLTK
    fw.style.bottom = '90px';
    fw.style.left = 'calc(50% - 250px)';
  }

  function chooseOption(idx) {
    if (!currentDialogNpc) return;
    const options = currentDialogNpc.getOptions(currentDialogNpc.town);
    const opt = options[idx];
    closeDialog();
    if (opt && typeof opt.action === 'function') {
      opt.action(currentDialogNpc.town);
    }
  }

  function closeDialog() {
    const fw = document.getElementById('fw-npc-dialog');
    if (fw) fw.classList.add('hidden');
    currentDialogNpc = null;
  }

  // Tiện ích hành động NPC
  function alertNpc(text) {
    if (typeof modal === 'function') {
      modal(`
        <div style="padding:14px;text-align:center;color:#f5ede0;">
          <h4 style="color:#ffd700;font-size:14px;margin-bottom:8px;">📜 LỜI DẶN GIANG HỒ</h4>
          <p style="font-size:12px;line-height:1.6;color:#cbd5e1;">${text}</p>
          <button class="jx-action-btn gold" onclick="closeModal()" style="margin-top:12px;">Đã Hiểu</button>
        </div>
      `);
    } else {
      alert(text);
    }
  }

  function quickBuyPot(type, count, cost) {
    if ((S.gold || 0) < cost) {
      toast(`Không đủ ngân lượng! Cần ${fmt(cost)} lượng.`);
      return;
    }
    S.gold -= cost;
    if (typeof S.pot !== 'undefined') {
      if (type === 'hp') S.pot.hp = (S.pot.hp || 0) + count;
      else if (type === 'mp') S.pot.mp = (S.pot.mp || 0) + count;
    }
    uiSfx('use');
    toast(`Mua thành công ${count} bình dược phẩm!`);
    if (typeof refresh === 'function') refresh();
    if (typeof save === 'function') save();
  }

  function buySpecialItem(key, cost, name) {
    if ((S.gold || 0) < cost) {
      toast(`Không đủ ngân lượng! Cần ${fmt(cost)} lượng.`);
      return;
    }
    S.gold -= cost;
    if (!Array.isArray(S.inv)) S.inv = [];
    S.inv.push({
      uid: Date.now(),
      n: name,
      r: 2,
      ic: 'img/it/ttl.png',
      desc: 'Tăng 100% EXP nhận được trong 1 giờ.'
    });
    uiSfx('use');
    toast(`Đã mua thành công 1 [${name}]!`);
    if (typeof refresh === 'function') refresh();
    if (typeof save === 'function') save();
  }

  function claimWelcomeGift() {
    if (S.claimedWelcome) {
      toast('Hiệp khách đã nhận gói quà tân thủ này rồi!');
      return;
    }
    S.claimedWelcome = true;
    S.gold = (S.gold || 0) + 100000;
    if (typeof window.reportLegitGoldGain === 'function') window.reportLegitGoldGain(100000);
    uiSfx('levelup');
    toast('🎉 Chúc mừng bạn đã nhận 10 vạn ngân lượng hỗ trợ từ Bạch Thu Lâm!');
    if (typeof refresh === 'function') refresh();
    if (typeof save === 'function') save();
  }

  function drinkWine() {
    if ((S.gold || 0) < 1000) {
      toast('Không đủ 1,000 lượng để mua rượu ngon!');
      return;
    }
    S.gold -= 1000;
    if (R.P) {
      R.life = R.P.life;
      R.mana = R.P.mana;
    }
    uiSfx('use');
    toast('🍷 Uống cạn vò Nữ Nhi Hồng! Toàn bộ Sinh lực & Nội lực đã hồi phục hoàn toàn!');
    if (typeof refresh === 'function') refresh();
  }

  function resetAttrs() {
    if (!confirm('Bạn có chắc chắn muốn tẩy toàn bộ điểm tiềm năng để phân phối lại?')) return;
    const totalPts = ((S.lvl || 1) - 1) * 5;
    S.attrPts = totalPts;
    S.attr = { str: 0, dex: 0, vit: 0, eng: 0 };
    toast('✨ Đã tẩy điểm tiềm năng thành công!');
    if (typeof recalc === 'function') recalc();
    if (typeof refresh === 'function') refresh();
    if (typeof save === 'function') save();
  }

  function resetSkills() {
    if (!confirm('Bạn có chắc chắn muốn tẩy toàn bộ điểm kỹ năng võ công để cộng lại?')) return;
    const totalPts = ((S.lvl || 1) - 1);
    S.skPts = totalPts;
    S.sk = {};
    toast('⚡ Đã tẩy điểm kỹ năng võ công thành công!');
    if (typeof recalc === 'function') recalc();
    if (typeof refresh === 'function') refresh();
    if (typeof save === 'function') save();
  }

  function onTownEntered(town) {
    getNpcsForTown(town.n);
    closeDialog();
  }

  return {
    TOWNS_CONFIG,
    getNpcsForTown,
    getCurNpcs,
    getNpcAt,
    drawNpc,
    interact,
    chooseOption,
    closeDialog,
    onTownEntered
  };
})();
