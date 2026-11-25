/* ══════════════════════════════════════════════════════════
   镜刃 MIRROR EDGE — battle.js
   战斗场景：时间/判定/相机/背景/投射物/结算
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const MB = window.MB;
  const U = MB.U;
  const TAU = U.TAU;
  const ARENA = MB.ARENA;

  const BGPAL = {
    shrine: { sky: ['#050a10', '#0a1a24', '#0d2a33'], moon: '#cdefff', glow: '#2e8fa8', ground: '#060d12', line: '#1a5468', deco: '#0a1e28' },
    corridor: { sky: ['#0a0705', '#1a1109', '#2a1a0d'], moon: '#ffd9a0', glow: '#c47a2a', ground: '#0d0906', line: '#4a3018', deco: '#1a1208' },
    bloodmoon: { sky: ['#0a0206', '#200510', '#3a0a14'], moon: '#ff5a6e', glow: '#a01a2c', ground: '#0b0306', line: '#4a1018', deco: '#1c060a' },
    cliff: { sky: ['#03060c', '#0a1524', '#122a3c'], moon: '#dff2ff', glow: '#4a90c0', ground: '#05080d', line: '#1a3a50', deco: '#081420' },
    mirror: { sky: ['#06040e', '#120a24', '#1d0f38'], moon: '#d9c2ff', glow: '#7a4ad0', ground: '#08050f', line: '#2d1a52', deco: '#100820' },
    void: { sky: ['#000306', '#04121a', '#082029'], moon: '#ffffff', glow: '#20c8e8', ground: '#03080c', line: '#0d3846', deco: '#041018' },
  };

  class Battle {
    constructor(o) {
      this.stage = o.stage;
      this.diff = MB.DIFFS[o.diff] || MB.DIFFS[0];
      this.diffIdx = o.diff || 0;
      this.enemyChar = JSON.parse(JSON.stringify(MB.ENEMIES[this.stage.enemy]));
      this.enemyChar.theme = Object.assign({}, MB.ENEMIES[this.stage.enemy].theme);

      const narrow = Math.min(window.innerWidth, window.innerHeight) < 620;
      this.bounds = narrow ? 320 : 560;
      this.player = new MB.Fighter(this, MB.PLAYER, 'player');
      this.enemy = new MB.Fighter(this, this.enemyChar, 'enemy');
      const sm = narrow ? 1.34 : 1;
      this.player.scale *= sm; this.enemy.scale *= sm;
      this.player.x = narrow ? -130 : -180; this.player.facing = 1;
      this.enemy.x = narrow ? 130 : 180; this.enemy.facing = -1;
      this.player.skills = MB.PLAYER.skills || [];
      this.ai = new MB.AI(this.enemy, this, this.diff);

      this.cam = MB.Camera;
      this.projectiles = [];
      this.zones = [];
      this.summons = [];
      this.timers = [];

      this.t = 0; this.realT = 0; this.aliveTime = 0;
      this.timeScale = 1; this.slowT = 0; this.slowScale = 1;
      this.freezeT = 0; this.hitstop = 0;
      this.over = false; this.win = false;
      this.intro = 1.5;
      this.combo = 0; this.comboT = 0; this.maxCombo = 0;
      this.focusT = 0; this.focusX = 0; this.focusZoom = 1;
      this.stats = { perfect: 0, dodge: 0, hits: 0, maxCombo: 0, dmgDealt: 0, dmgTaken: 0, time: 0 };
      this.shakeScale = (MB.SAVE && MB.SAVE.settings ? MB.SAVE.settings.shake : 100) / 100;
      this.stopScale = (MB.SAVE && MB.SAVE.settings ? MB.SAVE.settings.stop : 100) / 100;
      this.fxLevel = 1;
      this.bgParticles = [];
      this._bgT = 0;
      this.lightning = 0;

      MB.FX.clear();
      this.cam.fit();
      this.cam.x = 0; this.cam.y = -80; this.cam.zoom = this.cam.baseZoom;
      this.hintT = 0;

      if (MB.UI) {
        MB.UI.beginBattle(this);
      }
      MB.Sound.startMusic();
      MB.Sound.setIntensity(0.35);
      this.phase = 1;
    }

    other(f) { return f === this.player ? this.enemy : this.player; }
    get parryWindow() {
      return this.diff.parryWindow * (this.player.status.insight > 0 ? 1.9 : 1);
    }

    /* ───────── 时间控制 ───────── */
    hitstopSet(t) { this.hitstop = Math.max(this.hitstop, t * this.stopScale); }
    timeStop(t) { this.freezeT = Math.max(this.freezeT, t); }
    slowmo(scale, dur) { this.slowScale = scale; this.slowT = Math.max(this.slowT, dur); }
    shake(a) { this.cam.kick(a * this.shakeScale); }
    flashScreen(color, a, dur) { MB.FX.screenFlash(color, a, dur); }
    setBars(v) { MB.FX.setBars(v); }
    zoomFocus(x, z, dur) { this.focusX = x; this.focusZoom = z; this.focusT = dur; }
    later(t, fn) { this.timers.push({ t, fn }); }

    /* ───────── 更新 ───────── */
    update(dtReal) {
      dtReal = Math.min(dtReal, 0.05);
      this.realT += dtReal;
      this.timeScale = this.slowT > 0 ? this.slowScale : 1;
      if (this.slowT > 0) this.slowT -= dtReal;
      if (this.freezeT > 0) this.freezeT -= dtReal;
      if (this.hitstop > 0) this.hitstop -= dtReal;

      for (let i = this.timers.length - 1; i >= 0; i--) {
        const tm = this.timers[i];
        tm.t -= dtReal;
        if (tm.t <= 0) { this.timers.splice(i, 1); try { tm.fn(); } catch (e) { console.error(e); } }
      }

      const frozen = this.freezeT > 0 || this.hitstop > 0;
      let dt = frozen ? 0 : dtReal * this.timeScale;

      if (this.intro > 0) {
        this.intro -= dtReal;
        dt = 0;
        if (this.intro <= 0 && MB.UI) MB.UI.hint('', 0);
      } else if (!this.over) {
        this.aliveTime += dtReal;
        this.t += dt;
        this.stats.time += dtReal;
        this.handleInput(dtReal);
      }

      // 单位
      if (!frozen) {
        this.player.update(dt);
        this.enemy.update(dt);
        this.ai.update(dt);
      }

      // 投射物
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const p = this.projectiles[i];
        if (frozen) break;
        p.t = (p.t || 0) + dt;
        p.life -= dt;
        if (p.homing) {
          const tgt = p.owner === this.player ? this.enemy : this.player;
          if (tgt && !tgt.dead) {
            const a = Math.atan2((tgt.y + 55) - (-p.y + 0), tgt.x - p.x);
            p.vx = U.damp(p.vx, Math.cos(a) * p.speed || 0, 4, dt);
          }
        }
        p.vy += (p.gravity || 0) * dt;
        p.x += p.vx * dt;
        p.y -= p.vy * dt;
        if (p.wobble) { p.x += Math.sin(p.t * 20) * p.wobble * dt * 60; }
        if (p.onUpdate) p.onUpdate(p, dt);
        if (p.trail && p.t % 0.03 < dt) {
          MB.FX.add({ type: 'glow', x: p.x, y: p.y, vx: U.rand(20, -20), vy: U.rand(20, -20), life: 0.3, size: (p.r || 20) * 0.22, color: p.color, alpha: 0.7 });
        }
        const tgt = p.owner === this.player ? this.enemy : this.player;
        let dead = false;
        if (tgt && !tgt.dead && !p.hitDone) {
          const dx = tgt.x - p.x, dy = (-tgt.y - 55) - p.y;
          if (Math.abs(dx) < (p.r || 24) + 22 && Math.abs(dy) < (p.r || 24) + 58) {
            if (tgt.status.reflect > 0 && p.owner !== tgt) {
              p.owner = tgt; p.vx = -p.vx; p.dmg *= 3; p.color = '#ffd58a'; p.hitDone = false;
              MB.FX.ring(p.x, p.y, 6, 90, { color: '#ffd58a', life: 0.3, width: 3 });
              MB.Sound.parry();
            } else {
              p.hitDone = true;
              this.applyDamage(tgt, p.owner, p.dmg, { posture: p.posture || 8, kb: p.kb || 100, color: p.color });
              MB.FX.ring(p.x, p.y, 4, 60, { color: p.color, life: 0.28, width: 2 });
              MB.FX.spark(p.x, p.y, 12, { color: p.color, speed: 380, life: 0.4 });
              this.hitstopSet(0.05);
              dead = !p.pierce;
            }
          }
        }
        if (p.life <= 0 || dead || p.x < -1400 || p.x > 1400) {
          if (p.onExpire && p.life <= 0) p.onExpire(p);
          if (p.boom) MB.FX.ring(p.x, p.y, 10, 90, { color: p.color, life: 0.3, width: 3 });
          this.projectiles.splice(i, 1);
        }
      }

      // 区域
      for (let i = this.zones.length - 1; i >= 0; i--) {
        const z = this.zones[i];
        if (frozen) break;
        z.t += dt; z.life -= dt;
        const e = this.enemy;
        const inZone = Math.abs(e.x - z.x) < z.r && !e.dead;
        if (z.pull && inZone) {
          const d = z.x - e.x;
          e.vx += Math.sign(d) * z.pull * dt * 6;
        }
        if (z.slow && inZone) e.setStatus('slowZone', 0.2);
        z.acc = (z.acc || 0) + dt;
        if (z.tickRate && z.acc >= z.tickRate) {
          z.acc = 0;
          if (inZone) this.applyDamage(e, z.owner, z.dmg, { posture: 3, small: true, kb: 0, color: z.color });
        }
        if (z.t < 0.4) {
          MB.FX.add({ type: 'glow', x: z.x + U.rand(z.r, -z.r) * 0.6, y: -U.rand(120, 0), vx: 0, vy: -60, life: 0.7, size: 2, color: z.color, alpha: 0.7 });
        }
        if (z.life <= 0) this.zones.splice(i, 1);
      }

      // 召唤物
      for (let i = this.summons.length - 1; i >= 0; i--) {
        const s = this.summons[i];
        s.life -= dt;
        if (s.update) s.update(s, dt);
        if (s.life <= 0) this.summons.splice(i, 1);
      }

      // 粒子
      MB.FX.update(dtReal * (frozen ? 0.25 : 1));
      this.updateCamera(dtReal);
      this.updateAmbient(dtReal);

      // combo
      if (this.comboT > 0) {
        this.comboT -= dtReal;
        if (this.comboT <= 0) this.combo = 0;
      }

      // 结算
      if (!this.over) {
        if (this.player.dead) this.endBattle(false);
        else if (this.enemy.dead) this.endBattle(true);
        else if (this.stats.time > 240) this.endBattle(false);
      }
      if (this.over && this.overT != null) {
        this.overT -= dtReal;
        if (this.overT <= 0) {
          this.overT = null;
          if (MB.UI) MB.UI.endBattle(this);
        }
      }

      if (this.focusT > 0) this.focusT -= dtReal;

      if (MB.UI) MB.UI.updateHUD(this);
      MB.Sound.setIntensity(this.enemy.hpRatio < 0.4 ? 0.95 : 0.55 + (1 - this.enemy.hpRatio) * 0.3);
    }

    /* ───────── 输入 ───────── */
    handleInput(dt) {
      const I = MB.Input, p = this.player;
      if (p.dead || this.over) return;
      p.moveDir = U.clamp(I.axis(), -1, 1);
      this._atkHold = this._atkHold || 0;

      if (I.justPressed('attack')) { p.tryAttack('light'); this._atkHold = 0.001; }
      if (I.isDown('attack')) this._atkHold += dt; else this._atkHold = 0;
      if (this._atkHold > 0.52) { this._atkHold = -99; p.tryAttack('heavy'); }

      if (I.justPressed('heavy')) p.tryAttack('heavy');
      if (I.justPressed('jump')) p.tryJump();
      if (I.justPressed('dash')) p.tryDash(p.moveDir || p.facing);
      if (I.justPressed('guard')) p.startGuard();
      if (I.justReleased('guard')) p.endGuard();
      for (let i = 0; i < 4; i++) {
        if (I.justPressed('sk' + (i + 1))) p.useSkill(i);
      }
      if (I.justPressed('ult')) p.useUlt();
      // 手机技能按下滑动
      if (this._skillTouch != null) { p.useSkill(this._skillTouch); this._skillTouch = null; }
    }

    /* ───────── 投射物 / 区域 / 召唤 ───────── */
    spawnProjectile(o) {
      o.t = 0;
      o.life = o.life || 1;
      o.r = o.r || 20;
      o.dmg = o.dmg || 20;
      if (o.y == null) o.y = -60;
      if (o.pierce == null) o.pierce = false;
      this.projectiles.push(o);
      return o;
    }
    spawnZone(o) {
      o.life = o.life || 2;
      o.r = o.r || 100;
      o.t = 0;
      this.zones.push(o);
      return o;
    }
    spawnSummon(o) {
      o.life = o.life || 3;
      this.summons.push(o);
      return o;
    }

    /* ───────── 战斗事件 ───────── */
    perfectParry(p, e, def) {
      p.parryTimer = 0;
      p.posture = Math.min(p.postureMax, p.posture + 30);
      p.postureDelay = 0;
      p.guarding = true;
      p.ult = Math.min(100, p.ult + 10);
      p.mirrorStacks++;
      p.setState('guard');
      this.stats.perfect++;
      this.hitstopSet(0.14);
      this.timeStop(0.14);
      this.shake(13);
      MB.FX.screenFlash('#ffffff', 0.5, 0.13);
      MB.FX.ring(p.x, -p.y - 62, 10, 210, { color: '#ffffff', life: 0.55, width: 5 });
      MB.FX.ring(p.x, -p.y - 62, 30, 150, { color: '#bff6ff', life: 0.4, width: 2, ease: 'outQuint' });
      MB.FX.shard(p.x, -p.y - 62, 22, { color: '#dffcff', speed: 520 });
      MB.FX.spark(p.x, -p.y - 62, 26, { color: '#ffffff', speed: 620, life: 0.5, size: 2.2 });
      MB.FX.setSpeedLines(0.9);
      this.later(0.3, () => MB.FX.setSpeedLines(0));
      MB.Sound.perfect();
      this.zoomFocus(p.x, 1.16, 0.5);

      // 敌人后仰
      e.staggered = true; e.staggerDur = 0.9;
      e.setState('stagger'); e.stateT = 0; e.act = null; e.guarding = false;
      e.posture = Math.max(0, e.posture - 34); e.postureDelay = 1.6;
      e.setStatus('broken', 3.2);
      e.vx += p.facing * 300;
      e.flash = 1;
      e.hurtT = 0.3;

      this.combo = 0;
      if (MB.UI) MB.UI.parryPulse();
      const style = MB.PARRY[MB.PLAYER.parryStyle] || MB.PARRY.condemn;
      if (style.onPerfect) style.onPerfect(this, p, e, def);
    }

    perfectDodge(p, e, def) {
      p.ult = Math.min(100, p.ult + 8);
      this.stats.dodge++;
      this.slowmo(0.34, 0.75);
      this.shake(6);
      MB.FX.ring(p.x, -p.y - 60, 12, 140, { color: p.theme.glow, life: 0.5, width: 3 });
      MB.FX.text(p.x, -p.y - 160, '幻影', { color: p.theme.rim, size: 20 });
      for (let i = 0; i < 4; i++) MB.FX.after(p, { life: 0.35 + i * 0.04, alpha: 0.4 });
      MB.Sound.dash();
      MB.FX.setSpeedLines(0.6);
      this.later(0.35, () => MB.FX.setSpeedLines(0));
      if (MB.UI) MB.UI.hint('<b>完美闪避</b> · 子弹时间', 900);
    }

    applyDamage(target, source, base, o = {}) {
      if (!target || target.dead) return 0;
      let amt = base;
      if (source) amt *= source.atkMul;
      amt *= target.takenMul;
      amt *= target.isPlayer ? this.diff.enemyDmg : this.diff.playerDmg;
      // 护盾
      if (target.status.shield > 0 && (target.status.shield_hp || 0) > 0) {
        const ab = Math.min(target.status.shield_hp, amt);
        target.status.shield_hp -= ab; amt -= ab;
        this.onShieldHit(target, ab);
        if (target.status.shield_hp <= 0) { target.status.shield = 0; this.onShieldBreak(target); }
        if (amt <= 0.5) { this.hitstopSet(0.03); return 0; }
      }
      target.hp -= amt;
      target.flash = 1;
      if (o.posture) { target.posture -= o.posture; target.postureDelay = 1.0; }
      target.lastHitBy = source;

      const cy = -target.y - 56 - U.rand(24, -24);
      const cx = target.x + U.rand(14, -14);
      const c = o.color || '#ffffff';
      if (source) {
        const dirA = Math.atan2(-30, source.facing);
        MB.FX.spark(cx, cy, o.small ? 5 : 12, { color: c, speed: o.small ? 220 : 480, dir: dirA, spread: 1.15, life: 0.4, size: o.big ? 2.8 : 1.8 });
        MB.FX.slash(cx, cy, source.facing > 0 ? 0 : Math.PI, o.small ? 46 : 74, { color: c, width: o.big ? 22 : 11, arc: 1.9, life: 0.2 });
        MB.FX.add({ type: 'impact', x: cx, y: cy, rot: U.rand(TAU), size: o.small ? 14 : (o.big ? 42 : 24), life: o.big ? 0.2 : 0.13, color: c, alpha: 1 });
        MB.FX.ring(cx, cy, 4, o.small ? 26 : (o.big ? 90 : 46), { color: c, life: 0.18, width: o.big ? 3 : 1.8 });
      }
      if (o.big) {
        MB.FX.shard(cx, cy, 8, { color: c });
        MB.FX.ring(cx, cy, 6, 90, { color: c, life: 0.3, width: 2 });
      }
      if (target.isPlayer) {
        this.stats.dmgTaken += amt;
        this.shake(5);
      } else {
        this.stats.dmgDealt += amt;
        if (source && source.isPlayer) {
          this.combo++;
          this.comboT = 2.4;
          this.stats.maxCombo = Math.max(this.stats.maxCombo, this.combo);
          this.maxCombo = Math.max(this.maxCombo, this.combo);
          source.ult = Math.min(100, source.ult + (source.status.hunt > 0 ? 1.6 : 1.0));
          if (source.status.lifesteal > 0) source.heal(amt * 0.12);
          if (source.status.hunt > 0) source.ult = Math.min(100, source.ult + 0.6);
        }
      }
      // 伤害数字
      const crit = source && source.isPlayer && (this.combo % 7 === 0);
      MB.FX.text(cx + U.rand(26, -26), cy - 26 + U.rand(16, -16), String(Math.round(amt)), {
        color: target.isPlayer ? '#ff8f9f' : (crit ? '#ffe08a' : '#e8feff'),
        size: o.big ? 30 : (o.small ? 15 : 20 - Math.min(6, this.combo * 0.15)),
        bold: o.big, vy: -150, g: 120, life: 0.8,
      });
      MB.Sound.hit(o.big ? 1.6 : (o.small ? 0.5 : 1));
      this.hitstopSet((o.big ? 0.1 : 0.045) + Math.min(0.03, amt / 3000));
      this.cam.punch(o.big ? 0.045 : (o.small ? 0.004 : 0.014));
      if (o.big) this.shake(9);

      if (target.hp <= 0) target.die(source);
      return amt;
    }

    onHit(target, attacker, dmg, def) { /* applyDamage 已处理表现 */ }

    onBlock(p, attacker, def) {
      const gx = p.x + p.facing * 30, gy = -p.y - 62;
      this.hitstopSet(0.07);
      this.shake(6);
      this.cam.punch(0.012);
      // 格挡火花：扇形迸射
      MB.FX.spark(gx, gy, 16, { color: '#ffe6b0', speed: 420, dir: p.facing > 0 ? 0 : Math.PI, spread: 1.0, life: 0.45, size: 1.9 });
      MB.FX.spark(gx, gy, 8, { color: '#ffffff', speed: 260, life: 0.3, size: 1.6 });
      MB.FX.ring(gx, gy, 6, 62, { color: '#ffe6b0', life: 0.24, width: 2.5 });
      MB.FX.ring(gx, gy, 24, 40, { color: '#ffffff', life: 0.18, width: 1.4 });
      MB.FX.add({ type: 'impact', x: gx, y: gy, rot: U.rand(TAU), size: 18, life: 0.12, color: '#ffe6b0', alpha: 0.9 });
      MB.FX.text(p.x, -p.y - 138, '格 挡', { color: '#ffe6b0', size: 14 });
      MB.Sound.guard();
      // 弹反：攻击者被震开，连段中断，给你一个反击窗口
      if (attacker && !attacker.dead) {
        attacker.act = null;
        attacker.setState('hurt');
        attacker.stateT = 0;
        attacker.hurtT = 0.26;
        attacker.vx -= attacker.facing * 230;
        attacker.telegraph = null;
      }
      if (MB.UI) MB.UI.hint('', 0);
    }

    onShieldHit(f, amt) {
      MB.FX.ring(f.x, -f.y - 60, 46, 58, { color: '#ffd58a', life: 0.2, width: 2 });
    }
    onShieldBreak(f) {
      MB.FX.ring(f.x, -f.y - 60, 10, 130, { color: '#ffd58a', life: 0.4, width: 4 });
      MB.FX.shard(f.x, -f.y - 60, 10, { color: '#ffd58a' });
      this.shake(7);
      const e = this.other(f);
      if (e && Math.abs(e.x - f.x) < 150) this.applyDamage(e, f, 90, { posture: 26, kb: 320, kbUp: 160, color: '#ffd58a' });
    }

    onStagger(f, attacker) {
      this.hitstopSet(0.1);
      this.shake(10);
      MB.FX.ring(f.x, -f.y - 60, 10, 150, { color: '#ffcf7a', life: 0.45, width: 4 });
      MB.FX.text(f.x, -f.y - 150, '破 势', { color: '#ffcf7a', size: 26, bold: true });
      MB.Sound.boom(0.6);
    }
    onGuardBreak(f) {
      this.hitstopSet(0.12);
      this.shake(12);
      MB.FX.ring(f.x, -f.y - 60, 10, 170, { color: '#ff6b7d', life: 0.4, width: 4 });
      MB.FX.text(f.x, -f.y - 150, 'GUARD BREAK', { color: '#ff6b7d', size: 20, bold: true });
      MB.Sound.boom(0.8);
    }
    onSkill(f, def, i) {
      MB.Sound.cast();
      if (f.isPlayer && def.instant) MB.FX.text(f.x, -f.y - 148, def.name, { color: '#bff6ff', size: 15 });
    }
    startUlt(f) {
      MB.Sound.ult();
      MB.ULT.exec(f);
    }
    onJump(f) {
      MB.FX.ring(f.x, -2, 6, 40, { color: f.theme.glow, life: 0.3, width: 2, squash: 0.25 });
      for (let i = 0; i < 5; i++) MB.FX.spark(f.x + U.rand(12, -12), -4, 2, { color: f.theme.glow, speed: 130, life: 0.3 });
    }
    onLand(f) {
      MB.Sound.land();
      MB.FX.ring(f.x, -2, 8, 70, { color: f.theme.glow, life: 0.32, width: 2, squash: 0.22 });
      for (let i = 0; i < 6; i++) MB.FX.add({ type: 'glow', x: f.x + U.rand(20, -20), y: -4, vx: U.rand(90, -90), vy: U.rand(-10, -60), g: 60, life: 0.5, size: 2.4, color: f.theme.glow, alpha: 0.5 });
    }
    onEnemyPhase(f, phase) {
      this.timeStop(0.5);
      this.shake(16);
      MB.FX.screenFlash('#ffffff', 0.6, 0.3);
      MB.FX.ring(f.x, -f.y - 60, 10, 260, { color: f.theme.glow, life: 0.7, width: 5 });
      MB.FX.text(f.x, -f.y - 180, '第二阶段', { color: f.theme.rim, size: 22 });
      MB.Sound.boom(1.2);
      f.setStatus('rage', 999);
    }
    onDeath(f, attacker) {
      if (f.isPlayer) {
        MB.FX.setBars(0.14);
        MB.FX.screenFlash('#ff2b4a', 0.5, 0.5);
        this.slowmo(0.25, 1.6);
        MB.Sound.fail();
      } else {
        MB.FX.setBars(0.14);
        MB.FX.screenFlash('#ffffff', 0.5, 0.4);
        this.timeStop(0.7);
        this.slowmo(0.22, 1.8);
        MB.FX.ring(f.x, -f.y - 60, 10, 320, { color: '#ffffff', life: 0.8, width: 6 });
        MB.FX.shard(f.x, -f.y - 60, 30, { color: f.theme.rim, speed: 600 });
        MB.Sound.boom(1.5);
        MB.Sound.perfect();
        if (MB.SAVE) {
          MB.SAVE.stats.kills = (MB.SAVE.stats.kills || 0) + 1;
          MB.UI.checkAchv('firstBlood');
        }
      }
    }

    endBattle(win) {
      if (this.over) return;
      this.over = true; this.win = win;
      this.result = {
        win, stage: this.stage, diff: this.diffIdx,
        stats: Object.assign({}, this.stats, { maxCombo: Math.max(this.stats.maxCombo, this.maxCombo) }),
        hpLeft: this.player.hp / this.player.hpMax,
      };
      this.overT = win ? 1.3 : 1.6;
      MB.FX.setBars(0.12);
      if (MB.UI) MB.UI.battleEnding(this);
    }

    /* ───────── 相机 ───────── */
    updateCamera(dt) {
      const p = this.player, e = this.enemy;
      const mid = (p.x + e.x) / 2;
      const d = Math.abs(p.x - e.x);
      let z = 1.06 - U.clamp(d / 1700, 0, 0.3);
      let tx = mid;
      if (this.focusT > 0) { z *= this.focusZoom; tx = U.lerp(mid, this.focusX, 0.6); }
      if (this.over) z *= 1.05;
      this.cam.follow(tx, -80, z, 6);
      this.cam.update(dt);
    }

    updateAmbient(dt) {
      this._bgT += dt;
      const pal = BGPAL[this.stage.bg] || BGPAL.shrine;
      if (this._bgT > 0.09) {
        this._bgT = 0;
        if (this.stage.bg === 'cliff') {
          this.bgParticles.push({ x: U.rand(1200, -200), y: U.rand(0, -400), vx: U.rand(40, -120), vy: U.rand(700, 420), life: 1.2, raindrop: true });
        } else if (Math.random() < 0.7) {
          this.bgParticles.push({ x: this.cam.x + U.rand(520, -520), y: U.rand(400, 0) - 400, vx: U.rand(20, -20), vy: U.rand(-10, -40), life: U.rand(4, 2), size: U.rand(2.2, 0.6), color: pal.glow });
        }
        if (this.stage.bg === 'cliff' && Math.random() < 0.06) this.lightning = 0.18;
      }
      for (let i = this.bgParticles.length - 1; i >= 0; i--) {
        const b = this.bgParticles[i];
        b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        if (b.life <= 0) this.bgParticles.splice(i, 1);
      }
      if (this.lightning > 0) this.lightning -= dt;
    }

    /* ───────── 绘制 ───────── */
    draw(ctx, w, h) {
      const cam = this.cam;
      this.drawBG(ctx, w, h, cam);

      // 世界
      ctx.save();
      cam.apply(ctx);

      // 区域
      for (const z of this.zones) this.drawZone(ctx, z);
      // 召唤物
      for (const s of this.summons) if (s.draw) s.draw(ctx, s, U.clamp(s.life / 1.2, 0, 1));

      // 地面倒影
      ctx.save();
      this.enemy.draw(ctx, true);
      this.player.draw(ctx, true);
      ctx.restore();

      // 角色
      this.enemy.draw(ctx);
      this.player.draw(ctx);

      // 投射物
      for (const p of this.projectiles) this.drawProjectile(ctx, p);

      // 粒子
      MB.FX.drawWorld(ctx, cam);
      ctx.restore();

      MB.FX.drawScreen(ctx, w, h);
      if (this.hitstop > 0.06 || this.freezeT > 0.1) {
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
      this.drawIntro(ctx, w, h);
    }

    drawVignette(ctx, w, h) {
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.max(w, h) * 0.78);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,.72)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // 扫描线
      ctx.save();
      ctx.globalAlpha = 0.035;
      ctx.fillStyle = '#9fe8ff';
      for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
      ctx.restore();
    }

    drawIntro(ctx, w, h) {
      if (this.intro <= 0) return;
      const k = U.clamp(this.intro / 1.5, 0, 1);
      ctx.save();
      ctx.globalAlpha = U.clamp(k * 2, 0, 1);
      ctx.fillStyle = 'rgba(2,4,7,.55)';
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = 'center';
      ctx.font = '11px system-ui,sans-serif';
      ctx.fillStyle = 'rgba(160,220,240,.7)';
      ctx.fillText(this.stage.sub, w / 2, h * 0.4);
      ctx.font = '300 ' + Math.round(Math.min(46, w * 0.09)) + 'px "Songti SC","Noto Serif SC",serif';
      ctx.fillStyle = '#eafaff';
      ctx.shadowColor = 'rgba(92,233,255,.7)'; ctx.shadowBlur = 28;
      ctx.fillText(this.stage.name, w / 2, h * 0.4 + Math.min(56, w * 0.1));
      ctx.shadowBlur = 0;
      ctx.font = '12px system-ui,sans-serif';
      ctx.fillStyle = 'rgba(255,180,190,.75)';
      ctx.fillText('VS  ' + this.enemyChar.name, w / 2, h * 0.4 + Math.min(96, w * 0.16));
      ctx.restore();
    }

    /* ───────── 背景 ───────── */
    drawBG(ctx, w, h) {
      const pal = BGPAL[this.stage.bg] || BGPAL.shrine;
      const cam = this.cam;
      const gy = cam.toScreen(0, 0).y;
      const px = -cam.x * 0.06;

      // 天空
      if (!this._skyG || this._skyH !== Math.round(gy)) {
        const sky = ctx.createLinearGradient(0, 0, 0, Math.max(gy, 10));
        sky.addColorStop(0, pal.sky[0]);
        sky.addColorStop(0.55, pal.sky[1]);
        sky.addColorStop(1, pal.sky[2]);
        this._skyG = sky; this._skyH = Math.round(gy);
      }
      ctx.fillStyle = this._skyG;
      ctx.fillRect(0, 0, w, h);

      // 月亮 / 光源
      const mx = w * 0.5 + px * 1.4, my = gy - Math.min(h * 0.42, 340);
      const mr = Math.min(w, h) * 0.16;
      const mg = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 3.2);
      mg.addColorStop(0, pal.moon);
      mg.addColorStop(0.12, pal.moon);
      mg.addColorStop(0.2, pal.glow + '88');
      mg.addColorStop(0.5, pal.glow + '22');
      mg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = mg;
      ctx.beginPath(); ctx.arc(mx, my, mr * 3.2, 0, TAU); ctx.fill();

      if (this.stage.bg === 'mirror') this.drawMirrorShards(ctx, w, h, gy, px, pal);
      else this.drawSilhouettes(ctx, w, h, gy, px, pal);

      // 地面
      const gg = ctx.createLinearGradient(0, gy, 0, h);
      gg.addColorStop(0, pal.line + '55');
      gg.addColorStop(0.08, pal.ground);
      gg.addColorStop(1, '#010203');
      ctx.fillStyle = gg;
      ctx.fillRect(0, gy, w, h - gy);
      // 地平线
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const hg = ctx.createLinearGradient(0, gy - 10, 0, gy + 44);
      hg.addColorStop(0, 'rgba(255,255,255,0)');
      hg.addColorStop(0.32, pal.glow + '2A');
      hg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = hg;
      ctx.fillRect(0, gy - 10, w, 54);
      ctx.restore();
      // 地面透视网格
      ctx.save();
      ctx.strokeStyle = pal.line + '33';
      ctx.lineWidth = 1;
      const vp = { x: w / 2 + px, y: gy };
      for (let i = -8; i <= 8; i++) {
        ctx.beginPath();
        ctx.moveTo(vp.x + i * 26, gy);
        ctx.lineTo(vp.x + i * 240, h);
        ctx.stroke();
      }
      for (let i = 1; i < 7; i++) {
        const y = gy + Math.pow(i / 7, 2.2) * (h - gy);
        ctx.globalAlpha = 0.3 - i * 0.03;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      ctx.restore();

      // 环境粒子
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const b of this.bgParticles) {
        const s = cam.toScreen(b.x, b.y);
        if (b.raindrop) {
          ctx.globalAlpha = U.clamp(b.life, 0, 1) * 0.4;
          ctx.strokeStyle = '#9fd8ff';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + 3, s.y - 18); ctx.stroke();
        } else {
          ctx.globalAlpha = U.clamp(b.life / 4, 0, 1) * 0.5;
          ctx.fillStyle = b.color;
          ctx.beginPath(); ctx.arc(s.x, s.y, b.size, 0, TAU); ctx.fill();
        }
      }
      ctx.restore();

      // 雾
      const fog = ctx.createLinearGradient(0, gy - 60, 0, gy + 90);
      fog.addColorStop(0, 'rgba(0,0,0,0)');
      fog.addColorStop(0.6, pal.glow + '12');
      fog.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = fog;
      ctx.fillRect(0, gy - 60, w, 150);

      if (this.lightning > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = this.lightning * 3;
        ctx.fillStyle = '#cfe8ff';
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
    }

    drawSilhouettes(ctx, w, h, gy, px, pal) {
      ctx.save();
      ctx.fillStyle = pal.deco;
      const off = ((px * 0.6) % 300 + 300) % 300;
      // 远山
      ctx.beginPath();
      ctx.moveTo(-100, gy);
      for (let i = -1; i < 8; i++) {
        const x = i * 220 + off;
        ctx.lineTo(x, gy - 40 - (i % 3) * 26);
        ctx.lineTo(x + 110, gy - 10 - (i % 2) * 20);
      }
      ctx.lineTo(w + 200, gy);
      ctx.closePath();
      ctx.globalAlpha = 0.7;
      ctx.fill();
      // 建筑
      for (let i = -2; i < 7; i++) {
        const x = i * 260 + off * 1.7 - 80;
        ctx.globalAlpha = 0.85;
        if (this.stage.bg === 'shrine') {
          // 鸟居
          ctx.fillRect(x, gy - 210, 14, 210);
          ctx.fillRect(x + 96, gy - 210, 14, 210);
          ctx.fillRect(x - 26, gy - 218, 162, 13);
          ctx.fillRect(x - 8, gy - 182, 128, 10);
        } else if (this.stage.bg === 'corridor') {
          ctx.fillRect(x, gy - 260, 46, 260);
          ctx.fillRect(x - 10, gy - 274, 66, 16);
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = pal.glow;
          ctx.fillRect(x + 16, gy - 150, 12, 40);
          ctx.fillStyle = pal.deco;
        } else if (this.stage.bg === 'cliff') {
          ctx.beginPath();
          ctx.moveTo(x, gy);
          ctx.lineTo(x + 30, gy - 180);
          ctx.lineTo(x + 70, gy - 90);
          ctx.lineTo(x + 110, gy - 210);
          ctx.lineTo(x + 150, gy);
          ctx.closePath(); ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(x, gy);
          ctx.lineTo(x + 50, gy - 300);
          ctx.lineTo(x + 76, gy);
          ctx.closePath(); ctx.fill();
        }
      }
      // 远景光柱
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const x = (i * 331 + off * 2) % (w + 240) - 120;
        const g = ctx.createLinearGradient(x, gy, x, 0);
        g.addColorStop(0, pal.glow + '22');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x, gy); ctx.lineTo(x + 34, gy); ctx.lineTo(x + 120, 0); ctx.lineTo(x + 70, 0);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }

    drawMirrorShards(ctx, w, h, gy, px, pal) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 16; i++) {
        const seed = i * 9731;
        const x = ((seed % 1000) / 1000) * w + px * 1.2;
        const y = gy - 80 - ((seed % 613) / 613) * h * 0.62;
        const s = 12 + ((seed % 41) / 41) * 46;
        const rot = ((seed % 97) / 97) * TAU + Math.sin(this.realT * 0.3 + i) * 0.2;
        ctx.save();
        ctx.translate(x, y); ctx.rotate(rot);
        const g = ctx.createLinearGradient(-s, -s, s, s);
        g.addColorStop(0, pal.moon + '55');
        g.addColorStop(0.5, pal.glow + '22');
        g.addColorStop(1, 'rgba(255,255,255,0.02)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, -s); ctx.lineTo(s * 0.62, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.62, 0);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = pal.moon + '77';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }

    /* ───────── 实体绘制 ───────── */
    drawProjectile(ctx, p) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const a = U.clamp(p.life * 3, 0, 1);
      ctx.globalAlpha = a;
      const type = p.type || 'orb';
      if (type === 'crescent') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.vx > 0 ? 0 : Math.PI);
        for (let i = 0; i < 3; i++) {
          ctx.globalAlpha = a * (0.8 - i * 0.22);
          ctx.strokeStyle = i === 0 ? '#ffffff' : p.color;
          ctx.lineWidth = 16 - i * 4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(-20, 0, 46 + i * 6, -1.15, 1.15);
          ctx.stroke();
        }
      } else if (type === 'blade') {
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = p.color; ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.moveTo(0, -26); ctx.lineTo(6, 0); ctx.lineTo(0, 26); ctx.lineTo(-6, 0);
        ctx.closePath(); ctx.fill();
      } else if (type === 'mirror') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.t * 6);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 34);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, p.color); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, 34, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(20, 0); ctx.moveTo(0, -20); ctx.lineTo(0, 20); ctx.stroke();
      } else if (type === 'wave') {
        ctx.translate(p.x, p.y);
        ctx.scale(p.vx > 0 ? 1 : -1, 0.5);
        for (let i = 0; i < 3; i++) {
          ctx.globalAlpha = a * (0.7 - i * 0.2);
          ctx.strokeStyle = i ? p.color : '#ffffff';
          ctx.lineWidth = 5 - i;
          ctx.beginPath(); ctx.arc(0, 0, 30 + i * 10 + Math.sin(p.t * 12) * 3, -1.2, 1.2); ctx.stroke();
        }
      } else {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, (p.r || 20) * 1.6);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.4, p.color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, (p.r || 20) * 1.6, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }

    drawZone(ctx, z) {
      const k = U.clamp(z.life / 0.6, 0, 1);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.85 * k;
      ctx.strokeStyle = z.color;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(z.x, 0, z.r, z.r * 0.24, 0, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 0.1 * k;
      ctx.lineWidth = 10;
      ctx.stroke();
      const zg = ctx.createRadialGradient(z.x, 0, 0, z.x, 0, z.r);
      zg.addColorStop(0, z.color + '33');
      zg.addColorStop(0.72, z.color + '18');
      zg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = k;
      ctx.fillStyle = zg;
      ctx.beginPath();
      ctx.ellipse(z.x, 0, z.r, z.r * 0.24, 0, 0, TAU);
      ctx.fill();
      // 内部符文
      ctx.globalAlpha = 0.28 * k;
      const n = z.domain ? 10 : 6;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + this.realT * 0.5;
        const rr = z.r * 0.62;
        const x = z.x + Math.cos(a) * rr, y = Math.sin(a) * rr * 0.24;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-0.4);
        ctx.fillStyle = z.color;
        ctx.fillRect(-1, -12, 2, 24);
        ctx.restore();
      }
      // 拉拽线
      if (z.pull) {
        const e = this.enemy;
        if (Math.abs(e.x - z.x) > 10) {
          ctx.globalAlpha = 0.35 * k;
          ctx.strokeStyle = z.color;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(z.x, 0);
          ctx.lineTo(e.x, -e.y - 50);
          ctx.stroke();
        }
      }
      if (z.domain) {
        // 剑域：插在地面的剑 + 上升光柱
        const n2 = 9;
        for (let i = 0; i < n2; i++) {
          const a = (i / n2) * TAU + 0.3;
          const x = z.x + Math.cos(a) * z.r * 0.84;
          const y = Math.sin(a) * z.r * 0.2;
          const hh = 54 + Math.sin(this.realT * 2 + i) * 6;
          ctx.globalAlpha = 0.6 * k;
          ctx.strokeStyle = i % 2 ? '#e6dcff' : z.color;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - hh); ctx.stroke();
          ctx.globalAlpha = 0.25 * k;
          ctx.lineWidth = 6;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - hh); ctx.stroke();
        }
        const top = ctx.createLinearGradient(0, 0, 0, -220);
        top.addColorStop(0, z.color + '33');
        top.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = top;
        ctx.globalAlpha = 0.5 * k;
        ctx.beginPath();
        ctx.ellipse(z.x, 0, z.r, z.r * 0.24, 0, 0, Math.PI, true);
        ctx.lineTo(z.x - z.r, -220);
        ctx.lineTo(z.x + z.r, -220);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }

  MB.Battle = Battle;
})();
