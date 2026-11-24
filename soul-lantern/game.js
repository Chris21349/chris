/* 引魂灯 · Soul Lantern
 * 竖屏单指动作生存 · 零依赖 · 单文件逻辑
 * 所有美术由 Canvas 程序化绘制，音效由 WebAudio 合成。
 */
(() => {
'use strict';

const VERSION = '7.0.0';
const STORAGE_KEY = 'soul-lantern:v1:save';
const LEGACY_KEY = 'soul-lantern-save-v1';

/* ───────────────────────── 工具 ───────────────────────── */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a = 1, b = 0) => b + Math.random() * (a - b);
const rndi = (a, b) => Math.floor(rnd(a, b + 1));
const pick = arr => arr[(Math.random() * arr.length) | 0];
const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
const dist = (ax, ay, bx, by) => Math.sqrt(dist2(ax, ay, bx, by));
const easeOut = t => 1 - (1 - t) * (1 - t);
const fmtTime = s => {
  s = Math.max(0, Math.floor(s));
  return String((s / 60) | 0).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
};

/* ───────────────────────── 存档 ───────────────────────── */
const DEFAULT_SAVE = {
  v: 1,
  souls: 0,
  best: 0,          // 最长夜（秒）
  bestKill: 0,
  runs: 0,
  meta: { wick: 0, step: 0, light: 0, cinnabar: 0, soul: 0, ember: 0, ruthless: 0, guard: 0, flame: 0, fortune: 0 },
  codex: {},
  settings: { sound: true, haptic: true, dmg: true },
  seen: false
};

let save = null;

function loadSave() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) { raw = legacy; localStorage.setItem(STORAGE_KEY, legacy); }
    }
  } catch (e) { raw = null; }
  if (!raw) return { ...DEFAULT_SAVE, meta: { ...DEFAULT_SAVE.meta }, settings: { ...DEFAULT_SAVE.settings } };
  try {
    const d = JSON.parse(raw);
    return {
      ...DEFAULT_SAVE, ...d,
      meta: { ...DEFAULT_SAVE.meta, ...(d.meta || {}) },
      codex: { ...(d.codex || {}) },
      settings: { ...DEFAULT_SAVE.settings, ...(d.settings || {}) }
    };
  } catch (e) {
    return { ...DEFAULT_SAVE, meta: { ...DEFAULT_SAVE.meta }, codex: {}, settings: { ...DEFAULT_SAVE.settings } };
  }
}
function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(save)); } catch (e) { /* 隐私模式忽略 */ }
}
save = loadSave();

/* ───────────────────────── 音效 ───────────────────────── */
const Sound = (() => {
  let ac = null, master = null, ready = false;
  function ensure() {
    if (ready) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = 0.55;
      master.connect(ac.destination);
      ready = true;
    } catch (e) { return false; }
    return true;
  }
  function resume() { if (ac && ac.state === 'suspended') ac.resume(); }
  function env(g, t0, a, d, peak) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  }
  function tone(freq, dur, opt = {}) {
    if (!save.settings.sound || !ensure()) return;
    resume();
    const t0 = ac.currentTime + (opt.delay || 0);
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = opt.type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (opt.to) o.frequency.exponentialRampToValueAtTime(Math.max(20, opt.to), t0 + dur);
    env(g, t0, opt.a || 0.006, dur, opt.gain || 0.18);
    let node = o;
    if (opt.filter) {
      const f = ac.createBiquadFilter();
      f.type = opt.filter; f.frequency.value = opt.freq || 1200; f.Q.value = opt.q || 1;
      o.connect(f); node = f;
    }
    node.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.06);
  }
  let noiseBuf = null;
  function noise(dur, opt = {}) {
    if (!save.settings.sound || !ensure()) return;
    resume();
    if (!noiseBuf) {
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t0 = ac.currentTime + (opt.delay || 0);
    const s = ac.createBufferSource();
    s.buffer = noiseBuf;
    const f = ac.createBiquadFilter();
    f.type = opt.filter || 'bandpass';
    f.frequency.setValueAtTime(opt.freq || 900, t0);
    if (opt.to) f.frequency.exponentialRampToValueAtTime(Math.max(60, opt.to), t0 + dur);
    f.Q.value = opt.q || 0.9;
    const g = ac.createGain();
    env(g, t0, opt.a || 0.004, dur, opt.gain || 0.16);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t0); s.stop(t0 + dur + 0.05);
  }
  return {
    unlock() { if (ensure()) resume(); },
    hit() { noise(0.07, { freq: 1500, to: 500, gain: 0.10, q: 0.7 }); },
    crit() { tone(880, 0.09, { type: 'triangle', to: 1500, gain: 0.14 }); noise(0.05, { freq: 2600, gain: 0.07 }); },
    kill() { noise(0.13, { freq: 700, to: 180, gain: 0.10, q: 0.8 }); },
    pickup() { tone(1200, 0.06, { type: 'sine', to: 1700, gain: 0.05 }); },
    levelup() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.5, { type: 'triangle', gain: 0.10, delay: i * 0.07 }));
    },
    hurt() { tone(190, 0.22, { type: 'sawtooth', to: 70, gain: 0.18, filter: 'lowpass', freq: 900 }); },
    sword() { noise(0.11, { freq: 2400, to: 700, gain: 0.08, q: 1.6 }); },
    talisman() { tone(520, 0.12, { type: 'triangle', to: 900, gain: 0.07 }); },
    bell() { tone(660, 0.9, { type: 'sine', gain: 0.11 }); tone(990, 0.7, { type: 'sine', gain: 0.06, delay: 0.01 }); },
    boom() { noise(0.28, { freq: 380, to: 60, gain: 0.16, q: 0.6 }); },
    boss() { tone(70, 1.3, { type: 'sawtooth', gain: 0.16, filter: 'lowpass', freq: 420 }); noise(1.0, { freq: 200, to: 60, gain: 0.10 }); },
    over() { [330, 262, 196, 147].forEach((f, i) => tone(f, 1.1, { type: 'triangle', gain: 0.12, delay: i * 0.18 })); },
    ui() { tone(880, 0.05, { type: 'sine', gain: 0.05 }); }
  };
})();

let USER_GESTURE = false;
function haptic(ms = 12) {
  if (!save.settings.haptic || !USER_GESTURE) return;
  if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { } }
}

/* ───────────────────────── 画布 ───────────────────────── */
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d', { alpha: false });
const VIEW = { w: 0, h: 0, dpr: 1 };

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  VIEW.w = w; VIEW.h = h; VIEW.dpr = dpr;
  cv.width = Math.floor(w * dpr);
  cv.height = Math.floor(h * dpr);
  cv.style.width = w + 'px';
  cv.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  buildBackdrop();
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 120));

/* ───────────────────────── 输入 ───────────────────────── */
const IN = { on: false, ox: 0, oy: 0, cx: 0, cy: 0, dx: 0, dy: 0, mag: 0, id: -1, key: { x: 0, y: 0 } };
const KEY = Object.create(null);

function setupInput() {
  const el = document.getElementById('app-layer') || document.body;
  const target = cv;

  target.addEventListener('pointerdown', e => {
    if (G.mode !== 'play' && G.mode !== 'tutorial') return;
    if (IN.on) return;
    IN.on = true; IN.id = e.pointerId;
    IN.ox = e.clientX; IN.oy = e.clientY;
    IN.cx = e.clientX; IN.cy = e.clientY;
    try { target.setPointerCapture(e.pointerId); } catch (err) { }
    e.preventDefault();
  }, { passive: false });

  target.addEventListener('pointermove', e => {
    if (!IN.on || e.pointerId !== IN.id) return;
    IN.cx = e.clientX; IN.cy = e.clientY;
    e.preventDefault();
  }, { passive: false });

  const end = e => {
    if (e.pointerId !== IN.id) return;
    IN.on = false; IN.id = -1;
    IN.dx = 0; IN.dy = 0; IN.mag = 0;
  };
  target.addEventListener('pointerup', end);
  target.addEventListener('pointercancel', end);
  target.addEventListener('contextmenu', e => e.preventDefault());

  window.addEventListener('pointerdown', () => { USER_GESTURE = true; Sound.unlock(); }, { once: true, capture: true });
  window.addEventListener('keydown', e => { USER_GESTURE = true; Sound.unlock(); }, { once: true, capture: true });
  window.addEventListener('keydown', e => {
    KEY[e.key.toLowerCase()] = true;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) e.preventDefault();
    if (e.key === 'Escape' && G.mode === 'play') pauseGame();
  });
  window.addEventListener('keyup', e => { KEY[e.key.toLowerCase()] = false; });
  window.addEventListener('blur', () => { for (const k in KEY) KEY[k] = false; IN.on = false; });
}

function readStick() {
  let kx = 0, ky = 0;
  if (KEY['a'] || KEY['arrowleft']) kx -= 1;
  if (KEY['d'] || KEY['arrowright']) kx += 1;
  if (KEY['w'] || KEY['arrowup']) ky -= 1;
  if (KEY['s'] || KEY['arrowdown']) ky += 1;
  if (kx || ky) {
    const m = Math.hypot(kx, ky);
    IN.key.x = kx / m; IN.key.y = ky / m;
  } else { IN.key.x = 0; IN.key.y = 0; }

  let dx = 0, dy = 0, mag = 0;
  if (IN.on) {
    const rx = IN.cx - IN.ox, ry = IN.cy - IN.oy;
    const d = Math.hypot(rx, ry);
    const R = 62;
    if (d > 2) { mag = Math.min(1, d / R); dx = rx / d; dy = ry / d; }
    IN.knobX = clamp(rx, -R, R); IN.knobY = clamp(ry, -R, R);
    if (d > R) { IN.ox = IN.cx - dx * R; IN.oy = IN.cy - dy * R; }
  }
  if (IN.key.x || IN.key.y) { dx = IN.key.x; dy = IN.key.y; mag = 1; }
  IN.dx = dx; IN.dy = dy; IN.mag = mag;
}

/* ───────────────────────── 内容表 ───────────────────────── */
const WEAPONS = {
  flame: {
    name: '灯焰', glyph: '焰', max: 5, kind: 'weapon',
    desc: lv => lv === 0
      ? '一团火绕身而行，触到即燃，伤口会持续烧下去。<b>贴身灼烧</b>'
      : `火团 <b>${lv}</b> 团（每级 +1），灼烧伤害 <b>+${Math.round((lv - 1) * 18)}%</b>`
  },
  talisman: {
    name: '符箓', glyph: '符', max: 5, kind: 'weapon',
    desc: lv => lv === 0
      ? '掷出朱砂符，着地处炸开封印。<b>远程范围</b>'
      : `爆炸半径 <b>${Math.round(50 * Math.pow(1.18, lv - 1))}</b>（每级 +18%），伤害 <b>+${Math.round((lv - 1) * 16)}%</b>`
  },
  sword: {
    name: '桃木剑', glyph: '剑', max: 5, kind: 'weapon',
    desc: lv => lv === 0
      ? '朝<b>面朝方向</b>劈出一道剑气，贯穿成排的鬼。<b>定向贯穿</b>'
      : `剑气弧度 <b>${100 + (lv - 1) * 15}°</b>（每级 +15°），伤害 <b>+${Math.round((lv - 1) * 17)}%</b>`
  },
  bell: {
    name: '铜铃', glyph: '铃', max: 5, kind: 'weapon',
    desc: lv => lv === 0
      ? '摇铃荡开一圈镇魂音，推开并拖慢来敌。<b>环形击退</b>'
      : `钟声半径 <b>${Math.round(118 * Math.pow(1.14, lv - 1))}</b>（每级 +14%），伤害 <b>+${Math.round((lv - 1) * 15)}%</b>`
  },
  kite: {
    name: '纸鸢', glyph: '鸢', max: 5, kind: 'weapon',
    desc: lv => lv === 0
      ? '放一只纸鸢，追着最近的魂咬。<b>自动追踪</b>'
      : `纸鸢 <b>${lv}</b> 只（每级 +1），伤害 <b>+${Math.round((lv - 1) * 14)}%</b>`
  },
  compass: {
    name: '罗盘', glyph: '盘', max: 5, kind: 'weapon',
    desc: lv => lv === 0
      ? '盘中磁针自己寻敌，射出一线寒光。<b>精准穿透</b>'
      : `磁针 <b>${lv}</b> 枚（每级 +1），伤害 <b>+${Math.round((lv - 1) * 18)}%</b>`
  },
  umbrella: {
    name: '纸伞', glyph: '伞', max: 5, kind: 'weapon',
    desc: lv => lv === 0
      ? '油纸伞绕身旋转，伞沿绞杀近敌，每 2.6 秒射出 3 根伞骨。<b>近身绞杀</b>'
      : `伞骨 <b>${2 + lv}</b> 根（每级 +1），伤害 <b>+${Math.round((lv - 1) * 16)}%</b>`
  },
  mirror: {
    name: '铜镜', glyph: '镜', max: 5, kind: 'weapon',
    desc: lv => lv === 0
      ? '铜镜照出一道光，被照住的魂会「显形」，受伤加重。<b>标记增伤</b>'
      : `光柱更宽，显形增伤 <b>+${Math.round((1.2 + (lv - 1) * 0.06 - 1) * 100)}%</b>（每级 +6%）`
  }
};

const PASSIVES = {
  wick: { name: '灯芯', glyph: '芯', max: 5, kind: 'passive', desc: () => '生命上限 <b>+18</b>' },
  step: { name: '疾行', glyph: '行', max: 5, kind: 'passive', desc: () => '移动速度 <b>+8%</b>' },
  light: { name: '照夜', glyph: '照', max: 5, kind: 'passive', desc: () => '拾取范围 <b>+26</b>' },
  cinnabar: { name: '朱砂', glyph: '砂', max: 5, kind: 'passive', desc: () => '全部伤害 <b>+12%</b>' },
  method: { name: '手法', glyph: '手', max: 5, kind: 'passive', desc: () => '出手速度 <b>+10%</b>' },
  iron: { name: '铁骨', glyph: '骨', max: 5, kind: 'passive', desc: () => '受到伤害 <b>-7%</b>' },
  summon: { name: '招魂', glyph: '魂', max: 5, kind: 'passive', desc: () => '魂火经验 <b>+14%</b>' },
  wrath: { name: '暴戾', glyph: '戾', max: 5, kind: 'passive', desc: () => '暴击率 <b>+7%</b>' },
  ember: { name: '余温', glyph: '温', max: 5, kind: 'passive', desc: () => '每秒回复 <b>+0.5</b>' }
};

const AWAKEN = {
  flame: {
    awake: { name: '九幽灯焰', glyph: '焰', desc: '五团幽火绕身，触之成灰。灼烧会持续啃噬来敌。' },
    mutate: { name: '业火红莲', glyph: '莲', desc: '火莲自足下绽开，每三息爆出一圈业火，焚尽四周。' }
  },
  talisman: {
    awake: { name: '万符归宗', glyph: '符', desc: '一掷五符，扇形铺开，落处成阵。' },
    mutate: { name: '符海镇魂', glyph: '镇', desc: '符纸自行追魂，触身结印，连环三爆。' }
  },
  sword: {
    awake: { name: '斩月', glyph: '斩', desc: '剑气离体，化作月弧飞出，贯穿一路。' },
    mutate: { name: '剑冢', glyph: '冢', desc: '五柄残剑环身自守，见敌便自行斩去。' }
  },
  bell: {
    awake: { name: '镇魂钟', glyph: '钟', desc: '钟声不息，近身者如陷泥沼，寸步难行。' },
    mutate: { name: '摄魂铃', glyph: '摄', desc: '铃音成链，隔着人群穿透而过。' }
  },
  kite: {
    awake: { name: '千纸鹤', glyph: '鹤', desc: '千纸齐飞，旋成一条白河，触敌即炸，一纸一响。' },
    mutate: { name: '白鹤引路', glyph: '引', desc: '三只巨鹤盘旋俯冲，落地掀起白羽风暴。' }
  },
  compass: {
    awake: { name: '司南', glyph: '南', desc: '盘中二十四山自转，三针齐出，环身成刃。' },
    mutate: { name: '天机盘', glyph: '劫', desc: '被天机盘点了名的东西，一个也走不掉。' }
  },
  umbrella: {
    awake: { name: '千机伞', glyph: '机', desc: '伞面全张，十骨齐发，张合之间尽是杀机。' },
    mutate: { name: '无字伞', glyph: '无', desc: '撑开一片无字天地，进伞者寸步难行，血尽而亡。' }
  },
  mirror: {
    awake: { name: '日月镜', glyph: '月', desc: '日月双光绕身扫过，见光者皆焚，无处可躲。' },
    mutate: { name: '照骨镜', glyph: '骨', desc: '照见骨头里的东西——显形者死，死则连坐。' }
  }
};

const META = [
  { id: 'wick', name: '灯芯', glyph: '芯', desc: '生命上限 +15', per: 15 },
  { id: 'step', name: '步履', glyph: '步', desc: '移动速度 +3%', per: 0.03 },
  { id: 'light', name: '照夜', glyph: '照', desc: '拾取范围 +18', per: 18 },
  { id: 'cinnabar', name: '朱砂', glyph: '砂', desc: '伤害 +4%', per: 0.04 },
  { id: 'soul', name: '魂引', glyph: '引', desc: '经验 +7%', per: 0.07 },
  { id: 'ember', name: '余温', glyph: '温', desc: '每秒回复 +0.12', per: 0.12 },
  { id: 'ruthless', name: '锐意', glyph: '锐', desc: '暴击率 +3%', per: 0.03 },
  { id: 'guard', name: '坚壁', glyph: '壁', desc: '受到伤害 -4%', per: 0.04 },
  { id: 'flame', name: '灯焰', glyph: '焰', desc: '出手速度 +4%', per: 0.04 },
  { id: 'fortune', name: '聚财', glyph: '财', desc: '魂火收益 +8%', per: 0.08 }
];
const META_MAX = 10;
function metaCost(lv) { return Math.round(12 * Math.pow(1.58, lv)); }

/* ───────────────────────── 运行态 ───────────────────────── */
const G = {
  mode: 'title',      // title | play | levelup | pause | over
  time: 0,
  shake: 0,
  shakeX: 0, shakeY: 0,
  hitstop: 0,
  flash: 0,
  flashColor: '#fff',
  cam: { x: 0, y: 0 },
  player: null,
  enemies: [],
  shots: [],
  orbs: [],
  parts: [],
  texts: [],
  rings: [],
  slashes: [],
  arcs: [],
  seals: [],
  cones: [],
  blades: [],
  bladeFx: [],
  sealRings: [],
  beams: [],
  ringFx: [],
  kills: 0,
  soulsRun: 0,
  depth: 1,
  spawnT: 0,
  bossT: 240,
  boss: null,
  bossCount: 0,
  combo: 0,
  comboT: 0,
  slowmo: 1,
  lp: null,
  backdrop: null,
  runSeed: 0
};

function newPlayer() {
  const m = save.meta;
  const p = {
    x: 0, y: 0, vx: 0, vy: 0, r: 13,
    hpMax: 100 + m.wick * 15,
    hp: 0,
    speed: 190 * (1 + m.step * 0.03),
    pickup: 104 + m.light * 18,
    dmgMul: 1 + m.cinnabar * 0.04,
    atkMul: 1 + m.flame * 0.04,
    xpMul: 1 + m.soul * 0.07,
    regen: m.ember * 0.12,
    crit: 0.05 + m.ruthless * 0.03,
    dr: Math.min(0.5, m.guard * 0.04),
    lvl: 1, xp: 0, xpNext: 4,
    face: 1, aim: 0, walk: 0, inv: 0, hurtT: 0,
    weapons: {}, passives: {}, awake: {},
    flameAng: 0, cd: {}
  };
  p.hp = p.hpMax;
  p.weapons.flame = 1;
  return p;
}

function recomputeStats() {
  const p = G.player; if (!p) return;
  const m = save.meta;
  const ps = p.passives;
  const hpMax = 100 + m.wick * 15 + (ps.wick || 0) * 18;
  const ratio = p.hp / p.hpMax;
  p.hpMax = hpMax;
  p.hp = Math.min(hpMax, Math.max(1, hpMax * (p.hpMax > 0 ? ratio : 1)));
  p.speed = 190 * (1 + m.step * 0.03) * (1 + (ps.step || 0) * 0.08);
  p.pickup = 104 + m.light * 18 + (ps.light || 0) * 26;
  p.dmgMul = (1 + m.cinnabar * 0.04) * (1 + (ps.cinnabar || 0) * 0.12);
  p.atkMul = (1 + m.flame * 0.04) * (1 + (ps.method || 0) * 0.10);
  p.xpMul = 1 + m.soul * 0.07 + (ps.summon || 0) * 0.14;
  p.regen = m.ember * 0.12 + (ps.ember || 0) * 0.5;
  p.crit = 0.05 + m.ruthless * 0.03 + (ps.wrath || 0) * 0.07;
  p.dr = Math.min(0.6, m.guard * 0.04 + (ps.iron || 0) * 0.07);
}

/* ───────────────────────── 敌人 ───────────────────────── */
const ENEMY_TYPES = {
  chi: { key: 'chi', name: '魑', hp: 20, spd: 158, r: 11, dmg: 6, xp: 1, ink: '#c9485b', score: 1 },
  mei: { key: 'mei', name: '魅', hp: 40, spd: 136, r: 13, dmg: 8, xp: 2, ink: '#86bcd8', score: 2 },
  zhu: { key: 'zhu', name: '蛛', hp: 32, spd: 148, r: 12, dmg: 7, xp: 2, ink: '#b489d6', score: 2 },
  jiang: { key: 'jiang', name: '僵', hp: 82, spd: 112, r: 17, dmg: 12, xp: 3, ink: '#93b06c', score: 3 },
  nuo: { key: 'nuo', name: '傩', hp: 360, spd: 118, r: 23, dmg: 15, xp: 12, ink: '#e0a04a', elite: true, score: 8 },
  boss: { key: 'boss', name: '灯灭之影', hp: 1700, spd: 92, r: 44, dmg: 22, xp: 60, ink: '#d9503f', boss: true }
};

function spawnEnemy(typeKey, opt = {}) {
  if (!G.player) return null;
  // 同屏上限随时间提升（0 分钟 150 → 8 分钟 430）
  const cap = Math.min(460, 170 + G.time * 0.85);
  if (!opt.force && G.enemies.length >= cap) return null;
  const t = ENEMY_TYPES[typeKey];
  if (!t) return null;
  const ang = opt.ang !== undefined ? opt.ang : rnd(TAU);
  const rad = opt.rad || (Math.max(VIEW.w, VIEW.h) * 0.44 + 30);
  const scale = 1 + G.time / 95 * 0.42;
  const hp = t.hp * (t.boss ? 1 + G.time / 240 * 0.9 : scale);
  const e = {
    type: typeKey, x: G.player.x + Math.cos(ang) * rad, y: G.player.y + Math.sin(ang) * rad,
    vx: 0, vy: 0, kx: 0, ky: 0, r: t.r, hp, hpMax: hp,
    spd: t.spd * (1 + Math.min(0.35, G.time / 600)) * (opt.spdMul || 1), dmg: t.dmg * (1 + G.time / 300 * 0.3),
    xp: t.xp, ink: t.ink, anim: rnd(TAU), t: 0,
    atkCd: 0, flash: 0, dying: 0, slow: 0, slowT: 0,
    elite: !!t.elite, boss: !!t.boss,
    dashCd: rnd(2.4, 1.4), dashing: 0,
    phase: 0, pT: 0, windup: 0, windDir: 0, summonT: 4,
    hitFlash: 0, alive: true
  };
  if (opt.hpMul) { e.hp *= opt.hpMul; e.hpMax *= opt.hpMul; }
  G.enemies.push(e);
  return e;
}

/* ───────────────────────── 特效 ───────────────────────── */
function burst(x, y, n, col, opt = {}) {
  const spd = opt.spd || 160, size = opt.size || 3, life = opt.life || 0.5;
  for (let i = 0; i < n; i++) {
    const a = rnd(TAU), s = rnd(spd, spd * 0.25);
    G.parts.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: life * rnd(1.2, 0.6), max: life * 1.2, size: size * rnd(1.4, 0.5),
      col, type: opt.type || 'spark', drag: opt.drag || 3.4, grav: opt.grav || 0
    });
  }
  if (G.parts.length > 460) G.parts.splice(0, G.parts.length - 460);
}
function inkSplat(x, y, n, col) {
  for (let i = 0; i < n; i++) {
    const a = rnd(TAU), s = rnd(120, 20);
    G.parts.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: rnd(0.9, 0.4), max: 0.9, size: rnd(5, 1.6), col, type: 'ink', drag: 2.2, grav: 30
    });
  }
}
function ring(x, y, rMax, col, life = 0.4, w = 3) {
  G.rings.push({ x, y, r: 0, rMax, col, life, max: life, w });
}
function dmgText(x, y, txt, col, size = 13) {
  if (!save.settings.dmg) return;
  G.texts.push({ x, y, vy: -46, life: 0.7, max: 0.7, txt, col, size });
  if (G.texts.length > 40) G.texts.shift();
}
function shake(amt) { G.shake = Math.min(18, G.shake + amt); }
function hitstop(ms) { G.hitstop = Math.max(G.hitstop, ms / 1000); }

