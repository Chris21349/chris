/* ══════════════════════════════════════════════════════════
   镜刃 MIRROR EDGE — core.js
   数学 / 输入 / 音频合成 / 相机 / 粒子特效
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const MB = (window.MB = window.MB || {});
  const TAU = Math.PI * 2;

  /* ───────────── 数学 ───────────── */
  const U = (MB.U = {
    TAU,
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    inv: (a, b, v) => (v - a) / (b - a || 1),
    sign: (v) => (v < 0 ? -1 : v > 0 ? 1 : 0),
    rand: (a = 1, b = 0) => b + Math.random() * (a - b),
    randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    pick: (arr) => arr[(Math.random() * arr.length) | 0],
    chance: (p) => Math.random() < p,
    dist: (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by),
    approach: (v, t, d) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t)),
    smooth: (t) => t * t * (3 - 2 * t),
    damp: (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt)),
    angleLerp: (a, b, t) => {
      let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI;
      return a + d * t;
    },
    ease: {
      linear: (t) => t,
      outQuad: (t) => 1 - (1 - t) * (1 - t),
      inQuad: (t) => t * t,
      outCubic: (t) => 1 - Math.pow(1 - t, 3),
      inCubic: (t) => t * t * t,
      inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
      outQuint: (t) => 1 - Math.pow(1 - t, 5),
      inQuint: (t) => Math.pow(t, 5),
      outBack: (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2),
      outElastic: (t) => (t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -9 * t) * Math.sin((t * 10 - 0.75) * 2.1) + 1),
      inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    },
  });

  /* ───────────── 输入 ───────────── */
  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'jump', KeyW: 'jump', Space: 'jump',
    KeyJ: 'attack', KeyK: 'heavy', KeyL: 'guard',
    ShiftLeft: 'dash', ShiftRight: 'dash',
    Digit1: 'sk1', Digit2: 'sk2', Digit3: 'sk3', Digit4: 'sk4',
    Digit5: 'sk5', KeyR: 'ult', Escape: 'pause', KeyP: 'pause',
  };

  class Input {
    constructor() {
      this.down = Object.create(null);
      this.pressed = Object.create(null);
      this.released = Object.create(null);
      this.time = Object.create(null);
      this.virtual = Object.create(null);
      this.axisTouch = 0;
      this.enabled = true;
      window.addEventListener('keydown', (e) => {
        if (e.repeat) return;
        const a = KEYMAP[e.code];
        if (!a) return;
        if (a === 'jump' || a === 'dash' || e.ctrlKey || e.metaKey) e.preventDefault();
        this.press(a);
      });
      window.addEventListener('keyup', (e) => {
        const a = KEYMAP[e.code];
        if (a) this.release(a);
      });
      window.addEventListener('blur', () => this.clear());
    }
    press(a) {
      if (!this.enabled) return;
      if (!this.down[a]) { this.pressed[a] = true; this.time[a] = 0; }
      this.down[a] = true;
    }
    release(a) {
      if (this.down[a]) { this.released[a] = true; }
      this.down[a] = false;
    }
    clear() {
      for (const k in this.down) this.down[k] = false;
    }
    isDown(a) { return !!this.down[a]; }
    justPressed(a) { return !!this.pressed[a]; }
    justReleased(a) { return !!this.released[a]; }
    held(a) { return this.down[a] ? this.time[a] || 0 : 0; }
    axis() {
      let v = (this.down.right ? 1 : 0) - (this.down.left ? 1 : 0);
      if (Math.abs(this.axisTouch) > 0.01) v = this.axisTouch;
      return U.clamp(v, -1, 1);
    }
    endFrame() {
      for (const k in this.pressed) delete this.pressed[k];
      for (const k in this.released) delete this.released[k];
    }
    tick(dt) {
      for (const k in this.down) if (this.down[k]) this.time[k] = (this.time[k] || 0) + dt;
    }
  }
  MB.Input = new Input();

  /* ───────────── 音频（全部合成，无音频文件） ───────────── */
  class Sound {
    constructor() {
      this.ctx = null;
      this.musicOn = true;
      this.sfxVol = 0.8;
      this.musicVol = 0.55;
      this.ready = false;
      this._music = null;
      this._muted = false;
    }
    init() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = (this.ctx = new AC());
      this.master = ctx.createGain();
      this.master.gain.value = 0.9;
      this.comp = ctx.createDynamicsCompressor();
      this.comp.threshold.value = -16;
      this.comp.knee.value = 22;
      this.comp.ratio.value = 5;
      this.comp.attack.value = 0.004;
      this.comp.release.value = 0.22;
      this.master.connect(this.comp);
      this.comp.connect(ctx.destination);

      this.sfx = ctx.createGain();
      this.sfx.gain.value = this.sfxVol * 0.55;
      this.sfx.connect(this.master);

      this.music = ctx.createGain();
      this.music.gain.value = 0;
      this.music.connect(this.master);

      // 混响式延迟
      this.delay = ctx.createDelay(1.0);
      this.delay.delayTime.value = 0.21;
      this.dfb = ctx.createGain();
      this.dfb.gain.value = 0.36;
      this.dlp = ctx.createBiquadFilter();
      this.dlp.type = 'lowpass';
      this.dlp.frequency.value = 2600;
      this.dsend = ctx.createGain();
      this.dsend.gain.value = 0.5;
      this.delay.connect(this.dlp); this.dlp.connect(this.dfb); this.dfb.connect(this.delay);
      this.dlp.connect(this.sfx);

      // 噪声缓冲
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
      this.ready = true;
    }
    setSfx(v) { this.sfxVol = v; if (this.sfx) this.sfx.gain.value = v * 0.55; }
    setMusic(v) { this.musicVol = v; if (this.music) this.music.gain.value = this._muted ? 0 : v * 0.16; }
    _now() { return this.ctx.currentTime; }
    _noise(t, dur, type, f0, f1, q, gain, dest) {
      const c = this.ctx;
      const src = c.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const bp = c.createBiquadFilter();
      bp.type = type || 'bandpass';
      bp.frequency.setValueAtTime(f0, t);
      if (f1 && f1 !== f0) bp.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
      bp.Q.value = q == null ? 1 : q;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(bp); bp.connect(g); g.connect(dest || this.sfx);
      src.start(t); src.stop(t + dur + 0.02);
    }
    _tone(t, dur, type, f0, f1, gain, dest, detune) {
      const c = this.ctx;
      const o = c.createOscillator();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(f0, t);
      if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      if (detune) o.detune.value = detune;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(dest || this.sfx);
      o.start(t); o.stop(t + dur + 0.02);
      return o;
    }
    _send(node) { try { node.connect(this.dsend); } catch (e) {} }

    slash(p = 1, heavy = false) {
      if (!this.ready) return;
      const t = this._now(), d = heavy ? 0.26 : 0.15;
      this._noise(t, d, 'bandpass', heavy ? 2600 : 3400, heavy ? 380 : 620, 1.2, 0.32);
      this._tone(t, d * 0.7, 'triangle', 1400 * p, 520 * p, 0.05);
      if (heavy) this._tone(t, 0.2, 'sine', 160, 60, 0.1);
    }
    hit(power = 1) {
      if (!this.ready) return;
      const t = this._now();
      this._tone(t, 0.16, 'sine', 150 * (1 + power * 0.15), 42, 0.36 * Math.min(1.3, 0.7 + power * 0.3));
      this._noise(t, 0.09, 'highpass', 900, 600, 0.7, 0.3);
      this._tone(t, 0.05, 'square', 900, 300, 0.05);
    }
    guard() {
      if (!this.ready) return;
      const t = this._now();
      this._tone(t, 0.12, 'triangle', 2100, 1500, 0.12);
      this._noise(t, 0.08, 'bandpass', 4200, 2600, 3, 0.16);
    }
    parry() {
      if (!this.ready) return;
      const t = this._now();
      const o = this._tone(t, 0.4, 'triangle', 1760, 1740, 0.16);
      const o2 = this._tone(t, 0.3, 'sine', 2640, 2600, 0.1);
      this._send(o); this._send(o2);
      this._noise(t, 0.14, 'bandpass', 5200, 2400, 4, 0.22);
    }
    perfect() {
      if (!this.ready) return;
      const t = this._now();
      // 反向吸气
      const c = this.ctx;
      const n = c.createBufferSource(); n.buffer = this.noiseBuf; n.loop = true;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.8;
      bp.frequency.setValueAtTime(400, t); bp.frequency.exponentialRampToValueAtTime(6500, t + 0.16);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.4, t + 0.15);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
      n.connect(bp); bp.connect(g); g.connect(this.sfx);
      n.start(t); n.stop(t + 0.36);
      // 金属钟
      [880, 1320, 1760, 2640].forEach((f, i) => {
        const o = this._tone(t + 0.01, 1.5 - i * 0.2, i % 2 ? 'sine' : 'triangle', f, f * 0.995, 0.1 / (i + 1));
        this._send(o);
      });
      // 低频冲击
      this._tone(t, 0.55, 'sine', 70, 26, 0.5);
      this._noise(t + 0.02, 0.3, 'highpass', 3000, 1800, 0.6, 0.16);
    }
    dash() {
      if (!this.ready) return;
      const t = this._now();
      this._noise(t, 0.2, 'bandpass', 500, 2800, 1.4, 0.18);
      this._tone(t, 0.12, 'sine', 320, 720, 0.03);
    }
    jump() {
      if (!this.ready) return;
      const t = this._now();
      this._tone(t, 0.14, 'sine', 220, 460, 0.06);
      this._noise(t, 0.1, 'bandpass', 900, 400, 1, 0.06);
    }
    land() {
      if (!this.ready) return;
      const t = this._now();
      this._tone(t, 0.12, 'sine', 120, 40, 0.16);
      this._noise(t, 0.1, 'lowpass', 700, 300, 0.8, 0.1);
    }
    cast(kind) {
      if (!this.ready) return;
      const t = this._now();
      if (kind === 'dark') {
        this._tone(t, 0.5, 'sawtooth', 90, 180, 0.1);
        this._noise(t, 0.4, 'bandpass', 300, 1200, 1.5, 0.14);
      } else {
        this._tone(t, 0.35, 'triangle', 420, 1500, 0.1);
        this._tone(t + 0.03, 0.4, 'sine', 840, 2100, 0.06);
        this._noise(t, 0.3, 'bandpass', 1200, 3600, 2, 0.12);
      }
    }
    boom(power = 1) {
      if (!this.ready) return;
      const t = this._now();
      this._tone(t, 0.5, 'sine', 140, 32, 0.45 * power);
      this._noise(t, 0.35, 'lowpass', 1800, 200, 0.9, 0.3 * power);
    }
    ult() {
      if (!this.ready) return;
      const t = this._now();
      this._tone(t, 2.2, 'sine', 55, 30, 0.55);
      [220, 330, 440, 660, 880].forEach((f, i) => {
        const o = this._tone(t + i * 0.045, 1.9, i % 2 ? 'triangle' : 'sine', f, f, 0.07);
        this._send(o);
      });
      this._noise(t, 1.2, 'bandpass', 300, 5200, 1.2, 0.22);
      this._noise(t + 0.5, 0.9, 'highpass', 2500, 800, 0.7, 0.16);
    }
    ui() {
      if (!this.ready) return;
      const t = this._now();
      this._tone(t, 0.06, 'sine', 1320, 1320, 0.05);
      this._noise(t, 0.04, 'highpass', 3000, 3000, 0.7, 0.05);
    }
    unlock() {
      if (!this.ready) return;
      const t = this._now();
      [523, 659, 784, 1046].forEach((f, i) => {
        const o = this._tone(t + i * 0.09, 0.5, 'triangle', f, f, 0.09);
        this._send(o);
      });
    }
    fail() {
      if (!this.ready) return;
      const t = this._now();
      this._tone(t, 0.7, 'sine', 180, 90, 0.2);
      this._tone(t + 0.1, 0.8, 'sine', 120, 60, 0.16);
    }

    /* 程序化配乐：低音脉冲 + 拨弦琶音 + 铺底 */
    startMusic() {
      if (!this.ready) return;
      if (this._music) return;
      const c = this.ctx;
      const m = (this._music = { step: 0, next: c.currentTime + 0.1, timer: 0, intensity: 0.2, chord: 0 });
      m.gain = c.createGain(); m.gain.gain.value = this._muted ? 0 : this.musicVol * 0.16; m.gain.connect(this.master);
      this.music.disconnect(); this.music = m.gain;
      const scale = [146.83, 174.61, 196.0, 220.0, 261.63, 293.66, 349.23, 392.0];
      m.scale = scale;
      const bpm = 84, beat = 60 / bpm;
      const stepDur = beat / 2;
      const tick = () => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        while (m.next < now + 0.25) {
          const t = m.next, s = m.step % 16;
          // 低音
          if (s % 4 === 0) {
            const root = [146.83, 146.83, 130.81, 116.54][(Math.floor(m.step / 16)) % 4];
            const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = root / 2;
            const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 320; f.Q.value = 6;
            const g = c.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(0.13 + m.intensity * 0.1, t + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, t + beat * 1.6);
            o.connect(f); f.connect(g); g.connect(m.gain);
            o.start(t); o.stop(t + beat * 1.7);
          }
          // 铺底和弦
          if (s === 0) {
            const root = [146.83, 130.81, 116.54, 174.61][(Math.floor(m.step / 16)) % 4];
            [0, 3, 7, 10].forEach((iv, i) => {
              const o = c.createOscillator(); o.type = 'sine';
              o.frequency.value = root * Math.pow(2, iv / 12) * 2;
              o.detune.value = i * 4 - 6;
              const g = c.createGain();
              g.gain.setValueAtTime(0.0001, t);
              g.gain.linearRampToValueAtTime(0.035 + m.intensity * 0.02, t + 0.6);
              g.gain.linearRampToValueAtTime(0.0001, t + beat * 4);
              o.connect(g); g.connect(m.gain);
              o.start(t); o.stop(t + beat * 4.1);
            });
          }
          // 琶音
          if (m.intensity > 0.12 && (s % 2 === 0 || Math.random() < m.intensity * 0.5)) {
            const idx = (m.step * 3 + (m.step % 5) * 2) % 8;
            const fr = scale[idx] * 2;
            const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = fr;
            const g = c.createGain();
            const amp = (0.02 + m.intensity * 0.03) * (s % 4 === 0 ? 1.3 : 1);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(amp, t + 0.01);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
            o.connect(g); g.connect(m.gain); g.connect(this.dsend);
            o.start(t); o.stop(t + 0.32);
          }
          // 打击
          if (m.intensity > 0.55 && s % 4 === 2) {
            this._noise(t, 0.06, 'highpass', 6000, 4000, 0.7, 0.05 * m.intensity, m.gain);
          }
          if (m.intensity > 0.7 && s % 8 === 0) {
            const o = c.createOscillator(); o.type = 'sine';
            o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.18);
            const g = c.createGain();
            g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.01);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
            o.connect(g); g.connect(m.gain); o.start(t); o.stop(t + 0.22);
          }
          m.next += stepDur;
          m.step++;
        }
      };
      m.timer = setInterval(tick, 60);
      tick();
    }
    setIntensity(v) {
      if (this._music) this._music.intensity = U.clamp(v, 0, 1);
    }
    stopMusic() {
      if (!this._music) return;
      clearInterval(this._music.timer);
      const g = this._music.gain;
      try { g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.4); } catch (e) {}
      setTimeout(() => { try { g.disconnect(); } catch (e) {} }, 600);
      this._music = null;
    }
  }
  MB.Sound = new Sound();

  /* ───────────── 相机 ───────────── */
  class Camera {
    constructor() {
      this.x = 0; this.y = -70; this.zoom = 1;
      this.tx = 0; this.ty = -70; this.tz = 1;
      this.shake = 0; this.shakeX = 0; this.shakeY = 0; this.rot = 0;
      this.ox = 0; this.oy = 0;
      this.w = 800; this.h = 600;
      this.freeze = 0;
    }
    resize(w, h) { this.w = w; this.h = h; this.fit(); }
    fit() {
      const narrow = this.w < 700;
      this.viewW = narrow ? 470 : 840;
      const s = Math.min(this.w / this.viewW, this.h / (narrow ? 520 : 470));
      this.baseZoom = U.clamp(s, 0.5, 2.1);
    }
    follow(x, y, zoom = 1, lag = 6) {
      this.tx = x; this.ty = y; this.tz = this.baseZoom * zoom;
    }
    punch(a) { this.zoom += a; }
    kick(amount, dir) {
      this.shake = Math.max(this.shake, amount);
      const a = dir == null ? U.rand(TAU) : dir;
      this.ox += Math.cos(a) * amount * 0.5;
      this.oy += Math.sin(a) * amount * 0.5;
    }
    update(dt) {
      this.zoom = U.damp(this.zoom, this.tz, 12, dt);
      this.x = U.damp(this.x, this.tx, 7, dt);
      this.y = U.damp(this.y, this.ty, 7, dt);
      this.ox *= Math.exp(-14 * dt);
      this.oy *= Math.exp(-14 * dt);
      this.shake *= Math.exp(-9 * dt);
      const s = this.shake;
      this.shakeX = (Math.random() * 2 - 1) * s + this.ox;
      this.shakeY = (Math.random() * 2 - 1) * s + this.oy;
      this.rot = U.damp(this.rot, 0, 10, dt);
    }
    apply(ctx) {
      const sc = this.zoom;
      ctx.translate(this.w / 2 + this.shakeX, this.h / 2 + this.shakeY);
      ctx.rotate(this.rot);
      ctx.scale(sc, sc);
      ctx.translate(-this.x, -this.y);
    }
    toScreen(x, y) {
      const sc = this.zoom;
      return { x: (x - this.x) * sc + this.w / 2 + this.shakeX, y: (y - this.y) * sc + this.h / 2 + this.shakeY };
    }
  }
  MB.Camera = new Camera();

  /* ───────────── 粒子 / 特效 ───────────── */
  const FX = (MB.FX = {
    list: [],
    MAX: 1200,
    flash: 0, flashColor: '#fff',
    tints: [],
    slowVignette: 0,
    bars: 0,
    speedLines: 0,
    clear() { this.list.length = 0; this.flash = 0; this.bars = 0; this.speedLines = 0; this.tints.length = 0; },
    _glowCache: new Map(),
    glowSprite(color) {
      let c = this._glowCache.get(color);
      if (c) return c;
      const size = 64;
      const cv = document.createElement('canvas');
      cv.width = cv.height = size;
      const g = cv.getContext('2d');
      const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      gr.addColorStop(0, color);
      gr.addColorStop(0.3, color);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, size, size);
      this._glowCache.set(color, cv);
      return cv;
    },
    add(p) {
      if (this.list.length > this.MAX) this.list.shift();
      p.life = p.life || 0.5;
      p.max = p.life;
      p.t = 0;
      p.alpha = p.alpha == null ? 1 : p.alpha;
      p.vx = p.vx || 0; p.vy = p.vy || 0;
      p.g = p.g || 0;
      p.rot = p.rot || 0; p.vr = p.vr || 0;
      this.list.push(p);
      return p;
    },
    /* —— 生成器 —— */
    spark(x, y, n, opt = {}) {
      const color = opt.color || '#bff6ff';
      for (let i = 0; i < n; i++) {
        const a = opt.dir != null ? opt.dir + U.rand(opt.spread || 1.4, -(opt.spread || 1.4)) : U.rand(TAU);
        const sp = U.rand(opt.speed || 460, (opt.speed || 460) * 0.25);
        this.add({
          type: 'spark', x, y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (opt.up || 0),
          g: opt.g == null ? 900 : opt.g,
          life: U.rand(0.42, 0.14) * (opt.lifeMul || 1),
          size: U.rand(2.4, 0.7) * (opt.size || 1),
          color, alpha: 1, drag: 3.4, len: U.rand(2.4, 1),
        });
      }
    },
    ember(x, y, n, opt = {}) {
      for (let i = 0; i < n; i++) {
        this.add({
          type: 'glow', x: x + U.rand(opt.r || 60, -(opt.r || 60)), y: y + U.rand(40, -40),
          vx: U.rand(30, -30), vy: U.rand(-30, -120), g: opt.g == null ? -20 : opt.g,
          life: U.rand(opt.life || 1.6, 0.5), size: U.rand(3.4, 1.1) * (opt.size || 1),
          color: opt.color || '#8fe9ff', alpha: 0.9, drag: 0.6,
        });
      }
    },
    ring(x, y, r0, r1, opt = {}) {
      this.add({
        type: 'ring', x, y, r: r0, r1, life: opt.life || 0.45,
        color: opt.color || '#c9f7ff', width: opt.width || 3, alpha: opt.alpha == null ? 1 : opt.alpha,
        ease: opt.ease || 'outCubic', squash: opt.squash || 1,
      });
    },
    wave(x, y, r1, opt = {}) {
      this.add({
        type: 'wave', x, y, r: 0, r1, life: opt.life || 0.6, color: opt.color || '#9defff',
        width: opt.width || 2, alpha: opt.alpha == null ? 0.9 : opt.alpha, squash: opt.squash || 0.4,
      });
    },
    slash(x, y, ang, len, opt = {}) {
      this.add({
        type: 'slash', x, y, ang, len, life: opt.life || 0.24,
        color: opt.color || '#e8feff', width: opt.width || 14, arc: opt.arc || 1.5,
        alpha: opt.alpha == null ? 1 : opt.alpha, spin: opt.spin || 0, follow: opt.follow || null,
      });
    },
    shard(x, y, n, opt = {}) {
      for (let i = 0; i < n; i++) {
        const a = U.rand(TAU);
        const sp = U.rand(opt.speed || 380, 60);
        this.add({
          type: 'shard', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 100,
          g: 1100, life: U.rand(0.8, 0.35), size: U.rand(9, 3), rot: U.rand(TAU), vr: U.rand(12, -12),
          color: opt.color || '#9fe9ff', alpha: 1, drag: 1.2,
        });
      }
    },
    bolt(x0, y0, x1, y1, opt = {}) {
      const seg = opt.seg || 9;
      const pts = [];
      for (let i = 0; i <= seg; i++) {
        const t = i / seg;
        const jx = i === 0 || i === seg ? 0 : U.rand(opt.jag || 18, -(opt.jag || 18));
        pts.push({ x: U.lerp(x0, x1, t) + jx, y: U.lerp(y0, y1, t) + U.rand(6, -6) });
      }
      this.add({ type: 'bolt', pts, life: opt.life || 0.22, color: opt.color || '#d8e6ff', width: opt.width || 2.6, alpha: 1 });
    },
    text(x, y, text, opt = {}) {
      this.add({
        type: 'text', x, y, text, vx: U.rand(40, -40), vy: opt.vy == null ? -120 : opt.vy,
        g: opt.g == null ? 60 : opt.g, life: opt.life || 0.85, size: opt.size || 22,
        color: opt.color || '#fff', alpha: 1, bold: !!opt.bold, glow: opt.glow == null ? true : opt.glow,
        font: opt.font || 'serif', drag: 2.2, scaleIn: opt.scaleIn !== false,
      });
    },
    after(fighter, opt = {}) {
      this.add({
        type: 'after', fighter, life: opt.life || 0.32, alpha: opt.alpha == null ? 0.45 : opt.alpha,
        color: opt.color || fighter.theme.glow, x: fighter.x, y: fighter.y, facing: fighter.facing,
        pose: fighter.poseSnap, scale: fighter.scale,
      });
    },
    screenFlash(color, a, life) {
      this.tints.push({ color, a, life: life || 0.2, max: life || 0.2, t: 0 });
    },
    update(dt) {
      const L = this.list;
      for (let i = L.length - 1; i >= 0; i--) {
        const p = L[i];
        p.t += dt;
        if (p.t >= p.life) { L.splice(i, 1); continue; }
        if (p.drag) { const d = Math.exp(-p.drag * dt); p.vx *= d; p.vy *= d; }
        p.vy += p.g * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.rot += p.vr * dt;
        if (p.type === 'after' && p.fighter) {
          p.x = p.fighter.x; p.y = p.fighter.y;
        }
      }
      for (let i = this.tints.length - 1; i >= 0; i--) {
        const t = this.tints[i]; t.t += dt;
        if (t.t >= t.max) this.tints.splice(i, 1);
      }
      this.bars = U.damp(this.bars, this._barsT || 0, 8, dt);
      this.speedLines = U.damp(this.speedLines, this._slT || 0, 8, dt);
    },
    setBars(v) { this._barsT = v; },
    setSpeedLines(v) { this._slT = v; },
    drawWorld(ctx, cam) {
      const L = this.list;
      ctx.save();
      for (let i = 0; i < L.length; i++) {
        const p = L[i];
        const k = 1 - p.t / p.life;
        const a = p.alpha * k;
        if (a <= 0.003) continue;
        switch (p.type) {
          case 'spark': {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = a;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = p.size;
            ctx.lineCap = 'round';
            const sp = Math.hypot(p.vx, p.vy) || 1;
            const l = Math.min(26, sp * 0.03) * p.len;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - (p.vx / sp) * l, p.y - (p.vy / sp) * l);
            ctx.stroke();
            break;
          }
          case 'glow': {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = a * 0.9;
            const r = p.size * (0.6 + k * 0.8) * 4;
            const sp = this.glowSprite(p.color);
            ctx.drawImage(sp, p.x - r, p.y - r, r * 2, r * 2);
            break;
          }
          case 'ring': {
            ctx.globalCompositeOperation = 'lighter';
            const e = U.ease[p.ease](1 - k);
            const r = U.lerp(p.r, p.r1, e);
            ctx.globalAlpha = a;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = p.width * (0.2 + k * 0.8);
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, r, r * p.squash, 0, 0, TAU);
            ctx.stroke();
            break;
          }
          case 'wave': {
            ctx.globalCompositeOperation = 'lighter';
            const e = U.ease.outCubic(1 - k);
            const r = U.lerp(p.r, p.r1, e);
            ctx.globalAlpha = a * 0.85;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = p.width * k;
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, r, r * p.squash, 0, 0, TAU);
            ctx.stroke();
            ctx.globalAlpha = a * 0.13;
            ctx.lineWidth = p.width * k * 3.2;
            ctx.stroke();
            break;
          }
          case 'slash': {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = a;
            const e = U.ease.outQuint(1 - k);
            const cx = p.follow ? p.follow.x : p.x, cy = p.follow ? p.follow.y : p.y;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(p.ang);
            const w = p.width * (0.35 + k * 0.9);
            const L2 = p.len * (0.55 + e * 0.55);
            const g = ctx.createLinearGradient(-L2 * 0.3, 0, L2, 0);
            g.addColorStop(0, 'rgba(255,255,255,0)');
            g.addColorStop(0.45, p.color);
            g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.strokeStyle = g;
            ctx.lineCap = 'round';
            for (let s = 0; s < 3; s++) {
              ctx.lineWidth = w * (1 - s * 0.32);
              ctx.globalAlpha = a * (1 - s * 0.33);
              ctx.beginPath();
              ctx.arc(0, 0, L2 * (1 - s * 0.06), -p.arc / 2, p.arc / 2);
              ctx.stroke();
            }
            ctx.restore();
            break;
          }
          case 'shard': {
            ctx.globalAlpha = a;
            ctx.globalCompositeOperation = 'lighter';
            ctx.save();
            ctx.translate(p.x, p.y); ctx.rotate(p.rot);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.moveTo(-p.size, 0); ctx.lineTo(0, -p.size * 0.42); ctx.lineTo(p.size, 0); ctx.lineTo(0, p.size * 0.3);
            ctx.closePath(); ctx.fill();
            ctx.restore();
            break;
          }
          case 'bolt': {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = a;
            ctx.strokeStyle = p.color;
            ctx.lineCap = 'round';
            ctx.shadowColor = p.color; ctx.shadowBlur = 14;
            ctx.lineWidth = p.width * (0.4 + k);
            ctx.beginPath();
            p.pts.forEach((pt, j) => (j ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)));
            ctx.stroke();
            ctx.lineWidth = p.width * 2.6 * k;
            ctx.globalAlpha = a * 0.2;
            ctx.stroke();
            ctx.shadowBlur = 0;
            break;
          }
          case 'text': {
            const pop = p.scaleIn ? 1 + (1 - Math.min(1, p.t / 0.12)) * 0.7 : 1;
            ctx.globalAlpha = a;
            ctx.globalCompositeOperation = 'lighter';
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.scale(pop, pop);
            ctx.font = `${p.bold ? '600 ' : ''}${p.size}px ${p.font === 'sans' ? 'system-ui,sans-serif' : '"Songti SC","Noto Serif SC",serif'}`;
            ctx.textAlign = 'center';
            if (p.glow) { ctx.shadowColor = p.color; ctx.shadowBlur = 16; }
            ctx.fillStyle = p.color;
            ctx.fillText(p.text, 0, 0);
            ctx.restore();
            break;
          }
          case 'after': {
            ctx.globalAlpha = a;
            ctx.globalCompositeOperation = 'lighter';
            if (p.pose && MB.Skeleton) MB.Skeleton.drawGhost(ctx, p);
            break;
          }
          case 'impact': {
            const e = 1 - k;
            ctx.globalCompositeOperation = 'lighter';
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.globalAlpha = a;
            const R = p.size * (0.45 + e * 1.5);
            const spikes = 6;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            for (let si = 0; si < spikes; si++) {
              const an = (si / spikes) * TAU;
              const r1 = R * (si % 2 ? 0.34 : 1);
              const an2 = an + TAU / spikes / 2;
              ctx.lineTo(Math.cos(an) * r1, Math.sin(an) * r1);
              ctx.lineTo(Math.cos(an2) * R * 0.24, Math.sin(an2) * R * 0.24);
            }
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = a * 0.9;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, R * 0.22, 0, TAU);
            ctx.fill();
            ctx.restore();
            break;
          }
          case 'blade': { // 拖尾刀光
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = a * 0.9;
            const g2 = ctx.createLinearGradient(p.x0, p.y0, p.x1, p.y1);
            g2.addColorStop(0, 'rgba(255,255,255,0)');
            g2.addColorStop(1, p.color);
            ctx.strokeStyle = g2;
            ctx.lineWidth = p.width * k;
            ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(p.x0, p.y0); ctx.lineTo(p.x1, p.y1); ctx.stroke();
            break;
          }
        }
      }
      ctx.restore();
    },
    drawScreen(ctx, w, h) {
      for (const t of this.tints) {
        const k = 1 - t.t / t.max;
        ctx.save();
        ctx.globalAlpha = t.a * k * k;
        ctx.fillStyle = t.color;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
      if (this.bars > 0.004) {
        const hh = this.bars * h * 0.5;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, hh);
        ctx.fillRect(0, h - hh, w, hh);
      }
      if (this.speedLines > 0.01) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(200,245,255,.5)';
        const cx = w / 2, cy = h / 2;
        const n = 26;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU + (performance.now() * 0.0004);
          const r0 = Math.min(w, h) * (0.42 + Math.random() * 0.1);
          const r1 = r0 + Math.min(w, h) * 0.35 * this.speedLines;
          ctx.globalAlpha = this.speedLines * (0.1 + Math.random() * 0.14);
          ctx.lineWidth = 1 + Math.random() * 1.6;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
          ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
          ctx.stroke();
        }
        ctx.restore();
      }
    },
  });
})();
