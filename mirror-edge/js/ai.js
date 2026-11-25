/* ══════════════════════════════════════════════════════════
   镜刃 MIRROR EDGE — ai.js
   敌人行为：试探 / 变招 / 防反 / 惩罚
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const MB = window.MB;
  const U = MB.U;

  class AI {
    constructor(fighter, battle, diff) {
      this.f = fighter;
      this.b = battle;
      this.diff = diff;
      this.prof = Object.assign({ aggro: 0.6, react: 0.3, block: 0.25, dodge: 0.15, feint: 0.1, spacing: 120, combo: 0.5, speed: 1 }, fighter.char.ai || {});
      this.t = 0;
      this.decideCd = 0.4;
      this.cd = {};
      this.moveDir = 0;
      this.reactKey = null;
      this.feinting = false;
      this.phase = 1;
      this.tauntT = 2.5;
      this.desired = this.prof.spacing + U.rand(40, -30);
      this.idleT = 0;
    }

    reset() { this.t = 0; this.decideCd = 0.4; this.cd = {}; }

    update(dt) {
      const f = this.f, p = f.opponent;
      if (!p || f.dead || p.dead || this.b.over) { f.moveDir = 0; return; }
      this.t += dt;
      const speedScale = this.diff.aiSpeed;
      const dist = Math.abs(p.x - f.x);
      const dir = p.x >= f.x ? 1 : -1;

      // 二阶段
      if (this.phase === 1 && f.hp < f.hpMax * 0.5 && f.char.id !== 'dummy') {
        this.phase = 2;
        this.b.onEnemyPhase(f, 2);
        this.prof.aggro = Math.min(1, this.prof.aggro + 0.18);
        this.prof.feint = Math.min(0.6, this.prof.feint + 0.15);
      }

      if (!f.canAct()) { f.moveDir = 0; return; }

      // 起手前摇：显示预警
      if (f.state === 'attack' && f.act) {
        if (f.actT < (f.act.windup || 0)) {
          f.telegraph = { t: f.actT, dur: f.act.windup, color: f.act.unblockable ? '#ff3550' : (f.act.telegraph || '#cfe8ff') };
        } else f.telegraph = null;
        f.moveDir = 0;
        return;
      }
      f.telegraph = null;

      this.reactToPlayer(dt, p, dist, dir);

      // 被定身/硬直
      if (f.state === 'stagger' || f.state === 'hurt' || f.state === 'bound') { f.moveDir = 0; return; }

      this.decideCd -= dt;
      if (this.decideCd <= 0) {
        this.decideCd = (0.16 + U.rand(0.22)) * this.diff.aiReact;
        this.decide(dist, dir);
      }
      this.move(dt, dist, dir, speedScale);
    }

    reactToPlayer(dt, p, dist, dir) {
      if (p.state !== 'attack' || !p.act) { this.reactKey = null; return; }
      const key = p.act.id + '@' + Math.round(p.actT * 100);
      if (this.reactKey === p.act.id) return;
      const remain = (p.act.windup || 0) - p.actT;
      if (remain <= 0.01 || remain > 0.22) return;
      this.reactKey = p.act.id;
      const d = this.diff;
      const unblock = !!p.act.unblockable;
      const blockChance = this.prof.block * (unblock ? 0 : 1) * (d.unblockBias != null ? 1 : 1);
      if (p.act.dmg >= 90) {
        // 大招：优先闪避
        if (U.chance(this.prof.dodge * 1.3)) { this.f.tryDash(-dir); return; }
      }
      if (!unblock && U.chance(blockChance)) {
        if (this.f.char.canParry && U.chance(0.28 * (0.6 + d.punish))) {
          this.f.startGuard();
        } else {
          this.f.startGuard();
        }
        return;
      }
      if (U.chance(this.prof.dodge * (unblock ? 2.2 : 1))) {
        this.f.tryDash(U.chance(0.5) ? -dir : dir);
      }
    }

    decide(dist, dir) {
      const f = this.f, p = f.opponent;
      const alive = this.b.aliveTime;
      if (alive < this.tauntT) {
        // 开场对峙
        this.moveDir = dist > this.desired + 60 ? dir : 0;
        if (dist < 190 && alive > this.tauntT * 0.7) this.tryAttack(dist);
        return;
      }
      const aggro = this.prof.aggro * (0.7 + this.diff.punish * 0.35);
      // 惩罚：玩家后摇
      const punishing = p.state === 'attack' && p.act && p.actT > (p.act.total || 0.4) * 0.72;
      if (punishing && dist < 210 && U.chance(0.5 + aggro * 0.4)) {
        this.tryAttack(dist, true);
        return;
      }
      // 技能
      if (f.char.skills && f.char.skills.length && U.chance(0.35 * this.prof.aggro)) {
        const idx = U.randInt(0, f.char.skills.length - 1);
        if (f.cd[idx] <= 0 && dist > 90 && dist < 340) {
          if (f.useSkill(idx)) return;
        }
      }
      if (U.chance(aggro)) {
        if (dist < 230) { if (this.tryAttack(dist)) return; }
        this.moveDir = dir;
      } else {
        // 拉开距离 / 绕步
        if (dist < this.desired - 30) this.moveDir = -dir;
        else if (dist > this.desired + 80) this.moveDir = dir;
        else this.moveDir = U.chance(0.5) ? 0 : (U.chance(0.5) ? 1 : -1);
      }
      if (f.airborne && dist < 150 && U.chance(0.4)) this.tryAttack(dist);
    }

    tryAttack(dist, punish) {
      const f = this.f;
      if (f.state !== 'idle' && f.state !== 'run') return false;
      if (this.t < this.tauntT) return false;
      const list = (f.char.attacks || []).filter((a) => !a.hide && dist >= a.range[0] - 20 && dist <= a.range[1] + 30);
      if (!list.length) return false;
      // 变招：偶尔故意慢半拍
      let pool = list.slice();
      if (this.diff.unblockBias > 0.4) {
        const ub = pool.filter((a) => a.unblockable);
        if (ub.length && U.chance(this.diff.unblockBias * 0.35)) pool = ub.concat(pool);
      }
      let total = 0;
      const weights = pool.map((a) => {
        const w = (a.weight || 1) * (punish ? 1.4 : 1);
        total += w; return w;
      });
      let r = Math.random() * total, pick = pool[0];
      for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) { pick = pool[i]; break; } }
      // 冷却
      this.cd[pick.id] = (this.cd[pick.id] || 0);
      if (this.cd[pick.id] > 0) return false;

      const speed = this.diff.aiSpeed * (this.phase > 1 ? 1.12 : 1);
      f.facing = f.opponent.x >= f.x ? 1 : -1;
      f.beginAction(Object.assign({}, pick, {
        windup: pick.windup / speed,
        recover: pick.recover / speed,
        total: (pick.windup + pick.active + pick.recover) / speed,
      }), 'attack');
      f.telegraph = { t: 0, dur: f.act.windup, color: pick.unblockable ? '#ff3550' : (pick.telegraph || '#cfe8ff') };
      MB.Sound.slash(0.85);
      this.cd[pick.id] = 0.55 + Math.random() * 0.8;

      // 连段
      if (pick.chain && U.chance(this.prof.combo)) {
        const chain = (f.char.attacks || []).find((a) => a.id === pick.chain);
        if (chain) {
          f.addTimer(f.act.windup + f.act.active * 0.6, () => {
            if (f.dead || f.state !== 'attack') return;
            f.beginAction(Object.assign({}, chain, {
              windup: chain.windup / speed, recover: chain.recover / speed,
              total: (chain.windup + chain.active + chain.recover) / speed,
            }), 'attack');
          });
        }
      }
      // 变招（假动作）：中途取消再换一招
      if (U.chance(this.prof.feint * this.diff.feint * 2.2) && !pick.unblockable) {
        const alt = (f.char.attacks || []).filter((a) => !a.hide && a.id !== pick.id && dist <= a.range[1] + 40);
        if (alt.length) {
          const nb = U.pick(alt);
          f.addTimer(f.act.windup * 0.55, () => {
            if (f.dead || f.state !== 'attack' || f.actT > f.act.windup * 0.85) return;
            f.telegraph = { t: 0, dur: nb.windup, color: nb.unblockable ? '#ff3550' : '#ffe9a8' };
            f.beginAction(Object.assign({}, nb, {
              windup: nb.windup / 1.24, recover: nb.recover / speed,
              total: (nb.windup + nb.active + nb.recover) / speed,
            }), 'attack');
            MB.FX.ring(f.x, -f.y - 100, 6, 44, { color: '#ffe9a8', life: 0.25, width: 1.5 });
            MB.Sound.slash(1.2);
          });
        }
      }
      return true;
    }

    move(dt, dist, dir, speedScale) {
      const f = this.f;
      if (f.state === 'attack' || f.state === 'stagger' || f.state === 'hurt' || f.state === 'bound') { f.moveDir = 0; return; }
      if (dist > this.desired + 50) f.moveDir = dir;
      else if (dist < this.desired - 60) f.moveDir = -dir;
      else f.moveDir = 0;
      // 高度差处理
      const p = f.opponent;
      if (p.airborne && p.y > 80 && dist < 150 && f.state === 'idle' && U.chance(0.02)) f.tryJump();
      // 冷却递减
      for (const k in this.cd) if (this.cd[k] > 0) this.cd[k] -= dt;
      // 无动作时的微调
      if (f.state === 'idle' && dist < 62 && this.t > this.tauntT) f.moveDir = -dir;
    }
  }

  MB.AI = AI;
})();
