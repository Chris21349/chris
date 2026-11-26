/* 彩潮 · 水墨第一人称 — 调色板 / 材质 / 程序化几何 / 画布贴图 */
'use strict';
window.CT = window.CT || {};
(function (CT) {
  var T = THREE;

  /* ---------------- 0. 锁定色板：纸、墨、朱、金 ---------------- */
  var PAL = CT.PAL = {
    ink: '#0E0C0A', night: '#1B1815', abyss: '#3C3934', earth: '#D8CEBA',
    clay: '#C4B79F', paper: '#EDE5D3', sun: '#F4E9D2', gold: '#C9A45C',
    verm: '#B23A2A', rose: '#8C3A34', grass: '#8A8578', sky: '#DCD3C1',
    moss: '#5D685F', violet: '#262320', deep: '#151310', slate: '#34312D',
    magenta: '#7E3A32', cream: '#EDE5D3'
  };
  CT.COL = {};
  Object.keys(PAL).forEach(function (k) { CT.COL[k] = new T.Color(PAL[k]); });

  CT.LIGHT = {
    dir: new T.Vector3(-0.35, 0.86, 0.36).normalize(),
    key: new T.Color(1.06, 1.03, 0.98),
    fill: new T.Color(0.40, 0.42, 0.44),
    shadow: new T.Color(0.34, 0.35, 0.38),
    rim: new T.Color(1.0, 0.94, 0.82),
    fog: new T.Color('#E7DECB'),
    fogNear: 24, fogFar: 105
  };

  /* ---------------- 1. 工具 ---------------- */
  var U = CT.U = {
    clamp: function (v, a, b) { return v < a ? a : v > b ? b : v; },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    smooth: function (a, b, t) { var x = U.clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); },
    rand: function (a, b) { return a + Math.random() * (b - a); },
    pick: function (a) { return a[(Math.random() * a.length) | 0]; },
    hash2: function (x, y) { var h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; },
    rng: function (seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; },
    col: function (hex) { return new T.Color(hex); }
  };

  /* ---------------- 2. 画布贴图 ---------------- */
  var texCache = {};
  function canvas(size) { var c = document.createElement('canvas'); c.width = c.height = size; return c; }
  function toTex(c) {
    var t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.ClampToEdgeWrapping;
    t.anisotropy = 4;
    return t;
  }

  CT.TEX = {
    /* 纸面 + 墨渍 + 笔圈 */
    ground: function () {
      if (texCache.ground) return texCache.ground;
      var S = 1024, c = canvas(S), x = c.getContext('2d'), rnd = U.rng(9137);
      x.fillStyle = '#D8CCB2'; x.fillRect(0, 0, S, S);
      // 纸纤维
      for (var f = 0; f < 700; f++) {
        x.globalAlpha = 0.03 + rnd() * 0.06;
        x.strokeStyle = rnd() < 0.5 ? '#B4A78E' : '#FAF3E2';
        x.lineWidth = 0.6 + rnd() * 1.3;
        var fx = rnd() * S, fy = rnd() * S, fl = 8 + rnd() * 50, fa = rnd() * 6.283;
        x.beginPath(); x.moveTo(fx, fy);
        x.lineTo(fx + Math.cos(fa) * fl, fy + Math.sin(fa) * fl); x.stroke();
      }
      // 大块淡墨
      for (var w = 0; w < 10; w++) {
        x.globalAlpha = 0.10 + rnd() * 0.10;
        x.fillStyle = rnd() < 0.5 ? '#6B6459' : '#2B2723';
        var wx = rnd() * S, wy = rnd() * S, wr = 120 + rnd() * 300;
        x.beginPath();
        for (var k = 0; k < 12; k++) {
          var a = k / 12 * 6.283, rr = wr * (0.4 + rnd() * 0.8);
          var px = wx + Math.cos(a) * rr, py = wy + Math.sin(a) * rr * 0.8;
          k ? x.lineTo(px, py) : x.moveTo(px, py);
        }
        x.closePath(); x.fill();
      }
      // 宽笔扫过
      for (var sw = 0; sw < 24; sw++) {
        x.globalAlpha = 0.10 + rnd() * 0.18;
        x.strokeStyle = '#14120F';
        x.lineWidth = 60 + rnd() * 200;
        x.lineCap = 'round';
        var sx = rnd() * S, sy = rnd() * S, len = 300 + rnd() * 500, ang = rnd() * 6.283;
        x.beginPath(); x.moveTo(sx, sy);
        x.quadraticCurveTo(sx + Math.cos(ang) * len * 0.5 + (rnd() - .5) * 100,
          sy + Math.sin(ang) * len * 0.5 + (rnd() - .5) * 100,
          sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
        x.stroke();
      }
      // 笔圈（向心圆）
      for (var r = 0; r < 9; r++) {
        var cx = rnd() * S, cy = rnd() * S, baseR = 60 + rnd() * 160;
        for (var sr = 0; sr < 3; sr++) {
          x.globalAlpha = 0.10 + rnd() * 0.10;
          x.strokeStyle = '#14120F';
          x.lineWidth = 3 + rnd() * 10;
          x.beginPath();
          for (var a2 = 0; a2 <= 44; a2++) {
            var ang2 = a2 / 44 * 6.283;
            var rad = baseR + sr * (9 + rnd() * 12) + Math.sin(ang2 * 3 + sr) * 4;
            var qx = cx + Math.cos(ang2) * rad, qy = cy + Math.sin(ang2) * rad;
            a2 ? x.lineTo(qx, qy) : x.moveTo(qx, qy);
          }
          x.stroke();
        }
      }
      // 浓墨池与飞溅
      for (var m = 0; m < 26; m++) {
        x.globalAlpha = 0.28 + rnd() * 0.32;
        x.fillStyle = rnd() < 0.4 ? '#0E0C0A' : '#26231F';
        var mx = rnd() * S, my = rnd() * S, mr = 14 + rnd() * 52;
        x.beginPath();
        for (var n = 0; n < 10; n++) {
          var an = n / 10 * 6.283, ar = mr * (0.45 + rnd() * 0.95);
          var qx2 = mx + Math.cos(an) * ar, qy2 = my + Math.sin(an) * ar * 0.7;
          n ? x.lineTo(qx2, qy2) : x.moveTo(qx2, qy2);
        }
        x.closePath(); x.fill();
        for (var sp = 0; sp < 8; sp++) {
          x.globalAlpha = 0.25 + rnd() * 0.35;
          x.beginPath();
          x.arc(mx + U.rand(-mr, mr) * 2.2, my + U.rand(-mr, mr) * 1.8, 1 + rnd() * 5, 0, 7);
          x.fill();
        }
      }
      // 朱砂印记
      for (var s2 = 0; s2 < 6; s2++) {
        x.globalAlpha = 0.28 + rnd() * 0.22;
        x.fillStyle = '#B23A2A';
        var sx3 = rnd() * S, sy3 = rnd() * S;
        x.save(); x.translate(sx3, sy3); x.rotate(rnd() * 3);
        x.fillRect(-8, -8, 16, 16);
        x.globalAlpha = 0.55; x.fillStyle = '#EDE5D3';
        x.fillRect(-3, -6, 2, 12); x.fillRect(2, -6, 2, 12);
        x.restore();
      }
      // 细微墨点
      for (var d = 0; d < 900; d++) {
        x.globalAlpha = 0.06 + rnd() * 0.20;
        x.fillStyle = '#1B1815';
        x.beginPath(); x.arc(rnd() * S, rnd() * S, 0.6 + rnd() * 2.4, 0, 7); x.fill();
      }
      x.globalAlpha = 1;
      texCache.ground = toTex(c);
      texCache.ground.wrapS = texCache.ground.wrapT = T.RepeatWrapping;
      texCache.ground.repeat.set(5, 5);
      return texCache.ground;
    },

    blob: function () {
      if (texCache.blob) return texCache.blob;
      var c = canvas(128), x = c.getContext('2d');
      var g = x.createRadialGradient(64, 64, 4, 64, 64, 62);
      g.addColorStop(0, 'rgba(14,12,10,0.62)');
      g.addColorStop(0.55, 'rgba(14,12,10,0.35)');
      g.addColorStop(1, 'rgba(14,12,10,0)');
      x.fillStyle = g; x.fillRect(0, 0, 128, 128);
      texCache.blob = toTex(c);
      return texCache.blob;
    },

    splat: function () {
      if (texCache.splat) return texCache.splat;
      var S = 128, c = canvas(S), x = c.getContext('2d'), rnd = U.rng(99);
      x.translate(S / 2, S / 2);
      x.fillStyle = '#fff';
      for (var i = 0; i < 9; i++) {
        var a = rnd() * 6.283, r = i === 0 ? 0 : 12 + rnd() * 30;
        var rr = i === 0 ? 26 : 5 + rnd() * 15;
        x.globalAlpha = i === 0 ? 0.95 : 0.55 + rnd() * 0.4;
        x.beginPath(); x.arc(Math.cos(a) * r, Math.sin(a) * r, rr, 0, 7); x.fill();
      }
      for (var k = 0; k < 14; k++) {
        var ang = rnd() * 6.283, len = 22 + rnd() * 34;
        x.globalAlpha = 0.25 + rnd() * 0.45;
        x.strokeStyle = '#fff'; x.lineWidth = 1.5 + rnd() * 4; x.lineCap = 'round';
        x.beginPath(); x.moveTo(Math.cos(ang) * 22, Math.sin(ang) * 22);
        x.lineTo(Math.cos(ang) * (22 + len), Math.sin(ang) * (22 + len) * 0.9); x.stroke();
      }
      x.globalAlpha = 1;
      texCache.splat = toTex(c);
      return texCache.splat;
    },

    spark: function () {
      if (texCache.spark) return texCache.spark;
      var c = canvas(64), x = c.getContext('2d');
      var g = x.createRadialGradient(32, 32, 0, 32, 32, 30);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.4, 'rgba(240,234,220,0.8)');
      g.addColorStop(1, 'rgba(230,222,205,0)');
      x.fillStyle = g; x.fillRect(0, 0, 64, 64);
      texCache.spark = toTex(c);
      return texCache.spark;
    },

    ring: function () {
      if (texCache.ring) return texCache.ring;
      var S = 256, c = canvas(S), x = c.getContext('2d');
      var g = x.createRadialGradient(S / 2, S / 2, S * 0.2, S / 2, S / 2, S * 0.5);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.6, 'rgba(255,255,255,0)');
      g.addColorStop(0.8, 'rgba(255,255,255,0.9)');
      g.addColorStop(0.9, 'rgba(255,255,255,0.35)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, S, S);
      texCache.ring = toTex(c);
      return texCache.ring;
    },

    /* 屏幕斩击弧 */
    slash: function () {
      if (texCache.slash) return texCache.slash;
      var S = 512, c = canvas(S), x = c.getContext('2d');
      x.translate(S / 2, S / 2);
      var R = S * 0.33;
      // 墨弧
      for (var i = 0; i < 180; i++) {
        var t = i / 180;
        var ang = (-0.72 + t * 1.44);
        var thick = 8 + Math.sin(t * Math.PI) * 20;
        x.globalAlpha = Math.sin(Math.pow(t, 0.75) * Math.PI) * 0.95;
        x.strokeStyle = '#14120F';
        x.lineWidth = thick;
        x.lineCap = 'round';
        x.beginPath(); x.arc(0, 0, R, ang - 0.05, ang + 0.05); x.stroke();
      }
      // 白刃
      for (var j = 0; j < 120; j++) {
        var t2 = j / 120;
        var ang2 = (-0.66 + t2 * 1.32);
        x.globalAlpha = Math.sin(Math.pow(t2, 0.8) * Math.PI) * 0.9;
        x.strokeStyle = '#F4E9D2';
        x.lineWidth = 2 + Math.sin(t2 * Math.PI) * 4;
        x.beginPath(); x.arc(0, 0, R - 10, ang2 - 0.03, ang2 + 0.03); x.stroke();
      }
      // 甩墨
      for (var k = 0; k < 40; k++) {
        var a = -0.72 + Math.random() * 1.44;
        var rr = R + 20 + Math.random() * 50;
        x.globalAlpha = 0.2 + Math.random() * 0.5;
        x.fillStyle = '#14120F';
        x.beginPath(); x.arc(Math.cos(a) * rr, Math.sin(a) * rr, 1.5 + Math.random() * 5, 0, 7); x.fill();
      }
      x.globalAlpha = 1;
      texCache.slash = toTex(c);
      return texCache.slash;
    },

    stroke: function () {
      if (texCache.stroke) return texCache.stroke;
      var W = 512, H = 192, c = document.createElement('canvas');
      c.width = W; c.height = H;
      var x = c.getContext('2d');
      x.translate(0, H / 2);
      // 一笔横扫，中段厚、两端飞白
      for (var i = 0; i < 240; i++) {
        var t = i / 240;
        var px = 20 + t * (W - 40);
        var taper = Math.sin(Math.pow(t, 0.7) * Math.PI);
        var hh = 8 + taper * 52 * (0.7 + Math.random() * 0.5);
        x.globalAlpha = (0.25 + Math.random() * 0.5) * (0.35 + taper * 0.65);
        x.fillStyle = '#14120F';
        x.beginPath(); x.ellipse(px, (Math.random() - 0.5) * 10, 10 + Math.random() * 8, hh / 2, 0, 0, 7); x.fill();
      }
      // 干笔缺口
      x.globalCompositeOperation = 'destination-out';
      for (var k = 0; k < 40; k++) {
        x.globalAlpha = 0.4 + Math.random() * 0.6;
        x.beginPath(); x.arc(Math.random() * W, (Math.random() - 0.5) * H, 2 + Math.random() * 9, 0, 7); x.fill();
      }
      x.globalCompositeOperation = 'source-over';
      texCache.stroke = toTex(c);
      texCache.stroke.wrapS = texCache.stroke.wrapT = T.ClampToEdgeWrapping;
      return texCache.stroke;
    },

    moon: function () {
      if (texCache.moon) return texCache.moon;
      var S = 256, c = canvas(S), x = c.getContext('2d');
      var cx = S / 2, cy = S / 2, R = S * 0.36;
      // 纸色外晕
      var g = x.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.28);
      g.addColorStop(0, 'rgba(237,229,211,0.55)');
      g.addColorStop(1, 'rgba(237,229,211,0)');
      x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R * 1.28, 0, 7); x.fill();
      // 朱砂日轮
      var g2 = x.createRadialGradient(cx - R * 0.2, cy - R * 0.2, R * 0.1, cx, cy, R);
      g2.addColorStop(0, '#C64533');
      g2.addColorStop(0.72, '#B23A2A');
      g2.addColorStop(1, '#8C2A1E');
      x.fillStyle = g2;
      x.beginPath();
      for (var i = 0; i <= 64; i++) {
        var a = i / 64 * 6.283;
        var rr = R * (0.985 + Math.sin(a * 5 + 0.7) * 0.012 + Math.sin(a * 11) * 0.008);
        var px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
        i ? x.lineTo(px, py) : x.moveTo(px, py);
      }
      x.closePath(); x.fill();
      // 墨边
      x.globalAlpha = 0.4; x.strokeStyle = '#14120F'; x.lineWidth = 3;
      x.beginPath(); x.arc(cx, cy, R * 0.99, 0, 7); x.stroke();
      // 纸屑与飞白
      x.globalAlpha = 0.35;
      for (var k = 0; k < 26; k++) {
        var aa = Math.random() * 6.283, rr2 = Math.random() * R * 0.92;
        x.fillStyle = Math.random() < 0.5 ? '#EDE5D3' : '#7E2418';
        x.beginPath(); x.arc(cx + Math.cos(aa) * rr2, cy + Math.sin(aa) * rr2, 0.8 + Math.random() * 2.6, 0, 7); x.fill();
      }
      x.globalAlpha = 1;
      texCache.moon = toTex(c);
      return texCache.moon;
    }
  };

  /* ---------------- 3. 材质 ---------------- */
  var shared = {
    uKeyDir: { value: CT.LIGHT.dir },
    uKeyCol: { value: CT.LIGHT.key },
    uFillCol: { value: CT.LIGHT.fill },
    uShadowCol: { value: CT.LIGHT.shadow },
    uRimCol: { value: CT.LIGHT.rim },
    uFogCol: { value: CT.LIGHT.fog },
    uFogNear: { value: CT.LIGHT.fogNear },
    uFogFar: { value: CT.LIGHT.fogFar },
    uAmb: { value: 0.10 },
    uTime: { value: 0 }
  };
  CT.sharedUniforms = shared;

  var VERT = [
    'attribute vec3 color;',
    'attribute float aGlow;',
    'uniform float uTime;',
    'varying vec3 vCol;',
    'varying vec3 vN;',
    'varying vec3 vW;',
    'varying float vGlow;',
    'void main(){',
    '  vec3 transformed = position;',
    '#ifdef SWAY',
    '  float h = clamp(position.y, 0.0, 6.0);',
    '  float ph = uTime * 1.4;',
    '  #ifdef USE_INSTANCING',
    '    ph += instanceMatrix[3].x * 0.4 + instanceMatrix[3].z * 0.33;',
    '  #endif',
    '  transformed.x += sin(ph) * 0.05 * h * h;',
    '  transformed.z += cos(ph * 0.8) * 0.03 * h * h;',
    '#endif',
    '  vec4 wp = modelMatrix * vec4(transformed, 1.0);',
    '  mat3 nmat = mat3(modelMatrix);',
    '#ifdef USE_INSTANCING',
    '  wp = modelMatrix * instanceMatrix * vec4(transformed, 1.0);',
    '  nmat = mat3(modelMatrix) * mat3(instanceMatrix);',
    '#endif',
    '  vW = wp.xyz;',
    '  vN = normalize(nmat * normal);',
    '  vCol = color;',
    '#ifdef USE_INSTANCING_COLOR',
    '  vCol *= instanceColor;',
    '#endif',
    '  vGlow = aGlow;',
    '  gl_Position = projectionMatrix * viewMatrix * wp;',
    '}'
  ].join('\n');

  var FRAG = [
    'uniform vec3 uKeyCol; uniform vec3 uFillCol; uniform vec3 uShadowCol;',
    'uniform vec3 uRimCol; uniform vec3 uFogCol; uniform float uFogNear; uniform float uFogFar;',
    'uniform vec3 uKeyDir; uniform float uRim; uniform float uEdge; uniform float uGlow; uniform float uAmb;',
    'varying vec3 vCol; varying vec3 vN; varying vec3 vW; varying float vGlow;',
    'float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
    'float vnoise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y); }',
    'void main(){',
    '  vec3 N = normalize(vN);',
    '  vec3 V = normalize(cameraPosition - vW);',
    '  float ndl = dot(N, uKeyDir);',
    '  float lit = clamp(ndl * 0.5 + 0.5, 0.0, 1.0);',
    '  float n1 = vnoise(vW.xz * 1.6 + vW.y * 2.0);',
    '  float n2 = vnoise(vW.xz * 5.0 - vW.y * 1.4);',
    '  float warp = (n1 - 0.5) * 0.16 + (n2 - 0.5) * 0.05;',
    '  float s1 = smoothstep(0.46 + warp, 0.53 + warp, lit);',
    '  float s2 = smoothstep(0.72 + warp * 0.5, 0.78 + warp * 0.5, lit);',
    '  float shade = s1 * 0.55 + s2 * 0.45;',
    '  vec3 base = vCol;',
    '  vec3 shadow = base * uShadowCol;',
    '  vec3 litc = base * uKeyCol;',
    '  vec3 col = mix(shadow, litc, shade);',
    '  col += base * uFillCol * (0.13 + 0.12 * max(0.0, -ndl));',
    '  col += base * uAmb;',
    '  col += base * (n2 - 0.5) * 0.05;',
    '  float fres = pow(1.0 - max(dot(N, V), 0.0), 2.6);',
    '  col += uRimCol * fres * uRim * (0.4 + 0.6 * max(ndl, 0.0));',
    '  col *= 1.0 - uEdge * pow(1.0 - max(dot(N, V), 0.0), 3.0);',
    '  col += vec3(1.0, 0.86, 0.55) * vGlow * uGlow;',
    '  float d = distance(cameraPosition, vW);',
    '  float fog = smoothstep(uFogNear, uFogFar, d);',
    '  col = mix(col, uFogCol, fog * 0.94);',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  CT.mat = {
    toon: function (o) {
      o = o || {};
      var uni = Object.assign({}, shared, {
        uRim: { value: o.rim === undefined ? 0.12 : o.rim },
        uEdge: { value: o.edge === undefined ? 0.26 : o.edge },
        uGlow: { value: o.glow === undefined ? 0.6 : o.glow },
        uAmb: { value: o.amb === undefined ? 0.10 : o.amb }
      });
      var defines = {};
      if (o.sway) defines.SWAY = 1;
      return new T.ShaderMaterial({
        uniforms: uni, vertexShader: VERT, fragmentShader: FRAG, defines: defines,
        side: o.side || T.FrontSide, depthWrite: o.depthWrite !== false
      });
    },
    basic: function (o) { return new T.MeshBasicMaterial(Object.assign({ fog: true }, o || {})); },
    add: function (o) {
      return new T.MeshBasicMaterial(Object.assign({
        transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false
      }, o || {}));
    },
    shadow: function () {
      return new T.MeshBasicMaterial({
        map: CT.TEX.blob(), transparent: true, depthWrite: false,
        color: 0x0E0C0A, opacity: 0.85, fog: false
      });
    },
    decal: function () {
      return new T.ShaderMaterial({
        uniforms: { uMap: { value: CT.TEX.splat() } },
        vertexShader: [
          'attribute float aAlpha;',
          'varying vec2 vUv; varying vec3 vC; varying float vA;',
          'void main(){',
          '  vUv = uv; vC = vec3(1.0); vA = aAlpha;',
          '#ifdef USE_INSTANCING_COLOR',
          '  vC = instanceColor;',
          '#endif',
          '  vec4 wp = modelMatrix * vec4(position, 1.0);',
          '#ifdef USE_INSTANCING',
          '  wp = modelMatrix * instanceMatrix * vec4(position, 1.0);',
          '#endif',
          '  gl_Position = projectionMatrix * viewMatrix * wp;',
          '}'
        ].join('\n'),
        fragmentShader: [
          'uniform sampler2D uMap;',
          'varying vec2 vUv; varying vec3 vC; varying float vA;',
          'void main(){ vec4 t = texture2D(uMap, vUv); gl_FragColor = vec4(vC, t.a * vA); }'
        ].join('\n'),
        transparent: true, depthWrite: false, side: T.DoubleSide,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
      });
    }
  };

  /* ---------------- 4. 几何工具 ---------------- */
  function colorize(g, top, bottom, axis, glow) {
    var pos = g.attributes.position;
    g.computeBoundingBox();
    var bb = g.boundingBox;
    var a = axis || 'y';
    var min = a === 'x' ? bb.min.x : a === 'z' ? bb.min.z : bb.min.y;
    var max = a === 'x' ? bb.max.x : a === 'z' ? bb.max.z : bb.max.y;
    var span = Math.max(max - min, 1e-5);
    var cTop = new T.Color(top), cBot = new T.Color(bottom || top);
    var arr = new Float32Array(pos.count * 3), glowArr = new Float32Array(pos.count);
    var tmp = new T.Color();
    for (var i = 0; i < pos.count; i++) {
      var v = a === 'x' ? pos.getX(i) : a === 'z' ? pos.getZ(i) : pos.getY(i);
      var t = (v - min) / span;
      tmp.copy(cBot).lerp(cTop, 0.08 + t * 0.86);
      var j = 0.965 + U.hash2(i * 7, pos.count + 3) * 0.07;
      arr[i * 3] = tmp.r * j; arr[i * 3 + 1] = tmp.g * j; arr[i * 3 + 2] = tmp.b * j;
      glowArr[i] = glow || 0;
    }
    g.setAttribute('color', new T.BufferAttribute(arr, 3));
    g.setAttribute('aGlow', new T.BufferAttribute(glowArr, 1));
  }

  function part(g, o) {
    if (g.index) g = g.toNonIndexed();
    g = g.clone();
    colorize(g, o.top, o.bottom, o.axis, o.glow);
    var m = new T.Matrix4();
    m.compose(
      new T.Vector3().fromArray(o.pos || [0, 0, 0]),
      new T.Quaternion().setFromEuler(new T.Euler().fromArray(o.rot || [0, 0, 0])),
      new T.Vector3().fromArray(o.scale || [1, 1, 1])
    );
    g.applyMatrix4(m);
    return g;
  }

  function merge(parts) {
    var gs = [], total = 0, i;
    for (i = 0; i < parts.length; i++) { gs.push(parts[i]); total += parts[i].attributes.position.count; }
    var pos = new Float32Array(total * 3), nor = new Float32Array(total * 3);
    var col = new Float32Array(total * 3), glow = new Float32Array(total);
    var off = 0;
    for (i = 0; i < gs.length; i++) {
      var g = gs[i];
      pos.set(g.attributes.position.array, off * 3);
      nor.set(g.attributes.normal.array, off * 3);
      col.set(g.attributes.color.array, off * 3);
      glow.set(g.attributes.aGlow.array, off);
      off += g.attributes.position.count;
    }
    var geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new T.BufferAttribute(nor, 3));
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
    geo.setAttribute('aGlow', new T.BufferAttribute(glow, 1));
    geo.computeBoundingSphere();
    return geo;
  }

  function P(g, top, bottom, x, y, z, opts) {
    opts = opts || {};
    return part(g, {
      top: top, bottom: bottom, pos: [x || 0, y || 0, z || 0],
      rot: opts.rot, scale: opts.scale, axis: opts.axis, glow: opts.glow
    });
  }

  CT.geo = {};

  /* ---------------- 5. 第一人称毛笔 ---------------- */
  CT.geo.weapon = function () {
    var p = [];
    // 粗笔杆：朱砂漆 + 金箍
    p.push(P(new T.CylinderGeometry(0.048, 0.056, 0.62, 9), '#8C3A34', '#40201C', 0, -0.28, 0));
    for (var i = 0; i < 3; i++) {
      p.push(P(new T.CylinderGeometry(0.062, 0.062, 0.035, 9), '#C9A45C', '#7A5C2E', 0, -0.44 + i * 0.06, 0));
    }
    p.push(P(new T.CylinderGeometry(0.075, 0.080, 0.13, 10), PAL.gold, '#7A5C2E', 0, 0.06, 0));
    p.push(P(new T.TorusGeometry(0.080, 0.012, 4, 16), '#F0D08E', '#7A5C2E', 0, 0.125, 0, { rot: [Math.PI / 2, 0, 0] }));
    // 笔头：宽根、长锋；墨黑 + 灰锋
    p.push(P(new T.CylinderGeometry(0.175, 0.135, 0.30, 10), '#2B2723', '#0A0908', 0, 0.27, 0));
    p.push(P(new T.ConeGeometry(0.175, 0.80, 10, 1), '#1B1815', '#080706', 0, 0.82, 0));
    p.push(P(new T.ConeGeometry(0.060, 0.26, 8, 1), '#5C574D', '#1B1815', 0, 1.16, 0));
    p.push(P(new T.ConeGeometry(0.028, 0.12, 6, 1), '#8A8578', '#1B1815', 0, 1.33, 0));
    // 笔根墨汁滴
    p.push(P(new T.IcosahedronGeometry(0.055, 0), '#0E0C0A', '#080706', 0.12, 0.15, 0.04, { scale: [1, 1.6, 1] }));
    // 朱砂穗
    p.push(P(new T.BoxGeometry(0.04, 0.26, 0.04), PAL.verm, '#6E2418', 0.03, -0.70, 0, { rot: [0, 0, 0.1] }));
    p.push(P(new T.IcosahedronGeometry(0.04, 0), PAL.gold, '#7A5C2E', 0.03, -0.57, 0));
    // 袖口与手
    p.push(P(new T.CylinderGeometry(0.10, 0.15, 0.45, 7), PAL.paper, '#B3A58C', 0.32, -0.52, 0.05, { rot: [0.15, 0, -0.55] }));
    p.push(P(new T.CylinderGeometry(0.12, 0.12, 0.055, 7), PAL.ink, '#080706', 0.16, -0.30, 0.04, { rot: [0.15, 0, -0.55] }));
    p.push(P(new T.IcosahedronGeometry(0.075, 0), '#D8C3A2', '#8E7558', 0.07, -0.20, 0.03, { scale: [1, 1.2, 0.8] }));
    return merge(p);
  };

  CT.geo.plane = function () { return new T.PlaneGeometry(1, 1); };

  /* ---------------- 6. 墨兽 ---------------- */
  CT.geo.mote = function () {
    var p = [];
    p.push(P(new T.IcosahedronGeometry(0.36, 0), '#141210', '#060505', 0, 0.42, 0, { scale: [1, 0.95, 1] }));
    p.push(P(new T.ConeGeometry(0.10, 0.28, 5, 1), '#0E0C0A', '#080706', 0, 0.80, 0));
    p.push(P(new T.IcosahedronGeometry(0.04, 0), PAL.gold, PAL.gold, -0.13, 0.50, 0.30, { glow: 1.1 }));
    p.push(P(new T.IcosahedronGeometry(0.04, 0), PAL.gold, PAL.gold, 0.13, 0.50, 0.30, { glow: 1.1 }));
    // 背脊墨刺
    p.push(P(new T.ConeGeometry(0.07, 0.24, 4), '#4A463F', '#1B1815', 0.18, 0.62, -0.18, { rot: [0.5, 0, -0.4] }));
    p.push(P(new T.ConeGeometry(0.05, 0.30, 4), '#3A3733', '#0E0C0A', -0.20, 0.56, -0.10, { rot: [-0.4, 0, 0.6] }));
    p.push(P(new T.ConeGeometry(0.04, 0.20, 4), '#514B44', '#141210', 0.02, 0.74, -0.24, { rot: [-0.5, 0, 0.1] }));
    // 纸白口器
    p.push(P(new T.IcosahedronGeometry(0.07, 0), PAL.paper, '#A79A82', 0, 0.34, 0.34, { scale: [1.5, 0.28, 0.35], glow: 0.15 }));
    return merge(p);
  };

  CT.geo.darter = function () {
    var p = [];
    p.push(P(new T.ConeGeometry(0.20, 1.05, 5, 1), '#141210', '#060505', 0, 0.62, 0.05, { rot: [Math.PI / 2, 0, 0] }));
    p.push(P(new T.ConeGeometry(0.11, 0.40, 4, 1), '#3C3934', '#0E0C0A', 0, 0.62, -0.55, { rot: [-Math.PI / 2, 0, 0] }));
    p.push(P(new T.BoxGeometry(0.42, 0.045, 0.24), '#5C574D', '#2B2723', 0, 0.68, -0.30, { rot: [0, 0, 0.28] }));
    p.push(P(new T.IcosahedronGeometry(0.040, 0), PAL.gold, PAL.gold, 0, 0.68, 0.48, { glow: 1.7 }));
    p.push(P(new T.ConeGeometry(0.05, 0.5, 4), '#3C3934', '#0A0908', 0, 0.66, -0.72, { rot: [-Math.PI / 2, 0, 0] }));
    return merge(p);
  };

  CT.geo.brute = function () {
    var p = [];
    p.push(P(new T.DodecahedronGeometry(0.68, 0), '#141210', '#060505', 0, 0.66, 0, { scale: [1.1, 0.88, 1] }));
    p.push(P(new T.BoxGeometry(0.52, 0.24, 0.38), '#4A463F', '#1B1815', 0, 1.10, -0.18, { rot: [0.2, 0, 0] }));
    p.push(P(new T.BoxGeometry(0.38, 0.2, 0.3), '#5C574D', '#26231F', 0, 1.22, -0.32, { rot: [0.25, 0.4, 0] }));
    p.push(P(new T.IcosahedronGeometry(0.26, 0), '#0E0C0A', '#080706', 0, 0.90, 0.56));
    p.push(P(new T.IcosahedronGeometry(0.040, 0), PAL.gold, PAL.gold, -0.10, 0.96, 0.78, { glow: 1.8 }));
    p.push(P(new T.IcosahedronGeometry(0.040, 0), PAL.gold, PAL.gold, 0.10, 0.96, 0.78, { glow: 1.8 }));
    p.push(P(new T.BoxGeometry(0.28, 0.54, 0.32), '#26231F', '#0A0908', -0.70, 0.64, 0.12, { rot: [0, 0, 0.16] }));
    p.push(P(new T.BoxGeometry(0.28, 0.54, 0.32), '#26231F', '#0A0908', 0.70, 0.64, 0.12, { rot: [0, 0, -0.16] }));
    return merge(p);
  };

  CT.geo.spitter = function () {
    var p = [];
    p.push(P(new T.CylinderGeometry(0.20, 0.30, 0.95, 7), '#141210', '#060505', 0, 0.62, 0));
    p.push(P(new T.IcosahedronGeometry(0.32, 1), '#26231F', '#0E0C0A', 0, 1.22, 0, { scale: [1, 1.05, 1] }));
    p.push(P(new T.IcosahedronGeometry(0.25, 0), PAL.magenta, '#4A1C16', 0, 1.26, -0.28));
    p.push(P(new T.IcosahedronGeometry(0.055, 0), PAL.gold, PAL.gold, -0.11, 1.30, 0.32, { glow: 1.8 }));
    p.push(P(new T.IcosahedronGeometry(0.055, 0), PAL.gold, PAL.gold, 0.11, 1.30, 0.32, { glow: 1.8 }));
    p.push(P(new T.ConeGeometry(0.085, 0.28, 5), PAL.magenta, '#4A1C16', 0, 1.20, 0.34, { rot: [Math.PI / 2, 0, 0] }));
    return merge(p);
  };

  CT.geo.boss = function () {
    var p = [];
    p.push(P(new T.IcosahedronGeometry(1.5, 1), '#1B1815', '#0A0908', 0, 2.1, 0, { scale: [1.22, 1.0, 1.0] }));
    p.push(P(new T.BoxGeometry(1.9, 0.55, 1.3), '#3C3934', '#0E0C0A', 0, 3.0, -0.15, { rot: [0.1, 0, 0] }));
    p.push(P(new T.ConeGeometry(0.55, 1.2, 5), '#26231F', '#080706', -1.55, 3.05, 0.1, { rot: [0, 0, 0.9] }));
    p.push(P(new T.ConeGeometry(0.55, 1.2, 5), '#26231F', '#080706', 1.55, 3.05, 0.1, { rot: [0, 0, -0.9] }));
    p.push(P(new T.IcosahedronGeometry(0.80, 1), '#0E0C0A', '#080706', 0, 3.95, 0.95, { scale: [1.05, 0.95, 1.0] }));
    p.push(P(new T.BoxGeometry(0.07, 0.5, 0.12), PAL.gold, PAL.gold, -0.18, 4.1, 1.62, { rot: [0, 0, 0.2], glow: 1.0 }));
    p.push(P(new T.BoxGeometry(0.07, 0.34, 0.12), PAL.gold, PAL.gold, 0.22, 4.0, 1.60, { rot: [0, 0, -0.35], glow: 1.0 }));
    p.push(P(new T.IcosahedronGeometry(0.20, 0), PAL.gold, PAL.sun, -0.30, 4.06, 1.60, { glow: 1.1 }));
    p.push(P(new T.IcosahedronGeometry(0.20, 0), PAL.gold, PAL.sun, 0.30, 4.06, 1.60, { glow: 1.1 }));
    p.push(P(new T.IcosahedronGeometry(0.42, 1), PAL.verm, '#5E1A12', 0, 2.6, 1.42, { glow: 1.2 }));
    // 纸白口器与獠牙
    p.push(P(new T.BoxGeometry(0.62, 0.07, 0.06), PAL.paper, '#A79A82', 0, 3.74, 1.63));
    p.push(P(new T.ConeGeometry(0.04, 0.14, 4), PAL.paper, '#A79A82', -0.18, 3.66, 1.66, { rot: [0, 0, 3.14] }));
    p.push(P(new T.ConeGeometry(0.04, 0.14, 4), PAL.paper, '#A79A82', 0.18, 3.66, 1.66, { rot: [0, 0, 3.14] }));
    // 肩甲尖刺
    p.push(P(new T.ConeGeometry(0.38, 1.1, 4), '#34312D', '#0E0C0A', -2.05, 3.55, 0, { rot: [0, 0, 1.1] }));
    p.push(P(new T.ConeGeometry(0.38, 1.1, 4), '#34312D', '#0E0C0A', 2.05, 3.55, 0, { rot: [0, 0, -1.1] }));
    for (var q = 0; q < 4; q++) {
      var qa = q / 4 * 6.283 + 0.4;
      p.push(P(new T.ConeGeometry(0.14, 0.8, 4), '#1B1815', '#080706', Math.cos(qa) * 1.7, 1.6, Math.sin(qa) * 1.5, { rot: [0, 0, Math.cos(qa) * 0.9] }));
    }
    for (var i = -1; i <= 1; i++) {
      p.push(P(new T.ConeGeometry(0.20, 1.25 - Math.abs(i) * 0.22, 5), PAL.gold, PAL.verm, i * 0.45, 5.05 - Math.abs(i) * 0.12, 0.78, { rot: [0, 0, i * -0.32], glow: 0.7 }));
    }
    p.push(P(new T.CylinderGeometry(0.34, 0.46, 1.5, 6), '#34312D', '#0E0C0A', -1.55, 1.85, 0.55, { rot: [0.2, 0, 0.28] }));
    p.push(P(new T.CylinderGeometry(0.34, 0.46, 1.5, 6), '#34312D', '#0E0C0A', 1.55, 1.85, 0.55, { rot: [0.2, 0, -0.28] }));
    p.push(P(new T.ConeGeometry(0.24, 0.6, 4), PAL.gold, PAL.verm, -1.85, 1.05, 0.85, { rot: [1.2, 0, 0.2], glow: 0.4 }));
    p.push(P(new T.ConeGeometry(0.24, 0.6, 4), PAL.gold, PAL.verm, 1.85, 1.05, 0.85, { rot: [1.2, 0, -0.2], glow: 0.4 }));
    for (var k = 0; k < 3; k++) {
      p.push(P(new T.ConeGeometry(0.22, 0.9, 4), '#1B1815', '#080706', -0.7 + k * 0.7, 3.1, -0.95, { rot: [-0.7, 0, 0], glow: 0.1 }));
    }
    return merge(p);
  };

  CT.geo.gem = function () {
    var g = new T.OctahedronGeometry(0.16, 0);
    g.scale(1, 1.6, 1);
    return part(g, { top: PAL.sun, bottom: PAL.gold, glow: 0.5 });
  };

  CT.geo.heal = function () {
    var p = [];
    p.push(P(new T.IcosahedronGeometry(0.20, 1), PAL.verm, '#5E1A12', 0, 0.24, 0, { glow: 0.6 }));
    p.push(P(new T.BoxGeometry(0.07, 0.22, 0.07), PAL.paper, PAL.paper, 0, 0.40, 0, { glow: 0.4 }));
    return merge(p);
  };

  /* ---------------- 7. 场景道具 ---------------- */
  CT.geo.rock = function () {
    var g = new T.DodecahedronGeometry(0.62, 0);
    var geo = part(g, { top: '#4A463F', bottom: '#0E0C0A', axis: 'y' });
    var top = part(new T.DodecahedronGeometry(0.60, 0), { top: '#6B6459', bottom: '#2B2723', axis: 'y' });
    top.applyMatrix4(new T.Matrix4().makeScale(1.02, 0.3, 1.02));
    top.applyMatrix4(new T.Matrix4().makeTranslation(0, 0.44, 0));
    return merge([geo, top]);
  };

  CT.geo.bamboo = function () {
    var p = [];
    var rnd = U.rng(44);
    for (var i = 0; i < 3; i++) {
      var a = i / 3 * 6.283 + rnd();
      var lean = 0.06 + rnd() * 0.10;
      var h = 6.5 + rnd() * 3.0;
      var x = Math.cos(a) * 0.55, z = Math.sin(a) * 0.55;
      p.push(P(new T.CylinderGeometry(0.055, 0.075, h, 5), '#1B1815', '#080706', x, h / 2, z, { rot: [Math.sin(a) * lean, 0, Math.cos(a) * lean] }));
      for (var s = 1; s < 5; s++) {
        p.push(P(new T.TorusGeometry(0.062, 0.010, 3, 8), '#3C3934', '#0E0C0A', x, s * h / 5, z, { rot: [Math.PI / 2, 0, 0] }));
      }
      for (var l = 0; l < 8; l++) {
        var la = l / 8 * 6.283 + a;
        var lh = h * (0.55 + l * 0.08);
        p.push(P(new T.PlaneGeometry(1.5, 0.26), '#26231F', '#0E0C0A',
          x + Math.cos(la) * 0.65, lh, z + Math.sin(la) * 0.65,
          { rot: [-0.2 + Math.sin(la) * 0.2, -la, 0.2], axis: 'x' }));
      }
    }
    return merge(p);
  };

  CT.geo.mountains = function () {
    var layers = [
      { r: 102, h: 34, base: '#2B2723', top: '#6B6459' },
      { r: 78, h: 24, base: '#1E1B18', top: '#514B44' },
      { r: 58, h: 15, base: '#14120F', top: '#3C3934' },
      { r: 43, h: 10, base: '#0E0C0A', top: '#2B2723' }
    ];
    var pos = [], col = [], rnd = U.rng(77);
    layers.forEach(function (L, li) {
      var seg = 72;
      var heights = [];
      for (var i = 0; i <= seg; i++) {
        var t = i / seg * 6.283;
        var n = Math.sin(t * 3 + li) * 0.28 + Math.sin(t * 7 + li * 2) * 0.16 + Math.sin(t * 13 + li) * 0.08;
        heights.push(L.h * (0.42 + 0.58 * (0.5 + 0.5 * n)) + rnd() * L.h * 0.16);
      }
      var cB = new T.Color(L.base), cT = new T.Color(L.top);
      for (var k = 0; k < seg; k++) {
        var a0 = k / seg * 6.283, a1 = (k + 1) / seg * 6.283;
        var x0 = Math.cos(a0) * L.r, z0 = Math.sin(a0) * L.r;
        var x1 = Math.cos(a1) * L.r, z1 = Math.sin(a1) * L.r;
        var h0 = heights[k], h1 = heights[k + 1];
        // 两个三角形组成一段山脊
        pos.push(x0, -1, z0, x1, -1, z1, x1, h1, z1);
        col.push(cB.r, cB.g, cB.b, cB.r, cB.g, cB.b, cT.r, cT.g, cT.b);
        pos.push(x0, -1, z0, x1, h1, z1, x0, h0, z0);
        col.push(cB.r, cB.g, cB.b, cT.r, cT.g, cT.b, cT.r, cT.g, cT.b);
      }
    });
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    return g;
  };
})(window.CT);
