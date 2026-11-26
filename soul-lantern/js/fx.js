/* 彩潮 · 特效层：粒子 / 地面颜料 / 冲击环 / 雷链 / 伤害数字 / 震屏 */
'use strict';
(function (CT) {
  var T = THREE, U = CT.U;
  var Fx = CT.Fx = {
    scene: null, camera: null, canvas: null, ctx: null,
    dpr: 1, w: 1, h: 1,
    shakeAmt: 0, shakeT: 0, stop: 0,
    numbers: [], poolN: 0
  };

  /* ---------- 粒子系统 ---------- */
  function makePoints(cap, blending, tex, order) {
    var geo = new T.BufferGeometry();
    var pos = new Float32Array(cap * 3), col = new Float32Array(cap * 3);
    var size = new Float32Array(cap), alpha = new Float32Array(cap);
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
    geo.setAttribute('aSize', new T.BufferAttribute(size, 1));
    geo.setAttribute('aAlpha', new T.BufferAttribute(alpha, 1));
    geo.setDrawRange(0, 0);
    var mat = new T.ShaderMaterial({
      uniforms: { uMap: { value: tex }, uPx: { value: 800 } },
      vertexShader: [
        'attribute vec3 color; attribute float aSize; attribute float aAlpha;',
        'uniform float uPx; varying vec3 vC; varying float vA;',
        'void main(){',
        '  vC = color; vA = aAlpha;',
        '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
        '  gl_PointSize = aSize * uPx / max(-mv.z, 0.1);',
        '  gl_Position = projectionMatrix * mv;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D uMap; varying vec3 vC; varying float vA;',
        'void main(){ vec4 t = texture2D(uMap, gl_PointCoord); if (t.a * vA < 0.01) discard;',
        '  gl_FragColor = vec4(vC * t.rgb, t.a * vA); }'
      ].join('\n'),
      transparent: true, depthWrite: false, blending: blending, fog: false
    });
    var pts = new T.Points(geo, mat);
    pts.frustumCulled = false;
    pts.renderOrder = order || 5;
    return { pts: pts, geo: geo, mat: mat, cap: cap, n: 0, vel: new Float32Array(cap * 3), life: new Float32Array(cap), maxLife: new Float32Array(cap), grav: new Float32Array(cap), size0: new Float32Array(cap), size1: new Float32Array(cap), alpha0: new Float32Array(cap) };
  }

  Fx.init = function (scene, camera, canvas) {
    this.scene = scene; this.camera = camera; this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.paint = makePoints(260, T.NormalBlending, CT.TEX.spark(), 4);
    this.sparks = makePoints(160, T.AdditiveBlending, CT.TEX.spark(), 6);
    scene.add(this.paint.pts); scene.add(this.sparks.pts);
    // 地面颜料贴片
    var cap = 72;
    var q = CT.geo.plane();
    q.setAttribute('aAlpha', new T.InstancedBufferAttribute(new Float32Array(cap), 1));
    this.decals = { mesh: new T.InstancedMesh(q, CT.mat.decal(), cap), cap: cap, items: [], idx: 0 };
    this.decals.mesh.frustumCulled = false;
    this.decals.mesh.renderOrder = 2;
    this.decals.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    for (var i = 0; i < cap; i++) {
      this.decals.mesh.setColorAt(i, new T.Color(1, 1, 1));
      this.decals.items.push({ on: false, x: 0, z: 0, size: 1, life: 0, max: 1, rot: 0, color: new T.Color() });
      q.attributes.aAlpha.array[i] = 0;
    }
    scene.add(this.decals.mesh);

    // 冲击环
    this.rings = [];
    for (var r = 0; r < 12; r++) {
      var m = new T.Mesh(new T.PlaneGeometry(1, 1), CT.mat.add({
        map: CT.TEX.ring(), color: 0xffffff, opacity: 0, side: T.DoubleSide
      }));
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      m.renderOrder = 3;
      scene.add(m);
      this.rings.push({ mesh: m, on: false, t: 0, life: 1, r0: 0, r1: 1, color: new T.Color() });
    }

    // 雷链
    this.bolts = [];
    for (var b = 0; b < 6; b++) {
      var g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(new Float32Array(24 * 3), 3));
      var mat = new T.LineBasicMaterial({ color: 0xbfe9ff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, fog: false });
      var line = new T.Line(g, mat);
      line.visible = false; line.frustumCulled = false; line.renderOrder = 7;
      scene.add(line);
      this.bolts.push({ line: line, mat: mat, on: false, t: 0, life: 0.2 });
    }

    // 环境浮尘
    var N = 80;
    var dg = new T.BufferGeometry();
    var dp = new Float32Array(N * 3), dc = new Float32Array(N * 3), ds = new Float32Array(N), da = new Float32Array(N);
    this.dust = { n: N, geo: dg, base: dp, seed: new Float32Array(N * 2) };
    for (var d = 0; d < N; d++) {
      dp[d * 3] = U.rand(-18, 18); dp[d * 3 + 1] = U.rand(0.6, 9); dp[d * 3 + 2] = U.rand(-18, 18);
      dc[d * 3] = 1.0; dc[d * 3 + 1] = 0.82; dc[d * 3 + 2] = 0.55;
      ds[d] = 0.018 + Math.random() * 0.02; da[d] = 0.10 + Math.random() * 0.2;
      this.dust.seed[d * 2] = Math.random() * 6.28;
      this.dust.seed[d * 2 + 1] = 0.15 + Math.random() * 0.4;
    }
    dg.setAttribute('position', new T.BufferAttribute(dp, 3));
    dg.setAttribute('color', new T.BufferAttribute(dc, 3));
    dg.setAttribute('aSize', new T.BufferAttribute(ds, 1));
    dg.setAttribute('aAlpha', new T.BufferAttribute(da, 1));
    var dmat = new T.ShaderMaterial({
      uniforms: { uMap: { value: CT.TEX.spark() }, uPx: { value: 800 } },
      vertexShader: this.paint.mat.vertexShader,
      fragmentShader: this.paint.mat.fragmentShader,
      transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false
    });
    this.dust.mat = dmat;
    this.dust.pts = new T.Points(dg, dmat);
    this.dust.pts.frustumCulled = false;
    this.dust.pts.renderOrder = 5;
    scene.add(this.dust.pts);
  };

  Fx.setViewport = function (w, h, dpr) {
    this.w = w; this.h = h; this.dpr = dpr;
    if (this.canvas) { this.canvas.width = Math.floor(w * dpr); this.canvas.height = Math.floor(h * dpr); }
    var px = Math.min(h * dpr, 1600);
    this.paint.mat.uniforms.uPx.value = px * 1.65;
    this.sparks.mat.uniforms.uPx.value = px * 1.9;
    this.dust.mat.uniforms.uPx.value = px * 1.2;
  };

  function emit(sys, x, y, z, vx, vy, vz, color, size0, size1, life, grav, alpha) {
    if (sys.n >= sys.cap) return;
    var i = sys.n++;
    var p = sys.geo.attributes.position.array, c = sys.geo.attributes.color.array;
    p[i * 3] = x; p[i * 3 + 1] = y; p[i * 3 + 2] = z;
    c[i * 3] = color.r; c[i * 3 + 1] = color.g; c[i * 3 + 2] = color.b;
    sys.vel[i * 3] = vx; sys.vel[i * 3 + 1] = vy; sys.vel[i * 3 + 2] = vz;
    sys.life[i] = life; sys.maxLife[i] = life; sys.grav[i] = grav;
    sys.size0[i] = size0; sys.size1[i] = size1;
    sys.alpha0[i] = alpha === undefined ? 1 : alpha;
    sys.geo.attributes.aSize.array[i] = size0;
    sys.geo.attributes.aAlpha.array[i] = sys.alpha0[i];
    sys.geo.setDrawRange(0, sys.n);
  }

  function updateSys(sys, dt) {
    var p = sys.geo.attributes.position.array, a = sys.geo.attributes.aAlpha.array, s = sys.geo.attributes.aSize.array;
    for (var i = 0; i < sys.n; i++) {
      sys.life[i] -= dt;
      if (sys.life[i] <= 0) {
        var j = --sys.n;
        if (i !== j) {
          p[i * 3] = p[j * 3]; p[i * 3 + 1] = p[j * 3 + 1]; p[i * 3 + 2] = p[j * 3 + 2];
          sys.vel[i * 3] = sys.vel[j * 3]; sys.vel[i * 3 + 1] = sys.vel[j * 3 + 1]; sys.vel[i * 3 + 2] = sys.vel[j * 3 + 2];
          sys.life[i] = sys.life[j]; sys.maxLife[i] = sys.maxLife[j]; sys.grav[i] = sys.grav[j];
          sys.size0[i] = sys.size0[j]; sys.size1[i] = sys.size1[j]; sys.alpha0[i] = sys.alpha0[j];
          var c = sys.geo.attributes.color.array;
          c[i * 3] = c[j * 3]; c[i * 3 + 1] = c[j * 3 + 1]; c[i * 3 + 2] = c[j * 3 + 2];
        }
        i--; continue;
      }
      sys.vel[i * 3 + 1] -= sys.grav[i] * dt;
      p[i * 3] += sys.vel[i * 3] * dt;
      p[i * 3 + 1] += sys.vel[i * 3 + 1] * dt;
      p[i * 3 + 2] += sys.vel[i * 3 + 2] * dt;
      if (p[i * 3 + 1] < 0.03) { p[i * 3 + 1] = 0.03; sys.vel[i * 3 + 1] *= -0.24; sys.vel[i * 3] *= 0.6; sys.vel[i * 3 + 2] *= 0.6; }
      var k = 1 - sys.life[i] / sys.maxLife[i];
      a[i] = sys.alpha0[i] * (1 - k * k);
      s[i] = U.lerp(sys.size0[i], sys.size1[i], k);
    }
    sys.geo.setDrawRange(0, sys.n);
    sys.geo.attributes.position.needsUpdate = true;
    sys.geo.attributes.aAlpha.needsUpdate = true;
    sys.geo.attributes.aSize.needsUpdate = true;
    sys.geo.attributes.color.needsUpdate = true;
  }

  Fx.splat = function (x, z, color, n, power, y) {
    var col = color instanceof T.Color ? color : new T.Color(color || CT.PAL.verm);
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.283, sp = U.rand(0.4, 1) * (power || 3);
      emit(this.paint, x + U.rand(-0.2, 0.2), (y || 0.3) + U.rand(0, 0.5), z + U.rand(-0.2, 0.2),
        Math.cos(a) * sp, U.rand(1.2, 3.2) * (power || 3) * 0.4, Math.sin(a) * sp,
        col, U.rand(0.06, 0.16), U.rand(0.02, 0.06), U.rand(0.4, 0.9), 7, 0.9);
    }
  };

  Fx.spark = function (x, y, z, color, n, power) {
    var col = color instanceof T.Color ? color : new T.Color(color || CT.PAL.gold);
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.283, sp = U.rand(0.8, 1.6) * (power || 4);
      emit(this.sparks, x, y, z, Math.cos(a) * sp, U.rand(0.5, 1.6) * (power || 4) * 0.5, Math.sin(a) * sp,
        col, U.rand(0.07, 0.16), 0.01, U.rand(0.16, 0.4), 3, 1);
    }
  };

  Fx.decal = function (x, z, color, size, life) {
    var d = this.decals.items[this.decals.idx];
    this.decals.lastIdx = this.decals.idx;
    this.decals.idx = (this.decals.idx + 1) % this.decals.cap;
    d.on = true; d.x = x; d.z = z; d.size = size || 1.2; d.life = life || 5; d.max = d.life;
    d.color.set(color || CT.PAL.violet);
    d.rot = Math.random() * 6.283;
    this.decals.mesh.setColorAt(this.decals.lastIdx !== undefined ? this.decals.lastIdx : 0, d.color);
    this.decals.mesh.instanceColor.needsUpdate = true;
  };

  Fx.ring = function (x, z, color, r0, r1, life, opts) {
    opts = opts || {};
    var r = null;
    for (var i = 0; i < this.rings.length; i++) if (!this.rings[i].on) { r = this.rings[i]; break; }
    if (!r) r = this.rings[0];
    r.on = true; r.t = 0; r.life = life || 0.4; r.r0 = r0; r.r1 = r1;
    r.color.set(color || CT.PAL.gold);
    r.mesh.position.set(x, (opts.y || 0.05), z);
    r.mesh.scale.set(0.01, 0.01, 1);
    r.mesh.rotation.z = opts.rot || 0;
    r.mesh.material.opacity = opts.opacity === undefined ? 0.85 : opts.opacity;
    r.mesh.visible = true;
  };

  Fx.bolt = function (tx, tz, color, delay) {
    var b = null;
    for (var i = 0; i < this.bolts.length; i++) if (!this.bolts[i].on) { b = this.bolts[i]; break; }
    if (!b) b = this.bolts[0];
    b.on = true; b.t = -(delay || 0); b.life = 0.18; b.color = color;
    b.line.material.color.set(color || CT.PAL.sky);
    var g = b.line.geometry, arr = g.attributes.position.array;
    var sx = tx + U.rand(-0.4, 0.4), sz = tz + U.rand(-0.4, 0.4);
    for (var k = 0; k < 8; k++) {
      var t = k / 7;
      arr[k * 3] = U.lerp(sx, tx, t) + (k ? U.rand(-0.35, 0.35) : 0);
      arr[k * 3 + 1] = U.lerp(6.5, 0.4, t);
      arr[k * 3 + 2] = U.lerp(sz, tz, t) + (k ? U.rand(-0.35, 0.35) : 0);
    }
    g.attributes.position.needsUpdate = true;
    b.line.visible = true;
    b.line.material.opacity = 1;
  };

  Fx.shake = function (a) {
    this.shakeAmt = Math.min(1.4, this.shakeAmt + a);
  };
  Fx.hitstop = function (s) { this.stop = Math.max(this.stop, s); };

  Fx.damage = function (x, y, z, val, kind) {
    if (this.numbers.length > 26) this.numbers.shift();
    this.numbers.push({
      x: x + U.rand(-0.35, 0.35), y: y, z: z + U.rand(-0.2, 0.2),
      val: Math.round(val), kind: kind || 'hit', t: 0, life: kind === 'boss' ? 1.0 : 0.78
    });
  };

  Fx.update = function (dt) {
    updateSys(this.paint, dt);
    updateSys(this.sparks, dt);
    // 贴片
    var arr = this.decals.mesh.instanceMatrix.array, alpha = this.decals.mesh.geometry.attributes.aAlpha.array;
    var m = new T.Matrix4();
    for (var i = 0; i < this.decals.cap; i++) {
      var d = this.decals.items[i];
      if (d.on) {
        d.life -= dt;
        if (d.life <= 0) d.on = false;
      }
      var a = d.on ? Math.min(1, d.life / Math.min(1.4, d.max)) * 0.5 : 0;
      alpha[i] = a;
      m.compose(
        new T.Vector3(d.on ? d.x : 0, 0.015, d.on ? d.z : 0),
        new T.Quaternion().setFromEuler(new T.Euler(-Math.PI / 2, 0, d.rot || 0)),
        new T.Vector3(d.size, d.size, 1)
      );
      m.toArray(arr, i * 16);
    }
    this.decals.mesh.instanceMatrix.needsUpdate = true;
    this.decals.mesh.geometry.attributes.aAlpha.needsUpdate = true;
    // 环
    for (var r = 0; r < this.rings.length; r++) {
      var rr = this.rings[r];
      if (!rr.on) continue;
      rr.t += dt;
      var k = Math.min(1, rr.t / rr.life);
      var rad = U.lerp(rr.r0, rr.r1, 1 - Math.pow(1 - k, 2.2));
      rr.mesh.scale.set(rad * 2, rad * 2, 1);
      rr.mesh.material.opacity = (1 - k) * 0.85;
      rr.mesh.material.color.copy(rr.color);
      if (k >= 1) { rr.on = false; rr.mesh.visible = false; }
    }
    // 雷
    for (var b = 0; b < this.bolts.length; b++) {
      var bb = this.bolts[b];
      if (!bb.on) continue;
      bb.t += dt;
      if (bb.t < 0) { bb.mat.opacity = 0; continue; }
      bb.mat.opacity = Math.max(0, 1 - bb.t / bb.life);
      if (bb.t > bb.life) { bb.on = false; bb.line.visible = false; }
    }
    // 浮尘
    var dp = this.dust.geo.attributes.position.array;
    var t = performance.now() / 1000;
    for (var d2 = 0; d2 < this.dust.n; d2++) {
      var ph = this.dust.seed[d2 * 2], sp = this.dust.seed[d2 * 2 + 1];
      dp[d2 * 3] += Math.sin(t * sp + ph) * dt * 0.25 + dt * 0.10;
      dp[d2 * 3 + 1] += Math.cos(t * sp * 0.7 + ph) * dt * 0.12;
      dp[d2 * 3 + 2] += Math.cos(t * sp + ph * 1.3) * dt * 0.22;
      if (dp[d2 * 3] > 20) dp[d2 * 3] = -20;
      if (dp[d2 * 3 + 1] > 10) dp[d2 * 3 + 1] = 0.5;
      if (dp[d2 * 3 + 2] > 20) dp[d2 * 3 + 2] = -20;
    }
    this.dust.geo.attributes.position.needsUpdate = true;
    // 震屏衰减
    this.shakeAmt *= Math.pow(0.0025, dt);
    if (this.shakeAmt < 0.002) this.shakeAmt = 0;
  };

  Fx.setDustCenter = function (x, z) {
    this.dust.pts.position.set(x, 0, z);
  };

  /* ---------- 2D overlay：伤害数字 ---------- */
  Fx.drawOverlay = function (camera, dt) {
    var ctx = this.ctx;
    if (!ctx) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    var v = new T.Vector3();
    for (var i = 0; i < this.numbers.length; i++) {
      var n = this.numbers[i];
      n.t += dt || 0.016;
      if (n.t > n.life) { this.numbers.splice(i, 1); i--; continue; }
      var k = n.t / n.life;
      v.set(n.x, n.y + k * 0.9, n.z).project(camera);
      if (v.z > 1) continue;
      var x = (v.x * 0.5 + 0.5) * this.w;
      var y = (-v.y * 0.5 + 0.5) * this.h;
      var pop = k < 0.12 ? 1.35 - k * 3 : 1;
      var alpha = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1;
      var size = (n.kind === 'boss' ? 26 : n.kind === 'crit' ? 24 : n.kind === 'hurt' ? 22 : 18) * pop;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.font = '700 ' + size.toFixed(1) + 'px "Songti SC","STSong",serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 3.4; ctx.strokeStyle = 'rgba(26,23,20,0.9)';
      ctx.strokeText(n.val, x, y);
      ctx.fillStyle = n.kind === 'crit' ? '#FFC24D' : n.kind === 'hurt' ? '#FF8A7A' : '#FFEFD2';
      ctx.fillText(n.val, x, y);
    }
    ctx.globalAlpha = 1;
  };

  Fx.clearNumbers = function () { this.numbers.length = 0; };

  Fx.reset = function () {
    this.paint.n = 0; this.sparks.n = 0;
    this.paint.geo.setDrawRange(0, 0); this.sparks.geo.setDrawRange(0, 0);
    for (var i = 0; i < this.decals.cap; i++) this.decals.items[i].on = false;
    this.decals.mesh.geometry.attributes.aAlpha.array.fill(0);
    this.numbers.length = 0;
    this.shakeAmt = 0; this.stop = 0;
  };
})(window.CT);
