/* ==========================================================================
   CLIENT MULTIPLAYER & CHAT REAL-TIME (VO LAM WEB IDLE)
   Kết nối WebSocket, đồng bộ tọa độ, môn phái, đẳng cấp, danh hiệu VIP,
   vẽ người chơi khác cùng bản đồ và hiển thị bong bóng chat trên đầu.
   ========================================================================== */
'use strict';

const MP = {
  ws: null,
  myId: null,
  connected: false,
  lastSendT: 0,
  lastForceT: 0,
  lastX: 0,
  lastY: 0,
  lastAct: '',
  otherPlayers: {}
};

function getCurZoneId() {
  if (typeof R !== 'undefined' && R && R.town) return 37; // Biện Kinh
  if (typeof S !== 'undefined' && S && S.stage && typeof zoneOf === 'function' && typeof STAGES !== 'undefined') {
    try {
      const z = zoneOf(Math.min(S.stage || 1, STAGES));
      return z ? z.id : 2;
    } catch (e) {
      return 2;
    }
  }
  return 2;
}

let _mpConnecting = false;
let _reconnectTimer = null;

function scheduleReconnect() {
  if (_reconnectTimer) return;
  _reconnectTimer = setTimeout(() => {
    _reconnectTimer = null;
    if (!MP.connected && typeof initMultiplayer === 'function') {
      console.log('[Multiplayer] Tự động kết nối lại...');
      initMultiplayer();
    }
  }, 2500);
}

function initMultiplayer() {
  if (typeof WebSocket === 'undefined') return;
  if (MP.connected) return;
  if (MP.ws && (MP.ws.readyState === WebSocket.OPEN || MP.ws.readyState === WebSocket.CONNECTING)) {
    return;
  }
  if (_mpConnecting) return;
  _mpConnecting = true;

  const loc = window.location;
  const isHttps = loc.protocol === 'https:';
  const proto = isHttps ? 'wss://' : 'ws://';
  const host = loc.hostname || 'localhost';
  const port = loc.port ? `:${loc.port}` : '';
  const url = `${proto}${host}${port}`;

  connectWs(url);
}

function connectWs(url) {
  try {
    if (MP.ws && MP.ws.readyState !== WebSocket.CLOSED) {
      try { MP.ws.close(); } catch (e) {}
    }
    const ws = new WebSocket(url);
    MP.ws = ws;

    ws.onopen = () => {
      _mpConnecting = false;
      console.log(`[Multiplayer] Đã kết nối thành công WebSocket: ${url}`);
      MP.connected = true;
      updateOnlineStatusBadge(true);
      sendProfile();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleServerMessage(msg);
      } catch (e) {
        console.error('[Multiplayer] Lỗi parse message:', e);
      }
    };

    ws.onclose = () => {
      _mpConnecting = false;
      MP.connected = false;
      updateOnlineStatusBadge(false);
      scheduleReconnect();
    };

    ws.onerror = () => {
      _mpConnecting = false;
      MP.connected = false;
      scheduleReconnect();
    };
  } catch (e) {
    _mpConnecting = false;
    scheduleReconnect();
  }
}

