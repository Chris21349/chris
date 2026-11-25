/* ══════════════════════════════════════════════════════════
   镜刃 MIRROR EDGE — ui.js
   界面 / HUD / 触屏操作
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const MB = window.MB;
  const U = MB.U;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  const UI = (MB.UI = {
    screen: 'title',
    slotSel: 0,
    diffSel: 0,
    battle: null,
    _last: {},
  });

  const D = {};
  UI.el = D;

  /* ───────── 初始化 ───────── */
  UI.init = function () {
    [
      'scr-title', 'scr-stages', 'scr-loadout', 'scr-codex', 'scr-settings', 'scr-pause', 'scr-result',
      'hud', 'stageList', 'skillGrid', 'parryList', 'slotBar', 'skillbar', 'codexBody',
      'nameP', 'nameE', 'hpPf', 'hpPd', 'posePf', 'hpEf', 'hpEd', 'poseEf',
      'combo', 'comboN', 'comboRank', 'parryBadge', 'parryName', 'parryMark', 'hint',
      'ultRing', 'ultFill', 'ultBtn', 'pauseBtn', 'clock', 'roundTag', 'tagP', 'tagE',
      'resTitle', 'resSub', 'resStats', 'resUnlock', 'resNext', 'resRetry',
      'saveInfo', 'skillCount', 'loadTip', 'touch', 'stick', 'toStages', 'importBtn', 'exportBtn', 'importFile', 'wipeBtn',
      'sMusic', 'vMusic', 'sSfx', 'vSfx', 'sShake', 'vShake', 'sStop', 'vStop', 'sCd', 'sBlood',
      'resumeBtn', 'retryBtn', 'quitBtn', 'toLoadout',
    ].forEach((id) => { D[id] = $('#' + id); });

    // 菜单导航
    $$('[data-go]').forEach((b) => b.addEventListener('click', () => {
      MB.Sound.init(); MB.Sound.ui();
      const go = b.dataset.go;
      if (go === 'stages') { UI.renderStages(); UI.show('stages'); }
      else if (go === 'loadout') { UI.renderLoadout(); UI.show('loadout'); }
      else if (go === 'codex') { UI.renderCodex(UI.codexTab || 'skills'); UI.show('codex'); }
      else if (go === 'settings') { UI.bindSettings(); UI.show('settings'); }
    }));
    $$('[data-back]').forEach((b) => b.addEventListener('click', () => {
      MB.Sound.ui();
      UI.show(b.dataset.back);
      if (b.dataset.back === 'title') UI.refreshTitle();
    }));
    $$('[data-tab]').forEach((b) => b.addEventListener('click', () => {
      MB.Sound.ui();
      UI.codexTab = b.dataset.tab;
      $$('[data-tab]').forEach((x) => x.classList.toggle('on', x === b));
      UI.renderCodex(UI.codexTab);
    }));
    $$('[data-diff]').forEach((b) => b.addEventListener('click', () => {
      MB.Sound.ui();
      UI.diffSel = +b.dataset.diff;
      $$('[data-diff]').forEach((x) => x.classList.toggle('on', x === b));
      UI.renderStages();
    }));

    D.pauseBtn.addEventListener('click', () => MB.Game.togglePause());
    D.resumeBtn.addEventListener('click', () => MB.Game.togglePause(false));
    D.retryBtn.addEventListener('click', () => MB.Game.retry());
    D.quitBtn.addEventListener('click', () => MB.Game.quitToStages());
    D.toLoadout.addEventListener('click', () => MB.Game.quitToLoadout());
    D.resRetry.addEventListener('click', () => MB.Game.retry());
    D.resNext.addEventListener('click', () => MB.Game.afterResult());
    D.toStages.addEventListener('click', () => { UI.renderStages(); UI.show('stages'); });
    D.ultBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); MB.Input.press('ult'); });
    D.ultBtn.addEventListener('pointerup', () => MB.Input.release('ult'));

    D.importBtn.addEventListener('click', () => D.importFile.click());
    D.importFile.addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const rd = new FileReader();
      rd.onload = () => { MB.Game.importSave(rd.result); };
      rd.readAsText(f);
      e.target.value = '';
    });
    D.exportBtn.addEventListener('click', () => MB.Game.exportSave());
    D.wipeBtn.addEventListener('click', () => {
      if (confirm('确定清除全部存档？此操作不可撤销。')) MB.Game.wipe();
    });

    UI.bindTips();
    UI.bindTouch();
    UI.refreshTitle();
    UI.show('title');
  };

  /* ───────── 屏幕切换 ───────── */
  UI.show = function (name) {
    UI.screen = name;
    ['title', 'stages', 'loadout', 'codex', 'settings', 'pause', 'result'].forEach((n) => {
      const el = D['scr-' + n];
      if (el) el.classList.toggle('on', n === name);
    });
    const inBattle = name === 'pause' || name === 'result';
    D.hud.classList.toggle('on', inBattle || name === 'battle');
    const vg = document.getElementById('vig');
    if (vg) vg.classList.toggle('on', inBattle || name === 'battle');
    D.touch.classList.toggle('on', name === 'battle' && MB.Game.isTouch);
    if (name === 'title') { D.hud.classList.remove('on'); D.touch.classList.remove('on'); }
  };

  UI.refreshTitle = function () {
    if (!MB.SAVE) return;
    const s = MB.SAVE;
    const cleared = Object.values(s.cleared || {}).filter((a) => a.some(Boolean)).length;
    D.saveInfo.textContent = `进度 ${cleared} / ${MB.STAGES.length} · 完美防反 ${s.stats.perfect} · 击杀 ${s.stats.kills}`;
  };

  /* ───────── 关卡 ───────── */
  UI.stageUnlocked = function (i) {
    if (i === 0) return true;
    const prev = MB.SAVE.cleared[i - 1];
    return !!(prev && prev.some(Boolean));
  };

  UI.renderStages = function () {
    const s = MB.SAVE;
    D.stageList.innerHTML = '';
    MB.STAGES.forEach((st, i) => {
      const cleared = s.cleared[st.id] || [false, false, false];
      const unlocked = UI.stageUnlocked(i);
      const card = document.createElement('button');
      card.className = 'stage-card' + (unlocked ? '' : ' locked');
      card.innerHTML = `
        <span class="sc-idx">${String(i + 1).padStart(2, '0')}</span>
        <div class="sc-name">${st.name}</div>
        <div class="sc-sub">${st.sub} · ${MB.ENEMIES[st.enemy].name}</div>
        <div class="sc-meta">
          <span class="chip">${MB.DIFFS[UI.diffSel].name}</span>
          ${cleared[0] ? '<span class="chip gold">已通关</span>' : ''}
          ${cleared[1] ? '<span class="chip gold">困难</span>' : ''}
          ${cleared[2] ? '<span class="chip red">噩梦</span>' : ''}
        </div>
        <div class="clear-dots">
          <i class="${cleared[0] ? 'on' : ''}"></i><i class="${cleared[1] ? 'on' : ''}"></i><i class="${cleared[2] ? 'on' : ''}"></i>
        </div>
        ${unlocked ? '' : '<div class="lock">击破上一关后解锁</div>'}`;
      if (unlocked) {
        card.addEventListener('click', () => { MB.Sound.ui(); MB.Game.startBattle(i, UI.diffSel); });
      }
      D.stageList.appendChild(card);
    });
  };

  /* ───────── 装配 ───────── */
  function unlockText(u) {
    if (!u || u === 'start') return '初始';
    if (u.startsWith('clear:')) return '通关「' + MB.STAGES[+u.split(':')[1]].name + '」';
    if (u.startsWith('hard:')) return '困难通关「' + MB.STAGES[+u.split(':')[1]].name + '」';
    if (u.startsWith('parry:')) return '累计完美防反 ' + u.split(':')[1] + ' 次';
    if (u.startsWith('combo:')) return '达成 ' + u.split(':')[1] + ' 连击';
    if (u.startsWith('guardbreak:')) return '累计破势 ' + u.split(':')[1] + ' 次';
    return '未知';
  }
  UI.unlockText = unlockText;

  UI.renderLoadout = function () {
    const s = MB.SAVE;
    D.skillGrid.innerHTML = '';
    MB.SKILL_DEFS.forEach((def) => {
      const owned = s.skills.includes(def.id);
      const slot = s.loadout.indexOf(def.id);
      const b = document.createElement('button');
      b.className = 'sk-card' + (owned ? '' : ' locked') + (slot >= 0 ? ' on' : '');
      if (slot >= 0) b.dataset.slot = String(slot + 1);
      b.innerHTML = `
        <div class="sk-top"><i class="sk-ic">${def.icon}</i><span class="sk-name">${def.name}</span><span class="sk-tag">${def.tag}</span></div>
        <div class="sk-desc">${owned ? def.desc : '尚未取回。'}</div>
        <div class="sk-foot"><span>冷却 ${def.cd}s</span></div>
        ${owned ? '' : `<div class="sk-lock-txt">${unlockText(def.unlock)}</div>`}`;
      if (owned) b.addEventListener('click', () => { MB.Sound.ui(); UI.equip(def.id); });
      D.skillGrid.appendChild(b);
    });
    D.skillCount.textContent = s.skills.length + ' / ' + MB.SKILL_DEFS.length + ' 已取回';

    D.parryList.innerHTML = '';
    MB.PARRY_DEFS.forEach((def) => {
      const owned = s.parry.includes(def.id);
      const on = s.parryStyle === def.id;
      const b = document.createElement('button');
      b.className = 'pa-card' + (on ? ' on' : '') + (owned ? '' : ' locked');
      b.innerHTML = `<div class="pa-h"><b>${def.name}</b><em>${def.tag}</em></div>
        <div class="pa-d">${owned ? def.desc : '尚未取回。'}</div>
        ${owned ? '' : `<div class="pa-lock">${unlockText(def.unlock)}</div>`}`;
      if (owned) b.addEventListener('click', () => {
        MB.Sound.ui();
        s.parryStyle = def.id;
        MB.Game.save();
        UI.renderLoadout();
      });
      D.parryList.appendChild(b);
    });
    UI.renderSlots();
  };

  UI.equip = function (id) {
    const s = MB.SAVE;
    const at = s.loadout.indexOf(id);
    if (at >= 0) { s.loadout.splice(at, 1); s.loadout.push(null); }
    else {
      let slot = UI.slotSel;
      if (slot == null || slot > 3) slot = 0;
      // 若目标槽位已有技能，交换
      s.loadout[slot] = id;
      // 去重
      for (let i = 0; i < 4; i++) if (i !== slot && s.loadout[i] === id) s.loadout[i] = null;
      UI.slotSel = (slot + 1) % 4;
    }
    while (s.loadout.length < 4) s.loadout.push(null);
    MB.Game.save();
    UI.renderLoadout();
  };

  UI.renderSlots = function () {
    const s = MB.SAVE;
    D.slotBar.innerHTML = '';
    for (let i = 0; i < 4; i++) {
      const id = s.loadout[i];
      const def = id ? MB.SKILL_DEFS.find((d) => d.id === id) : null;
      const b = document.createElement('button');
      b.className = 'slot ' + (def ? 'filled' : 'empty') + (UI.slotSel === i ? ' sel' : '');
      b.innerHTML = `<span class="si">${i + 1}</span><span class="sn">${def ? def.icon : '空'}</span>`;
      b.style.outline = UI.slotSel === i ? '1px solid rgba(92,233,255,.9)' : 'none';
      b.addEventListener('click', () => { UI.slotSel = i; MB.Sound.ui(); UI.renderSlots(); });
      D.slotBar.appendChild(b);
    }
    const filled = s.loadout.filter(Boolean).length;
    D.loadTip.textContent = filled < 4 ? '还有空位。点按下方槽位选择位置，再点技能装配。' : '四格已满。点选槽位后可替换其中一格。';
  };

  /* ───────── 图鉴 ───────── */
  UI.renderCodex = function (tab) {
    const s = MB.SAVE;
    const body = D.codexBody;
    body.innerHTML = '';
    if (tab === 'skills' || tab === 'parry') {
      const list = tab === 'skills' ? MB.SKILL_DEFS : MB.PARRY_DEFS;
      const owned = tab === 'skills' ? s.skills : s.parry;
      const head = document.createElement('div');
      head.className = 'cx-progress';
      head.innerHTML = `<span>已取回 <b>${owned.length}</b> / ${list.length}</span><span>完美防反累计 <b>${s.stats.perfect}</b></span><span>最高连击 <b>${s.stats.maxCombo}</b></span>`;
      body.appendChild(head);
      const grid = document.createElement('div');
      grid.className = 'cx-grid';
      list.forEach((def) => {
        const on = owned.includes(def.id);
        const d = document.createElement('div');
        d.className = 'cx-item' + (on ? '' : ' locked');
        d.innerHTML = `<h3>${def.name} <i>${def.tag}</i></h3><p>${on ? def.desc : '未见其形。'}</p>
          <div class="cx-meta">${on ? (def.cd ? '冷却 ' + def.cd + ' 秒' : '完美防反后发动') : unlockText(def.unlock)}</div>`;
        grid.appendChild(d);
      });
      body.appendChild(grid);
    } else {
      let done = 0;
      MB.ACHV.forEach((a) => {
        const on = !!s.achv[a.id];
        if (on) done++;
        const row = document.createElement('div');
        row.className = 'achv-row' + (on ? ' done' : '');
        row.innerHTML = `<div class="ai">${on ? '✓' : '·'}</div><div><b>${a.name}</b><span>${a.desc}</span></div>
          <div class="state">${on ? '已达成' : '未达成'}</div>`;
        body.appendChild(row);
      });
      const head = document.createElement('div');
      head.className = 'cx-progress';
      head.innerHTML = `<span>成就 <b>${done}</b> / ${MB.ACHV.length}</span>`;
      body.insertBefore(head, body.firstChild);
    }
  };

  /* ───────── 设置 ───────── */
  UI.bindSettings = function () {
    const st = MB.SAVE.settings;
    const bind = (el, vEl, key, fmt) => {
      el.value = st[key];
      vEl.textContent = st[key];
      el.oninput = () => {
        st[key] = +el.value;
        vEl.textContent = el.value;
        if (key === 'music') MB.Sound.setMusic(st.music / 100);
        if (key === 'sfx') MB.Sound.setSfx(st.sfx / 100);
        MB.Game.save();
      };
    };
    bind(D.sMusic, D.vMusic, 'music');
    bind(D.sSfx, D.vSfx, 'sfx');
    bind(D.sShake, D.vShake, 'shake');
    bind(D.sStop, D.vStop, 'stop');
    D.sCd.checked = st.cd !== false;
    D.sBlood.checked = st.blood !== false;
    D.sCd.onchange = () => { st.cd = D.sCd.checked; MB.Game.save(); };
    D.sBlood.onchange = () => { st.blood = D.sBlood.checked; MB.Game.save(); };
  };

  /* ───────── 触屏 ───────── */
  UI.bindTouch = function () {
    MB.Game.isTouch = matchMedia('(pointer:coarse)').matches || innerWidth < 820;
    // 按钮
    document.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.id === 'ultBtn') return;
      e.preventDefault();
      MB.Sound.init();
      const act = b.dataset.act;
      MB.Input.press(act);
      b.classList.add('hit');
    }, { passive: false });
    const up = (e) => {
      const b = e.target.closest && e.target.closest('[data-act]');
      if (!b) return;
      MB.Input.release(b.dataset.act);
      b.classList.remove('hit');
    };
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
    window.addEventListener('pointerup', () => {
      $$('.tb.hit').forEach((b) => { b.classList.remove('hit'); MB.Input.release(b.dataset.act); });
    });

    // 摇杆
    const stick = D.stick, knob = $('.knob', stick), ring = $('.stick-ring', stick);
    let pid = null, sx = 0, sy = 0, upMove = false;
    const start = (e) => {
      if (UI.screen !== 'battle') return;
      pid = e.pointerId;
      const r = stick.getBoundingClientRect();
      sx = e.clientX; sy = e.clientY;
      stick.classList.add('active');
      ring.style.left = (e.clientX - r.left) + 'px';
      ring.style.top = (e.clientY - r.top) + 'px';
      knob.style.left = (e.clientX - r.left) + 'px';
      knob.style.top = (e.clientY - r.top) + 'px';
      stick.setPointerCapture(pid);
      e.preventDefault();
    };
    const move = (e) => {
      if (pid !== e.pointerId) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      MB.Input.axisTouch = U.clamp(dx / 62, -1, 1);
      const r = stick.getBoundingClientRect();
      const kx = U.clamp(dx, -46, 46), ky = U.clamp(dy, -46, 46);
      knob.style.left = (sx - r.left + kx) + 'px';
      knob.style.top = (sy - r.top + ky) + 'px';
      if (!upMove && dy < -42) {
        upMove = true;
        MB.Input.press('jump');
        setTimeout(() => MB.Input.release('jump'), 80);
      }
      if (dy > -20) upMove = false;
      e.preventDefault();
    };
    const end = (e) => {
      if (pid !== e.pointerId) return;
      pid = null; upMove = false;
      MB.Input.axisTouch = 0;
      stick.classList.remove('active');
    };
    stick.addEventListener('pointerdown', start, { passive: false });
    stick.addEventListener('pointermove', move, { passive: false });
    stick.addEventListener('pointerup', end);
    stick.addEventListener('pointercancel', end);
  };

  UI.bindTips = function () {
    // 首次提示
  };

  /* ───────── 战斗 HUD ───────── */
  UI.beginBattle = function (b) {
    UI.battle = b;
    UI.show('battle');
    D.hud.classList.add('on');
    D.touch.classList.toggle('on', !!MB.Game.isTouch);
    D.nameP.textContent = MB.PLAYER.name;
    D.nameE.textContent = b.enemyChar.name;
    D.tagP.textContent = 'PLAYER';
    D.tagE.textContent = b.diff.name;
    D.roundTag.textContent = b.stage.name;
    D.combo.classList.remove('on');
    D.parryName.textContent = (MB.PARRY[MB.PLAYER.parryStyle] || MB.PARRY.condemn).name;
    UI._last = {};
    UI.buildSkillbar(b);
    UI.hint(b.stage.hint || '', 4200);
    setTimeout(() => { if (UI.battle === b) UI.hint('', 0); }, 4600);
  };

  UI.buildSkillbar = function (b) {
    const bar = D.skillbar;
    bar.innerHTML = '';
    const p = b.player;
    for (let i = 0; i < 4; i++) {
      const id = (p.skills || [])[i];
      const def = id ? MB.SKILLS[id] : null;
      const d = document.createElement('div');
      d.className = 'skit' + (def ? '' : ' empty');
      d.dataset.act = 'sk' + (i + 1);
      d.innerHTML = `<span class="key">${i + 1}</span><span class="ic">${def ? def.icon : '—'}</span>
        <i class="cd"></i><span class="cdn"></span>`;
      if (!def) d.style.pointerEvents = 'none';
      bar.appendChild(d);
    }
  };

  UI.updateHUD = function (b) {
    if (!b || UI.screen !== 'battle') {
      if (UI.screen === 'pause' || UI.screen === 'result') { /* 冻结时也更新数值 */ }
      else return;
    }
    const p = b.player, e = b.enemy;
    const L = UI._last;
    const pr = p.hpRatio, er = e.hpRatio;
    if (L.pr !== pr) { D.hpPf.style.transform = `scaleX(${pr})`; D.hpPd.style.transform = `scaleX(${pr})`; L.pr = pr; }
    if (L.er !== er) { D.hpEf.style.transform = `scaleX(${er})`; D.hpEd.style.transform = `scaleX(${er})`; L.er = er; }
    const pp = p.postureRatio, ep = e.postureRatio;
    if (L.pp !== pp) {
      D.posePf.style.transform = `scaleX(${pp})`; D.posePf.parentNode.classList.toggle('low', pp < 0.34); L.pp = pp;
    }
    if (L.ep !== ep) {
      D.poseEf.style.transform = `scaleX(${ep})`; D.poseEf.parentNode.classList.toggle('low', ep < 0.34); L.ep = ep;
    }
    // 连击
    const c = b.combo;
    if (L.c !== c) {
      L.c = c;
      if (c > 1) {
        D.combo.classList.add('on');
        D.comboN.textContent = c;
        D.comboRank.textContent = c >= 50 ? 'MIRROR' : c >= 35 ? 'SAVAGE' : c >= 20 ? 'GREAT' : c >= 10 ? 'GOOD' : '';
      } else D.combo.classList.remove('on');
    }
    // 技能
    const items = D.skillbar.children;
    for (let i = 0; i < items.length; i++) {
      const el = items[i]; const id = (p.skills || [])[i]; const def = id ? MB.SKILLS[id] : null;
      if (!def) continue;
      const cd = p.cd[i] || 0;
      const ratio = cd > 0 ? U.clamp(cd / def.cd, 0, 1) : 0;
      const last = L['cd' + i];
      if (last !== Math.round(ratio * 20)) {
        L['cd' + i] = Math.round(ratio * 20);
        const bar = el.querySelector('.cd');
        bar.style.transform = `scaleY(${ratio})`;
        const num = el.querySelector('.cdn');
        num.textContent = cd > 0.25 ? Math.ceil(cd) : '';
        el.classList.toggle('ready', cd <= 0);
      }
    }
    // 终极
    const u = Math.round(p.ult);
    if (L.u !== u) {
      L.u = u;
      D.ultRing.style.setProperty('--p', (u * 3.6) + 'deg');
      D.ultFill.style.width = u + '%';
      D.ultBtn.classList.toggle('ready', u >= 100);
      D.ultBtn.disabled = u < 100;
    }
    // 镜刻
    const ms = Math.min(3, p.mirrorStacks % 3);
    if (L.ms !== ms || L.msTotal !== p.mirrorStacks) {
      L.ms = ms; L.msTotal = p.mirrorStacks;
      D.parryMark.textContent = '◆'.repeat(p.mirrorStacks % 3) + '◇'.repeat(3 - (p.mirrorStacks % 3));
      D.parryBadge.classList.toggle('pulse', p.mirrorStacks > 0);
    }
    // 时间
    const tSec = Math.floor(b.stats.time);
    const ts = String(Math.floor(tSec / 60)).padStart(2, '0') + ':' + String(tSec % 60).padStart(2, '0');
    if (L.ts !== ts) { L.ts = ts; D.clock.textContent = ts; }
  };

  UI.parryPulse = function () {
    D.parryBadge.classList.remove('pulse');
    void D.parryBadge.offsetWidth;
    D.parryBadge.classList.add('pulse');
  };

  let hintTimer = 0;
  UI.hint = function (html, ms) {
    D.hint.innerHTML = html;
    if (!html) { D.hint.classList.remove('on'); return; }
    D.hint.classList.add('on');
    clearTimeout(hintTimer);
    if (ms) hintTimer = setTimeout(() => D.hint.classList.remove('on'), ms);
  };

  UI.checkAchv = function (id) {
    const a = MB.ACHV.find((x) => x.id === id);
    if (!a || MB.SAVE.achv[id]) return;
    MB.SAVE.achv[id] = true;
    MB.Game.save();
    MB.Sound.unlock();
    MB.UI.toast('成就 · ' + a.name);
    if (MB.Game.pendingUnlocks) MB.Game.pendingUnlocks.push('成就「' + a.name + '」');
  };

  let toastEl = null, toastTimer = 0;
  UI.toast = function (text) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.style.cssText = 'position:fixed;left:50%;top:6%;transform:translateX(-50%);z-index:80;' +
        'padding:10px 20px;border:1px solid rgba(255,207,122,.5);background:rgba(20,16,8,.92);' +
        'color:#ffe0a8;font-size:12px;letter-spacing:.12em;pointer-events:none;opacity:0;transition:opacity .3s,transform .3s;';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = text;
    toastEl.style.opacity = '1';
    toastEl.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.style.opacity = '0'; toastEl.style.transform = 'translateX(-50%) translateY(-8px)'; }, 2200);
  };

  /* ───────── 结算 ───────── */
  UI.showResult = function (res) {
    UI.show('result');
    D.resTitle.textContent = res.win ? '胜' : '敗';
    D.resTitle.classList.toggle('lose', !res.win);
    const d = MB.DIFFS[res.diff];
    D.resSub.textContent = res.stage.name + ' · ' + d.name + (res.win ? ' · 击破' : ' · 被斩');
    const t = Math.floor(res.stats.time);
    const ts = Math.floor(t / 60) + '分' + String(t % 60).padStart(2, '0') + '秒';
    D.resStats.innerHTML = `
      <div><b>${Math.round(res.stats.dmgDealt)}</b><span>造成伤害</span></div>
      <div><b>${res.stats.perfect}</b><span>完美防反</span></div>
      <div><b>${res.stats.dodge}</b><span>完美闪避</span></div>
      <div><b>${res.stats.maxCombo}</b><span>最高连击</span></div>
      <div><b>${ts}</b><span>用时</span></div>
      <div><b>${Math.round(res.hpLeft * 100)}%</b><span>剩余生命</span></div>`;
    D.resUnlock.innerHTML = '';
    (res.unlocks || []).forEach((u) => {
      const d2 = document.createElement('div');
      d2.className = 'u';
      d2.textContent = '解锁 · ' + u;
      D.resUnlock.appendChild(d2);
    });
    if (!res.unlocks || !res.unlocks.length) {
      const d2 = document.createElement('div');
      d2.className = 'u';
      d2.style.color = 'rgba(150,190,205,.7)';
      d2.style.borderColor = 'rgba(120,190,215,.2)';
      d2.style.background = 'rgba(10,18,24,.4)';
      d2.textContent = res.win ? '本场无新解锁。继续挑战更高难度吧。' : '再试一次。完美防反的时机，就在刀锋落下的前一瞬。';
      D.resUnlock.appendChild(d2);
    }
    D.resNext.innerHTML = res.win ? '<b>继续</b>' : '<b>返回战场</b>';
  };

  UI.battleEnding = function (battle) {
    UI.hint(battle.win ? '<b>击 破</b>' : '<b>被 斩</b>', 1600);
  };

  UI.endBattle = function (battle) {
    MB.Game.onBattleEnd(battle);
  };

  /* ───────── 点击音 ───────── */
  document.addEventListener('pointerdown', () => { MB.Sound.init(); }, { once: true });
})();
