/* 彩潮 · 水墨第一人称 — 世界 / 手感 / 战斗 / 波次 / 升级 */
'use strict';
(function (CT) {
  var T = THREE, U = CT.U, Fx = CT.Fx, S = CT.Sound;
  var G = CT.Game = {
    state: 'boot', run: null, enemies: [], gems: [], heals: [], orbs: [], boss: null,
    input: { mx: 0, mz: 0 }, keys: {}, t: 0, sens: 0.0022,
    yaw: 0, pitch: 0, recoilP: 0, recoilY: 0, roll: 0, fovKick: 0,
    bob: 0, shakeV: 0, slow: 0, hadLock: false, winT: 0
  };
  var ARENA = 25.2;
  var ATTACKS = [
    { dmg: 20, dur: 0.38, wind: 0.10, hit: 0.14, arc: 1.75, kb: 4.0, kick: 0.020, ang: -0.55, stop: 0.050, reach: 1.00 },
    { dmg: 23, dur: 0.38, wind: 0.10, hit: 0.14, arc: 1.85, kb: 4.6, kick: 0.025, ang: 0.55, stop: 0.055, reach: 1.00 },
    { dmg: 42, dur: 0.54, wind: 0.15, hit: 0.21, arc: 1.98, kb: 8.5, kick: 0.050, ang: 0.0, stop: 0.095, reach: 1.12 }
  ];
  var ETYPE = {
    mote: { hp: 30, speed: 2.35, radius: 0.50, dmg: 6, xp: 1, scale: 1.62, atk: 2.5, wind: 0.42, cd: 1.5, name: '墨蚜' },
    darter: { hp: 22, speed: 3.75, radius: 0.46, dmg: 5, xp: 1, scale: 1.7, atk: 2.4, wind: 0.30, cd: 1.15, name: '疾笔' },
    brute: { hp: 145, speed: 1.72, radius: 0.82, dmg: 14, xp: 5, scale: 1.8, atk: 3.2, wind: 0.72, cd: 2.3, name: '砚龟' },
    spitter: { hp: 52, speed: 2.0, radius: 0.56, dmg: 8, xp: 3, scale: 1.5, atk: 12, wind: 0.62, cd: 2.9, name: '泼墨者', ranged: true }
  };
  var UPGRADES = {
    edge: { name: '锋锐', max: 5, icon: 'edge', color: '#B23A2A', desc: '斩击伤害 +15%' },
    haste: { name: '疾斩', max: 5, icon: 'haste', color: '#C9A45C', desc: '出刀速度 +8%' },
    reach: { name: '长锋', max: 5, icon: 'reach', color: '#F4E9D2', desc: '攻击距离 +0.25m，弧度 +4°' },
    vigor: { name: '铁骨', max: 5, icon: 'heart', color: '#8C3A34', desc: '生命上限 +20，回复 20' },
    speed: { name: '踏墨', max: 5, icon: 'speed', color: '#5D685F', desc: '移动速度 +6%' },
    magnet: { name: '引墨', max: 5, icon: 'magnet', color: '#C9A45C', desc: '拾取范围 +30%' },
    heavy: { name: '重墨', max: 5, icon: 'heavy', color: '#7E3A32', desc: '重击伤害 +30%，冷却 -0.5s' },
    leech: { name: '噬墨', max: 5, icon: 'leech', color: '#4E7A72', desc: '每次命中回复 2 生命' }
  };

  /* ---------------- 启动 ---------------- */
  G.boot = function () {
    var canvas = document.getElementById('gl');
    var renderer;
    try {
      renderer = new T.WebGLRenderer({ canvas: canvas, antialias: false, powerPreference: 'high-performance' });
    } catch (e) {
      throw new Error('需要支持 WebGL 的浏览器');
    }
    this.renderer = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = T.LinearEncoding;
    renderer.toneMapping = T.NoToneMapping;
    renderer.setClearColor(CT.LIGHT.fog, 1);

    this.scene = new T.Scene();
    this.scene.fog = new T.Fog(CT.LIGHT.fog, 28, 145);
    this.camera = new T.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.05, 300);
    this.camera.rotation.order = 'YXZ';
    this.camera.position.set(0, 1.64, 5.5);
    this.scene.add(this.camera);

    this.buildWorld();
    this.buildWeapon();
    this.buildEnemies();
    this.buildBoss();
    this.buildPickups();

    Fx.init(this.scene, this.camera, document.getElementById('fx2d'));
    this.onResize();
    CT.UI.init(this);
    this.bindInput();
    this.run = this.newRun();
    this.state = 'title';
    this.weaponGroup.visible = false;
    CT.UI.showTitle(this.loadSave());
    requestAnimationFrame(this.loop.bind(this));
  };

  G.newRun = function () {
    return {
      time: 0, kills: 0, level: 1, xp: 0, need: 12, hp: 120, maxHp: 120,
      pending: 0, combo: 0, comboT: 0, bestCombo: 0, ult: 0, bossDone: 0,
      passives: { edge: 0, haste: 0, reach: 0, vigor: 0, speed: 0, magnet: 0, heavy: 0, leech: 0 }
    };
  };

  /* ---------------- 世界 ---------------- */
  G.buildWorld = function () {
    var gt = CT.TEX.ground();
    var ground = new T.Mesh(new T.PlaneGeometry(220, 220), new T.MeshBasicMaterial({ map: gt, fog: true }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    this.scene.add(ground);
    this.ground = ground;

    // 纸面墨池
    var poolMat = new T.MeshBasicMaterial({
      map: CT.TEX.splat(), color: 0x14120F, transparent: true, opacity: 0.34,
      depthWrite: false, side: T.DoubleSide
    });
    var pools = new T.InstancedMesh(CT.geo.plane(), poolMat, 26);
    pools.frustumCulled = false;
    var pd = new T.Object3D();
    for (var pi = 0; pi < 26; pi++) {
      var pa = Math.random() * 6.283, pr = U.rand(3, 23);
      pd.position.set(Math.cos(pa) * pr, 0.012, Math.sin(pa) * pr);
      pd.rotation.set(-Math.PI / 2, 0, Math.random() * 6.283);
      pd.scale.set(U.rand(2.5, 7), U.rand(2.5, 7), 1);
      pd.updateMatrix();
      pools.setMatrixAt(pi, pd.matrix);
    }
    pools.instanceMatrix.needsUpdate = true;
    this.scene.add(pools);

    // 长笔触
    var strokeMat = new T.MeshBasicMaterial({
      map: CT.TEX.stroke(), color: 0x14120F, transparent: true, opacity: 0.5,
      depthWrite: false, side: T.DoubleSide
    });
    var strokes = new T.InstancedMesh(CT.geo.plane(), strokeMat, 16);
    strokes.frustumCulled = false;
    for (var si = 0; si < 16; si++) {
      var sa = Math.random() * 6.283, sr = U.rand(4, 22);
      pd.position.set(Math.cos(sa) * sr, 0.014, Math.sin(sa) * sr);
      pd.rotation.set(-Math.PI / 2, 0, Math.random() * 6.283);
      pd.scale.set(U.rand(7, 16), U.rand(1.2, 3.2), 1);
      pd.updateMatrix();
      strokes.setMatrixAt(si, pd.matrix);
    }
    strokes.instanceMatrix.needsUpdate = true;
    this.scene.add(strokes);

    // 赤月
    var moonMat = new T.MeshBasicMaterial({ map: CT.TEX.moon(), transparent: true, depthWrite: false, fog: false });
    var moon = new T.Mesh(new T.PlaneGeometry(26, 26), moonMat);
    moon.position.set(0, 44, -72);
    moon.renderOrder = -2;
    this.scene.add(moon);
    this.moon = moon;
    var halo = new T.Mesh(new T.PlaneGeometry(46, 46), new T.MeshBasicMaterial({
      map: CT.TEX.moon(), transparent: true, opacity: 0.16, depthWrite: false, fog: false, blending: T.AdditiveBlending
    }));
    halo.position.copy(moon.position);
    halo.position.z -= 0.25;
    this.scene.add(halo);

    // 远山
    var mGeo = CT.geo.mountains();
    var mMesh = new T.Mesh(mGeo, new T.MeshBasicMaterial({ vertexColors: true, fog: true, side: T.DoubleSide }));
    this.scene.add(mMesh);

    // 竹阵
    var bambooGeo = CT.geo.bamboo();
    var bambooMat = CT.mat.toon({ sway: true, rim: 0.05, edge: 0.2, amb: 0.12, side: T.DoubleSide });
    var bamboo = new T.InstancedMesh(bambooGeo, bambooMat, 30);
    bamboo.frustumCulled = false;
    var dummy = new T.Object3D();
    for (var i = 0; i < 30; i++) {
      var a = i / 30 * 6.283 + U.rand(-0.08, 0.08);
      var r = U.rand(27.5, 33);
      dummy.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      dummy.rotation.set(0, U.rand(0, 6.283), 0);
      dummy.scale.setScalar(U.rand(0.75, 1.25));
      dummy.updateMatrix();
      bamboo.setMatrixAt(i, dummy.matrix);
    }
    bamboo.instanceMatrix.needsUpdate = true;
    this.scene.add(bamboo);

    // 墨石
    var rockGeo = CT.geo.rock();
    var rocks = new T.InstancedMesh(rockGeo, CT.mat.toon({ rim: 0.08, edge: 0.24, amb: 0.16 }), 18);
    rocks.frustumCulled = false;
    for (var k = 0; k < 18; k++) {
      var ra = Math.random() * 6.283, rr = U.rand(6, 23);
      dummy.position.set(Math.cos(ra) * rr, 0, Math.sin(ra) * rr);
      dummy.rotation.set(0, U.rand(0, 6.283), 0);
      dummy.scale.set(U.rand(0.6, 1.4), U.rand(0.4, 0.9), U.rand(0.6, 1.4));
      dummy.updateMatrix();
      rocks.setMatrixAt(k, dummy.matrix);
    }
    rocks.instanceMatrix.needsUpdate = true;
    this.scene.add(rocks);

    // 边界墨圈
    var ring = new T.Mesh(new T.PlaneGeometry(1, 1), CT.mat.add({
      map: CT.TEX.ring(), color: 0x0E0C0A, opacity: 0.20
    }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    ring.scale.set(ARENA * 2.5, ARENA * 2.5, 1);
    this.scene.add(ring);

    // 影子池
    this.shadowPool = new T.InstancedMesh(CT.geo.plane(), CT.mat.shadow(), 90);
    this.shadowPool.frustumCulled = false;
    this.shadowPool.instanceMatrix.setUsage(T.DynamicDrawUsage);
    this.shadowPool.renderOrder = 1;
    this.scene.add(this.shadowPool);
  };

  G.buildWeapon = function () {
    this.weaponGroup = new T.Group();
    var mat = CT.mat.toon({ rim: 0.4, edge: 0.16, amb: 0.55 });
    mat.depthTest = false;
    var mesh = new T.Mesh(CT.geo.weapon(), mat);
    mesh.renderOrder = 30;
    mesh.frustumCulled = false;
    this.weaponGroup.add(mesh);
    this.weaponGroup.position.set(0.38, -0.62, -0.85);
    this.weaponGroup.rotation.set(0.10, -0.15, 0.45);
    this.weaponGroup.scale.setScalar(0.45);
    this.camera.add(this.weaponGroup);
    this.weaponMesh = mesh;
    this.weaponBase = { px: 0.38, py: -0.62, pz: -0.85, rx: 0.10, ry: -0.15, rz: 0.45 };
    this.weaponGroup.visible = false;
    this.weaponEl = document.getElementById('weapon');
  };

  G.buildEnemies = function () {
    this.enemyMeshes = {};
    var geo = { mote: CT.geo.mote, darter: CT.geo.darter, brute: CT.geo.brute, spitter: CT.geo.spitter };
    var mat = CT.mat.toon({ rim: 0.55, edge: 0.20, amb: 0.10 });
    var caps = { mote: 44, darter: 34, brute: 16, spitter: 16 };
    this.caps = caps;
    Object.keys(geo).forEach(function (k) {
      var m = new T.InstancedMesh(geo[k](), mat, caps[k]);
      m.instanceMatrix.setUsage(T.DynamicDrawUsage);
      m.frustumCulled = false;
      for (var i = 0; i < caps[k]; i++) m.setColorAt(i, new T.Color(1, 1, 1));
      m.count = 0;
      G.scene.add(m);
      G.enemyMeshes[k] = m;
    });
  };

  G.buildBoss = function () {
    this.bossMesh = new T.Mesh(CT.geo.boss(), CT.mat.toon({ rim: 0.3, edge: 0.22, amb: 0.06 }));
    this.bossMesh.visible = false;
    this.bossMesh.scale.setScalar(0.95);
    this.scene.add(this.bossMesh);
    this.bossWarn = new T.Mesh(new T.PlaneGeometry(1, 1), CT.mat.add({
      map: CT.TEX.ring(), color: 0xB23A2A, opacity: 0.9
    }));
    this.bossWarn.rotation.x = -Math.PI / 2;
    this.bossWarn.position.y = 0.04;
    this.bossWarn.visible = false;
    this.bossWarn.renderOrder = 3;
    this.scene.add(this.bossWarn);
  };

  G.buildPickups = function () {
    var gem = new T.MeshBasicMaterial({ vertexColors: true, fog: true });
    this.gemMesh = new T.InstancedMesh(CT.geo.gem(), gem, 140);
    this.gemMesh.frustumCulled = false;
    this.gemMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    this.gemMesh.count = 0;
    this.scene.add(this.gemMesh);

    this.healMesh = new T.InstancedMesh(CT.geo.heal(), gem, 5);
    this.healMesh.frustumCulled = false;
    this.healMesh.count = 0;
    this.scene.add(this.healMesh);

    this.orbMesh = new T.InstancedMesh(new T.IcosahedronGeometry(0.18, 0), new T.MeshBasicMaterial({ color: 0xB23A2A }), 24);
    this.orbMesh.frustumCulled = false;
    this.orbMesh.count = 0;
    this.scene.add(this.orbMesh);
  };

  /* ---------------- 输入 ---------------- */
  G.bindInput = function () {
    var self = this;
    window.addEventListener('resize', function () { self.onResize(); });
    document.addEventListener('keydown', function (e) {
      self.keys[e.code] = true;
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (self.state === 'playing') { self.pause(); }
      }
      if (e.code === 'Space') { e.preventDefault(); self.tryDash(); }
      if (e.code === 'KeyQ') self.tryUlt();
      if (self.state === 'levelup' && /^Digit[1-3]$/.test(e.code)) CT.UI.pickByKey(+e.code.slice(5) - 1);
    });
    document.addEventListener('keyup', function (e) { self.keys[e.code] = false; });

    var canvas = this.renderer.domElement;
    var drag = { active: false, moved: 0, lx: 0, ly: 0 };
    canvas.addEventListener('mousedown', function (e) {
      if (self.state !== 'playing') return;
      if (e.button === 0) {
        if (document.pointerLockElement === canvas) self.attack();
        else { drag.active = true; drag.moved = 0; drag.lx = e.clientX; drag.ly = e.clientY; }
      } else if (e.button === 2) {
        self.tryHeavy();
      }
    });
    window.addEventListener('mousemove', function (e) {
      if (!drag.active || document.pointerLockElement === canvas) return;
      var dx = e.clientX - drag.lx, dy = e.clientY - drag.ly;
      drag.lx = e.clientX; drag.ly = e.clientY;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      if (drag.moved > 4) self.look(dx * 1.25, dy * 1.25);
    });
    window.addEventListener('mouseup', function () {
      if (!drag.active) return;
      drag.active = false;
      if (drag.moved < 6) self.attack();
    });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.addEventListener('mousemove', function (e) {
      if (document.pointerLockElement !== canvas || self.state !== 'playing') return;
      self.look(e.movementX, e.movementY);
    });
    document.addEventListener('pointerlockchange', function () {
      var locked = document.pointerLockElement === canvas;
      if (locked) { self.hadLock = true; }
      else if (self.hadLock && self.state === 'playing') {
        self.hadLock = false;
        self.pause();
      }
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && self.state === 'playing') self.pause();
    });
  };

  G.requestLock = function () {
    if (CT.UI.touch) return;
    var el = this.renderer.domElement;
    try { el.requestPointerLock && el.requestPointerLock(); } catch (e) { }
  };
  G.exitLock = function () {
    try { document.exitPointerLock && document.exitPointerLock(); } catch (e) { }
    this.hadLock = false;
  };

  G.onResize = function () {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(dpr);
    Fx.setViewport(window.innerWidth, window.innerHeight, dpr);
  };

  G.look = function (dx, dy) {
    if (this.state !== 'playing') return;
    this.yaw -= dx * this.sens;
    this.pitch -= dy * this.sens;
    this.pitch = U.clamp(this.pitch, -1.15, 1.05);
    this.lookVel = { x: dx, y: dy };
  };

  /* ---------------- 存档 ---------------- */
  G.loadSave = function () {
    try {
      var s = JSON.parse(localStorage.getItem('chromatide.fps.save.v1') || '{}');
      return { bestKills: s.bestKills || 0, bestTime: s.bestTime || 0, runs: s.runs || 0, sound: s.sound !== false, bestCombo: s.bestCombo || 0 };
    } catch (e) { return { bestKills: 0, bestTime: 0, runs: 0, sound: true, bestCombo: 0 }; }
  };
  G.saveGame = function (d) {
    try { localStorage.setItem('chromatide.fps.save.v1', JSON.stringify(d)); } catch (e) { }
  };

  /* ---------------- 流程 ---------------- */
  G.startRun = function () {
    S.resume();
    S.setMuted(CT.UI.save.sound === false);
    S.startAmbient();
    this.run = this.newRun();
    this.enemies.length = 0; this.gems.length = 0; this.heals.length = 0; this.orbs.length = 0;
    this.boss = null; this.winT = 0; this.bossSpawned18 = false; this.bossSpawned36 = false;
    this.player = { x: 0, z: 0, vx: 0, vz: 0, hp: 120, iframe: 0, dashT: 0, dashX: 0, dashZ: 0, dashCd: 0, heavyCd: 0 };
    this.yaw = 0; this.pitch = 0; this.recoilP = 0; this.recoilY = 0; this.roll = 0; this.fovKick = 0;
    this.attackState = { active: false, i: 0, t: 0, hit: false, queued: false };
    this.heavyState = { active: false, t: 0, hit: false };
    this.comboCount = 0; this.comboReset = 0;
    this.spawnT = 1.4; this.waveT = 26; this.waveCount = 0; this.t = 0; this.hudT = 0;
    this.bossMesh.visible = false; this.bossWarn.visible = false;
    Fx.reset();
    this.applyStats();
    this.player.hp = this.run.maxHp;
    this.weaponGroup.visible = false;
    if (this.weaponEl) this.weaponEl.classList.remove('hidden');
    CT.UI.beginRun();
    CT.UI.updateHud(this.run);
    this.state = 'playing';
    this.requestLock();
    this.spawnOpen();
  };

  G.spawnOpen = function () {
    for (var i = 0; i < 3; i++) {
      var a = i / 3 * 6.283 + 0.4, d = U.rand(13, 17);
      this.spawnEnemy('mote', Math.cos(a) * d, Math.sin(a) * d);
    }
  };

  G.pause = function () {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.exitLock();
    CT.UI.showPause(this.run);
  };
  G.resume = function () {
    if (this.state !== 'paused' && this.state !== 'levelup') return;
    this.state = 'playing';
    CT.UI.hideAll();
    S.resume();
    this.requestLock();
  };
  G.togglePause = function () {
    if (this.state === 'playing') this.pause();
    else if (this.state === 'paused') this.resume();
  };
  G.toTitle = function () {
    this.state = 'title';
    this.enemies.length = 0; this.gems.length = 0; this.heals.length = 0; this.orbs.length = 0;
    this.boss = null; this.bossMesh.visible = false; this.bossWarn.visible = false;
    this.weaponGroup.visible = false;
    if (this.weaponEl) this.weaponEl.classList.add('hidden');
    this.exitLock();
    S.stopAmbient();
    Fx.reset();
    this.clearMeshes();
    CT.UI.hideAll();
    CT.UI.showTitle(this.loadSave());
    this.camera.position.set(0, 1.7, 6.2);
    this.yaw = 0.06; this.pitch = 0.02;
  };
  G.clearMeshes = function () {
    var self = this;
    Object.keys(this.enemyMeshes).forEach(function (k) { self.enemyMeshes[k].count = 0; });
    this.gemMesh.count = 0; this.healMesh.count = 0; this.orbMesh.count = 0; this.shadowPool.count = 0;
  };
  G.gameOver = function (win) {
    if (this.state === 'dead' || this.state === 'win') return;
    this.state = win ? 'win' : 'dead';
    this.exitLock();
    this.weaponGroup.visible = false;
    if (this.weaponEl) this.weaponEl.classList.add('hidden');
    S.stopAmbient();
    S.play(win ? 'win' : 'lose');
    var sv = this.loadSave();
    sv.runs = (sv.runs || 0) + 1;
    if (this.run.kills > (sv.bestKills || 0)) sv.bestKills = this.run.kills;
    if (this.run.time > (sv.bestTime || 0)) sv.bestTime = this.run.time;
    if (this.run.bestCombo > (sv.bestCombo || 0)) sv.bestCombo = this.run.bestCombo;
    this.saveGame(sv);
    CT.UI.showEnd(this.run, sv, win);
  };

  G.applyStats = function () {
    var p = this.run.passives;
    this.run.maxHp = 120 + p.vigor * 20;
    this.player.hp = Math.min(this.player.hp, this.run.maxHp);
    this.speed = 5.5 * (1 + p.speed * 0.06);
    this.dmgMul = 1 + p.edge * 0.15;
    this.reach = 3.05 + p.reach * 0.25;
    this.arc = 2.02 + p.reach * 0.08;
    this.magnetR = 4.2 * (1 + p.magnet * 0.30);
    this.hasteMul = 1 / (1 + p.haste * 0.08);
    this.heavyDmg = 55 * (1 + p.heavy * 0.30);
    this.heavyCd = Math.max(1.8, 4.8 - p.heavy * 0.5);
    this.leech = p.leech * 2;
  };

  /* ---------------- 玩家 ---------------- */
  G.updatePlayer = function (dt) {
    var p = this.player;
    p.iframe = Math.max(0, p.iframe - dt);
    p.dashCd = Math.max(0, p.dashCd - dt);
    p.heavyCd = Math.max(0, p.heavyCd - dt);

    var kb = this.readKeyboard();
    var mx = this.input.mx + kb.x;
    var mz = this.input.mz + kb.z;
    var ml = Math.hypot(mx, mz);
    if (ml > 1) { mx /= ml; mz /= ml; }

    var fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    var rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
    var wx = fx * mz + rx * mx, wz = fz * mz + rz * mx;
    var wl = Math.hypot(wx, wz);

    if (p.dashT > 0) {
      p.dashT -= dt;
      var sp = 16;
      p.x += p.dashX * sp * dt;
      p.z += p.dashZ * sp * dt;
      p.vx = p.dashX * sp; p.vz = p.dashZ * sp;
      if (Math.random() < 0.5) Fx.splat(p.x, p.z, CT.PAL.ink, 2, 1.4, 0.8);
    } else {
      var targetX = wl > 0.01 ? wx / wl * this.speed : 0;
      var targetZ = wl > 0.01 ? wz / wl * this.speed : 0;
      var accel = 1 - Math.pow(0.0009, dt);
      p.vx += (targetX - p.vx) * accel;
      p.vz += (targetZ - p.vz) * accel;
      p.x += p.vx * dt;
      p.z += p.vz * dt;
    }
    var dist = Math.hypot(p.x, p.z);
    if (dist > ARENA) {
      var k = ARENA / dist;
      p.x *= k; p.z *= k;
      p.vx *= 0.3; p.vz *= 0.3;
    }
    this.moveSpeed = Math.hypot(p.vx, p.vz);
    this.bob += dt * (1.2 + this.moveSpeed * 1.15);

    // 视点后坐力回归
    var decay = Math.pow(0.00025, dt);
    this.recoilP *= decay; this.recoilY *= decay; this.roll *= Math.pow(0.0004, dt);
    this.fovKick *= Math.pow(0.0001, dt);

    // 键盘方向键兜底视角
    if (this.keys.ArrowLeft) this.yaw += dt * 1.8;
    if (this.keys.ArrowRight) this.yaw -= dt * 1.8;
    if (this.keys.ArrowUp) this.pitch += dt * 1.2;
    if (this.keys.ArrowDown) this.pitch -= dt * 1.2;
    this.pitch = U.clamp(this.pitch, -1.15, 1.05);
  };

  G.readKeyboard = function () {
    var x = 0, z = 0;
    if (this.keys.KeyA) x -= 1;
    if (this.keys.KeyD) x += 1;
    if (this.keys.KeyW) z += 1;
    if (this.keys.KeyS) z -= 1;
    return { x: x, z: z };
  };

  /* ---------------- 攻击 ---------------- */
  G.attack = function () {
    if (this.state !== 'playing') return;
    var a = this.attackState;
    if (a.active) {
      if (a.t > 0.10) a.queued = true;
      return;
    }
    if (this.heavyState.active) return;
    if (this.comboReset > 0.55) this.comboCount = 0;
    var i = this.comboCount % 3;
    this.startAttack(i);
    this.comboCount = (this.comboCount + 1) % 3;
    this.comboReset = 0;
    if (CT.UI.touch) this.aimAssist();
  };

  G.aimAssist = function () {
    var fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    var best = null, bestD = 5.2, bestAng = 0.9;
    for (var i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i];
      if (e.dead) continue;
      var dx = e.x - this.player.x, dz = e.z - this.player.z, d = Math.hypot(dx, dz);
      if (d > bestD || d < 0.1) continue;
      var dot = (dx * fx + dz * fz) / d;
      var ang = Math.acos(U.clamp(dot, -1, 1));
      if (ang < bestAng) { bestAng = ang; best = e; }
    }
    if (best) {
      var target = Math.atan2(-(best.x - this.player.x), -(best.z - this.player.z));
      var diff = ((target - this.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      this.yaw += diff * 0.45;
    }
  };

  G.startAttack = function (i) {
    var a = ATTACKS[i];
    this.attackState = { active: true, i: i, t: 0, dur: a.dur * this.hasteMul, hit: false, queued: false };
    S.play('swing');
  };

  G.updateAttack = function (dt) {
    var a = this.attackState;
    if (!a.active) {
      if (this.comboReset >= 0) this.comboReset += dt;
      if (this.comboReset > 1.2) this.comboCount = 0;
      return;
    }
    var d = ATTACKS[a.i];
    a.t += dt;
    var total = d.dur * this.hasteMul;
    if (!a.hit && a.t >= d.wind + (d.hit - d.wind) * 0.35) {
      a.hit = true;
      this.doHit(d, a.i, false);
    }
    if (a.t >= total) {
      a.active = false;
      this.comboReset = 0.0001;
      if (a.queued) { this.attack(); }
    }
  };

  G.tryHeavy = function () {
    if (this.state !== 'playing' || this.heavyState.active || this.player.heavyCd > 0) return;
    this.heavyState = { active: true, t: 0, hit: false, dur: 0.78 };
    this.player.heavyCd = this.heavyCd;
    this.attackState.active = false;
    S.play('swing');
    S.play('heavy');
  };

  G.updateHeavy = function (dt) {
    var h = this.heavyState;
    if (!h.active) return;
    h.t += dt;
    if (!h.hit && h.t > 0.32) {
      h.hit = true;
      this.doHit({ dmg: this.heavyDmg, kb: 10, kick: 0.06, stop: 0.11 }, 0, true);
      var p = this.player;
      Fx.ring(p.x, p.z, CT.PAL.ink, 0.5, 4.6, 0.5, { opacity: 0.7 });
      Fx.ring(p.x, p.z, CT.PAL.verm, 0.2, 3.4, 0.35);
      Fx.shake(0.8);
      this.fovKick += 9;
      this.roll += 0.10;
      this.slow = Math.max(this.slow, 0.10);
    }
    if (h.t >= h.dur) h.active = false;
  };

  G.doHit = function (d, index, heavy) {
    var p = this.player;
    var fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    var reach = heavy ? 4.3 : this.reach * d.reach;
    var arc = heavy ? 6.283 : this.arc * (d.arc / 1.75);
    var dmgBase = (heavy ? d.dmg : d.dmg * (index === 2 ? 1.0 : 1.0)) * this.dmgMul;
    var hits = 0, kills = 0;
    var i;
    for (i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i];
      if (e.dead) continue;
      var dx = e.x - p.x, dz = e.z - p.z;
      var dist = Math.hypot(dx, dz);
      if (dist > reach + e.radius) continue;
      if (!heavy && dist > 0.4) {
        var dot = (dx * fx + dz * fz) / dist;
        if (dot < Math.cos(arc / 2)) continue;
      }
      var nx = dist > 0.01 ? dx / dist : fx, nz = dist > 0.01 ? dz / dist : fz;
      var dmg = dmgBase * (index === 2 ? 1.45 : 1.0);
      var crit = Math.random() < 0.12;
      if (crit) dmg *= 1.6;
      this.damageEnemy(e, dmg, nx * d.kb, nz * d.kb, heavy, crit);
      hits++;
      if (e.dead) kills++;
      if (this.leech > 0) {
        this.player.hp = Math.min(this.run.maxHp, this.player.hp + this.leech);
        this.run.hp = this.player.hp;
      }
    }
    if (hits > 0) {
      var stop = d.stop || 0.055;
      Fx.hitstop(stop + Math.min(0.05, hits * 0.008));
      this.recoilP += (heavy ? 0.07 : 0.038) + Math.random() * 0.015;
      this.recoilY += (Math.random() - 0.5) * (heavy ? 0.06 : 0.032);
      this.fovKick += heavy ? 11 : 5.5;
      this.roll += (heavy ? 0.06 : 0.02) * (Math.random() < 0.5 ? -1 : 1);
      this.camKick = 0.10;
      Fx.shake(heavy ? 0.9 : 0.42 + hits * 0.06);
      CT.UI.hitFlash(heavy);
      if (navigator.vibrate) { try { navigator.vibrate(heavy ? 35 : 12); } catch (e) { } }
      Fx.hitmark(heavy ? 'heavy' : (kills ? 'kill' : 'hit'));
      Fx.slash(heavy ? 0.3 : d.ang, 'paper', heavy ? 1.5 : 1.15);
      Fx.screenSplat(this.w * (0.5 + U.rand(-0.16, 0.16)), this.h * (0.45 + U.rand(-0.12, 0.12)), U.pick(['ink', 'verm', 'gold', 'teal']), U.rand(50, 110), 0.22);
      S.play('impact');
      if (kills) {
        S.play('kill');
        this.slow = Math.max(this.slow, 0.07);
      }
      if (heavy) Fx.screenSplat(this.w * 0.5, this.h * 0.55, 'ink', 240, 0.35);
    }
  };

  G.damageEnemy = function (e, dmg, kx, kz, heavy, crit) {
    if (e.dead) return;
    e.hp -= dmg;
    e.flash = 1;
    e.stun = Math.max(e.stun || 0, heavy ? 0.5 : 0.16);
    if (!e.isBoss) {
      e.kx = (e.kx || 0) + kx * (e.type === 'brute' ? 0.35 : 1);
      e.kz = (e.kz || 0) + kz * (e.type === 'brute' ? 0.35 : 1);
    } else {
      e.kx = (e.kx || 0) + kx * 0.12; e.kz = (e.kz || 0) + kz * 0.12;
    }
    var h = e.isBoss ? 5.2 : (ETYPE[e.type].scale * 1.2);
    Fx.damage(e.x, h, e.z, dmg, crit ? 'crit' : (e.isBoss ? 'boss' : 'hit'));
    var vv = new T.Vector3(e.x, h, e.z).project(this.camera);
    if (vv.z < 1) Fx.screenSplat((vv.x * 0.5 + 0.5) * Fx.w, (-vv.y * 0.5 + 0.5) * Fx.h, heavy ? 'verm' : 'paper', heavy ? 150 : 64, heavy ? 0.55 : 0.5, 0.24);
    var col = Math.random() < 0.6 ? CT.PAL.ink : U.pick([CT.PAL.verm, CT.PAL.gold]);
    Fx.splat(e.x, e.z, col, heavy ? 10 : 4, heavy ? 4 : 2.2, h * 0.6);
    Fx.spark(e.x, h * 0.7, e.z, Math.random() < 0.5 ? CT.PAL.verm : CT.PAL.ink, heavy ? 8 : 3, heavy ? 4 : 2.4);
    if (e.hp <= 0) this.killEnemy(e, heavy);
  };

  G.killEnemy = function (e, heavy) {
    if (e.dead) return;
    e.dead = true;
    var r = this.run;
    r.kills++;
    r.combo++;
    r.comboT = 2.6;
    r.bestCombo = Math.max(r.bestCombo, r.combo);
    r.ult = Math.min(100, r.ult + (e.isBoss ? 50 : 1.1));
    CT.UI.combo(r.combo);
    var col = U.pick([CT.PAL.verm, CT.PAL.gold, CT.PAL.moss, CT.PAL.paper]);
    Fx.splat(e.x, e.z, col, e.isBoss ? 40 : 14, e.isBoss ? 7 : 4, 0.8);
    Fx.spark(e.x, 1.2, e.z, col, e.isBoss ? 30 : 8, 4);
    Fx.decal(e.x, e.z, col, e.isBoss ? 6 : 1.1, 4.5);
    Fx.ring(e.x, e.z, col, 0.2, e.isBoss ? 12 : 2.4, e.isBoss ? 0.9 : 0.35, { opacity: 0.5 });
    if (e.isBoss) {
      this.boss = null; this.bossMesh.visible = false; this.bossWarn.visible = false;
      Fx.shake(1.2); Fx.hitstop(0.14);
      S.play('kill'); S.play('heavy');
      this.slow = Math.max(this.slow, 0.3);
      CT.UI.ultFlash();
      this.run.bossDone++;
      if (e.final) {
        this.winT = 1.6;
        CT.UI.toast('墨渊散尽', '纸面重新有了颜色', 'gold');
      } else {
        CT.UI.toast('墨渊崩解', '颜色回到荒原', 'gold');
        this.player.hp = Math.min(this.run.maxHp, this.player.hp + 30);
        r.ult = 100;
      }
      return;
    }
    var xp = ETYPE[e.type].xp;
    this.spawnGem(e.x, e.z, xp);
    if (r.kills % 40 === 0) this.heals.push({ x: e.x, z: e.z, t: 0, val: 18 });
    if (heavy) { this.slow = Math.max(this.slow, 0.05); }
    S.play('kill');
  };

  G.tryDash = function () {
    var p = this.player;
    if (this.state !== 'playing' || p.dashCd > 0) return;
    var kb = this.readKeyboard();
    var mx = this.input.mx + kb.x, mz = this.input.mz + kb.z;
    var l = Math.hypot(mx, mz);
    var dx, dz;
    if (l > 0.1) {
      var fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
      var rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
      dx = (fx * mz + rx * mx) / l; dz = (fz * mz + rz * mx) / l;
    } else { dx = -Math.sin(this.yaw); dz = -Math.cos(this.yaw); }
    p.dashX = dx; p.dashZ = dz;
    p.dashT = 0.18; p.dashCd = 2.5; p.iframe = Math.max(p.iframe, 0.32);
    this.fovKick += 7;
    this.roll += 0.05 * (Math.random() < 0.5 ? -1 : 1);
    S.play('dash');
    Fx.splat(p.x, p.z, CT.PAL.paper, 5, 2, 0.6);
    Fx.screenSplat(this.w * 0.5, this.h * 0.55, 'paper', 160, 0.2);
  };

  G.tryUlt = function () {
    if (this.state !== 'playing' || this.run.ult < 100) return;
    this.run.ult = 0;
    this.slow = 0.4;
    Fx.hitstop(0.12);
    Fx.shake(1.4);
    Fx.ult = true;
    S.play('ult');
    CT.UI.ultFlash();
    var p = this.player;
    Fx.ring(p.x, p.z, CT.PAL.verm, 0.5, 18, 1.0, { opacity: 1 });
    Fx.ring(p.x, p.z, CT.PAL.gold, 0.3, 12, 0.7);
    Fx.ring(p.x, p.z, CT.PAL.ink, 0.2, 8, 0.5);
    Fx.splat(p.x, p.z, CT.PAL.verm, 40, 8, 1);
    CT.UI.toast('万彩归一', '整张纸都在震动', 'gold');
    for (var i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i];
      if (e.dead) continue;
      var dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz);
      if (d < 16) this.damageEnemy(e, (e.isBoss ? 320 : 180) * this.dmgMul, dx / (d || 1) * 8, dz / (d || 1) * 8, true, true);
    }
    this.orbs.length = 0;
  };

  /* ---------------- 敌人 ---------------- */
  G.spawnPoint = function (a, d) {
    var fwd = Math.atan2(-Math.cos(this.yaw), -Math.sin(this.yaw));
    var aa = fwd + U.rand(-1.5, 1.5);
    var x = this.player.x + Math.cos(aa) * d;
    var z = this.player.z + Math.sin(aa) * d;
    var dd = Math.hypot(x, z);
    if (dd > ARENA - 1.2) { var k = (ARENA - 1.2) / dd; x *= k; z *= k; }
    return { x: x, z: z };
  };

  G.spawnEnemy = function (type, x, z) {
    var def = ETYPE[type];
    var count = 0;
    for (var i = 0; i < this.enemies.length; i++) if (this.enemies[i].type === type && !this.enemies[i].dead) count++;
    if (count >= this.caps[type]) return null;
    var hpScale = 1 + Math.min(1.5, this.run.time / 300);
    var e = {
      type: type, x: x, z: z, hp: def.hp * hpScale, maxHp: 1, radius: def.radius,
      speed: def.speed, dmg: def.dmg, scale: def.scale, face: 0, flash: 0, stun: 0,
      kx: 0, kz: 0, age: 0, windup: 0, cd: U.rand(0.4, 1.4), bob: Math.random() * 6, dead: false,
      ranged: !!def.ranged
    };
    e.maxHp = e.hp;
    this.enemies.push(e);
    return e;
  };

  G.updateEnemies = function (dt) {
    var p = this.player;
    var list = this.enemies;
    var i, j;
    for (i = 0; i < list.length; i++) {
      var a = list[i];
      if (a.dead) continue;
      for (j = i + 1; j < list.length; j++) {
        var b = list[j];
        if (b.dead) continue;
        var dx = b.x - a.x, dz = b.z - a.z;
        var rr = a.radius + b.radius;
        var d2 = dx * dx + dz * dz;
        if (d2 < rr * rr && d2 > 0.001) {
          var d = Math.sqrt(d2), push = (rr - d) * 0.5;
          a.x -= dx / d * push; a.z -= dz / d * push;
          b.x += dx / d * push; b.z += dz / d * push;
        }
      }
    }
    for (i = 0; i < list.length; i++) {
      var e = list[i];
      if (e.dead) { continue; }
      if (e.isBoss) { e.age += dt; continue; }
      e.flash = Math.max(0, e.flash - dt * 6);
      e.stun = Math.max(0, e.stun - dt);
      e.age += dt;
      e.bob += dt * 4;
      var ex = p.x - e.x, ez = p.z - e.z;
      var dist = Math.hypot(ex, ez) || 0.001;
      e.face = Math.atan2(ex, ez);
      e.x += (e.kx || 0) * dt;
      e.z += (e.kz || 0) * dt;
      e.kx *= Math.pow(0.0005, dt); e.kz *= Math.pow(0.0005, dt);

      if (e.stun <= 0) {
        e.cd -= dt;
        if (e.windup > 0) {
          e.windup -= dt;
          if (e.windup <= 0) {
            if (dist < (ETYPE[e.type].atk + 0.7)) this.hurtPlayer(e.dmg);
            Fx.splat(e.x + ex / dist * 1.2, e.z + ez / dist * 1.2, CT.PAL.verm, 4, 1.4, 1.0);
            if (e.type === 'brute') {
              Fx.ring(e.x, e.z, CT.PAL.verm, 0.4, 3.2, 0.4, { opacity: 0.6 });
              Fx.shake(0.35);
            }
            if (e.ranged) {
              this.orbs.push({ x: e.x, y: 1.5, z: e.z, vx: ex / dist * 7.5, vz: ez / dist * 7.5, life: 4, dmg: e.dmg });
              S.play('rain');
            }
            e.cd = ETYPE[e.type].cd;
          }
        } else if (e.cd <= 0) {
          if (e.ranged) {
            if (dist > 4.5 && dist < 14) { e.windup = ETYPE[e.type].wind; }
            else if (dist <= 4.5) {
              e.x -= ex / dist * e.speed * dt;
              e.z -= ez / dist * e.speed * dt;
            } else {
              e.x += ex / dist * e.speed * dt;
              e.z += ez / dist * e.speed * dt;
            }
          } else if (dist > ETYPE[e.type].atk) {
            e.x += ex / dist * e.speed * dt;
            e.z += ez / dist * e.speed * dt;
          } else {
            e.windup = ETYPE[e.type].wind;
            Fx.ring(e.x, e.z, CT.PAL.verm, 0.2, 1.5, ETYPE[e.type].wind + 0.05, { opacity: 0.4, y: 0.03 });
            e.cd = ETYPE[e.type].cd + ETYPE[e.type].wind;
            if (e.type === 'darter') { e.x += ex / dist * 0.6; e.z += ez / dist * 0.6; }
          }
        }
      }
      var pd2 = Math.hypot(p.x - e.x, p.z - e.z) || 0.001;
      if (pd2 < 2.15) {
        e.x = p.x - (p.x - e.x) / pd2 * 2.15;
        e.z = p.z - (p.z - e.z) / pd2 * 2.15;
      }
      var ad = Math.hypot(e.x, e.z);
      if (ad > ARENA + 2) { e.x *= (ARENA + 2) / ad; e.z *= (ARENA + 2) / ad; }
    }
    for (i = list.length - 1; i >= 0; i--) if (list[i].dead) list.splice(i, 1);
  };

  G.hurtPlayer = function (dmg) {
    var p = this.player;
    if (p.iframe > 0 || this.state !== 'playing') return;
    p.iframe = 0.8;
    p.hp -= dmg;
    this.run.hp = p.hp;
    Fx.damage(p.x, 2.4, p.z, dmg, 'hurt');
    Fx.screenSplat(this.w * (0.5 + U.rand(-0.2, 0.2)), this.h * (0.5 + U.rand(-0.15, 0.15)), 'verm', U.rand(120, 240), 0.4);
    Fx.shake(0.5 + dmg * 0.01);
    this.recoilP += 0.03;
    this.fovKick += 3;
    S.play('hurt');
    CT.UI.hurtFlash();
    if (navigator.vibrate) { try { navigator.vibrate(45); } catch (e) { } }
    if (p.hp <= 0) {
      p.hp = 0; this.run.hp = 0;
      this.gameOver(false);
    }
  };

  /* ---------------- Boss ---------------- */
  G.spawnBoss = function (final) {
    var fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    var dist = 14;
    var x = U.clamp(this.player.x + fx * dist, -20, 20);
    var z = U.clamp(this.player.z + fz * dist, -20, 20);
    var hp = final ? 1900 : 900;
    var e = {
      type: 'boss', isBoss: true, x: x, z: z, hp: hp, maxHp: hp, radius: 1.7, speed: final ? 1.7 : 1.3,
      dmg: 18, scale: 1.0, face: 0, flash: 0, stun: 0, kx: 0, kz: 0, age: 0, windup: 0, cd: 2,
      bob: 0, dead: false, final: !!final, phase: 'chase', phaseT: 0, slamCd: 2.8, summonCd: 6, enraged: false
    };
    this.enemies.push(e);
    this.boss = e;
    this.bossMesh.visible = true;
    this.bossMesh.position.set(x, 0, z);
    S.play('boss');
    Fx.shake(0.8);
    Fx.ring(x, z, CT.PAL.verm, 0.5, 8, 0.8);
    CT.UI.toast(final ? '终焉 · 墨渊巨像' : '潮心 · 墨渊巨像', final ? '杀掉它，给纸上色' : '盯住朱砂圈，闪出去', 'danger');
    CT.UI.boss(true, final ? '终焉 · 墨渊巨像' : '潮心 · 墨渊巨像', 1);
  };

  G.updateBoss = function (e, dt) {
    var p = this.player;
    e.slamCd -= dt; e.summonCd -= dt;
    var dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx, dz) || 0.001;
    e.face = Math.atan2(dx, dz);
    if (!e.enraged && e.hp < e.maxHp * 0.5) {
      e.enraged = true;
      e.speed *= 1.35;
      e.slamCd = 1.2;
      Fx.ring(e.x, e.z, CT.PAL.gold, 0.4, 7, 0.6);
      Fx.shake(0.7);
      CT.UI.toast('墨渊暴怒', '朱砂圈收得更快', 'danger');
      S.play('boss');
    }
    if (e.phase === 'chase') {
      if (d > 5.4) { e.x += dx / d * e.speed * dt; e.z += dz / d * e.speed * dt; }
      else if (d < 4.6) { e.x -= dx / d * 1.2 * dt; e.z -= dz / d * 1.2 * dt; }
      if (e.slamCd <= 0) {
        e.phase = 'slam'; e.phaseT = 0;
      } else if (e.summonCd <= 0) {
        e.summonCd = 9;
        var n = e.final ? 7 : 5;
        for (var i = 0; i < n; i++) {
          var a = i / n * 6.283;
          this.spawnEnemy('mote', e.x + Math.cos(a) * 3.5, e.z + Math.sin(a) * 3.5);
          Fx.splat(e.x + Math.cos(a) * 3.5, e.z + Math.sin(a) * 3.5, CT.PAL.verm, 4, 2, 0.8);
        }
        CT.UI.toast('墨渊吐息', '小墨兽从体内涌出', 'danger');
      }
      if (d < 4.6 && e.cd <= 0) { e.cd = 1.2; this.hurtPlayer(16); }
      e.cd -= dt;
    } else if (e.phase === 'slam') {
      e.phaseT += dt;
      var k = Math.min(1, e.phaseT / (e.enraged ? 0.78 : 1.0));
      var rr = 0.8 + k * 5.6;
      this.bossWarn.visible = true;
      this.bossWarn.position.set(e.x, 0.05, e.z);
      this.bossWarn.scale.set(rr * 2.35, rr * 2.35, 1);
      this.bossWarn.material.opacity = 0.45 + Math.sin(this.t * 22) * 0.2;
      this.bossWarn.rotation.z += dt * 0.4;
      if (k >= 1) {
        this.bossWarn.visible = false;
        e.phase = 'recover'; e.phaseT = 0;
        e.slamCd = e.enraged ? 2.2 : 3.4;
        Fx.ring(e.x, e.z, CT.PAL.verm, 0.6, 7.4, 0.6, { opacity: 1 });
        Fx.ring(e.x, e.z, CT.PAL.ink, 0.3, 4.8, 0.4);
        Fx.splat(e.x, e.z, CT.PAL.verm, 24, 5, 1);
        Fx.shake(1.0); Fx.hitstop(0.07);
        S.play('slam');
        if (Math.hypot(p.x - e.x, p.z - e.z) < 7.0) this.hurtPlayer(18);
      }
    } else if (e.phase === 'recover') {
      e.phaseT += dt;
      if (e.phaseT > 0.6) e.phase = 'chase';
    }
    e.bob += dt * 1.4;
    var shake = e.phase === 'slam' ? Math.sin(this.t * 40) * 0.04 : 0;
    this.bossMesh.position.set(e.x + shake, Math.sin(e.bob) * 0.04, e.z);
    this.bossMesh.rotation.y = e.face;
  };

  /* ---------------- 弹幕 / 拾取 / 刷新 ---------------- */
  G.updateOrbs = function (dt) {
    var p = this.player;
    for (var i = this.orbs.length - 1; i >= 0; i--) {
      var o = this.orbs[i];
      o.life -= dt;
      o.x += o.vx * dt; o.z += o.vz * dt;
      if (Math.hypot(p.x - o.x, p.z - o.z) < 0.8 && Math.abs(o.y - 1.2) < 1.2) {
        this.hurtPlayer(o.dmg);
        Fx.splat(o.x, o.z, CT.PAL.verm, 6, 2, 1);
        this.orbs.splice(i, 1); continue;
      }
      if (o.life <= 0) this.orbs.splice(i, 1);
    }
  };

  G.spawnGem = function (x, z, val) {
    if (this.gems.length >= 140) { this.addXp(val); return; }
    this.gems.push({ x: x, z: z, vx: U.rand(-1, 1), vz: U.rand(-1, 1), val: val, t: 0 });
  };
  G.updatePickups = function (dt) {
    var p = this.player;
    for (var i = this.gems.length - 1; i >= 0; i--) {
      var g = this.gems[i];
      g.t += dt;
      var dx = p.x - g.x, dz = p.z - g.z, d = Math.hypot(dx, dz) || 0.001;
      if (d < this.magnetR) {
        var sp = 10 + (this.magnetR - d) * 2;
        g.x += dx / d * sp * dt; g.z += dz / d * sp * dt;
      } else {
        g.x += g.vx * dt; g.z += g.vz * dt;
        g.vx *= Math.pow(0.08, dt); g.vz *= Math.pow(0.08, dt);
      }
      if (d < 0.9) {
        this.addXp(g.val);
        Fx.spark(g.x, 0.8, g.z, CT.PAL.gold, 4, 2);
        S.play('pickup');
        this.gems.splice(i, 1);
      }
    }
    for (var h = this.heals.length - 1; h >= 0; h--) {
      var he = this.heals[h];
      if (Math.hypot(p.x - he.x, p.z - he.z) < 1.1) {
        p.hp = Math.min(this.run.maxHp, p.hp + he.val);
        this.run.hp = p.hp;
        Fx.damage(p.x, 2.4, p.z, '+' + he.val, 'heal');
        Fx.spark(he.x, 1.2, he.z, CT.PAL.verm, 10, 3);
        S.play('heal');
        this.heals.splice(h, 1);
      }
    }
  };

  G.addXp = function (v) {
    var r = this.run;
    r.xp += v;
    while (r.xp >= r.need) {
      r.xp -= r.need;
      r.level++;
      r.need = 12 + (r.level - 1) * 4;
      r.pending++;
    }
    if (r.pending > 0 && this.state === 'playing') this.openLevelUp();
  };

  G.updateSpawner = function (dt) {
    var r = this.run;
    if (!this.bossSpawned18 && r.time >= 180) { this.spawnBoss(false); this.bossSpawned18 = true; }
    if (!this.bossSpawned36 && r.time >= 360 && !this.boss) { this.spawnBoss(true); this.bossSpawned36 = true; }
    this.waveT -= dt;
    if (this.waveT <= 0) {
      this.waveT = Math.max(24, 40 - r.time / 50);
      var n = Math.min(10, 3 + Math.floor(r.time / 55));
      var base = Math.random() * 6.283;
      for (var i = 0; i < n; i++) {
        var a = base + (i / n) * 1.4;
        var sp = this.spawnPoint(a, U.rand(16, 22));
        this.spawnEnemy(this.pickType(), sp.x, sp.z);
      }
      S.play('wave');
      CT.UI.toast('潮涌', '第 ' + (++this.waveCount) + ' 波', 'cool');
    }
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = 1 / (0.45 + r.time * 0.010);
      if (this.enemies.length < 34) {
        var sp2 = this.spawnPoint(Math.random() * 6.283, U.rand(16, 23));
        this.spawnEnemy(this.pickType(), sp2.x, sp2.z);
      }
    }
  };
  G.pickType = function () {
    var t = this.run.time, r = Math.random();
    if (t > 150 && r < 0.12) return 'spitter';
    if (t > 70 && r < 0.24) return 'brute';
    if (t > 25 && r < 0.58) return 'darter';
    return 'mote';
  };

  /* ---------------- 升级 ---------------- */
  G.rollCards = function () {
    var p = this.run.passives, pool = [];
    Object.keys(UPGRADES).forEach(function (k) { if (p[k] < UPGRADES[k].max) pool.push(k); });
    var cards = [];
    while (cards.length < 3 && pool.length) cards.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]);
    while (cards.length < 3) cards.push('heal');
    return cards.map(function (id) {
      if (id === 'heal') return { id: 'heal', name: '回墨', color: '#B23A2A', icon: 'heal', desc: '回复 30 生命', lvl: 0, max: 0, kind: 'heal' };
      var d = UPGRADES[id];
      return { id: id, name: d.name, color: d.color, icon: d.icon, desc: d.desc, lvl: p[id] + 1, max: d.max, kind: 'passive' };
    });
  };
  G.openLevelUp = function () {
    this.state = 'levelup';
    this.exitLock();
    S.play('level');
    var cards = this.rollCards(), self = this;
    CT.UI.showLevelUp(cards, function (id) { self.applyUpgrade(id); });
  };
  G.applyUpgrade = function (id) {
    var r = this.run;
    if (id === 'heal') {
      this.player.hp = Math.min(r.maxHp, this.player.hp + 30);
    } else {
      r.passives[id]++;
      if (id === 'vigor') this.player.hp = Math.min(r.maxHp, this.player.hp + 20);
    }
    r.pending--;
    this.applyStats();
    r.hp = this.player.hp;
    CT.UI.updateHud(r);
    if (r.pending > 0) { CT.UI.hideLevelUp(); this.openLevelUp(); }
    else this.resume();
  };

  /* ---------------- 相机 / 渲染 ---------------- */
  G.updateCamera = function (dt) {
    var p = this.player;
    var bobY = Math.sin(this.bob * 7.2) * 0.026 * Math.min(1, this.moveSpeed / 5) + Math.sin(this.t * 1.4) * 0.006;
    var bobX = Math.cos(this.bob * 3.6) * 0.018 * Math.min(1, this.moveSpeed / 5);
    var sh = Fx.shakeAmt;
    var rx = (Math.random() - 0.5) * sh * 0.035;
    var ry = (Math.random() - 0.5) * sh * 0.035;
    var kick = this.camKick || 0;
    this.camKick = Math.max(0, kick - dt * 1.8);
    this.camera.position.set(p.x + bobX - (-Math.sin(this.yaw)) * kick, 1.64 + bobY, p.z - (-Math.cos(this.yaw)) * kick);
    this.camera.rotation.set(
      this.pitch + this.recoilP + rx,
      this.yaw + this.recoilY + ry,
      this.roll + Math.sin(this.bob * 3.6) * 0.006,
      'YXZ'
    );
    var targetFov = 80 + this.fovKick + (this.player.dashT > 0 ? 6 : 0);
    this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 14);
    this.camera.updateProjectionMatrix();
  };

  G.updateWeapon = function (dt) {
    var w = this.weaponEl;
    if (!w) return;
    var a = this.attackState, h = this.heavyState;
    var x = 0, y = 0, rot = -2, sc = 1;
    if (h.active) {
      var hp = Math.min(1, h.t / 0.6);
      rot = -2 - hp * 360;
      x = -6 * Math.sin(hp * 6.283);
      y = 6 * Math.cos(hp * 6.283);
      sc = 1 + 0.05 * Math.sin(hp * 3.14);
    } else if (a.active) {
      var d = ATTACKS[a.i];
      var total = d.dur * this.hasteMul;
      var ph = Math.min(1, a.t / total);
      var wf = d.wind / total, hf = (d.wind + 0.05) / total;
      if (ph < wf) {
        var k = U.smooth(0, 1, ph / Math.max(0.01, wf));
        x = 6 * k; y = 7 * k; rot = -2 + (a.i === 2 ? 5 : 10) * k; sc = 1 - 0.02 * k;
      } else if (ph < hf) {
        var k2 = (ph - wf) / Math.max(0.01, hf - wf);
        var e = 1 - Math.pow(1 - k2, 3);
        if (a.i === 2) {
          x = 6 - 12 * e; y = 7 - 14 * e; rot = -2 + 3 * e; sc = 1 + 0.05 * e;
        } else {
          var sg = a.i === 0 ? 1 : -1;
          x = 6 - 14 * e; y = 7 - 10 * e; rot = -2 + (10 - 26 * e) * sg; sc = 1 + 0.02 * e;
        }
      } else {
        var k3 = (ph - hf) / Math.max(0.01, 1 - hf);
        var e2 = 1 - Math.pow(1 - k3, 2);
        if (a.i === 2) {
          x = -8 * (1 - e2); y = -10 * (1 - e2); rot = 1 * (1 - e2); sc = 1 + 0.05 * (1 - e2);
        } else {
          var sg2 = a.i === 0 ? 1 : -1;
          x = -12 * sg2 * (1 - e2); y = -5 * (1 - e2); rot = -18 * sg2 * (1 - e2); sc = 1 + 0.02 * (1 - e2);
        }
      }
    } else {
      var sp = Math.min(1, (this.moveSpeed || 0) / 5);
      x += Math.sin(this.bob * 3.6) * 1.2;
      y += Math.sin(this.bob * 7.2) * 1.4 * (0.3 + sp * 0.7);
      rot += Math.sin(this.bob * 1.8) * 0.7;
    }
    if (Fx.shakeAmt > 0.15) {
      x += (Math.random() - 0.5) * Fx.shakeAmt * 2.2;
      y += (Math.random() - 0.5) * Fx.shakeAmt * 2.2;
    }
    w.style.transform = 'translate(' + x.toFixed(2) + '%, ' + y.toFixed(2) + '%) rotate(' + rot.toFixed(2) + 'deg) scale(' + sc.toFixed(3) + ')';
  };

  G.sync = function () {
    var dummy = this._dummy || (this._dummy = new T.Object3D());
    var col = this._col || (this._col = new T.Color());
    var counts = { mote: 0, darter: 0, brute: 0, spitter: 0 };
    var i;
    for (i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i];
      if (e.dead) continue;
      if (e.isBoss) {
        this.bossMesh.visible = true;
        this.bossMesh.position.set(e.x, 0, e.z);
        this.bossMesh.rotation.y = e.face;
        var bf = Math.min(1, e.flash);
        this.bossMesh.scale.setScalar(0.95 + bf * 0.03);
        continue;
      }
      var scale = e.scale * (e.age < 0.25 ? 0.5 + e.age * 2 : 1);
      var wind = e.windup > 0 ? Math.sin(e.windup * 18) * 0.06 : 0;
      dummy.position.set(e.x, Math.sin(e.bob) * 0.03 + wind, e.z);
      dummy.rotation.set(0, e.face, wind * 0.8);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      var m = this.enemyMeshes[e.type];
      var idx = counts[e.type]++;
      if (idx < this.caps[e.type]) {
        m.setMatrixAt(idx, dummy.matrix);
        var f = Math.min(1, e.flash);
        var w = e.windup > 0 ? 0.4 : 0;
        col.setRGB(1 + f * 2.6 + w, 1 + f * 2.2 + w * 0.5, 1 + f * 1.6);
        m.setColorAt(idx, col);
      }
    }
    var self = this;
    Object.keys(this.enemyMeshes).forEach(function (k) {
      var mesh = self.enemyMeshes[k];
      mesh.count = Math.min(counts[k], self.caps[k]);
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
    if (!this.boss) this.bossMesh.visible = false;

    // 影子
    var n = 0, sd = dummy;
    for (i = 0; i < this.enemies.length; i++) {
      var en = this.enemies[i];
      if (en.dead || n >= 89) continue;
      sd.position.set(en.x, 0.015, en.z);
      sd.rotation.set(-Math.PI / 2, 0, 0);
      var sr = en.isBoss ? 2.6 : en.radius * 1.5;
      sd.scale.set(sr * 2.2, sr * 2.2, 1);
      sd.updateMatrix();
      this.shadowPool.setMatrixAt(n++, sd.matrix);
    }
    this.shadowPool.count = n;
    this.shadowPool.instanceMatrix.needsUpdate = true;

    // 颜料
    var gi = 0;
    for (i = 0; i < this.gems.length && gi < 140; i++) {
      var g = this.gems[i];
      sd.position.set(g.x, 0.42 + Math.sin(this.t * 4 + i) * 0.1, g.z);
      sd.rotation.set(0, this.t * 2.5 + i, 0);
      sd.scale.setScalar(1);
      sd.updateMatrix();
      this.gemMesh.setMatrixAt(gi++, sd.matrix);
    }
    this.gemMesh.count = gi; this.gemMesh.instanceMatrix.needsUpdate = true;
    var hi = 0;
    for (i = 0; i < this.heals.length && hi < 5; i++) {
      var he = this.heals[i];
      sd.position.set(he.x, 0.45 + Math.sin(this.t * 3 + i) * 0.08, he.z);
      sd.rotation.set(0, this.t * 2, 0);
      sd.scale.setScalar(1);
      sd.updateMatrix();
      this.healMesh.setMatrixAt(hi++, sd.matrix);
    }
    this.healMesh.count = hi; this.healMesh.instanceMatrix.needsUpdate = true;
    var oi = 0;
    for (i = 0; i < this.orbs.length && oi < 24; i++) {
      var o = this.orbs[i];
      sd.position.set(o.x, o.y + Math.sin(this.t * 6 + i) * 0.1, o.z);
      sd.rotation.set(0, this.t * 5, 0);
      sd.scale.setScalar(1);
      sd.updateMatrix();
      this.orbMesh.setMatrixAt(oi++, sd.matrix);
    }
    this.orbMesh.count = oi; this.orbMesh.instanceMatrix.needsUpdate = true;
  };

  /* ---------------- 主循环 ---------------- */
  G.loop = function (ts) {
    requestAnimationFrame(this.loop.bind(this));
    var dt = Math.min(0.05, (ts - (this.lastTs || ts)) / 1000);
    this.lastTs = ts;
    this.t += dt;
    if (this.state === 'playing') {
      var wdt = dt;
      if (Fx.stop > 0) { Fx.stop -= dt; wdt *= 0.06; }
      if (this.slow > 0) { this.slow -= dt; wdt *= 0.32; }
      this.update(wdt, dt);
    } else if (this.state === 'title') {
      this.updateTitle(dt);
    } else if (this.state === 'dead' || this.state === 'win') {
      Fx.update(dt);
      this.updateCamera(dt);
    }
    if (this.state === 'title') this.updateTitleCamera(dt);
    this.renderer.render(this.scene, this.camera);
    if (this.state === 'paused' || this.state === 'levelup') Fx.drawOverlay(this.camera, 0);
    else Fx.drawOverlay(this.camera, dt);
  };

  G.update = function (dt, rawDt) {
    var r = this.run;
    r.time += dt;
    this.updatePlayer(dt);
    this.updateAttack(dt);
    this.updateHeavy(dt);
    this.updateEnemies(dt);
    if (this.boss && !this.boss.dead) this.updateBoss(this.boss, dt);
    this.updateOrbs(dt);
    this.updatePickups(dt);
    this.updateSpawner(dt);
    this.updateWeapon(dt);
    this.updateCamera(dt);
    Fx.update(dt);
    this.sync();
    if (r.comboT > 0) {
      r.comboT -= dt;
      if (r.comboT <= 0) { r.combo = 0; CT.UI.combo(0); }
    }
    this.hudT += rawDt;
    if (this.hudT > 0.08) { this.hudT = 0; r.hp = this.player.hp; CT.UI.updateHud(r); this.updateBossBar(); }
    CT.UI.updateActions(this.player.dashCd / 2.5, r.ult / 100, this.player.heavyCd / Math.max(1, this.heavyCd));
    if (this.winT > 0) {
      this.winT -= rawDt;
      if (this.winT <= 0) this.gameOver(true);
    }
  };

  G.updateBossBar = function () {
    if (this.boss && !this.boss.dead) CT.UI.boss(true, this.boss.final ? '终焉 · 墨渊巨像' : '潮心 · 墨渊巨像', this.boss.hp / this.boss.maxHp);
    else if (!this.boss) CT.UI.boss(false);
  };

  G.updateTitle = function (dt) {
    this.updateCameraTitle(0);
  };

  G.updateTitleCamera = function (dt) {
    var t = this.t;
    this.camera.position.set(Math.sin(t * 0.08) * 2.2, 1.72, 6.4);
    this.camera.rotation.set(0.015 + Math.sin(t * 0.2) * 0.01, 0.08 + Math.sin(t * 0.11) * 0.06, 0, 'YXZ');
    this.camera.fov = 72;
    this.camera.updateProjectionMatrix();
  };

  G.updateCameraTitle = function () { };
})(window.CT);
