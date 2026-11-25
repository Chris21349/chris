/* ══════════════════════════════════════════════════════════
   镜刃 MIRROR EDGE — game.js
   存档 / 主循环 / 场景 / 解锁
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const MB = window.MB;
  const U = MB.U;
  const SAVE_KEY = 'mirroredge.save.v1';

  function defaultSave() {
    return {
      v: 1,
      skills: ['voidslash', 'mirrorstep', 'ironwall', 'insight'],
      parry: ['condemn'],
      loadout: ['voidslash', 'mirrorstep', 'ironwall'],
      parryStyle: 'condemn',
      cleared: {},
      stats: { perfect: 0, dodges: 0, kills: 0, maxCombo: 0, guardBreaks: 0, battles: 0 },
      achv: {},
      settings: { music: 55, sfx: 80, shake: 100, stop: 100, cd: true, blood: true },
    };
  }

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return defaultSave();
      const s = JSON.parse(raw);
      const d = defaultSave();
      s.skills = Array.isArray(s.skills) ? s.skills : d.skills;
      s.parry = Array.isArray(s.parry) ? s.parry : d.parry;
      s.loadout = Array.isArray(s.loadout) ? s.loadout.slice(0, 3) : d.loadout.slice();
      while (s.loadout.length < 3) s.loadout.push(null);
      s.cleared = s.cleared || {};
      s.stats = Object.assign({}, d.stats, s.stats);
      s.achv = s.achv || {};
      s.settings = Object.assign({}, d.settings, s.settings);
      s.parryStyle = s.parryStyle || 'condemn';
      return s;
    } catch (e) {
      console.warn('存档损坏，使用新存档', e);
      return defaultSave();
    }
  }

  MB.SAVE = loadSave();
  MB.VERSION = 'v1.3.1';
  const vt = document.getElementById('verTag');
  if (vt) vt.textContent = MB.VERSION;

  const Game = (MB.Game = {
    scene: 'menu',
    battle: null,
    paused: false,
    isTouch: false,
    pendingUnlocks: [],
    dpr: 1,
    w: 0, h: 0,
  });

  Game.save = function () {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(MB.SAVE)); } catch (e) { console.warn(e); }
  };

  /* ───────── 解锁判定 ───────── */
  function meets(u) {
    const s = MB.SAVE;
    if (!u || u === 'start') return true;
    const [k, n] = u.split(':');
    const v = +n;
    if (k === 'clear') return !!(s.cleared[v] && s.cleared[v].some(Boolean));
    if (k === 'hard') return !!(s.cleared[v] && (s.cleared[v][1] || s.cleared[v][2]));
    if (k === 'parry') return s.stats.perfect >= v;
    if (k === 'combo') return s.stats.maxCombo >= v;
    if (k === 'guardbreak') return s.stats.guardBreaks >= v;
    return false;
  }

  function refreshUnlocks(pending) {
    const s = MB.SAVE;
    for (const def of MB.SKILL_DEFS) {
      if (!s.skills.includes(def.id) && meets(def.unlock)) {
        s.skills.push(def.id);
        pending.push('技能「' + def.name + '」');
      }
    }
    for (const def of MB.PARRY_DEFS) {
      if (!s.parry.includes(def.id) && meets(def.unlock)) {
        s.parry.push(def.id);
        pending.push('镜反「' + def.name + '」');
      }
    }
    // 自动补位
    for (let i = 0; i < 3; i++) {
      if (!s.loadout[i] || !s.skills.includes(s.loadout[i])) s.loadout[i] = null;
    }
    for (let i = 0; i < 3; i++) {
      if (s.loadout[i]) continue;
      const free = s.skills.find((id) => !s.loadout.includes(id));
      if (free) s.loadout[i] = free;
    }
  }

  /* ───────── 初始化 ───────── */
  const canvas = document.getElementById('cv');
  const ctx = canvas.getContext('2d', { alpha: false });
  let lastT = 0;

  function resize() {
    Game.dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    Game.w = window.innerWidth;
    Game.h = window.innerHeight;
    canvas.width = Math.round(Game.w * Game.dpr);
    canvas.height = Math.round(Game.h * Game.dpr);
    canvas.style.width = Game.w + 'px';
    canvas.style.height = Game.h + 'px';
    ctx.setTransform(Game.dpr, 0, 0, Game.dpr, 0, 0);
    MB.Camera.resize(Game.w, Game.h);
  }

  Game.applyLayout = function () {
    const touch = !!Game.isTouch;
    document.body.classList.toggle('touch-ui', touch);
    document.body.classList.toggle('landscape', window.innerWidth > window.innerHeight);
    const rot = document.getElementById('rotate');
    if (rot) {
      const portrait = window.innerHeight > window.innerWidth;
      rot.classList.toggle('on', !!(touch && portrait && !MB.UI.rotDismissed));
    }
  };

  Game.init = function () {
    resize();
    window.addEventListener('resize', () => { resize(); Game.applyLayout(); });
    window.addEventListener('orientationchange', () => setTimeout(() => { resize(); Game.applyLayout(); }, 150));
    MB.UI.init();
    Game.applyLayout();
    // 按下即生效：防反 0 帧响应
    MB.Input.onPress = (a) => {
      if (a !== 'guard') return;
      if (Game.scene !== 'battle' || !Game.battle || Game.paused || Game.battle.over) return;
      if (Game.battle.intro > 0) return;
      Game.battle.player.startParry();
    };
    MB.Sound.init();
    MB.Sound.setMusic(MB.SAVE.settings.music / 100);
    MB.Sound.setSfx(MB.SAVE.settings.sfx / 100);
    if (MB.SAVE.settings.music > 0) MB.Sound.startMusic();
    MB.Sound.setIntensity(0.25);
    buildShowcase();
    requestAnimationFrame(frame);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && Game.scene === 'battle' && !Game.paused) Game.togglePause(true);
    });
    // 直接开局调试：?stage=1&diff=2
    const q = new URLSearchParams(location.search);
    if (q.has('stage')) {
      Game.startBattle(+q.get('stage') || 0, +q.get('diff') || 0);
    }
    if (!q.has('nosw') && !q.has('app') && 'serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      const hadController = !!navigator.serviceWorker.controller;
      let reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadController || reloading) return;
        reloading = true;
        location.reload();
      });
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => {
          reg.update().catch(() => {});
          // 回到前台时再查一次更新
          document.addEventListener('visibilitychange', () => {
            if (!document.hidden) reg.update().catch(() => {});
          });
        }).catch(() => {});
      });
      // 页面每次加载后 1 秒再主动检查（覆盖长期挂后台的情况）
      setTimeout(() => {
        navigator.serviceWorker.getRegistration().then((r) => r && r.update().catch(() => {}));
      }, 1000);
    }
    if (q.get('fps')) document.getElementById('fps').style.display = 'block';
    Game.debugFps = !!q.get('fps');
  };

  /* ───────── 主循环 ───────── */
  function frame(ts) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, lastT ? (ts - lastT) / 1000 : 0.016);
    lastT = ts;
    MB.Input.tick(dt);

    if (MB.Input.justPressed('pause') && (Game.scene === 'battle')) Game.togglePause();

    if (Game.scene === 'battle' && Game.battle) {
      if (!Game.paused) Game.battle.update(dt);
      Game.battle.draw(ctx, Game.w, Game.h);
      if (Game.paused) drawPauseBg();
    } else {
      drawMenu(dt);
      if (Game.battle) Game.battle.draw(ctx, Game.w, Game.h);
    }

    if (Game.debugFps) {
      Game._fpsAcc = (Game._fpsAcc || 0) + dt;
      Game._fpsN = (Game._fpsN || 0) + 1;
      if (Game._fpsAcc > 0.5) {
        document.getElementById('fps').textContent = Math.round(Game._fpsN / Game._fpsAcc) + ' fps · ' + MB.FX.list.length + ' fx';
        Game._fpsAcc = 0; Game._fpsN = 0;
      }
    }
    MB.Input.endFrame();
  }

  /* ───────── 菜单背景 + 展示角色 ───────── */
  let show = null;
  function buildShowcase() {
    show = {
      x: 0, y: 0, facing: 1, scale: 1.45,
      char: MB.PLAYER, theme: MB.PLAYER.theme,
      state: 'idle', animT: 0, runPhase: 0, vx: 0, vy: 0, moveDir: 0,
      act: null, actT: 0, shakeT: 0, status: {}, dead: false,
      pose: MB.Skeleton.clone(MB.Skeleton.BASE),
      cape: MB.Skeleton.clothInit(6, 12),
      hair: MB.Skeleton.clothInit(3, 8),
      trail: [],
    };
  }

  let menuT = 0;
  function drawMenu(dt) {
    menuT += dt;
    const w = Game.w, h = Game.h;
    const g = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.8);
    g.addColorStop(0, '#0b1b24');
    g.addColorStop(0.45, '#050a10');
    g.addColorStop(1, '#010203');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // 背后的镜环
    ctx.save();
    ctx.translate(w / 2, h * 0.46);
    ctx.globalCompositeOperation = 'lighter';
    ctx.rotate(menuT * 0.05);
    ctx.strokeStyle = 'rgba(92,233,255,.12)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, Math.min(w, h) * (0.24 + i * 0.06), 0, U.TAU);
      ctx.stroke();
    }
    ctx.rotate(-menuT * 0.12);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * U.TAU;
      const r0 = Math.min(w, h) * 0.3, r1 = r0 + 14 + Math.sin(menuT + i) * 6;
      ctx.strokeStyle = 'rgba(120,230,255,.12)';
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
      ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.stroke();
    }
    ctx.restore();

    // 地面
    const gy = h * 0.8;
    const gg = ctx.createLinearGradient(0, gy, 0, h);
    gg.addColorStop(0, 'rgba(30,100,120,.18)');
    gg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gg;
    ctx.fillRect(0, gy, w, h - gy);

    // 展示角色
    if (show) {
      const s = Math.min(w, h) / 620;
      show.x = 0; show.y = 0;
      show.animT += dt;
      MB.Skeleton.update(show, dt);
      ctx.save();
      ctx.translate(w / 2, gy - 8);
      ctx.scale(s * 1.15, s * 1.15);
      ctx.globalAlpha = 0.9;
      MB.Skeleton.draw(ctx, show);
      ctx.restore();

      // 光晕
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const lg = ctx.createRadialGradient(w / 2, gy - 140 * s, 0, w / 2, gy - 140 * s, 160 * s);
      lg.addColorStop(0, 'rgba(60,200,230,.10)');
      lg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    // 浮尘
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) {
      const t = menuT * 0.3 + i * 1.7;
      const x = ((i * 173 + Math.sin(t) * 40 + menuT * 12) % (w + 100)) - 50;
      const y = ((i * 97 + Math.cos(t * 0.7) * 30 + menuT * 9) % (h + 100)) - 50;
      ctx.globalAlpha = 0.12 + Math.sin(t * 2) * 0.06;
      ctx.fillStyle = '#8fe9ff';
      ctx.beginPath(); ctx.arc(x, y, 1.6, 0, U.TAU); ctx.fill();
    }
    ctx.restore();

    // 暗角
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,.75)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  function drawPauseBg() {
    // 战场已绘制，暂停时只压暗
  }

  /* ───────── 战斗流程 ───────── */
  Game.startBattle = function (stageIdx, diff) {
    const stage = MB.STAGES[stageIdx];
    if (!stage) return;
    const s = MB.SAVE;
    if (!MB.UI.stageUnlocked(stageIdx)) { MB.UI.toast('先击破上一关'); return; }
    // 应用装配
    const skills = (s.loadout || []).filter((id) => id && s.skills.includes(id)).slice(0, 3);
    while (skills.length < 3) skills.push(null);
    MB.PLAYER.skills = skills;
    MB.PLAYER.parryStyle = s.parry.includes(s.parryStyle) ? s.parryStyle : 'condemn';
    MB.Sound.init();
    Game.pendingUnlocks = [];
    Game.scene = 'battle';
    Game.paused = false;
    Game.curStage = stageIdx;
    Game.curDiff = diff;
    Game.battle = new MB.Battle({ stage, diff });
    MB.Sound.startMusic();
  };

  Game.onBattleEnd = function (battle) {
    const res = battle.result;
    const s = MB.SAVE;
    const unlocks = [];
    s.stats.battles++;
    s.stats.perfect += res.stats.perfect;
    s.stats.dodges += res.stats.dodge;
    s.stats.maxCombo = Math.max(s.stats.maxCombo, res.stats.maxCombo);
    s.stats.guardBreaks = s.stats.guardBreaks || 0;

    if (res.win) {
      const st = res.stage;
      if (!s.cleared[st.id]) s.cleared[st.id] = [false, false, false];
      s.cleared[st.id][res.diff] = true;
      if (st.rewardSkill && !s.skills.includes(st.rewardSkill)) {
        s.skills.push(st.rewardSkill);
        const d = MB.SKILL_DEFS.find((x) => x.id === st.rewardSkill);
        if (d) unlocks.push('技能「' + d.name + '」');
      }
      if (st.rewardParry && !s.parry.includes(st.rewardParry)) {
        s.parry.push(st.rewardParry);
        const d = MB.PARRY_DEFS.find((x) => x.id === st.rewardParry);
        if (d) unlocks.push('镜反「' + d.name + '」');
      }
    }
    refreshUnlocks(unlocks);

    // 成就
    Game.pendingUnlocks = unlocks;
    const A = (id) => MB.UI.checkAchv(id);
    if (res.win) {
      A('firstBlood');
      if (res.stats.dmgTaken <= 0) A('nohit');
      if (res.stats.perfect === 0) A('noparry');
      if (res.diff >= 1) A('hardclear');
      if (res.diff >= 2) A('nightclear');
      if (MB.STAGES.every((st) => (s.cleared[st.id] || []).some(Boolean))) A('allstage');
      if (s.skills.length >= MB.SKILL_DEFS.length) A('allskill');
    }
    if (s.stats.perfect >= 1) A('firstParry');
    if (s.stats.perfect >= 50) A('parry50');
    if (s.stats.dodges >= 30) A('dodge30');
    if (s.stats.maxCombo >= 50) A('combo50');
    if (s.stats.guardBreaks >= 10) A('guard10');

    res.unlocks = unlocks.slice();
    Game.save();
    MB.UI.showResult(res);
    MB.Sound.setIntensity(0.2);
  };

  Game.afterResult = function () {
    Game.scene = 'menu';
    Game.battle = null;
    MB.FX.clear();
    MB.UI.renderStages();
    MB.UI.show('stages');
    MB.UI.refreshTitle();
  };

  Game.retry = function () {
    if (Game.curStage == null) { Game.afterResult(); return; }
    Game.startBattle(Game.curStage, Game.curDiff);
  };

  Game.quitToStages = function () {
    Game.scene = 'menu';
    Game.battle = null;
    Game.paused = false;
    MB.FX.clear();
    MB.UI.renderStages();
    MB.UI.show('stages');
  };

  Game.quitToLoadout = function () {
    Game.scene = 'menu';
    Game.battle = null;
    Game.paused = false;
    MB.FX.clear();
    MB.UI.renderLoadout();
    MB.UI.show('loadout');
  };

  Game.togglePause = function (force) {
    if (Game.scene !== 'battle' || !Game.battle || Game.battle.over) return;
    Game.paused = force == null ? !Game.paused : force;
    MB.Sound.ui();
    if (Game.paused) MB.UI.show('pause');
    else MB.UI.show('battle');
  };

  /* ───────── 存档导入导出 ───────── */
  Game.exportSave = function () {
    const data = JSON.stringify(MB.SAVE, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    const d = new Date();
    a.href = URL.createObjectURL(blob);
    a.download = `mirror-edge-save-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    MB.UI.toast('存档已导出');
  };

  Game.importSave = function (text) {
    try {
      const obj = JSON.parse(text);
      if (!obj || typeof obj !== 'object' || !Array.isArray(obj.skills)) throw new Error('格式不对');
      const d = defaultSave();
      MB.SAVE = Object.assign(d, obj);
      MB.SAVE.stats = Object.assign({}, d.stats, obj.stats || {});
      MB.SAVE.settings = Object.assign({}, d.settings, obj.settings || {});
      MB.SAVE.cleared = obj.cleared || {};
      MB.SAVE.achv = obj.achv || {};
      Game.save();
      MB.UI.refreshTitle();
      MB.UI.toast('存档已导入');
      MB.UI.renderLoadout && MB.UI.renderLoadout();
    } catch (e) {
      MB.UI.toast('导入失败：' + e.message);
    }
  };

  Game.forceUpdate = async function () {
    MB.UI.toast('正在清理缓存并更新…');
    try {
      if (navigator.serviceWorker) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.unregister();
      }
      if (window.caches) {
        const keys = await caches.keys();
        for (const k of keys) await caches.delete(k);
      }
    } catch (e) { /* ignore */ }
    const u = location.pathname + '?u=' + Date.now();
    location.replace(u);
  };

  Game.wipe = function () {
    localStorage.removeItem(SAVE_KEY);
    location.reload();
  };

  /* ───────── 安卓返回键 ───────── */
  window.__MB = {
    onBack() {
      if (Game.scene === 'battle' && Game.battle) {
        if (Game.battle.over) return true;
        Game.togglePause();
        return true;
      }
      const sc = MB.UI.screen;
      if (sc === 'pause') { Game.togglePause(false); return true; }
      if (sc === 'result') { Game.afterResult(); return true; }
      if (sc === 'stages' || sc === 'loadout' || sc === 'codex' || sc === 'settings') {
        MB.UI.show('title'); MB.UI.refreshTitle(); return true;
      }
      return false;
    },
  };

  /* ───────── 启动 ───────── */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', Game.init);
  else Game.init();
})();
