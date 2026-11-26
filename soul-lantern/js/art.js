/* 彩潮 · CHROMA TIDE — 美术底层：调色板 / 材质 / 程序化几何 / 贴图 */
'use strict';
window.CT = window.CT || {};
(function (CT) {
  var T = THREE;

  /* ---------------- 0. 调色板（锁定，见 ART-BIBLE.md） ---------------- */
  var PAL = CT.PAL = {
    ink: '#1A1714', night: '#26313A', abyss: '#3D5A6B',
    earth: '#B97843', clay: '#D08A54', paper: '#F2E8D5', gold: '#E8BE74',
    sun: '#FFD7A6', verm: '#D24B33', rose: '#C85C6A', grass: '#8E9B55',
    sky: '#86B7C9', moss: '#4E8C7A', violet: '#7B5E8C', deep: '#473A57',
    slate: '#4F6573', magenta: '#A4576F', cream: '#EDE2CB'
  };
  CT.COL = {};
  Object.keys(PAL).forEach(function (k) { CT.COL[k] = new T.Color(PAL[k]); });

  CT.LIGHT = {
    dir: new T.Vector3(-0.62, 0.56, 0.54).normalize(),
    key: new T.Color(1.22, 1.06, 0.84),
    fill: new T.Color(0.42, 0.58, 0.72),
    shadow: new T.Color(0.45, 0.43, 0.64),
    rim: new T.Color(1.0, 0.68, 0.34),
    fog: new T.Color('#2C3A44'),
    fogNear: 26, fogFar: 68
  };

  /* ---------------- 1. 工具 ---------------- */
  var U = CT.U = {
    clamp: function (v, a, b) { return v < a ? a : v > b ? b : v; },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    smooth: function (a, b, t) { var x = U.clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); },
    rand: function (a, b) { return a + Math.random() * (b - a); },
    pick: function (a) { return a[(Math.random() * a.length) | 0]; },
    hash2: function (x, y) { var h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; },
    hashStr: function (s) { var h = 2166136261 >>> 0; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; },
    rng: function (seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; },
    col: function (hex) { return new T.Color(hex); },
    tmpV: new T.Vector3(), tmpM: new T.Matrix4(), tmpQ: new T.Quaternion(), tmpE: new T.Euler()
  };

  /* ---------------- 2. 程序化画布贴图 ---------------- */
  var texCache = {};
  function canvas(size) { var c = document.createElement('canvas'); c.width = c.height = size; return c; }
  function toTex(c, repeat) {
    var t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.anisotropy = 4;
    if (repeat) t.repeat.set(repeat, repeat);
    return t;
  }
  CT.TEX = {
    ground: function () {
      if (texCache.ground) return texCache.ground;
      var S = 1024, c = canvas(S), x = c.getContext('2d'), rnd = U.rng(7331);
      x.fillStyle = '#9C6437'; x.fillRect(0, 0, S, S);
      // 大色块（低透明，保持整体暖土）
      var patches = ['#C4814A', '#7F8C4C', '#3F5A5A', '#4E7566', '#D8A25E', '#7E4C30'];
      for (var p = 0; p < 40; p++) {
        x.globalAlpha = 0.05 + rnd() * 0.08;
        x.fillStyle = patches[(rnd() * patches.length) | 0];
        var px = rnd() * S, py = rnd() * S, pr = 60 + rnd() * 190;
        x.beginPath();
        for (var k = 0; k < 9; k++) {
          var a = k / 9 * Math.PI * 2, rr = pr * (0.5 + rnd() * 0.8);
          var vx = px + Math.cos(a) * rr, vy = py + Math.sin(a) * rr;
          k ? x.lineTo(vx, vy) : x.moveTo(vx, vy);
        }
        x.closePath(); x.fill();
      }
      x.globalAlpha = 1;
      // 长笔触（手绘感来源 1：宽笔）
      var strokeCols = ['#C9884E', '#8E5A33', '#6F7C3E', '#B9743F', '#D9A868', '#5F6B44', '#3E5157'];
      for (var i = 0; i < 300; i++) {
        x.globalAlpha = 0.10 + rnd() * 0.22;
        x.strokeStyle = strokeCols[(rnd() * strokeCols.length) | 0];
        x.lineWidth = 8 + rnd() * 46;
        x.lineCap = 'round';
        var sx = rnd() * S, sy = rnd() * S, len = 50 + rnd() * 260, ang = rnd() * Math.PI * 2;
        x.beginPath(); x.moveTo(sx, sy);
        x.quadraticCurveTo(sx + Math.cos(ang) * len * 0.5 + (rnd() - .5) * 70,
          sy + Math.sin(ang) * len * 0.5 + (rnd() - .5) * 70,
          sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
        x.stroke();
      }
      // 细笔触（手绘感来源 2：干笔）
      for (var f = 0; f < 420; f++) {
        x.globalAlpha = 0.08 + rnd() * 0.2;
        x.strokeStyle = rnd() < 0.5 ? '#6B4A32' : '#D2A064';
        x.lineWidth = 1 + rnd() * 4;
        x.lineCap = 'round';
        var fx0 = rnd() * S, fy0 = rnd() * S, fl = 16 + rnd() * 90, fa = rnd() * Math.PI * 2;
        x.beginPath(); x.moveTo(fx0, fy0);
        x.quadraticCurveTo(fx0 + Math.cos(fa) * fl * 0.6, fy0 + Math.sin(fa) * fl * 0.6,
          fx0 + Math.cos(fa) * fl, fy0 + Math.sin(fa) * fl);
        x.stroke();
      }
      // 冷影水洼
      for (var d = 0; d < 28; d++) {
        x.globalAlpha = 0.06 + rnd() * 0.08;
        x.fillStyle = '#3E5157';
        var dx = rnd() * S, dy = rnd() * S, dr = 26 + rnd() * 80;
        x.beginPath(); x.ellipse(dx, dy, dr, dr * (0.4 + rnd() * 0.4), rnd() * 3, 0, 7); x.fill();
      }
      // 冷色颜料摊（暖冷对撞）
      for (var cp = 0; cp < 34; cp++) {
        x.globalAlpha = 0.07 + rnd() * 0.10;
        x.fillStyle = rnd() < 0.5 ? '#3F6A6A' : '#4E7566';
        var cpx = rnd() * S, cpy = rnd() * S, cpr = 24 + rnd() * 70;
        x.beginPath(); x.ellipse(cpx, cpy, cpr, cpr * (0.35 + rnd() * 0.4), rnd() * 3, 0, 7); x.fill();
      }
      // 墨池（环境叙事：被打翻的墨）
      for (var m = 0; m < 18; m++) {
        x.globalAlpha = 0.14 + rnd() * 0.12;
        x.fillStyle = rnd() < 0.5 ? '#2E2439' : '#473A57';
        var mx = rnd() * S, my = rnd() * S, mr = 14 + rnd() * 40;
        x.beginPath();
        for (var n = 0; n < 8; n++) {
          var an = n / 8 * 6.283, ar = mr * (0.55 + rnd() * 0.85);
          var qx = mx + Math.cos(an) * ar, qy = my + Math.sin(an) * ar * 0.75;
          n ? x.lineTo(qx, qy) : x.moveTo(qx, qy);
        }
        x.closePath(); x.fill();
      }
      // 草籽 / 金粉
      for (var sp = 0; sp < 1100; sp++) {
        x.globalAlpha = 0.07 + rnd() * 0.16;
        x.fillStyle = rnd() < 0.4 ? PAL.gold : (rnd() < 0.5 ? PAL.ink : PAL.paper);
        var sxx = rnd() * S, syy = rnd() * S, sr = 0.6 + rnd() * 2.4;
        x.beginPath(); x.arc(sxx, syy, sr, 0, 7); x.fill();
      }
      // 少量野花点（暖色）
      for (var fl2 = 0; fl2 < 90; fl2++) {
        x.globalAlpha = 0.25 + rnd() * 0.4;
        x.fillStyle = rnd() < 0.6 ? '#E8BE74' : '#C85C6A';
        x.beginPath(); x.arc(rnd() * S, rnd() * S, 1.4 + rnd() * 2.2, 0, 7); x.fill();
      }
      x.globalAlpha = 1;
      texCache.ground = toTex(c, 8);
      texCache.ground.minFilter = T.LinearMipmapLinearFilter;
      return texCache.ground;
    },
    blob: function () {
      if (texCache.blob) return texCache.blob;
      var c = canvas(128), x = c.getContext('2d');
      var g = x.createRadialGradient(64, 64, 4, 64, 64, 62);
      g.addColorStop(0, 'rgba(16,14,20,0.62)');
      g.addColorStop(0.55, 'rgba(16,14,20,0.4)');
      g.addColorStop(1, 'rgba(16,14,20,0)');
      x.fillStyle = g; x.fillRect(0, 0, 128, 128);
      texCache.blob = toTex(c); texCache.blob.wrapS = texCache.blob.wrapT = T.ClampToEdgeWrapping;
      return texCache.blob;
    },
    splat: function () {
      if (texCache.splat) return texCache.splat;
      var S = 128, c = canvas(S), x = c.getContext('2d'), rnd = U.rng(99);
      x.translate(S / 2, S / 2);
      x.fillStyle = '#fff';
      // 主斑 + 卫星斑
      for (var i = 0; i < 9; i++) {
        var a = rnd() * 6.283, r = i === 0 ? 0 : 12 + rnd() * 30;
        var rr = i === 0 ? 26 : 5 + rnd() * 15;
        x.globalAlpha = i === 0 ? 0.95 : 0.55 + rnd() * 0.4;
        x.beginPath(); x.arc(Math.cos(a) * r, Math.sin(a) * r, rr, 0, 7); x.fill();
      }
      // 飞溅笔锋
      for (var k = 0; k < 14; k++) {
        var ang = rnd() * 6.283, len = 22 + rnd() * 34;
        x.globalAlpha = 0.25 + rnd() * 0.45;
        x.strokeStyle = '#fff'; x.lineWidth = 1.5 + rnd() * 4; x.lineCap = 'round';
        x.beginPath(); x.moveTo(Math.cos(ang) * 22, Math.sin(ang) * 22);
        x.lineTo(Math.cos(ang) * (22 + len), Math.sin(ang) * (22 + len) * 0.9); x.stroke();
      }
      x.globalAlpha = 1;
      texCache.splat = toTex(c); texCache.splat.wrapS = texCache.splat.wrapT = T.ClampToEdgeWrapping;
      return texCache.splat;
    },
    spark: function () {
      if (texCache.spark) return texCache.spark;
      var c = canvas(64), x = c.getContext('2d');
      var g = x.createRadialGradient(32, 32, 0, 32, 32, 30);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.35, 'rgba(255,236,205,0.85)');
      g.addColorStop(1, 'rgba(255,210,160,0)');
      x.fillStyle = g; x.fillRect(0, 0, 64, 64);
      texCache.spark = toTex(c); texCache.spark.wrapS = texCache.spark.wrapT = T.ClampToEdgeWrapping;
      return texCache.spark;
    },
    ring: function () {
      if (texCache.ring) return texCache.ring;
      var S = 256, c = canvas(S), x = c.getContext('2d');
      var g = x.createRadialGradient(S / 2, S / 2, S * 0.2, S / 2, S / 2, S * 0.5);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.62, 'rgba(255,255,255,0)');
      g.addColorStop(0.80, 'rgba(255,255,255,0.9)');
      g.addColorStop(0.88, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, S, S);
      texCache.ring = toTex(c); texCache.ring.wrapS = texCache.ring.wrapT = T.ClampToEdgeWrapping;
      return texCache.ring;
    },
    arc: function () {
      if (texCache.arc) return texCache.arc;
      var S = 256, c = canvas(S), x = c.getContext('2d');
      x.translate(S / 2, S / 2);
      var r = S * 0.33, n = 200;
      x.lineCap = 'round';
      for (var i = 0; i < n; i++) {
        var t = i / n;
        var a0 = t * Math.PI * 2, a1 = (i + 2.2) / n * Math.PI * 2;
        x.globalAlpha = Math.pow(t, 2.4) * 0.55;
        x.strokeStyle = '#fff';
        x.lineWidth = 22;
        x.beginPath(); x.arc(0, 0, r, a0, a1); x.stroke();
      }
      // 笔锋头部（更亮）
      x.globalAlpha = 0.9; x.lineWidth = 12;
      x.beginPath(); x.arc(0, 0, r, Math.PI * 1.85, Math.PI * 2); x.stroke();
      texCache.arc = toTex(c); texCache.arc.wrapS = texCache.arc.wrapT = T.ClampToEdgeWrapping;
      return texCache.arc;
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
    '  float h = clamp(position.y, 0.0, 1.4);',
    '  float ph = uTime * 1.6;',
    '  #ifdef USE_INSTANCING',
    '    ph += instanceMatrix[3].x * 0.45 + instanceMatrix[3].z * 0.37;',
    '  #endif',
    '  transformed.x += sin(ph) * 0.075 * h;',
    '  transformed.z += cos(ph * 0.83) * 0.045 * h;',
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
    '  float n1 = vnoise(vW.xz * 1.35 + vW.y * 2.1);',
    '  float n2 = vnoise(vW.xz * 4.7 - vW.y * 1.3);',
    '  float warp = (n1 - 0.5) * 0.20 + (n2 - 0.5) * 0.06;',
    '  float s1 = smoothstep(0.46 + warp, 0.53 + warp, lit);',
    '  float s2 = smoothstep(0.72 + warp * 0.5, 0.78 + warp * 0.5, lit);',
    '  float shade = s1 * 0.58 + s2 * 0.42;',
    '  vec3 base = vCol;',
    '  vec3 shadow = base * uShadowCol;',
    '  vec3 litc = base * uKeyCol;',
    '  vec3 col = mix(shadow, litc, shade);',
    '  col += base * uFillCol * (0.13 + 0.12 * max(0.0, -ndl));',
    '  col += base * uAmb;',
    '  col += base * (n2 - 0.5) * 0.07;',
    '  float fres = pow(1.0 - max(dot(N, V), 0.0), 2.6);',
    '  col += uRimCol * fres * uRim * (0.45 + 0.55 * max(ndl, 0.0));',
    '  col *= 1.0 - uEdge * pow(1.0 - max(dot(N, V), 0.0), 3.0);',
    '  col += vec3(1.0, 0.86, 0.55) * vGlow * uGlow;',
    '  float d = distance(cameraPosition, vW);',
    '  float fog = smoothstep(uFogNear, uFogFar, d);',
    '  col = mix(col, uFogCol, fog * 0.92);',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  CT.mat = {
    toon: function (o) {
      o = o || {};
      var uni = Object.assign({}, shared, {
        uRim: { value: o.rim === undefined ? 0.20 : o.rim },
        uEdge: { value: o.edge === undefined ? 0.22 : o.edge },
        uGlow: { value: o.glow === undefined ? 0.55 : o.glow },
        uAmb: { value: o.amb === undefined ? 0.10 : o.amb }
      });
      var defines = {};
      if (o.sway) defines.SWAY = 1;
      return new T.ShaderMaterial({
        uniforms: uni, vertexShader: VERT, fragmentShader: FRAG, defines: defines,
        side: o.side || T.FrontSide, depthWrite: o.depthWrite !== false
      });
    },
    basic: function (o) {
      return new T.MeshBasicMaterial(Object.assign({ fog: true }, o || {}));
    },
    add: function (o) {
      return new T.MeshBasicMaterial(Object.assign({
        transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false
      }, o || {}));
    },
    shadow: function () {
      return new T.MeshBasicMaterial({
        map: CT.TEX.blob(), transparent: true, depthWrite: false,
        color: 0x1A1714, opacity: 0.9, fog: false
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

  /* ---------------- 5. 角色与敌人几何 ---------------- */
  CT.geo = {};

  CT.geo.player = function () {
    var p = [];
    // 靴（从袍下露出，压住重心）
    p.push(P(new T.BoxGeometry(0.17, 0.16, 0.28), '#3A3230', '#241E1C', -0.15, 0.08, 0.10));
    p.push(P(new T.BoxGeometry(0.17, 0.16, 0.28), '#3A3230', '#241E1C', 0.15, 0.08, 0.10));
    // 袍：下摆宽，向上收
    p.push(P(new T.ConeGeometry(0.53, 1.02, 9, 1), '#EDE2CB', '#7C6C74', 0, 0.62, 0));
    // 朱红下摆边
    p.push(P(new T.CylinderGeometry(0.525, 0.545, 0.10, 9, 1, true), PAL.verm, '#8C2A1C', 0, 0.11, 0));
    // 腰带
    p.push(P(new T.CylinderGeometry(0.365, 0.405, 0.16, 9), PAL.verm, '#7C2C1E', 0, 1.05, 0));
    // 胸
    p.push(P(new T.CylinderGeometry(0.29, 0.335, 0.48, 9), '#EDE2CB', '#A99C93', 0, 1.33, 0));
    // 肩
    p.push(P(new T.IcosahedronGeometry(0.32, 0), '#EDE2CB', '#8A7C80', 0, 1.48, 0, { scale: [1.26, 0.6, 0.92] }));
    // 背后披风（朱红剪影）
    p.push(P(new T.BoxGeometry(0.58, 0.88, 0.07), '#C0442F', '#6E2A1C', 0, 1.08, -0.30, { rot: [0.16, 0, 0] }));
    // 手臂 + 宽袖
    p.push(P(new T.CylinderGeometry(0.085, 0.13, 0.48, 6), '#EDE2CB', '#7E7078', -0.41, 1.27, 0.06, { rot: [0, 0, 0.5] }));
    p.push(P(new T.CylinderGeometry(0.085, 0.13, 0.48, 6), '#EDE2CB', '#7E7078', 0.41, 1.27, 0.06, { rot: [0, 0, -0.5] }));
    // 手
    p.push(P(new T.IcosahedronGeometry(0.09, 0), '#E3B98F', '#A97F62', -0.53, 1.07, 0.12));
    p.push(P(new T.IcosahedronGeometry(0.09, 0), '#E3B98F', '#A97F62', 0.53, 1.07, 0.12));
    // 头 / 发 / 眼
    p.push(P(new T.IcosahedronGeometry(0.22, 1), '#E9C39C', '#A97F62', 0, 1.67, 0.01));
    p.push(P(new T.IcosahedronGeometry(0.225, 0), '#2B2520', '#161311', 0, 1.71, -0.07, { scale: [1.02, 0.9, 0.92] }));
    p.push(P(new T.IcosahedronGeometry(0.026, 0), '#231D19', '#231D19', -0.08, 1.66, 0.196));
    p.push(P(new T.IcosahedronGeometry(0.026, 0), '#231D19', '#231D19', 0.08, 1.66, 0.196));
    // 斗笠：小檐，露出脸和肩
    // 背后大笔：斜出轮廓，作为形状记忆点
    p.push(P(new T.CylinderGeometry(0.030, 0.046, 1.34, 6), PAL.verm, '#6E2A1C', 0.30, 1.58, -0.33, { rot: [0.12, 0, -0.55] }));
    p.push(P(new T.ConeGeometry(0.095, 0.40, 7, 1), PAL.gold, PAL.verm, 0.64, 2.08, -0.38, { rot: [0.12, 0, -1.95], glow: 0.2 }));
    p.push(P(new T.CylinderGeometry(0.038, 0.038, 0.10, 6), PAL.gold, '#8A5A32', 0.54, 1.90, -0.35, { rot: [0.12, 0, -0.55] }));
    return merge(p);
  };

  CT.geo.blade = function () {
    var shape = new T.Shape();
    shape.moveTo(0, -0.58);
    shape.quadraticCurveTo(0.22, -0.18, 0.10, 0.62);
    shape.quadraticCurveTo(-0.02, 0.18, -0.10, -0.52);
    shape.quadraticCurveTo(-0.05, -0.58, 0, -0.58);
    var g = new T.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: false, curveSegments: 7 });
    g.center();
    g.rotateX(-Math.PI / 2);
    // 外圈金边
    var edge = g.clone();
    var s = new T.Matrix4().makeScale(1.20, 1.0, 1.20);
    edge.applyMatrix4(s);
    var gold = part(edge, { top: PAL.gold, bottom: PAL.verm, axis: 'z', glow: 0.35 });
    g.translate(0, 0.012, 0);
    var core = part(g, { top: PAL.verm, bottom: '#F2A65A', axis: 'z', glow: 0.2 });
    return merge([gold, core]);
  };

  CT.geo.mote = function () {
    var p = [];
    p.push(P(new T.IcosahedronGeometry(0.34, 0), PAL.violet, PAL.deep, 0, 0.40, 0, { scale: [1, 0.92, 1] }));
    p.push(P(new T.ConeGeometry(0.10, 0.26, 5, 1), PAL.deep, PAL.ink, 0, 0.76, 0));
    p.push(P(new T.IcosahedronGeometry(0.055, 0), PAL.gold, PAL.gold, -0.12, 0.46, 0.28, { glow: 1.1 }));
    p.push(P(new T.IcosahedronGeometry(0.055, 0), PAL.gold, PAL.gold, 0.12, 0.46, 0.28, { glow: 1.1 }));
    return merge(p);
  };

  CT.geo.darter = function () {
    var p = [];
    p.push(P(new T.ConeGeometry(0.20, 0.98, 5, 1), PAL.magenta, PAL.deep, 0, 0.55, 0, { rot: [Math.PI / 2, 0, 0] }));
    p.push(P(new T.ConeGeometry(0.10, 0.36, 4, 1), PAL.deep, PAL.ink, 0, 0.55, -0.55, { rot: [-Math.PI / 2, 0, 0] }));
    p.push(P(new T.BoxGeometry(0.36, 0.05, 0.22), PAL.sky, PAL.abyss, 0, 0.62, -0.28, { rot: [0, 0, 0.25] }));
    p.push(P(new T.IcosahedronGeometry(0.05, 0), PAL.gold, PAL.gold, 0, 0.62, 0.44, { glow: 1.0 }));
    return merge(p);
  };

  CT.geo.brute = function () {
    var p = [];
    p.push(P(new T.DodecahedronGeometry(0.64, 0), PAL.slate, PAL.night, 0, 0.62, 0, { scale: [1.05, 0.85, 0.95] }));
    p.push(P(new T.BoxGeometry(0.46, 0.22, 0.34), PAL.moss, '#2E4A3E', 0, 1.05, -0.18, { rot: [0.2, 0, 0] }));
    p.push(P(new T.BoxGeometry(0.34, 0.18, 0.28), PAL.abyss, PAL.night, 0, 1.16, -0.30, { rot: [0.25, 0.4, 0] }));
    p.push(P(new T.IcosahedronGeometry(0.24, 0), PAL.deep, PAL.ink, 0, 0.86, 0.52));
    p.push(P(new T.IcosahedronGeometry(0.045, 0), PAL.gold, PAL.gold, -0.09, 0.92, 0.72, { glow: 1.2 }));
    p.push(P(new T.IcosahedronGeometry(0.045, 0), PAL.gold, PAL.gold, 0.09, 0.92, 0.72, { glow: 1.2 }));
    p.push(P(new T.BoxGeometry(0.26, 0.5, 0.3), PAL.slate, PAL.night, -0.66, 0.62, 0.12, { rot: [0, 0, 0.16] }));
    p.push(P(new T.BoxGeometry(0.26, 0.5, 0.3), PAL.slate, PAL.night, 0.66, 0.62, 0.12, { rot: [0, 0, -0.16] }));
    return merge(p);
  };

  CT.geo.spitter = function () {
    var p = [];
    p.push(P(new T.CylinderGeometry(0.19, 0.28, 0.9, 7), PAL.deep, PAL.ink, 0, 0.60, 0));
    p.push(P(new T.IcosahedronGeometry(0.30, 1), PAL.deep, PAL.deep, 0, 1.18, 0, { scale: [1, 1.05, 1] }));
    p.push(P(new T.IcosahedronGeometry(0.24, 0), PAL.magenta, '#5B2E42', 0, 1.22, -0.26));
    p.push(P(new T.IcosahedronGeometry(0.05, 0), PAL.gold, PAL.gold, -0.10, 1.26, 0.30, { glow: 1.3 }));
    p.push(P(new T.IcosahedronGeometry(0.05, 0), PAL.gold, PAL.gold, 0.10, 1.26, 0.30, { glow: 1.3 }));
    p.push(P(new T.ConeGeometry(0.08, 0.26, 5), PAL.magenta, PAL.deep, 0, 1.16, 0.32, { rot: [Math.PI / 2, 0, 0] }));
    return merge(p);
  };

  CT.geo.boss = function () {
    var p = [];
    // 山体躯干
    p.push(P(new T.IcosahedronGeometry(1.5, 1), PAL.deep, PAL.night, 0, 2.1, 0, { scale: [1.22, 1.0, 1.0] }));
    // 肩甲
    p.push(P(new T.BoxGeometry(1.9, 0.55, 1.3), PAL.slate, PAL.night, 0, 3.0, -0.15, { rot: [0.1, 0, 0] }));
    p.push(P(new T.ConeGeometry(0.55, 1.2, 5), PAL.deep, PAL.ink, -1.55, 3.05, 0.1, { rot: [0, 0, 0.9] }));
    p.push(P(new T.ConeGeometry(0.55, 1.2, 5), PAL.deep, PAL.ink, 1.55, 3.05, 0.1, { rot: [0, 0, -0.9] }));
    // 头
    p.push(P(new T.IcosahedronGeometry(0.80, 1), PAL.night, PAL.ink, 0, 3.95, 0.95, { scale: [1.05, 0.95, 1.0] }));
    // 金裂（面部）
    p.push(P(new T.BoxGeometry(0.07, 0.5, 0.12), PAL.gold, PAL.gold, -0.18, 4.1, 1.62, { rot: [0, 0, 0.2], glow: 0.9 }));
    p.push(P(new T.BoxGeometry(0.07, 0.34, 0.12), PAL.gold, PAL.gold, 0.22, 4.0, 1.60, { rot: [0, 0, -0.35], glow: 0.9 }));
    // 金眼
    p.push(P(new T.IcosahedronGeometry(0.20, 0), PAL.gold, PAL.sun, -0.30, 4.06, 1.60, { glow: 1.8 }));
    p.push(P(new T.IcosahedronGeometry(0.20, 0), PAL.gold, PAL.sun, 0.30, 4.06, 1.60, { glow: 1.8 }));
    // 胸核
    p.push(P(new T.IcosahedronGeometry(0.54, 1), PAL.verm, '#8C2A1C', 0, 2.6, 1.42, { glow: 1.4 }));
    // 冠
    for (var i = -1; i <= 1; i++) {
      p.push(P(new T.ConeGeometry(0.16, 0.9 - Math.abs(i) * 0.18, 5), PAL.gold, PAL.verm, i * 0.38, 4.9 - Math.abs(i) * 0.1, 0.78, { rot: [0, 0, i * -0.3], glow: 0.55 }));
    }
    // 手臂
    p.push(P(new T.CylinderGeometry(0.34, 0.46, 1.5, 6), PAL.slate, PAL.night, -1.55, 1.85, 0.55, { rot: [0.2, 0, 0.28] }));
    p.push(P(new T.CylinderGeometry(0.34, 0.46, 1.5, 6), PAL.slate, PAL.night, 1.55, 1.85, 0.55, { rot: [0.2, 0, -0.28] }));
    // 爪
    p.push(P(new T.ConeGeometry(0.24, 0.6, 4), PAL.gold, PAL.verm, -1.85, 1.05, 0.85, { rot: [1.2, 0, 0.2], glow: 0.3 }));
    p.push(P(new T.ConeGeometry(0.24, 0.6, 4), PAL.gold, PAL.verm, 1.85, 1.05, 0.85, { rot: [1.2, 0, -0.2], glow: 0.3 }));
    // 背刺
    for (var k = 0; k < 3; k++) {
      p.push(P(new T.ConeGeometry(0.22, 0.9, 4), PAL.night, PAL.ink, -0.7 + k * 0.7, 3.1, -0.95, { rot: [-0.7, 0, 0], glow: 0.1 }));
    }
    return merge(p);
  };

  CT.geo.petalGlow = function () {
    // 笔锋下方的柔光贴片
    var g = new T.CircleGeometry(0.7, 12);
    return g;
  };

  CT.geo.gem = function () {
    var g = new T.OctahedronGeometry(0.20, 0);
    g.scale(1, 1.45, 1);
    var geo = part(g, { top: PAL.sun, bottom: PAL.gold, glow: 0.45 });
    return geo;
  };

  CT.geo.heal = function () {
    var p = [];
    p.push(P(new T.IcosahedronGeometry(0.22, 1), PAL.rose, '#7E3341', 0, 0.24, 0, { glow: 0.55 }));
    p.push(P(new T.BoxGeometry(0.08, 0.26, 0.08), PAL.paper, PAL.paper, 0, 0.46, 0, { glow: 0.4 }));
    return merge(p);
  };

  CT.geo.grass = function () {
    var parts = [], i;
    for (i = 0; i < 5; i++) {
      var a = i / 5 * Math.PI * 2 + 0.4;
      var h = 0.55 + (i % 3) * 0.18;
      var g = new T.PlaneGeometry(0.10, h, 1, 2);
      g.translate(0, h / 2, 0);
      var pos = g.attributes.position;
      for (var v = 0; v < pos.count; v++) {
        var y = pos.getY(v);
        pos.setZ(v, y * y * 0.28);   // 弯叶
      }
      g.computeVertexNormals();
      parts.push(part(g, {
        top: '#A9B86A', bottom: '#55643A', axis: 'y',
        pos: [Math.cos(a) * 0.14, 0, Math.sin(a) * 0.14],
        rot: [0, -a, (i % 2 ? 1 : -1) * 0.18]
      }));
    }
    return merge(parts);
  };

  CT.geo.rock = function () {
    var g = new T.DodecahedronGeometry(0.62, 0);
    var geo = part(g, { top: PAL.abyss, bottom: PAL.night, axis: 'y' });
    // 苔藓顶
    var top = part(new T.DodecahedronGeometry(0.60, 0), { top: PAL.moss, bottom: PAL.abyss, axis: 'y' });
    top.applyMatrix4(new T.Matrix4().makeScale(1.02, 0.34, 1.02));
    top.applyMatrix4(new T.Matrix4().makeTranslation(0, 0.42, 0));
    return merge([geo, top]);
  };

  CT.geo.hat = function () {
    var p = [];
    p.push(P(new T.ConeGeometry(0.38, 0.16, 12, 1), '#CFA05D', '#6E4527', 0, 0, 0));
    p.push(P(new T.TorusGeometry(0.362, 0.022, 4, 18), PAL.gold, '#8A5A32', 0, -0.010, 0, { rot: [Math.PI / 2, 0, 0] }));
    p.push(P(new T.ConeGeometry(0.115, 0.13, 8, 1), PAL.gold, '#8A5A32', 0, 0.14, 0));
    p.push(P(new T.IcosahedronGeometry(0.035, 0), PAL.sun, PAL.verm, 0, 0.205, 0, { glow: 0.5 }));
    return merge(p);
  };

  CT.geo.stone = function () {
    var p = [];
    // 墨碑：竖向记忆点，金裂
    p.push(P(new T.CylinderGeometry(0.30, 0.52, 2.7, 5), PAL.abyss, PAL.night, 0, 1.35, 0, { rot: [0.03, 0.4, 0.03] }));
    p.push(P(new T.ConeGeometry(0.34, 0.5, 5), PAL.deep, PAL.night, 0, 2.86, 0, { rot: [0, 0.4, 0] }));
    p.push(P(new T.BoxGeometry(0.055, 1.25, 0.12), PAL.gold, PAL.gold, 0.16, 1.55, 0.36, { rot: [0, 0.2, 0.16], glow: 0.5 }));
    p.push(P(new T.BoxGeometry(0.05, 0.7, 0.1), PAL.gold, PAL.gold, -0.05, 1.2, 0.44, { rot: [0, 0.1, -0.35], glow: 0.4 }));
    p.push(P(new T.IcosahedronGeometry(0.50, 0), PAL.slate, PAL.night, 0.12, 0.22, 0.16, { scale: [1.2, 0.55, 1.0] }));
    return merge(p);
  };

  CT.geo.tree = function () {
    var p = [];
    p.push(P(new T.CylinderGeometry(0.14, 0.34, 3.5, 5), PAL.deep, PAL.ink, 0, 1.75, 0, { rot: [0.05, 0.6, 0.06] }));
    p.push(P(new T.CylinderGeometry(0.07, 0.14, 1.6, 5), PAL.night, PAL.ink, 0.62, 2.9, 0.15, { rot: [0.2, 0, -0.85] }));
    p.push(P(new T.CylinderGeometry(0.06, 0.12, 1.4, 5), PAL.night, PAL.ink, -0.55, 3.1, -0.1, { rot: [-0.2, 0, 0.95] }));
    p.push(P(new T.IcosahedronGeometry(0.85, 0), PAL.moss, '#1F3B32', 0.85, 3.65, 0.2, { scale: [1.25, 0.55, 1.1] }));
    p.push(P(new T.IcosahedronGeometry(0.7, 0), PAL.abyss, PAL.night, -0.75, 3.9, -0.1, { scale: [1.1, 0.5, 1.0] }));
    p.push(P(new T.IcosahedronGeometry(0.55, 0), PAL.moss, '#25453A', 0.1, 4.25, 0.05, { scale: [1.3, 0.5, 1.2] }));
    p.push(P(new T.IcosahedronGeometry(0.07, 0), PAL.gold, PAL.verm, 0.45, 4.05, 0.5, { glow: 0.6 }));
    return merge(p);
  };

  CT.geo.quad = function () {
    var g = new T.PlaneGeometry(1, 1);
    g.rotateX(-Math.PI / 2);
    return g;
  };

  CT.geo.plane = function () {
    return new T.PlaneGeometry(1, 1);
  };
})(window.CT);