/* ───────────────────────── 战斗 ───────────────────────── */
function nearestEnemy(x, y, maxD, filter) {
  let best = null, bd = maxD * maxD;
  for (const e of G.enemies) {
    if (!e.alive) continue;
    if (filter && !filter(e)) continue;
    const d = dist2(x, y, e.x, e.y);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

function damageEnemy(e, amount, opt = {}) {
  if (!e.alive || e.dying) return;
  const p = G.player;
  let crit = false;
  if (e.markT > 0) amount *= (e.markMul || 1.2);
  if (opt.canCrit !== false && Math.random() < p.crit) { crit = true; amount *= 1.85; }
  e.hp -= amount;
  e.flash = 1;
  if (opt.knock) {
    const fx = isFinite(opt.fromX) ? opt.fromX : e.x;
    const fy = isFinite(opt.fromY) ? opt.fromY : e.y;
    const a = opt.knockAng !== undefined ? opt.knockAng : Math.atan2(e.y - fy, e.x - fx);
    e.kx += Math.cos(a) * opt.knock;
    e.ky += Math.sin(a) * opt.knock;
  }
  if (save.settings.dmg) dmgText(e.x + rnd(8, -8), e.y - e.r - 4, Math.round(amount), crit ? '#ffd76b' : '#f2e6cd', crit ? 17 : 12);
  if (crit) { Sound.crit(); burst(e.x, e.y, 4, '#ffd76b', { spd: 200, size: 2 }); }
  if (e.hp <= 0) killEnemy(e);
  else if (!opt.silent) Sound.hit();
}

function killEnemy(e) {
  e.alive = false;
  e.dying = 0.001;
  G.kills++;
  inkSplat(e.x, e.y, e.boss ? 34 : e.elite ? 16 : 7, e.ink);
  for (let i = 0; i < 4; i++) {
    G.parts.push({
      x: e.x + rnd(10, -10), y: e.y - 4,
      vx: rnd(24, -24), vy: rnd(-30, -90),
      life: rnd(0.9, 0.5), max: 0.9, size: rnd(2.6, 1.2),
      col: '#ffcf8a', type: 'spark', drag: 1.2, grav: -20
    });
  }
  burst(e.x, e.y, e.boss ? 26 : 6, '#f0c674', { spd: 150, size: 2, life: 0.4 });
  if (e.boss) {
    shake(16); Sound.boom(); hitstop(90);
    ring(e.x, e.y, 320, '#ffb35c', 0.9, 8);
    G.flash = 0.55; G.flashColor = '#ffd79a';
    G.boss = null;
    G.bossT = 165;
    for (let i = 0; i < 26; i++) dropOrb(e.x + rnd(50, -50), e.y + rnd(50, -50), 5);
    G.player.hp = Math.min(G.player.hpMax, G.player.hp + 25);
    dmgText(G.player.x, G.player.y - 40, '+25', '#7fe0bc', 18);
  } else if (e.markT > 0 && awForm('mirror') === 'mutate') {
    // 照骨镜：显形者死则连坐
    ring(e.x, e.y, 92, '#ffe9c0', 0.45, 4);
    hitArea(e.x, e.y, 88, 34 * (G.player.dmgMul || 1), { knock: 90 });
    for (const o of G.enemies) {
      if (o.alive && o !== e && dist2(o.x, o.y, e.x, e.y) < 96 * 96) markEnemy(o, 3, 1.3);
    }
  } else if (e.elite) {
    shake(7); Sound.boom();
    ring(e.x, e.y, 120, '#e0a04a', 0.5, 4);
    for (let i = 0; i < 8; i++) dropOrb(e.x + rnd(24, -24), e.y + rnd(24, -24), 3);
    if (Math.random() < 0.5) dropOil(e.x, e.y);
  } else {
    Sound.kill();
  }
  const n = e.boss ? 22 : e.elite ? 8 : 1;
  for (let i = 0; i < n; i++) dropOrb(e.x + rnd(18, -18), e.y + rnd(18, -18), e.xp / n);
  if (Math.random() < 0.026) dropOil(e.x, e.y);
  if (e.boss) G.boss = null;
}

function dropOrb(x, y, val) {
  G.orbs.push({ x, y, vx: rnd(60, -60), vy: rnd(60, -60), val: Math.max(0.5, val), r: 4.5, t: 0, pull: false, alive: true });
}
function dropOil(x, y) {
  G.orbs.push({ x, y, vx: 0, vy: 0, val: 0, r: 8, t: 0, oil: true, pull: false, alive: true });
}

function addXP(v) {
  const p = G.player;
  p.xp += v;
  let ups = 0;
  while (p.xp >= p.xpNext && ups < 6) {
    p.xp -= p.xpNext;
    p.lvl++;
    p.xpNext = Math.floor(4 + (p.lvl - 1) * 3 + Math.pow(p.lvl - 1, 1.8) * 0.8);
    ups++;
  }
  if (ups > 0) {
    G.player.hp = Math.min(G.player.hpMax, G.player.hp + G.player.hpMax * 0.06);
    openLevelUp();
  }
}

/* ───────────────────────── 武器更新 ───────────────────────── */
function wLevel(k) { return G.player.weapons[k] || 0; }
function awForm(k) { return (G.player.awake && G.player.awake[k]) || null; }
function awInfo(k) {
  const f = awForm(k);
  return f ? AWAKEN[k][f] : null;
}

function weaponStats(k, lv) {
  const p = G.player;
  const d = p.dmgMul;
  const a = p.atkMul;
  if (k === 'flame') return { dmg: 11 * (1 + (lv - 1) * 0.18) * d, orbs: Math.min(5, lv), rad: 44 + lv * 7, spd: 2.0 };
  if (k === 'talisman') return { dmg: 20 * (1 + (lv - 1) * 0.16) * d, cd: 1.2 / a, radius: 50 * Math.pow(1.18, lv - 1) };
  if (k === 'sword') return { dmg: 33 * (1 + (lv - 1) * 0.17) * d, cd: 0.86 / a, range: 96 + lv * 8, arc: (100 + (lv - 1) * 15) * Math.PI / 180 };
  if (k === 'bell') return { dmg: 13 * (1 + (lv - 1) * 0.15) * d, cd: 2.6 / a, radius: 118 * Math.pow(1.14, lv - 1) };
  if (k === 'kite') return { dmg: 16 * (1 + (lv - 1) * 0.14) * d, cd: 2.3 / a, count: Math.min(5, lv), pierce: 1 + lv };
  return null;
}

function hitArea(x, y, r, dmg, opt = {}) {
  for (const e of G.enemies) {
    if (!e.alive) continue;
    if (dist2(x, y, e.x, e.y) < (r + e.r) * (r + e.r)) {
      damageEnemy(e, dmg, {
        knock: opt.knock || 0,
        fromX: opt.fromX !== undefined ? opt.fromX : x,
        fromY: opt.fromY !== undefined ? opt.fromY : y
      });
    }
  }
}

function burn(e, dps, sec) {
  e.burn = Math.max(e.burn || 0, sec);
  e.burnDps = Math.max(e.burnDps || 0, dps);
  e.burnTick = 0;
}

/* 灯焰 · 觉醒 */
function updateFlameAwake(dt, form) {
  const p = G.player;
  const mutated = form === 'mutate';
  const n = mutated ? 6 : 5;
  const rad = mutated ? 76 : 58;
  const dmg = 11 * 1.72 * p.dmgMul * (mutated ? 2.6 : 2.2);
  p.flameAng += dt * (mutated ? 2.9 : 2.3);

  for (let i = 0; i < n; i++) {
    const a = p.flameAng + i * TAU / n;
    const fx = p.x + Math.cos(a) * rad, fy = p.y + Math.sin(a) * rad * 0.86;
    if (Math.random() < 0.35) {
      G.parts.push({
        x: fx + rnd(8, -8), y: fy + rnd(8, -8), vx: rnd(24, -24), vy: rnd(-16, -46),
        life: rnd(0.6, 0.3), max: 0.6, size: rnd(3, 1.4),
        col: mutated ? '#ff6a4a' : '#ffc46a', type: 'spark', drag: 1.6, grav: -30
      });
    }
    for (const e of G.enemies) {
      if (!e.alive || e.flameCd > 0) continue;
      if (dist2(fx, fy, e.x, e.y) < (e.r + 22) * (e.r + 22)) {
        e.flameCd = 0.34;
        damageEnemy(e, dmg, { knock: 70, fromX: p.x, fromY: p.y });
        burn(e, dmg * 0.35, 3);
        burst(fx, fy, 4, mutated ? '#ff7a4a' : '#ffd489', { spd: 150, size: 2.8, life: 0.35 });
      }
    }
  }
  // 贴身灼烧
  const aura = mutated ? 46 : 40;
  for (const e of G.enemies) {
    if (!e.alive || e.flameCd > 0) continue;
    if (dist2(p.x, p.y, e.x, e.y) < (aura + e.r) * (aura + e.r)) {
      e.flameCd = 0.34;
      damageEnemy(e, dmg * 0.8, { knock: 120, fromX: p.x, fromY: p.y });
      burn(e, dmg * 0.3, 3);
    }
  }
  // 业火红莲：周期业火
  if (mutated) {
    p.cd.nova = (p.cd.nova || 0) - dt;
    if (p.cd.nova <= 0) {
      p.cd.nova = 2.1;
      ring(p.x, p.y, 190, '#ff5a34', 0.75, 10);
      ring(p.x, p.y, 130, '#ffb07a', 0.55, 5);
      burst(p.x, p.y, 26, '#ff7a4a', { spd: 320, size: 4, life: 0.8 });
      p.lotusBloom = 1;
      for (let i = 0; i < 18; i++) {
        const a = i / 18 * TAU;
        G.parts.push({ x: p.x + Math.cos(a) * 40, y: p.y + Math.sin(a) * 26, vx: Math.cos(a) * 210, vy: Math.sin(a) * 160, life: 0.9, max: 0.9, size: 4, col: '#ff6a3a', type: 'spark', drag: 1.6 });
      }
      hitArea(p.x, p.y, 178, dmg * 2.2, { knock: 260 });
      for (const e of G.enemies) if (e.alive && dist2(p.x, p.y, e.x, e.y) < 178 * 178) burn(e, dmg * 0.5, 4);
      shake(8); Sound.boom(); haptic(16);
    }
  }
}

/* 符箓 · 觉醒：天降符帘 / 符海镇魂 */
function updateTalismanAwake(dt, form) {
  const p = G.player;
  const mut = form === 'mutate';
  const cd = (mut ? 1.25 : 1.05) / p.atkMul;
  p.cd.talisman = (p.cd.talisman || 0) - dt;
  if (p.cd.talisman > 0) return;
  p.cd.talisman = cd;
  const aim = (p.aim !== undefined ? p.aim : 0);
  const dmg = 20 * 1.64 * p.dmgMul * (mut ? 2.2 : 2.0);

  if (mut) {
    // 符海镇魂：追魂符 + 结印
    for (let i = 0; i < 3; i++) {
      const a = aim + rnd(0.7, -0.7);
      G.shots.push({
        type: 'talisman', x: p.x, y: p.y, vx: Math.cos(a) * 430, vy: Math.sin(a) * 430,
        dmg, radius: 66, life: 2.4, rot: a, spin: 10, home: true, seal: true, evil: true
      });
    }
    G.sealRings = G.sealRings || [];
    G.sealRings.push({ x: p.x, y: p.y, life: 0.7, max: 0.7, r: 0, rMax: 160, col: '#ff6a4a' });
  } else {
    // 天降符帘：一整排符自天而降
    const perp = aim + Math.PI / 2;
    for (let i = 0; i < 9; i++) {
      const off = (i - 4) * 34;
      const sx = p.x + Math.cos(perp) * off + Math.cos(aim) * 40;
      const sy = p.y + Math.sin(perp) * off + Math.sin(aim) * 40 - 260;
      G.shots.push({
        type: 'talisman', x: sx, y: sy, vx: Math.cos(aim) * 60, vy: 760,
        dmg: dmg * 0.85, radius: 78, life: 0.55, rot: aim + i * 0.2, spin: 8
      });
    }
    G.sealRings = G.sealRings || [];
    G.sealRings.push({ x: p.x + Math.cos(aim) * 60, y: p.y + Math.sin(aim) * 60, life: 0.6, max: 0.6, r: 0, rMax: 170, col: '#ffd489' });
    shake(3);
  }
  Sound.talisman();
}

/* 桃木剑 · 觉醒：斩月 / 剑冢 */
function updateSwordAwake(dt, form) {
  const p = G.player;
  const mutated = form === 'mutate';
  const dmg = 33 * (1 + 4 * 0.17) * p.dmgMul * (mutated ? 1.6 : 2.2);
  const face = (p.aim !== undefined ? p.aim : (p.face > 0 ? 0 : Math.PI));

  if (mutated) {
    if (!p.gswords) p.gswords = [0, 1, 2, 3, 4].map(i => ({ ang: i / 5 * TAU }));
    for (const g of p.gswords) g.ang += dt * 1.4;
    p.cd.sword = (p.cd.sword || 0) - dt;
    if (p.cd.sword <= 0) {
      p.cd.sword = 0.9 / p.atkMul;
      // 五剑齐出，一并向面朝方向铺开
      for (let i = 0; i < 5; i++) {
        const a = face + (i - 2) * 0.2;
        G.shots.push({
          type: 'moonwave', x: p.x, y: p.y,
          vx: Math.cos(a) * (600 - i % 2 * 60), vy: Math.sin(a) * (600 - i % 2 * 60),
          dmg, life: 1.05, rot: a, w: 24, len: 150, hitSet: new Set(), tier: i % 2
        });
      }
      Sound.sword(); shake(3);
    }
    // 剑雨
    p.cd.rain = (p.cd.rain || 2.2) - dt;
    if (p.cd.rain <= 0) {
      p.cd.rain = 2.4;
      const list = G.enemies.filter(e => e.alive && dist2(p.x, p.y, e.x, e.y) < 420 * 420).slice(0, 6);
      for (const e of list) {
        G.shots.push({
          type: 'needle', x: e.x + rnd(40, -40), y: e.y - 240, vx: 0, vy: 900,
          dmg: dmg * 0.9, pierce: 6, life: 0.5, rot: Math.PI / 2, hitSet: new Set(), swordRain: true
        });
      }
      shake(3);
    }
    return;
  }

  p.cd.sword = (p.cd.sword || 0) - dt;
  if (p.cd.sword > 0) return;
  p.cd.sword = 0.56 / p.atkMul;
  // 三重月弧，全部朝面朝方向
  for (let i = 0; i < 3; i++) {
    G.shots.push({
      type: 'moonwave', x: p.x, y: p.y,
      vx: Math.cos(face) * (660 - i * 80), vy: Math.sin(face) * (660 - i * 80),
      dmg: dmg * (1 - i * 0.12), life: 1.15, rot: face, w: 30 - i * 3, len: 168 + i * 46, hitSet: new Set(), tier: i
    });
  }
  // 月痕
  G.blades.push({ x: p.x, y: p.y, ang: face, len: 320, life: 0.8, max: 0.8, dmg: dmg * 0.42, tick: 0 });
  G.bladeFx.push({ x: p.x, y: p.y, ang: face, life: 0.3, max: 0.3, scale: 1 });
  G.slashes.push({ x: p.x, y: p.y, ang: face, arc: 2.4, range: 150, life: 0.26, max: 0.26 });
  G.flash = Math.max(G.flash, 0.14); G.flashColor = '#eaf4ff';
  Sound.sword(); shake(4);
}

/* 纸鸢 · 觉醒：千纸鹤鹤阵 / 白鹤引路横扫 */
function updateKiteAwake(dt, form) {
  const p = G.player;
  const mut = form === 'mutate';
  p.cd.kite = (p.cd.kite || 0) - dt;
  if (p.cd.kite > 0) return;
  const aim = (p.aim !== undefined ? p.aim : 0);
  const dmg = 16 * 1.6 * p.dmgMul * (mut ? 2.4 : 1.8);

  if (mut) {
    // 白鹤引路：巨鹤横扫战场
    p.cd.kite = 2.6 / p.atkMul;
    const dir = Math.cos(aim) >= 0 ? 1 : -1;
    for (let i = 0; i < 2; i++) {
      G.shots.push({
        type: 'crane', x: p.x - dir * 280, y: p.y + (i ? 96 : -96),
        vx: dir * 760, vy: 0, dmg: dmg * 1.2, pierce: 99, life: 2.2,
        rot: dir > 0 ? 0 : Math.PI, hitSet: new Set(), wob: rnd(TAU), sweep: true
      });
    }
    Sound.boom(); shake(4);
    return;
  }

  // 千纸鹤：鹤阵自背后俯冲
  p.cd.kite = 1.15 / p.atkMul;
  const back = aim + Math.PI;
  for (let i = 0; i < 9; i++) {
    const rank = Math.floor(i / 3);
    const side = (i % 3) - 1;
    const px = p.x + Math.cos(back) * (40 + rank * 26) + Math.cos(aim + Math.PI / 2) * side * 34;
    const py = p.y + Math.sin(back) * (40 + rank * 26) + Math.sin(aim + Math.PI / 2) * side * 34;
    const sp = 520 + rank * 40;
    G.shots.push({
      type: 'kite', x: px, y: py,
      vx: Math.cos(aim) * sp, vy: Math.sin(aim) * sp,
      dmg: dmg * 0.9, pierce: 3, life: 1.8, rot: aim,
      hitSet: new Set(), wob: rnd(TAU), boom: 70, big: true, dive: true
    });
  }
  G.sealRings = G.sealRings || [];
  G.sealRings.push({ x: p.x, y: p.y, life: 0.5, max: 0.5, r: 0, rMax: 150, col: '#fff6e0' });
  Sound.talisman(); shake(2);
}

/* 铜铃 · 觉醒：镇魂钟 / 摄魂铃 */
function updateBellAwake(dt, form) {
  const p = G.player;
  const mutated = form === 'mutate';
  const auraR = mutated ? 240 : 220;
  // 常在减速场
  for (const e of G.enemies) {
    if (!e.alive) continue;
    if (dist2(p.x, p.y, e.x, e.y) < auraR * auraR) { e.slow = 0.45; e.slowT = 0.4; }
  }
  p.cd.bell = (p.cd.bell || 0) - dt;
  if (p.cd.bell > 0) return;
  p.cd.bell = mutated ? 1.6 : 1.25;
  const dmg = 13 * 1.6 * p.dmgMul * (mutated ? 2.2 : 2.0);

  for (let i = 0; i < 3; i++) {
    ring(p.x, p.y, auraR * (1 - i * 0.16), i === 0 ? '#ffd79a' : '#ffeccb', 0.85 - i * 0.12, 9 - i * 2);
  }
  ring(p.x, p.y, auraR * 0.55, '#8fe6cd', 0.5, 4);
  Sound.bell(); shake(5);
  hitArea(p.x, p.y, auraR, dmg, { knock: 360 });
  for (const e of G.enemies) {
    if (e.alive && dist2(p.x, p.y, e.x, e.y) < auraR * auraR) { e.slow = 0.7; e.slowT = 1.6; }
  }
  G.flash = Math.max(G.flash, 0.08); G.flashColor = '#ffe6b8';

  if (mutated) {
    // 摄魂铃：链式穿透，链上每一环都会再炸一次
    const list = G.enemies.filter(e => e.alive && dist2(p.x, p.y, e.x, e.y) < 460 * 460)
      .sort((a, b) => dist2(p.x, p.y, a.x, a.y) - dist2(p.x, p.y, b.x, b.y)).slice(0, 8);
    let px = p.x, py = p.y;
    for (const e of list) {
      G.arcs.push({ x1: px, y1: py, x2: e.x, y2: e.y, life: 0.3, max: 0.3 });
      damageEnemy(e, dmg * 0.8, { knock: 60, fromX: p.x, fromY: p.y });
      e.judgeT = 0.55;
      e.judgeDmg = dmg * 0.7;
      px = e.x; py = e.y;
    }
    if (list.length) { shake(5); Sound.crit(); }
  }
}

/* ── 显形（铜镜标记）── */
function markEnemy(e, sec, mul) {
  e.markT = Math.max(e.markT || 0, sec);
  e.markMul = Math.max(e.markMul || 1, mul);
}

function updateMarks(dt) {
  const p = G.player;
  for (const e of G.enemies) {
    if (!e.alive) continue;
    if (e.markT > 0) {
      e.markT -= dt;
      if (e.markT <= 0) { e.markT = 0; e.markMul = 1; }
    }
    if (e.judgeT > 0) {
      e.judgeT -= dt;
      if (e.judgeT <= 0) {
        e.judgeT = 0;
        ring(e.x, e.y, 78, '#ffd489', 0.5, 5);
        burst(e.x, e.y, 16, '#ffe6b0', { spd: 280, size: 3.4, life: 0.6 });
        hitArea(e.x, e.y, 72, e.judgeDmg || 60, { knock: 120 });
        shake(4); Sound.boom();
      }
    }
  }
}

/* 罗盘：磁针 / 司南阵 / 天机劫 */
function updateCompass(dt, lv, form) {
  const p = G.player;
  p.dialAng = (p.dialAng || 0) + dt * 1.4;

  if (form === 'awake') {
    // 司南：盘面展开，四方针芒
    p.cd.compass = (p.cd.compass || 0) - dt;
    if (p.cd.compass <= 0) {
      p.cd.compass = 0.9 / p.atkMul;
      const base = p.dialAng * 0.9;
      for (let i = 0; i < 4; i++) {
        const a = base + i / 4 * TAU;
        G.shots.push({
          type: 'needle', x: p.x, y: p.y, vx: Math.cos(a) * 760, vy: Math.sin(a) * 760,
          dmg: 26 * (1 + (lv - 1) * 0.18) * p.dmgMul * 1.5, pierce: 5, life: 0.75,
          rot: a, hitSet: new Set(), big: true
        });
        G.ringFx.push({ x: p.x, y: p.y, ang: a, life: 0.3, max: 0.3 });
      }
      Sound.crit();
    }
    // 盘面针轮持续伤害
    p.cd.cring = (p.cd.cring || 0) - dt;
    if (p.cd.cring <= 0) {
      p.cd.cring = 0.4;
      for (let i = 0; i < 8; i++) {
        const a = p.dialAng + i / 8 * TAU;
        const nx = p.x + Math.cos(a) * 116, ny = p.y + Math.sin(a) * 116;
        for (const e of G.enemies) {
          if (!e.alive || e.needleCd > 0) continue;
          if (dist2(nx, ny, e.x, e.y) < (e.r + 16) * (e.r + 16)) {
            e.needleCd = 0.45;
            damageEnemy(e, 20 * p.dmgMul, { knock: 80, fromX: p.x, fromY: p.y });
          }
        }
      }
    }
    return;
  }

  if (form === 'mutate') {
    // 天机劫：点名 + 光柱贯穿
    p.cd.compass = (p.cd.compass || 0) - dt;
    if (p.cd.compass <= 0) {
      p.cd.compass = 1.9 / p.atkMul;
      const list = G.enemies.filter(e => e.alive && dist2(p.x, p.y, e.x, e.y) < 520 * 520)
        .sort((a, b) => dist2(p.x, p.y, a.x, a.y) - dist2(p.x, p.y, b.x, b.y)).slice(0, 6);
      for (const e of list) {
        e.judgeT = 0.85;
        e.judgeDmg = 82 * p.dmgMul;
      }
      G.dialPulse = 1;
      Sound.crit();
    }
    for (const e of G.enemies) {
      if (e.alive && e.judgeT > 0 && Math.random() < 0.25) {
        G.beams.push({ x1: p.x, y1: p.y, x2: e.x, y2: e.y, life: 0.12, max: 0.12 });
      }
    }
    return;
  }

  // 基础：磁针齐射
  p.cd.compass = (p.cd.compass || 0) - dt;
  if (p.cd.compass > 0) return;
  const tgt = nearestEnemy(p.x, p.y, 560);
  if (!tgt) { p.cd.compass = 0.15; return; }
  p.cd.compass = 1.2 / p.atkMul;
  const dmg = 24 * (1 + (lv - 1) * 0.18) * p.dmgMul;
  const base = Math.atan2(tgt.y - p.y, tgt.x - p.x);
  for (let i = 0; i < lv; i++) {
    const a = base + (i - (lv - 1) / 2) * 0.16;
    G.shots.push({ type: 'needle', x: p.x, y: p.y, vx: Math.cos(a) * 760, vy: Math.sin(a) * 760, dmg, pierce: 2, life: 0.9, rot: a, hitSet: new Set() });
  }
  Sound.crit();
}

/* 纸伞 */
function spawnDragon(x, y, ang, dmg, style) {
  G.shots.push({
    type: 'dragon', x, y, ang, t: 0, life: 2.6, dmg, style,
    trail: [], theta: ang, R: 170, dir: Math.random() < 0.5 ? 1 : -1, radius: 26
  });
}

function updateUmbrella(dt, lv, form) {
  const p = G.player;
  const awake = form === 'awake', mut = form === 'mutate';
  const rad = mut ? 96 : awake ? 90 : 58 + lv * 3;
  p.umbAng = (p.umbAng || 0) + dt * (awake ? 6.4 : mut ? 3.2 : 3.6);
  const dmg = 16 * (1 + (lv - 1) * 0.16) * p.dmgMul * (awake ? 2.1 : mut ? 2.0 : 1);

  if (!mut) {
    for (let i = 0; i < 4; i++) {
      const a = p.umbAng + i * TAU / 4;
      const ux = p.x + Math.cos(a) * rad, uy = p.y + Math.sin(a) * rad * 0.92;
      for (const e of G.enemies) {
        if (!e.alive || e.umbCd > 0) continue;
        if (dist2(ux, uy, e.x, e.y) < (e.r + 24) * (e.r + 24)) {
          e.umbCd = 0.42;
          damageEnemy(e, dmg, { knock: 190, fromX: p.x, fromY: p.y });
          burst(ux, uy, 3, '#fff0c8', { spd: 140, size: 2.2, life: 0.28 });
        }
      }
    }
  } else {
    // 无字伞：领域
    p.cd.umb = (p.cd.umb || 0) - dt;
    if (p.cd.umb <= 0) {
      p.cd.umb = 0.45;
      ring(p.x, p.y, 172, '#e8dcc0', 0.5, 3);
      for (const e of G.enemies) {
        if (!e.alive) continue;
        if (dist2(p.x, p.y, e.x, e.y) < 172 * 172) {
          e.slow = 0.62; e.slowT = 0.5;
          damageEnemy(e, dmg * 0.5, { knock: 20, fromX: p.x, fromY: p.y });
        }
      }
    }
  }

  p.cd.umbShot = (p.cd.umbShot || 0) - dt;
  if (p.cd.umbShot <= 0) {
    p.cd.umbShot = (awake ? 1.35 : mut ? 1.55 : 2.6) / p.atkMul;
    const tgt = nearestEnemy(p.x, p.y, 520);
    const base = tgt ? Math.atan2(tgt.y - p.y, tgt.x - p.x) : p.umbAng;
    if (awake || mut) {
      // 一长串伞骨连成游龙，在怪群里盘绕
      spawnDragon(p.x, p.y, base, dmg * 0.9, awake ? 'gold' : 'bone');
      if (awake) spawnDragon(p.x, p.y, base + Math.PI * 0.72, dmg * 0.7, 'gold');
      Sound.boom(); shake(2);
    } else {
      const n = 2 + lv;
      for (let i = 0; i < n; i++) {
        const a = base + (i - (n - 1) / 2) * 0.34;
        G.shots.push({ type: 'rib', x: p.x, y: p.y, vx: Math.cos(a) * 540, vy: Math.sin(a) * 540, dmg: dmg * 0.85, pierce: 1, life: 1.3, rot: a, hitSet: new Set() });
      }
      Sound.sword();
    }
  }
}

/* 铜镜：光矛 / 日月镜阵 / 照骨镜 */
function updateMirror(dt, lv, form) {
  const p = G.player;
  const awake = form === 'awake';
  const mut = form === 'mutate';
  const dmg = 26 * (1 + (lv - 1) * 0.17) * p.dmgMul * (awake ? 1.5 : mut ? 1.35 : 1);
  const mul = 1.2 + (lv - 1) * 0.06 + (mut ? 0.1 : 0);

  // 镜阵：三面镜子绕身（觉醒）
  if (awake) {
    if (!p.shards) p.shards = [0, 1, 2].map(i => ({ ang: i / 3 * TAU, cd: rnd(0.8, 0.1) }));
    for (const sh of p.shards) {
      sh.ang += dt * 1.1;
      sh.cd -= dt;
      if (sh.cd > 0) continue;
      const tgt = nearestEnemy(p.x, p.y, 520, e => !e.lanceHit);
      if (!tgt) { sh.cd = 0.2; continue; }
      sh.cd = 0.85;
      const a = Math.atan2(tgt.y - p.y, tgt.x - p.x);
      G.shots.push({
        type: 'lance', x: p.x + Math.cos(sh.ang) * 46, y: p.y + Math.sin(sh.ang) * 46,
        vx: Math.cos(a) * 900, vy: Math.sin(a) * 900, dmg: dmg * 0.8, life: 0.55,
        rot: a, hitSet: new Set(), pierce: 3, mark: mul, style: 'day'
      });
    }
    // 双光扫射
    p.mirAng = (p.mirAng || 0) + dt * 2.2;
    p.cd.mir = (p.cd.mir || 0) - dt;
    if (p.cd.mir <= 0) {
      p.cd.mir = 0.3;
      for (const off of [0, Math.PI]) {
        const a = p.mirAng + off;
        for (const e of G.enemies) {
          if (!e.alive || e.mirCd > 0) continue;
          const d = dist(p.x, p.y, e.x, e.y);
          if (d > 300) continue;
          let da = Math.atan2(e.y - p.y, e.x - p.x) - a;
          while (da > Math.PI) da -= TAU;
          while (da < -Math.PI) da += TAU;
          if (Math.abs(da) < 0.24) {
            e.mirCd = 0.4;
            damageEnemy(e, dmg * 0.55, { knock: 20, fromX: p.x, fromY: p.y });
            markEnemy(e, 2.4, mul);
          }
        }
      }
    }
    return;
  }

  // 基础 / 变异：光矛（直射贯穿）
  p.cd.mir = (p.cd.mir || 0) - dt;
  if (p.cd.mir > 0) return;
  const tgt = nearestEnemy(p.x, p.y, 560);
  if (!tgt) { p.cd.mir = 0.18; return; }
  p.cd.mir = (mut ? 1.6 : 1.9) / p.atkMul;
  const a = Math.atan2(tgt.y - p.y, tgt.x - p.x);
  const n = mut ? 3 : 1;
  for (let i = 0; i < n; i++) {
    const off = (i - (n - 1) / 2) * 0.16;
    G.shots.push({
      type: 'lance', x: p.x, y: p.y,
      vx: Math.cos(a + off) * 980, vy: Math.sin(a + off) * 980,
      dmg: dmg * (mut ? 0.8 : 1), life: 0.6, rot: a + off,
      hitSet: new Set(), pierce: mut ? 4 : 3, mark: mul, style: mut ? 'bone' : 'plain'
    });
  }
  Sound.talisman();
}

function updateWeapons(dt) {
  const p = G.player;
  p.cd = p.cd || {};

  if (wLevel('flame') > 0) {
    const f = awForm('flame');
    if (f) updateFlameAwake(dt, f);
    else {
      const s = weaponStats('flame', wLevel('flame'));
      p.flameAng += dt * 2.1;
      for (let i = 0; i < s.orbs; i++) {
        const a = p.flameAng + i * TAU / s.orbs;
        const fx = p.x + Math.cos(a) * s.rad, fy = p.y + Math.sin(a) * s.rad * 0.82;
        for (const e of G.enemies) {
          if (!e.alive || e.flameCd > 0) continue;
          if (dist2(fx, fy, e.x, e.y) < (e.r + 16) * (e.r + 16)) {
            e.flameCd = 0.42;
            damageEnemy(e, s.dmg, { knock: 40, fromX: p.x, fromY: p.y });
            burst(fx, fy, 3, '#ffb35c', { spd: 120, size: 2.4, life: 0.3 });
          }
        }
      }
      const aura = 30 + wLevel('flame') * 3;
      const admg = s.dmg * 1.15;
      for (const e of G.enemies) {
        if (!e.alive || e.flameCd > 0) continue;
        if (dist2(p.x, p.y, e.x, e.y) < (aura + e.r) * (aura + e.r)) {
          e.flameCd = 0.4;
          damageEnemy(e, admg, { knock: 90, fromX: p.x, fromY: p.y });
          burst(e.x, e.y, 3, '#ffb35c', { spd: 110, size: 2, life: 0.3 });
        }
      }
    }
  }

  if (wLevel('talisman') > 0) {
    const f = awForm('talisman');
    if (f) updateTalismanAwake(dt, f);
    else {
      p.cd.talisman = (p.cd.talisman || 0) - dt;
      if (p.cd.talisman <= 0) {
        const t = nearestEnemy(p.x, p.y, 430);
        if (t) {
          const s = weaponStats('talisman', wLevel('talisman'));
          p.cd.talisman = s.cd;
          const a = Math.atan2(t.y - p.y, t.x - p.x);
          G.shots.push({ type: 'talisman', x: p.x, y: p.y, vx: Math.cos(a) * 480, vy: Math.sin(a) * 480, dmg: s.dmg, radius: s.radius, life: 1.6, rot: a, spin: 12 });
          Sound.talisman();
        }
      }
    }
  }

  if (wLevel('sword') > 0) {
    const f = awForm('sword');
    if (f) updateSwordAwake(dt, f);
    else {
      p.cd.sword = (p.cd.sword || 0) - dt;
      if (p.cd.sword <= 0) {
        const s = weaponStats('sword', wLevel('sword'));
        const ang = p.face > 0 ? 0 : Math.PI;
        p.cd.sword = s.cd;
        G.shots.push({ type: 'moonwave', x: p.x, y: p.y, vx: Math.cos(ang) * 620, vy: Math.sin(ang) * 620, dmg: s.dmg * 0.9, life: 0.55, rot: ang, w: 44, len: 110, hitSet: new Set() });
        G.slashes.push({ x: p.x, y: p.y, ang, arc: s.arc, range: s.range, life: 0.22, max: 0.22 });
        Sound.sword();
        for (const e of G.enemies) {
          if (!e.alive) continue;
          const d = dist(p.x, p.y, e.x, e.y);
          if (d > s.range + e.r) continue;
          let da = Math.atan2(e.y - p.y, e.x - p.x) - ang;
          while (da > Math.PI) da -= TAU;
          while (da < -Math.PI) da += TAU;
          if (Math.abs(da) < s.arc / 2 + 0.35) {
            damageEnemy(e, s.dmg, { knock: 240, fromX: p.x, fromY: p.y });
            burst(e.x, e.y, 4, '#ffe6b0', { spd: 200, size: 2, life: 0.28 });
          }
        }
        shake(1.6);
      }
    }
  }

  if (wLevel('bell') > 0) {
    const f = awForm('bell');
    if (f) updateBellAwake(dt, f);
    else {
      p.cd.bell = (p.cd.bell || 0) - dt;
      if (p.cd.bell <= 0) {
        const s = weaponStats('bell', wLevel('bell'));
        p.cd.bell = s.cd;
        ring(p.x, p.y, s.radius, '#8fe6cd', 0.55, 5);
        ring(p.x, p.y, s.radius * 0.66, '#8fe6cd', 0.42, 3);
        Sound.bell();
        shake(3);
        for (const e of G.enemies) {
          if (!e.alive) continue;
          if (dist(p.x, p.y, e.x, e.y) < s.radius + e.r) {
            damageEnemy(e, s.dmg, { knock: 300, fromX: p.x, fromY: p.y });
            e.slow = 0.45; e.slowT = 1.4;
          }
        }
      }
    }
  }

  if (wLevel('compass') > 0) updateCompass(dt, wLevel('compass'), awForm('compass'));
  if (wLevel('umbrella') > 0) updateUmbrella(dt, wLevel('umbrella'), awForm('umbrella'));
  if (wLevel('mirror') > 0) updateMirror(dt, wLevel('mirror'), awForm('mirror'));

  if (wLevel('kite') > 0) {
    const f = awForm('kite');
    if (f) updateKiteAwake(dt, f);
    else {
      p.cd.kite = (p.cd.kite || 0) - dt;
      if (p.cd.kite <= 0) {
        const s = weaponStats('kite', wLevel('kite'));
        p.cd.kite = s.cd;
        for (let i = 0; i < s.count; i++) {
          const a = rnd(TAU);
          G.shots.push({
            type: 'kite', x: p.x, y: p.y, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240,
            dmg: s.dmg, pierce: s.pierce, life: 3.2, rot: a, hitSet: new Set(), wob: rnd(TAU)
          });
        }
        Sound.talisman();
      }
    }
  }
}

/* ───────────────────────── 玩家 ───────────────────────── */
function hitPlayer(amount, srcX, srcY) {
  const p = G.player;
  if (p.inv > 0) return;
  const dmg = Math.max(1, amount * (1 - p.dr));
  p.hp -= dmg;
  p.inv = 0.72;
  p.hurtT = 0.4;
  shake(6);
  hitstop(35);
  Sound.hurt();
  haptic(22);
  G.flash = 0.22; G.flashColor = '#d9503f';
  burst(p.x, p.y, 10, '#e0654f', { spd: 170, size: 3, life: 0.5 });
  const a = Math.atan2(p.y - (isFinite(srcY) ? srcY : p.y), p.x - (isFinite(srcX) ? srcX : p.x));
  if (isFinite(a)) { p.vx += Math.cos(a) * 150; p.vy += Math.sin(a) * 150; }
  if (p.hp <= 0) {
    if (G.tut) { p.hp = p.hpMax * 0.5; p.inv = 1.4; toast('别怕，教程里灯不会灭'); }
    else { p.hp = 0; endRun(false); }
  }
}

function updatePlayer(dt) {
  const p = G.player;
  if (!p) return;
  readStick();
  const sp = p.speed * (1 - (p.slow || 0));
  const mx = IN.dx * IN.mag, my = IN.dy * IN.mag;
  const ml = Math.hypot(mx, my);
  if (ml > 0.01) {
    p.vx = lerp(p.vx, (mx / Math.max(1, ml)) * sp * Math.min(1, ml), 1 - Math.pow(0.0001, dt));
    p.vy = lerp(p.vy, (my / Math.max(1, ml)) * sp * Math.min(1, ml), 1 - Math.pow(0.0001, dt));
    p.walk += dt * (6 + ml * 5);
    if (Math.abs(mx) > 0.15) p.face = mx > 0 ? 1 : -1;
    if (Math.hypot(mx, my) > 0.25) p.aim = Math.atan2(my, mx);
  } else {
    p.vx *= Math.pow(0.0004, dt);
    p.vy *= Math.pow(0.0004, dt);
    p.walk += dt * 1.2;
  }
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  if (p.inv > 0) p.inv -= dt;
  if (p.hurtT > 0) p.hurtT -= dt;
  if (p.regen > 0 && p.hp < p.hpMax) p.hp = Math.min(p.hpMax, p.hp + p.regen * dt);
  p.slow = Math.max(0, (p.slow || 0) - dt * 2);
}

/* ───────────────────────── 敌人更新 ───────────────────────── */
function updateEnemies(dt) {
  const p = G.player;
  const grid = new Map();
  const CELL = 52;
  for (const e of G.enemies) {
    if (!e.alive) continue;
    const gx = Math.floor(e.x / CELL), gy = Math.floor(e.y / CELL);
    const key = gx + ',' + gy;
    let a = grid.get(key);
    if (!a) { a = []; grid.set(key, a); }
    a.push(e);
  }

  for (const e of G.enemies) {
    if (!e.alive) {
      e.dying += dt;
      continue;
    }
    e.t += dt;
    if (e.flash > 0) e.flash -= dt * 4;
    if (e.hitFlash > 0) e.hitFlash -= dt * 4;
    if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slow = 0; }
    if (e.flameCd > 0) e.flameCd -= dt;
    if (e.umbCd > 0) e.umbCd -= dt;
    if (e.mirCd > 0) e.mirCd -= dt;
    if (e.needleCd > 0) e.needleCd -= dt;
    if (e.dragonCd > 0) e.dragonCd -= dt;
    if (e.burn > 0) {
      e.burn -= dt;
      e.burnTick -= dt;
      if (e.burnTick <= 0) {
        e.burnTick = 0.4;
        damageEnemy(e, (e.burnDps || 0) * 0.4, { silent: true, canCrit: false });
        if (Math.random() < 0.5) G.parts.push({ x: e.x + rnd(6, -6), y: e.y - 4, vx: rnd(16, -16), vy: rnd(-40, -70), life: 0.5, max: 0.5, size: 2.2, col: '#ff9a5a', type: 'spark', drag: 1.5, grav: -20 });
      }
    }
    if (e.atkCd > 0) e.atkCd -= dt;

    // 击退速度
    e.x += e.kx * dt; e.y += e.ky * dt;
    e.kx *= Math.pow(0.0016, dt); e.ky *= Math.pow(0.0016, dt);

    const dx = p.x - e.x, dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const ux = dx / d, uy = dy / d;
    // 掉队太远的拉回视野外圈，保证同屏密度
    if (d > 1500) {
      const na = rnd(TAU);
      e.x = p.x + Math.cos(na) * 620;
      e.y = p.y + Math.sin(na) * 620;
      continue;
    }
    let spd = e.spd * (1 - e.slow);

    if (e.boss) {
      updateBoss(e, dt, ux, uy, d);
    } else if (e.type === 'zhu') {
      e.dashCd -= dt;
      if (e.dashing > 0) {
        e.dashing -= dt;
        e.x += ux * 330 * dt; e.y += uy * 330 * dt;
        if (Math.random() < 0.5) G.parts.push({ x: e.x, y: e.y, vx: rnd(20, -20), vy: rnd(20, -20), life: 0.3, max: 0.3, size: 2.4, col: '#b489d6', type: 'dot', drag: 3 });
      } else {
        if (e.dashCd <= 0 && d < 300) {
          e.dashCd = rnd(2.8, 1.6); e.dashing = 0.26;
          burst(e.x, e.y, 4, '#b489d6', { spd: 90, size: 2, life: 0.3 });
        }
        e.x += ux * spd * dt; e.y += uy * spd * dt;
      }
    } else if (e.type === 'mei') {
      const drift = Math.sin(e.t * 1.8 + e.anim) * 0.45;
      e.x += (ux * spd + -uy * spd * drift) * dt;
      e.y += (uy * spd + ux * spd * drift) * dt;
    } else {
      e.x += ux * spd * dt; e.y += uy * spd * dt;
    }

    // 分离，避免叠在一起
    const gx = Math.floor(e.x / CELL), gy = Math.floor(e.y / CELL);
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
      const arr = grid.get((gx + ox) + ',' + (gy + oy));
      if (!arr) continue;
      for (const o of arr) {
        if (o === e || !o.alive) continue;
        const ddx = e.x - o.x, ddy = e.y - o.y;
        const dd = ddx * ddx + ddy * ddy;
        const minD = (e.r + o.r) * 0.92;
        if (dd < minD * minD && dd > 0.001) {
          const dl = Math.sqrt(dd);
          const push = (minD - dl) / minD * 70 * dt;
          e.x += ddx / dl * push; e.y += ddy / dl * push;
        }
      }
    }

    // 触碰伤害
    if (d < e.r + p.r + 2 && e.atkCd <= 0) {
      e.atkCd = 0.75;
      hitPlayer(e.dmg, e.x, e.y);
    }
  }

  // 清理
  if (G.enemies.length > 0) G.enemies = G.enemies.filter(e => e.alive || e.dying < 0.8);
}