function handleServerMessage(msg) {
  if (!msg || !msg.type) return;

  if (msg.type === 'kicked') {
    MP.connected = false;
    if (typeof modal === 'function') {
      modal(`
        <div style="padding:16px;text-align:center;">
          <h3 style="color:#ef4444;margin-bottom:10px;">⚠️ MẤT KẾT NỐI</h3>
          <p style="color:#ffd700;font-size:13px;margin-bottom:14px;">${typeof esc === 'function' ? esc(msg.message) : msg.message}</p>
          <button class="jx-action-btn gold" onclick="location.reload()">Đăng nhập lại</button>
        </div>
      `, null, true);
    } else {
      alert(msg.message);
    }
    return;
  }

  if (msg.type === 'init') {
    MP.myId = msg.myId;
    // Chỉ thêm người chơi CÙNG ZONE vào danh sách hiển thị
    // Zone của mình chưa biết ngay (phải gửi profile trước), nên thêm tất cả nhưng
    // getVisibleOtherPlayers() sẽ lọc lại theo zone khi render
    (msg.players || []).forEach(p => {
      if (p.id !== MP.myId) {
        addOrUpdatePlayer(p);
      }
    });
    updateOnlineCount();
  } else if (msg.type === 'player_join') {
    if (msg.player && msg.player.id !== MP.myId) {
      addOrUpdatePlayer(msg.player);
      if (typeof toast === 'function') {
        toast(`Hiệp khách ${msg.player.name} vừa xuất hiện!`);
      }
      if (typeof log === 'function') {
        log(`<span style="color:#60a5fa;">[Giang Hồ] Hiệp khách <b>${esc(msg.player.name)}</b> đã gia nhập thế giới.</span>`);
      }
      updateOnlineCount();
    }
  } else if (msg.type === 'online_count') {
    MP.onlineCount = Number(msg.count) || 1;
    updateOnlineCount();
  } else if (msg.type === 'player_update') {
    if (msg.player && msg.player.id !== MP.myId) {
      addOrUpdatePlayer(msg.player);
      const p = MP.otherPlayers[msg.player.id];
      if (p) {
        if (msg.player.lvl != null) p.lvl = msg.player.lvl;
        if (msg.player.eq) p.eq = msg.player.eq;
      }
    }
  } else if (msg.type === 'player_move') {
    let p = MP.otherPlayers[msg.id];
    if (!p) {
      addOrUpdatePlayer({
        id: msg.id,
        name: msg.name,
        lvl: msg.lvl,
        x: msg.x,
        y: msg.y,
        dir: msg.dir,
        face: msg.face,
        act: msg.act,
        stage: msg.stage,
        zoneId: msg.zoneId,
        mounted: msg.mounted,
        mountTier: msg.mountTier,
        mount: msg.mount,
        cloakTier: msg.cloakTier,
        eq: msg.eq
      });
      p = MP.otherPlayers[msg.id];
    }
    if (p) {
      if (msg.lvl != null) p.lvl = msg.lvl;
      if (msg.name) p.name = msg.name;
      if (msg.eq) p.eq = msg.eq;
      p.targetX = msg.x;
      p.targetY = msg.y;
      if (msg.dir != null && p.act !== 'at') p.dir = msg.dir;
      if (msg.face != null && p.act !== 'at') p.face = msg.face;
      if (msg.mounted !== undefined) p.mounted = !!msg.mounted;
      if (msg.mountTier != null) p.mountTier = msg.mountTier;
      if (msg.mount) p.mount = msg.mount;
      if (msg.cloakTier != null) p.cloakTier = msg.cloakTier;
      if (msg.pkMode) p.pkMode = msg.pkMode;
      if (msg.pkValue != null) p.pkValue = msg.pkValue;
      if (msg.jailUntil != null) p.jailUntil = msg.jailUntil;
      if (msg.hp != null) p.hp = msg.hp;
      if (msg.maxHp != null) p.maxHp = msg.maxHp;
      if (msg.act) {
        if (p.act !== 'at' || msg.act === 'at' || (p.actT || 0) >= 0.35) {
          p.act = msg.act;
        }
      }
      if (msg.stage != null) p.stage = msg.stage;
      if (msg.zoneId != null) p.zoneId = msg.zoneId;
      p.moving = (p.act === 'run');
    }
  } else if (msg.type === 'player_pk_mode') {
    let p = MP.otherPlayers[msg.id];
    if (p) {
      const oldMode = p.pkMode;
      p.pkMode = msg.pkMode;
      if (msg.pkValue != null) p.pkValue = msg.pkValue;
      if (p.zoneId === getCurZoneId()) {
        if (msg.pkMode === 'slaughter') {
          if (typeof log === 'function') log(`<span style="color:#ec4899;font-weight:bold;">[Đồ Sát] Hiệp khách <b>${esc(p.name)}</b> vừa bật chế độ [ĐỒ SÁT]! Máu chuyển sang màu hồng!</span>`);
          if (typeof toast === 'function') toast(`🩸 [Cảnh báo] ${p.name} vừa bật Đồ Sát!`);
        } else if (msg.pkMode === 'pk' && oldMode !== 'pk') {
          if (typeof log === 'function') log(`<span style="color:#f59e0b;">[PK] Hiệp khách <b>${esc(p.name)}</b> đã chuyển sang chế độ [PK].</span>`);
        }
      }
    }
  } else if (msg.type === 'pk_update') {
    if (typeof S !== 'undefined' && S) {
      if (msg.pkValue !== undefined) S.pkValue = msg.pkValue;
      if (msg.jailUntil !== undefined) S.jailUntil = msg.jailUntil;
      if (msg.lastPkReduceT !== undefined) S.lastPkReduceT = msg.lastPkReduceT;
      if (msg.msg) {
        if (typeof toast === 'function') toast(msg.msg, 6000);
        if (typeof log === 'function') log(`<span style="color:#ef4444;font-weight:bold;">${msg.msg}</span>`);
      }
      if (S.jailUntil && S.jailUntil > Date.now()) {
        if (typeof travelToZone === 'function' && typeof getCurZoneId === 'function' && getCurZoneId() !== 37) {
          travelToZone(37);
        }
      }
      if (typeof updatePkModeBtn === 'function') updatePkModeBtn();
      if (typeof save === 'function') save();
      if (typeof refresh === 'function') refresh();
    }
  } else if (msg.type === 'pvp_death') {
    if (typeof heroDeath === 'function') {
      heroDeath(!!msg.penaltyDrop);
    }
    if (msg.penaltyDrop) {
      if (typeof toast === 'function') toast(`💀 Bạn có PK = ${msg.victimPk || 10}! Bị đánh chết văng sạch trang bị và tiền bạc!`, 8000);
      if (typeof log === 'function') log(`<b style="color:#ef4444;font-size:14px;">[TRỪ GIAN DIỆT ÁC] Điểm PK của bạn là ${msg.victimPk || 10}! Khi chết đã bị rơi sạch toàn bộ ngân lượng và trang bị đang mặc trên người!</b>`);
    }
  } else if (msg.type === 'pvp_damaged') {
    if (typeof R !== 'undefined' && R && typeof H !== 'undefined') {
      const dmg = Number(msg.dmg) || 0;
      R.life = Math.max(0, R.life - dmg);
      H.act = 'hurt';
      H.actT = 0;
      if (typeof addText === 'function') {
        addText(H.x, H.y - 30, `-${fmt(dmg)}`, '#ef4444', 16);
      }
      if (typeof npcSfx === 'function' && typeof W !== 'undefined' && W.hero && W.hero[S && S.fac]) {
        npcSfx(W.hero[S.fac].anim, 'hurt', 0.3);
      }
      if (msg.attackerPkMode === 'slaughter') {
        if (typeof S !== 'undefined' && S) {
          S.selfDefenseTargetId = msg.attackerId;
          S.selfDefenseUntil = Date.now() + 15000;
        }
        if (typeof toast === 'function') toast(`⚠️ Bị [${msg.attackerName}] đồ sát tấn công! Kích hoạt tự vệ!`);
        if (typeof log === 'function') log(`<span style="color:#ef4444;font-weight:bold;">[Đồ Sát] Bạn bị <b>${esc(msg.attackerName)}</b> đồ sát tấn công! Kích hoạt quyền tự vệ chính đáng trong 15s.</span>`);
      }
      if (R.life <= 0 && typeof heroDeath === 'function') {
        heroDeath();
      }
    }
  } else if (msg.type === 'player_damaged') {
    const p = MP.otherPlayers[msg.id];
    if (p) {
      if (msg.hp != null) p.hp = msg.hp;
      p.act = 'hurt';
      p.actT = 0;
      if (typeof addText === 'function' && msg.dmg) {
        addText(p.x, p.y - 25, `-${fmt(msg.dmg)}`, '#f87171', 13);
      }
    }
  } else if (msg.type === 'player_skill') {
    let p = MP.otherPlayers[msg.id];
    if (!p) {
      addOrUpdatePlayer({ id: msg.id, x: msg.x, y: msg.y, dir: msg.dir, face: msg.face, act: 'at' });
      p = MP.otherPlayers[msg.id];
    }
    if (p) {
      if (msg.x != null) p.x = p.targetX = msg.x;
      if (msg.y != null) p.y = p.targetY = msg.y;
      if (msg.dir != null) p.dir = msg.dir;
      if (msg.face != null) p.face = msg.face;
      p.act = 'at';
      p.actT = 0; // Kích hoạt chạy lại animation xuất chiêu

      // Kích hoạt hiệu ứng hình ảnh chiêu thức
      // Chỉ hiển thị hiệu ứng kỹ năng nếu ở cùng bản đồ
      if (p.zoneId === getCurZoneId()) {
        const targetObj = { x: msg.tx, y: msg.ty };
        const atkCfg = (msg.skillId && typeof SK !== 'undefined' && SK[msg.skillId])
          ? SK[msg.skillId]
          : { id: msg.skillId, parts: { phys: 1 }, melee: true };

        if (typeof skillFx === 'function') {
          skillFx(p, targetObj, atkCfg);
        }

        // Âm thanh chiêu thức nếu trong phạm vi màn hình
        const distToHero = (typeof H !== 'undefined') ? Math.hypot(p.x - H.x, p.y - H.y) : 0;
        if (distToHero < 900) {
          if (msg.skillId && typeof skillSfx === 'function') {
            skillSfx(msg.skillId);
          } else if (typeof npcSfx === 'function' && typeof W !== 'undefined' && W.hero && W.hero[p.fac]) {
            npcSfx(W.hero[p.fac].anim, 'at', 0.25);
          }
        }
      }
    }
  } else if (msg.type === 'zone_mobs_sync') {
    if (msg.zoneId === getCurZoneId()) {
      if (typeof R !== 'undefined') R.serverMobsActive = true;
      syncServerMobs(msg.mobs);
    }
  } else if (msg.type === 'mob_spawn') {
    if (msg.zoneId === getCurZoneId()) {
      addServerMob(msg.mob);
    }
  } else if (msg.type === 'mob_damage') {
    if (typeof R !== 'undefined' && R.enemies) {
      const e = R.enemies.find(m => m.id === msg.mobId);
      if (e) {
        e.hp = msg.hp;
        e.hitT = 0.12;
        if (typeof addText === 'function') {
          addText(e.x, e.y - e.r - 6, fmt(msg.dmg), '#ffd700', 12);
        }
      }
    }
  } else if (msg.type === 'state_sync') {
    // Nhận gói tin đồng bộ trạng thái chính xác tuyệt đối từ Server (Server-Authoritative State)
    if (typeof S !== 'undefined' && S) {
      window._legitLevelTransition = true;
      window._legitExpGain = true;
      try {
        if (msg.gold !== undefined) S.gold = msg.gold;
        // Offline idle client làm chủ tiến trình; không bao giờ để server đè tụt cấp hoặc % kinh nghiệm
        if (msg.lvl !== undefined && msg.lvl > S.lvl) S.lvl = msg.lvl;
        if (msg.xp !== undefined && msg.lvl === S.lvl && msg.xp > S.xp) S.xp = msg.xp;
        if (msg.attrPts !== undefined) {
          const maxAttr = (S.lvl - 1) * 5 + ((S.rw && S.rw.stat && S.rw.stat.reborn) || 0) * 100 + 50;
          const spentAttr = ((S.attr && S.attr.str) || 0) + ((S.attr && S.attr.dex) || 0) + ((S.attr && S.attr.vit) || 0) + ((S.attr && S.attr.eng) || 0);
          S.attrPts = Math.max(0, Math.min(msg.attrPts, Math.max(0, maxAttr - spentAttr)));
        }
        if (msg.skPts !== undefined) {
          let spentSk = 0;
          if (S.sk) { for (const k in S.sk) spentSk += (S.sk[k] || 0); }
          const rebornCount = ((S.rw && S.rw.stat && S.rw.stat.reborn) || 0);
          const maxSk = 1 + (S.lvl - 1) * 1 + rebornCount * 50 + 200;
          S.skPts = Math.max(0, Math.min(msg.skPts, Math.max(0, maxSk - spentSk)));
        }
      } finally {
        window._legitLevelTransition = false;
        window._legitExpGain = false;
      }
      if (msg.inv !== undefined) S.inv = msg.inv;
      if (msg.mount !== undefined) S.mount = msg.mount;
      if (msg.attr && typeof S.attr === 'object') Object.assign(S.attr, msg.attr);
      if (msg.sk && typeof S.sk === 'object') Object.assign(S.sk, msg.sk);
      if (msg.pkValue !== undefined) S.pkValue = msg.pkValue;
      if (msg.jailUntil !== undefined) S.jailUntil = msg.jailUntil;
      if (msg.lastPkReduceT !== undefined) S.lastPkReduceT = msg.lastPkReduceT;
      if (msg.vip && typeof msg.vip === 'object') {
        S.vip = Object.assign(S.vip || {}, msg.vip);
        if (typeof updateVipTopBtn === 'function') updateVipTopBtn();
      }
      if (typeof _updateLastAuthoritativeState === 'function') {
        _updateLastAuthoritativeState(S);
      }
      if (msg.didLevelUp) {
        if (typeof uiSfx === 'function') uiSfx('levelup');
        if (typeof checkAutoMap === 'function') checkAutoMap();
        if (typeof log === 'function') log(`<b class="up">Máy chủ xác nhận: Lên cấp ${S.lvl}!</b> +5 tiềm năng, +1 kỹ năng`);
      }
      if (typeof recalc === 'function') recalc();
      if (typeof refresh === 'function') refresh();
      if (typeof updateDots === 'function') updateDots();
    }
  } else if (msg.type === 'mob_die') {
    if (typeof DATAU !== 'undefined' && DATAU.onMonsterKilled) {
      DATAU.onMonsterKilled(typeof getCurZoneId === 'function' ? getCurZoneId() : 0);
    }
    if (typeof R !== 'undefined' && R.enemies) {
      const e = R.enemies.find(m => m.id === msg.mobId);
      if (e) {
        e.hp = 0;
        e.dead = true;
        if (typeof burst === 'function') burst(e.x, e.y, '#ff4444');
        if (msg.killerId === MP.myId) {
          if (typeof addText === 'function') {
            if (msg.exp) addText(e.x, e.y - 20, `+${fmt(msg.exp)} EXP`, '#ffd700', 12);
            if (msg.gold) addText(e.x, e.y - 36, `+${fmt(msg.gold)} Vàng`, '#f59e0b', 12);
          }
          if (typeof toast === 'function') toast(`Hạ quái: +${msg.exp} EXP, +${msg.gold} Vàng`);
        }
      }
    }
  } else if (msg.type === 'trade_req_prompt') {
    if (typeof TRADE !== 'undefined' && TRADE.onInvitePrompt) TRADE.onInvitePrompt(msg);
  } else if (msg.type === 'trade_sync') {
    if (typeof TRADE !== 'undefined' && TRADE.onSync) TRADE.onSync(msg.session);
  } else if (msg.type === 'trade_complete') {
    if (typeof TRADE !== 'undefined' && TRADE.onComplete) TRADE.onComplete();
  } else if (msg.type === 'trade_cancelled') {
    if (typeof TRADE !== 'undefined' && TRADE.onCancelled) TRADE.onCancelled(msg.reason);
  } else if (msg.type === 'datau_sync') {
    if (typeof DATAU !== 'undefined' && DATAU.onSync) DATAU.onSync(msg);
  } else if (msg.type === 'tongkim_sync') {
    if (typeof TONGKIM !== 'undefined' && TONGKIM.onSync) TONGKIM.onSync(msg);
  } else if (msg.type === 'player_chat') {
    const p = MP.otherPlayers[msg.id];
    if (p) {
      p.chat = msg.text;
      p.chatT = 6; // hiển thị 6 giây
    }
    const vipTag = msg.vip > 1 ? `[VIP ${msg.vip}] ` : '';
    const chan = msg.chan || 'world';
    if (typeof appendChatLine === 'function') {
      appendChatLine(chan, `${vipTag}${msg.name}`, msg.text);
    }
  } else if (msg.type === 'player_leave') {
    delete MP.otherPlayers[msg.id];
    updateOnlineCount();
  } else if (msg.type === 'zone_players_sync') {
    // Nhận danh sách người chơi cùng zone khi chuyển bản đồ
    // Xóa tất cả người chơi cũ không ở zone hiện tại
    const newZone = msg.players && msg.players.length > 0 ? msg.players[0].zoneId : null;
    if (newZone != null) {
      for (const id in MP.otherPlayers) {
        if (MP.otherPlayers[id].zoneId !== newZone) {
          delete MP.otherPlayers[id];
        }
      }
    }
    // Thêm người chơi mới cùng zone
    (msg.players || []).forEach(p => {
      if (p.id !== MP.myId) addOrUpdatePlayer(p);
    });
    updateOnlineCount();
  } else if (msg.type === 'stall_sync') {
    const p = MP.otherPlayers[msg.playerId];
    if (p) {
      p.stall = msg.stall;
    }
  } else if (msg.type === 'market_sync') {
    if (Array.isArray(msg.items) && typeof _playerMarketList !== 'undefined') {
      _playerMarketList = msg.items;
    }
  } else if (msg.type === 'market_sold') {
    if (typeof S !== 'undefined' && S) {
      S.gold += Number(msg.gold) || 0;
      if (typeof toast === 'function') toast(`💰 Bán thành công [${msg.itemName}] trên Chợ Đen! Nhận +${fmt(msg.gold)} lượng!`);
      if (typeof save === 'function') save();
      if (typeof refresh === 'function') refresh();
    }
  } else if (msg.type === 'party_sync') {
    PARTY.data = msg.party;
    if (typeof onPartySync === 'function') onPartySync(msg.party);
    if (typeof refreshAutoPartyTab === 'function') refreshAutoPartyTab();
    if (typeof updateTeambar === 'function') updateTeambar();
  } else if (msg.type === 'party_invite_req') {
    if (typeof S !== 'undefined' && S && S.auto && S.auto.autoPartyAccept) {
      sendPartyAccept(msg.partyId);
      if (typeof toast === 'function') toast(`[Auto] Tự động đồng ý vào tổ đội của ${msg.fromName}!`);
    } else {
      if (typeof modal === 'function') {
        modal(`
          <div style="padding:12px;text-align:center;">
            <h4 style="color:#ffd700;margin-bottom:8px;font-weight:700;">👥 LỜI MỜI TỔ ĐỘI</h4>
            <p style="font-size:12px;color:#f5ede0;">Hiệp khách <b>${esc(msg.fromName)}</b> muốn mời bạn vào tổ đội luyện công!</p>
            <p style="font-size:11px;color:#4ade80;margin:6px 0 12px;">(Tổ đội tăng +10% EXP cho mỗi thành viên)</p>
            <div style="display:flex;gap:8px;justify-content:center;">
              <button class="jx-action-btn gold" onclick="sendPartyAccept(${msg.partyId}); closeModal();">Đồng ý</button>
              <button class="jx-action-btn" onclick="closeModal();">Từ chối</button>
            </div>
          </div>
        `);
      }
    }
  }
}

