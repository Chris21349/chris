/* ══════════════════════════════════════════════════════════
   镜刃 MIRROR EDGE — skeleton.js
   程序化骨骼动画 + 角色渲染（无一张贴图）
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const MB = window.MB;
  const U = MB.U;
  const TAU = U.TAU;
  const D = Math.PI / 180;

  const KEYS = ['torso', 'head', 'aBU', 'aBF', 'aFU', 'aFF', 'tB', 'sB', 'tF', 'sF', 'wpn', 'hipY', 'rootX', 'chest'];
  const BASE = {
    torso: -88, head: -86,
    aBU: 102, aBF: 74, aFU: 80, aFF: 34,
    tB: 96, sB: 99, tF: 85, sF: 89,
    wpn: 55, hipY: 0, rootX: 0, chest: 0,
  };
  const L = { torso: 32, neck: 6.4, head: 8.4, upper: 18.5, fore: 17.5, thigh: 27, shin: 25, foot: 10, shoulder: 3.2, hip: 3 };

  const S = (MB.Skeleton = {});
  S.KEYS = KEYS;
  S.BASE = BASE;

  function cloneP(p) { const o = {}; for (const k of KEYS) o[k] = p[k]; return o; }
  S.clone = cloneP;
  function lerpP(a, b, t, out) {
    out = out || {};
    for (const k of KEYS) out[k] = a[k] + (b[k] - a[k]) * t;
    return out;
  }
  S.lerpPose = lerpP;
  function mix(p, part, w) {
    for (const k in part) p[k] = p[k] + (part[k] - p[k]) * w;
    return p;
  }

  /* 关键帧动画求值：keys = [{t:0..1, p:{partial}, e:'outQuint'}] */
  const CACHE = new WeakMap();
  function buildPoses(keys, base) {
    let arr = CACHE.get(keys);
    if (arr) return arr;
    arr = [];
    let prev = cloneP(base);
    for (const k of keys) {
      const p = cloneP(prev);
      for (const kk in k.p) p[kk] = k.p[kk];
      prev = p; arr.push(p);
    }
    CACHE.set(keys, arr);
    return arr;
  }
  function evalAnim(keys, prog, base, out) {
    out = out || {};
    const poses = buildPoses(keys, base);
    let i = 0;
    while (i < poses.length - 1 && prog > keys[i + 1].t) i++;
    const from = poses[i], to = poses[Math.min(poses.length - 1, i + 1)];
    if (from === to) return Object.assign(out, from);
    const span = Math.max(1e-4, keys[i + 1].t - keys[i].t);
    let t = U.clamp((prog - keys[i].t) / span, 0, 1);
    t = (U.ease[keys[i + 1].e] || U.ease.inOutCubic)(t);
    return lerpP(from, to, t, out);
  }
  S.evalAnim = evalAnim;

  /* ───────── 静态姿势 ───────── */
  const P = (over) => Object.assign(cloneP(BASE), over);
  S.POSES = {
    guard: P({ torso: -80, head: -78, aFU: -8, aFF: -50, aBU: -22, aBF: -30, tF: 80, sF: 84, tB: 100, sB: 100, wpn: -86, hipY: 3 }),
    guardHit: P({ torso: -72, head: -70, aFU: 4, aFF: -34, aBU: -12, aBF: -20, tF: 78, sF: 80, tB: 106, sB: 104, wpn: -70, hipY: 6, rootX: -4 }),
    parry: P({ torso: -96, head: -100, aFU: -62, aFF: -96, aBU: -40, aBF: -70, tF: 78, sF: 76, tB: 104, sB: 108, wpn: -120, hipY: 0, rootX: 2 }),
    perfect: P({ torso: -100, head: -106, aFU: -96, aFF: -110, aBU: -30, aBF: -20, tF: 72, sF: 70, tB: 110, sB: 112, wpn: -155, hipY: -2, rootX: -2 }),
    hurt: P({ torso: -68, head: -52, aFU: 118, aFF: 90, aBU: 128, aBF: 100, tF: 78, sF: 92, tB: 104, sB: 88, wpn: 120, hipY: 4, rootX: -6 }),
    stagger: P({ torso: -56, head: -40, aFU: 100, aFF: 84, aBU: 112, aBF: 96, tF: 52, sF: 130, tB: 118, sB: 128, wpn: 140, hipY: 22, rootX: -3 }),
    dead: P({ torso: -18, head: -4, aFU: 150, aFF: 140, aBU: 160, aBF: 150, tF: 8, sF: 176, tB: 172, sB: 178, wpn: 168, hipY: 40, rootX: 0 }),
    rise: P({ torso: -92, head: -92, aFU: 86, aFF: 60, aBU: 96, aBF: 66, tF: 82, sF: 86, tB: 100, sB: 100, wpn: 96 }),
    castUp: P({ torso: -96, head: -100, aFU: -84, aFF: -96, aBU: -20, aBF: 20, tF: 80, sF: 82, tB: 102, sB: 104, wpn: -95, hipY: -2 }),
    castFwd: P({ torso: -74, head: -78, aFU: -4, aFF: 4, aBU: 50, aBF: 60, tF: 62, sF: 96, tB: 118, sB: 106, wpn: 6, hipY: 6, rootX: 2 }),
    castSlam: P({ torso: -52, head: -60, aFU: 62, aFF: 40, aBU: 70, aBF: 52, tF: 50, sF: 118, tB: 120, sB: 122, wpn: 92, hipY: 20 }),
    airUp: P({ torso: -86, head: -90, aFU: -40, aFF: -70, aBU: 40, aBF: 30, tF: 62, sF: 96, tB: 104, sB: 126, wpn: -60 }),
    airDown: P({ torso: -92, head: -96, aFU: 60, aFF: 40, aBU: 120, aBF: 100, tF: 112, sF: 120, tB: 78, sB: 70, wpn: 84 }),
    bound: P({ torso: -93, head: -98, aFU: 84, aFF: 62, aBU: 92, aBF: 70, tF: 84, sF: 88, tB: 96, sB: 98, wpn: 104, hipY: 3 }),
    taunt: P({ torso: -94, head: -92, aFU: -30, aFF: -20, aBU: 110, aBF: 96, tF: 88, sF: 92, tB: 96, sB: 98, wpn: -40 }),
  };

  /* ───────── 求解骨骼 ───────── */
  const dir = (a) => ({ x: Math.cos(a * D), y: Math.sin(a * D) });
  function solve(p) {
    const hipH = 56 - p.hipY;
    const pelvis = { x: p.rootX, y: -hipH };
    const td = dir(p.torso);
    const chest = { x: pelvis.x + td.x * (L.torso + p.chest), y: pelvis.y + td.y * (L.torso + p.chest) };
    const neck = { x: chest.x + td.x * L.neck, y: chest.y + td.y * L.neck };
    const hd = dir(p.head);
    const headC = { x: neck.x + hd.x * (L.head * 1.05), y: neck.y + hd.y * (L.head * 1.05) };
    const sF = { x: chest.x + 2.6 + td.x * -1, y: chest.y + 1.2 };
    const sB = { x: chest.x - 2.6 + td.x * -1, y: chest.y - 1.6 };
    const hF = { x: pelvis.x + 2.6, y: pelvis.y + 1 };
    const hB = { x: pelvis.x - 2.6, y: pelvis.y - 1 };
    const u = (o, a) => { const d = dir(a); return { x: o.x + d.x * L.upper, y: o.y + d.y * L.upper }; };
    const f = (o, a) => { const d = dir(a); return { x: o.x + d.x * L.fore, y: o.y + d.y * L.fore }; };
    const th = (o, a) => { const d = dir(a); return { x: o.x + d.x * L.thigh, y: o.y + d.y * L.thigh }; };
    const sh = (o, a) => { const d = dir(a); return { x: o.x + d.x * L.shin, y: o.y + d.y * L.shin }; };
    const eB = u(sB, p.aBU), handB = f(eB, p.aBF);
    const eF = u(sF, p.aFU), handF = f(eF, p.aFF);
    const kB = th(hB, p.tB), aB = sh(kB, p.sB);
    const kF = th(hF, p.tF), aF = sh(kF, p.sF);
    return { pelvis, chest, neck, head: headC, sF, sB, hF, hB, eF, hdF: handF, eB, hdB: handB, kF, fF: aF, kB, fB: aB, torsoDir: td, headDir: hd, hipH };
  }
  S.solve = solve;

  /* ───────── 布片（披风 / 发丝） ───────── */
  function clothInit(n, len) {
    const pts = [];
    for (let i = 0; i <= n; i++) pts.push({ x: 0, y: i * len, px: 0, py: i * len, len });
    return pts;
  }
  function clothUpdate(c, ax, ay, dt, opt) {
    if (!c) return;
    const seg = c[0].len;
    // 积分
    for (let i = 1; i < c.length; i++) {
      const p = c[i];
      const vx = (p.x - p.px) * (opt.drag || 0.9);
      const vy = (p.y - p.py) * (opt.drag || 0.9);
      p.px = p.x; p.py = p.y;
      p.x += vx + (opt.wind || 0) * dt * dt + U.rand(6, -6) * dt * (opt.jit || 0);
      p.y += vy + (opt.grav || 900) * dt * dt;
    }
    c[0].x = ax; c[0].y = ay; c[0].px = ax; c[0].py = ay;
    for (let it = 0; it < 6; it++) {
      for (let i = 1; i < c.length; i++) {
        const a = c[i - 1], b = c[i];
        let dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1;
        const diff = (d - b.len) / d;
        const stiff = i === 1 ? 0.9 : 0.55;
        b.x -= dx * diff * stiff; b.y -= dy * diff * stiff;
        if (i === 1) { a.x += dx * diff * (1 - stiff); a.y += dy * diff * (1 - stiff); }
      }
    }
  }
  S.clothInit = clothInit;
  S.clothUpdate = clothUpdate;

  /* ───────── 每帧：pose + 求解 + 布料 ───────── */
  S.update = function (f, dt) {
    const t = f.animT;
    let p = f.pose || cloneP(BASE);
    const st = f.state;
    if (st === 'idle') {
      p = cloneP(BASE);
      const br = Math.sin(t * 2.1);
      p.torso += br * 1.4;
      p.head += Math.sin(t * 1.7 + 1) * 1.8;
      p.aFU += br * 2.2; p.aFF += br * 2.8;
      p.aBU -= br * 1.8; p.aBF -= br * 2.2;
      p.hipY += br * 0.7;
      p.wpn += Math.sin(t * 1.3) * 2.2;
      p.tF += br * 0.5; p.tB -= br * 0.5;
    } else if (st === 'run') {
      const spd = Math.abs(f.vx);
      const ph = f.runPhase;
      const s = Math.sin(ph), c = Math.cos(ph);
      p = cloneP(BASE);
      p.torso = -80 + Math.abs(s) * 2;
      p.head = -84;
      p.tF = 90 + s * (18 + spd * 0.035);
      p.sF = p.tF + 14 + Math.max(0, -s) * (30 + spd * 0.05);
      p.tB = 90 - s * (18 + spd * 0.035);
      p.sB = p.tB + 14 + Math.max(0, s) * (30 + spd * 0.05);
      p.aFU = 78 - s * 26 - Math.min(30, spd * 0.04);
      p.aFF = p.aFU - 22;
      p.aBU = 78 + s * 26;
      p.aBF = p.aBU - 26;
      p.hipY = Math.abs(c) * 2.2 + Math.min(4, spd * 0.006);
      p.wpn = 62 + s * 8;
    } else if (st === 'dash') {
      p = cloneP(BASE);
      p.torso = -60; p.head = -70;
      p.tF = 54; p.sF = 66; p.tB = 122; p.sB = 132;
      p.aFU = 150; p.aFF = 168; p.aBU = 158; p.aBF = 176;
      p.hipY = 8; p.wpn = 178;
    } else if (st === 'air') {
      const vy = f.vy;
      p = cloneP(vy > 0 ? S.POSES.airDown : S.POSES.airUp);
      p.torso += Math.sin(t * 3) * 1.2;
    } else if (st === 'attack' || st === 'skill' || st === 'ult') {
      const d = f.act;
      if (d && d.anim) {
        const keys = d.anim;
        const prog = U.clamp(f.actT / (d.total || 0.5), 0, 1);
        p = evalAnim(keys, prog, BASE);
      }
    } else if (st === 'guard') {
      p = cloneP(S.POSES.guard);
      p.torso += Math.sin(t * 5) * 0.6;
    } else if (S.POSES[st]) {
      p = cloneP(S.POSES[st]);
    }
    // 受击抖动
    if (f.shakeT > 0) {
      p.torso += Math.sin(f.shakeT * 90) * 4;
      p.head += Math.sin(f.shakeT * 80) * 6;
    }
    f.pose = p;
    const sk = (f.skel = solve(p));
    f.poseSnap = cloneP(p);

    // 披风
    if (f.cape) {
      const ax = sk.chest.x - sk.torsoDir.x * 1.5, ay = sk.chest.y - sk.torsoDir.y * 1.5;
      const wind = -620 - Math.abs(f.vx) * 2.2 - f.vy * 1.4;
      clothUpdate(f.cape, ax, ay, dt, { wind, grav: 900, drag: 0.965, jit: 1.6 });
    }
    if (f.hair) {
      const ax = sk.head.x - 5, ay = sk.head.y - 5;
      clothUpdate(f.hair, ax, ay, dt * 1.1, { wind: -560 - Math.abs(f.vx) * 2.4, grav: 420, drag: 0.94, jit: 2.4 });
    }
    if (f.coat) {
      clothUpdate(f.coat, sk.pelvis.x - 2, sk.pelvis.y + 1, dt, { wind: -420 - Math.abs(f.vx) * 1.8, grav: 980, drag: 0.955, jit: 1.2 });
    }
    // 刀光轨迹
    if (f.trail) {
      if (f.trailOn) {
        const w = weaponPts(f, sk, p);
        f.trail.unshift({ x: w.tip.x, y: w.tip.y, a: 0 });
        if (f.trail.length > 10) f.trail.pop();
      } else if (f.trail.length) {
        f.trail.pop();
        if (f.trail.length) f.trail.pop();
      }
      for (const tp of f.trail) tp.a += dt;
    }
  };

  function weaponPts(f, sk, p) {
    const hand = sk.hdF;
    const d = dir(p.wpn);
    const len = (f.char.weaponLen || 60) * (f.char.weaponScale || 1);
    const base = { x: hand.x + d.x * 5, y: hand.y + d.y * 5 };
    const tip = { x: hand.x + d.x * (5 + len), y: hand.y + d.y * (5 + len) };
    return { base, tip, hand, d, len };
  }
  S.weaponPts = weaponPts;

  /* ───────── 绘制工具 ───────── */
  function capsule(ctx, x0, y0, x1, y1, w, body, rim, glow, alpha) {
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.1 * alpha;
    ctx.strokeStyle = glow; ctx.lineWidth = w + 9;
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.72 * alpha;
    ctx.strokeStyle = rim; ctx.lineWidth = w + 1.9;
    ctx.stroke();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = body; ctx.lineWidth = w;
    ctx.stroke();
  }

  function poly(ctx, pts, fill, rim, alpha, lw) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    if (rim) { ctx.globalAlpha = alpha * 0.85; ctx.strokeStyle = rim; ctx.lineWidth = lw || 1.6; ctx.stroke(); }
    if (fill) { ctx.globalAlpha = alpha; ctx.fillStyle = fill; ctx.fill(); }
  }

  function ribbon(ctx, pts, w0, w1, color, alpha) {
    if (pts.length < 3) return;
    const left = [], right = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      dx /= d; dy /= d;
      const k = i / (pts.length - 1);
      const w = U.lerp(w0, w1, k);
      left.push({ x: pts[i].x - dy * w, y: pts[i].y + dx * w });
      right.push({ x: pts[i].x + dy * w, y: pts[i].y - dx * w });
    }
    ctx.beginPath();
    ctx.moveTo(left[0].x, left[0].y);
    for (let i = 1; i < left.length; i++) ctx.lineTo(left[i].x, left[i].y);
    for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.fill();
  }

  /* ───────── 主绘制 ───────── */
  S.draw = function (ctx, f, ghost) {
    const th = f.theme;
    const sk = f.skel;
    if (!sk) return;
    const p = f.pose;
    const alpha = f.alpha == null ? 1 : f.alpha;
    const BW = f.char.bulk || 1;
    ctx.save();
    ctx.translate(f.x, -f.y);
    ctx.scale(f.facing * f.scale, f.scale);

    const body = ghost ? ghost : th.body;
    const rim = ghost ? ghost : th.rim;
    const glow = ghost ? ghost : th.glow;
    const dark = ghost ? ghost : th.dark;

    // 披风
    if (f.cape && f.cape.length > 2) {
      ctx.globalCompositeOperation = ghost ? 'lighter' : 'source-over';
      const pts = f.cape.map((c) => ({ x: c.x, y: c.y }));
      ribbon(ctx, pts, 11, 2, ghost ? ghost : th.cape, alpha * (ghost ? 0.4 : 0.9));
      ctx.globalAlpha = alpha * 0.5;
      ribbon(ctx, pts, 1.4, 0.4, ghost ? ghost : th.rim, alpha * (ghost ? 0.3 : 0.5));
      ctx.globalCompositeOperation = 'source-over';
    }
    // 衣摆
    if (f.coat && f.coat.length > 2) {
      const pts = f.coat.map((c) => ({ x: c.x, y: c.y }));
      ribbon(ctx, pts, 9, 1.5, ghost ? ghost : th.dark, alpha * (ghost ? 0.4 : 0.85));
      ctx.globalAlpha = alpha * 0.35;
      ribbon(ctx, pts, 1.2, 0.3, ghost ? ghost : th.rim, alpha * 0.4);
    }
    // 发
    if (f.hair && f.hair.length > 2) {
      const pts = f.hair.map((c) => ({ x: c.x, y: c.y }));
      ribbon(ctx, pts, 4.2, 0.6, ghost ? ghost : (th.hair || th.rim), alpha * 0.9);
    }

    // 后侧腿 / 后臂
    capsule(ctx, sk.hB.x, sk.hB.y, sk.kB.x, sk.kB.y, 9 * BW, dark, rim, glow, alpha * 0.9);
    capsule(ctx, sk.kB.x, sk.kB.y, sk.fB.x, sk.fB.y, 7.4 * BW, dark, rim, glow, alpha * 0.9);
    foot(ctx, sk.fB, p, dark, rim, alpha * 0.8);
    capsule(ctx, sk.sB.x, sk.sB.y, sk.eB.x, sk.eB.y, 7.6 * BW, dark, rim, glow, alpha * 0.9);
    capsule(ctx, sk.eB.x, sk.eB.y, sk.hdB.x, sk.hdB.y, 6.2 * BW, dark, rim, glow, alpha * 0.9);

    // 战裙（袴）
    if (!ghost) {
      const td0 = sk.torsoDir;
      const pp0 = { x: -td0.y, y: td0.x };
      const px0 = sk.pelvis.x, py0 = sk.pelvis.y;
      const sway = Math.sin((f.animT || 0) * 3.1) * 2 + U.clamp(f.vx * 0.02, -7, 7);
      const hem = 24 + Math.sin((f.animT || 0) * 2.3) * 1.2;
      const p1 = { x: px0 - pp0.x * 11, y: py0 - pp0.y * 11 };
      const p2 = { x: px0 + pp0.x * 11, y: py0 + pp0.y * 11 };
      const p3 = { x: px0 + pp0.x * 13.5 * BW - sway, y: py0 + hem };
      const p4 = { x: px0 - pp0.x * 13.5 * BW - sway * 1.4, y: py0 + hem * 0.94 };
      const gsk = ctx.createLinearGradient(px0, py0, px0, py0 + hem);
      gsk.addColorStop(0, th.bodyLight || '#16232c');
      gsk.addColorStop(1, '#05080c');
      poly(ctx, [p1, p2, p3, { x: (p3.x + p4.x) / 2, y: py0 + hem * 1.06 }, p4], gsk, th.rim, alpha * 0.95, 1.3);
      ctx.globalAlpha = alpha * 0.5;
      ctx.strokeStyle = th.rim;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo((p3.x + p4.x) / 2, py0 + 6);
      ctx.lineTo((p3.x + p4.x) / 2, py0 + hem * 1.02);
      ctx.stroke();
      ctx.globalAlpha = alpha;
    }

    // 躯干
    const td = sk.torsoDir;
    const perp = { x: -td.y, y: td.x };
    const P0 = sk.pelvis, C = sk.chest;
    const lerpP2 = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    const wl = lerpP2(P0, C, 0.4), rl = lerpP2(P0, C, 0.78);
    const hipL = { x: P0.x + perp.x * 11 * BW, y: P0.y + perp.y * 11 * BW };
    const hipR = { x: P0.x - perp.x * 11 * BW, y: P0.y - perp.y * 11 * BW };
    const waistL = { x: wl.x + perp.x * 7.8 * BW, y: wl.y + perp.y * 7.8 * BW };
    const waistR = { x: wl.x - perp.x * 7.8 * BW, y: wl.y - perp.y * 7.8 * BW };
    const ribL = { x: rl.x + perp.x * 12.8 * BW, y: rl.y + perp.y * 12.8 * BW };
    const ribR = { x: rl.x - perp.x * 12.8 * BW, y: rl.y - perp.y * 12.8 * BW };
    const shL = { x: C.x + perp.x * 15.5 * BW, y: C.y + perp.y * 15.5 * BW };
    const shR = { x: C.x - perp.x * 15.5 * BW, y: C.y - perp.y * 15.5 * BW };
    const torsoPts = [hipL, waistL, ribL, shL, shR, ribR, waistR, hipR];
    if (ghost) {
      poly(ctx, torsoPts, ghost, null, alpha * 0.5);
    } else {
      const bg = ctx.createLinearGradient(C.x, C.y, P0.x, P0.y);
      bg.addColorStop(0, th.bodyLight || '#1a2833');
      bg.addColorStop(0.45, th.body);
      bg.addColorStop(1, th.dark);
      poly(ctx, torsoPts, bg, rim, alpha, 1.7);
      // 胸甲
      const cg = ctx.createLinearGradient(ribL.x, ribL.y, shL.x, shL.y);
      cg.addColorStop(0, 'rgba(255,255,255,0)');
      cg.addColorStop(1, th.rim + '2E');
      poly(ctx, [ribL, shL, C, { x: lerpP2(ribL, hipL, 0.42).x, y: lerpP2(ribL, hipL, 0.42).y }], cg, null, alpha * 0.9);
      // 腰封
      ctx.globalAlpha = alpha * 0.85;
      ctx.strokeStyle = th.accent;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(lerpP2(waistL, waistR, 0).x, lerpP2(waistL, waistR, 0).y);
      ctx.lineTo(waistR.x, waistR.y);
      ctx.stroke();
      // 核心光
      const core = lerpP2(P0, C, 0.62);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * (0.5 + Math.sin((f.animT || 0) * 2.6) * 0.22 + (f.status && f.status.rage > 0 ? 0.2 : 0));
      ctx.fillStyle = f.status && f.status.rage > 0 ? '#ff8f9f' : th.eye;
      ctx.beginPath();
      ctx.moveTo(core.x, core.y - 4);
      ctx.lineTo(core.x + 2.8, core.y);
      ctx.lineTo(core.x, core.y + 4);
      ctx.lineTo(core.x - 2.8, core.y);
      ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      // 肩甲
      for (const pair of [[sk.sB, 0.75], [sk.sF, 1]]) {
        const o = pair[0], k = pair[1];
        const a1 = { x: o.x + td.x * 6.5, y: o.y + td.y * 6.5 };
        const a2 = { x: o.x - td.x * 6.5, y: o.y - td.y * 6.5 };
        const apex = { x: o.x + perp.x * (12.5 + k * 2) + td.x * 1.5, y: o.y + perp.y * (12.5 + k * 2) + td.y * 1.5 };
        poly(ctx, [a1, apex, a2], dark, rim, alpha * (0.55 + k * 0.45), 1.4);
      }
    }

    // 头
    drawHead(ctx, f, sk, p, ghost, alpha);

    // 前侧腿
    capsule(ctx, sk.hF.x, sk.hF.y, sk.kF.x, sk.kF.y, 9.8 * BW, body, rim, glow, alpha);
    capsule(ctx, sk.kF.x, sk.kF.y, sk.fF.x, sk.fF.y, 8 * BW, body, rim, glow, alpha);
    foot(ctx, sk.fF, p, body, rim, alpha);

    // 武器
    const w = weaponPts(f, sk, p);
    if (f.char.weaponType !== 'none') {
      if (f.trail && f.trail.length > 2 && !ghost) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'butt';
        const tp = f.trail;
        for (let i = 0; i < tp.length - 1; i++) {
          const k = 1 - i / (tp.length - 1);
          ctx.globalAlpha = 0.5 * k * alpha;
          ctx.strokeStyle = i < 2 ? '#ffffff' : th.rim;
          ctx.lineWidth = 5.2 * k * k + 0.4;
          ctx.beginPath();
          ctx.moveTo(tp[i].x, tp[i].y);
          ctx.lineTo(tp[i + 1].x, tp[i + 1].y);
          ctx.stroke();
        }
        ctx.globalAlpha = 0.1 * alpha;
        ctx.strokeStyle = th.glow;
        for (let i = 0; i < tp.length - 1; i++) {
          const k = 1 - i / (tp.length - 1);
          ctx.lineWidth = 8 * k + 1.2;
          ctx.beginPath();
          ctx.moveTo(tp[i].x, tp[i].y);
          ctx.lineTo(tp[i + 1].x, tp[i + 1].y);
          ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
      }
      drawWeapon(ctx, f, w, p, ghost, alpha);
    }
    // 前臂
    capsule(ctx, sk.sF.x, sk.sF.y, sk.eF.x, sk.eF.y, 8 * BW, body, rim, glow, alpha);
    capsule(ctx, sk.eF.x, sk.eF.y, sk.hdF.x, sk.hdF.y, 6.6 * BW, body, rim, glow, alpha);
    if (!ghost) {
      ctx.globalAlpha = alpha * 0.95;
      ctx.fillStyle = th.accent;
      ctx.beginPath(); ctx.arc(sk.hdF.x, sk.hdF.y, 2.4, 0, TAU); ctx.fill();
    }
    ctx.restore();
  };

  function foot(ctx, a, p, body, rim, alpha) {
    ctx.globalAlpha = alpha * 0.95;
    ctx.strokeStyle = rim; ctx.lineWidth = 5.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(a.x - 1, a.y); ctx.lineTo(a.x + 7.5, a.y + 1.2); ctx.stroke();
    ctx.strokeStyle = body; ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(a.x - 1, a.y); ctx.lineTo(a.x + 7.2, a.y + 1.2); ctx.stroke();
  }

  function drawHead(ctx, f, sk, p, ghost, alpha) {
    const th = f.theme;
    const r = L.head;
    ctx.save();
    ctx.translate(sk.head.x, sk.head.y);
    ctx.rotate((p.head + 90) * D);
    // 头盔
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.3);
    ctx.lineTo(r * 0.92, -r * 0.52);
    ctx.lineTo(r * 0.8, r * 0.6);
    ctx.lineTo(0, r * 1.06);
    ctx.lineTo(-r * 0.8, r * 0.6);
    ctx.lineTo(-r * 0.92, -r * 0.52);
    ctx.closePath();
    if (ghost) { ctx.fillStyle = ghost; ctx.fill(); }
    else {
      const g = ctx.createLinearGradient(0, -r, 0, r);
      g.addColorStop(0, th.bodyLight || '#1a2833');
      g.addColorStop(1, th.dark);
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = th.rim; ctx.lineWidth = 1.5; ctx.stroke();
    }
    if (f.char.style === 'horn' && !ghost) {
      // 双角
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sgn * r * 0.55, -r * 0.35);
        ctx.quadraticCurveTo(sgn * r * 1.9, -r * 1.25, sgn * r * 1.35, -r * 2.3);
        ctx.quadraticCurveTo(sgn * r * 0.95, -r * 1.15, sgn * r * 0.18, -r * 0.72);
        ctx.closePath();
        ctx.fillStyle = th.dark; ctx.fill();
        ctx.strokeStyle = th.accent; ctx.lineWidth = 1.1; ctx.stroke();
      }
    } else if (f.char.style === 'crest' && !ghost) {
      ctx.beginPath();
      ctx.moveTo(r * 0.1, -r * 1.25);
      ctx.quadraticCurveTo(-r * 0.2, -r * 3.1, -r * 1.5, -r * 3.2);
      ctx.quadraticCurveTo(-r * 0.6, -r * 2.2, -r * 0.35, -r * 1.05);
      ctx.closePath();
      ctx.fillStyle = th.accent;
      ctx.globalAlpha = alpha * 0.9; ctx.fill(); ctx.globalAlpha = alpha;
    }
    if (!ghost) {
      // 面甲
      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowColor = th.eye; ctx.shadowBlur = 10;
      ctx.fillStyle = th.eye;
      ctx.beginPath();
      ctx.moveTo(-r * 0.66, r * 0.02);
      ctx.lineTo(r * 0.7, -r * 0.14);
      ctx.lineTo(r * 0.7, r * 0.08);
      ctx.lineTo(-r * 0.66, r * 0.22);
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = 'source-over';
      // 额纹
      ctx.globalAlpha = alpha * 0.6;
      ctx.strokeStyle = th.accent; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(r * 0.15, -r * 1.1); ctx.lineTo(r * 0.2, r * 0.2); ctx.stroke();
    }
    ctx.restore();
  }

  function drawWeapon(ctx, f, w, p, ghost, alpha) {
    const th = f.theme;
    const type = f.char.weaponType || 'katana';
    const len = w.len;
    ctx.save();
    ctx.translate(w.hand.x, w.hand.y);
    ctx.rotate(p.wpn * D);
    if (ghost) {
      ctx.globalAlpha = alpha * 0.55;
      ctx.fillStyle = ghost;
      ctx.fillRect(4, -1.6, len, 3.2);
      ctx.restore();
      return;
    }
    if (type === 'hammer') {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(len * 0.72, 0); ctx.stroke();
      ctx.fillStyle = th.dark; ctx.strokeStyle = th.rim; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(len * 0.62, -11, 20, 22, 3) : ctx.rect(len * 0.62, -11, 20, 22);
      ctx.fill(); ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * 0.5; ctx.fillStyle = th.accent;
      ctx.fillRect(len * 0.66, -8, 4, 16);
    } else if (type === 'spear') {
      const g = ctx.createLinearGradient(0, 0, len, 0);
      g.addColorStop(0, '#3b2f26'); g.addColorStop(0.75, '#6d5a44'); g.addColorStop(1, th.accent);
      ctx.strokeStyle = g; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(len, 0); ctx.stroke();
      ctx.fillStyle = th.blade;
      ctx.beginPath();
      ctx.moveTo(len - 2, -1); ctx.lineTo(len + 13, 0); ctx.lineTo(len - 2, 1.6); ctx.closePath();
      ctx.globalAlpha = alpha; ctx.fill();
    } else {
      // 刀身
      const bl = len;
      const grd = ctx.createLinearGradient(0, -2.5, 0, 2.5);
      grd.addColorStop(0, '#ffffff');
      grd.addColorStop(0.5, th.blade);
      grd.addColorStop(1, th.bladeDark || '#7fb6c8');
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * 0.18;
      ctx.fillStyle = th.glow;
      ctx.beginPath();
      ctx.moveTo(4, -3.6); ctx.lineTo(4 + bl, -1.6); ctx.lineTo(4 + bl, 1.6); ctx.lineTo(4, 3.6);
      ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha;
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(4, -2.0);
      ctx.lineTo(4 + bl * 0.9, -1.5);
      ctx.lineTo(4 + bl, 0);
      ctx.lineTo(4 + bl * 0.9, 1.5);
      ctx.lineTo(4, 1.9);
      ctx.closePath();
      ctx.fill();
      // 柄
      ctx.strokeStyle = '#1a2129'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(4, 0); ctx.stroke();
      ctx.strokeStyle = th.rim; ctx.lineWidth = 1; ctx.globalAlpha = alpha * 0.7;
      ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(4, 0); ctx.stroke();
      // 护手
      ctx.globalAlpha = alpha;
      ctx.fillStyle = th.accent;
      ctx.fillRect(3, -4.4, 2.6, 8.8);
    }
    ctx.restore();
  }

  S.drawGhost = function (ctx, p) {
    const f = p.fighter;
    if (!f) return;
    const save = { x: f.x, y: f.y, facing: f.facing, scale: f.scale, pose: f.pose, skel: f.skel, trail: null, alpha: p.alpha, theme: f.theme };
    // 使用快照姿态：临时重建
    const old = f.pose, oldSk = f.skel;
    f.x = p.x; f.y = p.y; f.facing = p.facing;
    f.pose = p.pose; f.skel = solve(p.pose);
    f.theme = Object.assign({}, f.theme, { body: p.color, dark: p.color, rim: p.color, glow: p.color, cape: p.color, hair: p.color, blade: p.color });
    ctx.globalAlpha = p.alpha * 0.55;
    S.draw(ctx, f, p.color);
    f.x = save.x; f.y = save.y; f.facing = save.facing; f.pose = old; f.skel = oldSk; f.theme = save.theme;
  };
})();