function updateBoss(e, dt, ux, uy, d) {
  e.pT += dt;
  e.summonT -= dt;
  if (e.windup > 0) {
    e.windup -= dt;
    if (e.windup <= 0) {
      // 冲锋
      e.charge = 0.5;
      e.cvx = Math.cos(e.windDir) * 620; e.cvy = Math.sin(e.windDir) * 620;
      shake(9); Sound.boom();
    }
    return;
  }
  if (e.charge > 0) {
    e.charge -= dt;
    e.x += e.cvx * dt; e.y += e.cvy * dt;
    if (Math.random() < 0.7) burst(e.x, e.y, 2, '#d9503f', { spd: 70, size: 4, life: 0.4, type: 'ink' });
    return;
  }
  // 接近
  if (d > 70) { e.x += ux * e.spd * dt; e.y += uy * e.spd * dt; }
  // 冲锋预备
  if (e.pT > 3.4) {
    e.pT = 0;
    e.windup = 0.85;
    e.windDir = Math.atan2(G.player.y - e.y, G.player.x - e.x);
    ring(e.x, e.y, 90, '#d9503f', 0.5, 3);
    Sound.boss();
  }
  // 召唤
  if (e.summonT <= 0) {
    e.summonT = 7.5;
    ring(e.x, e.y, 140, '#e0a04a', 0.6, 4);
    for (let i = 0; i < 4; i++) spawnEnemy('chi', { ang: rnd(TAU), rad: 70, hpMul: 1.2 });
    shake(5);
  }
}