const PARTY = {
  data: null
};

function sendPartyCreate() {
  if (MP.ws && MP.ws.readyState === 1) MP.ws.send(JSON.stringify({ type: 'party_create' }));
}
function sendPartyInvite(targetId) {
  if (MP.ws && MP.ws.readyState === 1) {
    MP.ws.send(JSON.stringify({ type: 'party_invite', targetId: Number(targetId) }));
    if (typeof toast === 'function') toast('Đã gửi lời mời tổ đội!');
  }
}
function sendPartyAccept(partyId) {
  if (MP.ws && MP.ws.readyState === 1) MP.ws.send(JSON.stringify({ type: 'party_accept', partyId: Number(partyId) }));
}
function sendPartyLeave() {
  if (MP.ws && MP.ws.readyState === 1) {
    MP.ws.send(JSON.stringify({ type: 'party_leave' }));
    PARTY.data = null;
    if (typeof refreshAutoPartyTab === 'function') refreshAutoPartyTab();
    if (typeof updateTeambar === 'function') updateTeambar();
    if (typeof toast === 'function') toast('Đã rời khỏi tổ đội');
  }
}
function sendPartyKick(targetId) {
  if (MP.ws && MP.ws.readyState === 1) {
    MP.ws.send(JSON.stringify({ type: 'party_kick', targetId: Number(targetId) }));
  }
}
function sendPartyTransfer(targetId) {
  if (MP.ws && MP.ws.readyState === 1) {
    MP.ws.send(JSON.stringify({ type: 'party_transfer', targetId: Number(targetId) }));
  }
}

