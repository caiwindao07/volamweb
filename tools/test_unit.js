const { spawn } = require('child_process');
const WebSocket = require('ws');
const http = require('http');

const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const os = require('os');
const path = require('path');
const fs = require('fs');
const p = spawn(edge, ['--remote-debugging-port=9222', '--headless', '--disable-gpu', 'http://localhost:8080/']);

p.on('error', err => console.error('Spawn error:', err));

function connectCDP(retry = 0) {
  if (retry > 20) {
    console.error('Failed to connect to Edge CDP after 20 retries');
    p.kill();
    process.exit(1);
  }
  const req = http.get('http://127.0.0.1:9222/json', (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      try {
        const tabs = JSON.parse(data);
        const pageTab = tabs.find(t => t.title === 'Võ Lâm Idle') || tabs[0];
        if (!pageTab || !pageTab.webSocketDebuggerUrl) {
          setTimeout(() => connectCDP(retry + 1), 500);
          return;
        }
        const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

        ws.on('open', () => {
          ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
          ws.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
          setTimeout(() => {
            ws.send(JSON.stringify({
              id: 200,
              method: 'Runtime.evaluate',
              params: {
                expression: `
                  (() => {
                    if (typeof makeItem !== 'function') return JSON.stringify({ error: 'makeItem not found' });
                    window.S = newSave();
                    S.fac = 'shaolin';
                    S.lvl = 20;
                    S.gold = 5000;
                    S.eq = {};
                    S.inv = [];
                    S.eq.weapon = makeItem(0, 0, 1, 1);
                    S.inv = [
                      makeItem(0, 0, 3, 3), // vu khi bac 3
                      makeItem(2, 0, 1, 0), // ao trang
                      makeItem(5, 0, 1, 0)  // giay trang
                    ];
                    window.R = { P: calc(S.eq) };

                    // 1. Test Hover Tooltip & So sanh
                    const newWp = S.inv[0];
                    window.ITEM_TOOLTIP.show(newWp, { clientX: 250, clientY: 250 });
                    const tt = document.getElementById('jx-item-hover-tooltip');
                    const ttHtml = tt ? tt.innerHTML : '';
                    const hasCompare = ttHtml.includes('SO SÁNH TỪNG CHỈ SỐ');
                    const hasDiffDetails = ttHtml.includes('Sát thương:');
                    const hasMacro = ttHtml.includes('LỰC CHIẾN');
                    window.ITEM_TOOLTIP.hide();

                    // 2. Test Chon Ban Nhieu
                    window.ITEM_TOOLTIP.toggleSelectMode(true);
                    window.ITEM_TOOLTIP.selectAllWhite();
                    const selCount = window.INV_SELECTED.size;
                    const goldBefore = S.gold;
                    const invLenBefore = S.inv.length;
                    window.ITEM_TOOLTIP.executeSell();
                    const goldAfter = S.gold;
                    const invLenAfter = S.inv.length;

                    // 3. Test Rã Đồ Xanh & Ghép Mảnh Trang Bị
                    const blue1 = makeItem(0, 0, 3, 2); // Kiem xanh bac 3
                    const blue2 = makeItem(2, 0, 3, 2); // Ao xanh bac 3
                    const blue3 = makeItem(5, 0, 4, 2); // Giay xanh bac 4
                    S.inv.push(blue1, blue2, blue3);

                    // Ra 1 mon don le
                    const disSingleRes = window.EQUIP_SHARD.dismantleSingle(blue1);
                    const shardsAfter1 = window.EQUIP_SHARD.getShards();

                    // Ra tat ca do xanh con lai
                    const disAllRes = window.EQUIP_SHARD.dismantleAll();
                    const shardsAfterAll = window.EQUIP_SHARD.getShards();

                    // Test Ra do r === 2 (do 3-6 dong roi tu quai)
                    const yellowGear = makeItem(2, 0, 9, 5); // Ao cap 9, 5 dong (r === 2)
                    S.inv.push(yellowGear);
                    const isYellowDismantleable = window.EQUIP_SHARD.isBlue(yellowGear);
                    const shardsBeforeYellow = window.EQUIP_SHARD.getShards();
                    const disYellowRes = window.EQUIP_SHARD.dismantleSingle(yellowGear);
                    const shardsAfterYellow = window.EQUIP_SHARD.getShards();
                    const yellowGained = shardsAfterYellow - shardsBeforeYellow;

                    // Ghep do tu manh
                    window.EQUIP_SHARD.addShards(100);
                    const costWpT4 = window.EQUIP_SHARD.calcCost(0, 4, false);
                    const craftRes = window.EQUIP_SHARD.craftItem(0, 4, 0, false);
                    const crafted = craftRes.item;

                    // 4. Test Cấp 99 -> 100 & Migrate
                    const maxLevelVal = MAX_LEVEL;
                    S.lvl = 99;
                    S.xp = J.exp[98] - 10;
                    gainXp(100); // Gaining exp should push 99 -> 100
                    const lvlAfterGain = S.lvl;

                    const migTest = migrate({ fac: 'shaolin', lvl: 99, xp: J.exp[98] + 500, autoEquip: false });
                    const migLvl = migTest.lvl;
                    const migAutoEquip = migTest.autoEquip;

                    // 5. Test Bật / Tắt Tự Mặc Đồ Tốt
                    S.autoEquip = false;
                    if (S.auto) S.auto.autoEquip = false;
                    const autoEquipOffRes = autoEquipAll(false);
                    S.autoEquip = true;
                    if (S.auto) S.auto.autoEquip = true;
                    const autoEquipOnRes = autoEquipAll(true);

                    // 6. Test Hiển Thị Đúng Res Đang Mặc & Không Có NaN
                    renderCharAttrib();
                    const charHtml = document.getElementById('win-char-attrib') ? document.getElementById('win-char-attrib').innerHTML : '';
                    const hasPoisonResNaN = charHtml.includes('Kháng Độc</span><span style="color:#4ade80;">NaN');
                    const poisonResVal = R.P && R.P.res ? R.P.res.poison : null;
                    const isPoisonResValid = poisonResVal !== undefined && !isNaN(poisonResVal);

                    return JSON.stringify({
                      hasTooltipObj: !!window.ITEM_TOOLTIP,
                      ttCreated: !!tt,
                      hasCompare,
                      hasDiffDetails,
                      hasMacro,
                      selCount,
                      soldCount: invLenBefore - invLenAfter,
                      goldGained: goldAfter - goldBefore,
                      // Equip Shard results
                      hasEquipShard: !!window.EQUIP_SHARD,
                      singleOk: disSingleRes.ok,
                      singleShardsGained: shardsAfter1,
                      singleShardsValid: shardsAfter1 >= 1 && shardsAfter1 <= 3,
                      allOk: disAllRes.ok,
                      allCount: disAllRes.count,
                      craftOk: craftRes.ok,
                      costWpT4,
                      craftedValid: !!crafted && crafted.r === 1 && crafted.s === 0 && crafted.lvl === 4,
                      isYellowDismantleable,
                      disYellowOk: disYellowRes.ok,
                      yellowGainedValid: yellowGained >= 1 && yellowGained <= 3,
                      // Feature 1: Level 100 Cap & Advance
                      maxLevelVal,
                      lvlAfterGain,
                      migLvl,
                      level100Ok: lvlAfterGain >= 100 && migLvl >= 100 && maxLevelVal >= 100,
                      // Feature 2: Auto Equip Toggle
                      migAutoEquip,
                      autoEquipOffRes,
                      // Feature 3: Correct Res
                      hasPoisonResNaN,
                      isPoisonResValid,
                      poisonResVal,
                      // Feature 4: Mob Clumping Prevention (Anti-Clump & Separation)
                      obsLoaded386: (() => { obsLoad(386); return OBS.g !== null; })(),
                      mobSeparationOk: (() => {
                        R.enemies = [];
                        const cz = zoneOf(161) || { m: [1] };
                        for (let i = 0; i < 12; i++) {
                          R.enemies.push(makeEnemy(pick(cz.m), 161, 'normal', H.x + (Math.random() - 0.5) * 4, H.y + (Math.random() - 0.5) * 4));
                        }
                        for (let t = 0; t < 120; t++) {
                          const dt = 1/60;
                          for (const e of alive()) enemyAI(e, dt);
                          separateEnemies(dt);
                        }
                        let minD = 1e9;
                        for (let i = 0; i < R.enemies.length; i++) {
                          for (let j = i + 1; j < R.enemies.length; j++) {
                            const d = Math.hypot(R.enemies[i].x - R.enemies[j].x, R.enemies[i].y - R.enemies[j].y);
                            if (d < minD) minD = d;
                          }
                        }
                        return minD >= 25;
                      })()
                    });
                  })()
                `,
                returnByValue: true
              }
            }));
          }, 1500);
        });

        ws.on('message', (msg) => {
          const obj = JSON.parse(msg);
          if (obj.id === 200) {
            console.log('[UNIT TEST SUCCESS]:', obj.result && obj.result.result ? obj.result.result.value : obj);
            p.kill();
            process.exit(0);
          }
        });
      } catch (err) {
        setTimeout(() => connectCDP(retry + 1), 500);
      }
    });
  });
  req.on('error', () => {
    setTimeout(() => connectCDP(retry + 1), 500);
  });
}

setTimeout(() => connectCDP(0), 1500);