/* ───────────────────────── 子弹 / 掉落 ───────────────────────── */
function updateShots(dt) {
  const p = G.player;

  for (const s of G.shots) {
    if (s.alive === false) continue;
    s.life -= dt;

    if (s.type === 'talisman') {
      if (s.home) {
        const tgt = nearestEnemy(s.x, s.y, 420);
        if (tgt) {
          const a = Math.atan2(tgt.y - s.y, tgt.x - s.x);
          const sp = 470;
          s.vx = lerp(s.vx, Math.cos(a) * sp, 1 - Math.pow(0.002, dt));
          s.vy = lerp(s.vy, Math.sin(a) * sp, 1 - Math.pow(0.002, dt));
        }
      }
      s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.spin * dt;
      let hit = false;
      for (const e of G.enemies) {
        if (!e.alive) continue;
        if (dist2(s.x, s.y, e.x, e.y) < (e.r + 9) * (e.r + 9)) { hit = true; break; }
      }
      if (hit || s.life <= 0) {
        s.alive = false;
        if (s.seal) {
          G.seals.push({ x: s.x, y: s.y, t: 0, delay: 0.28, dmg: s.dmg, radius: s.radius, stage: 0 });
          ring(s.x, s.y, s.radius * 0.7, '#ff8f6b', 0.3, 3);
          Sound.talisman();
        } else {
          G.sealRings = G.sealRings || [];
          G.sealRings.push({ x: s.x, y: s.y, life: 0.4, max: 0.4, r: 0, rMax: s.radius, col: '#ffd489' });
          for (let i = 0; i < 5; i++) {
            const px = s.x + rnd(s.radius * 0.7, -s.radius * 0.7);
            const py = s.y + rnd(20, -20);
            G.parts.push({ x: px, y: py, vx: 0, vy: rnd(-260, -420), life: 0.7, max: 0.7, size: 2.6, col: '#ffe6b0', type: 'spark', drag: 0.6 });
          }
          ring(s.x, s.y, s.radius, '#f0c674', 0.42, 4);
          burst(s.x, s.y, 12, '#ffd489', { spd: 230, size: 3, life: 0.45 });
          Sound.boom();
          shake(2.5);
          hitArea(s.x, s.y, s.radius, s.dmg, { knock: 150 });
        }
      }
    } else if (s.type === 'lance') {
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (!s.hitSet) s.hitSet = new Set();
      for (const e of G.enemies) {
        if (!e.alive || s.hitSet.has(e)) continue;
        if (dist2(s.x, s.y, e.x, e.y) < (e.r + 12) * (e.r + 12)) {
          s.hitSet.add(e);
          damageEnemy(e, s.dmg, { knock: 90, fromX: s.x - s.vx * 0.05, fromY: s.y - s.vy * 0.05 });
          markEnemy(e, 4, s.mark || 1.2);
          burst(e.x, e.y, 4, s.style === 'bone' ? '#f2ead6' : '#dcecff', { spd: 240, size: 2.4, life: 0.3 });
          s.pierce--;
          if (s.pierce <= 0) { s.alive = false; break; }
        }
      }
      if (s.life <= 0) s.alive = false;
    } else if (s.type === 'moonwave' || s.type === 'crescent') {
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (!s.hitSet) s.hitSet = new Set();
      const w = s.w || 30, len = s.len || 150;
      const cx0 = -len * 0.3;
      const R0 = len, R1 = len - w;
      const cosR = Math.cos(-s.rot), sinR = Math.sin(-s.rot);
      for (const e of G.enemies) {
        if (!e.alive || s.hitSet.has(e)) continue;
        const dx = e.x - s.x, dy = e.y - s.y;
        const lx = dx * cosR - dy * sinR;
        const ly = dx * sinR + dy * cosR;
        const dd = Math.hypot(lx - cx0, ly);
        if (dd > R0 + e.r || dd < R1 - e.r) continue;
        const ang = Math.atan2(ly, lx - cx0);
        if (Math.abs(ang) > 0.9) continue;
        s.hitSet.add(e);
        damageEnemy(e, s.dmg, { knock: 160, fromX: s.x - s.vx * 0.08, fromY: s.y - s.vy * 0.08 });
        burst(e.x, e.y, 4, '#cfe9ff', { spd: 220, size: 2.6, life: 0.3 });
      }
      if (s.life <= 0) s.alive = false;
    } else if (s.type === 'needle' || s.type === 'rib') {
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (!s.hitSet) s.hitSet = new Set();
      const reach = s.type === 'needle' ? 12 : 14;
      for (const e of G.enemies) {
        if (!e.alive || s.hitSet.has(e)) continue;
        if (dist2(s.x, s.y, e.x, e.y) < (e.r + reach) * (e.r + reach)) {
          s.hitSet.add(e);
          damageEnemy(e, s.dmg, { knock: 140, fromX: s.x - s.vx * 0.08, fromY: s.y - s.vy * 0.08 });
          burst(s.x, s.y, 3, s.type === 'needle' ? '#cfe9ff' : '#fff0c8', { spd: 200, size: 2, life: 0.25 });
          if (s.pierce !== undefined) {
            s.pierce--;
            if (s.pierce <= 0) { s.alive = false; break; }
          }
        }
      }
      if (s.life <= 0) s.alive = false;
    } else if (s.type === 'lance') {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(Math.atan2(s.vy, s.vx));
      const bone = s.style === 'bone';
      // 拖尾光带
      const tg = ctx.createLinearGradient(-120, 0, 14, 0);
      tg.addColorStop(0, 'rgba(255,255,255,0)');
      tg.addColorStop(0.55, bone ? 'rgba(240,236,220,0.35)' : 'rgba(200,226,255,0.35)');
      tg.addColorStop(1, bone ? 'rgba(255,252,240,0.95)' : 'rgba(235,246,255,0.95)');
      ctx.strokeStyle = tg;
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-120, 0); ctx.lineTo(10, 0); ctx.stroke();
      // 核心
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(16, 0); ctx.stroke();
      // 枪头
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(12, -4.5); ctx.lineTo(12, 4.5); ctx.closePath(); ctx.fill();
      // 镜光
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = bone ? '#f6efdc' : '#d8ecff';
      ctx.beginPath(); ctx.arc(12, 0, 9, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    } else if (s.type === 'dragon') {
      s.t += dt;
      // 盘绕玩家游走，而不是直线飞走
      s.theta += s.t * 0 + dt * 2.9 * s.dir;
      const R = 150 + Math.sin(s.t * 2.6) * 55;
      const px = G.player.x + Math.cos(s.theta) * R;
      const py = G.player.y + Math.sin(s.theta) * R * 0.82;
      s.x = px; s.y = py;
      s.trail.push({ x: px, y: py });
      if (s.trail.length > 46) s.trail.shift();
      for (const e of G.enemies) {
        if (!e.alive) continue;
        if (e.dragonCd > 0) continue;
        if (dist2(s.x, s.y, e.x, e.y) < (e.r + s.radius) * (e.r + s.radius)) {
          e.dragonCd = 0.28;
          damageEnemy(e, s.dmg, { knock: 260, fromX: s.x, fromY: s.y });
          burst(e.x, e.y, 4, s.style === 'gold' ? '#ffd489' : '#e8e2d0', { spd: 200, size: 2.6, life: 0.3 });
        }
      }
      if (s.life <= 0) s.alive = false;
    } else if (s.type === 'crane') {
      const tgt = nearestEnemy(s.x, s.y, 620, e => !s.hitSet.has(e));
      if (tgt) {
        const a = Math.atan2(tgt.y - s.y, tgt.x - s.x);
        const ca = Math.atan2(s.vy, s.vx);
        let da = a - ca;
        while (da > Math.PI) da -= TAU;
        while (da < -Math.PI) da += TAU;
        const na = ca + clamp(da, -7 * dt, 7 * dt);
        s.vx = Math.cos(na) * 330; s.vy = Math.sin(na) * 330;
      }
      s.x += s.vx * dt; s.y += s.vy * dt;
      s.rot = Math.atan2(s.vy, s.vx);
      s.wob += dt * 9;
      if (Math.random() < 0.6) G.parts.push({ x: s.x, y: s.y, vx: rnd(20, -20), vy: rnd(20, -20), life: 0.5, max: 0.5, size: 3, col: '#fff6e0', type: 'spark', drag: 2 });
      for (const e of G.enemies) {
        if (!e.alive || s.hitSet.has(e)) continue;
        if (dist2(s.x, s.y, e.x, e.y) < (e.r + 16) * (e.r + 16)) {
          s.alive = false;
          ring(s.x, s.y, 120, '#fff2d2', 0.55, 6);
          burst(s.x, s.y, 22, '#fff8e6', { spd: 300, size: 3.4, life: 0.7 });
          hitArea(s.x, s.y, 112, s.dmg, { knock: 320 });
          shake(6); Sound.boom();
          break;
        }
      }
      if (s.life <= 0) s.alive = false;
    } else if (s.type === 'kite') {
      const tgt = nearestEnemy(s.x, s.y, 520, e => !s.hitSet.has(e));
      if (tgt) {
        const a = Math.atan2(tgt.y - s.y, tgt.x - s.x);
        const ca = Math.atan2(s.vy, s.vx);
        let da = a - ca;
        while (da > Math.PI) da -= TAU;
        while (da < -Math.PI) da += TAU;
        const na = ca + clamp(da, -6 * dt, 6 * dt);
        const sp = Math.hypot(s.vx, s.vy) || 300;
        s.vx = Math.cos(na) * sp; s.vy = Math.sin(na) * sp;
      }
      s.x += s.vx * dt; s.y += s.vy * dt;
      s.rot = Math.atan2(s.vy, s.vx);
      s.wob += dt * 12;
      if (Math.random() < 0.35) {
        G.parts.push({ x: s.x - s.vx * 0.02, y: s.y - s.vy * 0.02, vx: rnd(14, -14), vy: rnd(14, -14), life: 0.35, max: 0.35, size: 1.8, col: '#fff6e0', type: 'spark', drag: 2 });
      }
      if (s.big && Math.random() < 0.55) {
        G.parts.push({ x: s.x - s.vx * 0.02, y: s.y - s.vy * 0.02, vx: rnd(24, -24), vy: rnd(24, -24), life: 0.45, max: 0.45, size: 2.6, col: '#fff8e8', type: 'spark', drag: 2 });
      }
      for (const e of G.enemies) {
        if (!e.alive || s.hitSet.has(e)) continue;
        if (dist2(s.x, s.y, e.x, e.y) < (e.r + 10) * (e.r + 10)) {
          s.hitSet.add(e);
          damageEnemy(e, s.dmg, { knock: 90, fromX: s.x, fromY: s.y });
          if (s.boom && s.pierce <= 1) {
            ring(s.x, s.y, s.boom, '#fff0c8', 0.4, 3);
            hitArea(s.x, s.y, s.boom, s.dmg * 0.55, { knock: 120 });
            burst(s.x, s.y, 8, '#ffe6b0', { spd: 200, size: 2.6, life: 0.4 });
          }
          s.pierce--;
          if (s.pierce <= 0) { s.alive = false; break; }
        }
      }
      if (s.life <= 0) s.alive = false;
    }
  }

  G.shots = G.shots.filter(s => s.alive !== false && s.life > 0);
}

function updateOrbs(dt) {
  const p = G.player;
  for (const o of G.orbs) {
    o.t += dt;
    const d = dist(p.x, p.y, o.x, o.y);
    if (!o.pull && d < p.pickup * 1.9) o.pull = true;
    if (o.pull) {
      const a = Math.atan2(p.y - o.y, p.x - o.x);
      const sp = 260 + (p.pickup - d) * 2.4;
      o.vx = lerp(o.vx, Math.cos(a) * sp, 1 - Math.pow(0.0001, dt));
      o.vy = lerp(o.vy, Math.sin(a) * sp, 1 - Math.pow(0.0001, dt));
    } else {
      o.vx *= Math.pow(0.02, dt); o.vy *= Math.pow(0.02, dt);
    }
    o.x += o.vx * dt; o.y += o.vy * dt;
    if (d < p.r + 12) {
      o.alive = false;
      if (o.oil) {
        p.hp = Math.min(p.hpMax, p.hp + 28);
        dmgText(p.x, p.y - 34, '+22', '#7fe0bc', 15);
        burst(p.x, p.y, 8, '#7fe0bc', { spd: 120, size: 2.4, life: 0.5 });
        Sound.pickup();
      } else {
        addXP(o.val * p.xpMul);
        Sound.pickup();
      }
    }
  }
  G.orbs = G.orbs.filter(o => o.alive);
  if (G.orbs.length > 400) G.orbs.splice(0, G.orbs.length - 400);
}

/* ───────────────────────── 主循环 ───────────────────────── */
function sanitize() {
  const p = G.player;
  if (!p) return;
  if (!isFinite(p.x) || !isFinite(p.y)) { p.x = 0; p.y = 0; p.vx = 0; p.vy = 0; }
  if (!isFinite(p.vx) || !isFinite(p.vy)) { p.vx = 0; p.vy = 0; }
  for (const e of G.enemies) if (e.alive && (!isFinite(e.x) || !isFinite(e.y) || !isFinite(e.hp))) e.alive = false;
  if (G.orbs.some(o => !isFinite(o.x) || !isFinite(o.y))) G.orbs = G.orbs.filter(o => isFinite(o.x) && isFinite(o.y));
  if (G.shots.some(o => !isFinite(o.x) || !isFinite(o.y))) G.shots = G.shots.filter(o => isFinite(o.x) && isFinite(o.y));
}

function updateWorld(dt) {
  if (G.hitstop > 0) { G.hitstop -= dt; dt *= 0.12; }
  // NaN 看门狗（调试）
  if (window.__SL && window.__SL.watch) {
    for (const e of G.enemies) {
      if (!isFinite(e.x) || !isFinite(e.y)) { window.__SL.nan = window.__SL.nan || { kind: 'enemy', type: e.type, t: G.time, hp: e.hp, kx: e.kx, ky: e.ky }; }
    }
    for (const o of G.orbs) {
      if (!isFinite(o.x) || !isFinite(o.y)) { window.__SL.nan = window.__SL.nan || { kind: 'orb', t: G.time, val: o.val, oil: !!o.oil }; }
    }
    const p = G.player;
    if (!isFinite(p.x) || !isFinite(p.y)) window.__SL.nan = window.__SL.nan || { kind: 'player', t: G.time };
  }
  G.time += dt;
  const oldDepth = G.depth;
  G.depth = 1 + Math.floor(G.time / 90);
  if (G.depth !== oldDepth) {
    toast('夜深了 · 第 ' + G.depth + ' 更');
    G.flash = 0.16; G.flashColor = '#6fd9bd';
  }

  updatePlayer(dt);
  updateEnemies(dt);
  updateWeapons(dt);
  updateShots(dt);
  updateMarks(dt);
  updateOrbs(dt);

  if (G.tut) {
    updateTutorial(dt);
    if (G.mode === 'title') return;
  }

  // 波次
  const rate = Math.min(11, 2.4 + G.time / 26);
  G.spawnT += dt * rate;
  while (!G.tut && G.spawnT >= 1) {
    G.spawnT -= 1;
    const tt = G.time;
    const pool = ['chi'];
    if (tt > 28) pool.push('chi', 'mei');
    if (tt > 70) pool.push('zhu', 'mei');
    if (tt > 120) pool.push('jiang', 'chi');
    if (tt > 200) pool.push('jiang', 'zhu');
    const k = pick(pool);
    spawnEnemy(k);
    if (tt > 45 && Math.random() < 0.10 + Math.min(0.22, tt / 1600)) {
      const ang = rnd(TAU);
      for (let i = 0; i < 3; i++) spawnEnemy('chi', { ang: ang + i * 0.16, rad: Math.max(VIEW.w, VIEW.h) * 0.62 + 60 + i * 26 });
    }
  }


  // 精英
  G.eliteT = (G.eliteT || 58) - dt;
  if (!G.tut && G.eliteT <= 0) {
    G.eliteT = Math.max(34, 58 - G.time / 60 * 4);
    if (G.enemies.filter(e => e.elite).length < 2) {
      spawnEnemy('nuo');
      toast('傩面来了');
    }
  }

  // Boss
  if (!G.boss && !G.tut) {
    G.bossT -= dt;
    if (G.bossT <= 0) {
      G.boss = spawnEnemy('boss', { rad: Math.max(VIEW.w, VIEW.h) * 0.72 });
      G.bossCount++;
      toast('灯灭之影 · 现身');
      G.flash = 0.35; G.flashColor = '#d9503f';
      Sound.boss();
      shake(12);
    }
  }

  // 特效衰减
  if (G.shake > 0) {
    G.shake = Math.max(0, G.shake - dt * 26);
    G.shakeX = rnd(1, -1) * G.shake;
    G.shakeY = rnd(1, -1) * G.shake;
  }
  if (G.flash > 0) G.flash = Math.max(0, G.flash - dt * 2.2);

  for (const pt of G.parts) {
    pt.life -= dt;
    pt.x += pt.vx * dt; pt.y += pt.vy * dt;
    pt.vx -= pt.vx * pt.drag * dt;
    pt.vy -= pt.vy * pt.drag * dt;
    pt.vy += (pt.grav || 0) * dt;
  }
  G.parts = G.parts.filter(p => p.life > 0);

  for (const tx of G.texts) { tx.life -= dt; tx.y += tx.vy * dt; tx.vy += 70 * dt; }
  G.texts = G.texts.filter(t => t.life > 0);

  for (const r of G.rings) { r.life -= dt; r.r = r.rMax * easeOut(1 - r.life / r.max); }
  G.rings = G.rings.filter(r => r.life > 0);

  for (const s of G.slashes) s.life -= dt;
  G.slashes = G.slashes.filter(s => s.life > 0);

  for (const a of G.arcs) a.life -= dt;
  G.arcs = G.arcs.filter(a => a.life > 0);

  for (const c of G.cones) c.life -= dt;
  G.cones = G.cones.filter(c => c.life > 0);

  for (const b of G.bladeFx) b.life -= dt;
  G.bladeFx = G.bladeFx.filter(b => b.life > 0);

  for (const b of G.blades) {
    b.life -= dt;
    b.tick -= dt;
    if (b.tick <= 0) {
      b.tick = 0.2;
      const ca = Math.cos(b.ang), sa = Math.sin(b.ang);
      for (const e of G.enemies) {
        if (!e.alive) continue;
        const dx = e.x - b.x, dy = e.y - b.y;
        const along = dx * ca + dy * sa;
        if (along < 0 || along > b.len) continue;
        const perp = Math.abs(-dx * sa + dy * ca);
        if (perp < 38 + e.r) damageEnemy(e, b.dmg, { knock: 60, fromX: b.x, fromY: b.y });
      }
      G.parts.push({ x: b.x + ca * rnd(b.len), y: b.y + sa * rnd(b.len), vx: rnd(30, -30), vy: rnd(30, -30), life: 0.5, max: 0.5, size: 3, col: '#dceeff', type: 'spark', drag: 2 });
    }
  }
  G.blades = G.blades.filter(b => b.life > 0);

  for (const sr of G.sealRings) { sr.life -= dt; sr.r = sr.rMax * (1 - sr.life / sr.max); }
  G.sealRings = G.sealRings.filter(sr => sr.life > 0);

  for (const b of G.beams) b.life -= dt;
  G.beams = G.beams.filter(b => b.life > 0);
  for (const r of G.ringFx) r.life -= dt;
  G.ringFx = G.ringFx.filter(r => r.life > 0);

  for (const c of G.cones) c.life -= dt;
  G.cones = G.cones.filter(c => c.life > 0);

  for (const b of G.blades) {
    b.life -= dt;
    b.tick -= dt;
    if (b.tick <= 0) {
      b.tick = 0.2;
      const ca = Math.cos(b.ang), sa = Math.sin(b.ang);
      for (const e of G.enemies) {
        if (!e.alive) continue;
        const dx = e.x - b.x, dy = e.y - b.y;
        const along = dx * ca + dy * sa;
        if (along < 0 || along > b.len) continue;
        const perp = Math.abs(-dx * sa + dy * ca);
        if (perp < 38 + e.r) damageEnemy(e, b.dmg, { knock: 60, fromX: b.x, fromY: b.y });
      }
      G.parts.push({ x: b.x + ca * rnd(b.len), y: b.y + sa * rnd(b.len), vx: rnd(30, -30), vy: rnd(30, -30), life: 0.5, max: 0.5, size: 3, col: '#dceeff', type: 'spark', drag: 2 });
    }
  }
  G.blades = G.blades.filter(b => b.life > 0);

  for (const sr of G.sealRings) { sr.life -= dt; sr.r = sr.rMax * (1 - sr.life / sr.max); }
  G.sealRings = G.sealRings.filter(sr => sr.life > 0);

  for (const b of G.beams) b.life -= dt;
  G.beams = G.beams.filter(b => b.life > 0);
  for (const r of G.ringFx) r.life -= dt;
  G.ringFx = G.ringFx.filter(r => r.life > 0);

  for (const sd of G.seals) {
    sd.t += dt;
    if (sd.t >= sd.delay) {
      sd.delay += 0.26;
      sd.stage++;
      ring(sd.x, sd.y, sd.radius, sd.stage >= 2 ? '#ff7a4a' : '#ffb35c', 0.38, 4);
      burst(sd.x, sd.y, 10, '#ffd489', { spd: 210, size: 3, life: 0.4 });
      hitArea(sd.x, sd.y, sd.radius, sd.dmg * (sd.stage >= 2 ? 0.8 : 1), { knock: 120 });
      shake(2);
      if (sd.stage >= 2) sd.done = true;
    }
  }
  G.seals = G.seals.filter(sd => !sd.done);

  if (G.player && G.player.lotusBloom > 0) G.player.lotusBloom = Math.max(0, G.player.lotusBloom - dt * 1.5);

  sanitize();

  // 相机
  const leadX = IN.dx * 26, leadY = IN.dy * 26;
  G.cam.x = lerp(G.cam.x, G.player.x + leadX, 1 - Math.pow(0.0025, dt));
  G.cam.y = lerp(G.cam.y, G.player.y + leadY, 1 - Math.pow(0.0025, dt));
}

let lastT = 0, acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  if (!lastT) lastT = now;
  let dt = (now - lastT) / 1000;
  lastT = now;
  if (dt > 0.25) dt = 0.25;
  if (window.__SL && window.__SL.timeScale) dt *= window.__SL.timeScale;

  if (G.mode === 'play' || G.mode === 'tutorial') {
    acc += dt;
    const STEP = 1 / 60;
    let guard = 0;
    while (acc >= STEP && guard++ < 6 && (G.mode === 'play' || G.mode === 'tutorial')) { updateWorld(STEP); acc -= STEP; }
    if (guard >= 6) acc = 0;
  } else {
    acc = 0;
    // 非战斗时也让粒子与相机缓慢收敛，画面不僵死
    if (G.mode === 'levelup' || G.mode === 'pause') {
      // 冻结
    }
  }
  try {
    render(now / 1000);
    syncHUD();
  } catch (err) {
    if (window.__SL) {
      window.__SL.errs = window.__SL.errs || [];
      if (window.__SL.errs.length < 8) window.__SL.errs.push(String(err && err.stack || err));
    }
  }
}

/* ───────────────────────── 背景 ───────────────────────── */
function hash2(x, y) {
  let h = (x | 0) * 374761393 + (y | 0) * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return ((h >>> 0) % 100000) / 100000;
}

function buildBackdrop() {
  const peaks = [];
  for (let layer = 0; layer < 2; layer++) {
    const pts = [];
    const n = 26;
    for (let i = 0; i <= n; i++) {
      const seed = layer * 31 + i;
      pts.push(hash2(seed, 7 + layer) * 0.7 + hash2(seed * 3, 11) * 0.3);
    }
    peaks.push(pts);
  }
  G.backdrop = peaks;
}

