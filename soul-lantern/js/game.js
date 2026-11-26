/* 彩潮 · 主循环：世界 / 玩家 / 武器 / 敌人 / 波次 / 升级 / 镜头 */
'use strict';
(function (CT) {
  var T = THREE, U = CT.U, Fx = CT.Fx, S = CT.Sound;
  var G = CT.Game = {
    state: 'boot', run: null, enemies: [], pickups: [], orbs: [], drops: [],
    input: { x: 0, z: 0 }, keys: {}, boss: null,
    t: 0, shakeOffset: new T.Vector3(), camBase: new T.Vector3(0, 13.1, 12.2),
    camDist: 1, slow: 0, hudT: 0, bossWarn: null
  };

  var CAPS = { mote: 80, darter: 60, brute: 28, spitter: 22 };
  var ETYPE = {
    mote: { hp: 14, speed: 2.25, radius: 0.44, dmg: 4, xp: 1, scale: 1.45, name: '墨蚜' },
    darter: { hp: 10, speed: 3.55, radius: 0.32, dmg: 4, xp: 1, scale: 1.24, name: '疾笔' },
    brute: { hp: 68, speed: 1.55, radius: 0.68, dmg: 9, xp: 4, scale: 1.16, name: '砚龟' },
    spitter: { hp: 28, speed: 1.85, radius: 0.44, dmg: 5, xp: 3, scale: 1.14, name: '泼墨者' }
  };

  var UPGRADES = {
    blade: { kind: 'weapon', max: 5, name: '笔锋回旋', color: '#D24B33', icon: 'blade',
      desc: function (l) { return l === 1 ? '三枚笔锋环绕切割' : (l % 2 ? '笔锋 +1，伤害 +18%' : '轨道变宽，转速 +12%'); } },
    nova: { kind: 'weapon', max: 5, name: '墨爆', color: '#D08A54', icon: 'nova',
      desc: function (l) { return l === 1 ? '周期性向四周炸开墨浪' : '范围 +12%，伤害 +16%'; } },
    chain: { kind: 'weapon', max: 5, name: '雷链', color: '#86B7C9', icon: 'chain',
      desc: function (l) { return l === 1 ? '天雷在敌群间连锁' : '弹跳 +1，伤害 +15%'; } },
    rain: { kind: 'weapon', max: 5, name: '墨雨', color: '#A4576F', icon: 'rain',
      desc: function (l) { return l === 1 ? '墨滴自天而落，砸出颜料' : '+1 滴，落点范围 +10%'; } },
    speed: { kind: 'passive', max: 5, name: '疾行', color: '#8E9B55', icon: 'speed',
      desc: function () { return '移动速度 +7%'; } },
    vigor: { kind: 'passive', max: 5, name: '厚涂', color: '#C85C6A', icon: 'heart',
      desc: function () { return '生命上限 +18，并回复 18'; } },
    magnet: { kind: 'passive', max: 5, name: '引彩', color: '#E8BE74', icon: 'magnet',
      desc: function () { return '颜料吸取范围 +30%'; } },
    edge: { kind: 'passive', max: 5, name: '锋锐', color: '#F2E8D5', icon: 'edge',
      desc: function () { return '全部伤害 +12%'; } },
    haste: { kind: 'passive', max: 5, name: '疾攻', color: '#86B7C9', icon: 'haste',
      desc: function () { return '武器冷却 -8%'; } }
  };

  /* ---------------- 启动 ---------------- */
  G.boot = function () {
    var canvas = document.getElementById('gl');
    var r;
    try {
      r = new T.WebGLRenderer({ canvas: canvas, antialias: false, powerPreference: 'high-performance' });
    } catch (e) {
      throw new Error('需要支持 WebGL 的浏览器');
    }
    this.renderer = r;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.setSize(window.innerWidth, window.innerHeight);
    r.outputEncoding = T.LinearEncoding;
    r.toneMapping = T.NoToneMapping;
    r.setClearColor(CT.LIGHT.fog, 1);
    this.scene = new T.Scene();
    this.scene.fog = new T.Fog(CT.LIGHT.fog, CT.LIGHT.fogNear, CT.LIGHT.fogFar);
    this.camera = new T.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 300);
    this.camera.position.copy(this.camBase);
    this.camera.lookAt(0, 0, 0);

    this.buildWorld();
    this.buildPlayer();
    this.buildEnemies();
    this.buildPickups();
    this.buildBoss();

    Fx.init(this.scene, this.camera, document.getElementById('fx2d'));
    this.onResize();
    CT.UI.init(this);
    this.bindInput();
    this.run = this.newRun();
    this.state = 'title';
    CT.UI.showTitle(this.loadSave());
    requestAnimationFrame(this.loop.bind(this));
  };

  G.newRun = function () {
    var w = this.weapons = {
      blade: { lvl: 0 }, nova: { lvl: 0 }, chain: { lvl: 0 }, rain: { lvl: 0 }
    };
    w.blade.lvl = 1;
    return {
      time: 0, kills: 0, level: 1, xp: 0, need: 12, hp: 100, maxHp: 100,
      weapons: w, passives: { speed: 0, vigor: 0, magnet: 0, edge: 0, haste: 0 },
      pending: 0, combo: 0, comboT: 0, ult: 0, bestCombo: 0,
      bossDone: 0, boss: null, elapsed: 0, dmgDealt: 0
    };
  };

  /* ---------------- 世界 ---------------- */
  G.buildWorld = function () {
    var gt = CT.TEX.ground();
    var gm = new T.MeshBasicMaterial({ map: gt, color: 0xffffff, fog: true });
    this.ground = new T.Mesh(new T.PlaneGeometry(240, 240), gm);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = 0;
    this.scene.add(this.ground);

    // 草簇
    var gGeo = CT.geo.grass();
    var gMat = CT.mat.toon({ sway: true, rim: 0.05, edge: 0.1, amb: 0.26, side: T.DoubleSide });
    var N = 320;
    this.grass = new T.InstancedMesh(gGeo, gMat, N);
    this.grass.frustumCulled = false;
    this.grass.instanceMatrix.setUsage(T.DynamicDrawUsage);
    this.grassProps = [];
    var dummy = new T.Object3D();
    for (var i = 0; i < N; i++) {
      var a = Math.random() * 6.283, d = U.rand(6, 28);
      this.grassProps.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, s: U.rand(0.7, 1.5), r: Math.random() * 6.283 });
      dummy.position.set(this.grassProps[i].x, 0, this.grassProps[i].z);
      dummy.rotation.set(0, this.grassProps[i].r, 0);
      dummy.scale.setScalar(this.grassProps[i].s);
      dummy.updateMatrix();
      this.grass.setMatrixAt(i, dummy.matrix);
      this.grass.setColorAt(i, new T.Color().setHSL(0.18 + Math.random() * 0.06, 0.3, 0.45 + Math.random() * 0.15));
    }
    this.grass.instanceMatrix.needsUpdate = true;
    this.grass.instanceColor.needsUpdate = true;
    this.scene.add(this.grass);

    // 石块
    var rGeo = CT.geo.rock();
    this.rocks = new T.InstancedMesh(rGeo, CT.mat.toon({ rim: 0.12, edge: 0.2, amb: 0.16 }), 54);
    this.rocks.frustumCulled = false;
    this.rockProps = [];
    for (var k = 0; k < 54; k++) {
      var aa = Math.random() * 6.283, dd = U.rand(7, 27);
      var p = { x: Math.cos(aa) * dd, z: Math.sin(aa) * dd, s: U.rand(0.5, 1.35), r: Math.random() * 6.283 };
      this.rockProps.push(p);
      dummy.position.set(p.x, 0, p.z);
      dummy.rotation.set(0, p.r, 0);
      dummy.scale.set(p.s, p.s * U.rand(0.6, 0.9), p.s);
      dummy.updateMatrix();
      this.rocks.setMatrixAt(k, dummy.matrix);
      this.rocks.setColorAt(k, new T.Color().setHSL(0.55, 0.12, 0.5 + Math.random() * 0.12));
    }
    this.rocks.instanceMatrix.needsUpdate = true;
    this.rocks.instanceColor.needsUpdate = true;
    this.scene.add(this.rocks);

    // 墨碑（竖向地标，给俯视镜头高度）
    this.stones = new T.InstancedMesh(CT.geo.stone(), CT.mat.toon({ rim: 0.16, edge: 0.24, amb: 0.14 }), 12);
    this.stones.frustumCulled = false;
    this.stoneProps = [];
    for (var st = 0; st < 12; st++) {
      var sa = Math.random() * 6.283, sdd = U.rand(10, 30);
      var sp = { x: Math.cos(sa) * sdd, z: Math.sin(sa) * sdd, s: U.rand(0.8, 1.5), r: Math.random() * 6.283 };
      this.stoneProps.push(sp);
      dummy.position.set(sp.x, 0, sp.z);
      dummy.rotation.set(0, sp.r, 0);
      dummy.scale.set(sp.s, sp.s, sp.s);
      dummy.updateMatrix();
      this.stones.setMatrixAt(st, dummy.matrix);
      this.stones.setColorAt(st, new T.Color().setHSL(0.55, 0.1, 0.5 + Math.random() * 0.1));
    }
    this.stones.instanceMatrix.needsUpdate = true;
    this.stones.instanceColor.needsUpdate = true;
    this.scene.add(this.stones);

    // 枯笔树
    this.trees = new T.InstancedMesh(CT.geo.tree(), CT.mat.toon({ rim: 0.14, edge: 0.24, amb: 0.12 }), 12);
    this.trees.frustumCulled = false;
    this.treeProps = [];
    for (var tr = 0; tr < 12; tr++) {
      var ta = Math.random() * 6.283, tdd = U.rand(12, 30);
      var tp = { x: Math.cos(ta) * tdd, z: Math.sin(ta) * tdd, s: U.rand(0.8, 1.3), r: Math.random() * 6.283 };
      this.treeProps.push(tp);
      dummy.position.set(tp.x, 0, tp.z);
      dummy.rotation.set(0, tp.r, 0);
      dummy.scale.set(tp.s, tp.s, tp.s);
      dummy.updateMatrix();
      this.trees.setMatrixAt(tr, dummy.matrix);
      this.trees.setColorAt(tr, new T.Color().setHSL(0.42, 0.16, 0.46 + Math.random() * 0.1));
    }
    this.trees.instanceMatrix.needsUpdate = true;
    this.trees.instanceColor.needsUpdate = true;
    this.scene.add(this.trees);

    // 影子池
    var sm = CT.mat.shadow();
    var sGeo = CT.geo.plane();
    this.shadowPool = new T.InstancedMesh(sGeo, sm, 200);
    this.shadowPool.frustumCulled = false;
    this.shadowPool.instanceMatrix.setUsage(T.DynamicDrawUsage);
    this.shadowPool.renderOrder = 1;
    this.scene.add(this.shadowPool);

    // 笔锋轨迹
    this.trail = new T.Mesh(new T.PlaneGeometry(1, 1), CT.mat.add({
      map: CT.TEX.arc(), color: 0xE8BE74, opacity: 0.34
    }));
    this.trail.rotation.x = -Math.PI / 2;
    this.trail.position.y = 0.04;
    this.trail.renderOrder = 3;
    this.scene.add(this.trail);

    // 玩家暖光池
    this.warmPool = new T.Mesh(new T.PlaneGeometry(1, 1), CT.mat.add({
      map: CT.TEX.ring(), color: 0xFFD7A6, opacity: 0.16
    }));
    this.warmPool.rotation.x = -Math.PI / 2;
    this.warmPool.position.y = 0.03;
    this.warmPool.scale.set(4.2, 4.2, 1);
    this.warmPool.renderOrder = 2;
    this.scene.add(this.warmPool);
  };

  G.buildPlayer = function () {
    var mat = CT.mat.toon({ rim: 0.34, edge: 0.26 });
    this.playerMesh = new T.Mesh(CT.geo.player(), mat);
    this.playerMesh.scale.setScalar(1.12);
    this.scene.add(this.playerMesh);
    this.hatMesh = new T.Mesh(CT.geo.hat(), mat);
    this.hatMesh.position.set(0, 1.925, -0.02);
    this.hatMesh.rotation.x = -0.30;
    this.playerMesh.add(this.hatMesh);
    this.ghosts = [];
    var gm = new T.MeshBasicMaterial({ color: 0xF2E8D5, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending });
    for (var i = 0; i < 3; i++) {
      var m = new T.Mesh(CT.geo.player(), gm.clone());
      m.visible = false;
      this.scene.add(m);
      this.ghosts.push({ mesh: m, t: 0 });
    }
    // 笔锋
    this.blades = [];
    var bgeo = CT.geo.blade();
    var bmat = new T.MeshBasicMaterial({ vertexColors: true });
    for (var b = 0; b < 6; b++) {
      var bm = new T.Mesh(bgeo, bmat);
      bm.visible = false;
      this.scene.add(bm);
      this.blades.push(bm);
    }
    this.player = { x: 0, z: 0, vx: 0, vz: 0, face: 0, hp: 100, iframe: 0, dashCd: 0, dashT: 0, dashX: 0, dashZ: 0, bob: 0, dead: false };
    this.gemMesh = null;
  };

  G.buildEnemies = function () {
    this.enemyMeshes = {};
    var defs = { mote: CT.geo.mote, darter: CT.geo.darter, brute: CT.geo.brute, spitter: CT.geo.spitter };
    var mat = CT.mat.toon({ rim: 0.28, edge: 0.3, amb: 0.16 });
    Object.keys(defs).forEach(function (k) {
      var geo = defs[k]();
      var mesh = new T.InstancedMesh(geo, mat, CAPS[k]);
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
      mesh.frustumCulled = false;
      for (var i = 0; i < CAPS[k]; i++) mesh.setColorAt(i, new T.Color(1, 1, 1));
      mesh.instanceColor.setUsage(T.DynamicDrawUsage);
      mesh.count = 0;
      G.scene.add(mesh);
      G.enemyMeshes[k] = mesh;
    });
  };

  G.buildPickups = function () {
    var gemGeo = CT.geo.gem();
    this.gemMesh = new T.InstancedMesh(gemGeo, new T.MeshBasicMaterial({ vertexColors: true, fog: true }), 220);
    this.gemMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    this.gemMesh.frustumCulled = false;
    this.gemMesh.count = 0;
    this.scene.add(this.gemMesh);

    var healGeo = CT.geo.heal();
    this.healMesh = new T.InstancedMesh(healGeo, new T.MeshBasicMaterial({ vertexColors: true, fog: true }), 6);
    this.healMesh.frustumCulled = false;
    this.healMesh.count = 0;
    this.scene.add(this.healMesh);

    var orbGeo = new T.IcosahedronGeometry(0.16, 0);
    this.orbMesh = new T.InstancedMesh(orbGeo, new T.MeshBasicMaterial({ color: 0xA4576F, fog: false }), 40);
    this.orbMesh.frustumCulled = false;
    this.orbMesh.count = 0;
    this.scene.add(this.orbMesh);

    var dropGeo = new T.ConeGeometry(0.11, 0.42, 5);
    this.dropMesh = new T.InstancedMesh(dropGeo, new T.MeshBasicMaterial({ color: 0xE8BE74, fog: false }), 30);
    this.dropMesh.frustumCulled = false;
    this.dropMesh.count = 0;
    this.scene.add(this.dropMesh);
  };

  G.buildBoss = function () {
    this.bossMesh = new T.Mesh(CT.geo.boss(), CT.mat.toon({ rim: 0.4, edge: 0.24 }));
    this.bossMesh.visible = false;
    this.scene.add(this.bossMesh);
    this.bossWarn = new T.Mesh(new T.PlaneGeometry(1, 1), CT.mat.add({
      map: CT.TEX.ring(), color: 0xD24B33, opacity: 0.9
    }));
    this.bossWarn.rotation.x = -Math.PI / 2;
    this.bossWarn.position.y = 0.06;
    this.bossWarn.visible = false;
    this.bossWarn.renderOrder = 3;
    this.scene.add(this.bossWarn);
  };

  /* ---------------- 输入 ---------------- */
  G.bindInput = function () {
    var self = this;
    window.addEventListener('resize', function () { self.onResize(); });
    window.addEventListener('keydown', function (e) {
      self.keys[e.code] = true;
      if (e.code === 'Escape' || e.code === 'KeyP') self.togglePause();
      if (e.code === 'Space') { e.preventDefault(); self.tryDash(); }
      if (e.code === 'KeyQ') self.tryUlt();
      if (self.state === 'levelup' && /^Digit[1-3]$/.test(e.code)) CT.UI.pickByKey(+e.code.slice(5) - 1);
    });
    window.addEventListener('keyup', function (e) { self.keys[e.code] = false; });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && self.state === 'playing') self.pause();
    });
  };

  G.readKeyboard = function () {
    var x = 0, z = 0;
    if (this.keys.KeyA || this.keys.ArrowLeft) x -= 1;
    if (this.keys.KeyD || this.keys.ArrowRight) x += 1;
    if (this.keys.KeyW || this.keys.ArrowUp) z -= 1;
    if (this.keys.KeyS || this.keys.ArrowDown) z += 1;
    return { x: x, z: z };
  };

  G.onResize = function () {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(dpr);
    Fx.setViewport(window.innerWidth, window.innerHeight, dpr);
  };

  /* ---------------- 存档 ---------------- */
  G.loadSave = function () {
    try {
      var raw = localStorage.getItem('chromatide.save.v1');
      if (!raw) return { bestKills: 0, bestTime: 0, runs: 0, sound: true, bestCombo: 0 };
      var s = JSON.parse(raw);
      return {
        bestKills: s.bestKills || 0, bestTime: s.bestTime || 0, runs: s.runs || 0,
        sound: s.sound !== false, bestCombo: s.bestCombo || 0
      };
    } catch (e) { return { bestKills: 0, bestTime: 0, runs: 0, sound: true, bestCombo: 0 }; }
  };
  G.saveGame = function (d) {
    try { localStorage.setItem('chromatide.save.v1', JSON.stringify(d)); } catch (e) { }
  };

  /* ---------------- 开局 / 结束 ---------------- */
  G.startRun = function () {
    S.resume();
    if (CT.UI.save.sound === false) S.setMuted(true); else S.setMuted(false);
    S.startAmbient();
    this.run = this.newRun();
    this.enemies.length = 0;
    this.pickups.length = 0;
    this.orbs.length = 0;
    this.drops.length = 0;
    this.boss = null;
    this.run.boss = null;
    this.bossMesh.visible = false;
    this.bossWarn.visible = false;
    this.player.x = 0; this.player.z = 0; this.player.vx = 0; this.player.vz = 0;
    this.player.hp = this.run.maxHp; this.player.iframe = 0; this.player.dashCd = 0; this.player.dashT = 0;
    this.player.dead = false;
    this.playerMesh.position.set(0, 0, 0);
    this.playerMesh.visible = true;
    this.clearBattleVisuals();
    this.camDist = 1; this.slow = 0;
    this.t = 0; this.spawnT = 0.8; this.waveT = 26; this.healKills = 0;
    this.waveCount = 0; this.bossKilled = 0; this.winT = 0;
    this.spawnBossed18 = false; this.spawnBossed36 = false;
    this.novaT = 1.2; this.chainT = 1.6; this.rainT = 1.4; this.hudT = 0;
    Fx.reset();
    this.updateBladeCount();
    this.applyStats();
    for (var i = 0; i < this.ghosts.length; i++) { this.ghosts[i].mesh.visible = false; }
    for (var oi = 0; oi < 9; oi++) {
      var oa = oi / 9 * 6.283 + Math.random() * 0.4;
      var od = U.rand(10, 14);
      var oe = this.spawnEnemy('mote', Math.cos(oa) * od, Math.sin(oa) * od);
      if (oe) oe.age = 0.12;
    }
    this.spawnT = 1.2;
    CT.UI.beginRun();
    CT.UI.updateHud(this.run);
    this.state = 'playing';
  };

  G.pause = function () {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    CT.UI.showPause(this.run);
  };
  G.resume = function () {
    if (this.state !== 'paused' && this.state !== 'levelup') return;
    this.state = 'playing';
    CT.UI.hideAll();
    S.resume();
  };
  G.togglePause = function () {
    if (this.state === 'playing') this.pause();
    else if (this.state === 'paused') this.resume();
  };

  G.clearBattleVisuals = function () {
    var self = this;
    Object.keys(this.enemyMeshes || {}).forEach(function (k) { self.enemyMeshes[k].count = 0; });
    if (this.gemMesh) this.gemMesh.count = 0;
    if (this.healMesh) this.healMesh.count = 0;
    if (this.orbMesh) this.orbMesh.count = 0;
    if (this.dropMesh) this.dropMesh.count = 0;
    if (this.shadowPool) this.shadowPool.count = 0;
    if (this.bossMesh) this.bossMesh.visible = false;
    if (this.bossWarn) this.bossWarn.visible = false;
    if (this.trail) this.trail.visible = false;
    if (this.blades) this.blades.forEach(function (b) { b.visible = false; });
  };

  G.toTitle = function () {
    this.state = 'title';
    this.enemies.length = 0;
    this.pickups.length = 0;
    this.orbs.length = 0;
    this.drops.length = 0;
    this.boss = null;
    this.bossMesh.visible = false;
    this.bossWarn.visible = false;
    this.clearBattleVisuals();
    this.player.hp = 100;
    this.player.x = 0; this.player.z = 0;
    this.playerMesh.visible = true;
    this.camera.position.copy(this.camBase);
    S.stopAmbient();
    Fx.reset();
    CT.UI.hideAll();
    CT.UI.showTitle(this.loadSave());
  };

  G.gameOver = function (win) {
    if (this.state === 'dead' || this.state === 'win') return;
    this.state = win ? 'win' : 'dead';
    this.player.dead = !win;
    this.run.elapsed = this.run.time;
    S.stopAmbient();
    S.play(win ? 'win' : 'lose');
    var sv = this.loadSave();
    sv.runs = (sv.runs || 0) + 1;
    if (this.run.kills > (sv.bestKills || 0)) sv.bestKills = this.run.kills;
    if (this.run.time > (sv.bestTime || 0)) sv.bestTime = this.run.time;
    if (this.run.bestCombo > (sv.bestCombo || 0)) sv.bestCombo = this.run.bestCombo;
    this.saveGame(sv);
    this.run.resultWin = !!win;
    CT.UI.showEnd(this.run, sv, win);
  };

  /* ---------------- 属性派生 ---------------- */
  G.applyStats = function () {
    var r = this.run, w = r.weapons;
    var p = r.passives;
    r.maxHp = 100 + p.vigor * 18;
    this.player.hp = Math.min(this.player.hp, r.maxHp);
    this.speed = 6.3 * (1 + p.speed * 0.07);
    this.dmgMul = 1 + p.edge * 0.12;
    this.magnetR = 3.7 * (1 + p.magnet * 0.30);
    this.hasteMul = 1 / (1 + p.haste * 0.08);
    // 笔锋参数
    var bl = w.blade.lvl;
    this.bladeCount = Math.min(6, 2 + bl);
    this.bladeRadius = 2.2 + Math.floor((bl - 1) / 2) * 0.22;
    this.bladeDmg = 9 + (bl - 1) * 3.4;
    this.bladeSpin = 2.35 * (1 + (bl - 1) * 0.04);
    // 墨爆
    var no = w.nova.lvl;
    this.novaCd = 3.6 * Math.pow(0.92, Math.max(0, no - 1));
    this.novaDmg = 20 + (no - 1) * 7;
    this.novaR = 3.3 + (no - 1) * 0.35;
    // 雷链
    var ch = w.chain.lvl;
    this.chainCd = 3.2 * Math.pow(0.93, Math.max(0, ch - 1));
    this.chainDmg = 15 + (ch - 1) * 5;
    this.chainN = 3 + Math.floor(Math.max(0, ch - 1) / 2) * 1 + (ch > 1 ? 1 : 0);
    // 墨雨
    var ra = w.rain.lvl;
    this.rainCd = 2.8 * Math.pow(0.92, Math.max(0, ra - 1));
    this.rainDmg = 13 + (ra - 1) * 5;
    this.rainN = 2 + ra;
    this.rainR = 1.5 + (ra - 1) * 0.12;
    this.updateBladeCount();
  };

  G.updateBladeCount = function () {
    for (var i = 0; i < this.blades.length; i++) {
      this.blades[i].visible = i < this.bladeCount && this.state !== 'title';
    }
  };

  /* ---------------- 镜头 ---------------- */
  G.updateCamera = function (dt, idle) {
    var tx = this.player.x, tz = this.player.z;
    if (idle) {
      var a = Math.sin(this.t * 0.12) * 0.5;
      this.camera.position.set(tx + Math.sin(a) * 3.5, 14.2, tz + 14.0 + Math.cos(a) * 0.5);
      this.camera.lookAt(tx, 1.1, tz);
      return;
    }
    var lead = 0.42;
    tx += this.player.vx * lead; tz += this.player.vz * lead;
    var dist = U.lerp(this.camDist, this.boss ? 1.10 : 1.0, 0.02);
    this.camDist = dist;
    var ox = this.camBase.x, oy = this.camBase.y * dist, oz = this.camBase.z * dist;
    var sh = Fx.shakeAmt;
    var sx = (Math.random() - 0.5) * sh * 1.7, sz = (Math.random() - 0.5) * sh * 1.7;
    this.camera.position.set(tx + ox + sx, oy, tz + oz + sz);
    this.camera.lookAt(tx + sx * 0.4, 0.9, tz + sz * 0.4);
  };

  /* ---------------- 每帧 ---------------- */
  G.loop = function (ts) {
    requestAnimationFrame(this.loop.bind(this));
    var dt = Math.min(0.05, (ts - (this.lastTs || ts)) / 1000);
    this.lastTs = ts;
    this.t += dt;
    if (this.state === 'playing') {
      var wdt = dt;
      if (Fx.stop > 0) { Fx.stop -= dt; wdt *= 0.12; }
      if (this.slow > 0) { this.slow -= dt; wdt *= 0.28; }
      this.update(wdt, dt);
    } else if (this.state === 'title') {
      this.updateTitle(dt);
    } else if (this.state === 'dead' || this.state === 'win') {
      Fx.update(dt);
    }
    this.updateCamera(dt, this.state === 'title');
    this.renderer.render(this.scene, this.camera);
    if (this.state !== 'paused' && this.state !== 'levelup') Fx.drawOverlay(this.camera, dt);
    else Fx.drawOverlay(this.camera, 0);
  };

  G.updateTitle = function (dt) {
    this.playerMesh.position.y = Math.sin(this.t * 1.5) * 0.02;
    this.playerMesh.rotation.y = Math.sin(this.t * 0.3) * 0.4;
    this.ground.position.set(0, 0, 0);
    this.ground.material.map.offset.set(0, 0);
    this.warmPool.position.set(0, 0.03, 0);
    this.warmPool.scale.setScalar(4.2 + Math.sin(this.t * 1.4) * 0.1);
    this.blades.forEach(function (b) { b.visible = false; });
    Fx.update(dt);
    Fx.setDustCenter(0, 0);
  };

  G.update = function (dt, rawDt) {
    var r = this.run;
    r.time += dt;

    // 输入
    var inp = this.input, kb = this.readKeyboard();
    var ix = inp.x + kb.x, iz = inp.z + kb.z;
    var len = Math.hypot(ix, iz);
    if (len > 1) { ix /= len; iz /= len; }
    this.player.iframe = Math.max(0, this.player.iframe - dt);
    this.player.dashCd = Math.max(0, this.player.dashCd - dt);
    if (this.player.dashT > 0) {
      this.player.dashT -= dt;
      this.player.x += this.player.dashX * 13 * dt;
      this.player.z += this.player.dashZ * 13 * dt;
      this.player.vx = this.player.dashX * 13;
      this.player.vz = this.player.dashZ * 13;
      if (Math.random() < 0.6) Fx.splat(this.player.x, this.player.z, CT.PAL.gold, 1, 1.5, 0.8);
    } else {
      var ax = ix * this.speed, az = iz * this.speed;
      this.player.vx = U.lerp(this.player.vx, ax, 1 - Math.pow(0.0008, dt));
      this.player.vz = U.lerp(this.player.vz, az, 1 - Math.pow(0.0008, dt));
      this.player.x += this.player.vx * dt;
      this.player.z += this.player.vz * dt;
    }
    var sp = Math.hypot(this.player.vx, this.player.vz);
    var face = Math.atan2(this.player.vx, this.player.vz);
    if (sp > 0.35) {
      var d = ((face - this.player.face + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      this.player.face += d * Math.min(1, dt * 12);
    }
    this.player.bob += dt * (2 + sp * 1.1);
    var bob = Math.sin(this.player.bob * 2.2) * 0.045 * Math.min(1, sp / 4) + Math.sin(this.t * 1.6) * 0.012;
    this.playerMesh.position.set(this.player.x, bob, this.player.z);
    this.playerMesh.rotation.set(-Math.min(0.13, sp * 0.018), this.player.face, Math.sin(this.player.bob * 2.2) * 0.02);
    if (this.hatMesh) {
      this.hatMesh.rotation.x = -0.30 + Math.sin(this.player.bob * 2.2) * 0.025 + Math.min(0.08, sp * 0.012);
      this.hatMesh.rotation.z = Math.sin(this.player.bob * 1.9) * 0.02;
    }
    this.warmPool.position.set(this.player.x, 0.03, this.player.z);
    this.trail.position.set(this.player.x, 0.04, this.player.z);
    this.trail.rotation.z -= dt * 2.1;
    this.trail.visible = this.bladeCount > 0;
    this.trail.scale.setScalar(this.bladeRadius * 2.0);
    this.trail.material.opacity = 0.18 + Math.sin(this.t * 4) * 0.03;

    // 冲刺残影
    for (var g = 0; g < this.ghosts.length; g++) {
      var gh = this.ghosts[g];
      if (gh.t > 0) {
        gh.t -= dt;
        gh.mesh.material.opacity = Math.max(0, gh.t / 0.32) * 0.28;
        if (gh.t <= 0) gh.mesh.visible = false;
      }
    }

    // 武器
    this.updateBlades(dt);
    this.updateNova(dt);
    this.updateChain(dt);
    this.updateRain(dt);

    // 敌人
    this.updateEnemies(dt);

    // 弹幕
    this.updateOrbs(dt);
    this.updateDrops(dt);

    // 拾取
    this.updatePickups(dt);

    // 刷新
    this.updateSpawner(dt);

    // 地面
    this.ground.position.set(this.player.x, 0, this.player.z);
    this.ground.material.map.offset.set(this.player.x / 30, this.player.z / 30);
    Fx.setDustCenter(this.player.x, this.player.z);

    // 连斩
    if (r.comboT > 0) {
      r.comboT -= dt;
      if (r.comboT <= 0) { r.combo = 0; CT.UI.combo(0); }
    }

    // 大招充能
    this.run.ult = Math.min(100, this.run.ult);

    Fx.update(dt);
    this.updateProps(dt);
    this.syncEnemyMeshes();
    this.syncPickups();
    this.updateHud(dt);
    this.updateBossBar();
    if (this.winT > 0) {
      this.winT -= dt;
      if (this.winT <= 0) this.gameOver(true);
    }
  };

  G.updateProps = function () {
    var px = this.player.x, pz = this.player.z;
    if (this._propCheck && this._propCheck < this.t - 0.5) return;
    this._propCheck = this.t;
    var dummy = new T.Object3D, moved = false;
    for (var i = 0; i < this.grassProps.length; i++) {
      var p = this.grassProps[i];
      if ((p.x - px) * (p.x - px) + (p.z - pz) * (p.z - pz) > 34 * 34) {
        var a = Math.random() * 6.283, d = U.rand(20, 33);
        p.x = px + Math.cos(a) * d; p.z = pz + Math.sin(a) * d;
        p.r = Math.random() * 6.283; p.s = U.rand(0.7, 1.5);
        dummy.position.set(p.x, 0, p.z); dummy.rotation.set(0, p.r, 0); dummy.scale.setScalar(p.s);
        dummy.updateMatrix(); this.grass.setMatrixAt(i, dummy.matrix); moved = true;
      }
    }
    for (var k = 0; k < this.rockProps.length; k++) {
      var rp = this.rockProps[k];
      if ((rp.x - px) * (rp.x - px) + (rp.z - pz) * (rp.z - pz) > 34 * 34) {
        var a2 = Math.random() * 6.283, d2 = U.rand(20, 33);
        rp.x = px + Math.cos(a2) * d2; rp.z = pz + Math.sin(a2) * d2;
        rp.r = Math.random() * 6.283; rp.s = U.rand(0.5, 1.35);
        dummy.position.set(rp.x, 0, rp.z); dummy.rotation.set(0, rp.r, 0);
        dummy.scale.set(rp.s, rp.s * U.rand(0.6, 0.9), rp.s);
        dummy.updateMatrix(); this.rocks.setMatrixAt(k, dummy.matrix); moved = true;
      }
    }
    for (var si = 0; si < this.stoneProps.length; si++) {
      var stp = this.stoneProps[si];
      if ((stp.x - px) * (stp.x - px) + (stp.z - pz) * (stp.z - pz) > 36 * 36) {
        var sa = Math.random() * 6.283, sd = U.rand(22, 35);
        stp.x = px + Math.cos(sa) * sd; stp.z = pz + Math.sin(sa) * sd;
        stp.r = Math.random() * 6.283; stp.s = U.rand(0.8, 1.5);
        dummy.position.set(stp.x, 0, stp.z); dummy.rotation.set(0, stp.r, 0); dummy.scale.set(stp.s, stp.s, stp.s);
        dummy.updateMatrix(); this.stones.setMatrixAt(si, dummy.matrix); moved = true;
      }
    }
    for (var ti = 0; ti < this.treeProps.length; ti++) {
      var trp = this.treeProps[ti];
      if ((trp.x - px) * (trp.x - px) + (trp.z - pz) * (trp.z - pz) > 36 * 36) {
        var ta = Math.random() * 6.283, td = U.rand(22, 35);
        trp.x = px + Math.cos(ta) * td; trp.z = pz + Math.sin(ta) * td;
        trp.r = Math.random() * 6.283; trp.s = U.rand(0.8, 1.3);
        dummy.position.set(trp.x, 0, trp.z); dummy.rotation.set(0, trp.r, 0); dummy.scale.set(trp.s, trp.s, trp.s);
        dummy.updateMatrix(); this.trees.setMatrixAt(ti, dummy.matrix); moved = true;
      }
    }
    if (moved) { this.grass.instanceMatrix.needsUpdate = true; this.rocks.instanceMatrix.needsUpdate = true; this.stones.instanceMatrix.needsUpdate = true; this.trees.instanceMatrix.needsUpdate = true; }
  };

  /* ---------------- 笔锋 ---------------- */
  G.updateBlades = function (dt) {
    var bl = this.run.weapons.blade;
    var ang = this.t * this.bladeSpin;
    for (var i = 0; i < this.bladeCount; i++) {
      var a = ang + i / this.bladeCount * Math.PI * 2;
      var bx = this.player.x + Math.cos(a) * this.bladeRadius;
      var bz = this.player.z + Math.sin(a) * this.bladeRadius;
      var b = this.blades[i];
      b.visible = true;
      b.position.set(bx, 0.98 + Math.sin(this.t * 6 + i) * 0.07, bz);
      b.rotation.set(0.30, -a, 0.10);
      b.scale.setScalar(1.12);
      if (Math.random() < 0.5) Fx.spark(bx, 0.95, bz, CT.PAL.gold, 1, 0.5);
      // 命中
      for (var j = 0; j < this.enemies.length; j++) {
        var e = this.enemies[j];
        if (e.dead || e.bladeCd > 0) continue;
        var dx = e.x - bx, dz = e.z - bz;
        var rr = e.radius + 0.55;
        if (dx * dx + dz * dz < rr * rr) {
          e.bladeCd = 0.42 * this.hasteMul;
          this.damageEnemy(e, this.bladeDmg * this.dmgMul, { kx: -Math.cos(a) * 2.4, kz: -Math.sin(a) * 2.4 });
          Fx.spark(bx, 1.0, bz, CT.PAL.gold, 7, 4.2);
          Fx.splat(bx, bz, CT.PAL.verm, 2, 1.6, 1.0);
          S.play('slash');
        }
      }
    }
  };

  /* ---------------- 墨爆 ---------------- */
  G.updateNova = function (dt) {
    if (this.run.weapons.nova.lvl <= 0) return;
    this.novaT = (this.novaT || 0) - dt;
    if (this.novaT > 0) return;
    this.novaT = this.novaCd * this.hasteMul;
    var x = this.player.x, z = this.player.z, rr = this.novaR;
    Fx.ring(x, z, CT.PAL.clay, 0.4, rr * 1.1, 0.45, { opacity: 0.45 });
    Fx.ring(x, z, CT.PAL.gold, 0.2, rr * 0.7, 0.32);
    Fx.splat(x, z, CT.PAL.clay, 16, 4, 0.5);
    Fx.shake(0.25);
    S.play('nova');
    for (var i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i];
      if (e.dead) continue;
      var dx = e.x - x, dz = e.z - z, d2 = dx * dx + dz * dz;
      if (d2 < rr * rr) {
        var d = Math.sqrt(d2) || 1;
        this.damageEnemy(e, this.novaDmg * this.dmgMul, { kx: dx / d * 4.2, kz: dz / d * 4.2 });
      }
    }
  };

  /* ---------------- 雷链 ---------------- */
  G.updateChain = function (dt) {
    if (this.run.weapons.chain.lvl <= 0) return;
    this.chainT = (this.chainT || 0) - dt;
    if (this.chainT > 0) return;
    this.chainT = this.chainCd * this.hasteMul;
    var hitSet = [], last = { x: this.player.x, z: this.player.z };
    for (var n = 0; n < this.chainN; n++) {
      var best = null, bd = 8.5 * 8.5;
      for (var i = 0; i < this.enemies.length; i++) {
        var e = this.enemies[i];
        if (e.dead || hitSet.indexOf(e) >= 0) continue;
        var dx = e.x - last.x, dz = e.z - last.z, d2 = dx * dx + dz * dz;
        if (d2 < bd) { bd = d2; best = e; }
      }
      if (!best) break;
      hitSet.push(best);
      last = { x: best.x, z: best.z };
      Fx.bolt(best.x, best.z, 0xBFE9FF, n * 0.045);
      Fx.spark(best.x, 0.8, best.z, CT.PAL.sky, 8, 4);
      this.damageEnemy(best, this.chainDmg * this.dmgMul, { stun: 0.35, kx: 0, kz: 0 });
    }
    if (hitSet.length) { S.play('chain'); Fx.shake(0.12); }
  };

  /* ---------------- 墨雨 ---------------- */
  G.updateRain = function (dt) {
    if (this.run.weapons.rain.lvl <= 0) return;
    this.rainT = (this.rainT || 0) - dt;
    if (this.rainT > 0) return;
    this.rainT = this.rainCd * this.hasteMul;
    var cand = [];
    for (var i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i];
      if (e.dead) continue;
      var dx = e.x - this.player.x, dz = e.z - this.player.z;
      if (dx * dx + dz * dz < 11 * 11) cand.push(e);
    }
    if (!cand.length) return;
    for (var k = 0; k < this.rainN && k < 8; k++) {
      var tgt = cand[(Math.random() * cand.length) | 0];
      this.drops.push({ x: tgt.x + U.rand(-0.7, 0.7), z: tgt.z + U.rand(-0.7, 0.7), t: 0, delay: 0.34, dmg: this.rainDmg * this.dmgMul, r: this.rainR });
    }
    S.play('rain');
  };

  /* ---------------- 伤害 ---------------- */
  G.damageEnemy = function (e, dmg, opt) {
    if (e.dead) return;
    opt = opt || {};
    var crit = Math.random() < 0.08;
    var val = dmg * (crit ? 1.65 : 1);
    e.hp -= val;
    e.flash = 1;
    if (opt.stun) e.stun = Math.max(e.stun || 0, opt.stun);
    if (opt.kx || opt.kz) {
      var m = e.isBoss ? 0.16 : 1;
      e.kx = (e.kx || 0) + opt.kx * m;
      e.kz = (e.kz || 0) + opt.kz * m;
    }
    this.run.dmgDealt += val;
    var hy = e.isBoss ? 4.6 : (e.radius * 2 + 0.8);
    Fx.damage(e.x, hy, e.z, val, crit ? 'crit' : (e.isBoss ? 'boss' : 'hit'));
    Fx.splat(e.x, e.z, e.isBoss ? CT.PAL.verm : CT.PAL.violet, crit ? 5 : 2, 2.2, 0.6);
    if (e.hp <= 0) this.killEnemy(e);
  };

  G.killEnemy = function (e) {
    if (e.dead) return;
    e.dead = true;
    this.run.kills++;
    this.run.combo++;
    this.run.comboT = 2.6;
    this.run.bestCombo = Math.max(this.run.bestCombo, this.run.combo);
    this.run.ult = Math.min(100, this.run.ult + (e.isBoss ? 40 : 1.1));
    CT.UI.combo(this.run.combo);
    if (e.isBoss) {
      Fx.ring(e.x, e.z, CT.PAL.gold, 1, 14, 1.1);
      Fx.ring(e.x, e.z, CT.PAL.verm, 0.5, 9, 0.8);
      Fx.splat(e.x, e.z, CT.PAL.verm, 40, 7, 1.4);
      Fx.decal(e.x, e.z, CT.PAL.verm, 8, 9);
      Fx.shake(1.3); Fx.hitstop(0.12);
      S.play('slam'); S.play('boss');
      this.boss = null; this.run.boss = null;
      this.bossMesh.visible = false; this.bossWarn.visible = false;
      this.bossKilled = (this.bossKilled || 0) + 1;
      this.run.bossDone = this.bossKilled;
      if (e.final) {
        this.winT = 1.8;
        CT.UI.toast('墨渊消散', '整片荒原重新有了颜色', 'gold');
      } else {
        CT.UI.toast('墨渊崩解', '颜色回到荒原', 'gold');
        this.run.ult = Math.min(100, this.run.ult + 30);
      }
      return;
    }
    var xp = ETYPE[e.type].xp;
    this.spawnGem(e.x, e.z, xp);
    if (this.run.kills % 37 === 0) this.spawnHeal(e.x, e.z);
    Fx.splat(e.x, e.z, e.type === 'spitter' ? CT.PAL.magenta : CT.PAL.violet, 12, 3.2, 0.6);
    Fx.decal(e.x, e.z, e.type === 'brute' ? CT.PAL.slate : CT.PAL.deep, 0.8 + e.radius, 4.5);
    Fx.spark(e.x, 0.9, e.z, CT.PAL.ink, 4, 2.6);
    S.play('enemyDie');
  };

  G.hurtPlayer = function (dmg) {
    if (this.player.iframe > 0 || this.state !== 'playing') return;
    var p = this.player;
    p.iframe = 0.82;
    p.hp -= dmg;
    this.run.hp = p.hp;
    Fx.damage(p.x, 2.0, p.z, dmg, 'hurt');
    Fx.splat(p.x, p.z, CT.PAL.rose, 8, 2.6, 0.8);
    Fx.shake(0.55);
    Fx.hitstop(0.05);
    S.play('hurt');
    CT.UI.hurtFlash();
    if (navigator.vibrate) { try { navigator.vibrate(40); } catch (e) { } }
    if (p.hp <= 0) {
      p.hp = 0;
      this.run.hp = 0;
      CT.UI.updateHud(this.run);
      this.gameOver(false);
    }
  };

  /* ---------------- 敌人 ---------------- */
  G.spawnEnemy = function (type, x, z, opts) {
    opts = opts || {};
    var def = ETYPE[type];
    if (!opts.force) {
      var same = 0;
      for (var si = 0; si < this.enemies.length; si++) if (this.enemies[si].type === type && !this.enemies[si].dead) same++;
      if (same >= CAPS[type]) return null;
    }
    var scale = (opts.scale || 1) * (opts.elite ? 1.25 : 1);
    var hpScale = 1 + Math.min(1.4, this.run.time / 300);
    var e = {
      type: type, x: x, z: z, hp: def.hp * hpScale * (opts.hpMul || 1) * (opts.elite ? 2.4 : 1),
      maxHp: 1, radius: def.radius * scale, speed: def.speed * (opts.speedMul || 1),
      dmg: def.dmg * (opts.elite ? 1.4 : 1), scale: scale, face: Math.random() * 6.283,
      flash: 0, stun: 0, kx: 0, kz: 0, age: 0, bladeCd: 0, atkCd: 0, castCd: U.rand(1, 3),
      bob: Math.random() * 6.283, dead: false, elite: !!opts.elite
    };
    e.maxHp = e.hp;
    this.enemies.push(e);
    return e;
  };

  G.updateEnemies = function (dt) {
    var px = this.player.x, pz = this.player.z;
    var list = this.enemies;
    // 分离（只用邻近检查）
    for (var i = 0; i < list.length; i++) {
      var a = list[i];
      if (a.dead || a.isBoss) continue;
      for (var j = i + 1; j < list.length; j++) {
        var b = list[j];
        if (b.dead || b.isBoss) continue;
        var dx = b.x - a.x, dz = b.z - a.z;
        var rr = a.radius + b.radius;
        var d2 = dx * dx + dz * dz;
        if (d2 < rr * rr && d2 > 0.0001) {
          var d = Math.sqrt(d2), push = (rr - d) * 0.5;
          var ux = dx / d, uz = dz / d;
          a.x -= ux * push * 0.6; a.z -= uz * push * 0.6;
          b.x += ux * push * 0.6; b.z += uz * push * 0.6;
        }
      }
    }
    for (var k = 0; k < list.length; k++) {
      var e = list[k];
      if (e.dead) continue;
      e.flash = Math.max(0, e.flash - dt * 5);
      e.bladeCd = Math.max(0, e.bladeCd - dt);
      e.atkCd = Math.max(0, e.atkCd - dt);
      e.age += dt;
      if (e.isBoss) { this.updateBoss(e, dt); continue; }
      if (e.stun > 0) { e.stun -= dt; }
      else {
        var dx2 = px - e.x, dz2 = pz - e.z, d = Math.hypot(dx2, dz2) || 1;
        var ux2 = dx2 / d, uz2 = dz2 / d;
        e.face = Math.atan2(ux2, uz2);
        var spd = e.speed;
        if (e.type === 'spitter') {
          if (d < 6.5) spd *= -0.8;
          else if (d < 8.5) spd = 0;
          e.castCd -= dt;
          if (e.castCd <= 0 && d < 12) {
            e.castCd = 2.9;
            this.orbs.push({ x: e.x, y: 1.25, z: e.z, vx: ux2 * 4.6, vz: uz2 * 4.6, life: 5, dmg: e.dmg + 2 });
            Fx.splat(e.x, e.z, CT.PAL.magenta, 4, 1.4, 1.2);
          }
        }
        e.x += ux2 * spd * dt + (e.kx || 0) * dt;
        e.z += uz2 * spd * dt + (e.kz || 0) * dt;
      }
      e.kx *= Math.pow(0.002, dt); e.kz *= Math.pow(0.002, dt);
      // 接触
      var pd = Math.hypot(px - e.x, pz - e.z);
      if (pd < e.radius + 0.5 && e.atkCd <= 0) {
        e.atkCd = 0.9;
        this.hurtPlayer(e.dmg);
        var kb = 0.8;
        this.player.vx -= (px - e.x) / (pd || 1) * kb * 8;
        this.player.vz -= (pz - e.z) / (pd || 1) * kb * 8;
      }
    }
    // 清理
    for (var m = list.length - 1; m >= 0; m--) {
      if (list[m].dead) list.splice(m, 1);
    }
  };

  /* ---------------- Boss ---------------- */
  G.spawnBoss = function (final) {
    var x = this.player.x + U.rand(-2.5, 2.5);
    var z = this.player.z - 8.6;
    var hp = final ? 1750 : 820;
    var e = {
      type: 'boss', isBoss: true, x: x, z: z, hp: hp, maxHp: hp, radius: 1.75, speed: final ? 1.8 : 1.35,
      dmg: 12, scale: 1, face: Math.PI, flash: 0, stun: 0, kx: 0, kz: 0, age: 0, bladeCd: 0, atkCd: 0,
      bob: 0, dead: false, phase: 'chase', phaseT: 0, slamCd: 2.6, summonCd: 6, final: !!final, enraged: false
    };
    this.enemies.push(e);
    this.boss = e; this.run.boss = e;
    this.bossMesh.visible = true;
    this.bossMesh.position.set(x, 0, z);
    S.play('boss');
    Fx.ring(x, z, CT.PAL.verm, 1, 8, 0.9);
    Fx.shake(0.9);
    CT.UI.toast(final ? '终焉 · 墨渊巨像' : '潮心 · 墨渊巨像', final ? '杀死它，把整片荒原点亮' : '击碎它的金裂', 'danger');
    CT.UI.boss(true, final ? '终焉 · 墨渊巨像' : '潮心 · 墨渊巨像', 1);
  };

  G.updateBoss = function (e, dt) {
    e.slamCd -= dt; e.summonCd -= dt;
    var px = this.player.x, pz = this.player.z;
    var dx = px - e.x, dz = pz - e.z, d = Math.hypot(dx, dz) || 1;
    e.face = Math.atan2(dx, dz);
    if (!e.enraged && e.hp < e.maxHp * 0.5) {
      e.enraged = true;
      e.speed *= 1.35;
      e.slamCd = 1.2;
      Fx.ring(e.x, e.z, CT.PAL.gold, 0.5, 6, 0.6);
      Fx.shake(0.6);
      CT.UI.toast('墨渊暴怒', '金裂扩大了', 'danger');
      S.play('boss');
    }
    if (e.phase === 'chase') {
      if (d > 2.6) { e.x += dx / d * e.speed * dt; e.z += dz / d * e.speed * dt; }
      if (e.slamCd <= 0) { e.phase = 'slam'; e.phaseT = 0; e.slamX = e.x; e.slamZ = e.z; }
      else if (e.summonCd <= 0) {
        e.summonCd = 9;
        var n = e.final ? 8 : 5;
        for (var i = 0; i < n; i++) {
          var a = i / n * 6.283;
          this.spawnEnemy('mote', e.x + Math.cos(a) * 3.2, e.z + Math.sin(a) * 3.2);
          Fx.splat(e.x + Math.cos(a) * 3.2, e.z + Math.sin(a) * 3.2, CT.PAL.violet, 5, 2, 0.6);
        }
        CT.UI.toast('墨渊吐息', '小怪从体内涌出', 'danger');
      }
    } else if (e.phase === 'slam') {
      e.phaseT += dt;
      var k = Math.min(1, e.phaseT / (e.enraged ? 0.7 : 0.95));
      var rr = 2.0 + k * 6.5;
      this.bossWarn.visible = true;
      this.bossWarn.position.set(e.x, 0.07, e.z);
      this.bossWarn.scale.set(rr * 2.4, rr * 2.4, 1);
      this.bossWarn.rotation.z += dt * 0.5;
      this.bossWarn.material.opacity = 0.4 + Math.sin(this.t * 20) * 0.2;
      if (k >= 1) {
        this.bossWarn.visible = false;
        e.phase = 'recover'; e.phaseT = 0;
        e.slamCd = e.enraged ? 2.2 : 3.3;
        Fx.ring(e.x, e.z, CT.PAL.verm, 1, 7.2, 0.55, { opacity: 0.9 });
        Fx.ring(e.x, e.z, CT.PAL.gold, 0.4, 4.5, 0.35);
        Fx.splat(e.x, e.z, CT.PAL.deep, 26, 5, 1.0);
        Fx.decal(e.x, e.z, CT.PAL.deep, 6, 7);
        Fx.shake(1.0); Fx.hitstop(0.07);
        S.play('slam');
        if (Math.hypot(px - e.x, pz - e.z) < 7.0) this.hurtPlayer(14);
        // 冲击波环
        for (var w = 0; w < 8; w++) {
          var wa = w / 8 * 6.283;
          Fx.splat(e.x + Math.cos(wa) * 4, e.z + Math.sin(wa) * 4, CT.PAL.verm, 4, 3.5, 0.4);
        }
      }
    } else if (e.phase === 'recover') {
      e.phaseT += dt;
      if (e.phaseT > 0.65) e.phase = 'chase';
    }
    // 身体
    e.bob += dt * 1.8;
    var shake = e.phase === 'slam' ? Math.sin(this.t * 40) * 0.05 : 0;
    this.bossMesh.position.set(e.x + shake, Math.sin(e.bob) * 0.06, e.z);
    this.bossMesh.rotation.y = e.face;
    this.bossMesh.rotation.z = e.phase === 'slam' ? Math.sin(this.t * 18) * 0.02 : 0;
    // 接触
    if (d < e.radius + 0.55 && e.atkCd <= 0) { e.atkCd = 1.1; this.hurtPlayer(16); }
  };

  /* ---------------- 敌人弹幕 ---------------- */
  G.updateOrbs = function (dt) {
    var orb = this.orbs, px = this.player.x, pz = this.player.z;
    for (var i = orb.length - 1; i >= 0; i--) {
      var o = orb[i];
      o.life -= dt;
      o.x += o.vx * dt; o.z += o.vz * dt;
      var d = Math.hypot(px - o.x, pz - o.z);
      if (d < 0.65) {
        this.hurtPlayer(o.dmg);
        Fx.splat(o.x, o.z, CT.PAL.magenta, 6, 2.2, 1);
        orb.splice(i, 1); continue;
      }
      if (o.life <= 0) orb.splice(i, 1);
    }
  };

  G.updateDrops = function (dt) {
    var arr = this.drops;
    for (var i = arr.length - 1; i >= 0; i--) {
      var d = arr[i];
      d.t += dt;
      if (d.t >= d.delay) {
        // 砸地
        Fx.ring(d.x, d.z, CT.PAL.magenta, 0.2, d.r * 2.2, 0.3);
        Fx.splat(d.x, d.z, CT.PAL.magenta, 8, 3, 0.5);
        Fx.decal(d.x, d.z, CT.PAL.magenta, d.r * 1.4, 3);
        Fx.shake(0.12);
        S.play('rain');
        for (var j = 0; j < this.enemies.length; j++) {
          var e = this.enemies[j];
          if (e.dead) continue;
          var dx = e.x - d.x, dz = e.z - d.z;
          if (dx * dx + dz * dz < d.r * d.r) this.damageEnemy(e, d.dmg, { kx: 0, kz: 0 });
        }
        arr.splice(i, 1);
      }
    }
  };

  /* ---------------- 拾取 ---------------- */
  G.spawnGem = function (x, z, val) {
    if (this.pickups.length >= 220) { this.addXp(val); return; }
    this.pickups.push({ x: x, z: z, vx: U.rand(-1.6, 1.6), vz: U.rand(-1.6, 1.6), val: val, t: 0, heal: 0 });
  };
  G.spawnHeal = function (x, z) {
    this.pickups.push({ x: x, z: z, vx: 0, vz: 0, val: 0, t: 0, heal: 14 });
  };

  G.updatePickups = function (dt) {
    var px = this.player.x, pz = this.player.z;
    var arr = this.pickups;
    for (var i = arr.length - 1; i >= 0; i--) {
      var p = arr[i];
      p.t += dt;
      var dx = px - p.x, dz = pz - p.z, d = Math.hypot(dx, dz) || 1;
      if (d < this.magnetR) {
        var sp = p.heal ? 9 : 13;
        p.x += dx / d * sp * dt;
        p.z += dz / d * sp * dt;
      } else {
        p.x += p.vx * dt; p.z += p.vz * dt;
        p.vx *= Math.pow(0.1, dt); p.vz *= Math.pow(0.1, dt);
      }
      if (d < 0.62) {
        if (p.heal) {
          this.player.hp = Math.min(this.run.maxHp, this.player.hp + p.heal);
          this.run.hp = this.player.hp;
          Fx.damage(px, 2.2, pz, '+' + p.heal, 'heal');
          Fx.spark(px, 1.2, pz, CT.PAL.rose, 10, 3);
          S.play('heal');
        } else {
          this.addXp(p.val);
          Fx.spark(p.x, 0.7, p.z, CT.PAL.gold, 3, 2);
          S.play('pickup');
        }
        arr.splice(i, 1);
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

  /* ---------------- 升级 ---------------- */
  G.rollCards = function () {
    var pool = [], w = this.run.weapons, p = this.run.passives;
    Object.keys(w).forEach(function (k) { if (w[k].lvl < UPGRADES[k].max) pool.push(k); });
    Object.keys(p).forEach(function (k) { if (p[k] < UPGRADES[k].max) pool.push(k); });
    var cards = [];
    while (cards.length < 3 && pool.length) {
      var idx = (Math.random() * pool.length) | 0;
      cards.push(pool.splice(idx, 1)[0]);
    }
    if (cards.length === 0) cards.push('heal');
    while (cards.length < 3) cards.push('heal');
    return cards.map(function (id) {
      if (id === 'heal') return { id: 'heal', name: '回春', color: '#C85C6A', icon: 'heart', desc: '回复 25 生命', lvl: 0, max: 0, kind: 'heal' };
      var d = UPGRADES[id], lvl = d.kind === 'weapon' ? w[id].lvl : p[id];
      return { id: id, name: d.name, color: d.color, icon: d.icon, desc: d.desc(lvl + 1), lvl: lvl + 1, max: d.max, kind: d.kind };
    });
  };

  G.openLevelUp = function () {
    this.state = 'levelup';
    S.play('level');
    var cards = this.rollCards();
    var self = this;
    CT.UI.showLevelUp(cards, function (id) { self.applyUpgrade(id); });
  };

  G.applyUpgrade = function (id) {
    var r = this.run;
    if (id === 'heal') {
      this.player.hp = Math.min(r.maxHp, this.player.hp + 25);
      r.hp = this.player.hp;
    } else if (UPGRADES[id].kind === 'weapon') {
      r.weapons[id].lvl++;
    } else {
      r.passives[id]++;
      if (id === 'vigor') this.player.hp = Math.min(r.maxHp, this.player.hp + 18);
    }
    r.pending--;
    this.applyStats();
    r.hp = this.player.hp;
    CT.UI.updateHud(r);
    if (r.pending > 0) {
      CT.UI.hideLevelUp();
      this.openLevelUp();
    } else {
      this.resume();
    }
  };

  /* ---------------- 大招 ---------------- */
  G.tryUlt = function () {
    if (this.state !== 'playing' || this.run.ult < 100) return;
    this.run.ult = 0;
    this.slow = 0.34;
    Fx.hitstop(0.12);
    Fx.shake(1.35);
    S.play('ult');
    CT.UI.ultFlash();
    var px = this.player.x, pz = this.player.z;
    Fx.ring(px, pz, CT.PAL.gold, 0.5, 16, 0.85, { opacity: 1 });
    Fx.ring(px, pz, CT.PAL.verm, 0.3, 11, 0.65, { opacity: 0.9 });
    Fx.ring(px, pz, CT.PAL.sky, 0.2, 7, 0.5, { opacity: 0.8 });
    Fx.splat(px, pz, CT.PAL.gold, 44, 8, 1.2);
    Fx.decal(px, pz, CT.PAL.gold, 9, 8);
    CT.UI.toast('万彩归一', '荒原记起了自己的颜色', 'gold');
    for (var i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i];
      if (e.dead) continue;
      var dx = e.x - px, dz = e.z - pz, d = Math.hypot(dx, dz) || 1;
      if (d < 14) {
        Fx.bolt(e.x, e.z, 0xFFE9C4, Math.random() * 0.15);
        this.damageEnemy(e, (e.isBoss ? 220 : 130) * this.dmgMul, { kx: dx / d * 8, kz: dz / d * 8 });
      }
    }
    for (var k = 0; k < this.orbs.length; k++) { Fx.splat(this.orbs[k].x, this.orbs[k].z, CT.PAL.sky, 2, 1, 0.8); }
    this.orbs.length = 0;
  };

  G.tryDash = function () {
    if (this.state !== 'playing' || this.player.dashCd > 0) return;
    var ix = this.input.x + this.readKeyboard().x, iz = this.input.z + this.readKeyboard().z;
    var l = Math.hypot(ix, iz) || 1;
    this.player.dashX = ix / l; this.player.dashZ = iz / l;
    this.player.dashT = 0.18;
    this.player.dashCd = 2.6;
    this.player.iframe = Math.max(this.player.iframe, 0.34);
    S.play('dash');
    Fx.splat(this.player.x, this.player.z, CT.PAL.paper, 6, 2.2, 0.5);
    for (var i = 0; i < this.ghosts.length; i++) {
      var gh = this.ghosts[i];
      gh.mesh.visible = true;
      gh.mesh.position.set(this.player.x - this.player.dashX * i * 0.4, 0, this.player.z - this.player.dashZ * i * 0.4);
      gh.mesh.rotation.y = this.player.face;
      gh.t = 0.3 - i * 0.06;
    }
  };

  /* ---------------- 刷新 ---------------- */
  G.updateSpawner = function (dt) {
    var r = this.run;
    if (!this.spawnBossed36 && r.time >= 360 && !this.boss) {
      this.spawnBoss(true);
      this.spawnBossed36 = true;
    }
    if (r.time >= 180 && !this.spawnBossed18) {
      this.spawnBoss(false);
      this.spawnBossed18 = true;
    }
    // 潮涌
    this.waveT -= dt;
    if (this.waveT <= 0) {
      this.waveT = Math.max(18, 34 - r.time / 60 * 3);
      this.waveCount++;
      var n = Math.min(26, 8 + Math.floor(r.time / 30));
      var base = Math.random() * 6.283;
      for (var i = 0; i < n; i++) {
        var a = base + (i / n) * 1.5 + U.rand(-0.1, 0.1);
        var d = U.rand(15, 21);
        this.spawnEnemy(this.pickType(), this.player.x + Math.cos(a) * d, this.player.z + Math.sin(a) * d);
      }
      S.play('wave');
      CT.UI.toast('潮涌', '第 ' + this.waveCount + ' 波', 'cool');
    }
    // 常规刷新
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      var rate = 1.9 + r.time * 0.034;
      this.spawnT = 1 / rate;
      if (this.enemies.length < 150) {
        var a2 = Math.random() * 6.283, d2 = U.rand(13, 19);
        this.spawnEnemy(this.pickType(), this.player.x + Math.cos(a2) * d2, this.player.z + Math.sin(a2) * d2);
      }
    }
  };

  G.pickType = function () {
    var t = this.run.time, r = Math.random();
    if (t > 150 && r < 0.13) return 'spitter';
    if (t > 70 && r < 0.25) return 'brute';
    if (t > 25 && r < 0.6) return 'darter';
    return 'mote';
  };

  /* ---------------- 渲染同步 ---------------- */
  G.syncRender = function () {
    // 在 update 中直接调用（避免额外遍历）
  };

  /* ---------------- HUD ---------------- */
  G.updateHud = function (dt) {
    var r = this.run;
    this.hudT += dt;
    // 冲刺与大招每帧（平滑）
    CT.UI.updateActions(this.player.dashCd / 2.6, r.ult / 100);
    if (this.hudT < 0.08) return;
    this.hudT = 0;
    r.hp = this.player.hp;
    CT.UI.updateHud(r);
  };

  G.syncEnemyMeshes = function () {
    var dummy = this._dummy || (this._dummy = new T.Object3D());
    var counts = { mote: 0, darter: 0, brute: 0, spitter: 0 };
    var col = this._col || (this._col = new T.Color());
    var cap = { mote: CAPS.mote, darter: CAPS.darter, brute: CAPS.brute, spitter: CAPS.spitter };
    var boss = null;
    for (var i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i];
      if (e.dead) continue;
      var s = Math.min(1, e.age / 0.22);
      s = s < 1 ? 0.6 + 0.4 * s + Math.sin(s * Math.PI) * 0.12 : 1;
      var bob = Math.sin((this.t * 5 + e.bob)) * 0.04;
      dummy.position.set(e.x, bob * (e.isBoss ? 2 : 1), e.z);
      dummy.rotation.set(0, e.face, 0);
      dummy.scale.setScalar(e.scale * s * (e.elite ? 1.18 : 1));
      dummy.updateMatrix();
      var f = Math.min(1, e.flash);
      col.setRGB(1 + f * 1.8, 1 + f * 1.5, 1 + f * 1.1);
      if (e.isBoss) {
        this.bossMesh.visible = true;
        this.bossMesh.position.set(e.x, bob * 2, e.z);
        this.bossMesh.rotation.y = e.face;
        this.bossMesh.scale.setScalar(0.85);
        boss = e;
        continue;
      }
      var m = this.enemyMeshes[e.type];
      var idx = counts[e.type]++;
      if (idx < cap[e.type]) {
        m.setMatrixAt(idx, dummy.matrix);
        m.setColorAt(idx, col);
      }
    }
    var self = this;
    Object.keys(this.enemyMeshes).forEach(function (k) {
      var mesh = self.enemyMeshes[k];
      mesh.count = Math.min(counts[k], cap[k]);
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
    if (!boss) this.bossMesh.visible = false;
    // 影子
    var n = 0, sd = dummy;
    var sh = this.shadowPool;
    function addShadow(x, z, r) {
      if (n >= 199) return;
      sd.position.set(x, 0.02, z);
      sd.rotation.set(-Math.PI / 2, 0, 0);
      sd.scale.set(r * 2.4, r * 2.4, 1);
      sd.updateMatrix();
      sh.setMatrixAt(n++, sd.matrix);
    }
    addShadow(this.player.x, this.player.z, 0.7);
    for (var j = 0; j < this.enemies.length; j++) {
      var en = this.enemies[j];
      if (en.dead) continue;
      addShadow(en.x, en.z, en.isBoss ? 2.4 : en.radius * 0.95);
    }
    sh.count = n;
    sh.instanceMatrix.needsUpdate = true;
  };

  G.syncPickups = function () {
    var dummy = this._dummy || (this._dummy = new T.Object3D());
    var gi = 0, hi = 0, oi = 0;
    for (var i = 0; i < this.pickups.length; i++) {
      var p = this.pickups[i];
      dummy.position.set(p.x, 0.55 + Math.sin(this.t * 4 + i) * 0.08, p.z);
      dummy.rotation.set(0, this.t * 2.4 + i, 0);
      dummy.scale.setScalar(1.0);
      dummy.updateMatrix();
      if (p.heal) {
        if (hi < 6) { this.healMesh.setMatrixAt(hi++, dummy.matrix); }
      } else if (gi < 220) {
        this.gemMesh.setMatrixAt(gi++, dummy.matrix);
      }
    }
    this.gemMesh.count = gi; this.gemMesh.instanceMatrix.needsUpdate = true;
    this.healMesh.count = hi; this.healMesh.instanceMatrix.needsUpdate = true;
    for (var k = 0; k < this.orbs.length && oi < 40; k++) {
      var o = this.orbs[k];
      dummy.position.set(o.x, o.y, o.z);
      dummy.rotation.set(0, this.t * 6, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      this.orbMesh.setMatrixAt(oi++, dummy.matrix);
    }
    this.orbMesh.count = oi; this.orbMesh.instanceMatrix.needsUpdate = true;
    var di = 0;
    for (var d = 0; d < this.drops.length && di < 30; d++) {
      var dr = this.drops[d];
      var k2 = Math.min(1, dr.t / dr.delay);
      dummy.position.set(dr.x, 8 * (1 - k2) + 0.4, dr.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1 + k2 * 1.4, 1);
      dummy.updateMatrix();
      this.dropMesh.setMatrixAt(di++, dummy.matrix);
    }
    this.dropMesh.count = di; this.dropMesh.instanceMatrix.needsUpdate = true;
  };

  G.updateBossBar = function () {
    if (this.boss && !this.boss.dead) {
      CT.UI.boss(true, this.boss.final ? '终焉 · 墨渊巨像' : '潮心 · 墨渊巨像', Math.max(0, this.boss.hp / this.boss.maxHp));
    } else if (!this.boss) {
      CT.UI.boss(false);
    }
  };
})(window.CT);
