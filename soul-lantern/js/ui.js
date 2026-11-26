/* 彩潮 · 水墨第一人称 — HUD / 触控 / 升级 / 暂停 / 结算 / 存档 */
'use strict';
(function (CT) {
  var S = CT.Sound;
  var UI = CT.UI = {
    game: null, save: null, cards: null, onCard: null, pickLock: false,
    touch: ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0
  };
  var $ = function (id) { return document.getElementById(id); };
  var el = {};

  var ICONS = {
    edge: '<path d="M34 6L13 33l8 3 18-28z" fill="#14120F" stroke="#EDE5D3" stroke-width="1.2"/><path d="M13 33l-4 9 10-3" fill="#B23A2A"/><path d="M29 14l-9 13" stroke="#B23A2A" stroke-width="2"/>',
    haste: '<g fill="none" stroke="#14120F" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M13 20l8-9 8 9"/><path d="M13 35l8-9 8 9"/><path d="M33 15v20"/></g>',
    reach: '<path d="M8 40L36 8" stroke="#14120F" stroke-width="3" stroke-linecap="round"/><path d="M36 8l-2 10-7-8z" fill="#B23A2A"/><path d="M14 34l6 4" stroke="#C9A45C" stroke-width="3"/>',
    heart: '<path d="M24 41C10 30.5 6 22.5 8.6 16.4 10.8 11 16.5 9.2 21 12.4L24 15l3-2.6c4.5-3.2 10.2-1.4 12.4 4C42 22.5 38 30.5 24 41z" fill="#B23A2A" stroke="#14120F" stroke-width="1.6"/><path d="M19 19c-2 1-3 3.5-2.5 6" stroke="#EDE5D3" stroke-width="2" fill="none" stroke-linecap="round"/>',
    speed: '<g fill="none" stroke="#14120F" stroke-width="2.8" stroke-linecap="round"><path d="M8 34c10 0 16-6 21-17"/><path d="M14 40c9 0 16-6 22-18"/><path d="M22 42c8 0 13-4 17-12"/></g>',
    magnet: '<path d="M12 9v16a12 12 0 0 0 24 0V9h-8v16a4 4 0 0 1-8 0V9z" fill="none" stroke="#14120F" stroke-width="4.5" stroke-linejoin="round"/><path d="M15 9h5M28 9h5" stroke="#B23A2A" stroke-width="5"/>',
    heavy: '<path d="M24 5l5 12 12 2-9 9 2 13-10-6-10 6 2-13-9-9 12-2z" fill="#14120F" stroke="#C9A45C" stroke-width="1.4"/><circle cx="24" cy="24" r="3" fill="#B23A2A"/>',
    leech: '<path d="M24 7c7 9 10 14 10 20a10 10 0 0 1-20 0c0-6 3-11 10-20z" fill="#2B2723" stroke="#14120F" stroke-width="1.4"/><path d="M21 25c0 4 2 7 6 8" stroke="#4E7A72" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
    heal: '<rect x="9" y="9" width="30" height="30" rx="2" fill="none" stroke="#14120F" stroke-width="2"/><path d="M24 15v18M15 24h18" stroke="#B23A2A" stroke-width="3.4" stroke-linecap="round"/>',
    slash: '<path d="M36 7C22 12 12 22 8 38c15-3 25-13 31-27z" fill="#EDE5D3" stroke="#14120F" stroke-width="1.2"/><path d="M31 13c-9 4-15 10-18 18" stroke="#14120F" stroke-width="1.6" fill="none"/>',
    burst: '<g stroke="#EDE5D3" stroke-width="2.6" stroke-linecap="round"><path d="M24 5v8M24 35v8M5 24h8M35 24h8M10 10l6 6M32 32l6 6M38 10l-6 6M16 32l-6 6"/></g><circle cx="24" cy="24" r="5" fill="#14120F" stroke="#C9A45C" stroke-width="1.4"/>',
    wind: '<g stroke="#EDE5D3" stroke-width="2.8" stroke-linecap="round" fill="none"><path d="M7 19h17M11 26h17M6 33h14"/><path d="M30 26l9-3-4-7z" fill="#EDE5D3"/></g>',
    sun: '<circle cx="24" cy="24" r="7" fill="#C9A45C" stroke="#EDE5D3" stroke-width="1.6"/><g stroke="#EDE5D3" stroke-width="2.4" stroke-linecap="round"><path d="M24 4v7M24 37v7M4 24h7M37 24h7M10 10l5 5M33 33l5 5M38 10l-5 5M15 33l-5 5"/></g>'
  };
  function svg(id, cls) {
    return '<svg class="' + (cls || 'ico') + '" viewBox="0 0 48 48" aria-hidden="true">' + (ICONS[id] || ICONS.edge) + '</svg>';
  }

  UI.init = function (game) {
    this.game = game;
    ['hud', 'controls', 'hp-fill', 'hp-text', 'lv', 'xp-fill', 'time', 'kills', 'combo', 'combo-n',
      'toast', 'bossbar', 'boss-fill', 'boss-name', 'stick-zone', 'look-zone', 'stick',
      'btn-attack', 'btn-heavy', 'btn-dash', 'btn-ult', 'screen-title', 'screen-levelup', 'cards',
      'screen-pause', 'pause-stats', 'sens', 'sens-val', 'screen-end', 'end-title', 'end-kicker',
      'end-stats', 'end-best', 'modal', 'modal-title', 'modal-body', 'flash', 'loading', 'file-input',
      'btn-start', 'btn-pause', 'btn-resume', 'btn-restart', 'btn-quit', 'btn-again', 'btn-home',
      'btn-help', 'btn-help2', 'btn-sound', 'btn-sound2', 'btn-save', 'btn-save2', 'modal-close',
      'best-line', 'lockhint'].forEach(function (k) { el[k] = $(k); });
    this.el = el;
    this.save = this.loadSave();
    if (typeof this.save.sens !== 'number') this.save.sens = 1;
    game.sens = 0.0022 * this.save.sens;
    S.setMuted(this.save.sound === false);
    this.refreshSound();
    if (this.touch) document.body.classList.add('touch');
    this.bind();
    this.setupJoystick();
    this.setupLook();
    this.setupActions();
    if (el.sens) {
      el.sens.value = this.save.sens;
      el['sens-val'].textContent = (+this.save.sens).toFixed(1);
    }
    setTimeout(function () { el.loading.classList.add('gone'); }, 380);
    window.__CT = {
      onBack: function () {
        if (UI.game.state === 'playing') { UI.game.pause(); return 1; }
        if (UI.game.state === 'paused') { UI.game.resume(); return 1; }
        if (UI.game.state === 'levelup') return 1;
        if (UI.game.state === 'dead' || UI.game.state === 'win') { UI.game.toTitle(); return 1; }
        return 0;
      }
    };
    document.addEventListener('pointerlockchange', function () { UI.updateLockHint(); });
    this.updateLockHint();
  };

  UI.loadSave = function () {
    try {
      var s = JSON.parse(localStorage.getItem('chromatide.fps.save.v1') || '{}');
      return { bestKills: s.bestKills || 0, bestTime: s.bestTime || 0, runs: s.runs || 0, sound: s.sound !== false, bestCombo: s.bestCombo || 0, sens: s.sens || 1 };
    } catch (e) { return { bestKills: 0, bestTime: 0, runs: 0, sound: true, bestCombo: 0, sens: 1 }; }
  };
  UI.persist = function () {
    try { localStorage.setItem('chromatide.fps.save.v1', JSON.stringify(this.save)); } catch (e) { }
  };
  UI.bestText = function () {
    var s = this.save;
    if (!s.runs) return '尚无记录 · 第一刀由你落下';
    return '最佳斩获 ' + s.bestKills + ' · 最长存活 ' + fmt(s.bestTime) + ' · 连斩 ' + s.bestCombo;
  };

  UI.bind = function () {
    var self = this, g = this.game;
    function click(id, fn) {
      if (!el[id]) return;
      el[id].addEventListener('click', function (e) { e.stopPropagation(); S.resume(); S.play('ui'); fn(); });
    }
    click('btn-start', function () { g.startRun(); });
    click('btn-pause', function () { g.pause(); });
    click('btn-resume', function () { g.resume(); });
    click('btn-restart', function () { g.startRun(); });
    click('btn-quit', function () { g.toTitle(); });
    click('btn-again', function () { g.startRun(); });
    click('btn-home', function () { g.toTitle(); });
    click('btn-help', function () { self.help(); });
    click('btn-help2', function () { self.help(); });
    click('btn-sound', function () { self.toggleSound(); });
    click('btn-sound2', function () { self.toggleSound(); });
    click('btn-save', function () { self.saveModal(); });
    click('btn-save2', function () { self.saveModal(); });
    click('modal-close', function () { self.closeModal(); });

    if (el.sens) {
      el.sens.addEventListener('input', function () {
        self.save.sens = +el.sens.value;
        self.game.sens = 0.0022 * self.save.sens;
        el['sens-val'].textContent = (+self.save.sens).toFixed(1);
        self.persist();
      });
    }
    el['file-input'].addEventListener('change', function (e) {
      var f = e.target.files[0];
      if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var d = JSON.parse(rd.result);
          if (typeof d.bestKills !== 'number') throw new Error('bad');
          self.save.bestKills = Math.max(self.save.bestKills || 0, d.bestKills || 0);
          self.save.bestTime = Math.max(self.save.bestTime || 0, d.bestTime || 0);
          self.save.bestCombo = Math.max(self.save.bestCombo || 0, d.bestCombo || 0);
          self.save.runs = Math.max(self.save.runs || 0, d.runs || 0);
          if (typeof d.sound === 'boolean') self.save.sound = d.sound;
          self.persist();
          if (el['best-line']) el['best-line'].textContent = self.bestText();
          self.closeModal();
          self.toast('存档已载入', '记录取新旧最大值', 'gold');
        } catch (err) {
          self.toast('文件无法识别', '请选择本游戏导出的 JSON', 'danger');
        }
      };
      rd.readAsText(f);
      e.target.value = '';
    });
  };

  UI.toggleSound = function () {
    this.save.sound = !this.save.sound;
    S.setMuted(!this.save.sound);
    this.persist();
    this.refreshSound();
    if (this.save.sound) S.play('ui');
  };
  UI.refreshSound = function () {
    var t = '音效 · ' + (this.save.sound ? '开' : '关');
    if (el['btn-sound']) el['btn-sound'].textContent = t;
    if (el['btn-sound2']) el['btn-sound2'].textContent = t;
  };

  /* ---------- 摇杆 ---------- */
  UI.setupJoystick = function () {
    var self = this, zone = el['stick-zone'];
    if (!zone) return;
    var active = false, pid = null, ox = 0, oy = 0, R = 56;
    function down(e) {
      if (self.game.state !== 'playing') return;
      active = true; pid = e.pointerId;
      ox = e.clientX; oy = e.clientY;
      var st = el.stick;
      st.classList.remove('hidden');
      st.style.left = ox + 'px'; st.style.top = oy + 'px';
      el.stick.querySelector('.stick-knob').style.transform = 'translate(-50%,-50%)';
      self.game.input.mx = 0; self.game.input.mz = 0;
      try { zone.setPointerCapture && zone.setPointerCapture(pid); } catch (err) { }
    }
    function move(e) {
      if (!active || e.pointerId !== pid) return;
      var dx = e.clientX - ox, dy = e.clientY - oy;
      var len = Math.hypot(dx, dy);
      var k = len > R ? R / len : 1;
      el.stick.querySelector('.stick-knob').style.transform =
        'translate(calc(-50% + ' + dx * k + 'px), calc(-50% + ' + dy * k + 'px))';
      var nx = dx / R, ny = dy / R, nl = Math.hypot(nx, ny);
      if (nl < 0.16) { self.game.input.mx = 0; self.game.input.mz = 0; return; }
      self.game.input.mx = nx / nl * Math.min(1, nl);
      self.game.input.mz = -ny / nl * Math.min(1, nl);
    }
    function up(e) {
      if (!active || (e && e.pointerId !== pid)) return;
      active = false; pid = null;
      el.stick.classList.add('hidden');
      self.game.input.mx = 0; self.game.input.mz = 0;
    }
    zone.addEventListener('pointerdown', down);
    zone.addEventListener('pointermove', move);
    zone.addEventListener('pointerup', up);
    zone.addEventListener('pointercancel', up);
    window.addEventListener('blur', up);
  };

  /* ---------- 右半屏看视角 / 点击斩 ---------- */
  UI.setupLook = function () {
    var self = this, zone = el['look-zone'];
    if (!zone) return;
    var active = false, pid = null, lx = 0, ly = 0, moved = 0, t0 = 0;
    zone.addEventListener('pointerdown', function (e) {
      if (self.game.state !== 'playing') return;
      if (e.target.closest && e.target.closest('.act')) return;
      active = true; pid = e.pointerId; lx = e.clientX; ly = e.clientY; moved = 0; t0 = performance.now();
      try { zone.setPointerCapture && zone.setPointerCapture(pid); } catch (err) { }
    });
    zone.addEventListener('pointermove', function (e) {
      if (!active || e.pointerId !== pid) return;
      var dx = e.clientX - lx, dy = e.clientY - ly;
      lx = e.clientX; ly = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      self.game.look(dx * 2.0, dy * 2.0);
    });
    function up(e) {
      if (!active || (e && e.pointerId !== pid)) return;
      active = false; pid = null;
      if (moved < 12 && performance.now() - t0 < 280) self.game.attack();
    }
    zone.addEventListener('pointerup', up);
    zone.addEventListener('pointercancel', function () { active = false; pid = null; });
  };

  /* ---------- 战斗按钮 ---------- */
  UI.setupActions = function () {
    var self = this;
    el['btn-attack'].innerHTML = '<span class="act-shade"></span>' + svg('slash', 'act-ico') + '<span class="act-label">斩</span>';
    el['btn-heavy'].innerHTML = '<span class="act-shade"></span>' + svg('burst', 'act-ico') + '<span class="act-label">破</span>';
    el['btn-dash'].innerHTML = '<span class="act-shade"></span>' + svg('wind', 'act-ico') + '<span class="act-label">闪</span>';
    el['btn-ult'].innerHTML = '<span class="act-shade"></span>' + svg('sun', 'act-ico') + '<span class="act-label">万彩</span>';
    function tap(btn, fn) {
      if (!btn) return;
      btn.addEventListener('pointerdown', function (e) {
        e.preventDefault(); e.stopPropagation();
        if (self.game.state === 'playing') fn();
      });
    }
    tap(el['btn-attack'], function () { self.game.attack(); });
    tap(el['btn-heavy'], function () { self.game.tryHeavy(); });
    tap(el['btn-dash'], function () { self.game.tryDash(); });
    tap(el['btn-ult'], function () { self.game.tryUlt(); });
  };

  UI.updateActions = function (dashFrac, ultFrac, heavyFrac) {
    if (!el['btn-dash']) return;
    var d = Math.max(0, Math.min(1, dashFrac || 0));
    el['btn-dash'].style.setProperty('--cd', d.toFixed(3));
    el['btn-dash'].classList.toggle('ready', d <= 0.001);
    var h = Math.max(0, Math.min(1, heavyFrac || 0));
    el['btn-heavy'].style.setProperty('--cd', h.toFixed(3));
    el['btn-heavy'].classList.toggle('ready', h <= 0.001);
    var u = Math.max(0, Math.min(1, ultFrac || 0));
    el['btn-ult'].style.setProperty('--cd', (1 - u).toFixed(3));
    el['btn-ult'].classList.toggle('ready', u >= 0.999);
  };

  /* ---------- 状态 ---------- */
  UI.beginRun = function () {
    this.hideAll();
    document.body.classList.add('playing');
    document.body.classList.remove('on-title');
    el.hud.classList.remove('hidden');
    el.controls.classList.remove('hidden');
    el.loading.classList.add('gone');
    this.updateLockHint();
  };
  UI.showTitle = function (save) {
    this.hideAll();
    document.body.classList.remove('playing');
    document.body.classList.add('on-title');
    el.hud.classList.add('hidden');
    el.controls.classList.add('hidden');
    if (el['best-line']) el['best-line'].textContent = this.bestText();
    el['screen-title'].classList.remove('hidden');
    this.updateLockHint();
  };
  UI.hideAll = function () {
    ['screen-title', 'screen-levelup', 'screen-pause', 'screen-end', 'modal'].forEach(function (k) {
      if (el[k]) el[k].classList.add('hidden');
    });
    document.body.classList.remove('blocked');
    this.cards = null; this.onCard = null;
    this.updateLockHint();
  };

  UI.updateLockHint = function () {
    if (!el.lockhint) return;
    var g = this.game;
    var show = !this.touch && g && g.state === 'playing' && !document.pointerLockElement;
    el.lockhint.classList.toggle('hidden', !show);
  };

  /* ---------- 升级 ---------- */
  UI.showLevelUp = function (cards, cb) {
    this.cards = cards; this.onCard = cb; this.pickLock = false;
    var html = '';
    cards.forEach(function (c, i) {
      var pips = '';
      if (c.max) {
        for (var p = 0; p < c.max; p++) pips += '<i class="' + (p < c.lvl ? 'on' : '') + '"></i>';
      }
      html += '<button class="card" data-i="' + i + '" style="--accent:' + c.color + '">' +
        '<span class="card-icon">' + svg(c.icon) + '</span>' +
        '<span class="card-main"><span class="card-top"><b class="card-name">' + c.name + '</b>' +
        '<em class="card-lv">' + (c.kind === 'heal' ? '补给' : 'Lv.' + c.lvl + '/' + c.max) + '</em></span>' +
        '<span class="card-desc">' + c.desc + '</span>' +
        (pips ? '<span class="pips">' + pips + '</span>' : '') +
        '</span><span class="card-key">' + (i + 1) + '</span></button>';
    });
    el.cards.innerHTML = html;
    el['screen-levelup'].classList.remove('hidden');
    document.body.classList.add('blocked');
    this.updateLockHint();
    var self = this;
    Array.prototype.forEach.call(el.cards.querySelectorAll('.card'), function (node) {
      node.addEventListener('click', function () { self.choose(parseInt(node.getAttribute('data-i'), 10)); });
    });
  };
  UI.choose = function (i) {
    if (this.pickLock || !this.onCard || !this.cards || !this.cards[i]) return;
    this.pickLock = true;
    S.play('ui');
    var cb = this.onCard, id = this.cards[i].id;
    el['screen-levelup'].classList.add('hidden');
    document.body.classList.remove('blocked');
    this.onCard = null; this.cards = null;
    cb(id);
  };
  UI.pickByKey = function (i) { this.choose(i); };
  UI.hideLevelUp = function () { el['screen-levelup'].classList.add('hidden'); };

  /* ---------- 暂停 ---------- */
  UI.showPause = function (run) {
    var names = { edge: '锋锐', haste: '疾斩', reach: '长锋', vigor: '铁骨', speed: '踏墨', magnet: '引墨', heavy: '重墨', leech: '噬墨' };
    var lines = [];
    Object.keys(run.passives).forEach(function (k) {
      if (run.passives[k] > 0) lines.push('<span class="mini"><b>' + names[k] + '</b><em>Lv.' + run.passives[k] + '</em></span>');
    });
    el['pause-stats'].innerHTML =
      '<div class="pause-grid"><div><em>存活</em><b>' + fmt(run.time) + '</b></div>' +
      '<div><em>斩获</em><b>' + run.kills + '</b></div>' +
      '<div><em>等级</em><b>Lv.' + run.level + '</b></div>' +
      '<div><em>最高连斩</em><b>' + run.bestCombo + '</b></div></div>' +
      (lines.length ? '<div class="mini-row">' + lines.join('') + '</div>' : '');
    el['screen-pause'].classList.remove('hidden');
    document.body.classList.add('blocked');
    this.updateLockHint();
  };

  /* ---------- 结算 ---------- */
  UI.showEnd = function (run, save, win) {
    this.save = save;
    el['screen-pause'].classList.add('hidden');
    el.controls.classList.add('hidden');
    el.hud.classList.add('hidden');
    el['end-kicker'].textContent = win ? '纸面重新有了颜色' : '墨色漫过了纸边';
    el['end-title'].textContent = win ? '纸上生色' : '墨干';
    el['end-stats'].innerHTML =
      '<div class="end-grid">' +
      '<div><em>存活</em><b>' + fmt(run.time) + '</b></div>' +
      '<div><em>斩获</em><b>' + run.kills + '</b></div>' +
      '<div><em>等级</em><b>Lv.' + run.level + '</b></div>' +
      '<div><em>最高连斩</em><b>' + run.bestCombo + '</b></div></div>';
    var nr = run.kills >= (save.bestKills || 0) && run.kills > 0;
    el['end-best'].innerHTML = (nr ? '<span class="newrec">新纪录</span>' : '') +
      '<span>最佳斩获 ' + save.bestKills + ' · 最长存活 ' + fmt(save.bestTime) + '</span>';
    el['screen-end'].classList.remove('hidden');
    document.body.classList.remove('blocked');
    this.updateLockHint();
  };

  /* ---------- HUD ---------- */
  UI.updateHud = function (r) {
    if (!el['hp-fill']) return;
    var hpP = Math.max(0, Math.min(1, r.hp / r.maxHp));
    el['hp-fill'].style.width = (hpP * 100).toFixed(1) + '%';
    el['hp-text'].textContent = Math.max(0, Math.ceil(r.hp));
    el.lv.textContent = r.level;
    el['xp-fill'].style.width = Math.max(0, Math.min(1, r.xp / r.need) * 100).toFixed(1) + '%';
    el.time.textContent = fmt(r.time);
    el.kills.textContent = r.kills;
    document.body.classList.toggle('lowhp', hpP < 0.3);
  };
  UI.combo = function (n) {
    if (!el.combo) return;
    if (n >= 3) {
      el.combo.classList.remove('hidden');
      el['combo-n'].textContent = n;
      el.combo.classList.remove('pop');
      void el.combo.offsetWidth;
      el.combo.classList.add('pop');
    } else el.combo.classList.add('hidden');
  };
  UI.boss = function (show, name, frac) {
    if (!el.bossbar) return;
    if (!show) { el.bossbar.classList.add('hidden'); return; }
    el.bossbar.classList.remove('hidden');
    if (name) el['boss-name'].textContent = name;
    if (frac !== undefined) el['boss-fill'].style.width = (frac * 100).toFixed(1) + '%';
  };

  var toastT = 0;
  UI.toast = function (text, sub, tone) {
    if (!el.toast) return;
    el.toast.innerHTML = '<b>' + text + '</b>' + (sub ? '<span>' + sub + '</span>' : '');
    el.toast.className = 'toast show ' + (tone || '');
    clearTimeout(toastT);
    toastT = setTimeout(function () { el.toast.className = 'toast'; }, 1800);
  };
  UI.hitFlash = function (heavy) {
    el.flash.className = heavy ? 'hit heavy' : 'hit';
    clearTimeout(this._hitT);
    this._hitT = setTimeout(function () { el.flash.className = ''; }, 90);
  };
  UI.hurtFlash = function () {
    el.flash.className = 'hurt';
    clearTimeout(this._hurtT);
    this._hurtT = setTimeout(function () { el.flash.className = ''; }, 440);
  };
  UI.ultFlash = function () {
    el.flash.className = 'ult';
    clearTimeout(this._ultT);
    this._ultT = setTimeout(function () { el.flash.className = ''; }, 780);
  };

  /* ---------- 弹窗 ---------- */
  UI.help = function () {
    this.openModal('怎么打',
      '<div class="help">' +
      '<p class="help-lead">墨兽没有脸。你的刀就是它们的脸。</p>' +
      '<ul><li><b>移动</b>：左摇杆 / WASD；手机左半屏拖动。</li>' +
      '<li><b>看</b>：右半屏拖动；电脑点击画面锁定鼠标，移动鼠标看。</li>' +
      '<li><b>斩</b>：右下大红钮 / 左键。三连斩，第三下最重；点右半屏也能斩。</li>' +
      '<li><b>破</b>：横扫一圈，击退近身所有墨兽，冷却 4.8 秒。</li>' +
      '<li><b>闪</b>：向前突进 + 短暂无敌，用来穿出包围。</li>' +
      '<li><b>万彩</b>：斩杀充能，满了清场并短暂慢放。</li>' +
      '<li><b>目标</b>：活过 6 分钟，击碎 3:00 与 6:00 的墨渊巨像。</li></ul>' +
      '<p class="help-note">存档只在本机浏览器。换设备、换浏览器或清缓存会丢失，请先在「存档」里导出 JSON。</p>' +
      '</div>');
  };
  UI.saveModal = function () {
    this.openModal('存档',
      '<div class="help"><p class="help-lead">记录：' + this.bestText() + '</p>' +
      '<p>本作没有云端、没有账号。进度保存在当前浏览器的 localStorage。</p>' +
      '<div class="modal-actions"><button class="btn-ghost" id="btn-export">导出 JSON</button>' +
      '<button class="btn-ghost" id="btn-import">导入 JSON</button></div>' +
      '<p class="help-note">导出文件可以备份或带到另一台设备；导入时记录取新旧最大值。</p></div>');
    var self = this;
    $('btn-export').addEventListener('click', function () { self.exportSave(); });
    $('btn-import').addEventListener('click', function () { el['file-input'].click(); });
  };
  UI.openModal = function (title, html) {
    this._under = ['screen-title', 'screen-pause', 'screen-end'].filter(function (id) {
      return el[id] && !el[id].classList.contains('hidden');
    });
    this._under.forEach(function (id) { el[id].classList.add('hidden'); });
    el['modal-title'].textContent = title;
    el['modal-body'].innerHTML = html;
    el.modal.classList.remove('hidden');
    document.body.classList.add('blocked');
    this.updateLockHint();
  };
  UI.closeModal = function () {
    el.modal.classList.add('hidden');
    var self = this;
    (this._under || []).forEach(function (id) {
      if (id === 'screen-pause' && self.game.state !== 'paused') return;
      if (id === 'screen-end' && self.game.state !== 'dead' && self.game.state !== 'win') return;
      el[id].classList.remove('hidden');
    });
    this._under = null;
    if (this.game.state === 'playing') document.body.classList.remove('blocked');
    this.updateLockHint();
  };
  UI.exportSave = function () {
    var d = {
      app: 'chroma-tide', version: 1, exportedAt: new Date().toISOString(),
      bestKills: this.save.bestKills, bestTime: this.save.bestTime,
      bestCombo: this.save.bestCombo, runs: this.save.runs, sound: this.save.sound
    };
    var blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'chroma-tide-save.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    this.toast('已导出', '把 JSON 存到安全的地方', 'gold');
  };

  function fmt(t) {
    t = Math.max(0, t || 0);
    var m = Math.floor(t / 60), s = Math.floor(t % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  UI.fmt = fmt;
})(window.CT);
