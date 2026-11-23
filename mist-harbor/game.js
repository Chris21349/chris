/* ================================================================== */
/* 雾港未眠 · 游戏引擎                                                 */
/* ================================================================== */

(() => {
  "use strict";

  const SAVE_KEY = "wugang_save_v1";
  const SETTINGS_KEY = "wugang_settings_v1";
  const PROGRESS_KEY = "wugang_progress_v1";
  const ENDING_ORDER = [
    "shen-good", "shen-bad",
    "jiang-good", "jiang-bad",
    "lu-good", "lu-bad",
    "true"
  ];
  const TEXT_SPEEDS = [78, 52, 33, 20, 10];
  const AUTO_SPEEDS = [4800, 3500, 2500, 1700, 1100];
  const GLYPHS = { shen: "砚", jiang: "迟", lu: "鸦", su: "晚", suqing: "晴" };
  const PORTRAIT_FILES = {
    shen: "portraits/shen.jpg",
    jiang: "portraits/jiang.jpg",
    lu: "portraits/lu.jpg",
    su: "portraits/su.jpg",
    suqing: "portraits/suqing.jpg"
  };

  const $ = (id) => document.getElementById(id);

  const dom = {
    world: $("world"),
    sceneArt: $("sceneArt"),
    titleScreen: $("titleScreen"),
    gameScreen: $("gameScreen"),
    endingScreen: $("endingScreen"),
    titleHint: $("titleHint"),
    btnStart: $("btnStart"),
    btnContinue: $("btnContinue"),
    continueMeta: $("continueMeta"),
    btnGallery: $("btnGallery"),
    galleryCount: $("galleryCount"),
    btnSettingsTitle: $("btnSettingsTitle"),
    btnTrue: $("btnTrue"),
    hudChapter: $("hudChapter"),
    chapterBanner: $("chapterBanner"),
    chapterTitle: $("chapterTitle"),
    chapterSub: $("chapterSub"),
    portrait: $("portrait"),
    portraitGlyph: $("portraitGlyph"),
    portraitFigure: $("portraitFigure"),
    portraitRole: $("portraitRole"),
    portraitName: $("portraitName"),
    choiceLayer: $("choiceLayer"),
    choicePrompt: $("choicePrompt"),
    choiceList: $("choiceList"),
    dialogueWrap: $("dialogueWrap"),
    dialogue: $("dialogue"),
    speaker: $("speaker"),
    dialogueScene: $("dialogueScene"),
    lineText: $("lineText"),
    caret: $("caret"),
    continueHint: $("continueHint"),
    btnHistory: $("btnHistory"),
    btnHistoryInline: $("btnHistoryInline"),
    btnAuto: $("btnAuto"),
    btnAutoInline: $("btnAutoInline"),
    btnSettings: $("btnSettings"),
    btnExit: $("btnExit"),
    autoBadge: $("autoBadge"),
    historyModal: $("historyModal"),
    historyList: $("historyList"),
    settingsModal: $("settingsModal"),
    galleryModal: $("galleryModal"),
    galleryGrid: $("galleryGrid"),
    galleryIntro: $("galleryIntro"),
    confirmModal: $("confirmModal"),
    confirmText: $("confirmText"),
    btnConfirmNo: $("btnConfirmNo"),
    btnConfirmYes: $("btnConfirmYes"),
    textSpeed: $("textSpeed"),
    textSpeedValue: $("textSpeedValue"),
    autoSpeed: $("autoSpeed"),
    autoSpeedValue: $("autoSpeedValue"),
    reduceMotion: $("reduceMotion"),
    endingKicker: $("endingKicker"),
    endingNumber: $("endingNumber"),
    endingTitle: $("endingTitle"),
    endingQuote: $("endingQuote"),
    endingNote: $("endingNote"),
    endingProgress: $("endingProgress"),
    btnEndingTitle: $("btnEndingTitle"),
    btnEndingReplay: $("btnEndingReplay"),
    btnEndingTrue: $("btnEndingTrue"),
    toast: $("toast")
  };

  let settings = Object.assign(
    { textSpeed: 3, autoSpeed: 3, reduceMotion: false },
    readJSON(SETTINGS_KEY, {})
  );
  let progress = Object.assign(
    { endings: {}, trueUnlocked: false },
    readJSON(PROGRESS_KEY, {})
  );
  if (!progress.endings || typeof progress.endings !== "object") progress.endings = {};

  let savedGame = readValidSave();
  let state = null;
  let currentScene = null;
  let currentPortrait = null;
  let screen = "title";
  let activeModal = null;
  let confirmCallback = null;
  let choiceOpen = false;
  let autoMode = false;
  let typing = false;
  let typeTimer = null;
  let autoTimer = null;
  let chapterTimer = null;
  let toastTimer = null;
  let typeToken = 0;
  let fullLine = "";

  /* ------------------------------------------------------------------ */
  /* Storage                                                            */
  /* ------------------------------------------------------------------ */

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      /* 私人模式或存储被禁用时，游戏仍可正常阅读。 */
    }
  }

  function removeKey(key) {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      /* ignore */
    }
  }

  function readValidSave() {
    const save = readJSON(SAVE_KEY, null);
    if (!save || typeof save !== "object") return null;
    if (!STORY[save.sceneId]) return null;
    if (typeof save.index !== "number" || save.index < 0) return null;
    return save;
  }

  function writeSave() {
    if (!state || !currentScene || screen !== "game") return;
    if (currentScene.ending) return;
    const payload = {
      v: 1,
      sceneId: state.sceneId,
      index: state.index,
      chapter: state.chapter || "",
      trueRoute: !!state.trueRoute,
      log: Array.isArray(state.log) ? state.log.slice(-160) : [],
      savedAt: Date.now()
    };
    writeJSON(SAVE_KEY, payload);
    savedGame = payload;
  }

  function clearSave() {
    removeKey(SAVE_KEY);
    savedGame = null;
  }

  function saveProgress() {
    writeJSON(PROGRESS_KEY, progress);
  }

  /* ------------------------------------------------------------------ */
  /* Settings                                                           */
  /* ------------------------------------------------------------------ */

  function applySettings() {
    const speed = clamp(Number(settings.textSpeed) || 3, 1, 5);
    const auto = clamp(Number(settings.autoSpeed) || 3, 1, 5);
    settings.textSpeed = speed;
    settings.autoSpeed = auto;
    settings.reduceMotion = !!settings.reduceMotion;

    document.body.classList.toggle("reduce-motion", settings.reduceMotion);

    if (dom.textSpeed) dom.textSpeed.value = String(speed);
    if (dom.autoSpeed) dom.autoSpeed.value = String(auto);
    if (dom.reduceMotion) dom.reduceMotion.checked = settings.reduceMotion;
    if (dom.textSpeedValue) dom.textSpeedValue.textContent = ["很慢", "慢", "适中", "快", "很快"][speed - 1];
    if (dom.autoSpeedValue) dom.autoSpeedValue.textContent = ["悠长", "从容", "适中", "较快", "迅速"][auto - 1];
  }

  function updateSettingsFromInputs() {
    settings.textSpeed = clamp(Number(dom.textSpeed.value) || 3, 1, 5);
    settings.autoSpeed = clamp(Number(dom.autoSpeed.value) || 3, 1, 5);
    settings.reduceMotion = !!dom.reduceMotion.checked;
    writeJSON(SETTINGS_KEY, settings);
    applySettings();
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  /* ------------------------------------------------------------------ */
  /* Screen & world                                                     */
  /* ------------------------------------------------------------------ */

  function setScreen(name) {
    screen = name;
    dom.titleScreen.hidden = name !== "title";
    dom.gameScreen.hidden = name !== "game";
    dom.endingScreen.hidden = name !== "ending";
    dom.world.classList.toggle("on-title", name === "title");
    document.body.dataset.screen = name;
  }

  function setWorldBackground(bg, weather, force = false) {
    const key = SCENE_ART[bg] ? bg : "studio";
    if (force || dom.world.dataset.bg !== key || !dom.sceneArt.firstElementChild) {
      dom.world.dataset.bg = key;
      dom.sceneArt.classList.remove("in");
      dom.sceneArt.innerHTML = SCENE_ART[key];
      void dom.sceneArt.offsetWidth;
      requestAnimationFrame(() => dom.sceneArt.classList.add("in"));
    }
    dom.world.dataset.weather = weather || "rain";
  }

  function clearPortrait() {
    currentPortrait = null;
    dom.portrait.classList.remove("is-on", "is-muted");
    delete dom.portrait.dataset.char;
    dom.portraitFigure.innerHTML = "";
    dom.portraitGlyph.textContent = "";
    dom.portraitRole.textContent = "";
    dom.portraitName.textContent = "";
  }

  function setPortrait(who) {
    const character = CHARACTERS[who];
    if (character && character.portrait) {
      const key = character.portrait;
      if (currentPortrait !== key) {
        currentPortrait = key;
        dom.portraitGlyph.textContent = GLYPHS[key] || "";
        dom.portraitFigure.innerHTML = PORTRAIT_ART[key] || "";
        dom.portraitRole.textContent = character.role || "";
        dom.portraitName.textContent = character.name;
        dom.portrait.style.setProperty("--accent", character.color);
        dom.portrait.dataset.char = key;
        dom.portrait.classList.remove("is-muted");
        dom.portrait.classList.add("is-on");
        if (dom.portraitFigure.animate) {
          dom.portraitFigure.animate(
            [
              { opacity: 0, transform: "translateY(18px)" },
              { opacity: 1, transform: "translateY(0)" }
            ],
            { duration: 700, easing: "cubic-bezier(0.22, 0.61, 0.36, 1)" }
          );
        }
      } else {
        dom.portrait.classList.remove("is-muted");
        dom.portrait.classList.add("is-on");
      }
      return;
    }

    if (currentPortrait) {
      dom.portrait.classList.add("is-muted");
    } else {
      dom.portrait.classList.remove("is-on");
    }
  }

  /* ------------------------------------------------------------------ */
  /* Title                                                              */
  /* ------------------------------------------------------------------ */

  function showTitle() {
    stopAuto();
    clearTimers();
    closeAllModals();
    setScreen("title");
    setWorldBackground("lighthouse", "rain");
    state = null;
    currentScene = null;
    choiceOpen = false;
    dom.choiceLayer.hidden = true;
    dom.chapterBanner.classList.remove("show");
    clearPortrait();
    refreshTitle();
    dom.titleScreen.scrollTop = 0;
  }

  function refreshTitle() {
    savedGame = readValidSave();
    const unlocked = Object.keys(progress.endings || {}).filter((key) => ENDINGS[key]).length;
    progress.trueUnlocked = progress.trueUnlocked || unlocked > 0;

    dom.btnContinue.hidden = !savedGame;
    if (savedGame) {
      dom.continueMeta.textContent = shortChapter(savedGame.chapter) || "自动存档";
    }

    dom.galleryCount.textContent = `${unlocked} / ${ENDING_ORDER.length}`;
    dom.btnTrue.hidden = !progress.trueUnlocked;
    if (progress.trueUnlocked) {
      const trueDone = !!(progress.endings && progress.endings.true);
      dom.btnTrue.querySelector(".btn-meta").textContent = trueDone ? "TRUE END 已抵达" : "终章已解锁";
    }
  }

  function shortChapter(chapter) {
    if (!chapter) return "";
    const match = chapter.match(/^第[一二三四五六七八九十]+章|^终章/);
    return match ? match[0] : chapter;
  }

  function startNewStory() {
    clearSave();
    beginStory(OPENING_SCENE);
  }

  function beginStory(sceneId) {
    closeAllModals();
    stopAuto();
    clearTimers();
    setScreen("game");
    state = {
      sceneId,
      index: 0,
      log: [],
      chapter: null,
      trueRoute: sceneId === "t1",
      restored: false
    };
    currentScene = null;
    currentPortrait = null;
    clearPortrait();
    enterScene(sceneId, { index: 0 });
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }

  function continueStory() {
    savedGame = readValidSave();
    if (!savedGame) {
      refreshTitle();
      toast("没有可继续的存档");
      return;
    }
    closeAllModals();
    stopAuto();
    clearTimers();
    setScreen("game");
    state = {
      sceneId: savedGame.sceneId,
      index: savedGame.index,
      log: Array.isArray(savedGame.log) ? savedGame.log : [],
      chapter: savedGame.chapter || null,
      trueRoute: !!savedGame.trueRoute,
      restored: true
    };
    currentScene = null;
    clearPortrait();
    enterScene(savedGame.sceneId, { index: savedGame.index, resume: true });
    toast("已继续上次的进度");
  }

  function exitToTitle() {
    if (screen !== "game") {
      showTitle();
      return;
    }
    writeSave();
    stopAuto();
    showTitle();
    toast("进度已自动保存");
  }

  /* ------------------------------------------------------------------ */
  /* Scene flow                                                         */
  /* ------------------------------------------------------------------ */

  function enterScene(sceneId, options = {}) {
    const scene = STORY[sceneId];
    if (!scene) {
      console.warn("Missing scene:", sceneId);
      return;
    }

    clearTimeout(autoTimer);
    autoTimer = null;
    choiceOpen = false;
    dom.choiceLayer.hidden = true;
    dom.choiceList.innerHTML = "";
    dom.dialogueWrap.classList.remove("is-hidden");

    currentScene = scene;
    state.sceneId = sceneId;
    state.index = Number.isInteger(options.index) ? options.index : 0;
    state.restored = !!options.resume;

    setWorldBackground(scene.bg || "studio", scene.weather || "rain");
    dom.hudChapter.textContent = scene.chapter || "雾港未眠";
    dom.dialogueScene.textContent = scene.chapter || "";

    clearPortrait();

    if (scene.chapter && scene.chapter !== state.chapter) {
      showChapterBanner(scene);
      state.chapter = scene.chapter;
    }

    if (scene.ending) {
      clearSave();
    }

    renderCurrent();
  }

  function showChapterBanner(scene) {
    clearTimeout(chapterTimer);
    dom.chapterTitle.textContent = scene.chapter || "";
    dom.chapterSub.textContent = scene.sub || "";
    dom.chapterBanner.classList.remove("show");
    void dom.chapterBanner.offsetWidth;
    dom.chapterBanner.classList.add("show");
    chapterTimer = setTimeout(() => {
      dom.chapterBanner.classList.remove("show");
    }, 3000);
  }

  function normalizeLine(line) {
    if (Array.isArray(line)) {
      return { who: line[0] || "narrator", text: line[1] || "" };
    }
    if (line && typeof line === "object") return line;
    return { who: "narrator", text: String(line || "") };
  }

  function renderCurrent() {
    if (!state || !currentScene) return;
    if (state.index >= currentScene.lines.length) {
      handleSceneEnd();
      return;
    }

    const raw = currentScene.lines[state.index];
    if (raw && raw.choice) {
      showChoices(raw);
      writeSave();
      return;
    }

    const line = normalizeLine(raw);
    const skipLog = !!state.restored;
    state.restored = false;
    showLine(line, { skipLog });
    writeSave();
  }

  function handleSceneEnd() {
    clearTimeout(autoTimer);
    autoTimer = null;
    if (currentScene.ending) {
      finishEnding(currentScene.ending);
      return;
    }
    if (currentScene.next) {
      enterScene(currentScene.next, { index: 0 });
      return;
    }
    toast("故事到这里停了一会儿。");
  }

  /* ------------------------------------------------------------------ */
  /* Dialogue                                                           */
  /* ------------------------------------------------------------------ */

  function showLine(line, options = {}) {
    const character = CHARACTERS[line.who] || CHARACTERS.narrator;
    const text = String(line.text || "");
    const tone = line.tone || character.tone || "";

    dom.dialogue.dataset.who = line.who;
    if (tone) {
      dom.dialogue.dataset.tone = tone;
    } else {
      delete dom.dialogue.dataset.tone;
    }
    dom.dialogue.style.setProperty("--accent", character.color || "#d7b178");
    dom.speaker.textContent = character.name || "";
    dom.dialogueScene.textContent = currentScene.chapter || "";
    setPortrait(line.who);

    if (!options.skipLog) {
      pushHistory(line, character);
    }

    fullLine = text;
    typeLine(text);
  }

  function pushHistory(line, character) {
    if (!state) return;
    if (!Array.isArray(state.log)) state.log = [];
    state.log.push({
      who: line.who,
      name: character.name || "旁白",
      text: line.text
    });
    if (state.log.length > 240) state.log.splice(0, state.log.length - 240);
  }

  function typeLine(text) {
    clearTimeout(typeTimer);
    typeToken += 1;
    const token = typeToken;
    typing = true;
    dom.lineText.textContent = "";
    dom.caret.classList.remove("is-hidden");
    dom.continueHint.textContent = "点击显示全文";
    dom.dialogue.classList.add("is-typing");

    let index = 0;
    const base = TEXT_SPEEDS[clamp(settings.textSpeed, 1, 5) - 1];

    const step = () => {
      if (token !== typeToken) return;
      index += 1;
      dom.lineText.textContent = text.slice(0, index);

      if (index >= text.length) {
        finishTyping();
        return;
      }

      const char = text[index - 1];
      let delay = base;
      if (/[。！？…]/.test(char)) delay += base * 3;
      else if (/[，、；：]/.test(char)) delay += base * 1.4;
      else if (char === "\n") delay += base * 5;

      typeTimer = setTimeout(step, delay);
    };

    if (!text.length) {
      finishTyping();
    } else {
      typeTimer = setTimeout(step, base);
    }
  }

  function finishTyping() {
    clearTimeout(typeTimer);
    typeTimer = null;
    typeToken += 1;
    typing = false;
    dom.lineText.textContent = fullLine;
    dom.caret.classList.add("is-hidden");
    dom.dialogue.classList.remove("is-typing");
    dom.continueHint.textContent = "点击继续";
    if (autoMode) scheduleAuto();
  }

  function advance() {
    if (screen !== "game" || activeModal || choiceOpen) return;
    if (typing) {
      finishTyping();
      return;
    }
    if (!state || !currentScene) return;
    clearTimeout(autoTimer);
    autoTimer = null;
    state.index += 1;
    renderCurrent();
  }

  /* ------------------------------------------------------------------ */
  /* Choices                                                            */
  /* ------------------------------------------------------------------ */

  function showChoices(node) {
    choiceOpen = true;
    clearTimeout(autoTimer);
    autoTimer = null;
    dom.dialogueWrap.classList.add("is-hidden");
    dom.choiceLayer.hidden = false;
    dom.choicePrompt.textContent = node.choice || "";
    dom.choiceList.innerHTML = "";

    node.options.forEach((option, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice-option";
      button.style.setProperty("--delay", `${index * 90}ms`);

      const num = document.createElement("span");
      num.className = "choice-num";
      num.textContent = String(index + 1).padStart(2, "0");

      const label = document.createElement("span");
      label.className = "choice-text";
      label.textContent = option.text;

      const arrow = document.createElement("span");
      arrow.className = "choice-arrow";
      arrow.textContent = "→";

      button.append(num, label, arrow);
      button.addEventListener("click", () => selectChoice(option));
      dom.choiceList.append(button);
    });
  }

  function selectChoice(option) {
    if (!choiceOpen) return;
    choiceOpen = false;
    const buttons = dom.choiceList.querySelectorAll("button");
    buttons.forEach((button) => { button.disabled = true; });

    if (state && option && option.text) {
      pushHistory(
        { who: "choice", name: "你的选择", text: option.text },
        { name: "你的选择" }
      );
    }

    dom.choiceLayer.hidden = true;
    dom.choiceList.innerHTML = "";
    dom.dialogueWrap.classList.remove("is-hidden");
    stopAuto();

    if (option && option.next && STORY[option.next]) {
      enterScene(option.next, { index: 0 });
    } else {
      toast("雾里没有这条路。");
    }
  }

  /* ------------------------------------------------------------------ */
  /* Auto                                                               */
  /* ------------------------------------------------------------------ */

  function toggleAuto() {
    setAuto(!autoMode);
    if (autoMode) {
      toast("自动播放已开启");
    }
  }

  function setAuto(value) {
    autoMode = !!value;
    dom.btnAuto.classList.toggle("is-active", autoMode);
    dom.btnAutoInline.classList.toggle("is-active", autoMode);
    dom.autoBadge.hidden = !autoMode;
    clearTimeout(autoTimer);
    autoTimer = null;
    if (autoMode) {
      if (!typing) scheduleAuto();
    }
  }

  function stopAuto() {
    setAuto(false);
  }

  function scheduleAuto() {
    clearTimeout(autoTimer);
    if (!autoMode || typing || choiceOpen || activeModal || screen !== "game") return;
    const base = AUTO_SPEEDS[clamp(settings.autoSpeed, 1, 5) - 1];
    const readingTime = Math.min(3000, fullLine.length * 38);
    autoTimer = setTimeout(() => {
      if (!autoMode) return;
      if (typing) return;
      advance();
    }, base + readingTime);
  }

  /* ------------------------------------------------------------------ */
  /* Ending                                                             */
  /* ------------------------------------------------------------------ */

  function finishEnding(key) {
    const ending = ENDINGS[key];
    if (!ending) return;

    stopAuto();
    clearTimers();
    clearSave();

    const isNew = !progress.endings[key];
    progress.endings[key] = true;
    progress.trueUnlocked = true;
    saveProgress();

    setScreen("ending");
    setWorldBackground(ending.bg || "dawn", "clear");
    clearPortrait();

    const unlocked = ENDING_ORDER.filter((id) => progress.endings[id]).length;
    dom.endingScreen.classList.toggle("is-true", !!ending.trueEnd);
    dom.endingKicker.textContent = `${ending.trueEnd ? "TRUE END" : "ENDING " + ending.no} · ${ending.route}`;
    dom.endingNumber.textContent = `${ending.no} / ${String(ENDING_ORDER.length).padStart(2, "0")}`;
    dom.endingTitle.textContent = ending.title;
    dom.endingQuote.textContent = `「${ending.quote}」`;
    dom.endingNote.textContent = ending.note || "";
    dom.endingProgress.textContent =
      `已收录 ${unlocked} / ${ENDING_ORDER.length} 个结局` +
      (unlocked >= ENDING_ORDER.length ? " · 所有的雾都散了" : " · 雾里还有其他岔路");
    dom.btnEndingTrue.hidden = !progress.trueUnlocked || !!ending.trueEnd;
    dom.btnEndingTrue.textContent = "读终章";

    if (isNew) {
      dom.endingNote.textContent = `${ending.note || ""}　新结局已收录`;
    }

    refreshTitleMetaOnly();
  }

  function refreshTitleMetaOnly() {
    const unlocked = ENDING_ORDER.filter((id) => progress.endings[id]).length;
    dom.galleryCount.textContent = `${unlocked} / ${ENDING_ORDER.length}`;
    dom.btnTrue.hidden = !progress.trueUnlocked;
    const trueDone = !!(progress.endings && progress.endings.true);
    dom.btnTrue.querySelector(".btn-meta").textContent = trueDone ? "TRUE END 已抵达" : "终章已解锁";
  }

  /* ------------------------------------------------------------------ */
  /* Modals                                                             */
  /* ------------------------------------------------------------------ */

  function openModal(id) {
    if (!id || !dom[id]) return;
    document.querySelectorAll(".modal").forEach((modal) => {
      modal.hidden = modal.id !== id;
    });
    activeModal = id;
    dom[id].hidden = false;
    clearTimeout(autoTimer);
    autoTimer = null;
    const close = dom[id].querySelector(".modal-close");
    if (close) {
      window.setTimeout(() => close.focus({ preventScroll: true }), 40);
    }
  }

  function closeAllModals() {
    document.querySelectorAll(".modal").forEach((modal) => {
      modal.hidden = true;
    });
    activeModal = null;
    confirmCallback = null;
    if (screen === "game" && autoMode) scheduleAuto();
  }

  function openHistory() {
    if (!state) return;
    renderHistory();
    openModal("historyModal");
  }

  function renderHistory() {
    dom.historyList.innerHTML = "";
    const log = state && Array.isArray(state.log) ? state.log : [];
    if (!log.length) {
      const empty = document.createElement("p");
      empty.className = "history-empty";
      empty.textContent = "还没有可以回看的对话。";
      dom.historyList.append(empty);
      return;
    }

    log.forEach((entry) => {
      const item = document.createElement("div");
      item.className = "history-item" + (entry.who === "choice" ? " is-choice" : "");

      const who = document.createElement("span");
      who.className = "history-who";
      who.textContent = entry.name || (CHARACTERS[entry.who] && CHARACTERS[entry.who].name) || "旁白";

      const text = document.createElement("p");
      text.className = "history-text";
      text.textContent = entry.text || "";

      item.append(who, text);
      dom.historyList.append(item);
    });

    requestAnimationFrame(() => {
      dom.historyList.scrollTop = dom.historyList.scrollHeight;
    });
  }

  function openSettings() {
    applySettings();
    openModal("settingsModal");
  }

  function openGallery() {
    renderGallery();
    openModal("galleryModal");
  }

  function renderGallery() {
    dom.galleryGrid.innerHTML = "";
    const unlocked = ENDING_ORDER.filter((id) => progress.endings[id]).length;
    dom.galleryIntro.textContent =
      `已收录 ${unlocked} / ${ENDING_ORDER.length} 个结局。` +
      (unlocked >= ENDING_ORDER.length ? "所有的雾都散了。" : "雾里还有别的岔路。");

    ENDING_ORDER.forEach((key) => {
      const ending = ENDINGS[key];
      const isUnlocked = !!progress.endings[key];
      const card = document.createElement("article");
      card.className =
        "gallery-card" +
        (isUnlocked ? " is-unlocked" : " is-locked") +
        (ending.trueEnd ? " is-true" : "");

      const index = document.createElement("span");
      index.className = "gallery-card-index";
      index.textContent = `ENDING ${ending.no} · ${isUnlocked ? ending.route : "尚未抵达"}`;

      const title = document.createElement("h4");
      title.className = "gallery-card-title";
      title.textContent = isUnlocked ? ending.title : "？？？";

      const sub = document.createElement("p");
      sub.className = "gallery-card-sub";
      sub.textContent = isUnlocked
        ? `「${ending.quote}」`
        : "在别的雾里，也许有你没有做过的选择。";

      const lock = document.createElement("span");
      lock.className = "gallery-lock";
      lock.textContent = isUnlocked ? "◇" : "▢";

      card.append(index, title, sub, lock);
      dom.galleryGrid.append(card);
    });
  }

  function openConfirm(text, onYes) {
    confirmCallback = typeof onYes === "function" ? onYes : null;
    dom.confirmText.textContent = text;
    openModal("confirmModal");
  }

  function handleConfirmYes() {
    const callback = confirmCallback;
    closeAllModals();
    if (callback) callback();
  }

  /* ------------------------------------------------------------------ */
  /* Toast                                                              */
  /* ------------------------------------------------------------------ */

  function toast(message) {
    clearTimeout(toastTimer);
    dom.toast.textContent = message;
    dom.toast.classList.add("show");
    toastTimer = setTimeout(() => {
      dom.toast.classList.remove("show");
    }, 2200);
  }

  /* ------------------------------------------------------------------ */
  /* Timers                                                             */
  /* ------------------------------------------------------------------ */

  function clearTimers() {
    clearTimeout(typeTimer);
    clearTimeout(autoTimer);
    clearTimeout(chapterTimer);
    typeTimer = null;
    autoTimer = null;
    chapterTimer = null;
    typing = false;
    typeToken += 1;
  }

  /* ------------------------------------------------------------------ */
  /* Events                                                             */
  /* ------------------------------------------------------------------ */

  function bindEvents() {
    dom.btnStart.addEventListener("click", () => {
      if (readValidSave()) {
        openConfirm("开始新故事会覆盖当前自动存档，确定吗？", startNewStory);
      } else {
        startNewStory();
      }
    });

    dom.btnContinue.addEventListener("click", continueStory);

    dom.btnGallery.addEventListener("click", openGallery);
    dom.btnSettingsTitle.addEventListener("click", openSettings);
    dom.btnSettings.addEventListener("click", openSettings);

    dom.btnTrue.addEventListener("click", () => {
      if (readValidSave()) {
        openConfirm("阅读终章会覆盖当前自动存档。要先和这段雾告别吗？", () => beginStory("t1"));
      } else {
        beginStory("t1");
      }
    });

    dom.btnHistory.addEventListener("click", openHistory);
    dom.btnHistoryInline.addEventListener("click", (event) => {
      event.stopPropagation();
      openHistory();
    });

    dom.btnAuto.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleAuto();
    });
    dom.btnAutoInline.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleAuto();
    });

    dom.btnExit.addEventListener("click", (event) => {
      event.stopPropagation();
      exitToTitle();
    });

    dom.gameScreen.addEventListener("click", (event) => {
      if (event.target.closest("button, input, .modal, .hud")) return;
      if (choiceOpen || activeModal || screen !== "game") return;
      advance();
    });

    document.querySelectorAll("[data-close]").forEach((button) => {
      button.addEventListener("click", () => closeAllModals());
    });

    document.querySelectorAll(".modal").forEach((modal) => {
      modal.addEventListener("click", (event) => {
        if (event.target === modal) closeAllModals();
      });
    });

    dom.btnConfirmNo.addEventListener("click", closeAllModals);
    dom.btnConfirmYes.addEventListener("click", handleConfirmYes);

    dom.btnEndingTitle.addEventListener("click", showTitle);
    dom.btnEndingReplay.addEventListener("click", startNewStory);
    dom.btnEndingTrue.addEventListener("click", () => beginStory("t1"));

    dom.textSpeed.addEventListener("input", updateSettingsFromInputs);
    dom.autoSpeed.addEventListener("input", updateSettingsFromInputs);
    dom.reduceMotion.addEventListener("change", updateSettingsFromInputs);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (activeModal) {
          closeAllModals();
          return;
        }
        if (screen === "game" && !choiceOpen) {
          exitToTitle();
        }
        return;
      }

      if (activeModal) return;
      if (screen !== "game") return;
      const tag = (event.target && event.target.tagName) || "";
      if (tag === "INPUT" || tag === "BUTTON" || tag === "TEXTAREA") return;

      if (event.code === "Space" || event.code === "Enter" || event.key === "ArrowRight") {
        event.preventDefault();
        advance();
        return;
      }

      const key = (event.key || "").toLowerCase();
      if (key === "a") {
        event.preventDefault();
        toggleAuto();
        return;
      }
      if (key === "h") {
        event.preventDefault();
        openHistory();
        return;
      }

      if (choiceOpen && /^[1-9]$/.test(event.key)) {
        const index = Number(event.key) - 1;
        const button = dom.choiceList.children[index];
        if (button) button.click();
      }
    });

    window.addEventListener("beforeunload", () => {
      if (state && screen === "game") writeSave();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Init                                                               */
  /* ------------------------------------------------------------------ */

  function preloadPortraits() {
    Object.values(PORTRAIT_FILES).forEach((src) => {
      const image = new Image();
      image.src = src;
    });
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    if (!/^https?:$/.test(location.protocol)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {
        /* 离线安装不可用时，游戏本身仍然可以正常阅读。 */
      });
    });
  }

  function init() {
    applySettings();
    bindEvents();
    setWorldBackground("lighthouse", "rain", true);
    setScreen("title");
    refreshTitle();
    setAuto(false);
    preloadPortraits();
    registerServiceWorker();
  }

  init();
})();
