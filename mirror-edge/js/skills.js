/* ══════════════════════════════════════════════════════════
   镜刃 MIRROR EDGE — skills.js
   技能行为 / 镜反之型 / 终极技
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const MB = window.MB;
  const U = MB.U;
  const TAU = U.TAU;
  const AN = MB.AN;
  const PZ = MB.Skeleton.POSES;

  const SKILLS = (MB.SKILLS = {});
  const PARRY = (MB.PARRY = {});

  const col = {
    cyan: '#a8f4ff', ice: '#eaffff', violet: '#c9a8ff', gold: '#ffd58a', red: '#ff6b7d', green: '#8dffc0', white: '#ffffff',
  };

  function dmg(b, target, source, amount, o = {}) {
    if (!target || target.dead) return;
    b.applyDamage(target, source, amount, o);
  }
  function angTo(a, b) { return Math.atan2((b.y) - (a.y), b.x - a.x); }

  /* ═════════ 技能 ═════════ */
  const BEH = {};

  BEH.voidslash = {
    cast(f) {
      const b = f.battle;
      f.beginAction({
        total: 0.56, windup: 0.17, active: 0.04, anim: AN.slashH, cancelFrom: 0.62,
        onStrike(self) {
          const p = { x: self.x + self.facing * 46, y: -self.y - 66, vx: self.facing * 1080, vy: 0, r: 30, life: 0.85, color: col.cyan, owner: self, dmg: 118, pierce: true, type: 'crescent' };
          b.spawnProjectile(p);
          b.shake(6);
          MB.Sound.slash(0.7, true);
        },
        onTick(self, t) {
          if (t > 0.14 && !self._vs) {
            self._vs = true;
            MB.FX.slash(self.x + self.facing * 54, -self.y - 64, 0, 92, { color: col.ice, width: 16, arc: 1.9 });
          }
        },
      }, 'skill');
    },
  };

  BEH.mirrorstep = {
    cast(f) {
      const b = f.battle;
      const ox = f.x, of = f.facing;
      f.invulnT = 0.2;
      MB.FX.after(f, { life: 0.5, alpha: 0.8 });
      f.x = U.clamp(f.x - f.facing * 220, -MB.ARENA, MB.ARENA);
      f.facing = -of;
      MB.FX.spark(ox, -20, 16, { color: col.violet, speed: 420, life: 0.4 });
      MB.FX.ring(ox, -60, 8, 90, { color: col.violet, life: 0.4, width: 2 });
      MB.Sound.dash();
      b.spawnSummon({
        x: ox, y: 0, life: 0.85, t: 0, done: false, f,
        update(s, dt) {
          s.t += dt;
          if (!s.done && s.t > 0.38) {
            s.done = true;
            const e = b.other(f);
            const px = s.x + of * 60;
            MB.FX.slash(px, -46, of > 0 ? 0 : Math.PI, 86, { color: col.violet, width: 14, arc: 1.8, life: 0.3 });
            MB.FX.ring(px, -46, 6, 70, { color: col.violet, life: 0.3, width: 2 });
            if (e && !e.dead && Math.abs(e.x - s.x) < 140 && Math.abs(e.y) < 120) {
              f.opponent.receiveHit(f, { dmg: 74, posture: 16, kb: 200, kbUp: 120, unblockable: true, hitstop: 0.06 }, 0);
              b.shake(5);
            }
          }
        },
        draw(ctx, s) {
          const a = U.clamp(1 - s.t / 0.9, 0, 1);
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = a * 0.55;
          ctx.fillStyle = col.violet;
          ctx.beginPath();
          ctx.ellipse(s.x + 4, -58, 16, 60, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
        },
      });
    },
  };

  BEH.ironwall = {
    instant: true, air: true,
    cast(f) {
      const b = f.battle;
      f.setStatus('shield', 3.2); f.status.shield_hp = 280;
      MB.FX.ring(f.x, -f.y - 58, 12, 110, { color: col.gold, life: 0.45, width: 3 });
      MB.FX.ring(f.x, -f.y - 58, 60, 92, { color: col.ice, life: 0.6, width: 1.4 });
      MB.Sound.cast();
      b.shake(4);
    },
  };

  BEH.insight = {
    instant: true, air: true,
    cast(f) {
      const b = f.battle;
      f.setStatus('insight', 6.5);
      MB.FX.ring(f.x, -f.y - 62, 10, 150, { color: col.cyan, life: 0.7, width: 2 });
      MB.FX.text(f.x, -f.y - 150, '识破', { color: col.cyan, size: 20 });
      MB.Sound.cast();
      b.flashScreen('rgba(120,230,255,.10)', 0.3);
    },
  };

  BEH.gravity = {
    cast(f) {
      const b = f.battle, e = f.opponent;
      f.beginAction({ total: 0.55, windup: 0.2, active: 0.02, anim: AN.cast, onStrike(self) {
        const tx = e ? e.x : self.x + self.facing * 160;
        b.spawnZone({
          x: tx, y: 0, r: 118, life: 2.2, t: 0, color: col.violet, owner: self,
          pull: 400, slow: 0.5, tickRate: 0.25, dmg: 16,
        });
        MB.FX.ring(tx, -70, 14, 130, { color: col.violet, life: 0.5, width: 3 });
        b.shake(5);
        MB.Sound.cast('dark');
      } }, 'skill');
    },
  };

  BEH.bladerain = {
    cast(f) {
      const b = f.battle;
      f.beginAction({
        total: 0.95, windup: 0.22, active: 0.02, anim: AN.castSlam, onStrike(self) {
          const e = self.opponent;
          const cx = e ? e.x : self.x;
          self.y = Math.max(self.y, 30); self.vy = Math.max(self.vy, 260);
          for (let i = 0; i < 9; i++) {
            const tx = U.clamp(cx + U.rand(160, -160), -b.bounds, b.bounds);
            b.later(0.05 + i * 0.055, () => {
              b.spawnProjectile({
                x: tx, y: -U.rand(560, 420), vx: 0, vy: -1750, r: 22, life: 1.1, color: col.ice,
                owner: self, dmg: 46, pierce: true, type: 'blade', gravity: 0, spin: 1,
                onUpdate(p) {
                  if (!p.grounded && p.y > -8) {
                    p.grounded = true; p.life = 0.05;
                    MB.FX.ring(p.x, -2, 6, 62, { color: col.cyan, life: 0.3, width: 2.2, squash: 0.3 });
                    MB.FX.spark(p.x, -8, 10, { color: col.cyan, speed: 300, life: 0.32 });
                    b.shake(2);
                    if (e && !e.dead && Math.abs(e.x - p.x) < 52 && e.y < 40) {
                      b.applyDamage(e, self, 46, { posture: 8, kb: 40, color: col.ice });
                    }
                  }
                },
              });
            });
          }
          b.shake(7);
          MB.Sound.cast();
        },
      }, 'skill');
    },
  };

  BEH.blinkkill = {
    cast(f) {
      const b = f.battle, e = f.opponent;
      f.beginAction({ total: 0.62, windup: 0.1, active: 0.03, anim: AN.airSlash, onStrike(self) {
        if (!e) return;
        const behind = e.facing > 0 ? -1 : 1;
        self.facing = -e.facing;
        self.x = U.clamp(e.x + behind * 62, -MB.ARENA, MB.ARENA);
        self.y = Math.max(self.y, 40);
        MB.FX.after(f, { life: 0.45, alpha: 0.7, color: col.violet });
        MB.FX.ring(self.x, -self.y - 52, 6, 80, { color: col.violet, life: 0.3, width: 2 });
        MB.Sound.dash();
        b.later(0.1, () => {
          if (e.dead) return;
          MB.FX.slash(e.x, -e.y - 58, U.rand(TAU), 110, { color: col.ice, width: 18, arc: 2.2 });
          b.applyDamage(e, self, 186, { posture: 30, kb: 260, kbUp: 160, big: true, label: '影杀' });
          self.setStatus('blink2', 1.1);
          b.shake(10);
          b.hitstop(0.09);
        });
      } }, 'skill');
    },
  };

  BEH.chrono = {
    cast(f) {
      const b = f.battle, e = f.opponent;
      f.beginAction({ total: 0.6, windup: 0.22, active: 0.02, anim: AN.cast, onStrike(self) {
        if (!e) return;
        const dur = e.char.skills ? 0.9 : 1.5;
        e.setStatus('stun', dur);
        e.act = null; e.attack = null;
        MB.FX.ring(e.x, -e.y - 60, 8, 120, { color: col.cyan, life: 0.5, width: 3 });
        for (let i = 0; i < 14; i++) {
          MB.FX.add({ type: 'shard', x: e.x + U.rand(30, -30), y: -e.y - U.rand(110, 10), vx: U.rand(30, -30), vy: U.rand(-20, 20), g: 0, rot: U.rand(TAU), vr: 2, size: U.rand(8, 3), life: U.rand(1.4, 0.6), color: '#bff6ff', alpha: 0.9 });
        }
        b.flashScreen('rgba(180,240,255,.15)', 0.25);
        MB.FX.text(e.x, -e.y - 150, '缚', { color: col.cyan, size: 24 });
        MB.Sound.cast('dark');
      } }, 'skill');
    },
  };

  BEH.chainpull = {
    cast(f) {
      const b = f.battle, e = f.opponent;
      f.beginAction({ total: 0.5, windup: 0.14, active: 0.02, anim: AN.thrust, onStrike(self) {
        if (!e) return;
        const dx = e.x - self.x;
        const airborne = e.y > 20;
        MB.FX.add({ type: 'blade', x0: self.x, y0: -self.y - 60, x1: e.x, y1: -e.y - 60, life: 0.22, width: 4, color: col.gold });
        MB.Sound.cast('dark');
        if (airborne) {
          self.x = U.clamp(e.x - self.facing * 50, -MB.ARENA, MB.ARENA);
          self.y = e.y + 30; self.vy = 200;
          self.facing = Math.sign(dx) || self.facing;
          b.later(0.12, () => { MB.FX.slash(e.x, -e.y - 50, 0, 90, { color: col.ice, width: 14 }); b.applyDamage(e, self, 96, { posture: 20, kb: 200, kbUp: 200 }); });
        } else {
          e.x = U.clamp(self.x + self.facing * 62, -MB.ARENA, MB.ARENA);
          e.vx = self.facing * 220;
          e.setState('hurt'); e.stateT = 0; e.hurtT = 0.3;
          b.applyDamage(e, self, 52, { posture: 22, kb: 60 });
        }
        MB.FX.ring(e.x, -60, 6, 70, { color: col.gold, life: 0.3, width: 2 });
      } }, 'skill');
    },
  };

  BEH.domain = {
    cast(f) {
      const b = f.battle;
      f.beginAction({ total: 0.6, windup: 0.2, active: 0.02, anim: AN.castSlam, onStrike(self) {
        b.spawnZone({ x: self.x, y: 0, r: 175, life: 6.5, t: 0, color: col.violet, owner: self, slow: 0.6, tickRate: 0.5, dmg: 24, domain: true });
        b.shake(8);
        MB.Sound.cast('dark');
        MB.FX.ring(self.x, -4, 20, 190, { color: col.violet, life: 0.8, width: 3, squash: 0.28 });
      } }, 'skill');
    },
  };

  BEH.reflect = {
    instant: true, air: true,
    cast(f) {
      f.setStatus('reflect', 3.2);
      MB.FX.ring(f.x, -f.y - 60, 10, 120, { color: col.gold, life: 0.5, width: 2 });
      MB.Sound.cast();
    },
  };

  BEH.bloodrage = {
    instant: true,
    cast(f) {
      f.setStatus('rage', 8.5);
      f.setStatus('lifesteal', 8.5);
      MB.FX.ring(f.x, -f.y - 60, 10, 140, { color: col.red, life: 0.5, width: 3 });
      MB.FX.ember(f.x, -f.y - 60, 26, { color: '#ff5566', r: 40, life: 1.2 });
      MB.FX.text(f.x, -f.y - 160, '狂', { color: col.red, size: 26, bold: true });
      MB.Sound.cast('dark');
    },
  };

  BEH.stillness = {
    instant: true,
    cast(f) {
      f.heal(f.hpMax * 0.14);
      f.setStatus('calm', 6);
      f.setStatus('slow', 6);
      MB.FX.ring(f.x, -f.y - 60, 8, 110, { color: col.green, life: 0.7, width: 2 });
      MB.FX.ember(f.x, -f.y - 50, 18, { color: '#8dffc0', r: 34, life: 1.4 });
      MB.Sound.cast();
    },
  };

  BEH.sacrifice = {
    instant: true, air: true,
    cast(f, slot) {
      const b = f.battle;
      f.hp = Math.max(1, f.hp - f.hpMax * 0.08);
      MB.FX.text(f.x, -f.y - 140, '献祭', { color: col.red, size: 18 });
      MB.FX.spark(f.x, -f.y - 60, 24, { color: '#ff5570', speed: 260, life: 0.5 });
      MB.FX.ring(f.x, -f.y - 60, 120, 20, { color: col.red, life: 0.5, width: 3 });
      // 只刷新其它技能，不刷新自己
      for (let i = 0; i < f.cd.length; i++) if (i !== slot) f.cd[i] = 0;
      b.flashScreen('rgba(255,60,90,.12)', 0.3);
      MB.Sound.cast('dark');
    },
  };

  BEH.swordspirit = {
    cast(f) {
      const b = f.battle;
      f.beginAction({ total: 0.5, windup: 0.16, active: 0.02, anim: AN.cast, onStrike(self) {
        b.spawnSummon({
          x: self.x + self.facing * 40, y: 40, life: 10, t: 0, cd: 0, ang: 0, f: self,
          update(s, dt) {
            s.t += dt; s.cd -= dt;
            const e = b.other(self);
            if (!e || e.dead) return;
            s.ang += dt * 1.6;
            const tx = e.x - self.facing * 55, ty = -e.y - 70 + Math.sin(s.t * 3) * 16;
            s.x = U.damp(s.x, tx, 3.2, dt);
            s.y = U.damp(s.y, -ty, 3.2, dt);
            if (s.cd <= 0) {
              s.cd = 0.62;
              MB.FX.spark(e.x, -e.y - 60, 8, { color: col.cyan, speed: 320, life: 0.35 });
              b.applyDamage(e, self, 26, { posture: 4, small: true });
            }
          },
          draw(ctx, s, life) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.translate(s.x, -s.y);
            ctx.rotate(s.ang * 0.6);
            ctx.globalAlpha = 0.85 * U.clamp(life, 0, 1);
            ctx.fillStyle = col.ice;
            ctx.shadowColor = col.cyan; ctx.shadowBlur = 18;
            ctx.beginPath();
            ctx.moveTo(0, -26); ctx.lineTo(4, 0); ctx.lineTo(0, 26); ctx.lineTo(-4, 0);
            ctx.closePath(); ctx.fill();
            ctx.restore();
          },
        });
        b.shake(4);
        MB.Sound.cast();
      } }, 'skill');
    },
  };

  BEH.charge = {
    instant: true,
    cast(f) {
      f.setStatus('charged', 6.5);
      f.setStatus('chargeWind', 1.3);
      MB.FX.ring(f.x, -f.y - 60, 40, 90, { color: col.gold, life: 1.2, width: 2 });
      MB.FX.text(f.x, -f.y - 150, '蓄势', { color: col.gold, size: 18 });
      MB.Sound.cast();
    },
  };

  BEH.timelag = {
    instant: true, air: true,
    cast(f) {
      const b = f.battle, e = f.opponent;
      if (e) e.setStatus('slow', 3.4);
      b.slowmo(0.55, 0.8);
      b.flashScreen('rgba(140,220,255,.10)', 0.45);
      b.shake(3);
      MB.FX.text(f.x, -f.y - 150, '时滞', { color: col.cyan, size: 20 });
      MB.Sound.cast('dark');
    },
  };

  BEH.bladedance = {
    cast(f) {
      const b = f.battle;
      f.beginAction({
        total: 1.5, windup: 0.08, active: 1.06, hits: 7, healOnHit: 12, move: true,
        anim: [
          { t: 0.00, p: { torso: -84, head: -88, aFU: -40, aFF: -80, aBU: 90, aBF: 70, wpn: -90, tF: 80, sF: 86, tB: 100, sB: 100, hipY: 2 } },
          { t: 0.12, p: { torso: -98, head: -104, aFU: 30, aFF: 8, aBU: 100, aBF: 84, wpn: 66, tF: 66, sF: 90, tB: 114, sB: 104, hipY: 6 }, e: 'outQuint' },
          { t: 0.24, p: { torso: -78, head: -84, aFU: 104, aFF: 66, aBU: 60, aBF: 30, wpn: 150, tF: 100, sF: 92, tB: 80, sB: 84, hipY: 4 }, e: 'outCubic' },
          { t: 0.36, p: { torso: -102, head: -108, aFU: -64, aFF: -96, aBU: 40, aBF: 8, wpn: -122, tF: 62, sF: 96, tB: 120, sB: 108, hipY: 6 }, e: 'outQuint' },
          { t: 0.48, p: { torso: -76, head: -82, aFU: 112, aFF: 78, aBU: 52, aBF: 22, wpn: 162, tF: 104, sF: 94, tB: 76, sB: 80, hipY: 3 }, e: 'outCubic' },
          { t: 0.60, p: { torso: -104, head: -110, aFU: -72, aFF: -104, aBU: 36, aBF: 4, wpn: -134, tF: 58, sF: 98, tB: 124, sB: 112, hipY: 7 }, e: 'outQuint' },
          { t: 0.72, p: { torso: -74, head: -80, aFU: 118, aFF: 84, aBU: 48, aBF: 18, wpn: 170, tF: 108, sF: 96, tB: 72, sB: 78, hipY: 2 }, e: 'outCubic' },
          { t: 0.84, p: { torso: -100, head: -106, aFU: -50, aFF: -90, aBU: 44, aBF: 12, wpn: -110, tF: 64, sF: 94, tB: 118, sB: 106, hipY: 6 }, e: 'outQuint' },
          { t: 0.94, p: { torso: -86, head: -92, aFU: 60, aFF: 32, aBU: 96, aBF: 76, wpn: 96, tF: 78, sF: 92, tB: 104, sB: 100, hipY: 2 }, e: 'outCubic' },
          { t: 1.00, p: { torso: -88, head: -86, aFU: 80, aFF: 34, aBU: 102, aBF: 74, wpn: 55, tF: 85, sF: 89, tB: 96, sB: 99, hipY: 0 }, e: 'inOutCubic' },
        ],
        onStrike(self, i) {
          const e = self.opponent;
          if (!e || e.dead) return;
          const dir = i % 2 === 0 ? 1 : -1;
          const reach = 132;
          const hit = self.rectHits({ x0: self.x - reach, x1: self.x + reach, y0: self.y + 8, y1: self.y + 112 }, e.bodyRect());
          const ang = dir > 0 ? -0.5 + U.rand(0.9) : Math.PI + 0.5 - U.rand(0.9);
          MB.FX.slash(e.x, -e.y - 52 - U.rand(26, -16), ang, 104, { color: i % 3 === 0 ? '#ffffff' : col.ice, width: 13, arc: 2.2, life: 0.22 });
          MB.FX.spark(e.x, -e.y - 60, 4, { color: col.cyan, speed: 260, life: 0.28, size: 1.4 });
          if (i === 6) {
            MB.FX.ring(e.x, -e.y - 58, 8, 130, { color: col.ice, life: 0.34, width: 3 });
            MB.FX.add({ type: 'impact', x: e.x, y: -e.y - 58, rot: U.rand(TAU), size: 40, life: 0.18, color: '#ffffff', alpha: 1 });
          }
          if (hit) {
            b.applyDamage(e, self, 38, { posture: 8, kb: 60, color: col.ice });
            self.heal(12);
            b.hitstopSet(0.028);
            self.vx += self.facing * 60;
          }
        },
      }, 'skill');
    },
  };

  /* 合并定义 */
  for (const def of MB.SKILL_DEFS) {
    SKILLS[def.id] = Object.assign({}, def, BEH[def.id] || {});
  }

  /* ═════════ 镜反之型 ═════════ */
  const PB = {};

  PB.condemn = {
    onPerfect(b, p, e, hit) {
      b.timeStop(0.62);
      b.zoomFocus(p.x, 1.35, 0.5);
      MB.FX.text(p.x, -p.y - 170, '断罪', { color: '#ffffff', size: 30, bold: true, glow: true });
      MB.Sound.perfect();
      const bx = e.x - e.facing * 66;
      b.later(0.12, () => {
        p.x = U.clamp(bx, -MB.ARENA, MB.ARENA);
        p.facing = -e.facing;
        p.setState('attack'); p.stateT = 0;
        MB.FX.after(p, { life: 0.38, alpha: 0.4, color: '#ffffff' });
      });
      for (let i = 0; i < 3; i++) {
        b.later(0.2 + i * 0.13, () => {
          if (e.dead) return;
          const a = -0.7 + i * 0.7;
          MB.FX.slash(e.x, -e.y - 62, a, 130, { color: i === 2 ? '#ffffff' : col.ice, width: 20, arc: 2.4 });
          MB.FX.ring(e.x, -e.y - 60, 8, 100, { color: '#ffffff', life: 0.28, width: 2 });
          b.shake(9);
          b.applyDamage(e, p, 96, { posture: 18, kb: 40, big: i === 2 });
          if (i === 2) {
            MB.FX.screenFlash('#ffffff', 0.55, 0.14);
            b.hitstop(0.1);
            b.applyDamage(e, p, 90, { posture: 24, kb: 380, kbUp: 200 });
            b.ultGain(p, 8);
          }
        });
      }
    },
  };

  PB.mirrorback = {
    onPerfect(b, p, e, hit) {
      b.timeStop(0.34);
      MB.FX.text(p.x, -p.y - 160, '镜返', { color: col.violet, size: 26, bold: true });
      MB.FX.ring(p.x, -p.y - 62, 12, 130, { color: col.violet, life: 0.4, width: 4 });
      MB.Sound.parry();
      b.later(0.05, () => {
        const power = Math.max(150, (hit.dmg || 60) * 3);
        b.spawnProjectile({
          x: p.x + p.facing * 40, y: -p.y - 66, vx: p.facing * 1250, vy: 0, r: 34, life: 0.85,
          color: col.violet, owner: p, dmg: power, pierce: true, type: 'mirror',
        });
        b.shake(7);
        MB.Sound.slash(0.6, true);
      });
    },
  };

  PB.echo = {
    onPerfect(b, p, e, hit) {
      p.setStatus('echo', 1.8);
      b.slowmo(0.32, 1.8);
      b.zoomFocus(p.x, 1.28, 0.9);
      MB.FX.text(p.x, -p.y - 168, '残响·无间', { color: col.cyan, size: 22, bold: true });
      b.flashScreen('rgba(120,240,255,.22)', 0.35);
      MB.Sound.perfect();
    },
  };

  PB.thunder = {
    onPerfect(b, p, e, hit) {
      b.timeStop(0.4);
      MB.Sound.perfect();
      MB.FX.text(p.x, -p.y - 170, '天罚', { color: col.gold, size: 28, bold: true });
      for (let i = 0; i < 9; i++) {
        b.later(0.06 + i * 0.075, () => {
          const tx = e.x + U.rand(70, -70), ty = -e.y - 60;
          MB.FX.bolt(tx + U.rand(40, -40), -620, tx, ty, { color: '#fff2cc', width: 3, jag: 26, life: 0.3 });
          MB.FX.ring(tx, 0, 6, 70, { color: col.gold, life: 0.3, width: 2, squash: 0.3 });
          MB.FX.spark(tx, -6, 8, { color: col.gold, speed: 380, life: 0.4 });
          b.shake(7);
          b.applyDamage(e, p, 34, { posture: 8, kb: 20, small: true });
          if (i === 8) {
            e.setStatus('stun', 2.0);
            p.ult = 100; p.ultReady = true;
            MB.FX.screenFlash('#ffe9b0', 0.6, 0.2);
            MB.FX.text(p.x, -p.y - 190, '极 · 已满', { color: col.gold, size: 20 });
          }
        });
      }
    },
  };

  PB.voidself = {
    onPerfect(b, p, e, hit) {
      p.setStatus('mirrorForm', 4.2);
      p.setStatus('freeCast', 4.2);
      MB.FX.text(p.x, -p.y - 172, '无我·镜我', { color: col.violet, size: 22, bold: true });
      MB.FX.ring(p.x, -p.y - 60, 10, 150, { color: col.violet, life: 0.6, width: 3 });
      MB.FX.ring(p.x, -p.y - 60, 60, 190, { color: col.ice, life: 0.8, width: 1.5 });
      MB.Sound.perfect();
      b.flashScreen('rgba(200,160,255,.2)', 0.3);
    },
  };

  PB.devour = {
    onPerfect(b, p, e, hit) {
      p.heal(p.hpMax * 0.1);
      p.stackAtk = Math.min(0.3, (p.stackAtk || 0) + 0.06);
      p.buffMul.atk = 1 + p.stackAtk;
      MB.FX.text(p.x, -p.y - 170, '攻击 +6%', { color: col.red, size: 17 });
      MB.FX.ring(p.x, -p.y - 60, 130, 20, { color: col.red, life: 0.5, width: 4 });
      MB.FX.ember(p.x, -p.y - 55, 20, { color: '#ff6b7d', r: 30, life: 1 });
      MB.Sound.cast('dark');
    },
  };

  PB.hunt = {
    onPerfect(b, p, e, hit) {
      e.setStatus('mark', 6);
      p.setStatus('hunt', 6);
      MB.FX.text(e.x, -e.y - 160, '镜印', { color: '#ff9aa8', size: 22, bold: true });
      MB.FX.ring(e.x, -e.y - 60, 10, 130, { color: '#ff9aa8', life: 0.45, width: 2 });
      MB.Sound.parry();
    },
  };

  for (const def of MB.PARRY_DEFS) {
    PARRY[def.id] = Object.assign({}, def, PB[def.id] || {});
  }

  /* ═════════ 终极技 · 镜狱 ═════════ */
  MB.ULT = {
    exec(f) {
      const b = f.battle;
      const e = f.opponent;
      if (!e) return;
      f.invulnT = 3.4;
      f.state = 'ult'; f.act = { total: 2.6, anim: AN.castSlam }; f.actT = 0;
      b.timeStop(0.5);
      b.setBars(0.09);
      b.slowmo(0.42, 2.4);
      b.zoomFocus((f.x + e.x) / 2, 1.25, 2.4);
      b.flashScreen('#ffffff', 0.85, 0.5);
      MB.Sound.ult();
      MB.FX.text(f.x, -f.y - 180, '镜狱·无间', { color: '#ffffff', size: 30, bold: true });
      MB.FX.ring(f.x, -f.y - 60, 20, 260, { color: '#ffffff', life: 0.8, width: 4 });
      MB.FX.setSpeedLines(1);

      const strikes = 8;
      for (let i = 0; i < strikes; i++) {
        b.later(0.45 + i * 0.16, () => {
          if (e.dead) return;
          const side = i % 2 === 0 ? 1 : -1;
          f.x = U.clamp(e.x + side * 70, -MB.ARENA, MB.ARENA);
          f.facing = e.x > f.x ? 1 : -1;
          f.setState('attack'); f.stateT = 0;
          MB.FX.after(f, { life: 0.3, alpha: 0.42, color: '#ffffff' });
          MB.FX.slash(e.x, -e.y - 40 - (i % 4) * 26, U.rand(TAU), 150, { color: '#ffffff', width: 22, arc: 2.6 });
          MB.FX.ring(e.x, -e.y - 60, 8, 120, { color: '#dff9ff', life: 0.3, width: 2 });
          b.shake(6);
          b.applyDamage(e, f, 42, { posture: 5, kb: 0, small: true, color: '#ffffff' });
        });
      }
      b.later(1.95, () => {
        if (e.dead) return;
        b.timeStop(0.5);
        b.flashScreen('#ffffff', 0.9, 0.35);
        b.setBars(0.16);
        f.x = e.x - 120; f.facing = 1;
        f.setState('attack'); f.act = { total: 0.6, anim: AN.heavy }; f.actT = 0;
        MB.FX.slash(e.x, -e.y - 60, 0, 320, { color: '#ffffff', width: 44, arc: 2.9, life: 0.5 });
        MB.FX.ring(e.x, -60, 10, 420, { color: '#bff6ff', life: 0.7, width: 5 });
        MB.FX.shard(e.x, -e.y - 60, 26, { color: '#dffcff' });
        MB.FX.screenFlash('#ffffff', 1, 0.4);
        b.shake(22);
        b.hitstop(0.22);
        b.applyDamage(e, f, 420, { posture: 80, kb: 480, kbUp: 260, big: true, color: '#ffffff' });
        MB.Sound.boom(1.4);
        b.slowmo(0.3, 1.1);
      });
      b.later(2.9, () => { b.setBars(0); MB.FX.setSpeedLines(0); f.state = 'idle'; f.act = null; });
    },
  };
})();