function syncServerMobs(mobs) {
  if (!Array.isArray(mobs) || typeof makeEnemy !== 'function' || typeof R === 'undefined') return;
  // Khi người chơi đang ở chế độ Vượt Ải (S.push), phó bản, tháp hoặc thành thị:
  // Không đè danh sách quái riêng của người chơi để tránh hiện tượng quái ẩn hiện liên tục
  if (typeof S !== 'undefined' && S && S.push) return;
  if (typeof R !== 'undefined' && (R.tower || R.dungeon || R.town)) return;
  if (!mobs.length && R.enemies && R.enemies.length > 0) return;

  const existingMap = new Map();
  for (const e of (R.enemies || [])) {
    if (e.isServerMob) existingMap.set(e.id, e);
  }

  const newList = [];
  for (const m of mobs) {
    if (existingMap.has(m.id)) {
      const e = existingMap.get(m.id);
      e.hp = m.hp;
      newList.push(e);
    } else {
      let mx = m.x, my = m.y;
      if (typeof inWorld === 'function') {
        const snap = inWorld(mx, my);
        mx = snap[0]; my = snap[1];
      }
      const e = makeEnemy(m.tid, m.L, m.cls, mx, my);
      e.id = m.id;
      e.hp = m.hp;
      e.max = m.maxHp;
      e.series = m.series;
      e.isServerMob = true;
      newList.push(e);
    }
  }
  // Giữ lại các boss đặc biệt (Boss Hoàng Kim / Boss thế giới / Trùm ải)
  for (const e of (R.enemies || [])) {
    if (!e.isServerMob && (e.goldBoss || e.stageBoss || e.worldBoss) && !e.dead) {
      newList.push(e);
    }
  }
  R.enemies = newList;
}

function addServerMob(m) {
  if (!m || typeof makeEnemy !== 'function' || typeof R === 'undefined') return;
  if (typeof S !== 'undefined' && S && S.push) return;
  if (typeof R !== 'undefined' && (R.tower || R.dungeon || R.town)) return;
  if ((R.enemies || []).some(e => e.id === m.id)) return;
  let mx = m.x, my = m.y;
  if (typeof inWorld === 'function') {
    const snap = inWorld(mx, my);
    mx = snap[0]; my = snap[1];
  }
  const e = makeEnemy(m.tid, m.L, m.cls, mx, my);
  e.id = m.id;
  e.hp = m.hp;
  e.max = m.maxHp;
  e.series = m.series;
  e.isServerMob = true;
  R.enemies = R.enemies || [];
  R.enemies.push(e);
}

function requestZoneMobs() {
  if (!MP.ws || MP.ws.readyState !== 1) return;
  const now = Date.now();
  if (MP._lastReqMobs && now - MP._lastReqMobs < 1500) return; // Tránh spam gói tin liên tục
  MP._lastReqMobs = now;
  MP.ws.send(JSON.stringify({
    type: 'get_zone_mobs'
  }));
}

function sendMobHit(mobId, dmg) {
  if (!MP.ws || MP.ws.readyState !== 1) return;
  MP.ws.send(JSON.stringify({
    type: 'mob_hit',
    mobId: mobId,
    dmg: Math.round(dmg)
  }));
}

