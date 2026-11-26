/* 彩潮 · 音效：纯 WebAudio 合成，无外部音频文件 */
'use strict';
(function (CT) {
  var A = CT.Sound = {
    ctx: null, master: null, muted: false, noiseBuf: null,
    last: {}, amb: null, ready: false
  };

  A.init = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    A.ctx = new AC();
    A.master = A.ctx.createGain();
    A.master.gain.value = A.muted ? 0 : 0.55;
    A.master.connect(A.ctx.destination);
    // 白噪声（1s）
    var len = A.ctx.sampleRate, buf = A.ctx.createBuffer(1, len, A.ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    A.noiseBuf = buf;
    A.ready = true;
  };

  A.resume = function () {
    A.init();
    if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume();
  };

  A.setMuted = function (m) {
    A.muted = !!m;
    if (A.master) A.master.gain.value = A.muted ? 0 : 0.55;
  };

  function now() { return A.ctx ? A.ctx.currentTime : 0; }

  function tone(f0, f1, dur, type, gain, delay, detune) {
    if (!A.ctx || A.muted) return;
    var t = now() + (delay || 0);
    var o = A.ctx.createOscillator(), g = A.ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    if (detune) o.detune.value = detune;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain || 0.2, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(A.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, type, freq, gain, delay, q) {
    if (!A.ctx || A.muted || !A.noiseBuf) return;
    var t = now() + (delay || 0);
    var s = A.ctx.createBufferSource(); s.buffer = A.noiseBuf; s.loop = true;
    var f = A.ctx.createBiquadFilter(); f.type = type || 'bandpass';
    f.frequency.setValueAtTime(freq || 1200, t);
    f.Q.value = q || 1;
    var g = A.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain || 0.12, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(A.master);
    s.start(t); s.stop(t + dur + 0.02);
  }

  function gate(name, ms) {
    var t = performance.now();
    if (A.last[name] && t - A.last[name] < ms) return false;
    A.last[name] = t; return true;
  }

  var SFX = {
    hit: function () {
      if (!gate('hit', 40)) return;
      noise(0.08, 'highpass', 900, 0.10);
      tone(240, 90, 0.09, 'triangle', 0.10);
    },
    slash: function () {
      if (!gate('slash', 55)) return;
      noise(0.12, 'bandpass', 2200, 0.09, 0, 1.4);
    },
    pickup: function () {
      if (!gate('pickup', 35)) return;
      tone(920, 1500, 0.07, 'sine', 0.07);
    },
    heal: function () {
      tone(520, 780, 0.16, 'sine', 0.14);
      tone(780, 1040, 0.18, 'sine', 0.10, 0.07);
    },
    level: function () {
      [523, 659, 784, 1046].forEach(function (f, i) { tone(f, f * 1.01, 0.22, 'triangle', 0.11, i * 0.07); });
    },
    nova: function () {
      tone(140, 42, 0.52, 'sine', 0.28);
      noise(0.42, 'lowpass', 620, 0.16);
      tone(660, 200, 0.2, 'triangle', 0.08, 0.02);
    },
    chain: function () {
      if (!gate('chain', 45)) return;
      noise(0.10, 'highpass', 2400, 0.11);
      tone(1700, 420, 0.10, 'square', 0.055);
    },
    rain: function () {
      noise(0.16, 'bandpass', 900, 0.07, 0, 2);
      tone(300, 160, 0.1, 'sine', 0.05);
    },
    enemyDie: function () {
      if (!gate('die', 55)) return;
      tone(300, 80, 0.18, 'sawtooth', 0.07);
      noise(0.13, 'lowpass', 700, 0.05);
    },
    hurt: function () {
      if (!gate('hurt', 180)) return;
      tone(130, 55, 0.32, 'sine', 0.3);
      noise(0.22, 'lowpass', 480, 0.14);
    },
    dash: function () {
      noise(0.2, 'bandpass', 1400, 0.11, 0, 1.1);
      tone(420, 900, 0.14, 'sine', 0.06);
    },
    boss: function () {
      tone(70, 38, 1.4, 'sine', 0.30);
      tone(120, 52, 1.1, 'sawtooth', 0.10, 0.05);
      noise(1.0, 'lowpass', 320, 0.12);
    },
    slam: function () {
      tone(95, 34, 0.5, 'sine', 0.30);
      noise(0.35, 'lowpass', 700, 0.16);
    },
    ult: function () {
      [262, 392, 523, 784, 1046].forEach(function (f, i) {
        tone(f, f * 1.005, 0.9, 'triangle', 0.09, i * 0.04);
      });
      noise(0.9, 'lowpass', 1600, 0.10);
      tone(90, 48, 0.9, 'sine', 0.22);
    },
    wave: function () {
      tone(330, 330, 0.16, 'triangle', 0.10);
      tone(494, 494, 0.2, 'triangle', 0.09, 0.1);
    },
    ui: function () {
      if (!gate('ui', 30)) return;
      tone(640, 920, 0.06, 'sine', 0.07);
    },
    win: function () {
      [523, 659, 784, 1046, 1318].forEach(function (f, i) { tone(f, f, 0.4, 'triangle', 0.11, i * 0.1); });
    },
    lose: function () {
      [392, 330, 262, 196].forEach(function (f, i) { tone(f, f * 0.99, 0.5, 'sine', 0.12, i * 0.13); });
    }
  };

  A.play = function (name) {
    if (!A.muted && SFX[name]) {
      if (!A.ctx) A.init();
      try { SFX[name](); } catch (e) { /* 音频不可用时静默 */ }
    }
  };

  A.startAmbient = function () {
    if (!A.ctx || A.amb || A.muted) return;
    var s = A.ctx.createBufferSource(); s.buffer = A.noiseBuf; s.loop = true;
    var f = A.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260;
    var g = A.ctx.createGain(); g.gain.value = 0.015;
    s.connect(f); f.connect(g); g.connect(A.master); s.start();
    A.amb = { s: s, g: g };
  };
  A.stopAmbient = function () {
    if (!A.amb) return;
    try { A.amb.s.stop(); } catch (e) { }
    A.amb = null;
  };
})(window.CT);
