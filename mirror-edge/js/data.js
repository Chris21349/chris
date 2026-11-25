/* ══════════════════════════════════════════════════════════
   镜刃 MIRROR EDGE — data.js
   角色 / 招式 / 敌人 / 关卡 / 难度 / 图鉴 / 成就
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const MB = window.MB;
  const PZ = MB.Skeleton.POSES;
  const BASE = MB.Skeleton.BASE;

  /* ───────── 主题色 ───────── */
  MB.THEMES = {
    player: {
      body: '#16242f', bodyLight: '#2a4453', dark: '#070c11', rim: '#9beeff', glow: '#35d2f6', accent: '#f2ffff',
      cape: '#123745', hair: '#b9f6ff', blade: '#f2ffff', bladeDark: '#8fd4e8', eye: '#e8ffff',
    },
    ash: {
      body: '#2b3038', bodyLight: '#454e58', dark: '#0c0f13', rim: '#b9c9d8', glow: '#8399ab', accent: '#eef4fa',
      cape: '#2a323c', hair: '#c8d2da', blade: '#e8f0f8', bladeDark: '#93a4b4', eye: '#dff4ff',
    },
    crimson: {
      body: '#35141c', bodyLight: '#58202c', dark: '#0f0508', rim: '#ff8195', glow: '#ff2b4a', accent: '#ffd9de',
      cape: '#420f1c', hair: '#ff9aa8', blade: '#ffe9ec', bladeDark: '#e06b7c', eye: '#ff5566',
    },
    stone: {
      body: '#362a1c', bodyLight: '#54402a', dark: '#0d0a06', rim: '#ffc27a', glow: '#ff8a2b', accent: '#ffe4b8',
      cape: '#3a2412', hair: '#ffb066', blade: '#ffeccd', bladeDark: '#d08c4a', eye: '#ffb060',
    },
    mirror: {
      body: '#221a38', bodyLight: '#3a2c5c', dark: '#0a0712', rim: '#c9a8ff', glow: '#8a4dff', accent: '#f0e6ff',
      cape: '#221345', hair: '#d8c2ff', blade: '#f6f0ff', bladeDark: '#a88ce0', eye: '#d9c6ff',
    },
    void: {
      body: '#2b2418', bodyLight: '#4a3d26', dark: '#0d0a05', rim: '#ffe2a0', glow: '#ffb54d', accent: '#fff8e4',
      cape: '#3a2a10', hair: '#ffdf9e', blade: '#fffaf0', bladeDark: '#d8b070', eye: '#ffd98a',
    },
  };

  /* ───────── 动画关键帧 ───────── */
  const AN = (MB.AN = {});
  AN.slashH = [
    { t: 0.00, p: { torso: -94, head: -92, aFU: -58, aFF: -96, aBU: 74, aBF: 48, tF: 78, sF: 82, tB: 102, sB: 102, hipY: 3, wpn: -118 } },
    { t: 0.30, p: { torso: -86, head: -88, aFU: -30, aFF: -60, aBU: 80, aBF: 56, tF: 70, sF: 86, tB: 112, sB: 106, hipY: 4, wpn: -70 }, e: 'inQuad' },
    { t: 0.46, p: { torso: -96, head: -98, aFU: 24, aFF: 6, aBU: 96, aBF: 74, tF: 66, sF: 94, tB: 116, sB: 104, hipY: 5, wpn: 52 }, e: 'outQuint' },
    { t: 0.66, p: { torso: -90, head: -92, aFU: 52, aFF: 34, aBU: 100, aBF: 80, tF: 74, sF: 90, tB: 106, sB: 100, hipY: 2, wpn: 74 }, e: 'outCubic' },
    { t: 1.00, p: { torso: BASE.torso, head: BASE.head, aFU: BASE.aFU, aFF: BASE.aFF, aBU: BASE.aBU, aBF: BASE.aBF, tF: BASE.tF, sF: BASE.sF, tB: BASE.tB, sB: BASE.sB, hipY: 0, wpn: BASE.wpn }, e: 'inOutCubic' },
  ];
  AN.slashR = [
    { t: 0.00, p: { torso: -78, head: -80, aFU: 54, aFF: 28, aBU: 88, aBF: 66, tF: 74, sF: 88, tB: 108, sB: 104, hipY: 5, wpn: 86 } },
    { t: 0.28, p: { torso: -84, head: -86, aFU: 44, aFF: 18, aBU: 92, aBF: 70, tF: 72, sF: 86, tB: 106, sB: 102, hipY: 4, wpn: 104 }, e: 'inQuad' },
    { t: 0.44, p: { torso: -98, head: -102, aFU: -58, aFF: -92, aBU: 60, aBF: 30, tF: 66, sF: 96, tB: 118, sB: 106, hipY: 0, wpn: -96 }, e: 'outQuint' },
    { t: 0.68, p: { torso: -92, head: -96, aFU: -70, aFF: -104, aBU: 76, aBF: 46, tF: 74, sF: 90, tB: 108, sB: 100, hipY: 1, wpn: -120 }, e: 'outCubic' },
    { t: 1.00, p: { torso: BASE.torso, head: BASE.head, aFU: BASE.aFU, aFF: BASE.aFF, aBU: BASE.aBU, aBF: BASE.aBF, tF: BASE.tF, sF: BASE.sF, tB: BASE.tB, sB: BASE.sB, hipY: 0, wpn: BASE.wpn }, e: 'inOutCubic' },
  ];
  AN.slashSpin = [
    { t: 0.00, p: { torso: -70, head: -76, aFU: 96, aFF: 72, aBU: 110, aBF: 92, tF: 70, sF: 92, tB: 110, sB: 108, hipY: 8, wpn: 168 } },
    { t: 0.26, p: { torso: -104, head: -110, aFU: -40, aFF: -78, aBU: 50, aBF: 16, tF: 60, sF: 96, tB: 124, sB: 112, hipY: 2, wpn: -150 }, e: 'inQuad' },
    { t: 0.44, p: { torso: -110, head: -116, aFU: 12, aFF: -22, aBU: 92, aBF: 60, tF: 54, sF: 104, tB: 130, sB: 118, hipY: 0, wpn: -176 }, e: 'outQuint' },
    { t: 0.62, p: { torso: -84, head: -90, aFU: 46, aFF: 20, aBU: 104, aBF: 82, tF: 70, sF: 92, tB: 112, sB: 104, hipY: 4, wpn: 40 }, e: 'outCubic' },
    { t: 1.00, p: { torso: BASE.torso, head: BASE.head, aFU: BASE.aFU, aFF: BASE.aFF, aBU: BASE.aBU, aBF: BASE.aBF, tF: BASE.tF, sF: BASE.sF, tB: BASE.tB, sB: BASE.sB, hipY: 0, wpn: BASE.wpn }, e: 'inOutCubic' },
  ];
  AN.heavy = [
    { t: 0.00, p: { torso: -84, head: -86, aFU: -46, aFF: -74, aBU: 70, aBF: 40, tF: 80, sF: 84, tB: 100, sB: 100, hipY: 2, wpn: -96 } },
    { t: 0.42, p: { torso: -100, head: -104, aFU: -88, aFF: -128, aBU: 56, aBF: 22, tF: 74, sF: 82, tB: 108, sB: 104, hipY: -2, wpn: -146 }, e: 'outCubic' },
    { t: 0.58, p: { torso: -48, head: -56, aFU: 58, aFF: 34, aBU: 78, aBF: 56, tF: 58, sF: 118, tB: 124, sB: 112, hipY: 20, wpn: 96 }, e: 'outQuint' },
    { t: 0.78, p: { torso: -62, head: -70, aFU: 74, aFF: 56, aBU: 92, aBF: 72, tF: 64, sF: 108, tB: 118, sB: 108, hipY: 14, wpn: 108 }, e: 'outCubic' },
    { t: 1.00, p: { torso: BASE.torso, head: BASE.head, aFU: BASE.aFU, aFF: BASE.aFF, aBU: BASE.aBU, aBF: BASE.aBF, tF: BASE.tF, sF: BASE.sF, tB: BASE.tB, sB: BASE.sB, hipY: 0, wpn: BASE.wpn }, e: 'inOutCubic' },
  ];
  AN.airSlash = [
    { t: 0.00, p: { torso: -96, head: -100, aFU: -70, aFF: -110, aBU: 60, aBF: 30, tF: 66, sF: 104, tB: 112, sB: 130, hipY: 0, wpn: -130 } },
    { t: 0.32, p: { torso: -86, head: -90, aFU: 6, aFF: -24, aBU: 84, aBF: 60, tF: 92, sF: 116, tB: 78, sB: 74, hipY: 0, wpn: 24 }, e: 'inQuad' },
    { t: 0.56, p: { torso: -100, head: -104, aFU: 60, aFF: 40, aBU: 110, aBF: 96, tF: 104, sF: 124, tB: 70, sB: 66, hipY: 0, wpn: 92 }, e: 'outQuint' },
    { t: 1.00, p: { torso: -92, head: -96, aFU: 60, aFF: 40, aBU: 120, aBF: 100, tF: 112, sF: 120, tB: 78, sB: 70, hipY: 0, wpn: 84 }, e: 'inOutCubic' },
  ];
  AN.thrust = [
    { t: 0.00, p: { torso: -84, head: -86, aFU: 34, aFF: 74, aBU: 96, aBF: 70, tF: 82, sF: 88, tB: 100, sB: 100, hipY: 4, wpn: 96 } },
    { t: 0.36, p: { torso: -78, head: -82, aFU: 30, aFF: 66, aBU: 98, aBF: 76, tF: 78, sF: 86, tB: 104, sB: 102, hipY: 8, wpn: 88 }, e: 'inQuad' },
    { t: 0.52, p: { torso: -72, head: -76, aFU: 4, aFF: 2, aBU: 104, aBF: 92, tF: 52, sF: 96, tB: 124, sB: 112, hipY: 10, wpn: 2 }, e: 'outQuint' },
    { t: 0.80, p: { torso: -80, head: -84, aFU: 12, aFF: 18, aBU: 104, aBF: 88, tF: 66, sF: 92, tB: 114, sB: 104, hipY: 5, wpn: 14 }, e: 'outCubic' },
    { t: 1.00, p: { torso: BASE.torso, head: BASE.head, aFU: BASE.aFU, aFF: BASE.aFF, aBU: BASE.aBU, aBF: BASE.aBF, tF: BASE.tF, sF: BASE.sF, tB: BASE.tB, sB: BASE.sB, hipY: 0, wpn: BASE.wpn }, e: 'inOutCubic' },
  ];
  AN.slam = [
    { t: 0.00, p: { torso: -92, head: -94, aFU: -70, aFF: -120, aBU: -50, aBF: -100, tF: 78, sF: 82, tB: 104, sB: 102, hipY: 0, wpn: -150 } },
    { t: 0.40, p: { torso: -104, head: -108, aFU: -104, aFF: -150, aBU: -80, aBF: -130, tF: 72, sF: 78, tB: 108, sB: 106, hipY: -4, wpn: -178 }, e: 'outCubic' },
    { t: 0.56, p: { torso: -52, head: -60, aFU: 48, aFF: 26, aBU: 62, aBF: 40, tF: 46, sF: 126, tB: 134, sB: 120, hipY: 26, wpn: 88 }, e: 'outQuint' },
    { t: 0.76, p: { torso: -58, head: -66, aFU: 58, aFF: 40, aBU: 74, aBF: 54, tF: 50, sF: 122, tB: 130, sB: 118, hipY: 22, wpn: 96 }, e: 'outCubic' },
    { t: 1.00, p: { torso: BASE.torso, head: BASE.head, aFU: BASE.aFU, aFF: BASE.aFF, aBU: BASE.aBU, aBF: BASE.aBF, tF: BASE.tF, sF: BASE.sF, tB: BASE.tB, sB: BASE.sB, hipY: 0, wpn: BASE.wpn }, e: 'inOutCubic' },
  ];
  AN.twin = [
    { t: 0.00, p: { torso: -88, head: -90, aFU: -40, aFF: -80, aBU: -70, aBF: -104, tF: 78, sF: 84, tB: 102, sB: 100, hipY: 3, wpn: -100 } },
    { t: 0.24, p: { torso: -84, head: -88, aFU: -10, aFF: -40, aBU: -40, aBF: -74, tF: 72, sF: 84, tB: 108, sB: 102, hipY: 4, wpn: -60 }, e: 'inQuad' },
    { t: 0.40, p: { torso: -98, head: -102, aFU: 36, aFF: 16, aBU: 10, aBF: -20, tF: 66, sF: 94, tB: 118, sB: 104, hipY: 4, wpn: 66 }, e: 'outQuint' },
    { t: 0.60, p: { torso: -86, head: -90, aFU: 60, aFF: 42, aBU: 30, aBF: 4, tF: 74, sF: 90, tB: 106, sB: 100, hipY: 2, wpn: 96 }, e: 'outCubic' },
    { t: 1.00, p: { torso: BASE.torso, head: BASE.head, aFU: BASE.aFU, aFF: BASE.aFF, aBU: BASE.aBU, aBF: BASE.aBF, tF: BASE.tF, sF: BASE.sF, tB: BASE.tB, sB: BASE.sB, hipY: 0, wpn: BASE.wpn }, e: 'inOutCubic' },
  ];
  AN.cast = [
    { t: 0.00, p: { torso: -84, head: -86 } },
    { t: 0.22, p: { torso: -96, head: -100, aFU: -84, aFF: -96, aBU: -20, aBF: 20, tF: 80, sF: 82, tB: 102, sB: 104, hipY: -2, wpn: -95 }, e: 'outCubic' },
    { t: 0.72, p: { torso: -98, head: -102, aFU: -90, aFF: -104, aBU: -24, aBF: 16, tF: 78, sF: 80, tB: 104, sB: 106, hipY: -3, wpn: -102 }, e: 'inOutSine' },
    { t: 1.00, p: { torso: BASE.torso, head: BASE.head, aFU: BASE.aFU, aFF: BASE.aFF, aBU: BASE.aBU, aBF: BASE.aBF, tF: BASE.tF, sF: BASE.sF, tB: BASE.tB, sB: BASE.sB, hipY: 0, wpn: BASE.wpn }, e: 'inOutCubic' },
  ];
  AN.castSlam = [
    { t: 0.00, p: { torso: -84, head: -86, aFU: -84, aFF: -110, aBU: -40, aBF: -60, tF: 80, sF: 84, tB: 100, sB: 100, hipY: -2, wpn: -100 } },
    { t: 0.30, p: { torso: -104, head: -108, aFU: -100, aFF: -140, aBU: -60, aBF: -90, tF: 74, sF: 80, tB: 106, sB: 104, hipY: -6, wpn: -140 }, e: 'outCubic' },
    { t: 0.50, p: { torso: -46, head: -54, aFU: 60, aFF: 36, aBU: 70, aBF: 46, tF: 44, sF: 128, tB: 136, sB: 122, hipY: 28, wpn: 96 }, e: 'outQuint' },
    { t: 1.00, p: { torso: BASE.torso, head: BASE.head, aFU: BASE.aFU, aFF: BASE.aFF, aBU: BASE.aBU, aBF: BASE.aBF, tF: BASE.tF, sF: BASE.sF, tB: BASE.tB, sB: BASE.sB, hipY: 0, wpn: BASE.wpn }, e: 'inOutCubic' },
  ];
  AN.castStep = [
    { t: 0.00, p: { torso: -80, head: -82 } },
    { t: 0.18, p: { torso: -106, head: -112, aFU: -60, aFF: -110, aBU: 60, aBF: 40, tF: 60, sF: 96, tB: 126, sB: 116, hipY: 4, wpn: -120 }, e: 'outCubic' },
    { t: 0.40, p: { torso: -60, head: -66, aFU: 70, aFF: 50, aBU: 120, aBF: 110, tF: 40, sF: 120, tB: 146, sB: 126, hipY: 14, wpn: 120 }, e: 'outQuint' },
    { t: 1.00, p: { torso: BASE.torso, head: BASE.head, aFU: BASE.aFU, aFF: BASE.aFF, aBU: BASE.aBU, aBF: BASE.aBF, tF: BASE.tF, sF: BASE.sF, tB: BASE.tB, sB: BASE.sB, hipY: 0, wpn: BASE.wpn }, e: 'inOutCubic' },
  ];

  /* ───────── 招式构造 ───────── */
  function mk(o) {
    const d = Object.assign({
      minReach: 0, reach: 100, y0: 16, y1: 110,
      dmg: 40, posture: 12, kb: 150, kbUp: 0,
      windup: 0.12, active: 0.09, recover: 0.2,
      hits: 1, sfx: 'slash', anim: AN.slashH, cancelFrom: 0.55,
      kind: 'light', weight: 1, range: [0, 150], name: '斩',
    }, o);
    d.total = d.windup + d.active + d.recover;
    d.cancelAt = d.total * d.cancelFrom;
    return d;
  }
  MB.mkAttack = mk;

  /* ───────── 玩家 ───────── */
  const player = (MB.PLAYER = {
    id: 'player', name: '镜', title: '无名的镜',
    hp: 1000, posture: 100, scale: 1.2,
    style: 'mask', weaponType: 'katana', weaponLen: 62,
    theme: MB.THEMES.player,
    skills: [], // 运行时由存档决定
    light: [
      mk({ id: 'p1', name: '斩·壹', anim: AN.slashH, windup: 0.1, active: 0.09, recover: 0.2, reach: 108, dmg: 52, posture: 13, kb: 130, cancelFrom: 0.5 }),
      mk({ id: 'p2', name: '斩·贰', anim: AN.slashR, windup: 0.09, active: 0.09, recover: 0.2, reach: 112, dmg: 60, posture: 15, kb: 150, cancelFrom: 0.5 }),
      mk({ id: 'p3', name: '斩·叁', anim: AN.slashSpin, windup: 0.14, active: 0.12, recover: 0.3, reach: 128, dmg: 96, posture: 26, kb: 380, kbUp: 210, cancelFrom: 0.62, heavy: true }),
    ],
    heavy: mk({ id: 'ph', name: '重斩·断', anim: AN.heavy, windup: 0.32, active: 0.1, recover: 0.32, reach: 124, dmg: 158, posture: 40, kb: 320, kbUp: 120, shake: 9, heavy: true, cancelFrom: 0.7, sfx: 'slash' }),
    air: mk({ id: 'pa', name: '空斩', anim: AN.airSlash, windup: 0.1, active: 0.12, recover: 0.24, reach: 110, y0: 10, y1: 120, dmg: 66, posture: 16, kb: 180, cancelFrom: 0.6 }),
  });

  /* ───────── 敌人 ───────── */
  MB.ENEMIES = {
    dummy: {
      id: 'dummy', name: '木人·初', title: '试刃', hp: 820, posture: 85, scale: 1.18, bulk: 1.0,
      theme: MB.THEMES.ash, style: 'mask', weaponType: 'katana', weaponLen: 58,
      ai: { aggro: 0.32, react: 0.5, block: 0.05, dodge: 0.03, feint: 0, spacing: 110, combo: 0.1, speed: 0.8 },
      attacks: [
        mk({ id: 'd1', name: '木人之斩', anim: AN.slashH, windup: 0.42, active: 0.1, recover: 0.45, reach: 96, dmg: 48, posture: 12, kb: 120, range: [0, 120], telegraph: '#cfe4ff' }),
      ],
      dialogue: ['……木人无言。它只是站在那里，等你挥出第一刀。'],
    },
    ash: {
      id: 'ash', name: '影卫·灰', title: '守门人', hp: 1250, posture: 110, scale: 1.24, bulk: 1.1,
      theme: MB.THEMES.ash, style: 'crest', weaponType: 'katana', weaponLen: 64,
      ai: { aggro: 0.6, react: 0.3, block: 0.4, dodge: 0.12, feint: 0.05, spacing: 120, combo: 0.45, speed: 1 },
      attacks: [
        mk({ id: 'a1', name: '横斩', anim: AN.slashH, windup: 0.34, active: 0.1, recover: 0.34, reach: 112, dmg: 72, posture: 18, kb: 180, range: [0, 150], telegraph: '#dfe8f2' }),
        mk({ id: 'a2', name: '上撩', anim: AN.slashR, windup: 0.3, active: 0.1, recover: 0.36, reach: 108, dmg: 66, posture: 16, kb: 160, kbUp: 120, range: [0, 140], weight: 0.7, telegraph: '#dfe8f2' }),
        mk({ id: 'a3', name: '盾击', anim: AN.thrust, windup: 0.4, active: 0.08, recover: 0.4, reach: 86, dmg: 54, posture: 34, kb: 260, range: [0, 100], weight: 0.5, telegraph: '#ffd9a0' }),
        mk({ id: 'a4', name: '裂地重斩', anim: AN.heavy, windup: 0.55, active: 0.12, recover: 0.42, reach: 122, dmg: 118, posture: 30, kb: 300, kbUp: 160, range: [0, 160], weight: 0.5, heavy: true, shake: 8, telegraph: '#ffb066' }),
      ],
      dialogue: ['影卫不说话。他抬起刀，像抬起一段旧账。'],
    },
    crimson: {
      id: 'crimson', name: '双刃·绯', title: '疾影', hp: 1350, posture: 95, scale: 1.12, bulk: 0.9,
      theme: MB.THEMES.crimson, style: 'horn', weaponType: 'katana', weaponLen: 54,
      twin: true,
      ai: { aggro: 0.85, react: 0.2, block: 0.15, dodge: 0.3, feint: 0.1, spacing: 105, combo: 0.8, speed: 1.08 },
      attacks: [
        mk({ id: 'c1', name: '双刃·壹', anim: AN.twin, windup: 0.2, active: 0.08, recover: 0.18, reach: 100, dmg: 44, posture: 9, kb: 90, range: [0, 130], chain: 'crimson2', weight: 1, telegraph: '#ff9aa8' }),
        mk({ id: 'crimson2', name: '双刃·贰', anim: AN.slashR, windup: 0.14, active: 0.08, recover: 0.16, reach: 104, dmg: 44, posture: 9, kb: 90, range: [0, 130], chain: 'crimson3', hide: true, telegraph: '#ff9aa8' }),
        mk({ id: 'crimson3', name: '双刃·终', anim: AN.slashSpin, windup: 0.2, active: 0.12, recover: 0.34, reach: 118, dmg: 88, posture: 22, kb: 320, kbUp: 180, range: [0, 150], hide: true, heavy: true, telegraph: '#ff5566' }),
        mk({ id: 'c2', name: '突袭', anim: AN.thrust, windup: 0.24, active: 0.1, recover: 0.3, reach: 130, dmg: 58, posture: 14, kb: 200, range: [80, 240], weight: 0.8, lunge: { t: 0.2, vx: 520 }, telegraph: '#ffd0d6' }),
        mk({ id: 'c3', name: '回身斩', anim: AN.slashH, windup: 0.28, active: 0.1, recover: 0.26, reach: 112, dmg: 62, posture: 14, kb: 170, range: [0, 140], weight: 0.6, telegraph: '#ff9aa8' }),
      ],
      dialogue: ['「你挡得住第一刀。」绯笑了，「第二刀呢？」'],
    },
    stone: {
      id: 'stone', name: '重锤·岳', title: '不动', hp: 2100, posture: 150, scale: 1.42, bulk: 1.3,
      theme: MB.THEMES.stone, style: 'horn', weaponType: 'hammer', weaponLen: 74,
      ai: { aggro: 0.55, react: 0.42, block: 0.3, dodge: 0.05, feint: 0.08, spacing: 140, combo: 0.2, speed: 0.92 },
      attacks: [
        mk({ id: 's1', name: '横扫千军', anim: AN.slashH, windup: 0.5, active: 0.14, recover: 0.48, reach: 150, dmg: 120, posture: 26, kb: 340, range: [0, 190], weight: 1, heavy: true, shake: 9, telegraph: '#ffb066' }),
        mk({ id: 's2', name: '裂地', anim: AN.slam, windup: 0.72, active: 0.14, recover: 0.55, reach: 140, y0: 0, y1: 60, dmg: 165, posture: 44, kb: 280, kbUp: 220, range: [0, 170], weight: 1.1, unblockable: true, heavy: true, shake: 14, telegraph: '#ff3550', shock: true }),
        mk({ id: 's3', name: '冲撞', anim: AN.thrust, windup: 0.42, active: 0.16, recover: 0.44, reach: 110, dmg: 86, posture: 30, kb: 300, range: [30, 260], weight: 0.8, lunge: { t: 0.36, vx: 640 }, telegraph: '#ffd0a0' }),
      ],
      dialogue: ['山岳挪动半步，大地便先一步颤动。'],
    },
    mirror: {
      id: 'mirror', name: '镜我', title: '另一个你', hp: 2300, posture: 120, scale: 1.2, bulk: 1.02,
      theme: MB.THEMES.mirror, style: 'mask', weaponType: 'katana', weaponLen: 62,
      skills: ['voidslash', 'mirrorstep', 'bladerain', 'chrono'],
      canParry: true,
      ai: { aggro: 0.8, react: 0.22, block: 0.35, dodge: 0.3, feint: 0.25, spacing: 115, combo: 0.7, speed: 1.05 },
      attacks: [
        mk({ id: 'm1', name: '镜斩', anim: AN.slashH, windup: 0.26, active: 0.1, recover: 0.3, reach: 116, dmg: 76, posture: 16, kb: 180, range: [0, 155], telegraph: '#d9c6ff' }),
        mk({ id: 'm2', name: '逆镜', anim: AN.slashR, windup: 0.24, active: 0.1, recover: 0.3, reach: 112, dmg: 72, posture: 16, kb: 170, range: [0, 145], weight: 0.8, telegraph: '#d9c6ff' }),
        mk({ id: 'm3', name: '镜狱·斩', anim: AN.slashSpin, windup: 0.42, active: 0.14, recover: 0.44, reach: 132, dmg: 148, posture: 34, kb: 360, kbUp: 220, range: [0, 165], weight: 0.9, unblockable: true, heavy: true, telegraph: '#ff3550' }),
      ],
      dialogue: ['「你练了多久的防反？」镜我歪头，「我可是你。」'],
    },
    void: {
      id: 'void', name: '终焉·无相', title: '镜之尽头', hp: 3200, posture: 160, scale: 1.28, bulk: 1.12,
      theme: MB.THEMES.void, style: 'crest', weaponType: 'katana', weaponLen: 70,
      skills: ['bladerain', 'gravity', 'chrono', 'domain'],
      canParry: true,
      ai: { aggro: 0.92, react: 0.16, block: 0.4, dodge: 0.35, feint: 0.4, spacing: 125, combo: 0.85, speed: 1.12 },
      attacks: [
        mk({ id: 'v1', name: '无相斩', anim: AN.slashH, windup: 0.3, active: 0.12, recover: 0.3, reach: 130, dmg: 96, posture: 20, kb: 220, range: [0, 180], telegraph: '#9df6ff' }),
        mk({ id: 'v2', name: '镜界波', anim: AN.cast, windup: 0.5, active: 0.1, recover: 0.44, reach: 0, dmg: 0, posture: 0, range: [140, 420], weight: 1, projectile: 'wave', telegraph: '#9df6ff' }),
        mk({ id: 'v3', name: '断界', anim: AN.slam, windup: 0.62, active: 0.14, recover: 0.5, reach: 160, y0: 0, y1: 80, dmg: 175, posture: 46, kb: 320, kbUp: 240, range: [0, 200], weight: 1, unblockable: true, heavy: true, telegraph: '#ff3550', shock: true }),
        mk({ id: 'v4', name: '影袭', anim: AN.thrust, windup: 0.28, active: 0.1, recover: 0.3, reach: 140, dmg: 84, posture: 18, kb: 200, range: [120, 380], weight: 0.9, teleport: true, telegraph: '#c9a8ff' }),
        mk({ id: 'v5', name: '万镜归无', anim: AN.slashSpin, windup: 0.55, active: 0.2, recover: 0.6, reach: 170, dmg: 210, posture: 50, kb: 380, kbUp: 260, range: [0, 210], weight: 0.7, unblockable: true, heavy: true, telegraph: '#ff3550' }),
      ],
      dialogue: ['镜子的尽头没有倒影。只有你，和你没斩完的那一刀。'],
    },
  };

  /* ───────── 难度 ───────── */
  MB.DIFFS = [
    { id: 0, name: '普通', sub: '见习', playerDmg: 1.0, enemyDmg: 0.82, aiReact: 1.55, aiSpeed: 0.92, feint: 0.0, unblockBias: 0.15, parryWindow: 0.34, punish: 0.6 },
    { id: 1, name: '困难', sub: '修罗', playerDmg: 0.92, enemyDmg: 1.08, aiReact: 1.0, aiSpeed: 1.0, feint: 0.25, unblockBias: 0.55, parryWindow: 0.27, punish: 0.85 },
    { id: 2, name: '噩梦', sub: '无间', playerDmg: 0.85, enemyDmg: 1.32, aiReact: 0.7, aiSpeed: 1.1, feint: 0.45, unblockBias: 0.9, parryWindow: 0.2, punish: 1.0 },
  ];

  /* ───────── 技能目录 ───────── */
  MB.SKILL_DEFS = [
    { id: 'voidslash', name: '裂空斩', icon: '裂', tag: '远程 / 突进', cd: 5, desc: '横斩并甩出一道贯穿剑气。剑气可取消普攻后摇，是唯一能远程压制的起手技。', unlock: 'start' },
    { id: 'mirrorstep', name: '镜步', icon: '镜', tag: '位移 / 反击', cd: 6, desc: '向后瞬移，原地留下残影。残影会在 0.4 秒后斩击追来的敌人。', unlock: 'start' },
    { id: 'ironwall', name: '铁壁', icon: '壁', tag: '护盾', cd: 12, desc: '张开 3 秒护盾吸收伤害。护盾破碎时爆开，震退周围敌人。', unlock: 'start' },
    { id: 'insight', name: '识破', icon: '识', tag: '强化 / 防反', cd: 18, desc: '6 秒内完美防反窗口扩大 90%，并让敌人攻击前的红线更清晰。防反流的核心。', unlock: 'start' },
    { id: 'gravity', name: '引力井', icon: '引', tag: '控制 / 聚怪', cd: 10, desc: '在敌人体重处撕开引力井，持续 2 秒把敌人拖向中心并减速 45%。', unlock: 'clear:1' },
    { id: 'bladerain', name: '千刃雨', icon: '雨', tag: '范围 / 多段', cd: 9, desc: '跃起后向全场落下 9 道剑雨，每道独立判定。对浮空目标伤害提高。', unlock: 'clear:2' },
    { id: 'blinkkill', name: '瞬狱影杀', icon: '瞬', tag: '背击 / 爆发', cd: 11, desc: '瞬移至敌人背后斩击，背击伤害 ×1.8。命中后 1 秒内再次按键可追加一次。', unlock: 'hard:2' },
    { id: 'chrono', name: '时缚', icon: '缚', tag: '定身', cd: 14, desc: '冻结单体 1.4 秒。定身期间对方无法行动，但受击会提前解除。对首领效果递减。', unlock: 'clear:3' },
    { id: 'chainpull', name: '锁链·缚', icon: '链', tag: '拉拽', cd: 8, desc: '掷出锁链把敌人拉到面前；若敌人处于浮空则改为自己飞过去接一刀。', unlock: 'clear:3' },
    { id: 'domain', name: '剑域', icon: '域', tag: '区域压制', cd: 15, desc: '在脚下布下剑阵，持续 6 秒。域内敌人每秒受伤并被减速，离开则失效。', unlock: 'clear:4' },
    { id: 'reflect', name: '逆流', icon: '逆', tag: '弹反投射', cd: 10, desc: '3 秒内进入逆流姿态，把飞来的投射物以 3 倍威力弹回，并回复能量。', unlock: 'hard:4' },
    { id: 'bloodrage', name: '狂化', icon: '狂', tag: '爆发 / 风险', cd: 20, desc: '8 秒内攻击 +50%、攻速提升，但受到伤害 +30%。命中时回复生命。', unlock: 'parry:30' },
    { id: 'stillness', name: '静心', icon: '静', tag: '回复 / 架势', cd: 22, desc: '立刻回复 14% 生命，并在 6 秒内每秒回复架势。期间移动变慢。', unlock: 'hard:1' },
    { id: 'sacrifice', name: '献祭', icon: '祭', tag: '连携 / 刷新', cd: 24, desc: '支付 8% 生命，立刻重置其余三个技能的冷却。连招流的核心引擎。', unlock: 'combo:50' },
    { id: 'swordspirit', name: '剑灵', icon: '灵', tag: '召唤', cd: 16, desc: '召唤剑灵跟随 10 秒，自动追击敌人并造成小额多段伤害。', unlock: 'clear:5' },
    { id: 'charge', name: '蓄势', icon: '蓄', tag: '强化下一击', cd: 12, desc: '蓄力 1.4 秒（可移动），下一击伤害 ×2.4 且必定破势。', unlock: 'guardbreak:10' },
    { id: 'timelag', name: '时滞', icon: '滞', tag: '全场减速', cd: 18, desc: '让整片战场慢下来 3 秒，你的速度不受影响。可用来读招、也可以用来连段。', unlock: 'hard:5' },
    { id: 'bladedance', name: '刃舞', icon: '舞', tag: '连段 / 吸血', cd: 7, desc: '三段旋转斩，可随时移动施放。每次命中回复少量生命，是续航型核心。', unlock: 'clear:1' },
  ];

  /* ───────── 镜反（完美防反表现） ───────── */
  MB.PARRY_DEFS = [
    { id: 'condemn', name: '断罪·一闪', icon: '断', tag: '爆发', desc: '时间停滞，瞬移斩出三刀。对单体的最高爆发：300 伤害 + 破势 60。', unlock: 'start' },
    { id: 'mirrorback', name: '镜返·反噬', icon: '返', tag: '反弹', desc: '把敌人的这一击封进镜中，3 倍威力弹回。对远程攻击尤其致命。', unlock: 'clear:2' },
    { id: 'echo', name: '残响·无间', icon: '响', tag: '连携', desc: '子弹时间 1.6 秒：期间技能冷却停止、施放不耗冷却。连段流的极致。', unlock: 'clear:3' },
    { id: 'thunder', name: '天罚·雷狱', icon: '雷', tag: '控制 / 充能', desc: '九道落雷钉住敌人 2 秒，终极槽直接充满。', unlock: 'clear:4' },
    { id: 'voidself', name: '无我·镜我', icon: '无', tag: '强化 / 无敌', desc: '4 秒镜我状态：受到伤害 -45%，攻击 +25%，下一技能免费且强化。', unlock: 'clear:5' },
    { id: 'devour', name: '吞噬·归零', icon: '噬', tag: '回复 / 成长', desc: '吞下这一击：回复 10% 生命，本场攻击力永久 +6%，可叠加至 +30%。', unlock: 'parry:20' },
    { id: 'hunt', name: '追猎·影袭', icon: '猎', tag: '标记 / 追击', desc: '在敌人身上刻下镜印 6 秒，其受到伤害 +35%，且期间每次命中额外积攒终极槽。', unlock: 'hard:1' },
  ];

  /* ───────── 关卡 ───────── */
  MB.STAGES = [
    { id: 0, name: '无名剑冢', sub: 'SYSTEM // TEST', enemy: 'dummy', bg: 'shrine', diff: [1, 1, 1], rewardSkill: 'bladedance', rewardParry: null, hint: '先熟悉「御」。在敌人刀落下前的一瞬按下，就是完美防反。' },
    { id: 1, name: '灰烬回廊', sub: 'ASH CORRIDOR', enemy: 'ash', bg: 'corridor', diff: [1, 1, 1], rewardSkill: 'gravity', rewardParry: null, hint: '重斩不能硬挡。看红色的刀光——那是必须闪避的招。' },
    { id: 2, name: '血月之庭', sub: 'BLOOD MOON', enemy: 'crimson', bg: 'bloodmoon', diff: [1, 1, 1], rewardSkill: 'bladerain', rewardParry: 'mirrorback', hint: '双刃连斩节奏极快。连续防反可以打断连段。' },
    { id: 3, name: '断崖雷鸣', sub: 'THUNDER CLIFF', enemy: 'stone', bg: 'cliff', diff: [1, 1, 1], rewardSkill: 'chrono', rewardParry: 'echo', hint: '巨锤的裂地是红色必闪技。闪避穿过它，你会获得子弹时间。' },
    { id: 4, name: '镜之间', sub: 'MIRROR CHAMBER', enemy: 'mirror', bg: 'mirror', diff: [1, 1, 1], rewardSkill: 'swordspirit', rewardParry: 'thunder', hint: '另一个你也会防反。用快慢变化打乱他的节奏。' },
    { id: 5, name: '终焉之台', sub: 'TERMINUS', enemy: 'void', bg: 'void', diff: [1, 1, 1], rewardSkill: null, rewardParry: 'voidself', hint: '他会在刀刃前摇里变招。别背板，去读光。' },
  ];

  /* ───────── 成就 ───────── */
  MB.ACHV = [
    { id: 'firstBlood', name: '第一滴血', desc: '完成第一次击杀' },
    { id: 'firstParry', name: '镜面初开', desc: '完成第一次完美防反' },
    { id: 'parry50', name: '反射神经', desc: '累计完美防反 50 次' },
    { id: 'dodge30', name: '幻影', desc: '累计完美闪避 30 次' },
    { id: 'combo50', name: '不落之刃', desc: '单次连击达到 50 段' },
    { id: 'guard10', name: '破门者', desc: '累计打破敌人架势 10 次' },
    { id: 'nohit', name: '毫发无伤', desc: '不受任何伤害通关任意关卡' },
    { id: 'hardclear', name: '修罗之道', desc: '通关任意困难难度关卡' },
    { id: 'nightclear', name: '无间行者', desc: '通关任意噩梦难度关卡' },
    { id: 'allstage', name: '镜之尽头', desc: '通关全部关卡' },
    { id: 'allskill', name: '万刃归心', desc: '解锁全部技能' },
    { id: 'noparry', name: '不借他力', desc: '不使用完美防反通关任意关卡' },
  ];
})();