function sendAllocAttr(attr, amount) {
  if (!MP.ws || MP.ws.readyState !== 1) return;
  MP.ws.send(JSON.stringify({
    type: 'alloc_attr',
    attr: attr,
    amount: amount || 1
  }));
}

function sendAllocSkill(skillId) {
  if (!MP.ws || MP.ws.readyState !== 1) return;
  MP.ws.send(JSON.stringify({
    type: 'alloc_skill',
    skillId: Number(skillId)
  }));
}

function addOrUpdatePlayer(p) {
  if (!p || !p.id) return;
  const existing = MP.otherPlayers[p.id] || {};
  MP.otherPlayers[p.id] = {
    id: p.id,
    username: p.username || existing.username || null,
    name: p.name || `Hiệp Khách ${p.id}`,
    fac: p.fac || 'shaolin',
    series: p.series || 0,
    lvl: p.lvl || 1,
    vip: p.vip || 1,
    x: p.x || 768,
    y: p.y || 768,
    targetX: p.x || 768,
    targetY: p.y || 768,
    stage: p.stage || 1,
    zoneId: p.zoneId || 2,
    dir: p.dir || 0,
    face: p.face || 1,
    act: p.act || 'st',
    actT: existing.actT || 0,
    chat: existing.chat || '',
    chatT: existing.chatT || 0,
    moving: false,
    mounted: p.mounted !== undefined ? !!p.mounted : (existing.mounted || false),
    mountTier: p.mountTier != null ? p.mountTier : (existing.mountTier || 1),
    mount: p.mount || existing.mount || null,
    cloakTier: p.cloakTier != null ? p.cloakTier : (p.cloak && p.cloak.tier != null ? p.cloak.tier : (existing.cloakTier || 0)),
    cloak: p.cloak || existing.cloak || null,
    pkMode: p.pkMode || existing.pkMode || 'peace',
    eq: p.eq || existing.eq || null,
    hp: p.hp != null ? p.hp : (existing.hp != null ? existing.hp : 100),
    maxHp: p.maxHp != null ? p.maxHp : (existing.maxHp != null ? existing.maxHp : 100),
    stall: p.stall || existing.stall || null
  };
}

function sendProfile() {
  if (!MP.ws || MP.ws.readyState !== 1 || typeof S === 'undefined' || !S) return;
  const myZone = getCurZoneId();
  const heroName = (typeof ACC !== 'undefined' && ACC.user && ACC.user.heroName)
    ? ACC.user.heroName
    : (S.name || S.heroName || 'Võ Lâm Hiệp Khách');

  MP.ws.send(JSON.stringify({
    type: 'profile',
    token: (typeof ACC !== 'undefined' ? ACC.token : null),
    name: heroName,
    fac: S.fac || 'shaolin',
    series: (typeof FAC !== 'undefined' && FAC[S.fac] ? FAC[S.fac].series : 0),
    lvl: S.lvl || 1,
    vip: typeof vipLevel === 'function' ? vipLevel() : 1,
    stage: S.stage || 1,
    zoneId: myZone,
    x: Math.round(typeof H !== 'undefined' ? H.x : 768),
    y: Math.round(typeof H !== 'undefined' ? H.y : 768),
    mounted: !!(S && S.mounted),
    mountTier: (S && S.mount ? S.mount.tier : 1),
    mount: (S && S.mount ? S.mount : null),
    cloakTier: (S && S.cloak && S.cloak.tier ? S.cloak.tier : 0),
    pkMode: (S && S.pkMode) || 'peace',
    eq: (S && S.eq) ? {
      weapon: S.eq.weapon ? { n: S.eq.weapon.n, d: S.eq.weapon.d, k: S.eq.weapon.k, lvl: S.eq.weapon.lvl, r: S.eq.weapon.r, enh: S.eq.weapon.enh, s: S.eq.weapon.s, ic: S.eq.weapon.ic } : null,
      armor: S.eq.armor ? { n: S.eq.armor.n, lvl: S.eq.armor.lvl, r: S.eq.armor.r, enh: S.eq.armor.enh, s: S.eq.armor.s } : null,
      helm: S.eq.helm ? { n: S.eq.helm.n, lvl: S.eq.helm.lvl, r: S.eq.helm.r, enh: S.eq.helm.enh, s: S.eq.helm.s } : null
    } : null
  }));
}

function sendMove(dt) {
  if (!MP.ws || MP.ws.readyState !== 1 || typeof H === 'undefined' || typeof S === 'undefined' || !S) return;

  const now = Date.now();
  if (now - MP.lastSendT < 50) return; // 20 lần/giây
  MP.lastSendT = now;

  const curMounted = !!(S && S.mounted);
  const curMountTier = (S && S.mount ? S.mount.tier : 1);
  const curCloakTier = (S && S.cloak && S.cloak.tier) ? S.cloak.tier : 0;
  const curPkMode = (S && S.pkMode) || 'peace';

  const changed = Math.abs(H.x - MP.lastX) > 0.5 || Math.abs(H.y - MP.lastY) > 0.5 || H.act !== MP.lastAct || H.dir !== MP.lastDir || curMounted !== MP.lastMounted || curCloakTier !== MP.lastCloakTier || curPkMode !== MP.lastPkMode;
  if (!changed && now - MP.lastForceT < 800) return;
  MP.lastForceT = now;

  MP.lastX = H.x;
  MP.lastY = H.y;
  MP.lastAct = H.act;
  MP.lastDir = H.dir;
  MP.lastMounted = curMounted;
  MP.lastCloakTier = curCloakTier;
  MP.lastPkMode = curPkMode;

  const myZone = getCurZoneId();

  MP.ws.send(JSON.stringify({
    type: 'move',
    x: Math.round(H.x),
    y: Math.round(H.y),
    dir: H.dir || 0,
    face: H.face || 1,
    act: H.act || 'st',
    lvl: S.lvl || 1,
    stage: S.stage || 1,
    zoneId: myZone,
    mounted: curMounted,
    mountTier: curMountTier,
    mount: (S && S.mount ? S.mount : null),
    cloakTier: curCloakTier,
    pkMode: curPkMode,
    pkValue: (S && S.pkValue) || 0,
    jailUntil: (S && S.jailUntil) || 0,
    eq: (S && S.eq) ? {
      weapon: S.eq.weapon ? { n: S.eq.weapon.n, d: S.eq.weapon.d, k: S.eq.weapon.k, lvl: S.eq.weapon.lvl, r: S.eq.weapon.r, enh: S.eq.weapon.enh, s: S.eq.weapon.s, ic: S.eq.weapon.ic } : null,
      armor: S.eq.armor ? { n: S.eq.armor.n, lvl: S.eq.armor.lvl, r: S.eq.armor.r, enh: S.eq.armor.enh, s: S.eq.armor.s } : null,
      helm: S.eq.helm ? { n: S.eq.helm.n, lvl: S.eq.helm.lvl, r: S.eq.helm.r, enh: S.eq.helm.enh, s: S.eq.helm.s } : null
    } : null,
    hp: Math.round((typeof R !== 'undefined' && R) ? R.life : 100),
    maxHp: Math.round((typeof R !== 'undefined' && R && R.P) ? R.P.life : 100),
    mp: Math.round((typeof R !== 'undefined' && R) ? R.mana : 100),
    maxMp: Math.round((typeof R !== 'undefined' && R && R.P) ? R.P.mana : 100)
  }));
}

