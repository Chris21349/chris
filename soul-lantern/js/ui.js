/* 彩潮 · UI：HUD / 升级卡 / 摇杆 / 暂停 / 结算 / 存档 */
'use strict';
(function (CT) {
  var U = CT.U, S = CT.Sound;
  var UI = CT.UI = { game: null, save: null, cards: null, onCard: null, pickLock: false };
  var $ = function (id) { return document.getElementById(id); };
  var el = {};

  var ICONS = {
    blade: '<path d="M24 5c9.5 6.5 12.5 19 0 33C11.5 24 14.5 11.5 24 5z" fill="#D24B33" stroke="#F2E8D5" stroke-width="2" stroke-linejoin="round"/><path d="M24 11c4 6 5 15 0 22" fill="none" stroke="#E8BE74" stroke-width="2" stroke-linecap="round"/><path d="M15 36l-5 7" stroke="#E8BE74" stroke-width="3" stroke-linecap="round"/>',
    nova: '<circle cx="24" cy="24" r="6.5" fill="#D08A54" stroke="#F2E8D5" stroke-width="2"/><g stroke="#E8BE74" stroke-width="2.6" stroke-linecap="round"><path d="M24 4v7M24 37v7M4 24h7M37 24h7M10 10l5 5M33 33l5 5M38 10l-5 5M15 33l-5 5"/></g>',
    chain: '<path d="M18 4l10 15-9 2 12 23" fill="none" stroke="#86B7C9" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="18" cy="4" r="2.6" fill="#F2E8D5"/><circle cx="31" cy="44" r="2.6" fill="#F2E8D5"/>',
    rain: '<g fill="#A4576F" stroke="#F2E8D5" stroke-width="1.6"><path d="M17 8c4 6 5 9 0 13-5-4-4-7 0-13z"/><path d="M31 18c4 6 5 9 0 13-5-4-4-7 0-13z"/><path d="M19 31c4 6 5 9 0 13-5-4-4-7 0-13z"/></g>',
    speed: '<g fill="none" stroke="#8E9B55" stroke-width="3" stroke-linecap="round"><path d="M9 36c12 0 20-7 26-22"/><path d="M16 40c10 0 18-6 24-18"/><path d="M25 41c8 0 14-4 18-13"/></g><path d="M35 14l5-8-1 10z" fill="#E8BE74"/>',
    heart: '<path d="M24 41C10 31 6 23 8.5 16.5 10.5 11 16 9 20.5 12L24 15l3.5-3C32 9 37.5 11 39.5 16.5 42 23 38 31 24 41z" fill="#C85C6A" stroke="#F2E8D5" stroke-width="2"/><path d="M20 18c-3 1-4 4-3.5 7" stroke="#E8BE74" stroke-width="2" fill="none" stroke-linecap="round"/>',
    magnet: '<path d="M12 8v17a12 12 0 0 0 24 0V8h-8v17a4 4 0 0 1-8 0V8z" fill="none" stroke="#E8BE74" stroke-width="5" stroke-linejoin="round"/><path d="M15 8h5M28 8h5" stroke="#F2E8D5" stroke-width="5"/>',
    edge: '<path d="M36 5L12 34l8 2 18-27z" fill="#F2E8D5" stroke="#1A1714" stroke-width="1.5"/><path d="M12 34l-3 9 9-3" fill="#E8BE74"/><path d="M31 14l-9 12" stroke="#E8BE74" stroke-width="2"/>',
    haste: '<g fill="none" stroke="#86B7C9" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M13 20l8-9 8 9"/><path d="M13 35l8-9 8 9"/><path d="M31 15h6v20h-6"/></g>',
    heal: '<circle cx="24" cy="24" r="17" fill="none" stroke="#C85C6A" stroke-width="3"/><path d="M24 14v20M14 24h20" stroke="#F2E8D5" stroke-width="4" stroke-linecap="round"/>',
    ult: '<circle cx="24" cy="24" r="7" fill="#E8BE74" stroke="#F2E8D5" stroke-width="2"/><g stroke="#E8BE74" stroke-width="2.6" stroke-linecap="round"><path d="M24 3v8M24 37v8M3 24h8M37 24h8M9 9l6 6M33 33l6 6M39 9l-6 6M15 33l-6 6"/></g>',
    dash: '<g fill="none" stroke="#F2E8D5" stroke-width="3" stroke-linecap="round"><path d="M10 18h16M14 24h16M8 30h14"/></g><path d="M28 26l9-2-5-7z" fill="#E8BE74"/>'
  };
  function svg(id, cls) {
    return '<svg class="' + (cls || 'ico') + '" viewBox="0 0 48 48" aria-hidden="true">' + (ICONS[id] || ICONS.blade) + '</svg>';
  }

  UI.init = function (game) {
    this.game = game;
    ['hud', 'controls', 'hp-fill', 'hp-text', 'lv', 'xp-fill', 'time', 'kills', 'combo', 'combo-n', 'toast',
      'bossbar', 'boss-fill', 'boss-name', 'stick-zone', 'stick', 'btn-dash', 'btn-ult', 'screen-title',
      'screen-levelup', 'cards', 'screen-pause', 'pause-stats', 'screen-end', 'end-title', 'end-kicker',
      'end-stats', 'end-best', 'modal', 'modal-title', 'modal-body', 'flash', 'loading', 'file-input',
      'btn-start', 'btn-pause', 'btn-resume', 'btn-restart', 'btn-quit', 'btn-again', 'btn-home',
      'btn-help', 'btn-sound', 'btn-save', 'btn-sound2', 'btn-save2', 'btn-help2', 'modal-close',
      'best-line', 'btn-export', 'btn-import'].forEach(function (k) { el[k] = $(k); });
    this.el = el;
    this.save = this.loadSave();
    S.setMuted(this.save.sound === false);
    this.refreshSound();
    this.bind();
    this.setupJoystick();
    this.setupActions();
    // 标题装饰
    if (el['best-line']) el['best-line'].textContent = this.bestText();
    setTimeout(function () { el.loading.classList.add('gone'); }, 420);
    // Android 返回键：优先暂停 / 继续，避免误退出
    window.__CT = {
      onBack: function () {
        if (self.game.state === 'playing') { self.game.pause(); return 1; }
        if (self.game.state === 'paused') { self.game.resume(); return 1; }
        if (self.game.state === 'levelup') { return 1; }
        return 0;
      }
    };
  };

  UI.loadSave = function () {
    try {
      var s = JSON.parse(localStorage.getItem('chromatide.save.v1') || '{}');
      return { bestKills: s.bestKills || 0, bestTime: s.bestTime || 0, runs: s.runs || 0, sound: s.sound !== false, bestCombo: s.bestCombo || 0 };
    } catch (e) { return { bestKills: 0, bestTime: 0, runs: 0, sound: true, bestCombo: 0 }; }
  };
  UI.persist = function () {
    try { localStorage.setItem('chromatide.save.v1', JSON.stringify(this.save)); } catch (e) { }
  };

  UI.bestText = function () {
    var s = this.save;
    if (!s.runs) return '尚无记录 · 第一笔由你落下';
    return '最佳收割 ' + s.bestKills + ' · 最长生存 ' + fmt(s.bestTime) + ' · 连斩 ' + s.bestCombo;
  };

  UI.bind = function () {
    var self = this, g = this.game;
    function click(id, fn) { if (el[id]) el[id].addEventListener('click', function (e) { e.stopPropagation(); S.resume(); S.play('ui'); fn(); }); }
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

    el['file-input'].addEventListener('change', function (e) {
      var f = e.target.files[0];
      if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var d = JSON.parse(rd.result);
          if (typeof d.bestKills !== 'number') throw new Error('bad');
          self.save.bestKills = Math.max(self.save.bestKills, d.bestKills || 0);
          self.save.bestTime = Math.max(self.save.bestTime, d.bestTime || 0);
          self.save.bestCombo = Math.max(self.save.bestCombo, d.bestCombo || 0);
          self.save.runs = Math.max(self.save.runs, d.runs || 0);
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
    var active = false, pid = null, ox = 0, oy = 0;
    var R = 58;
    function down(e) {
      if (self.game.state !== 'playing') return;
      if (e.target.closest && e.target.closest('.act')) return;
      active = true; pid = e.pointerId;
      ox = e.clientX; oy = e.clientY;
      var st = el.stick;
      st.classList.remove('hidden');
      st.style.left = ox + 'px'; st.style.top = oy + 'px';
      st.querySelector('.stick-knob').style.transform = 'translate(-50%,-50%)';
      self.game.input.x = 0; self.game.input.z = 0;
      try { zone.setPointerCapture && zone.setPointerCapture(pid); } catch (err) { }
    }
    function move(e) {
      if (!active || e.pointerId !== pid) return;
      var dx = e.clientX - ox, dy = e.clientY - oy;
      var len = Math.hypot(dx, dy);
      var k = len > R ? R / len : 1;
      var kx = dx * k, ky = dy * k;
      el.stick.querySelector('.stick-knob').style.transform = 'translate(calc(-50% + ' + kx + 'px), calc(-50% + ' + ky + 'px))';
      var nx = dx / R, ny = dy / R;
      var nl = Math.hypot(nx, ny);
      if (nl < 0.12) { self.game.input.x = 0; self.game.input.z = 0; return; }
      var m = Math.min(1, nl);
      self.game.input.x = nx / nl * m;
      self.game.input.z = ny / nl * m;
    }
    function up(e) {
      if (!active || (e && e.pointerId !== pid)) return;
      active = false; pid = null;
      el.stick.classList.add('hidden');
      self.game.input.x = 0; self.game.input.z = 0;
    }
    zone.addEventListener('pointerdown', down);
    zone.addEventListener('pointermove', move);
    zone.addEventListener('pointerup', up);
    zone.addEventListener('pointercancel', up);
    window.addEventListener('blur', up);
  };

  /* ---------- 按钮 ---------- */
  UI.setupActions = function () {
    var self = this;
    el['btn-dash'].innerHTML = '<span class="act-shade"></span>' + svg('dash', 'act-ico') + '<span class="act-label">闪身</span>';
    el['btn-ult'].innerHTML = '<span class="act-shade"></span>' + svg('ult', 'act-ico') + '<span class="act-label">万彩</span>';
    function tap(btn, fn) {
      btn.addEventListener('pointerdown', function (e) {
        e.preventDefault(); e.stopPropagation();
        fn();
      });
    }
    tap(el['btn-dash'], function () { if (self.game.state === 'playing') self.game.tryDash(); });
    tap(el['btn-ult'], function () { if (self.game.state === 'playing') self.game.tryUlt(); });
  };

  UI.updateActions = function (dashFrac, ultFrac) {
    if (!el['btn-dash']) return;
    var dash = Math.max(0, Math.min(1, dashFrac));
    el['btn-dash'].style.setProperty('--cd', dash.toFixed(3));
    el['btn-dash'].classList.toggle('ready', dash <= 0.001);
    var ult = Math.max(0, Math.min(1, ultFrac || 0));
    el['btn-ult'].style.setProperty('--cd', (1 - ult).toFixed(3));
    el['btn-ult'].classList.toggle('ready', ult >= 0.999);
  };

  /* ---------- 状态 ---------- */
  UI.beginRun = function () {
    this.hideAll();
    document.body.classList.add('playing');
    el.hud.classList.remove('hidden');
    el.controls.classList.remove('hidden');
    el.loading.classList.add('gone');
  };
  UI.showTitle = function (save) {
    this.hideAll();
    document.body.classList.add('on-title');
    el.hud.classList.add('hidden');
    el.controls.classList.add('hidden');
    if (el['best-line']) el['best-line'].textContent = this.bestText();
    el['screen-title'].classList.remove('hidden');
  };
  UI.hideAll = function () {
    document.body.classList.remove('on-title');
    ['screen-title', 'screen-levelup', 'screen-pause', 'screen-end', 'modal'].forEach(function (k) {
      el[k].classList.add('hidden');
    });
    document.body.classList.remove('blocked');
    this.cards = null; this.onCard = null;
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
    var self = this;
    Array.prototype.forEach.call(el.cards.querySelectorAll('.card'), function (node) {
      node.addEventListener('click', function () {
        self.choose(parseInt(node.getAttribute('data-i'), 10));
      });
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
    var w = run.weapons, p = run.passives;
    var names = { blade: '笔锋回旋', nova: '墨爆', chain: '雷链', rain: '墨雨' };
    var lines = [];
    Object.keys(w).forEach(function (k) {
      if (w[k].lvl > 0) lines.push('<span class="mini"><b>' + names[k] + '</b><em>Lv.' + w[k].lvl + '</em></span>');
    });
    el['pause-stats'].innerHTML =
      '<div class="pause-grid"><div><em>生存</em><b>' + fmt(run.time) + '</b></div>' +
      '<div><em>收割</em><b>' + run.kills + '</b></div>' +
      '<div><em>等级</em><b>Lv.' + run.level + '</b></div>' +
      '<div><em>最高连斩</em><b>' + run.bestCombo + '</b></div></div>' +
      '<div class="mini-row">' + lines.join('') + '</div>';
    el['screen-pause'].classList.remove('hidden');
    document.body.classList.add('blocked');
  };

  /* ---------- 结算 ---------- */
  UI.showEnd = function (run, save, win) {
    this.save = save;
    el['screen-pause'].classList.add('hidden');
    el.controls.classList.add('hidden');
    el.hud.classList.add('hidden');
    el['end-kicker'].textContent = win ? '整片荒原重新有了颜色' : '墨色漫过了你的脚踝';
    el['end-title'].textContent = win ? '荒原重燃' : '潮水退去';
    el['end-stats'].innerHTML =
      '<div class="end-grid">' +
      '<div><em>生存</em><b>' + fmt(run.time) + '</b></div>' +
      '<div><em>收割</em><b>' + run.kills + '</b></div>' +
      '<div><em>等级</em><b>Lv.' + run.level + '</b></div>' +
      '<div><em>最高连斩</em><b>' + run.bestCombo + '</b></div></div>';
    var nr = run.kills >= (save.bestKills || 0) && run.kills > 0;
    el['end-best'].innerHTML = (nr ? '<span class="newrec">新纪录</span>' : '') +
      '<span>最佳收割 ' + save.bestKills + ' · 最长生存 ' + fmt(save.bestTime) + '</span>';
    el['screen-end'].classList.remove('hidden');
    document.body.classList.remove('blocked');
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
  };

  UI.combo = function (n) {
    if (!el.combo) return;
    if (n >= 3) {
      el.combo.classList.remove('hidden');
      el['combo-n'].textContent = n;
      el.combo.classList.remove('pop');
      void el.combo.offsetWidth;
      el.combo.classList.add('pop');
    } else {
      el.combo.classList.add('hidden');
    }
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
    toastT = setTimeout(function () { el.toast.className = 'toast'; }, 1900);
  };
  UI.hurtFlash = function () {
    el.flash.className = 'hurt';
    clearTimeout(this._hurtT);
    this._hurtT = setTimeout(function () { el.flash.className = ''; }, 460);
  };
  UI.ultFlash = function () {
    el.flash.className = 'ult';
    clearTimeout(this._ultT);
    this._ultT = setTimeout(function () { el.flash.className = ''; }, 760);
  };

  /* ---------- 弹窗 ---------- */
  UI.help = function () {
    this.openModal('怎么玩',
      '<div class="help">' +
      '<p class="help-lead">你是荒原上最后一个还会调色的人。</p>' +
      '<ul><li><b>移动</b>：在屏幕上任意处拖动（左侧更顺手）；电脑用 WASD / 方向键。</li>' +
      '<li><b>自动攻击</b>：笔锋会自动环绕切割，升级后获得墨爆、雷链、墨雨。</li>' +
      '<li><b>闪身</b>：右下角，短距离冲刺 + 短暂无敌，冷却 2.6 秒。</li>' +
      '<li><b>万彩归一</b>：收割积攒能量，满了点右下角大招，清场并短暂慢放。</li>' +
      '<li><b>目标</b>：活过 6 分钟，击碎 3:00 与 6:00 的墨渊巨像。</li>' +
      '<li><b>颜料</b>：敌人掉落的金色颜料会飞向你，升级时三选一。</li></ul>' +
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
