/* ══════════════════════════════════════════════════════════
   镜刃 MIRROR EDGE — fighter.js
   战斗单位：状态机 / 命中 / 防反 / 闪避 / 破势
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const MB = window.MB;
  const U = MB.U;
  const TAU = U.TAU;

  const GRAV = 2150;
  const ARENA = 920;

  class Fighter {
    constructor(battle, char, side) {
      this.battle = battle;
      this.char = char;
      this.side = side;
      this.isPlayer = side === 'player';
      this.theme = char.theme;
      this.scale = char.scale || 1.16;

      this.hpMax = char.hp;
      this.hp = char.hp;
      this.postureMax = char.posture || 100;
      this.posture = this.postureMax;
      this.postureDelay = 0;

      this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
      this.facing = side === 'player' ? 1 : -1;
      this.state = 'idle'; this.stateT = 0; this.animT = Math.random() * 10;
      this.runPhase = 0;
      this.act = null; this.actT = 0; this.chainIdx = 0; this.chainT = 0;
      this.strikes = []; this.strikeI = 0;
      this.moveDir = 0;
      this.guarding = false; this.parryTimer = 0; this.parryCd = 0; this.parryCdMax = 3;
      this.parryActive = 0; this.parryElapsed = 0; this.parryPerfect = 0.22;
      this.guardHeldT = 0; this.guardLinger = 0; this.counterParry = 0;
      this.dashInv = 0; this.dashT = 0; this.dashCd = 0; this.airDash = 1;
      this.invulnT = 0; this.armorT = 0;
      this.hurtT = 0; this.staggered = false;
      this.comboHits = 0;
      this.flash = 0;
      this.dead = false;
      this.timers = [];
      this.buffs = {};
      this.status = {};
      this.cd = (char.skills || []).map(() => 0);
      this.ult = 0;
      this.ultReady = false;
      this.mirrorStacks = 0;
      this.trail = [];
      this.cape = MB.Skeleton.clothInit(6, 9.6 * (this.scale > 1.3 ? 1.2 : 1));
      this.hair = MB.Skeleton.clothInit(3, 7);
      this.coat = MB.Skeleton.clothInit(4, 10.5);
      this.pose = MB.Skeleton.clone(MB.Skeleton.BASE);
      this.poseSnap = this.pose;
      this.buffMul = { atk: 1, spd: 1, taken: 1 };
      this.lastHitBy = null;
      this.telegraph = null;
      this.intent = null;
      this.aura = 0;
      this.z = 0;
    }

    /* ───────── 基础 ───────── */
    get airborne() { return this.y > 1; }
    get hpRatio() { return U.clamp(this.hp / this.hpMax, 0, 1); }
    get postureRatio() { return U.clamp(this.posture / this.postureMax, 0, 1); }
    get opponent() { return this.battle.other(this); }
    get speedMul() {
      let m = this.buffMul.spd || 1;
      if (this.status.slow > 0) m *= 0.46;
      if (this.status.root > 0) m = 0;
      return m;
    }
    get atkMul() {
      let m = this.buffMul.atk || 1;
      if (this.status.rage > 0) m *= 1.5;
      if (this.status.mirrorForm > 0) m *= 1.25;
      return m;
    }
    get takenMul() {
      let m = this.buffMul.taken || 1;
      if (this.status.rage > 0) m *= 1.3;
      if (this.staggered) m *= 1.35;
      if (this.status.mark > 0) m *= 1.35;
      if (this.status.broken > 0) m *= 1.25;
      if (this.status.mirrorForm > 0) m *= 0.55;
      return m;
    }
    has(n) { return (this.status[n] || 0) > 0; }
    setStatus(n, dur, data) {
      if (!this.status[n] || this.status[n] < dur) this.status[n] = dur;
      if (data != null) this.status[n + '_d'] = data;
    }
    addTimer(t, fn) { this.timers.push({ t, fn, fire: false }); }

    canAct() {
      if (this.dead || this.hurtLock) return false;
      if (this.status.stun > 0) return false;
      return true;
    }

    resetState(s) {
      this.state = s; this.stateT = 0; this.animT = 0;
      this.act = null; this.actT = 0; this.strikes = []; this.strikeI = 0;
    }

    /* ───────── 物理 ───────── */
    physics(dt) {
      if (this.status.root > 0) this.vx *= Math.exp(-14 * dt);
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.y > 0) {
        this.vy -= GRAV * dt;
        this.vx *= Math.exp(-1.4 * dt);
        if (this.state !== 'dash' && this.state !== 'attack' && this.state !== 'skill' && this.state !== 'ult') {
          this.vx = U.approach(this.vx, this.moveDir * 320 * this.speedMul, 1400 * dt);
        }
      } else {
        if (this.vy < 0) { this.y = 0; this.vy = 0; this.onLand(); }
        this.y = 0;
      }
      if (this.y < 0) this.y = 0;
      const B = this.battle.bounds || ARENA;
      if (this.x < -B) { this.x = -B; this.vx = Math.max(0, this.vx); }
      if (this.x > B) { this.x = B; this.vx = Math.min(0, this.vx); }
    }

    onLand() {
      if (this.state === 'air' || this.state === 'dash' || this.state === 'skill') {
        if (this.state === 'air') this.resetState('idle');
        this.airDash = 1;
        this.battle.onLand(this);
      }
    }

    /* ───────── 每帧 ───────── */
    update(dt) {
      if (this.dead) {
        this.animT += dt;
        this.vx *= Math.exp(-6 * dt);
        this.physics(dt);
        this.vy = Math.min(this.vy, 0);
        MB.Skeleton.update(this, dt);
        return;
      }
      this.stateT += dt; this.animT += dt; this.actT += dt;
      this.flash = Math.max(0, this.flash - dt * 4);
      this.dashCd = Math.max(0, this.dashCd - dt);
      this.parryCd = Math.max(0, this.parryCd - dt);
      this.counterParry = Math.max(0, this.counterParry - dt);
      this.dashInv = Math.max(0, this.dashInv - dt);
      this.invulnT = Math.max(0, this.invulnT - dt);
      this.armorT = Math.max(0, this.armorT - dt);
      this.parryTimer = Math.max(0, this.parryTimer - dt);
      if (this.chainT > 0) { this.chainT -= dt; if (this.chainT <= 0) this.chainIdx = 0; }

      // 计时器
      for (let i = this.timers.length - 1; i >= 0; i--) {
        const tm = this.timers[i];
        tm.t -= dt;
        if (tm.t <= 0) { this.timers.splice(i, 1); try { tm.fn(this); } catch (e) { console.error(e); } }
      }
      // 状态计时
      for (const k in this.status) {
        if (k.endsWith('_d')) continue;
        if (this.status[k] > 0) this.status[k] = Math.max(0, this.status[k] - dt);
      }
      // 格挡预输入
      if (this.bufferedGuard > 0) {
        this.bufferedGuard -= dt;
        if (this.state === 'idle' || this.state === 'run') { this.bufferedGuard = 0; this.startGuard(); }
      }
      // 架势回复
      this.postureDelay = Math.max(0, this.postureDelay - dt);
      if (this.postureDelay <= 0 && !this.staggered) {
        this.posture = Math.min(this.postureMax, this.posture + (this.guarding ? 2 : 22) * dt);
      }
      // 终极槽
      if (this.ult < 100) {
        this.ult = Math.min(100, this.ult + dt * 1.6);
      }
      this.ultReady = this.ult >= 100;

      if (this.status.stun > 0 && this.state !== 'stagger' && this.state !== 'hurt' && this.state !== 'dead') {
        this.act = null;
        if (this.state !== 'bound') { this.state = 'bound'; this.stateT = 0; this.vx = 0; }
      }
      this.tickState(dt);
      this.physics(dt);
      this.faceMove(dt);
      MB.Skeleton.update(this, dt);
      // 残影
      if (this.state === 'dash' && Math.random() < 0.9) MB.FX.after(this, { life: 0.28, alpha: 0.5 });
      if (this.status.mirrorForm > 0 && Math.random() < 0.25) MB.FX.after(this, { life: 0.35, alpha: 0.25, color: '#b27bff' });
    }

    faceMove(dt) {
      if (this.dead) return;
      const free = this.state === 'idle' || this.state === 'run' || this.state === 'parry' || this.state === 'air';
      if (!free) return;
      if (this.moveDir > 0.12) this.facing = 1;
      else if (this.moveDir < -0.12) this.facing = -1;
    }

    /* ───────── 状态机 ───────── */
    tickState(dt) {
      const o = this.opponent;
      switch (this.state) {
        case 'idle':
        case 'run': {
          this.guarding = false;
          const sp = Math.abs(this.vx);
          this.runPhase += dt * (5.5 + sp * 0.028);
          if (this.airborne) { this.resetState('air'); break; }
          if (this.moveDir !== 0 && !(this.status.root > 0)) {
            this.vx = U.approach(this.vx, this.moveDir * 392 * this.speedMul, 2600 * dt);
            if (this.state !== 'run') this.setState('run');
          } else {
            this.vx = U.approach(this.vx, 0, 2600 * dt);
            if (this.state !== 'idle') this.setState('idle');
          }
          break;
        }
        case 'air': {
          if (this.airborne) {
            this.vx = U.approach(this.vx, this.moveDir * 340 * this.speedMul, 950 * dt);
            if (this.y <= 0) this.resetState('idle');
          }
          break;
        }
        case 'dash': {
          this.vx = this.facing * (this.dashDir || 1) * 690;
          this.dashT -= dt;
          if (this.dashT <= 0) { this.resetState('idle'); this.vx *= 0.35; }
          if (Math.random() < 0.35) MB.FX.spark(this.x - this.facing * 18, -this.y - 40, 1, { color: this.theme.glow, speed: 120, life: 0.3, size: 1.6 });
          break;
        }
        case 'attack':
        case 'skill':
        case 'ult': {
          if (this.state === 'attack' && this.airborne) this.vx *= Math.exp(-2 * dt);
          else this.vx *= Math.exp(-6 * dt);
          this.tickAction(dt);
          break;
        }
        case 'parry': {
          this.parryActive -= dt;
          this.parryElapsed += dt;
          this.vx = U.approach(this.vx, this.moveDir * 120, 2400 * dt);
          if (this.moveDir) this.runPhase += dt * 4;
          if (this.parryActive <= 0) {
            this.parryActive = 0;
            MB.FX.ring(this.x, -this.y - 55, 50, 14, { color: '#8a7bb8', life: 0.3, width: 1.6, squash: 1.1 });
            this.resetState('idle');
          }
          break;
        }
        case 'hurt': {
          this.vx *= Math.exp(-4.5 * dt);
          this.hurtT -= dt;
          if (this.hurtT <= 0 && !this.airborne) this.resetState('idle');
          if (this.airborne && this.stateT > 0.4) this.resetState('air');
          break;
        }
        case 'stagger': {
          this.vx *= Math.exp(-5 * dt);
          if (this.stateT > (this.staggerDur || 0.9)) {
            this.staggered = false;
            this.resetState('idle');
          }
          break;
        }
        case 'bound': {
          this.vx *= Math.exp(-10 * dt);
          if (this.status.stun <= 0) this.resetState('idle');
          break;
        }
        case 'dead': break;
      }
      if (this.state === 'hurt' && this.airborne && this.stateT > 0.5) this.setState('air');
    }

    setState(s) { this.state = s; this.stateT = 0; }

    tickAction() {
      const d = this.act;
      if (!d) { this.resetState('idle'); return; }
      if (this.buffered) {
        this.buffered.t -= 1 / 60;
        if (this.buffered.t <= 0) this.buffered = null;
        else if (this.canCancel()) {
          const b = this.buffered;
          this.buffered = null;
          if (b.kind === 'light' && this.chainIdx < this.char.light.length - 1) {
            this.chainIdx++;
            this.beginAction(this.char.light[this.chainIdx], 'attack');
            this.chainT = 0.9;
            return;
          }
          if (b.kind === 'heavy' && this.char.heavy) {
            this.beginAction(this.char.heavy, 'attack');
            return;
          }
        }
      }
      const t = this.actT;
      if (t >= (d.total || 0.5)) {
        if (d.hold && d.hold(this)) return;
        this.act = null;
        this.resetState(this.airborne ? 'air' : 'idle');
        return;
      }
      // 前冲
      if (d.lunge && !this._lunged && t >= (d.lunge.t || d.windup || 0)) {
        this._lunged = true;
        this.vx += this.facing * d.lunge.vx;
        if (d.lunge.vy) this.vy = d.lunge.vy;
      }
      // 拖尾只在挥砍阶段记录
      this.trailOn = t >= (d.windup || 0) - 0.02 && t <= (d.windup || 0) + (d.active || 0.1) + 0.05;
      // 多段命中
      while (this.strikeI < this.strikes.length && t >= this.strikes[this.strikeI]) {
        this.doStrike(d, this.strikeI);
        this.strikeI++;
      }
      // 发声
      if (d.sfxAt != null && !this._sfxDone && t >= d.sfxAt) {
        this._sfxDone = true;
        if (d.sfx === 'slash') MB.Sound.slash(1, d.heavy);
        else if (d.sfx) MB.Sound[d.sfx] ? MB.Sound[d.sfx]() : null;
      }
      if (d.onTick) d.onTick(this, t, d);
    }

    /* ───────── 起手 ───────── */
    beginAction(d, kind) {
      if (!d.name) d.name = kind === 'attack' ? 'attack' : 'skill';
      this.buffered = null;
      this.state = kind || 'skill';
      this.act = d; this.actT = 0; this.animT = 0; this.stateT = 0;
      this.trail.length = 0; this.trailOn = false;
      this._lunged = false; this._sfxDone = false;
      const act = d.active || 0.001;
      const n = d.hits || 1;
      this.strikes = [];
      for (let i = 0; i < n; i++) {
        this.strikes.push((d.windup || 0) + (n === 1 ? 0 : (act * i) / Math.max(1, n - 1)) * 0.92);
      }
      this.strikeI = 0;
      if (d.onBegin) d.onBegin(this);
      if (d.sfxAt == null && d.sfx) { MB.Sound[d.sfx] && MB.Sound[d.sfx](1, d.heavy); this._sfxDone = true; }
    }

    doStrike(d, idx) {
      const o = this.opponent;
      if (!o || o.dead) return;
      if (d.onStrike) { d.onStrike(this, idx, d); return; }
      if (d.projectile) {
        this.battle.spawnProjectile({
          x: this.x + this.facing * 50, y: -this.y - 62, vx: this.facing * 620, vy: 0,
          r: 30, life: 1.1, color: this.theme.glow, owner: this, dmg: d.dmg || 70,
          pierce: false, type: d.projectile === true ? 'wave' : d.projectile, posture: d.posture || 10, kb: 160,
        });
        MB.Sound.cast();
        return;
      }
      const hit = this.hitRect(d);
      if (this.rectHits(hit, o.bodyRect())) {
        o.receiveHit(this, d, idx);
        if (d.healOnHit) this.heal(d.healOnHit);
        if (d.onHit) d.onHit(this, o, idx);
      } else if (d.missFx) {
        d.missFx(this, idx);
      }
    }

    hitRect(d) {
      const s = this.scale;
      const a = this.x + this.facing * (d.minReach || 0) * s;
      const b = a + this.facing * d.reach * s;
      return {
        x0: Math.min(a, b), x1: Math.max(a, b),
        y0: this.y + (d.y0 == null ? 20 : d.y0) * s,
        y1: this.y + (d.y1 == null ? 110 : d.y1) * s,
      };
    }
    bodyRect() {
      const s = this.scale;
      return { x0: this.x - 19 * s, x1: this.x + 19 * s, y0: this.y + 4, y1: this.y + 104 * s };
    }
    rectHits(a, b) {
      return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
    }

    /* ───────── 玩家/AI 动作 ───────── */
    tryAttack(kind) {
      if (this.dead || !this.canAct()) return false;
      if (this.status.stun > 0) return false;
      const air = this.airborne;
      if (kind === 'heavy') {
        if (air) return false;
        if (this.state === 'attack' && this.char.heavy) {
          if (this.canCancel()) { this.beginAction(this.char.heavy, 'attack'); }
          else { this.buffered = { kind: 'heavy', t: 0.5 }; }
          return true;
        }
        if (this.state === 'idle' || this.state === 'run' || this.state === 'parry') {
          this.beginAction(this.char.heavy, 'attack'); return true;
        }
        return false;
      }
      if (air) {
        if (this.state === 'air' || (this.state === 'attack' && this.canCancel())) {
          this.beginAction(this.char.air, 'attack'); return true;
        }
        return false;
      }
      if (this.state === 'attack' && this.act && this.act.kind === 'light') {
        if (this.chainIdx >= this.char.light.length - 1) return false;
        if (this.canCancel()) {
          this.chainIdx++;
          this.beginAction(this.char.light[this.chainIdx], 'attack');
          this.chainT = 0.9;
        } else {
          // 预输入：连段窗口还没开就先记下，开了自动接
          this.buffered = { kind: 'light', t: 0.5 };
        }
        return true;
      }
      if (this.state === 'idle' || this.state === 'run' || this.state === 'parry') {
        this.chainIdx = 0;
        this.beginAction(this.char.light[0], 'attack');
        this.chainT = 0.9;
        return true;
      }
      return false;
    }

    canCancel() {
      const d = this.act;
      if (!d) return false;
      return this.actT >= (d.total || 0.4) * (d.cancelFrom == null ? 0.55 : d.cancelFrom);
    }

    tryJump() {
      if (this.dead || !this.canAct() || this.airborne) return false;
      if (this.state !== 'idle' && this.state !== 'run' && this.state !== 'guard') return false;
      this.vy = 720; this.y = 0.1;
      this.resetState('air');
      this.vx += this.moveDir * 120;
      this.airDash = 1;
      MB.Sound.jump();
      this.battle.onJump(this);
      return true;
    }

    tryDash(dir) {
      if (this.dead || !this.canAct()) return false;
      if (this.dashCd > 0) return false;
      if (this.airborne && this.airDash <= 0) return false;
      if (this.airborne) this.airDash--;
      this.dashDir = dir || (this.moveDir || this.facing);
      this.facing = this.dashDir > 0 ? 1 : -1;
      this.state = 'dash'; this.stateT = 0; this.dashT = 0.24; this.dashCd = 0.44;
      this.dashInv = 0.22;
      this.vy = this.airborne ? Math.max(this.vy, -40) : 0;
      if (!this.airborne) this.y = 0;
      this.parryTimer = Math.max(this.parryTimer, 0);
      MB.Sound.dash();
      MB.FX.ring(this.x, -this.y - 40, 10, 62, { color: this.theme.glow, life: 0.3, width: 2, squash: 0.35 });
      for (let i = 0; i < 8; i++) MB.FX.spark(this.x, -this.y - U.rand(70, 10), 2, { color: this.theme.glow, speed: 190, life: 0.35, size: 1.6 });
      return true;
    }

    startParry() {
      if (this.dead || this.status.stun > 0) return false;
      if (this.parryActive > 0) return false;
      if (this.parryCd > 0) {
        if (this.isPlayer) {
          MB.FX.text(this.x, -this.y - 140, '冷却中', { color: '#7f8b98', size: 13 });
          MB.FX.ring(this.x, -this.y - 55, 26, 40, { color: '#5a6470', life: 0.22, width: 1.2, squash: 1.1 });
        }
        return false;
      }
      if (this.state === 'hurt') { this.bufferedGuard = 0.3; return false; }
      if (this.state === 'stagger' || this.state === 'bound') return false;
      // 可以随时打断自己的普攻
      this.act = null;
      this.buffered = null;
      this.state = 'parry';
      this.stateT = 0;
      this.parryActive = 1.5;
      this.parryElapsed = 0;
      this.parryPerfect = this.isPlayer ? this.battle.perfectWindow : 0.16;
      this.parryCd = this.isPlayer
        ? (this.status.insight > 0 ? 2.0 : 3.0)
        : 2.8;
      this.parryCdMax = this.parryCd;
      MB.Sound.ui();
      MB.FX.ring(this.x, -this.y - 55, 8, 54, { color: '#d8c8ff', life: 0.26, width: 2, squash: 1.1 });
      return true;
    }
    startGuard() { return this.startParry(); }
    endGuard() { this.parryActive = 0; if (this.state === 'parry') this.resetState('idle'); }

    useSkill(i) {
      if (this.dead || !this.canAct()) return false;
      const id = (this.char.skills || [])[i];
      if (!id) return false;
      const def = MB.SKILLS[id];
      if (!def) return false;
      const free = this.status.echo > 0 || this.status.freeCast > 0;
      if (this.cd[i] > 0 && !free) return false;
      if (this.airborne && !def.air) return false;
      if (!def.instant && this.state !== 'idle' && this.state !== 'run' && this.state !== 'guard' && !(this.state === 'attack' && this.canCancel())) return false;
      this.cd[i] = free ? 0 : def.cd;
      if (free) { this.status.echo = 0; this.status.freeCast = 0; }
      if (this.state === 'guard') this.endGuard();
      this.battle.onSkill(this, def, i);
      def.cast(this);
      return true;
    }

    useUlt() {
      if (this.dead || !this.canAct() || this.ult < 100) return false;
      this.ult = 0; this.ultReady = false;
      this.battle.startUlt(this);
      return true;
    }

    /* ───────── 受击 ───────── */
    receiveHit(attacker, def, idx) {
      if (this.dead) return;
      if (this.status.invuln > 0 || this.invulnT > 0) return;
      // 完美防反也可以被完美防反（镜返）
      if (this.counterParry > 0 && attacker && attacker.isPlayer && !def.unblockable) {
        this.counterParry = 0;
        this.battle.counterParry(this, attacker, def);
        return;
      }
      // 闪避无敌帧
      if (this.dashInv > 0) {
        if (!this._dodgeCounted) {
          this._dodgeCounted = true;
          this.battle.perfectDodge(this, attacker, def);
          this.addTimer(0.35, () => { this._dodgeCounted = false; });
        }
        return;
      }
      if (!def.unblockable && this.parryActive > 0) {
        this.battle.resolveParry(this, attacker, def);
        return;
      }
      this.takeHit(attacker, def, idx);
    }

    guardBreak() {
      this.staggered = true;
      this.staggerDur = 1.2;
      this.setState('stagger');
      this.stateT = 0;
      this.battle.onGuardBreak(this);
      if (this.isPlayer && MB.SAVE && MB.UI) { MB.SAVE.stats.guardBreaks = (MB.SAVE.stats.guardBreaks || 0) + 1; MB.UI.checkAchv('guard10'); }
    }

    takeHit(attacker, def, idx) {
      const scale = def.dmgScale ? def.dmgScale(idx) : 1;
      const raw = def.dmg * scale;
      this.battle.applyDamage(this, attacker, raw, {
        posture: def.posture, def, idx, big: !!(def.heavy || raw >= 120),
      });
      if (this.dead) return;
      const kb = (def.kb || 120) * (this.armorT > 0 ? 0.25 : 1);
      this.vx += attacker.facing * kb;
      if (def.kbUp) { this.vy = Math.max(this.vy, def.kbUp); this.y = Math.max(this.y, 0.2); }
      if (this.posture <= 0 && !this.armorT) {
        this.posture = 0;
        this.staggerDur = 1.0;
        this.staggered = true;
        this.setState('stagger'); this.stateT = 0; this.act = null;
        this.battle.onStagger(this, attacker);
        return;
      }
      if (this.armorT > 0) return;
      if (def.stagger) {
        this.staggerDur = def.stagger;
        this.staggered = true;
        this.setState('stagger'); this.stateT = 0; this.act = null;
        return;
      }
      this.act = null;
      this.guarding = false;
      this.hurtT = def.hurtT || 0.26;
      this.setState('hurt');
      this.stateT = 0;
    }

    die(attacker) {
      this.dead = true; this.hp = 0;
      this.state = 'dead'; this.stateT = 0; this.act = null;
      this.vx = (attacker ? attacker.facing : 1) * 220;
      this.vy = Math.max(0, this.vy);
      this.battle.onDeath(this, attacker);
    }

    heal(v) {
      this.hp = Math.min(this.hpMax, this.hp + v);
      MB.FX.text(this.x, -this.y - 120, '+' + Math.round(v), { color: '#7dffb0', size: 17, glow: true });
      MB.FX.ember(this.x, -this.y - 60, 10, { color: '#7dffb0', r: 26 });
    }

    /* ───────── 绘制 ───────── */
    draw(ctx, reflection) {
      if (this.dead && this.stateT > 3) return;
      if (reflection) {
        ctx.save();
        ctx.globalAlpha = 0.06;
        ctx.scale(1, -1);
        this._draw(ctx, true);
        ctx.restore();
        return;
      }
      this._draw(ctx, false);
    }

    _draw(ctx, reflection) {
      if (this.dead && this.stateT > 3) return;
      // 地面阴影
      const sh = U.clamp(1 - this.y / 380, 0.25, 1);
      ctx.save();
      ctx.globalAlpha = 0.42 * sh;
      const g = ctx.createRadialGradient(this.x, 0, 0, this.x, 0, 52 * this.scale);
      g.addColorStop(0, 'rgba(0,0,0,.9)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      if (!reflection) ctx.ellipse(this.x, 0, 52 * this.scale * sh, 13 * sh, 0, 0, TAU);
      ctx.fill();
      ctx.restore();

      // 底层光晕
      if (!this.dead && !reflection) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const b = 34 + (this.status.mirrorForm > 0 ? 20 : 0) + (this.status.rage > 0 ? 18 : 0);
        const sp = MB.FX.glowSprite(this.status.rage > 0 ? '#ff5566' : this.theme.glow);
        const rr = b * this.scale * 1.9;
        ctx.globalAlpha = 0.18;
        ctx.drawImage(sp, this.x - rr, -this.y - 52 * this.scale - rr, rr * 2, rr * 2);
        ctx.restore();
      }

      // 受击闪白
      if (this.flash > 0.01) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = this.flash * 0.55;
        MB.Skeleton.draw(ctx, this, '#ffffff');
        ctx.restore();
      }
      MB.Skeleton.draw(ctx, this);

      // 防反姿态
      if (!reflection && this.state === 'parry' && this.parryActive > 0) {
        const k = U.clamp(this.parryActive / 1.5, 0, 1);
        const inPerfect = this.parryElapsed <= this.parryPerfect;
        const cx = this.x + this.facing * 24, cy = -this.y - 58;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(cx, cy);
        ctx.scale(this.facing, 1);
        for (let i = 0; i < 3; i++) {
          ctx.globalAlpha = (inPerfect ? 0.75 : 0.4) - i * 0.1;
          ctx.strokeStyle = i === 0 ? '#ffffff' : (inPerfect ? '#ffe9a8' : '#b9a8ff');
          ctx.lineWidth = inPerfect ? 2.6 : 1.8;
          ctx.beginPath();
          ctx.arc(0, 0, 34 + i * 7 + (1 - k) * 10, -1.25, 1.25);
          ctx.stroke();
        }
        // 剩余时间弧
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = inPerfect ? '#ffe9a8' : '#8fd8ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 52, -Math.PI / 2, -Math.PI / 2 + U.TAU * k);
        ctx.stroke();
        ctx.restore();
      }
      if (!reflection && false) {
        const t = performance.now() * 0.004;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(this.x + this.facing * 30, -this.y - 62);
        ctx.scale(this.facing, 1);
        for (let i = 0; i < 3; i++) {
          ctx.globalAlpha = (0.4 - i * 0.1) + Math.sin(t + i) * 0.06;
          ctx.strokeStyle = i === 0 ? '#ffffff' : this.theme.glow;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(0, 0, 30 + i * 6, -1.15, 1.15);
          ctx.stroke();
        }
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = this.theme.glow;
        ctx.beginPath();
        ctx.arc(0, 0, 34, -1.15, 1.15);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // 蓄力/预警
      if (this.telegraph && !reflection) this.drawTelegraph(ctx);

      // 被标记
      if (this.status.mark > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = '#ff8fa0';
        ctx.globalAlpha = 0.5 + Math.sin(performance.now() * 0.008) * 0.2;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(this.x, 0);
        ctx.lineTo(this.x, -this.y - 130 * this.scale);
        ctx.stroke();
        ctx.restore();
      }
    }

    drawTelegraph(ctx) {
      const t = this.telegraph;
      const k = U.clamp(t.t / t.dur, 0, 1);
      const y = -this.y - 112 * this.scale;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      // 头顶预警环：进度 = 出招进度
      ctx.globalAlpha = 0.55 + Math.sin(performance.now() * 0.022) * 0.25;
      ctx.strokeStyle = t.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, y, 15, -Math.PI / 2, -Math.PI / 2 + TAU * k);
      ctx.stroke();
      ctx.globalAlpha = 0.16;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(this.x, y, 15, -Math.PI / 2, -Math.PI / 2 + TAU * k);
      ctx.stroke();
      // 危险核心
      const pulse = 0.5 + Math.sin(performance.now() * 0.03) * 0.3;
      const sp = MB.FX.glowSprite(t.color);
      const rr = 26 + k * 12;
      ctx.globalAlpha = 0.5 * pulse;
      ctx.drawImage(sp, this.x - rr, y - rr, rr * 2, rr * 2);
      // 刀身高亮
      ctx.globalAlpha = 0.5 + k * 0.5;
      ctx.strokeStyle = t.color;
      ctx.lineWidth = 3;
      const w = MB.Skeleton.weaponPts(this, this.skel, this.pose);
      ctx.beginPath();
      ctx.moveTo(w.base.x, w.base.y); ctx.lineTo(w.tip.x, w.tip.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  MB.Fighter = Fighter;
  MB.ARENA = ARENA;
})();