function sendMultiplayerSkill(atk, target) {
  if (!MP.ws || MP.ws.readyState !== 1 || typeof H === 'undefined' || !H) return;
  const now = Date.now();
  if (now - (MP.lastSkillSendT || 0) < 100) return; // Tối đa 10 lần/giây
  MP.lastSkillSendT = now;

  const targetX = target ? Math.round(target.x) : Math.round(H.x + (H.face || 1) * 80);
  const targetY = target ? Math.round(target.y) : Math.round(H.y);

  MP.ws.send(JSON.stringify({
    type: 'skill',
    skillId: atk && atk.id ? atk.id : 0,
    tx: targetX,
    ty: targetY,
    x: Math.round(H.x),
    y: Math.round(H.y),
    dir: H.dir || 0,
    face: H.face || 1
  }));
}

function sendMultiplayerChat(text, chan = 'world') {
  text = String(text || '').trim();
  if (!text) return;
  if (!MP.connected || !MP.ws || MP.ws.readyState !== 1) {
    if (typeof toast === 'function') toast('Chưa kết nối máy chủ online');
    return;
  }
  MP.ws.send(JSON.stringify({
    type: 'chat',
    text: text,
    chan: chan
  }));

  // Bong bong tren dau chinh minh
  if (typeof H !== 'undefined') {
    H.chat = text;
    H.chatT = 6;
  }
  const myName = (typeof S !== 'undefined' && S && S.heroName) ? S.heroName : 'Đại Hiệp';
  const myVip = (typeof vipLevel === 'function') ? vipLevel() : 1;
  const vipTag = myVip > 1 ? `[VIP ${myVip}] ` : '';
  if (typeof appendChatLine === 'function') {
    appendChatLine(chan, `${vipTag}${myName}`, text);
  }
}

function updateOtherPlayers(dt) {
  for (const id in MP.otherPlayers) {
    const p = MP.otherPlayers[id];
    p.animKey = (typeof W !== 'undefined' && W.hero && W.hero[p.fac] && W.hero[p.fac].anim) || 'pl_shaolin';

    // Nội suy vị trí mượt mà
    const dx = p.targetX - p.x;
    const dy = p.targetY - p.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 350) {
      // Dịch chuyển tức thời nếu khoảng cách quá xa
      p.x = p.targetX;
      p.y = p.targetY;
      p.moving = false;
    } else if (dist > 3) {
      const spd = Math.max(160, Math.min(420, dist * 6));
      const step = Math.min(dist, spd * dt);
      p.x += (dx / dist) * step;
      p.y += (dy / dist) * step;
      p.moving = true;
      p.face = dx >= 0 ? 1 : -1;
      if (typeof dirOf === 'function') p.dir = dirOf(dx, dy);
      if (p.act !== 'at' && p.act !== 'hurt' && p.act !== 'die') {
        p.act = 'run';
      }
    } else {
      p.moving = false;
      if (p.act === 'run') p.act = 'st';
    }

    // Tiến hành thời gian animation của hành động
    p.actT = (p.actT || 0) + dt;
    if (p.act === 'at' || p.act === 'hurt') {
      const atLen = (typeof animLen === 'function') ? Math.max(0.28, animLen(p.animKey, p.act)) : 0.4;
      if (p.actT >= atLen) {
        p.act = p.moving ? 'run' : 'st';
        p.actT = 0;
      }
    }

    if (p.chatT > 0) p.chatT -= dt;
  }
}

// Lấy danh sách người chơi cùng bản đồ
function getVisibleOtherPlayers() {
  const myZone = getCurZoneId();
  const list = [];
  for (const id in MP.otherPlayers) {
    const p = MP.otherPlayers[id];
    // Chuẩn MMORPG (Cách 1): Chỉ hiển thị người chơi đang ở cùng bản đồ (Zone)
    if (p.zoneId === myZone) {
      list.push(p);
    }
  }
  return list;
}