function drawBackground(t, camX, camY) {
  const w = VIEW.w, h = VIEW.h;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#080b10');
  g.addColorStop(0.45, '#0a0e15');
  g.addColorStop(1, '#05070a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // 远山剪影（视差）
  if (G.backdrop) {
    for (let layer = 0; layer < 2; layer++) {
      const par = 0.05 + layer * 0.06;
      const pts = G.backdrop[layer];
      const baseY = h * (0.34 + layer * 0.06) - camY * par * 0.35;
      const amp = 40 + layer * 50;
      const span = w + 200;
      const off = -((camX * par) % span);
      ctx.beginPath();
      ctx.moveTo(-100, h);
      for (let i = 0; i < pts.length; i++) {
        const x = -100 + ((i / (pts.length - 1)) * span + off + span * 4) % span;
        const y = baseY - pts[i] * amp;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w + 100, h);
      ctx.closePath();
      ctx.fillStyle = layer === 0 ? 'rgba(12,17,24,0.85)' : 'rgba(8,12,17,0.9)';
      ctx.fill();
    }
  }

  // 雾团
  for (let i = 0; i < 5; i++) {
    const seed = i * 97.3;
    const drift = t * (6 + i * 2.4);
    const x = ((seed * 13 + drift - camX * 0.18) % (w + 460) + w + 460) % (w + 460) - 230;
    const y = h * (0.2 + hash2(i, 3) * 0.6) - camY * 0.1 + Math.sin(t * 0.3 + i) * 16;
    const r = 200 + hash2(i, 9) * 180;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    const a = 0.05 + hash2(i, 5) * 0.04;
    rg.addColorStop(0, `rgba(72,104,128,${a})`);
    rg.addColorStop(0.6, `rgba(40,60,80,${a * 0.5})`);
    rg.addColorStop(1, 'rgba(20,30,45,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

function drawGround(camX, camY, t) {
  const CELL = 118;
  const x0 = Math.floor((camX - VIEW.w / 2) / CELL) - 1;
  const x1 = Math.floor((camX + VIEW.w / 2) / CELL) + 1;
  const y0 = Math.floor((camY - VIEW.h / 2) / CELL) - 1;
  const y1 = Math.floor((camY + VIEW.h / 2) / CELL) + 1;
  for (let gy = y0; gy <= y1; gy++) {
    for (let gx = x0; gx <= x1; gx++) {
      const rv = hash2(gx, gy);
      if (rv < 0.72) continue;
      const wx = gx * CELL + hash2(gx + 9, gy) * CELL;
      const wy = gy * CELL + hash2(gx, gy + 9) * CELL;
      const a = 0.16 + hash2(gx, gy + 3) * 0.16;
      ctx.save();
      ctx.translate(wx, wy);
      ctx.strokeStyle = `rgba(196,162,96,${a})`;
      ctx.lineWidth = 1;
      if (rv > 0.9) {
        ctx.beginPath(); ctx.arc(0, 0, 12 + hash2(gx, 1) * 8, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.moveTo(0, -7); ctx.lineTo(0, 7);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  //  Ambient 萤火
  for (let i = 0; i < 26; i++) {
    const wx = ((i * 431.7 + t * (4 + i % 5)) % 1400) - 700 + camX * 0.9;
    const wy = ((i * 217.3) % 1000) - 500 + camY * 0.9 + Math.sin(t * 0.7 + i) * 30;
    const a = 0.12 + 0.10 * Math.sin(t * 1.6 + i * 2);
    ctx.fillStyle = `rgba(240,198,116,${Math.max(0, a)})`;
    ctx.beginPath();
    ctx.arc(wx, wy, 1.6, 0, TAU);
    ctx.fill();
  }
}

/* ───────────────────────── 实体绘制 ───────────────────────── */
function drawOrbs(t) {
  for (const o of G.orbs) {
    const pulse = 0.8 + Math.sin(t * 6 + o.x * 0.1) * 0.2;
    if (o.oil) {
      ctx.save();
      ctx.translate(o.x, o.y + Math.sin(t * 3 + o.x) * 2);
      const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, 16);
      rg.addColorStop(0, 'rgba(127,224,188,0.85)');
      rg.addColorStop(1, 'rgba(127,224,188,0)');
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(0, 0, 16, 0, TAU); ctx.fill();
      ctx.fillStyle = '#d8fff2';
      ctx.beginPath(); ctx.arc(0, 0, 4.2, 0, TAU); ctx.fill();
      ctx.restore();
      continue;
    }
    const rg = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, 13 * pulse);
    rg.addColorStop(0, 'rgba(255,235,180,0.95)');
    rg.addColorStop(0.35, 'rgba(240,198,116,0.55)');
    rg.addColorStop(1, 'rgba(240,198,116,0)');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(o.x, o.y, 13 * pulse, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff6d8';
    ctx.beginPath(); ctx.arc(o.x, o.y, 2.4, 0, TAU); ctx.fill();
  }
}

function drawRings() {
  for (const r of G.rings) {
    const a = r.life / r.max;
    ctx.strokeStyle = r.col;
    ctx.globalAlpha = a * 0.9;
    ctx.lineWidth = r.w * a + 0.5;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawSlashes() {
  for (const s of G.slashes) {
    const k = 1 - s.life / s.max;
    const a = 1 - k;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.ang);
    const rg = ctx.createRadialGradient(0, 0, s.range * 0.25, 0, 0, s.range);
    rg.addColorStop(0, `rgba(255,240,200,0)`) ;
    rg.addColorStop(0.5, `rgba(255,236,186,${0.34 * a})`);
    rg.addColorStop(1, `rgba(255,180,90,0)`);
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(0, 0, s.range, -s.arc / 2 + k * 0.35, s.arc / 2 + k * 0.35);
    ctx.arc(0, 0, s.range * 0.2, s.arc / 2 + k * 0.35, -s.arc / 2 + k * 0.35, true);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `rgba(255,252,235,${0.55 * a})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, s.range * 0.92, -s.arc / 2 + k * 0.35, s.arc / 2 + k * 0.35);
    ctx.stroke();
    ctx.restore();
  }
}

function drawSeals(t) {
  for (const sd of G.seals) {
    const k = clamp(sd.t / sd.delay, 0, 1);
    ctx.save();
    ctx.translate(sd.x, sd.y);
    ctx.globalAlpha = 0.35 + k * 0.5;
    ctx.strokeStyle = sd.stage >= 1 ? '#ff7a4a' : '#ffb35c';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, sd.radius * (0.4 + k * 0.6), 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, sd.radius * (0.4 + k * 0.6) * 0.62, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#ffd489';
    ctx.font = '12px "Songti SC",serif';
    ctx.textAlign = 'center';
    ctx.fillText('镇', 0, 4);
    ctx.textAlign = 'left';
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawBladeFx(t) {
  for (const b of G.bladeFx) {
    const k = 1 - b.life / b.max;
    const lead = -0.95 + 1.9 * k;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.ang);

    // 扫过的刀光扇面（弧形，不是直线）
    const R0 = 64, R1 = 268;
    const a0 = lead - 0.62, a1 = lead;
    const grad = ctx.createRadialGradient(0, 0, R0, 0, 0, R1);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.35, `rgba(190,225,255,${0.22 * (1 - k)})`);
    grad.addColorStop(0.75, `rgba(255,255,255,${0.55 * (1 - k)})`);
    grad.addColorStop(1, 'rgba(170,215,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, R1, a0, a1);
    ctx.arc(0, 0, R0, a1, a0, true);
    ctx.closePath();
    ctx.fill();

    // 前缘亮边
    ctx.strokeStyle = `rgba(255,255,255,${0.95 * (1 - k)})`;
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.arc(0, 0, R1 * 0.96, a0 + 0.5, a1);
    ctx.stroke();

    // 刀尖
    ctx.fillStyle = `rgba(255,255,255,${1 - k})`;
    ctx.beginPath();
    ctx.arc(Math.cos(a1) * R1 * 0.96, Math.sin(a1) * R1 * 0.96, 4, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

function drawCones() {
  for (const c of G.cones) {
    const k = c.life / c.max;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.ang);
    const g = ctx.createLinearGradient(0, 0, c.range, 0);
    g.addColorStop(0, `rgba(255,246,214,${0.42 * k})`);
    g.addColorStop(0.6, `rgba(255,220,150,${0.22 * k})`);
    g.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, c.range, -c.arc / 2, c.arc / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawSealRings() {
  for (const sr of G.sealRings) {
    const k = 1 - sr.life / sr.max;
    const col = sr.col || '#ffd489';
    ctx.save();
    ctx.translate(sr.x, sr.y);
    ctx.globalAlpha = (1 - k) * 0.85;
    ctx.strokeStyle = col;
    ctx.lineWidth = 3 * (1 - k) + 1;
    ctx.beginPath(); ctx.arc(0, 0, sr.r, 0, TAU); ctx.stroke();
    ctx.globalAlpha = (1 - k) * 0.5;
    ctx.beginPath(); ctx.arc(0, 0, sr.r * 0.86, 0, TAU); ctx.stroke();
    ctx.globalAlpha = (1 - k) * 0.9;
    ctx.fillStyle = col;
    ctx.font = '13px "Songti SC",serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU + k * 1.4;
      ctx.save();
      ctx.rotate(a);
      ctx.fillText('符', sr.r * 0.93, 4);
      ctx.restore();
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

function drawBeams() {
  for (const b of G.beams) {
    const k = b.life / b.max;
    ctx.save();
    ctx.globalAlpha = k;
    ctx.strokeStyle = 'rgba(255,200,140,0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawRingFx() {
  for (const r of G.ringFx) {
    const k = 1 - r.life / r.max;
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.ang);
    ctx.globalAlpha = (1 - k) * 0.8;
    ctx.strokeStyle = 'rgba(220,238,255,0.9)';
    ctx.lineWidth = 3 * (1 - k) + 1;
    ctx.beginPath(); ctx.arc(0, 0, 40 + k * 90, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawArcs() {
  for (const a of G.arcs) {
    const k = a.life / a.max;
    ctx.save();
    ctx.globalAlpha = k;
    ctx.strokeStyle = 'rgba(255,214,140,0.95)';
    ctx.lineWidth = 2.6;
    ctx.shadowColor = 'rgba(255,170,80,0.9)';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    const seg = 7;
    ctx.moveTo(a.x1, a.y1);
    for (let i = 1; i < seg; i++) {
      const t = i / seg;
      const jx = (Math.random() - 0.5) * 26;
      const jy = (Math.random() - 0.5) * 26;
      ctx.lineTo(lerp(a.x1, a.x2, t) + jx, lerp(a.y1, a.y2, t) + jy);
    }
    ctx.lineTo(a.x2, a.y2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawLotus(t, x, y, scale, bloom) {
  const layers = [
    { n: 12, r: 34, len: 88, wid: 26, rot: t * 0.14, cTip: '#ffcf8a', cMid: '#d63a24', cBase: '#4a0710', a: 0.88 },
    { n: 10, r: 26, len: 74, wid: 24, rot: -t * 0.24, cTip: '#ffd9a0', cMid: '#e8462c', cBase: '#5e0b12', a: 0.93 },
    { n: 8, r: 18, len: 60, wid: 21, rot: t * 0.36, cTip: '#fff0c8', cMid: '#ff7a3c', cBase: '#8a1214', a: 0.96 },
    { n: 6, r: 11, len: 46, wid: 17, rot: -t * 0.5, cTip: '#fff6d8', cMid: '#ff9a4a', cBase: '#a41c14', a: 0.98 },
    { n: 5, r: 5, len: 32, wid: 13, rot: t * 0.66, cTip: '#fffdf0', cMid: '#ffc070', cBase: '#b3241a', a: 1 }
  ];
  ctx.save();
  ctx.translate(x, y);
  const boost = 1 + (bloom || 0) * 0.5;
  ctx.scale(scale * boost * 1.1, scale * boost * 0.86);

  // 背后光晕
  const halo = ctx.createRadialGradient(0, -10, 4, 0, -10, 120);
  halo.addColorStop(0, 'rgba(255,150,70,0.30)');
  halo.addColorStop(0.55, 'rgba(210,60,30,0.14)');
  halo.addColorStop(1, 'rgba(150,20,20,0)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(0, -10, 120, 0, TAU); ctx.fill();

  for (const L of layers) {
    for (let i = 0; i < L.n; i++) {
      const a = L.rot + i / L.n * TAU;
      ctx.save();
      ctx.rotate(a);
      const g = ctx.createLinearGradient(0, -L.r - L.len, 0, -L.r + 6);
      g.addColorStop(0, L.cTip);
      g.addColorStop(0.42, L.cMid);
      g.addColorStop(1, L.cBase);
      ctx.globalAlpha = L.a;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, -L.r + 4);
      ctx.bezierCurveTo(L.wid * 0.95, -L.r - L.len * 0.32, L.wid * 0.5, -L.r - L.len * 0.82, 0, -L.r - L.len);
      ctx.bezierCurveTo(-L.wid * 0.5, -L.r - L.len * 0.82, -L.wid * 0.95, -L.r - L.len * 0.32, 0, -L.r + 4);
      ctx.closePath();
      ctx.fill();
      // 边缘光
      ctx.strokeStyle = 'rgba(255,236,190,0.55)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(0, -L.r - L.len * 0.96);
      ctx.quadraticCurveTo(L.wid * 0.42, -L.r - L.len * 0.7, L.wid * 0.8, -L.r - L.len * 0.3);
      ctx.stroke();
      // 叶脉
      ctx.strokeStyle = 'rgba(90,10,14,0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -L.r - L.len * 0.9);
      ctx.quadraticCurveTo(L.wid * 0.12, -L.r - L.len * 0.45, 0, -L.r + 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // 花心
  const cg = ctx.createRadialGradient(0, 0, 2, 0, 0, 30);
  cg.addColorStop(0, 'rgba(255,255,245,1)');
  cg.addColorStop(0.3, 'rgba(255,226,150,0.92)');
  cg.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = cg;
  ctx.beginPath(); ctx.arc(0, 0, 30, 0, TAU); ctx.fill();
  // 花蕊
  for (let i = 0; i < 12; i++) {
    const a = t * 0.8 + i / 12 * TAU;
    const rx = Math.cos(a) * 15, ry = Math.sin(a) * 15;
    ctx.strokeStyle = 'rgba(255,240,190,0.85)';
    ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(rx, ry); ctx.stroke();
    ctx.fillStyle = 'rgba(255,252,220,0.95)';
    ctx.beginPath(); ctx.arc(rx, ry, 1.9, 0, TAU); ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawWeaponAuras(t) {
  const p = G.player;
  if (!p) return;

  // 桃木剑觉醒：身后剑影 + 剑意
  if (wLevel('sword') > 0 && awForm('sword')) {
    const mut = awForm('sword') === 'mutate';
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(t * (mut ? 0.6 : 0.4));
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = mut ? 'rgba(255,220,150,0.9)' : 'rgba(200,230,255,0.9)';
    ctx.beginPath();
    ctx.moveTo(0, -86); ctx.lineTo(7, -18); ctx.lineTo(0, 30); ctx.lineTo(-7, -18);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = mut ? '#ffcf8a' : '#cfe6ff';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 74, 0, TAU); ctx.stroke();
    ctx.restore();
  }

  // 符箓：旋转符阵
  if (wLevel('talisman') > 0 && awForm('talisman')) {
    const mut = awForm('talisman') === 'mutate';
    const R = mut ? 96 : 84;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = 0.55;
    ctx.rotate(t * (mut ? -0.5 : 0.35));
    ctx.strokeStyle = mut ? 'rgba(255,120,90,0.75)' : 'rgba(255,214,150,0.7)';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, R * 0.82, 0, TAU); ctx.stroke();
    ctx.fillStyle = mut ? 'rgba(255,150,110,0.9)' : 'rgba(255,230,180,0.9)';
    ctx.font = '12px "Songti SC",serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < 8; i++) {
      ctx.save();
      ctx.rotate(i / 8 * TAU);
      ctx.fillText(mut ? '煞' : '符', R * 0.91, 4);
      ctx.restore();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  // 铜镜：绕身镜阵
  if (wLevel('mirror') > 0 && awForm('mirror') === 'awake' && p.shards) {
    for (const sh of p.shards) {
      const sx = p.x + Math.cos(sh.ang) * 46, sy = p.y + Math.sin(sh.ang) * 46;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(sh.ang + Math.PI / 2);
      const g = ctx.createLinearGradient(0, -12, 0, 12);
      g.addColorStop(0, 'rgba(255,250,225,0.95)');
      g.addColorStop(1, 'rgba(200,220,255,0.55)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 12, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,236,170,0.9)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }
  }
  // 铜镜：身后巨镜
  if (wLevel('mirror') > 0 && awForm('mirror')) {
    const mut = awForm('mirror') === 'mutate';
    ctx.save();
    ctx.translate(p.x, p.y - 6);
    const rg = ctx.createRadialGradient(0, 0, 6, 0, 0, 64);
    rg.addColorStop(0, mut ? 'rgba(255,240,220,0.22)' : 'rgba(220,240,255,0.22)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(0, 0, 64, 0, TAU); ctx.fill();
    ctx.strokeStyle = mut ? 'rgba(255,200,160,0.55)' : 'rgba(200,225,255,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 46, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 40, 0, TAU); ctx.stroke();
    // 镜面十字
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(-40, 0); ctx.lineTo(40, 0);
    ctx.moveTo(0, -40); ctx.lineTo(0, 40);
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // 罗盘：重盘 + 二十四山
  if (wLevel('compass') > 0 && awForm('compass')) {
    const mut = awForm('compass') === 'mutate';
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(-t * (mut ? 0.7 : 0.45));
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = mut ? 'rgba(255,150,110,0.8)' : 'rgba(190,220,255,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 118, 0, TAU); ctx.stroke();
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * TAU;
      const long = i % 6 === 0;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 108, Math.sin(a) * 108);
      ctx.lineTo(Math.cos(a) * (long ? 96 : 102), Math.sin(a) * (long ? 96 : 102));
      ctx.stroke();
    }
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = mut ? 'rgba(255,180,140,0.9)' : 'rgba(220,238,255,0.9)';
    ctx.font = '11px "Songti SC",serif';
    ctx.textAlign = 'center';
    const marks = ['子', '卯', '午', '酉'];
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * TAU;
      ctx.fillText(marks[i], Math.cos(a) * 127, Math.sin(a) * 127 + 4);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  // 纸鸢：环绕纸鹤
  if (wLevel('kite') > 0 && awForm('kite')) {
    const mut = awForm('kite') === 'mutate';
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = 0.75;
    for (let i = 0; i < 7; i++) {
      const a = t * (mut ? 1.4 : 1.9) + i / 7 * TAU;
      const rr = 78 + Math.sin(t * 2 + i) * 8;
      ctx.save();
      ctx.translate(Math.cos(a) * rr, Math.sin(a) * rr * 0.8);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = mut ? 'rgba(255,246,230,0.95)' : 'rgba(245,238,215,0.9)';
      ctx.beginPath();
      const flap = Math.sin(t * 7 + i) * 0.5;
      ctx.moveTo(9, 0);
      ctx.lineTo(-6, -7 * (0.7 + flap * 0.3));
      ctx.lineTo(-2, 0);
      ctx.lineTo(-6, 7 * (0.7 + flap * 0.3));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

function drawAwakenFx(t) {
  const p = G.player;
  if (!p) return;
  // 灯焰觉醒：火焰球
  const fl = awForm('flame');
  if (fl) {
    const mutated = fl === 'mutate';
    const n = mutated ? 6 : 5;
    const rad = mutated ? 76 : 58;
    for (let i = 0; i < n; i++) {
      const a = p.flameAng + i * TAU / n;
      const fx = p.x + Math.cos(a) * rad, fy = p.y + Math.sin(a) * rad * 0.86;
      const r = mutated ? 15 : 12;
      const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, r * 2.6);
      g.addColorStop(0, mutated ? 'rgba(255,240,200,0.95)' : 'rgba(255,246,220,0.95)');
      g.addColorStop(0.35, mutated ? 'rgba(255,110,70,0.55)' : 'rgba(255,190,100,0.5)');
      g.addColorStop(1, mutated ? 'rgba(200,30,10,0)' : 'rgba(255,150,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(fx, fy, r * 2.6, 0, TAU); ctx.fill();
      // 焰舌（外橙内白，带抖动）
      const wob = Math.sin(t * 9 + i * 1.7) * 1.6;
      const sway = Math.cos(t * 7 + i) * 1.2;
      const fw = mutated ? 9 : 7.2, fh = mutated ? 26 : 21;
      const fg = ctx.createLinearGradient(fx, fy - fh, fx, fy + fh * 0.4);
      fg.addColorStop(0, mutated ? 'rgba(255,120,70,0.35)' : 'rgba(255,190,110,0.35)');
      fg.addColorStop(0.45, mutated ? 'rgba(255,150,90,0.95)' : 'rgba(255,228,160,0.95)');
      fg.addColorStop(1, 'rgba(255,255,235,0.98)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(fx + sway * 0.4, fy - fh - wob);
      ctx.bezierCurveTo(fx + fw, fy - fh * 0.35, fx + fw * 0.75, fy + fh * 0.3, fx, fy + fh * 0.42);
      ctx.bezierCurveTo(fx - fw * 0.75, fy + fh * 0.3, fx - fw, fy - fh * 0.35, fx + sway * 0.4, fy - fh - wob);
      ctx.fill();
      // 焰心
      ctx.fillStyle = 'rgba(255,255,248,0.95)';
      ctx.beginPath();
      ctx.ellipse(fx, fy + fh * 0.12, fw * 0.34, fh * 0.24, 0, 0, TAU);
      ctx.fill();
    }
    if (mutated) {
      drawLotus(t, p.x, p.y + 10, 1.0, p.lotusBloom || 0);
    }
  }
  // 剑冢：残剑环身
  if (awForm('sword') === 'mutate' && p.gswords) {
    for (const g of p.gswords) {
      const gx = p.x + Math.cos(g.ang) * 56, gy = p.y + Math.sin(g.ang) * 56 * 0.9;
      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(g.ang + Math.PI / 2);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = 'rgba(226,240,255,0.85)';
      ctx.beginPath();
      ctx.moveTo(0, -20); ctx.lineTo(3.4, 8); ctx.lineTo(0, 16); ctx.lineTo(-3.4, 8);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(160,200,230,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, 22); ctx.stroke();
      ctx.restore();
    }
  }
  // 镇魂钟：常驻钟声场
  const bell = awForm('bell');
  if (bell) {
    const rr = bell === 'mutate' ? 190 : 170;
    ctx.save();
    ctx.globalAlpha = 0.10 + Math.sin(t * 2.4) * 0.03;
    ctx.strokeStyle = bell === 'mutate' ? '#ffb35c' : '#ffe1a8';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.06;
    ctx.beginPath(); ctx.arc(p.x, p.y, rr * 0.82, 0, TAU); ctx.stroke();
    ctx.restore();

    // 悬于头顶的钟影
    const by = p.y - 52 + Math.sin(t * 2.2) * 3;
    ctx.save();
    ctx.translate(p.x, by);
    ctx.globalAlpha = 0.95;
    const bg = ctx.createLinearGradient(0, by - 16, 0, by + 12);
    bg.addColorStop(0, 'rgba(255,226,170,0.95)');
    bg.addColorStop(1, 'rgba(190,140,60,0.85)');
    ctx.fillStyle = bg;
    ctx.beginPath();
    // 钟晕
    const bg2 = ctx.createRadialGradient(0, 0, 4, 0, 0, 30);
    bg2.addColorStop(0, 'rgba(255,214,140,0.35)');
    bg2.addColorStop(1, 'rgba(255,180,90,0)');
    ctx.fillStyle = bg2;
    ctx.beginPath(); ctx.arc(0, 0, 30, 0, TAU); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-13, -12);
    ctx.quadraticCurveTo(0, -21, 13, -12);
    ctx.lineTo(11, 9);
    ctx.quadraticCurveTo(0, 14, -11, 9);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,60,20,0.7)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,240,200,0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-9, -2); ctx.lineTo(9, -2); ctx.stroke();
    ctx.fillStyle = '#5a3a12';
    ctx.beginPath(); ctx.arc(0, 13, 3, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // 千纸鹤：背后巨鹤 + 纸羽漩涡
  if (wLevel('kite') > 0) {
    const kf = awForm('kite');
    if (kf) {
      const big = kf === 'awake';
      ctx.save();
      ctx.translate(p.x, p.y - (big ? 30 : 22));
      const flap = Math.sin(t * 5.2) * 0.5;
      ctx.globalAlpha = big ? 0.32 : 0.20;
      ctx.scale(big ? 3.2 : 2.2, big ? 3.2 : 2.2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineCap = 'round';
      // 双翼
      ctx.lineWidth = 2.4;
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(sgn * 16, -10 - flap * 8, sgn * 30, -4 - flap * 10);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sgn * 12, -4 - flap * 5);
        ctx.quadraticCurveTo(sgn * 22, 2, sgn * 26, 10 + flap * 4);
        ctx.stroke();
      }
      // 身体
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.quadraticCurveTo(0, -5, 18, 0);
      ctx.stroke();
      // 颈与头
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.quadraticCurveTo(26, -8, 32, -10);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(33, -10, 1.8, 0, TAU); ctx.fill();
      // 喙
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(34, -10); ctx.lineTo(38, -9); ctx.stroke();
      ctx.restore();

      if (big) {
        // 纸羽漩涡
        ctx.save();
        ctx.globalAlpha = 0.5;
        for (let i = 0; i < 22; i++) {
          const a = t * 2.1 + i * 0.62;
          const rr = 46 + (i % 5) * 24;
          const fx = p.x + Math.cos(a) * rr;
          const fy = p.y + Math.sin(a) * rr * 0.72 - 10;
          ctx.save();
          ctx.translate(fx, fy);
          ctx.rotate(a + 1.2);
          ctx.fillStyle = i % 3 ? 'rgba(255,252,240,0.75)' : 'rgba(240,230,200,0.6)';
          ctx.beginPath();
          ctx.ellipse(0, 0, 7, 2.4, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      }
    }
  }

  // 罗盘
  if (wLevel('compass') > 0) {
    const form = awForm('compass');
    const R = form === 'awake' ? 88 : form === 'mutate' ? 96 : 64;
    const spin = form === 'mutate' ? -t * 0.9 : t * 0.35;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = 0.75;
    ctx.rotate(spin);
    ctx.strokeStyle = form === 'mutate' ? 'rgba(255,140,100,0.5)' : 'rgba(200,220,255,0.45)';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, R * 0.72, 0, TAU); ctx.stroke();
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * TAU;
      const long = i % 6 === 0;
      ctx.strokeStyle = long ? 'rgba(255,220,160,0.75)' : 'rgba(200,220,255,0.35)';
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * R * (long ? 0.86 : 0.92), Math.sin(a) * R * (long ? 0.86 : 0.92));
      ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R);
      ctx.stroke();
    }
    ctx.restore();
    // 指针
    const tgt = nearestEnemy(p.x, p.y, 640);
    const na = tgt ? Math.atan2(tgt.y - p.y, tgt.x - p.x) : spin;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(na);
    ctx.strokeStyle = form === 'mutate' ? 'rgba(255,170,120,0.9)' : 'rgba(210,235,255,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(R * 0.8, 0); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(R * 0.8 + 8, 0); ctx.lineTo(R * 0.8 - 2, -5); ctx.lineTo(R * 0.8 - 2, 5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // 纸伞 / 千机伞
  if (wLevel('umbrella') > 0) {
    const form = awForm('umbrella');
    const ang = p.umbAng || 0;

    if (form === 'mutate') {
      // 无字伞：撑开的领域（保持，稍后强化）
      ctx.save();
      ctx.translate(p.x, p.y);
      const dg = ctx.createRadialGradient(0, 0, 30, 0, 0, 172);
      dg.addColorStop(0, 'rgba(240,226,192,0.04)');
      dg.addColorStop(0.66, 'rgba(232,214,176,0.10)');
      dg.addColorStop(0.9, 'rgba(255,242,210,0.30)');
      dg.addColorStop(1, 'rgba(255,242,210,0)');
      ctx.fillStyle = dg;
      ctx.beginPath(); ctx.arc(0, 0, 172, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(250,240,214,0.22)';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(0, 0, 172 * i / 4, 0, TAU); ctx.stroke(); }
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * TAU + t * 0.25;
        const ex = Math.cos(a) * 170, ey = Math.sin(a) * 170;
        ctx.strokeStyle = 'rgba(252,240,210,0.45)';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(ex, ey, 10, 0, Math.PI); ctx.stroke();
      }
      ctx.globalAlpha = 0.32;
      ctx.fillStyle = '#f6e6bd';
      ctx.font = '12px "Songti SC",serif';
      ctx.textAlign = 'center';
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU - t * 0.4;
        ctx.fillText('无', Math.cos(a) * 120, Math.sin(a) * 120 + 5);
      }
      ctx.textAlign = 'left';
      ctx.restore();
      ctx.globalAlpha = 1;
    } else {
      // 油纸伞：椭圆伞面（透视）、伞骨、竹柄、投影
      const awake = form === 'awake';
      const rx = awake ? 96 : 62 + wLevel('umbrella') * 3;
      const ry = rx * 0.60;
      const cx = p.x, cy = p.y - (awake ? 30 : 26);

      // 地面投影
      ctx.save();
      ctx.globalAlpha = 0.30;
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(p.x, p.y + 22, rx * 0.72, ry * 0.42, 0, 0, TAU); ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.sin(t * 0.8) * 0.05);
      // 伞面渐变（纸的暖色）
      const paper = ctx.createLinearGradient(-rx, -ry, rx * 0.6, ry);
      paper.addColorStop(0, awake ? 'rgba(250,242,222,0.97)' : 'rgba(244,234,212,0.97)');
      paper.addColorStop(0.5, awake ? 'rgba(238,220,186,0.96)' : 'rgba(232,216,188,0.96)');
      paper.addColorStop(1, awake ? 'rgba(206,176,132,0.95)' : 'rgba(198,172,134,0.95)');
      ctx.fillStyle = paper;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
      ctx.fill();

      // 伞骨：从顶部中心放射到伞沿（椭圆上取点）
      const ribs = awake ? 14 : 10;
      for (let i = 0; i < ribs; i++) {
        const a = ang * 0.55 + i / ribs * TAU;
        const ex = Math.cos(a) * rx, ey = Math.sin(a) * ry;
        ctx.strokeStyle = awake ? 'rgba(70,44,18,0.62)' : 'rgba(86,58,26,0.5)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(ex * 0.55, ey * 0.4 - ry * 0.16, ex, ey);
        ctx.stroke();
      }
      // 伞面高光（左上）
      const hl = ctx.createLinearGradient(-rx, -ry, 0, 0);
      hl.addColorStop(0, 'rgba(255,255,245,0.55)');
      hl.addColorStop(1, 'rgba(255,255,245,0)');
      ctx.fillStyle = hl;
      ctx.beginPath();
      ctx.ellipse(-rx * 0.22, -ry * 0.24, rx * 0.62, ry * 0.52, -0.3, 0, TAU);
      ctx.fill();
      // 伞沿
      ctx.strokeStyle = awake ? 'rgba(196,74,48,0.95)' : 'rgba(120,80,40,0.85)';
      ctx.lineWidth = awake ? 3 : 2;
      if (awake) { ctx.shadowColor = 'rgba(240,150,90,0.55)'; ctx.shadowBlur = 10; }
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
      ctx.stroke();
      ctx.shadowBlur = 0;
      // 伞顶
      ctx.fillStyle = '#7a5226';
      ctx.beginPath(); ctx.ellipse(0, -ry * 0.02, 6, 4, 0, 0, TAU); ctx.fill();
      // 竹柄（斜向下）
      ctx.strokeStyle = 'rgba(120,86,42,0.95)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.quadraticCurveTo(rx * 0.18, ry * 0.9, rx * 0.24, ry * 1.45);
      ctx.stroke();
      // 手柄
      ctx.strokeStyle = 'rgba(90,60,28,1)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(rx * 0.24, ry * 1.5, 6, 0.2, Math.PI - 0.2);
      ctx.stroke();
      ctx.restore();

      if (awake) {
        // 千机伞：伞沿外圈悬浮的伞骨刃（待发，不是飞出的那串）
        ctx.save();
        ctx.translate(cx, cy);
        for (let i = 0; i < 8; i++) {
          const a = -t * 1.2 + i / 8 * TAU;
          const bx = Math.cos(a) * (rx + 20), by = Math.sin(a) * (ry + 14);
          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate(a + Math.PI / 2);
          const bg = ctx.createLinearGradient(0, -9, 0, 9);
          bg.addColorStop(0, 'rgba(255,250,230,0.95)');
          bg.addColorStop(1, 'rgba(255,210,140,0.25)');
          ctx.fillStyle = bg;
          ctx.beginPath();
          ctx.moveTo(0, -12); ctx.lineTo(3, 6); ctx.lineTo(0, 10); ctx.lineTo(-3, 6);
          ctx.closePath(); ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      }
    }
  }

  // 铜镜
  if (wLevel('mirror') > 0) {
    const form = awForm('mirror');
    if (form === 'awake') {
      const a0 = p.mirAng || 0;
      for (const off of [0, Math.PI]) {
        const a = a0 + off;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(a);
        const g = ctx.createLinearGradient(0, 0, 320, 0);
        g.addColorStop(0, 'rgba(255,248,220,0.20)');
        g.addColorStop(0.55, 'rgba(255,226,160,0.10)');
        g.addColorStop(1, 'rgba(255,210,120,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 320, -0.17, 0.17); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,250,230,0.55)';
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(312, 0); ctx.stroke();
        ctx.restore();
      }
    }
    // 绕身的镜
    const orbitA = t * 1.4;
    const mx = p.x + Math.cos(orbitA) * 34, my = p.y + Math.sin(orbitA) * 34 - 8;
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(orbitA);
    ctx.fillStyle = 'rgba(255,246,215,0.95)';
    ctx.beginPath(); ctx.ellipse(0, 0, 9, 11, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(180,140,70,0.9)';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(0, 0, 9, 11, 0, 0, TAU); ctx.stroke();
    ctx.restore();
  }
}

function drawShots(t) {
  for (const s of G.shots) {
    if (s.type === 'talisman') {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.strokeStyle = 'rgba(240,198,116,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-7, 0); ctx.stroke();
      const rg = ctx.createLinearGradient(-6, -9, 8, 9);
      rg.addColorStop(0, '#f6e6bd');
      rg.addColorStop(1, '#e0b96f');
      ctx.fillStyle = rg;
      ctx.fillRect(-6, -9, 13, 18);
      ctx.strokeStyle = 'rgba(180,40,30,0.85)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-2, -5); ctx.lineTo(2, -1); ctx.lineTo(-2, 3); ctx.lineTo(2, 7);
      ctx.stroke();
      if (s.seal) {
        ctx.strokeStyle = 'rgba(255,214,150,0.55)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, 0, 14, 0, TAU); ctx.stroke();
      }
      ctx.restore();
    } else if (s.type === 'needle') {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(Math.atan2(s.vy, s.vx));
      // 光矛拖尾
      const tg = ctx.createLinearGradient(-70, 0, 10, 0);
      tg.addColorStop(0, 'rgba(150,200,255,0)');
      tg.addColorStop(1, 'rgba(200,230,255,0.55)');
      ctx.strokeStyle = tg;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-70, 0); ctx.lineTo(6, 0); ctx.stroke();
      const L = 26;
      const g2 = ctx.createLinearGradient(-L, 0, 8, 0);
      g2.addColorStop(0, 'rgba(200,230,255,0)');
      g2.addColorStop(0.6, 'rgba(205,235,255,0.92)');
      g2.addColorStop(1, '#ffffff');
      ctx.strokeStyle = g2;
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(8, 0); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(4, -3.4); ctx.lineTo(4, 3.4); ctx.closePath(); ctx.fill();
      ctx.restore();
    } else if (s.type === 'lance') {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(Math.atan2(s.vy, s.vx));
      const bone = s.style === 'bone';
      // 拖尾光带
      const tg = ctx.createLinearGradient(-120, 0, 14, 0);
      tg.addColorStop(0, 'rgba(255,255,255,0)');
      tg.addColorStop(0.55, bone ? 'rgba(240,236,220,0.35)' : 'rgba(200,226,255,0.35)');
      tg.addColorStop(1, bone ? 'rgba(255,252,240,0.95)' : 'rgba(235,246,255,0.95)');
      ctx.strokeStyle = tg;
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-120, 0); ctx.lineTo(10, 0); ctx.stroke();
      // 核心
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(16, 0); ctx.stroke();
      // 枪头
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(12, -4.5); ctx.lineTo(12, 4.5); ctx.closePath(); ctx.fill();
      // 镜光
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = bone ? '#f6efdc' : '#d8ecff';
      ctx.beginPath(); ctx.arc(12, 0, 9, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    } else if (s.type === 'dragon') {
      // 一串伞骨：一节一节、中间留缝，沿曲线游走
      const tr = s.trail;
      if (tr.length > 6) {
        const gold = s.style === 'gold';
        ctx.save();
        ctx.lineCap = 'round';
        for (let i = 2; i < tr.length; i += 3) {
          const a = Math.atan2(tr[i].y - tr[i - 1].y, tr[i].x - tr[i - 1].x);
          const k = i / tr.length;
          const len = 9 + 13 * k;
          const wid = 2.2 + 2.4 * k;
          ctx.save();
          ctx.translate(tr[i].x, tr[i].y);
          ctx.rotate(a + Math.PI / 2);
          // 骨刃
          const bg = ctx.createLinearGradient(0, -len, 0, len);
          if (gold) {
            bg.addColorStop(0, 'rgba(255,252,236,0.98)');
            bg.addColorStop(0.5, 'rgba(255,214,140,0.95)');
            bg.addColorStop(1, 'rgba(220,150,60,0.85)');
          } else {
            bg.addColorStop(0, 'rgba(255,255,252,0.98)');
            bg.addColorStop(0.5, 'rgba(236,232,214,0.95)');
            bg.addColorStop(1, 'rgba(170,170,150,0.85)');
          }
          ctx.fillStyle = bg;
          ctx.beginPath();
          ctx.moveTo(0, -len);
          ctx.lineTo(wid, 0);
          ctx.lineTo(0, len);
          ctx.lineTo(-wid, 0);
          ctx.closePath();
          ctx.fill();
          // 骨节高光
          ctx.strokeStyle = gold ? 'rgba(255,240,190,0.7)' : 'rgba(255,255,245,0.7)';
          ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(0, -len * 0.8); ctx.lineTo(0, len * 0.8); ctx.stroke();
          ctx.restore();
        }
        ctx.restore();
      }
    } else if (s.type === 'rib') {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot + t * 14);
      const bg = ctx.createLinearGradient(-13, 0, 14, 0);
      bg.addColorStop(0, 'rgba(255,246,214,0)');
      bg.addColorStop(0.45, 'rgba(255,240,200,0.95)');
      bg.addColorStop(1, 'rgba(255,255,255,1)');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.quadraticCurveTo(2, -6, -13, 0);
      ctx.quadraticCurveTo(2, 6, 16, 0);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,240,0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(13, 0); ctx.stroke();
      ctx.restore();
    } else if (s.type === 'lance') {
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (!s.hitSet) s.hitSet = new Set();
      for (const e of G.enemies) {
        if (!e.alive || s.hitSet.has(e)) continue;
        if (dist2(s.x, s.y, e.x, e.y) < (e.r + 12) * (e.r + 12)) {
          s.hitSet.add(e);
          damageEnemy(e, s.dmg, { knock: 90, fromX: s.x - s.vx * 0.05, fromY: s.y - s.vy * 0.05 });
          markEnemy(e, 4, s.mark || 1.2);
          burst(e.x, e.y, 4, s.style === 'bone' ? '#f2ead6' : '#dcecff', { spd: 240, size: 2.4, life: 0.3 });
          s.pierce--;
          if (s.pierce <= 0) { s.alive = false; break; }
        }
      }
      if (s.life <= 0) s.alive = false;
    } else if (s.type === 'moonwave' || s.type === 'crescent') {
      const w = s.w || 30, len = s.len || 150;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);

      const R0 = len, cx0 = -len * 0.3;
      const A0 = -0.9, A1 = 0.9;
      const N = 44;
      const drawBand = (thick, fillStyle) => {
        ctx.fillStyle = fillStyle;
        ctx.beginPath();
        for (let i = 0; i <= N; i++) {
          const k = i / N;
          const a = A0 + (A1 - A0) * k;
          const x = cx0 + Math.cos(a) * R0, y = Math.sin(a) * R0;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        for (let i = N; i >= 0; i--) {
          const k = i / N;
          const a = A0 + (A1 - A0) * k;
          const th = Math.max(0.8, thick * Math.pow(Math.sin(Math.PI * k), 0.8));
          ctx.lineTo(cx0 + Math.cos(a) * (R0 - th), Math.sin(a) * (R0 - th));
        }
        ctx.closePath();
        ctx.fill();
      };

      // 外辉（冷蓝）
      ctx.save();
      ctx.shadowColor = 'rgba(120,180,255,0.95)';
      ctx.shadowBlur = 24;
      drawBand(w * 1.9, 'rgba(96,150,255,0.28)');
      ctx.restore();

      // 刀身（内冷外白）
      const g = ctx.createLinearGradient(0, -w * 1.5, 0, w * 1.5);
      g.addColorStop(0, 'rgba(90,130,235,0.55)');
      g.addColorStop(0.42, 'rgba(170,215,255,0.95)');
      g.addColorStop(0.62, 'rgba(255,255,255,1)');
      g.addColorStop(1, 'rgba(120,170,255,0.55)');
      drawBand(w, g);

      // 刃口高光
      ctx.strokeStyle = 'rgba(255,255,255,0.98)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(cx0, 0, R0 - 0.8, A0 + 0.06, A1 - 0.06);
      ctx.stroke();

      // 刃尾拖光（短，不是光柱）
      const tail = ctx.createLinearGradient(-len * 0.75, 0, -len * 0.15, 0);
      tail.addColorStop(0, 'rgba(120,170,255,0)');
      tail.addColorStop(1, 'rgba(180,220,255,0.35)');
      ctx.strokeStyle = tail;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx0 + R0 - w * 0.5, 0);
      ctx.lineTo(cx0 + R0 - w * 0.5 - len * 0.65, 0);
      ctx.stroke();

      // 火花
      for (let i = 0; i < 6; i++) {
        const a = rnd(A1 - 0.1, A0 + 0.1);
        ctx.globalAlpha = rnd(0.85, 0.3);
        ctx.fillStyle = i % 2 ? '#cfe6ff' : '#ffffff';
        ctx.beginPath();
        ctx.arc(cx0 + Math.cos(a) * (R0 - w * 0.5), Math.sin(a) * (R0 - w * 0.5), rnd(2, 0.7), 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    } else if (s.type === 'lance') {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(Math.atan2(s.vy, s.vx));
      const bone = s.style === 'bone';
      // 拖尾光带
      const tg = ctx.createLinearGradient(-120, 0, 14, 0);
      tg.addColorStop(0, 'rgba(255,255,255,0)');
      tg.addColorStop(0.55, bone ? 'rgba(240,236,220,0.35)' : 'rgba(200,226,255,0.35)');
      tg.addColorStop(1, bone ? 'rgba(255,252,240,0.95)' : 'rgba(235,246,255,0.95)');
      ctx.strokeStyle = tg;
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-120, 0); ctx.lineTo(10, 0); ctx.stroke();
      // 核心
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(16, 0); ctx.stroke();
      // 枪头
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(12, -4.5); ctx.lineTo(12, 4.5); ctx.closePath(); ctx.fill();
      // 镜光
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = bone ? '#f6efdc' : '#d8ecff';
      ctx.beginPath(); ctx.arc(12, 0, 9, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    } else if (s.type === 'dragon') {
      s.t += dt;
      // 盘绕玩家游走，而不是直线飞走
      s.theta += s.t * 0 + dt * 2.9 * s.dir;
      const R = 150 + Math.sin(s.t * 2.6) * 55;
      const px = G.player.x + Math.cos(s.theta) * R;
      const py = G.player.y + Math.sin(s.theta) * R * 0.82;
      s.x = px; s.y = py;
      s.trail.push({ x: px, y: py });
      if (s.trail.length > 46) s.trail.shift();
      for (const e of G.enemies) {
        if (!e.alive) continue;
        if (e.dragonCd > 0) continue;
        if (dist2(s.x, s.y, e.x, e.y) < (e.r + s.radius) * (e.r + s.radius)) {
          e.dragonCd = 0.28;
          damageEnemy(e, s.dmg, { knock: 260, fromX: s.x, fromY: s.y });
          burst(e.x, e.y, 4, s.style === 'gold' ? '#ffd489' : '#e8e2d0', { spd: 200, size: 2.6, life: 0.3 });
        }
      }
      if (s.life <= 0) s.alive = false;
    } else if (s.type === 'crane') {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      const flap = Math.sin(s.wob) * 0.55;
      const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 46);
      glow.addColorStop(0, 'rgba(255,250,235,0.45)');
      glow.addColorStop(1, 'rgba(255,240,210,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(0, 0, 46, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,252,240,0.96)';
      ctx.beginPath();
      ctx.moveTo(26, 0);
      ctx.quadraticCurveTo(4, -8, -14, -22 * (0.65 + flap * 0.35));
      ctx.quadraticCurveTo(-4, -4, -2, 0);
      ctx.quadraticCurveTo(-4, 4, -14, 22 * (0.65 + flap * 0.35));
      ctx.quadraticCurveTo(4, 8, 26, 0);
      ctx.fill();
      ctx.strokeStyle = 'rgba(200,60,50,0.7)';
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(6, 0); ctx.stroke();
      ctx.restore();
    } else if (s.type === 'kite') {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      if (s.big) {
        const gl = ctx.createRadialGradient(0, 0, 1, 0, 0, 34);
        gl.addColorStop(0, 'rgba(255,252,238,0.35)');
        gl.addColorStop(1, 'rgba(255,246,220,0)');
        ctx.fillStyle = gl;
        ctx.beginPath(); ctx.arc(0, 0, 34, 0, TAU); ctx.fill();
        ctx.scale(1.7, 1.7);
      }
      const flap = Math.sin(s.wob) * 0.5;
      ctx.fillStyle = 'rgba(240,226,196,0.92)';
      ctx.beginPath();
      ctx.moveTo(11, 0);
      ctx.lineTo(-7, -8 * (0.7 + flap * 0.3));
      ctx.lineTo(-3, 0);
      ctx.lineTo(-7, 8 * (0.7 + flap * 0.3));
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(217,80,63,0.75)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-2, 0); ctx.stroke();
      ctx.restore();
    }
  }
}

function drawEnemy(e, t) {
  if (!e.alive) return;
  const flash = e.flash > 0 ? e.flash : 0;
  // 远处敌人用简化画法（性能）
  if (!e.boss && G.player) {
    const d2 = dist2(e.x, e.y, G.player.x, G.player.y);
    if (d2 > 380 * 380) {
      const sx = e.x - (G.cam.x + G.shakeX) + VIEW.w / 2;
      const sy = e.y - (G.cam.y + G.shakeY) + VIEW.h / 2;
      if (sx < -40 || sx > VIEW.w + 40 || sy < -40 || sy > VIEW.h + 40) return;
      ctx.fillStyle = e.ink;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.ellipse(sx, sy, e.r * 0.85, e.r, 0, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = e.type === 'mei' ? 0.9 : 0.7;
      ctx.fillStyle = e.type === 'mei' ? '#d8f4ff' : '#ff6a6a';
      ctx.beginPath();
      ctx.arc(sx - 3, sy - 2, 1.6, 0, TAU);
      ctx.arc(sx + 3, sy - 2, 1.6, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }
  }
  ctx.save();
  ctx.translate(e.x, e.y);

  // 地面阴影
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(0, e.r * 0.66, e.r * 0.9, e.r * 0.36, 0, 0, TAU); ctx.fill();

  const col = e.ink;
  const bodyCol = flash > 0 ? mixHex(col, '#ffffff', flash * 0.85) : col;

  if (e.type === 'chi') {
    const flap = Math.sin(e.anim + t * 14) * 0.6;
    // 残影
    ctx.fillStyle = 'rgba(120,30,45,0.22)';
    ctx.beginPath(); ctx.ellipse(0, 6, 10, 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = shade(col, -0.62);
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sgn * 3, -3);
      ctx.quadraticCurveTo(sgn * 17, -16 - flap * 9, sgn * 28, -2 + flap * 5);
      ctx.quadraticCurveTo(sgn * 20, 0 + flap * 2, sgn * 22, 5 + flap * 3);
      ctx.quadraticCurveTo(sgn * 12, 4, sgn * 3, 5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = bodyCol;
    ctx.beginPath(); ctx.ellipse(0, 0, 8.5, 10, 0, 0, TAU); ctx.fill();
    // 头角
    ctx.fillStyle = shade(col, 0.12);
    ctx.beginPath(); ctx.moveTo(-3, -9); ctx.lineTo(-1, -14); ctx.lineTo(1, -9); ctx.fill();
    ctx.beginPath(); ctx.moveTo(1, -9); ctx.lineTo(3, -14); ctx.lineTo(4, -9); ctx.fill();
    // 红瞳
    ctx.fillStyle = '#ff5a5a';
    ctx.beginPath(); ctx.arc(-3.2, -2.5, 1.9, 0, TAU); ctx.arc(3.2, -2.5, 1.9, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,180,180,0.9)';
    ctx.beginPath(); ctx.arc(-3.2, -2.5, 0.7, 0, TAU); ctx.arc(3.2, -2.5, 0.7, 0, TAU); ctx.fill();
  } else if (e.type === 'mei') {
    const a = 0.55 + Math.sin(t * 2 + e.anim) * 0.12;
    ctx.globalAlpha = a + flash * 0.4;
    // 外晕
    const halo = ctx.createRadialGradient(0, -2, 2, 0, 0, 30);
    halo.addColorStop(0, 'rgba(150,215,245,0.28)');
    halo.addColorStop(1, 'rgba(110,175,215,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(0, 0, 30, 0, TAU); ctx.fill();
    // 主体
    const rg = ctx.createRadialGradient(0, -6, 2, 0, 0, 22);
    rg.addColorStop(0, 'rgba(215,245,255,0.95)');
    rg.addColorStop(0.55, 'rgba(150,205,235,0.62)');
    rg.addColorStop(1, 'rgba(120,180,220,0.05)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(-10, -1);
    ctx.quadraticCurveTo(-13, 12, -3, 22 + Math.sin(t * 3 + e.anim) * 4);
    ctx.quadraticCurveTo(0, 15, 3, 22 + Math.cos(t * 2.6 + e.anim) * 4);
    ctx.quadraticCurveTo(13, 12, 10, -1);
    ctx.quadraticCurveTo(8, -15, 0, -15);
    ctx.quadraticCurveTo(-8, -15, -10, -1);
    ctx.fill();
    // 眼窝
    ctx.fillStyle = 'rgba(16,32,48,0.9)';
    ctx.beginPath(); ctx.ellipse(-3.6, -5, 2.3, 3.4, 0, 0, TAU); ctx.ellipse(3.6, -5, 2.3, 3.4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(150,235,255,0.9)';
    ctx.beginPath(); ctx.arc(-3.6, -5, 0.9, 0, TAU); ctx.arc(3.6, -5, 0.9, 0, TAU); ctx.fill();
    // 飘带
    ctx.strokeStyle = 'rgba(160,220,245,0.28)';
    ctx.lineWidth = 1.2;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * 9, 4);
      ctx.quadraticCurveTo(sx * 16, 14 + Math.sin(t * 4 + e.anim) * 4, sx * 12, 24);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (e.type === 'zhu') {
    ctx.strokeStyle = shade(col, -0.3);
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const ph = e.anim + t * 11 + i * 1.7;
      const sw = Math.sin(ph) * 5;
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sgn * 5, -2 + i * 3);
        ctx.quadraticCurveTo(sgn * 13, -6 + i * 3 + sw, sgn * 19, 4 + i * 3 + sw * 0.5);
        ctx.stroke();
      }
    }
    ctx.fillStyle = bodyCol;
    ctx.beginPath(); ctx.ellipse(0, 0, 11, 9, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffe066';
    ctx.beginPath(); ctx.arc(-3, -2, 1.6, 0, TAU); ctx.arc(3, -2, 1.6, 0, TAU); ctx.fill();
    ctx.fillStyle = shade(col, -0.5);
    ctx.beginPath(); ctx.arc(0, 2, 4, 0, TAU); ctx.fill();
  } else if (e.type === 'jiang') {
    const sway = Math.sin(e.anim + t * 3.2) * 3;
    ctx.fillStyle = shade(col, -0.42);
    ctx.beginPath();
    ctx.moveTo(-12, 16); ctx.lineTo(-10, -8); ctx.quadraticCurveTo(0, -14, 10, -8); ctx.lineTo(12, 16);
    ctx.closePath(); ctx.fill();
    // 手臂
    ctx.strokeStyle = shade(col, -0.25);
    ctx.lineWidth = 3.4;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-9, -4); ctx.lineTo(-17, 6 + sway); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(9, -4); ctx.lineTo(17, 6 - sway); ctx.stroke();
    // 头
    ctx.fillStyle = bodyCol;
    ctx.beginPath(); ctx.arc(0, -13, 8, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(20,26,18,0.9)';
    ctx.beginPath(); ctx.arc(-3, -14, 1.7, 0, TAU); ctx.arc(3, -14, 1.7, 0, TAU); ctx.fill();
    // 符
    ctx.fillStyle = 'rgba(240,220,150,0.85)';
    ctx.fillRect(-3, -6, 6, 10);
  } else if (e.type === 'nuo') {
    const bob = Math.sin(t * 2.2 + e.anim) * 3;
    // 袍影
    ctx.fillStyle = 'rgba(60,30,22,0.85)';
    ctx.beginPath();
    ctx.moveTo(-20, 24); ctx.quadraticCurveTo(-14, -6, -6, -18); ctx.lineTo(6, -18);
    ctx.quadraticCurveTo(14, -6, 20, 24); ctx.closePath(); ctx.fill();
    // 傩面
    const rg = ctx.createLinearGradient(0, -34, 0, -8);
    rg.addColorStop(0, '#e8704a');
    rg.addColorStop(1, '#8e2418');
    ctx.fillStyle = flash > 0 ? mixHex('#c0392b', '#fff', flash) : rg;
    ctx.beginPath();
    ctx.moveTo(0, -40 + bob); ctx.lineTo(13, -32 + bob); ctx.lineTo(11, -14 + bob);
    ctx.quadraticCurveTo(0, -6 + bob, -11, -14 + bob); ctx.lineTo(-13, -32 + bob);
    ctx.closePath(); ctx.fill();
    // 角
    ctx.strokeStyle = '#e8c98a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-10, -34 + bob); ctx.quadraticCurveTo(-20, -44 + bob, -13, -52 + bob); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, -34 + bob); ctx.quadraticCurveTo(20, -44 + bob, 13, -52 + bob); ctx.stroke();
    // 眼
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.ellipse(-5, -28 + bob, 2.6, 1.6, -0.3, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(5, -28 + bob, 2.6, 1.6, 0.3, 0, TAU); ctx.fill();
    // 口
    ctx.strokeStyle = '#2a0e0a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-4, -18 + bob); ctx.quadraticCurveTo(0, -15 + bob, 4, -18 + bob); ctx.stroke();
  } else if (e.type === 'boss') {
    drawBoss(e, t, flash);
    ctx.restore();
    return;
  }

  // 显形 / 劫印
  if (e.markT > 0) {
    ctx.strokeStyle = 'rgba(255,240,200,0.55)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(0, 0, e.r + 7, t * 1.6, t * 1.6 + TAU); ctx.stroke();
    ctx.setLineDash([]);
  }
  if (e.judgeT > 0) {
    const k = 1 - e.judgeT / 0.95;
    ctx.strokeStyle = `rgba(255,${120 + k * 90},90,${0.5 + k * 0.5})`;
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(0, 0, (e.r + 26) * (1 - k * 0.55), 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(255,220,150,0.85)';
    ctx.font = '13px "Songti SC",serif';
    ctx.textAlign = 'center';
    ctx.fillText('劫', 0, -e.r - 14);
    ctx.textAlign = 'left';
  }

  // 受击白闪
  if (flash > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = flash * 0.35;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, 0, e.r * 1.5, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // 精英血条
  if (e.elite) {
    const w = 40;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(-w / 2, -e.r - 26, w, 4);
    ctx.fillStyle = '#e0a04a';
    ctx.fillRect(-w / 2, -e.r - 26, w * clamp(e.hp / e.hpMax, 0, 1), 4);
  }
  ctx.restore();
}

function drawBoss(e, t, flash) {
  const bob = Math.sin(t * 1.4) * 5;
  const R = 44;

  // 不祥之雾
  const auraR = R * 3.4;
  const rg0 = ctx.createRadialGradient(0, 0, 8, 0, 0, auraR);
  rg0.addColorStop(0, 'rgba(150,26,26,0.30)');
  rg0.addColorStop(0.55, 'rgba(90,12,16,0.14)');
  rg0.addColorStop(1, 'rgba(60,8,10,0)');
  ctx.fillStyle = rg0;
  ctx.beginPath(); ctx.arc(0, 0, auraR, 0, TAU); ctx.fill();

  // 触须
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU + t * 0.45;
    const wob = Math.sin(t * 2 + i * 1.3) * 16;
    const len = R * 1.8;
    ctx.strokeStyle = 'rgba(52,14,18,0.92)';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 18, R * 0.5);
    ctx.quadraticCurveTo(
      Math.cos(a) * len * 0.7 + wob, R * 0.9 + Math.sin(a) * 20 - bob,
      Math.cos(a) * len, R * 1.5 + wob * 0.5
    );
    ctx.stroke();
    ctx.strokeStyle = 'rgba(96,24,26,0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 18, R * 0.5);
    ctx.quadraticCurveTo(
      Math.cos(a) * len * 0.7 + wob, R * 0.9 + Math.sin(a) * 20 - bob,
      Math.cos(a) * len, R * 1.5 + wob * 0.5
    );
    ctx.stroke();
  }

  // 袍身
  const rg = ctx.createRadialGradient(-6, -R * 0.5, 6, 0, 0, R * 1.5);
  rg.addColorStop(0, flash > 0 ? '#ffd9d4' : '#54191c');
  rg.addColorStop(0.55, '#2b0c10');
  rg.addColorStop(1, '#0d0407');
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.moveTo(0, -R * 1.05 + bob);
  ctx.quadraticCurveTo(R * 0.95, -R * 0.72 + bob, R * 0.86, R * 0.25 + bob);
  ctx.quadraticCurveTo(R * 0.72, R * 1.05, 0, R * 1.15);
  ctx.quadraticCurveTo(-R * 0.72, R * 1.05, -R * 0.86, R * 0.25 + bob);
  ctx.quadraticCurveTo(-R * 0.95, -R * 0.72 + bob, 0, -R * 1.05 + bob);
  ctx.fill();

  // 袍纹
  ctx.strokeStyle = 'rgba(200,150,80,0.28)';
  ctx.lineWidth = 1.6;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.arc(i * 18, R * 0.55, 8, 0.4, Math.PI * 1.6);
    ctx.stroke();
  }

  // 傩面（窄长、尖颌）
  const faceY = -R * 0.52 + bob;
  const fg = ctx.createLinearGradient(0, faceY - 34, 0, faceY + 30);
  fg.addColorStop(0, '#8e2418');
  fg.addColorStop(0.55, '#5c140f');
  fg.addColorStop(1, '#2a0806');
  ctx.fillStyle = flash > 0 ? mixHex('#8e2418', '#ffffff', Math.min(1, flash)) : fg;
  ctx.beginPath();
  ctx.moveTo(0, faceY - 34);
  ctx.quadraticCurveTo(15, faceY - 30, 16, faceY - 10);
  ctx.quadraticCurveTo(15, faceY + 8, 6, faceY + 26);
  ctx.lineTo(0, faceY + 31);
  ctx.lineTo(-6, faceY + 26);
  ctx.quadraticCurveTo(-15, faceY + 8, -16, faceY - 10);
  ctx.quadraticCurveTo(-15, faceY - 30, 0, faceY - 34);
  ctx.fill();
  ctx.strokeStyle = 'rgba(240,198,116,0.5)';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // 角
  ctx.strokeStyle = '#e6c78a';
  ctx.lineWidth = 4.4;
  ctx.beginPath();
  ctx.moveTo(-13, faceY - 26);
  ctx.quadraticCurveTo(-32, faceY - 40, -26, faceY - 56);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(13, faceY - 26);
  ctx.quadraticCurveTo(32, faceY - 40, 26, faceY - 56);
  ctx.stroke();

  // 吊眉
  ctx.strokeStyle = 'rgba(232,199,138,0.9)';
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(-13, faceY - 16);
  ctx.lineTo(-2, faceY - 9);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(13, faceY - 16);
  ctx.lineTo(2, faceY - 9);
  ctx.stroke();

  // 斜眼
  ctx.fillStyle = '#120406';
  for (const sgn of [-1, 1]) {
    ctx.save();
    ctx.translate(sgn * 6.5, faceY - 4);
    ctx.rotate(sgn * 0.34);
    ctx.beginPath();
    ctx.ellipse(0, 0, 5.6, 3.4, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  const pulse = 0.7 + Math.sin(t * 5) * 0.3;
  ctx.fillStyle = `rgba(255,140,60,${pulse})`;
  ctx.beginPath();
  ctx.arc(-6.5, faceY - 4, 2.1, 0, TAU);
  ctx.arc(6.5, faceY - 4, 2.1, 0, TAU);
  ctx.fill();

  // 獠牙口 + 口中灯
  const ly = faceY + 18;
  const maw = ctx.createRadialGradient(0, ly, 1, 0, ly, 20);
  maw.addColorStop(0, 'rgba(255,214,140,0.85)');
  maw.addColorStop(0.5, 'rgba(200,70,30,0.55)');
  maw.addColorStop(1, 'rgba(60,10,8,0)');
  ctx.fillStyle = maw;
  ctx.beginPath(); ctx.ellipse(0, ly, 16, 13, 0, 0, TAU); ctx.fill();

  ctx.fillStyle = '#17060a';
  ctx.beginPath();
  ctx.moveTo(-11, faceY + 9);
  ctx.quadraticCurveTo(0, faceY + 2, 11, faceY + 9);
  ctx.quadraticCurveTo(9, faceY + 24, 0, faceY + 27);
  ctx.quadraticCurveTo(-9, faceY + 24, -11, faceY + 9);
  ctx.fill();
  ctx.fillStyle = '#e8d3a0';
  for (const sx of [-7, -2.5, 2.5, 7]) {
    ctx.beginPath();
    ctx.moveTo(sx - 1.5, faceY + 10);
    ctx.lineTo(sx, faceY + 17);
    ctx.lineTo(sx + 1.5, faceY + 10);
    ctx.fill();
  }
  const tongue = 0.8 + Math.sin(t * 7) * 0.2;
  ctx.fillStyle = `rgba(255,170,80,${tongue})`;
  ctx.beginPath();
  ctx.ellipse(0, ly + 4, 4.5, 6.5, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,240,200,0.9)';
  ctx.beginPath();
  ctx.ellipse(0, ly + 3, 1.8, 3, 0, 0, TAU);
  ctx.fill();

  // 冲锋预警
  if (e.windup > 0) {
    ctx.save();
    ctx.rotate(e.windDir);
    const a = 0.30 + Math.sin(t * 26) * 0.16;
    const grd = ctx.createLinearGradient(20, 0, 260, 0);
    grd.addColorStop(0, `rgba(255,90,70,${a})`);
    grd.addColorStop(1, 'rgba(255,60,40,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(20, -16, 240, 32);
    ctx.strokeStyle = `rgba(255,120,90,${a + 0.2})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(20, -18); ctx.lineTo(260, -18); ctx.moveTo(20, 18); ctx.lineTo(260, 18); ctx.stroke();
    ctx.restore();
  }

  // 血条 + 名号
  const w = 118;
  const by = -R - 34;
  ctx.fillStyle = 'rgba(0,0,0,0.68)';
  ctx.fillRect(-w / 2, by, w, 7);
  ctx.fillStyle = '#c8342a';
  ctx.fillRect(-w / 2, by, w * clamp(e.hp / e.hpMax, 0, 1), 7);
  ctx.strokeStyle = 'rgba(240,198,116,0.55)';
  ctx.lineWidth = 1;
  ctx.strokeRect(-w / 2, by, w, 7);
  ctx.font = '600 10px "PingFang SC",system-ui,sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(240,198,116,0.9)';
  ctx.fillText('灯灭之影', 0, by - 6);
  ctx.textAlign = 'left';
}

function drawPlayer(p, t) {
  const bob = Math.sin(p.walk * 1.5) * 1.5;
  const hurt = p.hurtT > 0;
  ctx.save();
  ctx.translate(p.x, p.y + bob);
  ctx.scale(p.face * 1.45, 1.45);

  // 脚下阴影
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.ellipse(0, 9, 13, 5, 0, 0, TAU); ctx.fill();

  // 脚下灯环
  ctx.save();
  ctx.rotate(t * 0.6);
  ctx.strokeStyle = 'rgba(240,198,116,0.20)';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.ellipse(0, 10, 22, 8, 0, 0, TAU); ctx.stroke();
  for (let i = 0; i < 3; i++) {
    const a2 = i / 3 * TAU;
    ctx.fillStyle = 'rgba(240,198,116,0.5)';
    ctx.beginPath(); ctx.arc(Math.cos(a2) * 22, 10 + Math.sin(a2) * 8, 1.6, 0, TAU); ctx.fill();
  }
  ctx.restore();

  // 灯（在左手，画在身后）
  const swing = Math.sin(p.walk * 1.5) * 0.12;
  ctx.save();
  ctx.translate(-13, -4);
  ctx.rotate(swing);
  ctx.strokeStyle = '#6b5230';
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, 2); ctx.stroke();
  const lx = 0, ly = 8;
  const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, 34);
  lg.addColorStop(0, 'rgba(255,226,160,0.55)');
  lg.addColorStop(0.4, 'rgba(255,170,80,0.18)');
  lg.addColorStop(1, 'rgba(255,140,40,0)');
  ctx.fillStyle = lg;
  ctx.beginPath(); ctx.arc(lx, ly, 34, 0, TAU); ctx.fill();
  // 灯罩
  ctx.fillStyle = 'rgba(32,26,20,0.95)';
  ctx.beginPath();
  ctx.moveTo(-5, ly - 6); ctx.lineTo(5, ly - 6); ctx.lineTo(6, ly + 5); ctx.lineTo(-6, ly + 5);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,205,120,0.95)';
  ctx.beginPath(); ctx.ellipse(0, ly, 3.6, 5, 0, 0, TAU); ctx.fill();
  ctx.restore();

  // 袍
  const sway = Math.sin(p.walk * 1.5 + 0.6) * 1.4;
  const rg = ctx.createLinearGradient(0, -18, 0, 12);
  if (hurt) { rg.addColorStop(0, '#c0503f'); rg.addColorStop(1, '#6d2018'); }
  else { rg.addColorStop(0, '#31414f'); rg.addColorStop(0.55, '#22303c'); rg.addColorStop(1, '#151f28'); }
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.moveTo(-7, -14);
  ctx.quadraticCurveTo(-13, -2, -11 + sway, 9);
  ctx.quadraticCurveTo(0, 12, 11 + sway, 9);
  ctx.quadraticCurveTo(13, -2, 7, -14);
  ctx.closePath(); ctx.fill();
  // 金边
  ctx.strokeStyle = 'rgba(240,198,116,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-7, -14); ctx.quadraticCurveTo(-13, -2, -11 + sway, 9);
  ctx.stroke();
  // 腰带
  ctx.fillStyle = 'rgba(217,80,63,0.75)';
  ctx.fillRect(-8, -2, 16, 2.4);
  // 灯火侧轮廓光
  const rim = ctx.createLinearGradient(-14, 0, 2, 0);
  rim.addColorStop(0, 'rgba(255,190,110,0.55)');
  rim.addColorStop(1, 'rgba(255,190,110,0)');
  ctx.strokeStyle = rim;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-7, -13);
  ctx.quadraticCurveTo(-13, -2, -11 + sway, 8);
  ctx.stroke();

  // 头 + 斗笠
  ctx.fillStyle = hurt ? '#f0d8c0' : '#e6cba6';
  ctx.beginPath(); ctx.arc(0, -19, 5.6, 0, TAU); ctx.fill();
  ctx.fillStyle = '#1b2833';
  ctx.beginPath();
  ctx.ellipse(0, -23, 12, 4.2, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-7, -23); ctx.quadraticCurveTo(0, -33, 7, -23);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(240,198,116,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(0, -23, 12, 4.2, 0, 0, TAU); ctx.stroke();

  // 无敌闪烁
  if (p.inv > 0 && Math.floor(p.inv * 20) % 2 === 0) {
    ctx.globalAlpha = 0.55;
  }
  ctx.restore();
}

function drawParticles() {
  for (const pt of G.parts) {
    const a = clamp(pt.life / pt.max, 0, 1);
    if (pt.type === 'ink') {
      ctx.globalAlpha = a * 0.85;
      ctx.fillStyle = pt.col;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * (0.4 + a * 0.6), 0, TAU); ctx.fill();
    } else if (pt.type === 'spark') {
      ctx.globalAlpha = a;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = pt.col;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * a, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    } else {
      ctx.globalAlpha = a * 0.7;
      ctx.fillStyle = pt.col;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * a, 0, TAU); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawTexts() {
  for (const tx of G.texts) {
    const a = clamp(tx.life / tx.max, 0, 1);
    ctx.globalAlpha = a;
    ctx.font = `600 ${tx.size}px "PingFang SC",system-ui,sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.strokeText(tx.txt, tx.x, tx.y);
    ctx.fillStyle = tx.col;
    ctx.fillText(tx.txt, tx.x, tx.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

/* ───────────────────────── 光影 ───────────────────────── */
function drawLighting(t) {
  const p = G.player;
  if (!p) return;
  const camX = G.cam.x + G.shakeX, camY = G.cam.y + G.shakeY;
  const px = VIEW.w / 2 + (p.x - camX), py = VIEW.h / 2 + (p.y - camY);
  const R = 300 + Math.min(150, p.lvl * 8);
  const g = ctx.createRadialGradient(px, py, R * 0.30, px, py, R * 1.7);
  g.addColorStop(0, 'rgba(4,6,10,0)');
  g.addColorStop(0.45, 'rgba(4,6,10,0.15)');
  g.addColorStop(0.78, 'rgba(3,5,8,0.44)');
  g.addColorStop(1, 'rgba(2,3,6,0.76)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);

  // 暖光
  ctx.globalCompositeOperation = 'lighter';
  const wg = ctx.createRadialGradient(px, py, 0, px, py, 210);
  wg.addColorStop(0, 'rgba(255,171,80,0.13)');
  wg.addColorStop(0.5, 'rgba(255,140,50,0.05)');
  wg.addColorStop(1, 'rgba(255,120,30,0)');
  ctx.fillStyle = wg;
  ctx.fillRect(px - 210, py - 210, 420, 420);
  ctx.globalCompositeOperation = 'source-over';

  // 光尘
  for (let i = 0; i < 26; i++) {
    const a2 = t * 0.35 + i * 2.399;
    const rr = 40 + ((i * 37) % 190);
    const dy = Math.sin(t * 0.9 + i * 1.7) * 16;
    const dx = Math.cos(a2) * rr;
    const px2 = px + dx, py2 = py + dy + (i % 3) * 6;
    const tw = 0.35 + 0.35 * Math.sin(t * 3 + i * 2.1);
    ctx.fillStyle = `rgba(255,214,150,${0.16 * tw})`;
    ctx.beginPath(); ctx.arc(px2, py2, 1.2, 0, TAU); ctx.fill();
  }

  // 暗角
  const vg = ctx.createRadialGradient(VIEW.w / 2, VIEW.h / 2, Math.min(VIEW.w, VIEW.h) * 0.32,
    VIEW.w / 2, VIEW.h / 2, Math.max(VIEW.w, VIEW.h) * 0.78);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
}

function drawJoystick() {
  if (!IN.on) return;
  const bx = IN.ox, by = IN.oy;
  ctx.save();
  ctx.strokeStyle = 'rgba(240,198,116,0.20)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(bx, by, 62, 0, TAU); ctx.stroke();
  const kx = bx + (IN.knobX || 0), ky = by + (IN.knobY || 0);
  const g = ctx.createRadialGradient(kx, ky, 0, kx, ky, 26);
  g.addColorStop(0, 'rgba(255,210,140,0.42)');
  g.addColorStop(1, 'rgba(255,170,80,0.02)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(kx, ky, 26, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,214,150,0.35)';
  ctx.beginPath(); ctx.arc(kx, ky, 20, 0, TAU); ctx.stroke();
  ctx.restore();
}

/* ───────────────────────── 暗处微光 ───────────────────────── */
function drawDarkGlow(t) {
  const camX = G.cam.x + G.shakeX, camY = G.cam.y + G.shakeY;
  ctx.globalCompositeOperation = 'lighter';
  for (const e of G.enemies) {
    if (!e.alive) continue;
    const sx = VIEW.w / 2 + (e.x - camX), sy = VIEW.h / 2 + (e.y - camY);
    if (sx < -60 || sx > VIEW.w + 60 || sy < -60 || sy > VIEW.h + 60) continue;
    const R = e.boss ? 70 : e.elite ? 30 : 12;
    const a = e.boss ? 0.16 : e.elite ? 0.10 : 0.045;
    const gr = ctx.createRadialGradient(sx, sy, 0, sx, sy, R);
    gr.addColorStop(0, `rgba(255,110,80,${a})`);
    gr.addColorStop(1, 'rgba(255,90,70,0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(sx, sy, R, 0, TAU); ctx.fill();
    // 眼
    if (!e.boss && e.type !== 'chi') {
      const er = e.elite ? 2.4 : 1.9;
      ctx.fillStyle = e.type === 'mei' ? 'rgba(180,235,255,0.75)' : 'rgba(255,120,110,0.8)';
      ctx.beginPath();
      ctx.arc(sx - 4, sy - 2, er, 0, TAU);
      ctx.arc(sx + 4, sy - 2, er, 0, TAU);
      ctx.fill();
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}

/* ───────────────────────── 主渲染 ───────────────────────── */
function render(t) {
  const camX = G.cam.x + G.shakeX, camY = G.cam.y + G.shakeY;
  drawBackground(t, camX, camY);

  ctx.save();
  ctx.translate(VIEW.w / 2 - camX, VIEW.h / 2 - camY);
  drawGround(camX, camY, t);
  drawRings();
  drawSeals(t);
  drawOrbs(t);
  drawSlashes();
  drawAwakenFx(t);
  drawWeaponAuras(t);

  // 按 y 排序绘制
  const list = G.enemies.slice().sort((a, b) => a.y - b.y);
  let playerDrawn = false;
  for (const e of list) {
    if (!playerDrawn && G.player && e.y > G.player.y) {
      drawPlayer(G.player, t);
      playerDrawn = true;
    }
    drawEnemy(e, t);
  }
  if (!playerDrawn && G.player) drawPlayer(G.player, t);

  drawBladeFx(t);
  drawShots(t);
  drawCones();
  drawBeams();
  drawRingFx();
  drawSealRings();
  drawArcs();
  drawParticles();
  drawTexts();
  ctx.restore();

  drawLighting(t);
  if (G.player && G.mode !== 'title') drawDarkGlow(t);
  drawJoystick();

  if (G.flash > 0) {
    ctx.globalAlpha = G.flash * 0.5;
    ctx.fillStyle = G.flashColor;
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    ctx.globalAlpha = 1;
  }

  // 升级时的金色呼吸
  if (G.mode === 'levelup') {
    const a = 0.10 + Math.sin(t * 4) * 0.04;
    ctx.fillStyle = `rgba(255,190,110,${a})`;
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  }
}

/* ───────────────────────── HUD ───────────────────────── */
const $ = id => document.getElementById(id);
const hudEl = {
  hpFill: $('hpFill'), hpText: $('hpText'), xpFill: $('xpFill'),
  time: $('timeText'), kills: $('killText'), lvl: $('lvlText'), wpn: $('wpnRow')
};
let lastWpnSig = '';

function syncHUD() {
  const p = G.player;
  if (!p || G.mode === 'title') return;
  hudEl.hpFill.style.transform = `scaleX(${clamp(p.hp / p.hpMax, 0, 1)})`;
  hudEl.hpText.textContent = `${Math.ceil(p.hp)} / ${Math.ceil(p.hpMax)}`;
  hudEl.xpFill.style.transform = `scaleX(${clamp(p.xp / p.xpNext, 0, 1)})`;
  hudEl.time.textContent = fmtTime(G.time);
  hudEl.kills.textContent = '斩 ' + G.kills;
  hudEl.lvl.textContent = '灯 ' + p.lvl;

  const sig = Object.keys(p.weapons).map(k => k + p.weapons[k]).join(',');
  if (sig !== lastWpnSig) {
    lastWpnSig = sig;
    hudEl.wpn.innerHTML = '';
    for (const k in p.weapons) {
      const w = WEAPONS[k];
      const d = document.createElement('div');
      d.className = 'wpn';
      d.innerHTML = `<span>${w.glyph}</span><em>${p.weapons[k]}</em>`;
      hudEl.wpn.appendChild(d);
    }
  }
}

let toastT = null;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('on'), 1900);
}

/* ───────────────────────── 颜色工具 ───────────────────────── */
function hex2rgb(h) {
  if (h[0] !== '#') return [200, 200, 200];
  h = h.slice(1);
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mixHex(a, b, t) {
  const A = hex2rgb(a), B = hex2rgb(b);
  return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`;
}
function shade(h, amt) {
  const A = hex2rgb(h);
  const f = c => amt < 0 ? Math.round(c * (1 + amt)) : Math.round(c + (255 - c) * amt);
  return `rgb(${f(A[0])},${f(A[1])},${f(A[2])})`;
}

/* ───────────────────────── 屏幕切换 ───────────────────────── */
const SCREENS = ['title', 'meta', 'levelup', 'pause', 'over', 'settings', 'story', 'awaken'];
function showScreen(id) {
  for (const s of SCREENS) {
    const el = $(s);
    if (el) el.classList.toggle('on', s === id);
  }
}
function setHUD(on) {
  $('hud').classList.toggle('on', on);
}
function fadeTo(fn) {
  const f = $('fade');
  f.classList.add('on');
  setTimeout(() => { fn(); f.classList.remove('on'); }, 300);
}

/* ───────────────────────── 局内流程 ───────────────────────── */
/* ───────────────────────── 新手教程 ───────────────────────── */
const TUT_STEPS = [
  { text: '按住屏幕拖动，提灯人就会朝手指方向走。松手即停。', hand: true },
  { text: '鬼会自己围上来，灯焰会自动烧到靠近的敌人——你不用点攻击。', hand: false },
  { text: '金光就是魂火（经验），靠近会自动吸过来，攒满灯阶就会升级。', hand: false },
  { text: '升级时三选一：武器、强化、或者被动。选完立刻生效。', hand: false },
  { text: '最后一步：别被围死。绕着圈走，把鬼拖成一条线。', hand: true }
];

function startTutorial() {
  G.mode = 'tutorial';
  G.time = 0; G.kills = 0; G.depth = 1;
  G.enemies = []; G.shots = []; G.orbs = []; G.parts = []; G.texts = []; G.rings = []; G.slashes = []; G.arcs = []; G.seals = []; G.cones = []; G.blades = []; G.bladeFx = []; G.sealRings = []; G.beams = []; G.ringFx = [];
  G.spawnT = 0; G.bossT = 1e9; G.boss = null; G.shake = 0; G.flash = 0; G.hitstop = 0;
  G.player = newPlayer();
  G.player.hpMax = 400; G.player.hp = 400;
  G.player.weapons = { flame: 2 };
  G.cam.x = 0; G.cam.y = 0;
  G.tut = { step: 0, t: 0, kills0: 0, xp0: 0, moved: 0, spawned: false, ringSpawned: false, done: false };
  IN.on = false;
  lastWpnSig = '';
  showScreen(null);
  setHUD(true);
  $('tutBar').classList.add('on');
  setTutStep(0);
  Sound.unlock();
}

function setTutStep(i) {
  const st = TUT_STEPS[i];
  if (!st) return;
  $('tutStep').textContent = `第 ${i + 1} 步 / 共 ${TUT_STEPS.length} 步`;
  $('tutText').textContent = st.text;
  $('tutBar').classList.toggle('hand', !!st.hand);
  G.tut.step = i;
  G.tut.t = 0;
  G.tut.moved = 0;
  G.tut.kills0 = G.kills;
  G.tut.xp0 = G.player.xp;
  G.tut.spawned = false;
  G.tut.ringSpawned = false;
}

function endTutorial() {
  G.tut = null;
  $('tutBar').classList.remove('on');
  G.mode = 'title';
  G.player = null;
  setHUD(false);
  showScreen('title');
  updateTitleStats();
  toast('教程完成 · 去走一夜吧');
}

function updateTutorial(dt) {
  const t = G.tut;
  if (!t) return;
  t.t += dt;
  const p = G.player;

  if (t.step === 0) {
    t.moved += Math.hypot(p.vx, p.vy) * dt;
    if (t.moved > 320) { setTutStep(1); toast('走得好'); }
  } else if (t.step === 1) {
    if (!t.spawned) {
      t.spawned = true;
      for (let i = 0; i < 4; i++) spawnEnemy('chi', { ang: i / 4 * TAU, rad: 180, hpMul: 0.7, spdMul: 2.0 });
    }
    if (t.t > 14 && !t.extra) {
      t.extra = true;
      for (let i = 0; i < 3; i++) spawnEnemy('chi', { ang: rnd(TAU), rad: 120, hpMul: 0.6, spdMul: 2.2 });
    }
    if (G.kills - t.kills0 >= 3) { setTutStep(2); }
  } else if (t.step === 2) {
    if (!t.spawned) {
      t.spawned = true;
      for (let i = 0; i < 10; i++) dropOrb(p.x + Math.cos(i / 10 * TAU) * 150, p.y + Math.sin(i / 10 * TAU) * 150, 1);
    }
    if (p.xp - t.xp0 >= 5 || p.lvl > 1) { setTutStep(3); }
  } else if (t.step === 3) {
    if (p.xp >= p.xpNext && G.mode === 'tutorial') {
      openLevelUp();
      return;
    }
    if (p.lvl > 1 && G.mode === 'tutorial') { setTutStep(4); }
  } else if (t.step === 4) {
    if (!t.ringSpawned) {
      t.ringSpawned = true;
      for (let i = 0; i < 12; i++) spawnEnemy(i % 3 === 0 ? 'mei' : 'chi', { ang: i / 12 * TAU, rad: 300, hpMul: 1.2 });
      toast('绕圈走，别停下');
    }
    if (t.t > 14) { t.done = true; endTutorial(); }
  }
}

function startRun() {
  G.mode = 'play';
  G.time = 0; G.kills = 0; G.soulsRun = 0; G.depth = 1;
  G.enemies = []; G.shots = []; G.orbs = []; G.parts = []; G.texts = []; G.rings = []; G.slashes = []; G.arcs = []; G.seals = []; G.cones = []; G.blades = []; G.bladeFx = []; G.sealRings = []; G.beams = []; G.ringFx = [];
  G.spawnT = 0; G.bossT = 240; G.boss = null; G.bossCount = 0;
  G.combo = 0; G.comboT = 0; G.shake = 0; G.flash = 0; G.hitstop = 0;
  G.eliteT = 58;
  G.player = newPlayer();
  recomputeStats();
  G.player.hp = G.player.hpMax;
  G.cam.x = 0; G.cam.y = 0;
  IN.on = false;
  lastWpnSig = '';
  showScreen(null);
  setHUD(true);
  $('tip').classList.toggle('on', !save.seen);
  if (!save.seen) { save.seen = true; persist(); }
  setTimeout(() => $('tip').classList.remove('on'), 4200);
  Sound.unlock();
}

function pauseGame() {
  if (G.mode !== 'play') return;
  G.mode = 'pause';
  showScreen('pause');
  Sound.ui();
}

function resumeGame() {
  if (G.mode !== 'pause') return;
  G.mode = 'play';
  lastT = 0;
  showScreen(null);
  Sound.ui();
}

function endRun(gaveUp) {
  if (G.mode === 'over') return;
  G.mode = 'over';
  const died = G.player.hp <= 0;
  const fortune = 1 + (save.meta.fortune || 0) * 0.08;
  const souls = Math.floor((G.kills * 0.5 + G.time / 8 + G.depth * 4) * fortune);
  const isBest = G.time > save.best;
  save.souls += souls;
  save.runs++;
  if (G.time > save.best) save.best = G.time;
  if (G.kills > save.bestKill) save.bestKill = G.kills;
  persist();

  $('overTitle').textContent = died ? '灯 灭 了' : '熄 灯 了';
  $('overHint').textContent = died ? '雾里再没有光' : '你带着余温离开了长夜';
  $('ovTime').textContent = fmtTime(G.time);
  $('ovKill').textContent = G.kills;
  $('ovLvl').textContent = G.player.lvl;
  $('ovDepth').textContent = '第 ' + G.depth + ' 更';
  $('ovSouls').textContent = souls;
  $('ovNote').textContent = isBest ? '今夜最长 · 魂火可在「灯谱」添灯' : '魂火可在「灯谱」中永久添灯';
  setHUD(false);
  showScreen('over');
  Sound.over();
  haptic(died ? [30, 60, 30] : 10);
  updateTitleStats();
}

function backHome() {
  G.mode = 'title';
  G.player = null;
  setHUD(false);
  showScreen('title');
  updateTitleStats();
}

/* ───────────────────────── 升级卡 ───────────────────────── */
let currentCards = [];

function cardPool() {
  const p = G.player;
  const pool = [];
  for (const k in WEAPONS) {
    const lv = p.weapons[k] || 0;
    if (lv < WEAPONS[k].max) pool.push({ kind: 'weapon', key: k, lv });
  }
  for (const k in PASSIVES) {
    const lv = p.passives[k] || 0;
    if (lv < PASSIVES[k].max) pool.push({ kind: 'passive', key: k, lv });
  }
  return pool;
}

function cardWeight(c) {
  if (c.kind === 'weapon') return c.lv > 0 ? 1.9 : 0.55;   // 已有武器更常见，没拿过的更少见
  if (c.kind === 'passive') return c.lv > 0 ? 1.25 : 0.85;
  return 1;
}

function rollCards() {
  const p = G.player;
  let pool = cardPool();
  const out = [];
  // 开局保证能拿到新武器（手里不足 3 把时）
  const unowned = pool.filter(c => c.kind === 'weapon' && c.lv === 0);
  if (unowned.length > 0 && Object.keys(p.weapons).length < 3 && Math.random() < 0.75) {
    const c = pick(unowned);
    out.push(c);
    pool = pool.filter(x => x !== c);
  }
  while (out.length < 3 && pool.length > 0) {
    let total = 0;
    for (const c of pool) total += cardWeight(c);
    let r = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < pool.length; i++) {
      r -= cardWeight(pool[i]);
      if (r <= 0) { idx = i; break; }
      idx = i;
    }
    out.push(pool.splice(idx, 1)[0]);
  }
  // 全部满级时给回血
  while (out.length < 3) out.push({ kind: 'heal', key: 'oil', lv: 0 });
  return out;
}

function openLevelUp() {
  if (G.mode === 'over') return;
  G.mode = 'levelup';
  currentCards = rollCards();
  renderCards();
  showScreen('levelup');
  Sound.levelup();
  haptic(14);
}

function renderCards() {
  const p = G.player;
  const wrap = $('cards');
  wrap.innerHTML = '';
  $('luSub').textContent = '灯阶 ' + p.lvl + ' · 择一灯诀';
  currentCards.forEach((c, i) => {
    const el = document.createElement('div');
    el.className = 'card';
    let name = '', desc = '', glyph = '', isNew = false, max = false;
    if (c.kind === 'weapon') {
      const w = WEAPONS[c.key];
      name = w.name; glyph = w.glyph;
      isNew = c.lv === 0;
      max = c.lv + 1 >= w.max;
      const next = c.lv + 1;
      if (next >= w.max && !awForm(c.key)) {
        const a = AWAKEN[c.key];
        desc = `<b>觉醒</b> · ${a.awake.name}<br><span style="color:#7f8f88">形态巨变；<b style="color:#ff9b7a">30%</b> 概率变异为「${a.mutate.name}」</span>`;
        el.classList.add('max');
        name = w.name + ' · 觉醒';
      } else {
        desc = c.lv === 0 ? w.desc(0) : `${w.desc(next)} · 升至 <b>${next}</b>`;
      }
      if (isNew) el.classList.add('new');
    } else if (c.kind === 'passive') {
      const s = PASSIVES[c.key];
      name = s.name; glyph = s.glyph;
      isNew = c.lv === 0;
      max = c.lv + 1 >= s.max;
      desc = s.desc(c.lv + 1);
      el.classList.add('jade-only');
    } else {
      name = '灯油'; glyph = '油';
      desc = '立刻回复 <b>30%</b> 生命';
    }
    if (max) el.classList.add('max');

    const pipN = c.kind === 'heal' ? 0 : (c.kind === 'weapon' ? WEAPONS[c.key].max : PASSIVES[c.key].max);
    let pips = '';
    for (let k = 0; k < pipN; k++) pips += `<i class="${k <= c.lv ? 'on' : ''}"></i>`;

    el.innerHTML = `
      <div class="card-glyph ${c.kind === 'passive' ? 'jade' : ''}">${glyph}</div>
      <div class="card-body">
        <div class="card-name">${name}
          ${c.kind === 'weapon' ? '<span class="tag">器</span>' : c.kind === 'passive' ? '<span class="tag">诀</span>' : '<span class="tag">药</span>'}
          <span class="pips">${pips}</span>
        </div>
        <div class="card-desc">${desc}</div>
      </div>`;
    el.addEventListener('click', () => applyCard(c), { once: true });
    wrap.appendChild(el);
  });
}

function applyCard(c) {
  const p = G.player;
  if (c.kind === 'weapon') {
    p.weapons[c.key] = (p.weapons[c.key] || 0) + 1;
    if (p.weapons[c.key] >= WEAPONS[c.key].max && !awForm(c.key)) {
      // 觉醒 / 变异
      const mutated = Math.random() < 0.30;
      p.awake[c.key] = mutated ? 'mutate' : 'awake';
      unlockCodex(c.key, p.awake[c.key]);
      Sound.ui(); haptic(mutated ? [30, 40, 60] : 30);
      showAwaken(c.key, p.awake[c.key], closeCardFlow);
      return;
    }
    toast(WEAPONS[c.key].name + ' · ' + p.weapons[c.key] + ' 层');
  } else if (c.kind === 'passive') {
    p.passives[c.key] = (p.passives[c.key] || 0) + 1;
    recomputeStats();
    toast(PASSIVES[c.key].name + ' · ' + p.passives[c.key] + ' 层');
  } else {
    p.hp = Math.min(p.hpMax, p.hp + p.hpMax * 0.3);
    toast('灯油 · 回复生命');
  }
  Sound.ui();
  closeCardFlow();
}

function closeCardFlow() {
  const p = G.player;
  lastWpnSig = '';
  G.flash = Math.max(G.flash, 0.18); G.flashColor = '#ffd79a';
  if (p.xp >= p.xpNext) {
    G.mode = 'levelup';
    currentCards = rollCards();
    renderCards();
    showScreen('levelup');
  } else {
    G.mode = G.tut ? 'tutorial' : 'play';
    lastT = 0;
    showScreen(null);
  }
}

function unlockCodex(key, form) {
  save.codex = save.codex || {};
  const id = key + '_' + (form === 'mutate' ? 'mutate' : 'awake');
  if (!save.codex[id]) { save.codex[id] = 1; persist(); }
}

let awakenTimer = null;
function showAwaken(key, form, done) {
  const a = AWAKEN[key][form];
  G.mode = 'awaken';
  const box = $('awaken');
  $('awTag').textContent = form === 'mutate' ? '变 异' : '觉 醒';
  $('awGlyph').textContent = a.glyph;
  $('awName').textContent = a.name;
  $('awDesc').textContent = a.desc;
  box.classList.toggle('mutate', form === 'mutate');
  box.classList.add('on');
  box.classList.remove('show');
  void box.offsetWidth;
  box.classList.add('show');

  // 画面表现
  G.flash = 0.75; G.flashColor = form === 'mutate' ? '#ff6a3c' : '#ffd79a';
  G.shake = 14;
  const p = G.player;
  ring(p.x, p.y, 340, form === 'mutate' ? '#ff6a3c' : '#ffd79a', 1.1, 9);
  ring(p.x, p.y, 220, form === 'mutate' ? '#ffb090' : '#fff2cf', 0.8, 5);
  burst(p.x, p.y, 60, form === 'mutate' ? '#ff7a4a' : '#ffe0a0', { spd: 420, size: 4.4, life: 1.3 });
  if (form === 'mutate') { Sound.boss(); } else { Sound.levelup(); }
  haptic(30);

  toast('已录入长夜残卷');

  clearTimeout(awakenTimer);
  awakenTimer = setTimeout(() => {
    box.classList.remove('on', 'show');
    lastT = 0;
    done && done();
  }, 2500);
}

/* ───────────────────────── 灯谱 ───────────────────────── */
function renderMeta() {
  $('metaSouls').textContent = save.souls;
  const list = $('metaList');
  list.innerHTML = '';
  for (const m of META) {
    const lv = save.meta[m.id] || 0;
    const cost = metaCost(lv);
    const row = document.createElement('div');
    row.className = 'meta-row';
    let pips = '';
    for (let i = 0; i < META_MAX; i++) pips += `<i class="${i < lv ? 'on' : ''}"></i>`;
    row.innerHTML = `
      <div class="g">${m.glyph}</div>
      <div class="m">
        <div class="n">${m.name}</div>
        <div class="d">${m.desc}</div>
        <div class="pips">${pips}</div>
      </div>
      <button class="buy" ${lv >= META_MAX || save.souls < cost ? 'disabled' : ''}>
        ${lv >= META_MAX ? '已满' : cost + ' 魂'}
      </button>`;
    const btn = row.querySelector('button');
    btn.addEventListener('click', () => {
      if (lv >= META_MAX) return;
      const c = metaCost(lv);
      if (save.souls < c) { toast('魂火不够'); return; }
      save.souls -= c;
      save.meta[m.id] = lv + 1;
      persist();
      Sound.levelup();
      haptic(10);
      renderMeta();
      updateTitleStats();
    });
    list.appendChild(row);
  }
}

/* ───────────────────────── 设置 / 存档 ───────────────────────── */
function applySettingsUI() {
  $('swSound').classList.toggle('on', save.settings.sound);
  $('swHaptic').classList.toggle('on', save.settings.haptic);
  $('swDmg').classList.toggle('on', save.settings.dmg);
}

function exportSave() {
  const data = JSON.stringify(save, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
  a.href = url;
  a.download = `引魂灯-存档-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
  toast('存档已导出');
  Sound.ui();
}

function importSave(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const d = JSON.parse(String(reader.result));
      if (!d || typeof d !== 'object' || !d.meta) throw new Error('格式不对');
      save = {
        ...DEFAULT_SAVE, ...d,
        meta: { ...DEFAULT_SAVE.meta, ...(d.meta || {}) },
        settings: { ...DEFAULT_SAVE.settings, ...(d.settings || {}) }
      };
      persist();
      applySettingsUI();
      updateTitleStats();
      renderMeta();
      toast('存档已导入');
    } catch (e) {
      toast('存档读取失败');
    }
  };
  reader.readAsText(file);
}

function updateTitleStats() {
  $('bestTime').textContent = fmtTime(save.best);
  $('soulCount').textContent = save.souls;
}

/* ───────────────────────── 故事 ───────────────────────── */
let storyTab = 'world';

function storyEsc(t) {
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function openStory(tab) {
  storyTab = tab || storyTab || 'world';
  showScreen('story');
  renderStory();
  Sound.ui();
}

function renderStory() {
  const body = $('storyBody');
  $('tabWorld').classList.toggle('on', storyTab === 'world');
  $('tabCodex').classList.toggle('on', storyTab === 'codex');
  body.scrollTop = 0;
  if (storyTab === 'world') {
    const S = window.STORY || {};
    let html = '<div class="story-article">';
    html += `<h3 class="serif">${storyEsc(S.worldTitle || '长夜纪')}</h3>`;
    (S.world || []).forEach(seg => {
      if (seg.h) html += `<h3 class="serif">${storyEsc(seg.h)}</h3>`;
      else if (seg.quote) html += `<p class="quote">${storyEsc(seg.quote)}</p>`;
      else html += `<p>${storyEsc(seg.p || seg)}</p>`;
    });
    html += '</div>';
    body.innerHTML = html;
    return;
  }
  // 灯器谱
  const S = window.STORY || {};
  let html = '<div class="story-article">';
  const order = ['flame', 'talisman', 'sword', 'bell', 'kite', 'compass', 'umbrella', 'mirror'];
  let unlockedAll = 0;
  order.forEach(key => {
    const w = WEAPONS[key];
    const meta = (S.weapons || {})[key] || {};
    ['awake', 'mutate'].forEach(form => {
      const id = key + '_' + form;
      const unlocked = !!(save.codex && save.codex[id]);
      if (unlocked) unlockedAll++;
      const info = (meta[form] || {});
      const a = AWAKEN[key][form];
      html += `<div class="codex-item ${form === 'mutate' ? 'mutate' : ''} ${unlocked ? '' : 'locked'}" data-key="${key}" data-form="${form}">
        <span class="codex-tag ${form === 'mutate' ? 'mutate' : ''}">${form === 'mutate' ? '变异' : '觉醒'}</span>
        <div class="ci-name">${unlocked ? storyEsc(a.name) : '？？？'}</div>
        <div class="ci-sub">${w.name} · ${unlocked ? storyEsc(info.subtitle || a.desc.slice(0, 16)) : '在战斗中将该灯器升至五阶觉醒后解锁'}</div>
      </div>`;
    });
  });
  html += `<p style="text-align:center;color:#6d6759;font-size:10.5px;letter-spacing:.14em;margin-top:6px">已录 ${unlockedAll} / ${order.length * 2} 篇</p>`;
  html += '</div>';
  body.innerHTML = html;
  body.querySelectorAll('.codex-item').forEach(el => {
    el.addEventListener('click', () => {
      const key = el.dataset.key, form = el.dataset.form;
      if (!(save.codex && save.codex[key + '_' + form])) { toast('尚未解锁 · 把「' + WEAPONS[key].name + '」练到五阶'); return; }
      renderCodexArticle(key, form);
    });
  });
}

function renderCodexArticle(key, form) {
  const S = window.STORY || {};
  const meta = ((S.weapons || {})[key] || {})[form] || {};
  const a = AWAKEN[key][form];
  const body = $('storyBody');
  body.scrollTop = 0;
  let html = '<div class="story-article">';
  html += `<div class="back-line"><button class="mini" id="btnCodexBack">← 回到灯器谱</button></div>`;
  html += `<h3 class="serif">${storyEsc(meta.title || a.name)}</h3>`;
  html += `<p style="text-indent:0;color:#8a8070;font-size:11px;letter-spacing:.12em;margin-bottom:16px">${storyEsc(WEAPONS[key].name)} · ${form === 'mutate' ? '变异' : '觉醒'}形态</p>`;
  (meta.text || []).forEach(seg => {
    if (seg.h) html += `<h3 class="serif">${storyEsc(seg.h)}</h3>`;
    else if (seg.quote) html += `<p class="quote">${storyEsc(seg.quote)}</p>`;
    else html += `<p>${storyEsc(seg.p || seg)}</p>`;
  });
  html += '</div>';
  body.innerHTML = html;
  $('btnCodexBack').addEventListener('click', () => { storyTab = 'codex'; renderStory(); });
}

/* ───────────────────────── 标题灯笼 ───────────────────────── */
function drawTitleLantern(t) {
  const cx = VIEW.w / 2, cy = VIEW.h * 0.42;
  const bob = Math.sin(t * 1.2) * 6;
  const g = ctx.createRadialGradient(cx, cy + bob, 0, cx, cy + bob, 190);
  g.addColorStop(0, 'rgba(255,196,110,0.22)');
  g.addColorStop(0.45, 'rgba(255,150,60,0.07)');
  g.addColorStop(1, 'rgba(255,120,30,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy + bob, 190, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,222,160,0.75)';
  ctx.beginPath(); ctx.ellipse(cx, cy + bob, 9, 13, 0, 0, TAU); ctx.fill();
}

/* ───────────────────────── UI 绑定 ───────────────────────── */
function bindUI() {
  $('btnStart').addEventListener('click', () => {
    Sound.unlock(); Sound.ui();
    fadeTo(() => startRun());
  });
  $('btnMeta').addEventListener('click', () => { Sound.ui(); renderMeta(); showScreen('meta'); });
  $('btnStory').addEventListener('click', () => { openStory('world'); });
  $('btnStoryBack').addEventListener('click', () => { Sound.ui(); showScreen('title'); });
  $('tabWorld').addEventListener('click', () => { storyTab = 'world'; renderStory(); });
  $('tabCodex').addEventListener('click', () => { storyTab = 'codex'; renderStory(); });
  $('btnTutorial').addEventListener('click', () => { Sound.unlock(); fadeTo(() => startTutorial()); });
  $('btnMetaBack').addEventListener('click', () => { Sound.ui(); showScreen('title'); updateTitleStats(); });
  $('btnSet').addEventListener('click', () => { Sound.ui(); applySettingsUI(); showScreen('settings'); });
  $('btnSetBack').addEventListener('click', () => { Sound.ui(); showScreen(G.player ? 'pause' : 'title'); });
  $('btnPause').addEventListener('click', pauseGame);
  $('btnResume').addEventListener('click', resumeGame);
  $('btnPauseSet').addEventListener('click', () => { applySettingsUI(); showScreen('settings'); });
  $('btnGiveUp').addEventListener('click', () => { fadeTo(() => endRun(true)); });
  $('btnAgain').addEventListener('click', () => { Sound.ui(); fadeTo(() => startRun()); });
  $('btnHome').addEventListener('click', () => { Sound.ui(); fadeTo(backHome); });

  $('swSound').addEventListener('click', () => { save.settings.sound = !save.settings.sound; persist(); applySettingsUI(); if (save.settings.sound) Sound.ui(); });
  $('swHaptic').addEventListener('click', () => { save.settings.haptic = !save.settings.haptic; persist(); applySettingsUI(); haptic(15); });
  $('swDmg').addEventListener('click', () => { save.settings.dmg = !save.settings.dmg; persist(); applySettingsUI(); });

  $('btnExport').addEventListener('click', exportSave);
  $('btnImport').addEventListener('click', () => $('fileImport').click());
  $('fileImport').addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    if (f) importSave(f);
    e.target.value = '';
  });

  document.addEventListener('visibilitychange', () => {
    if (window.__SL && window.__SL.testing) return; // 自动化测试时不自动暂停
    if (document.hidden && G.mode === 'play') pauseGame();
  });
}

/* ───────────────────────── 启动 ───────────────────────── */
function boot() {
  resize();
  setupInput();
  bindUI();
  applySettingsUI();
  updateTitleStats();
  showScreen('title');
  requestAnimationFrame(frame);

  const isApp = /app=1/.test(location.search);
  if (!isApp && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => { });
  }
}

// 调试钩子（只读，方便自动化验证）
window.__SL = {
  testing: false,
  timeScale: 1,
  errs: [],
  get G() { return G; },
  get save() { return save; },
  // Android 返回键：暂停 / 继续 / 回标题
  onBack() {
    if (G.mode === 'play') { pauseGame(); return true; }
    if (G.mode === 'pause') { resumeGame(); return true; }
    if (G.mode === 'levelup') return true;
    if (G.mode === 'over') { backHome(); return true; }
    if (G.mode === 'settings' || G.mode === 'meta') { showScreen('title'); return true; }
    if (G.mode === 'story') { showScreen('title'); return true; }
    return false;
  }
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

})();