// Vẽ một người chơi khác lên Canvas (được gọi từ vòng lặp ents theo thứ tự depth Y)
function drawSingleOtherPlayer(c, dt, p) {
  const heroCfg = (typeof W !== 'undefined' && W.hero) ? W.hero[p.fac] : null;
  const animKey = heroCfg ? heroCfg.anim : 'pl_shaolin';
  const seriesCol = (typeof SERIES_COL !== 'undefined') ? (SERIES_COL[p.series] || '#ffd700') : '#ffd700';

  let playerY = p.y;
  let mountBob = 0;
  if (p.mounted) {
    if (typeof drawHorseMount === 'function') {
      const mData = p.mount || { tier: p.mountTier || 1 };
      mountBob = drawHorseMount(c, p.x, p.y, p.dir || 0, p.act || 'st', p.actT || 0, mData);
      playerY = p.y - 14 + mountBob;
    }
    if (typeof drawHorseRiderBody === 'function') {
      drawHorseRiderBody(c, p.x, p.y, p.dir || 0, p.act || 'st', p.actT || 0, p.sex, mountBob);
    }
  } else {
    // 1. Bóng dưới chân
    c.fillStyle = '#0007';
    c.beginPath();
    c.ellipse(p.x, p.y, 16, 6, 0, 0, 7);
    c.fill();
  }

  // 2. Vẽ Phi Phong của người chơi khác (chỉ vẽ khi cTier > 0)
  const cTier = p.cloakTier != null ? p.cloakTier : ((p.cloak && p.cloak.tier != null) ? p.cloak.tier : 0);
  if (cTier > 0 && typeof CLOAK_SYSTEM !== 'undefined' && CLOAK_SYSTEM.drawCloak) {
    CLOAK_SYSTEM.drawCloak(c, p.x, playerY, p.dir || 0, cTier, p.moving);
  }

  // 3. Hoạt ảnh nhân vật
  let drawn = false;
  let dollH = 0;
  if (typeof drawDoll === 'function') {
    const fakeState = {
      eq: p.eq || {},
      fac: p.fac,
      sex: (p.fac === 'emei' || p.fac === 'cuiyan' || p.sex === 1) ? 1 : 0
    };
    dollH = drawDoll(c, p.x, playerY, p.act || 'st', p.dir || 0, p.actT || 0, (typeof HERO_DOLL_SCALE !== 'undefined' ? HERO_DOLL_SCALE : (1 / 0.6)), 1, fakeState);
    if (dollH > 0) drawn = dollH;
  }
  if (!drawn && typeof drawAnim === 'function') {
    drawn = drawAnim(animKey, p.act || 'st', p.dir || 0, p.actT || 0, p.x, playerY, (typeof HERO_SCALE !== 'undefined' ? HERO_SCALE : 1.35));
  }
  if (!drawn && heroCfg && typeof drawSprite === 'function' && typeof img === 'function') {
    drawn = drawSprite(img(heroCfg.img), heroCfg.sz, p.x, playerY, 0.9, p.face < 0);
  }
  if (!drawn) {
    // Dự phòng đồ họa nếu sprite chưa nạp xong
    c.fillStyle = seriesCol;
    c.beginPath();
    c.arc(p.x, playerY - 20, 14, 0, 7);
    c.fill();
    drawn = 30;
  }

  // 4. Vẽ Ngoại Trang & Res Trang Bị trực quan (Vũ khí, Giáp, Khôi, Hào quang Thần Binh)
  if (typeof drawHeroEquipment === 'function' && p.eq) {
    drawHeroEquipment(c, p.x, playerY, p.dir || 0, p.face || 1, p.act || 'st', p.actT || 0, p.eq, p.series || 0);
  }

  // 5. Vẽ chi tiết phía trước của Chiến Mã cho người chơi khác
  if (p.mounted && typeof drawHorseForeground === 'function') {
    const mData = p.mount || { tier: p.mountTier || 1 };
    drawHorseForeground(c, p.x, p.y, p.dir || 0, p.act || 'st', p.actT || 0, mData);
  }

  // 3. Tên & Đẳng cấp & VIP trên đầu
  const vipTag = p.vip > 1 ? `[VIP ${p.vip}] ` : '';
  let otherBarCol = '#4fd04f';
  let otherNamePrefix = '';
  let otherNameCol = '#93c5fd';
  if (p.jailUntil && p.jailUntil > Date.now()) {
    otherBarCol = '#ef4444';
    otherNamePrefix = '[Thiên Lao] ';
    otherNameCol = '#ef4444';
  } else if (p.pkValue > 0) {
    if (p.pkMode === 'slaughter') {
      otherBarCol = '#ec4899';
      otherNamePrefix = `[Đồ sát · PK:${p.pkValue}] `;
      otherNameCol = '#f472b6';
    } else {
      otherBarCol = '#f59e0b';
      otherNamePrefix = `[PK:${p.pkValue}] `;
      otherNameCol = '#fbbf24';
    }
  } else if (p.pkMode === 'slaughter') {
    otherBarCol = '#ec4899'; // Máu hồng Đồ Sát
    otherNamePrefix = '[Đồ sát] ';
    otherNameCol = '#f472b6';
  } else if (p.pkMode === 'pk') {
    otherBarCol = '#f59e0b'; // Vàng cam PK
    otherNamePrefix = '[PK] ';
    otherNameCol = '#fbbf24';
  }
  const tag = `${otherNamePrefix}${vipTag}${p.name} · Lv${p.lvl}`;
  const labelY = playerY - (drawn ? Math.min(drawn, 90) * 0.9 : 52) - 6;
  const pLifePct = (p.hp != null && p.maxHp) ? clamp(p.hp / p.maxHp, 0, 1) : 1;
  if (typeof label === 'function') {
    label(p.x, labelY, tag, otherNameCol, 11, pLifePct, otherBarCol);
  }

  // 4. Biển hiệu sạp hàng (nếu người chơi đang bày bán)
  if (p.stall && p.stall.title) {
    const stallText = `🏪 [${p.stall.title}]`;
    c.font = 'bold 11px "IBM Plex Mono", sans-serif';
    const textW = c.measureText(stallText).width;
    const badgeW = textW + 16;
    const badgeH = 20;
    const badgeX = p.x - badgeW / 2;
    const badgeY = labelY - 22;

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
    c.fillText(stallText, p.x, badgeY + badgeH / 2);
  }
}

// Tìm người chơi khác tại tọa độ bản đồ
function getOtherPlayerAt(wx, wy, rad = 36) {
  if (typeof MP === 'undefined' || !MP.otherPlayers) return null;
  const myZone = typeof getCurZoneId === 'function' ? getCurZoneId() : 0;
  for (const id in MP.otherPlayers) {
    const p = MP.otherPlayers[id];
    if (p.zoneId === myZone) {
      if (Math.hypot(p.x - wx, p.y - wy) <= rad) return p;
    }
  }
  return null;
}

// Hiển thị menu tương tác nhanh khi nhấp vào người chơi khác
function showOtherPlayerMenu(p) {
  if (!p) return;
  const pName = p.name || 'Hiệp khách';
  const hasStall = !!(p.stall && Array.isArray(p.stall.items) && p.stall.items.length > 0);
  const facName = (typeof FAC !== 'undefined' && FAC[p.fac]) ? FAC[p.fac].n : 'Vô Môn';
  const canAtk = (typeof canAttackPlayer === 'function') ? canAttackPlayer(p) : false;
  const pPkMode = p.pkMode || 'peace';
  const pkBadge = pPkMode === 'slaughter'
    ? '<span style="color:#f472b6;font-weight:bold;">[🩸 Đồ Sát]</span>'
    : (pPkMode === 'pk' ? '<span style="color:#fbbf24;font-weight:bold;">[⚔️ PK]</span>' : '<span style="color:#4ade80;">[🛡️ Luyện Công]</span>');

  let html = `
    <div style="padding:14px;text-align:center;min-width:220px;">
      <h3 style="color:#ffd700;font-size:14px;margin-bottom:4px;">👤 ${esc(pName)} ${pkBadge}</h3>
      <p style="color:#94a3b8;font-size:12px;margin-bottom:12px;">Đẳng cấp: ${p.lvl || 1} · Phái: ${esc(facName)} · Máu: ${Math.round(p.hp || 100)}/${Math.round(p.maxHp || 100)}</p>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${canAtk ? `
          <button class="jx-action-btn" onclick="if(typeof setManualAttackTarget==='function')setManualAttackTarget(${p.id}); closeModal();" style="background:#dc2626;color:#fff;font-weight:bold;border:1px solid #ef4444;padding:8px;">
            ⚔️ Tuyên Chiến / Tấn Công (PK)
          </button>
        ` : ''}
        ${hasStall ? `
          <button class="jx-action-btn gold" onclick="if(window.STALL)STALL.openViewStall(${p.id}, MP.otherPlayers[${p.id}].stall, '${esc(pName)}'); closeModal();" style="background:#eab308;color:#000;font-weight:bold;font-size:13px;padding:8px;">
            🏪 Xem Sạp Hàng [${esc(p.stall.title)}]
          </button>
        ` : ''}
        <button class="jx-action-btn" onclick="const _t = prompt('Gửi tin nhắn tới ${esc(pName)} (hỏi mua đồ, trả giá, trò chuyện...):'); if(_t){ if(window.MP && MP.ws) MP.ws.send(JSON.stringify({type:'chat', chan:'trade', text: '@${esc(pName)} ' + _t})); if(typeof appendChatLine==='function') appendChatLine('trade', (window.S?S.name:'Tôi'), '@${esc(pName)} ' + _t); } closeModal();" style="background:#0284c7;color:#fff;font-weight:bold;">
          💬 Nhắn Tin / Trả Giá
        </button>
        <button class="jx-action-btn" onclick="if(window.TRADE)TRADE.request(${p.id}, '${esc(pName)}'); closeModal();">
          🤝 Mời Giao Dịch
        </button>
        <button class="jx-action-btn" onclick="if(typeof sendPartyInvite==='function')sendPartyInvite(${p.id}); closeModal(); toast('Đã gửi lời mời vào đội');">
          👥 Mời Vào Tổ Đội
        </button>
        <button class="jx-action-btn" onclick="if(typeof toggleFollowPartyMember==='function')toggleFollowPartyMember(${p.id}); closeModal();">
          🏃 Đi Theo Sau
        </button>
      </div>
    </div>
  `;
  if (typeof modal === 'function') modal(html);
}

// Vẽ bong bóng chat (Speech Bubble) trên đầu các người chơi đang nói chuyện
function drawOtherPlayerSpeechBubbles(c) {
  const myZone = getCurZoneId();
  for (const id in MP.otherPlayers) {
    const p = MP.otherPlayers[id];
    if (p.chatT > 0 && p.chat && p.zoneId === myZone) {
      drawSpeechBubble(c, p.x, p.y - 68, p.chat);
    }
  }
}

function drawSpeechBubble(c, x, y, text) {
  c.font = 'bold 11px "IBM Plex Mono", sans-serif';
  const width = Math.min(200, c.measureText(text).width + 18);
  const height = 24;
  const rx = x - width / 2;
  const ry = y - height;

  // Khung bong bóng
  c.fillStyle = 'rgba(255, 255, 255, 0.96)';
  c.strokeStyle = '#3d2f1d';
  c.lineWidth = 1.6;
  c.beginPath();
  if (c.roundRect) {
    c.roundRect(rx, ry, width, height, 6);
  } else {
    c.rect(rx, ry, width, height);
  }
  c.fill();
  c.stroke();

  // Mũi tên trỏ xuống đỉnh đầu
  c.fillStyle = 'rgba(255, 255, 255, 0.96)';
  c.beginPath();
  c.moveTo(x - 5, ry + height);
  c.lineTo(x + 5, ry + height);
  c.lineTo(x, ry + height + 6);
  c.closePath();
  c.fill();
  c.stroke();

  // Chữ nội dung chat
  c.fillStyle = '#111';
  c.textAlign = 'center';
  c.fillText(text, x, ry + 16);
}

function updateOnlineStatusBadge(online) {
  const count = MP.onlineCount || (Object.keys(MP.otherPlayers).length + 1);
  const el = $('#mpStatus');
  if (el) {
    el.innerHTML = online 
      ? `<span style="color:#4ade80;">🟢 Trực tuyến (${count})</span>` 
      : `<span style="color:#ef4444;">🔴 Ngoại tuyến</span>`;
  }
  const chatBtn = $('#chatBtn');
  if (chatBtn) {
    chatBtn.innerHTML = online ? `💬 Chat (${count})` : `💬 Chat`;
    chatBtn.title = online ? `Trực tuyến: ${count} người chơi. Nhấp để chat!` : `Ngoại tuyến. Nhấp để kết nối lại`;
  }
  const chatChip = $('#chatChipBtn');
  if (chatChip) {
    chatChip.innerHTML = online ? `💬 Chat (${count})` : `💬 Chat`;
  }
}

function updateOnlineCount() {
  updateOnlineStatusBadge(MP.connected);
}

// Mở khung Chat Giang Hồ
function openChatModal() {
  const count = Object.keys(MP.otherPlayers).length + 1;
  modal(`
    <div class="jx-client-window" style="margin:-14px;border:none;box-shadow:none;">
      <div class="jx-window-header">
        <div class="jx-window-title">
          <span>💬 CHAT THẾ GIỚI & LÂN CẬN</span>
        </div>
        <span style="font-size:11px;color:#4ade80;">Trực tuyến: ${count} người</span>
      </div>
      <div style="padding:12px;">
        <div style="font-size:11px;color:#a39276;margin-bottom:8px;">
          Tin nhắn sẽ hiển thị thành bong bóng trên đầu nhân vật và phát tới toàn bộ hiệp khách đang online!
        </div>
        <div style="display:flex;gap:6px;margin-bottom:8px;">
          <input type="text" id="chatInput" placeholder="Nhập lời muốn nói chốn giang hồ..." maxlength="80" style="flex:1;background:#0d0a07;border:1px solid #5a4425;color:#ffd700;padding:8px 10px;border-radius:4px;font-size:12px;outline:none;">
          <button class="jx-action-btn gold" id="bSendChat" style="padding:8px 14px;font-size:12px;">Gửi</button>
        </div>
      </div>
      <div style="padding:8px 12px;border-top:1px solid #3d2f1d;display:flex;justify-content:flex-end;">
        <button class="jx-action-btn" onclick="closeModal();">Đóng</button>
      </div>
    </div>
  `, () => {
    const input = $('#chatInput');
    const send = () => {
      if (input && input.value.trim()) {
        sendMultiplayerChat(input.value.trim());
        closeModal();
      }
    };
    $('#bSendChat').onclick = send;
    if (input) {
      input.focus();
      input.onkeydown = e => { if (e.key === 'Enter') send(); };
    }
  });
}

// Chat button wiring (không cần đợi login)
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      const c1 = $('#chatBtn');
      if (c1) c1.onclick = () => openChatModal();
      const c2 = $('#chatChipBtn');
      if (c2) c2.onclick = () => openChatModal();
      const pBtn = $('#partyBtn');
      if (pBtn) pBtn.onclick = () => {
        if (typeof toggleWin === 'function') toggleWin('party');
      };
    }, 500);
  });
}

// Đồng bộ vị trí định kỳ mỗi 200ms kể cả khi tab ở chế độ nền
setInterval(() => {
  if (MP.connected && typeof sendMove === 'function') {
    sendMove(0.2);
  }
}, 200);

function sendPvpHit(targetId, dmg, skillId) {
  if (typeof S !== 'undefined' && S && S.jailUntil && S.jailUntil > Date.now()) {
    if (typeof toast === 'function') toast('⚖️ Đang thụ án trong Thiên Lao! Không thể tấn công!');
    return;
  }
  if (!MP.ws || MP.ws.readyState !== 1) return;
  MP.ws.send(JSON.stringify({
    type: 'pvp_hit',
    targetId: Number(targetId),
    dmg: Math.round(dmg),
    skillId: Number(skillId) || 0
  }));
}
window.sendPvpHit = sendPvpHit;

function setManualAttackTarget(targetId) {
  const p = MP.otherPlayers[targetId];
  if (!p) return;
  if (typeof INPUT !== 'undefined') {
    INPUT.target = { x: p.x, y: p.y };
  }
  if (typeof R !== 'undefined') {
    R.moveTo = p;
  }
  if (typeof toast === 'function') toast(`🎯 Đang nhắm mục tiêu: ${p.name}`);
}
window.setManualAttackTarget = setManualAttackTarget;
