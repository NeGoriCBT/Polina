(() => {
  "use strict";

  /** Same feeling question for every image.
   *  Left = lighter/calmer → center Спокойствие → right = heavier/sadder. */
  const FEELING_OPTIONS = [
    "Вдохновение",
    "Радость",
    "Умиротворение",
    "Интерес",
    "Спокойствие",
    "Равнодушие",
    "Грусть",
    "Тревога",
    "Раздражение",
  ];
  const FEELING_MID = 4;
  const FEELING_LAST = FEELING_OPTIONS.length - 1;
  /** Chronological survey order; `image` = tree-N.jpg slot. */
  const STYLES = [
    { name: "Ренессанс", year: "~1400", frame: "classic", image: 1 },
    { name: "Барокко", year: "~1600", frame: "baroque", image: 2 },
    { name: "Рококо", year: "~1730", frame: "rococo", image: 3 },
    { name: "Классицизм", year: "~1750", frame: "classicist", image: 4 },
    { name: "Романтизм", year: "~1820", frame: "romantic", image: 17 },
    { name: "Импрессионизм", year: "~1874", frame: "impression", image: 5 },
    { name: "Фовизм", year: "~1905", frame: "darkwood", image: 6 },
    { name: "Экспрессионизм", year: "~1905", frame: "darkwood", image: 7 },
    { name: "Кубизм", year: "~1907", frame: "black", image: 8 },
    { name: "Авангардизм", year: "~1910", frame: "black", image: 9 },
    { name: "Абстракционизм", year: "~1910", frame: "gallery", image: 10 },
    { name: "Супрематизм", year: "~1915", frame: "suprematist", image: 11 },
    { name: "Дадаизм", year: "~1916", frame: "dada", image: 12 },
    { name: "Сюрреализм", year: "~1924", frame: "surreal", image: 13 },
    { name: "Активная живопись", year: "~1945", frame: "action", image: 14 },
    { name: "Минимализм", year: "~1960", frame: "minimal", image: 15 },
    { name: "Поп-арт", year: "~1962", frame: "pop", image: 16 },
    { name: "Постмодернизм", year: "~1980", frame: "postmodern", image: 18 },
  ];
  const FRAME_TYPES = [
    "classic",
    "baroque",
    "rococo",
    "classicist",
    "romantic",
    "impression",
    "darkwood",
    "black",
    "gallery",
    "suprematist",
    "dada",
    "surreal",
    "action",
    "minimal",
    "pop",
    "postmodern",
  ];
  const SLIDES = STYLES.map((style) => ({
    image: style.image,
    name: style.name,
    year: style.year,
    frame: style.frame,
    label: `${style.name} ${style.year}`,
    id: "feeling",
    text: "Что вы чувствуете в первую очередь?",
    options: FEELING_OPTIONS,
  }));

  const SLIDE_COUNT = SLIDES.length;
  const EXT_CANDIDATES = [".jpg", ".jpeg", ".webp", ".png"];
  const STORAGE_KEY = "tree-survey-submissions-v10";
  const LAST_KEY = "tree-survey-last-v10";
  const MY_TREE_KEY = "tree-survey-my-tree-v2";
  const DONE_KEY = "tree-survey-done-v1";
  const SUBMISSION_SCHEMA = 8;
  const REWARD_CORNERS = [
    { key: "tl", left: "0", top: "0" },
    { key: "tr", left: "-100%", top: "0" },
    { key: "bl", left: "0", top: "-100%" },
    { key: "br", left: "-100%", top: "-100%" },
  ];
  const FORTUNES = [
    "Скоро тебе откроется что-то простое и светлое.",
    "Впереди день, который запомнится хорошим чувством.",
    "Лёгкая радость придёт сама — почти незаметно.",
    "Всё встанет на места мягко и без спешки.",
    "Тебя ждёт тихий знак, что всё будет хорошо.",
    "Одно тёплое мгновение согреет весь день.",
    "Яркий день найдёт тебя, даже если небо серое.",
    "Ответ придёт.",
    "Удача ждёт.",
    "Понимание придёт тихо и без спешки.",
    "Останется только то, что по-настоящему нужно и тепло.",
    "Кто-то милый окажется рядом.",
    "Приятный сюрприз найдёт тебя без лишнего шума.",
    "Твоя попытка встретит поддержку.",
    "Тебя заметят с добротой и улыбкой.",
    "Всё важное сбудется.",
    "Богатство ждёт.",
    "Любовь ждёт.",
  ];
  /** Preloaded image URLs → HTMLImageElement (complete). */
  const imageCache = new Map();

  /** GitHub Pages has no Node API. */
  const STATIC_HOST =
    typeof location !== "undefined" &&
    (/\.github\.io$/i.test(location.hostname) || location.protocol === "file:");

  const remoteCfg =
    (typeof window !== "undefined" && window.TREE_SURVEY_CONFIG && window.TREE_SURVEY_CONFIG.remote) || null;
  const HAS_REMOTE =
    !!(remoteCfg && remoteCfg.provider === "mantledb" && remoteCfg.baseUrl && remoteCfg.namespace && remoteCfg.key);

  const els = {
    intro: document.getElementById("screen-intro"),
    survey: document.getElementById("screen-survey"),
    reward: document.getElementById("screen-reward"),
    results: document.getElementById("screen-results"),
    btnStart: document.getElementById("btn-start"),
    btnClaimTree: document.getElementById("btn-claim-tree"),
    btnDownloadTree: document.getElementById("btn-download-tree"),
    btnRewardResults: document.getElementById("btn-reward-results"),
    rewardLead: document.getElementById("reward-lead"),
    rewardFrame: document.getElementById("reward-frame"),
    rewardTree: document.getElementById("reward-tree"),
    rewardFortune: document.getElementById("reward-fortune"),
    rewardFortuneText: document.getElementById("reward-fortune-text"),
    rewardCaption: document.getElementById("reward-caption"),
    styleName: document.getElementById("style-name"),
    styleYear: document.getElementById("style-year"),
    surveyImage: document.getElementById("survey-image"),
    imagePlaceholder: document.getElementById("image-placeholder"),
    imageLabel: document.getElementById("image-label"),
    questionText: document.getElementById("question-text"),
    feelingValue: document.getElementById("feeling-value"),
    feelingMark: document.getElementById("feeling-mark"),
    feelingSlider: document.getElementById("feeling-slider"),
    feelingPrev: document.getElementById("feeling-prev"),
    feelingNext: document.getElementById("feeling-next"),
    feelingConfirm: document.getElementById("feeling-confirm"),
    feelingList: document.getElementById("feeling-list"),
    resultsSub: document.getElementById("results-sub"),
    resultsGrid: document.getElementById("results-grid"),
    resultsNote: document.getElementById("results-note"),
  };

  const state = {
    feelingIndex: FEELING_MID,
    slideIndex: 0,
    answers: [],
    busy: false,
    storageMode: HAS_REMOTE ? "remote" : STATIC_HOST ? "local" : "server",
    pendingResultsAnswers: null,
    rewardParts: null,
    rewardFortune: null,
    rewardTimers: new Set(),
  };

  let introHybrid = null;

  function showScreen(name) {
    const map = {
      intro: els.intro,
      survey: els.survey,
      reward: els.reward,
      results: els.results,
    };
    for (const [key, el] of Object.entries(map)) {
      if (!el) continue;
      const active = key === name;
      el.hidden = !active;
      el.classList.toggle("is-active", active);
    }
    if (!introHybrid) return;
    if (name === "intro") introHybrid.restart();
    else introHybrid.stop();
  }

  function setRouteHash(hash) {
    const next = hash ? `#${hash}` : location.pathname + location.search;
    if (hash) {
      if (location.hash !== `#${hash}`) history.replaceState(null, "", `#${hash}`);
    } else if (location.hash) {
      history.replaceState(null, "", next);
    }
  }

  function goHome() {
    showScreen("intro");
    setRouteHash("");
  }

  function goMyTree() {
    const existing = readMyTree();
    const fromState = state.pendingResultsAnswers || state.answers;
    const answers =
      fromState && fromState.length ? fromState : getLastAnswers() || [];
    showRewardScreen(answers);
    if (!existing && !answers.length) {
      if (els.rewardLead) {
        els.rewardLead.textContent =
          "Сначала пройдите опрос — после него можно получить своё дерево один раз.";
      }
      if (els.btnClaimTree) {
        els.btnClaimTree.hidden = true;
        els.btnClaimTree.disabled = true;
      }
    }
    setRouteHash("my-tree");
  }

  function hasCompletedSurvey() {
    if (window.TreeSurveyMenu && window.TreeSurveyMenu.hasCompletedSurvey) {
      return window.TreeSurveyMenu.hasCompletedSurvey();
    }
    try {
      if (localStorage.getItem(DONE_KEY) === "1") return true;
      if (localStorage.getItem(MY_TREE_KEY)) return true;
      if (localStorage.getItem(LAST_KEY)) return true;
    } catch {
      /* ignore */
    }
    return false;
  }

  function markSurveyDone() {
    try {
      localStorage.setItem(DONE_KEY, "1");
    } catch {
      /* ignore */
    }
    if (window.TreeSurveyMenu && window.TreeSurveyMenu.markDone) {
      window.TreeSurveyMenu.markDone();
    }
  }

  function goResultsNav() {
    if (!hasCompletedSurvey()) {
      goHome();
      return;
    }
    showResults(getLastAnswers());
    setRouteHash("results");
  }

  function syncStartButton() {
    if (!els.btnStart) return;
    if (hasCompletedSurvey()) {
      els.btnStart.textContent = "Моё дерево";
      els.btnStart.disabled = false;
      els.btnStart.title = "Опрос можно пройти только один раз";
    } else {
      els.btnStart.textContent = "Далее";
      els.btnStart.disabled = false;
      els.btnStart.title = "";
    }
  }

  function applyRouteFromHash() {
    const hash = (location.hash || "").replace(/^#/, "");
    if (hash === "results") goResultsNav();
    else if (hash === "my-tree") goMyTree();
  }

  window.TreeSurveyNav = {
    goHome,
    goMyTree,
    goResults: goResultsNav,
  };

  function imageUrl(n, ext) {
    return `images/tree-${n}${ext}`;
  }

  function styleFor(n) {
    return (
      SLIDES.find((s) => s.image === n) || {
        name: `Стиль ${n}`,
        year: "",
        label: `Стиль ${n}`,
        frame: "classic",
      }
    );
  }

  function setPictureFrame(el, frameType) {
    if (!el) return;
    const type = FRAME_TYPES.includes(frameType) ? frameType : "classic";
    el.classList.add("picture-frame");
    for (const t of FRAME_TYPES) {
      el.classList.toggle(`picture-frame--${t}`, t === type);
    }
  }

  function buildPictureFrame(frameType) {
    const figure = document.createElement("figure");
    figure.className = "picture-frame picture-frame--compact";
    setPictureFrame(figure, frameType);

    const moulding = document.createElement("div");
    moulding.className = "picture-frame__moulding";
    const lip = document.createElement("div");
    lip.className = "picture-frame__lip";
    const matte = document.createElement("div");
    matte.className = "picture-frame__matte";
    const glass = document.createElement("div");
    glass.className = "picture-frame__glass";

    const img = document.createElement("img");
    img.hidden = true;
    img.alt = "";
    const ph = document.createElement("div");
    ph.className = "frame-placeholder";
    const lab = document.createElement("span");
    ph.appendChild(lab);
    glass.append(img, ph);
    matte.appendChild(glass);
    lip.appendChild(matte);
    moulding.appendChild(lip);
    figure.appendChild(moulding);
    return { figure, img, ph, lab };
  }

  function preferredImageUrl(n) {
    for (const ext of EXT_CANDIDATES) {
      const url = imageUrl(n, ext);
      if (imageCache.has(url)) return url;
    }
    return imageUrl(n, EXT_CANDIDATES[0]);
  }

  function showImage(n, imgEl, placeholderEl, labelEl) {
    const loadId = (imgEl._treeLoadId = (imgEl._treeLoadId || 0) + 1);
    const style = styleFor(n);
    labelEl.textContent = style.name;

    const apply = (url) => {
      if (loadId !== imgEl._treeLoadId) return;
      imgEl.alt = style.label;
      imgEl.onload = null;
      imgEl.onerror = null;
      imgEl.src = url;
      imgEl.hidden = false;
      placeholderEl.hidden = true;
    };

    // Instant path: already prefetched.
    const cachedUrl = preferredImageUrl(n);
    const cached = imageCache.get(cachedUrl);
    if (cached && cached.complete && cached.naturalWidth > 0) {
      apply(cachedUrl);
      return;
    }

    // Keep previous picture visible until the next one is ready (no empty flash).
    let i = 0;
    const tryNext = () => {
      if (loadId !== imgEl._treeLoadId) return;
      if (i >= EXT_CANDIDATES.length) {
        // Nothing loaded — show placeholder only now.
        imgEl.hidden = true;
        placeholderEl.hidden = false;
        return;
      }
      const ext = EXT_CANDIDATES[i++];
      const url = imageUrl(n, ext);
      const probe = imageCache.get(url) || new Image();
      const onReady = () => {
        if (loadId !== imgEl._treeLoadId) return;
        imageCache.set(url, probe);
        apply(url);
      };
      probe.onload = onReady;
      probe.onerror = () => {
        if (loadId !== imgEl._treeLoadId) return;
        tryNext();
      };
      if (!probe.src) probe.src = url;
      if (probe.complete && probe.naturalWidth > 0) onReady();
    };
    tryNext();
  }

  function readLocalSubmissions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function writeLocalSubmissions(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function isCompleteSubmission(sub) {
    return (
      sub &&
      Number(sub.schema) === SUBMISSION_SCHEMA &&
      Array.isArray(sub.answers) &&
      sub.answers.length === SLIDE_COUNT &&
      sub.answers.every(
        (row, i) =>
          row &&
          Number(row.image) === SLIDES[i].image &&
          row.id === "feeling" &&
          typeof row.value === "string" &&
          FEELING_OPTIONS.includes(row.value)
      )
    );
  }

  function aggregateSubmissions(submissions, source) {
    const valid = submissions.filter(isCompleteSubmission);
    const images = SLIDES.map((slide) => ({
      image: slide.image,
      label: slide.label,
      question: { id: slide.id, text: slide.text, options: slide.options },
      counts: Object.fromEntries(slide.options.map((o) => [o, 0])),
    }));

    for (const sub of valid) {
      for (const row of sub.answers) {
        const idx = SLIDES.findIndex((s) => s.image === Number(row.image));
        if (idx < 0) continue;
        if (typeof row.value === "string" && Object.prototype.hasOwnProperty.call(images[idx].counts, row.value)) {
          images[idx].counts[row.value] += 1;
        }
      }
    }

    return {
      schema: SUBMISSION_SCHEMA,
      totalSubmissions: valid.length,
      images,
      source,
    };
  }

  function newSubmissionId() {
    return (
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 10)
    );
  }

  async function remoteSubmit(answers) {
    const id = newSubmissionId();
    const entry = {
      schema: SUBMISSION_SCHEMA,
      submittedAt: new Date().toISOString(),
      answers,
    };
    // Path prefix submissions18/ — resets aggregates for the 18-image set.
    const url = `${remoteCfg.baseUrl.replace(/\/$/, "")}/${encodeURIComponent(remoteCfg.namespace)}/submissions18/${encodeURIComponent(id)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Mantle-Key": remoteCfg.key,
      },
      body: JSON.stringify(entry),
    });
    if (!res.ok) throw new Error("remote submit failed");
    return entry;
  }

  async function remoteFetchSubmissions() {
    const url = `${remoteCfg.baseUrl.replace(/\/$/, "")}/export/${encodeURIComponent(remoteCfg.namespace)}`;
    const res = await fetch(url, {
      headers: { "X-Mantle-Key": remoteCfg.key },
    });
    if (!res.ok) throw new Error("remote export failed");
    const data = await res.json();
    const entries = (data && data.entries) || {};
    const list = [];
    for (const [path, value] of Object.entries(entries)) {
      if (!String(path).startsWith("submissions18/")) continue;
      list.push(value);
    }
    return list;
  }

  async function submitAnswers(answers) {
    let mode = null;

    // Shared cloud store (Pages + optional dual-write from local).
    if (HAS_REMOTE) {
      try {
        await remoteSubmit(answers);
        mode = "remote";
      } catch (err) {
        console.error(err);
      }
    }

    // Local Node API when running via npm start.
    if (!STATIC_HOST) {
      try {
        const res = await fetch("api/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers }),
        });
        if (!res.ok) throw new Error("submit failed");
        if (!mode) mode = "server";
      } catch {
        /* ignore if remote already saved */
      }
    }

    if (mode) {
      state.storageMode = mode;
      return { ok: true, mode };
    }

    const list = readLocalSubmissions();
    list.push({
      schema: SUBMISSION_SCHEMA,
      submittedAt: new Date().toISOString(),
      answers,
    });
    writeLocalSubmissions(list);
    state.storageMode = "local";
    return { ok: true, mode: "local", totalSubmissions: list.length };
  }

  async function loadStats() {
    if (HAS_REMOTE) {
      try {
        const remoteList = await remoteFetchSubmissions();
        state.storageMode = "remote";
        return aggregateSubmissions(remoteList, "remote");
      } catch (err) {
        console.error(err);
      }
    }

    if (!STATIC_HOST) {
      try {
        const res = await fetch("api/stats");
        if (!res.ok) throw new Error("stats failed");
        const stats = await res.json();
        state.storageMode = "server";
        return stats;
      } catch {
        /* fall through */
      }
    }

    state.storageMode = "local";
    return aggregateSubmissions(readLocalSubmissions(), "local");
  }

  function markFeelingPos(i) {
    const t = FEELING_LAST === 0 ? 0.5 : i / FEELING_LAST;
    els.feelingMark.style.left = `calc(${t} * (100% - 18px) + 9px)`;
  }

  function setFeelingIndex(nextIndex, animate) {
    const i = Math.max(0, Math.min(FEELING_LAST, Number(nextIndex) || 0));
    const next = FEELING_OPTIONS[i];
    state.feelingIndex = i;
    els.feelingSlider.value = String(i);
    markFeelingPos(i);
    els.feelingPrev.disabled = i === 0;
    els.feelingNext.disabled = i === FEELING_LAST;

    if (!animate || els.feelingValue.textContent === next) {
      els.feelingValue.textContent = next;
      els.feelingValue.classList.remove("is-flip");
      return;
    }
    els.feelingValue.classList.add("is-flip");
    window.setTimeout(() => {
      els.feelingValue.textContent = next;
      els.feelingValue.classList.remove("is-flip");
    }, 100);
  }

  function stepFeeling(delta) {
    if (state.busy || els.survey.hidden) return;
    setFeelingIndex(state.feelingIndex + delta, true);
  }

  function renderSlide() {
    const slide = SLIDES[state.slideIndex];
    const n = slide.image;

    els.styleName.textContent = slide.name;
    els.styleYear.textContent = slide.year;
    els.questionText.textContent = slide.text;

    const frame = document.getElementById("image-frame");
    setPictureFrame(frame, slide.frame);
    showImage(n, els.surveyImage, els.imagePlaceholder, els.imageLabel);

    const panel = document.querySelector(".question-panel");
    if (panel) {
      panel.style.animation = "none";
      void panel.offsetWidth;
      panel.style.animation = "";
    }
    if (frame) {
      frame.style.animation = "none";
      void frame.offsetWidth;
      frame.style.animation = "";
    }

    setFeelingIndex(FEELING_MID, false);
    if (els.feelingList) {
      for (const btn of els.feelingList.querySelectorAll(".feeling-option")) {
        btn.classList.remove("is-chosen");
        btn.disabled = false;
      }
    }
  }

  function renderFeelingList() {
    if (!els.feelingList) return;
    els.feelingList.replaceChildren();
    for (const opt of FEELING_OPTIONS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "feeling-option";
      btn.setAttribute("role", "option");
      btn.textContent = opt;
      btn.addEventListener("click", () => onChoose(opt));
      els.feelingList.appendChild(btn);
    }
  }

  async function onChoose(value) {
    if (state.busy) return;
    state.busy = true;

    const slide = SLIDES[state.slideIndex];
    state.answers.push({ image: slide.image, id: slide.id, value });

    els.feelingValue.classList.add("is-chosen");
    if (els.feelingConfirm) els.feelingConfirm.disabled = true;
    if (els.feelingList) {
      for (const btn of els.feelingList.querySelectorAll(".feeling-option")) {
        btn.disabled = true;
        if (btn.textContent === value) btn.classList.add("is-chosen");
      }
    }

    await wait(180);

    if (els.feelingConfirm) els.feelingConfirm.disabled = false;
    els.feelingValue.classList.remove("is-chosen");

    if (state.slideIndex < SLIDE_COUNT - 1) {
      state.slideIndex += 1;
      state.busy = false;
      renderSlide();
      return;
    }

    await finishSurvey();
  }

  function clearRewardTimers() {
    for (const id of state.rewardTimers) window.clearTimeout(id);
    state.rewardTimers.clear();
  }

  function rewardLater(fn, ms) {
    const id = window.setTimeout(() => {
      state.rewardTimers.delete(id);
      fn();
    }, ms);
    state.rewardTimers.add(id);
    return id;
  }

  function pickFortune() {
    return FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
  }

  function readMyTree() {
    try {
      const raw = localStorage.getItem(MY_TREE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.parts) || data.parts.length !== 4) return null;
      if (!data.fortune || typeof data.fortune !== "string") {
        data.fortune = pickFortune();
        writeMyTree(data.parts, data.fortune);
      }
      return data;
    } catch {
      return null;
    }
  }

  function writeMyTree(parts, fortune) {
    localStorage.setItem(
      MY_TREE_KEY,
      JSON.stringify({
        parts: parts.map((p) => ({
          image: p.image,
          name: p.name,
          frame: p.frame,
        })),
        fortune,
        at: Date.now(),
      })
    );
  }

  function showRewardFortune(text) {
    state.rewardFortune = text;
    if (!els.rewardFortune || !els.rewardFortuneText) return;
    els.rewardFortune.classList.remove("is-on");
    els.rewardFortuneText.style.animation = "none";
    els.rewardFortuneText.textContent = text || "";
    void els.rewardFortuneText.offsetWidth;
    els.rewardFortuneText.style.animation = "";
    if (text) els.rewardFortune.classList.add("is-on");
  }

  function styleMetaByImage(image) {
    const style = STYLES.find((s) => s.image === image);
    return {
      image,
      name: style ? style.name : `Стиль ${image}`,
      frame: style ? style.frame : "classic",
    };
  }

  /** Build 4 unique corner styles from answers (stronger feelings first). */
  function buildTreePartsFromAnswers(answers) {
    const ranked = (answers || [])
      .map((row, i) => {
        const feelingIndex = FEELING_OPTIONS.indexOf(row.value);
        const intensity = feelingIndex < 0 ? 0 : Math.abs(feelingIndex - FEELING_MID);
        return { image: row.image, intensity, order: i };
      })
      .sort((a, b) => b.intensity - a.intensity || a.order - b.order);

    const picked = [];
    const used = new Set();

    function tryAdd(image, cornerKey) {
      if (used.has(image)) return false;
      if (cornerKey === "bl" && image === 3) return false; // Рококо не в нижнем левом
      used.add(image);
      picked.push(styleMetaByImage(image));
      return true;
    }

    for (const row of ranked) {
      if (picked.length >= 4) break;
      const cornerKey = REWARD_CORNERS[picked.length].key;
      tryAdd(row.image, cornerKey);
    }

    for (const style of STYLES) {
      if (picked.length >= 4) break;
      const cornerKey = REWARD_CORNERS[picked.length].key;
      tryAdd(style.image, cornerKey);
    }

    // Last-resort fill if rococo ban blocked everything.
    for (const style of STYLES) {
      if (picked.length >= 4) break;
      if (used.has(style.image)) continue;
      used.add(style.image);
      picked.push(styleMetaByImage(style.image));
    }

    return picked.slice(0, 4);
  }

  function setRewardFrameType(type) {
    if (!els.rewardFrame) return;
    for (const t of FRAME_TYPES) {
      els.rewardFrame.classList.toggle(`picture-frame--${t}`, t === type);
    }
    if (!FRAME_TYPES.includes(type)) {
      els.rewardFrame.classList.add("picture-frame--classic");
    }
  }

  function paintRewardTree(parts, fortune, { animate }) {
    if (!els.rewardTree || !els.rewardFrame) return;
    clearRewardTimers();
    els.rewardTree.replaceChildren();
    if (els.rewardCaption) {
      els.rewardCaption.classList.remove("is-on");
      els.rewardCaption.style.animation = "none";
      els.rewardCaption.textContent = "";
      void els.rewardCaption.offsetWidth;
      els.rewardCaption.style.animation = "";
    }
    if (els.rewardFortune) {
      els.rewardFortune.classList.remove("is-on");
      if (els.rewardFortuneText) {
        els.rewardFortuneText.style.animation = "none";
        els.rewardFortuneText.textContent = "";
        void els.rewardFortuneText.offsetWidth;
        els.rewardFortuneText.style.animation = "";
      }
    }
    state.rewardFortune = fortune || null;
    els.rewardFrame.hidden = false;
    els.rewardFrame.classList.remove("is-entering");
    void els.rewardFrame.offsetWidth;
    els.rewardFrame.classList.add("is-entering");
    setRewardFrameType(parts[0].frame);

    const slots = [];
    parts.forEach((part, i) => {
      const corner = REWARD_CORNERS[i];
      const slot = document.createElement("div");
      slot.className = animate ? "slot" : "slot is-ready";
      const img = document.createElement("div");
      img.className = "slot__img";
      img.style.left = corner.left;
      img.style.top = corner.top;
      img.style.backgroundImage = `url("${imageUrl(part.image, ".jpg")}")`;
      slot.appendChild(img);
      els.rewardTree.appendChild(slot);
      slots.push(slot);
    });

    const finishText = (suffix) => {
      if (fortune) showRewardFortune(fortune);
      rewardLater(() => {
        if (!els.rewardCaption) return;
        els.rewardCaption.textContent =
          parts.map((p) => p.name).join(" · ") + (suffix || "");
        els.rewardCaption.classList.add("is-on");
      }, 160);
      if (els.btnDownloadTree) els.btnDownloadTree.hidden = false;
    };

    if (!animate) {
      finishText(" · уже получено");
      return;
    }

    slots.forEach((slot, step) => {
      rewardLater(() => slot.classList.add("is-ready"), 420 + step * 380);
    });
    rewardLater(() => finishText(""), 420 + 3 * 380 + 700);
  }

  function resetRewardUi() {
    clearRewardTimers();
    state.rewardParts = null;
    state.rewardFortune = null;
    if (els.rewardTree) els.rewardTree.replaceChildren();
    if (els.rewardFrame) {
      els.rewardFrame.hidden = true;
      els.rewardFrame.classList.remove("is-entering");
    }
    if (els.rewardFortune) els.rewardFortune.classList.remove("is-on");
    if (els.rewardFortuneText) {
      els.rewardFortuneText.style.animation = "none";
      els.rewardFortuneText.textContent = "";
      void els.rewardFortuneText.offsetWidth;
      els.rewardFortuneText.style.animation = "";
    }
    if (els.rewardCaption) {
      els.rewardCaption.classList.remove("is-on");
      els.rewardCaption.style.animation = "none";
      els.rewardCaption.textContent = "";
      void els.rewardCaption.offsetWidth;
      els.rewardCaption.style.animation = "";
    }
    if (els.btnClaimTree) {
      els.btnClaimTree.hidden = false;
      els.btnClaimTree.disabled = false;
    }
    if (els.btnDownloadTree) {
      els.btnDownloadTree.hidden = true;
      els.btnDownloadTree.disabled = false;
      els.btnDownloadTree.textContent = "Скачать";
    }
  }

  function showRewardScreen(answers) {
    state.pendingResultsAnswers = answers;
    resetRewardUi();
    showScreen("reward");

    const existing = readMyTree();
    if (existing) {
      state.rewardParts = existing.parts;
      state.rewardFortune = existing.fortune;
      if (els.rewardLead) {
        els.rewardLead.textContent =
          "Своё дерево уже получено — повторно собрать нельзя, но можно скачать.";
      }
      if (els.btnClaimTree) els.btnClaimTree.hidden = true;
      paintRewardTree(existing.parts, existing.fortune, { animate: false });
      return;
    }

    if (els.rewardLead) {
      els.rewardLead.textContent =
        "Из твоих ответов можно собрать одну картину — получить её можно только один раз.";
    }
  }

  function claimMyTree() {
    if (readMyTree() || state.busy) return;
    const source = state.pendingResultsAnswers || state.answers;
    const parts = buildTreePartsFromAnswers(source);
    if (parts.length < 4) return;
    state.busy = true;
    const fortune = pickFortune();
    writeMyTree(parts, fortune);
    state.rewardParts = parts;
    state.rewardFortune = fortune;
    if (els.btnClaimTree) {
      els.btnClaimTree.hidden = true;
      els.btnClaimTree.disabled = true;
    }
    paintRewardTree(parts, fortune, { animate: true });
    rewardLater(() => {
      state.busy = false;
    }, 420 + 3 * 380 + 900);
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(src));
      img.src = src;
    });
  }

  function drawClassicFrame(ctx, size, outer, matte) {
    const bed = ctx.createLinearGradient(0, 0, size, size);
    bed.addColorStop(0, "#2a241c");
    bed.addColorStop(0.45, "#1a1612");
    bed.addColorStop(1, "#0e0c0a");
    ctx.fillStyle = bed;
    ctx.fillRect(0, 0, size, size);

    const gold = ctx.createLinearGradient(0, 0, size, size);
    gold.addColorStop(0, "#e0c98a");
    gold.addColorStop(0.2, "#c4a35a");
    gold.addColorStop(0.45, "#8a7348");
    gold.addColorStop(0.7, "#3d2f1a");
    gold.addColorStop(0.9, "#c4a35a");
    gold.addColorStop(1, "#e0c98a");
    ctx.fillStyle = gold;
    ctx.fillRect(outer * 0.35, outer * 0.35, size - outer * 0.7, size - outer * 0.7);

    ctx.fillStyle = "#1c160e";
    const lip = outer * 0.72;
    ctx.fillRect(lip, lip, size - lip * 2, size - lip * 2);

    const matteGrad = ctx.createLinearGradient(0, lip, 0, size - lip);
    matteGrad.addColorStop(0, "#f7f3ea");
    matteGrad.addColorStop(1, "#f3efe6");
    ctx.fillStyle = matteGrad;
    ctx.fillRect(outer, outer, size - outer * 2, size - outer * 2);

    const well = outer + matte;
    ctx.fillStyle = "#111";
    ctx.fillRect(well, well, size - well * 2, size - well * 2);
    return well;
  }

  function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = String(text).split(" ");
    let line = "";
    let yy = y;
    for (let i = 0; i < words.length; i += 1) {
      const test = line ? `${line} ${words[i]}` : words[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, yy);
        line = words[i];
        yy += lineHeight;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, yy);
  }

  async function buildTreeDownloadCanvas(parts, fortune) {
    const size = 1400;
    const footer = fortune ? 170 : 0;
    const outer = 110;
    const matte = 48;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size + footer;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const well = drawClassicFrame(ctx, size, outer, matte);
    const inner = size - well * 2;
    const half = inner / 2;
    const gap = 2;

    const images = await Promise.all(
      parts.map((p) => loadImage(imageUrl(p.image, ".jpg")))
    );

    const targets = [
      { x: well, y: well },
      { x: well + half + gap, y: well },
      { x: well, y: well + half + gap },
      { x: well + half + gap, y: well + half + gap },
    ];
    const sources = [
      { sx: 0, sy: 0 },
      { sx: 0.5, sy: 0 },
      { sx: 0, sy: 0.5 },
      { sx: 0.5, sy: 0.5 },
    ];

    images.forEach((img, i) => {
      const tw = half - gap / 2;
      const th = half - gap / 2;
      const { x, y } = targets[i];
      const { sx, sy } = sources[i];
      ctx.drawImage(
        img,
        sx * img.naturalWidth,
        sy * img.naturalHeight,
        img.naturalWidth * 0.5,
        img.naturalHeight * 0.5,
        x,
        y,
        tw,
        th
      );
    });

    const lamp = ctx.createLinearGradient(0, well, 0, well + inner);
    lamp.addColorStop(0, "rgba(255, 246, 220, 0.22)");
    lamp.addColorStop(0.2, "rgba(255, 255, 255, 0.06)");
    lamp.addColorStop(0.55, "rgba(0, 0, 0, 0)");
    lamp.addColorStop(1, "rgba(0, 0, 0, 0.28)");
    ctx.fillStyle = lamp;
    ctx.fillRect(well, well, inner, inner);

    if (fortune) {
      ctx.fillStyle = "#f2f2f2";
      ctx.textAlign = "center";
      ctx.font = "italic 400 36px 'Cormorant Garamond', serif";
      wrapCanvasText(ctx, fortune, size / 2, size + 70, size - 160, 44);
      const stylesLine = parts.map((p) => p.name).join(" · ");
      ctx.fillStyle = "#8f8f8f";
      ctx.font = "400 22px Manrope, sans-serif";
      wrapCanvasText(ctx, stylesLine, size / 2, size + 130, size - 160, 28);
    }

    return canvas;
  }

  async function downloadMyTree() {
    const saved = readMyTree();
    const parts = state.rewardParts || (saved && saved.parts);
    const fortune = state.rewardFortune || (saved && saved.fortune) || null;
    if (!parts || !els.btnDownloadTree) return;
    els.btnDownloadTree.disabled = true;
    const prev = els.btnDownloadTree.textContent;
    els.btnDownloadTree.textContent = "Сохраняю…";
    try {
      const canvas = await buildTreeDownloadCanvas(parts, fortune);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "moe-derevo.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      if (els.rewardCaption) {
        els.rewardCaption.textContent = "Не удалось сохранить картинку";
        els.rewardCaption.classList.add("is-on");
      }
      console.error(err);
    } finally {
      els.btnDownloadTree.disabled = false;
      els.btnDownloadTree.textContent = prev;
    }
  }

  async function finishSurvey() {
    await submitAnswers(state.answers);

    try {
      localStorage.setItem(LAST_KEY, JSON.stringify(state.answers));
    } catch {
      /* ignore */
    }

    markSurveyDone();
    syncStartButton();
    showRewardScreen(state.answers);
    state.busy = false;
  }

  function getLastAnswers() {
    try {
      const raw = localStorage.getItem(LAST_KEY);
      if (raw) return JSON.parse(raw);
      // migrate one-session answers if present
      const legacy = sessionStorage.getItem("tree-survey-last-v9");
      if (legacy) {
        localStorage.setItem(LAST_KEY, legacy);
        return JSON.parse(legacy);
      }
      return null;
    } catch {
      return null;
    }
  }

  async function showResults(userAnswers) {
    showScreen("results");
    els.resultsSub.textContent = "Загрузка…";
    els.resultsGrid.replaceChildren();

    const stats = await loadStats();
    const yours =
      userAnswers && userAnswers.length ? userAnswers : getLastAnswers();
    const n = stats.totalSubmissions || 0;
    els.resultsSub.textContent =
      n === 0
        ? "Пока нет сохранённых ответов."
        : n === 1
          ? "1 прохождение"
          : `${n} прохождений`;

    if (els.resultsNote) {
      if (state.storageMode === "remote") {
        els.resultsNote.textContent =
          "Данные обезличены. Общая сводка копится у всех посетителей сайта (облачное хранилище MantleDB).";
      } else if (state.storageMode === "server") {
        els.resultsNote.textContent =
          "Данные обезличены. Каждый проход добавляется к общей сводке на локальном сервере (data/submissions.json).";
      } else {
        els.resultsNote.textContent =
          "Сейчас статистика только в этом браузере (резервный режим). Проверьте интернет — для общей сводки нужен доступ к облаку.";
      }
    }

    const imageStatsList = stats.images || [];
    for (let i = 0; i < SLIDE_COUNT; i++) {
      const slide = SLIDES[i];
      const imageStats = imageStatsList[i] || { counts: {} };
      const yourRow = Array.isArray(yours) ? yours.find((a) => a.image === slide.image) : null;
      const yourVal = yourRow ? yourRow.value : null;

      const block = document.createElement("article");
      block.className = "result-block";
      block.style.setProperty("--i", String(i));

      const { figure, img, ph, lab } = buildPictureFrame(slide.frame);
      lab.textContent = slide.name;

      const statsCol = document.createElement("div");
      statsCol.className = "result-stats";
      const titleRow = document.createElement("div");
      titleRow.className = "result-style";
      const h2 = document.createElement("h2");
      h2.className = "result-style-name";
      h2.textContent = slide.name;
      const yearEl = document.createElement("span");
      yearEl.className = "result-style-year";
      yearEl.textContent = slide.year;
      titleRow.append(h2, yearEl);
      statsCol.appendChild(titleRow);

      const wrap = document.createElement("div");
      wrap.className = "stat-q";
      const title = document.createElement("p");
      title.className = "stat-q-title";
      title.textContent = slide.text;
      wrap.appendChild(title);

      const rows = document.createElement("div");
      rows.className = "stat-rows";
      const counts = imageStats.counts || {};
      const total = Object.values(counts).reduce((a, b) => a + b, 0) || 0;

      for (const opt of slide.options) {
        const count = counts[opt] || 0;
        const pct = total ? Math.round((count / total) * 100) : 0;
        const row = document.createElement("div");
        row.className = "stat-row" + (yourVal === opt ? " is-yours" : "");

        const label = document.createElement("span");
        label.className = "stat-label";
        label.textContent = opt;

        const track = document.createElement("div");
        track.className = "bar-track";
        const fill = document.createElement("div");
        fill.className = "bar-fill";
        track.appendChild(fill);

        const pctEl = document.createElement("span");
        pctEl.className = "stat-pct";
        pctEl.textContent = `${pct}%`;

        row.append(label, track, pctEl);
        rows.appendChild(row);

        requestAnimationFrame(() => {
          fill.style.width = `${pct}%`;
        });
      }

      wrap.appendChild(rows);
      statsCol.appendChild(wrap);
      block.append(figure, statsCol);
      els.resultsGrid.appendChild(block);
      showImage(slide.image, img, ph, lab);
    }
  }

  function resetSurvey() {
    state.slideIndex = 0;
    state.answers = [];
    state.busy = false;
    state.feelingIndex = FEELING_MID;
  }

  function wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  /** Animated hybrid collage behind the intro (square trees, corner-locked crops). */
  function createIntroHybrid() {
    const board = document.getElementById("intro-hybrid-board");
    const introInner = document.getElementById("intro-inner");
    if (!board || !introInner) {
      return { start() {}, stop() {}, restart() {} };
    }

    const CORNERS = [
      { key: "tl", left: "0", top: "0" },
      { key: "tr", left: "-100%", top: "0" },
      { key: "bl", left: "0", top: "-100%" },
      { key: "br", left: "-100%", top: "-100%" },
    ];
    const PAINTINGS = STYLES.map((s) => s.image);
    const TREE_COUNT = 18;
    const MAX_CONCURRENT_FADES = 3;
    const EASE = "cubic-bezier(0.37, 0, 0.2, 1)";
    const EXCLUDE_BY_CORNER = { bl: new Set([3]) }; // Рококо — не в нижнем левом углу
    const REVEAL_TOTAL_MS = 2800;

    const slots = [];
    const timers = new Set();
    let activeFades = 0;
    let changeQueue = [];
    let running = false;
    let morphing = false;

    function rand(min, max) {
      return min + Math.random() * (max - min);
    }

    function randInt(min, max) {
      return Math.floor(rand(min, max + 1));
    }

    function later(fn, ms) {
      const id = window.setTimeout(() => {
        timers.delete(id);
        if (!running) return;
        fn();
      }, ms);
      timers.add(id);
      return id;
    }

    function clearTimers() {
      for (const id of timers) window.clearTimeout(id);
      timers.clear();
    }

    function srcFor(index) {
      return imageUrl(PAINTINGS[index], ".jpg");
    }

    function makeLayer(corner) {
      const layer = document.createElement("div");
      layer.className = "slot__layer";
      const img = document.createElement("div");
      img.className = "slot__img";
      img.style.left = corner.left;
      img.style.top = corner.top;
      layer.appendChild(img);
      return { layer, img };
    }

    function pickPainting(current, cornerKey) {
      const banned = EXCLUDE_BY_CORNER[cornerKey] || null;
      const allowed = [];
      for (let i = 0; i < PAINTINGS.length; i += 1) {
        if (banned && banned.has(PAINTINGS[i])) continue;
        if (i === current) continue;
        allowed.push(i);
      }
      if (!allowed.length) {
        for (let i = 0; i < PAINTINGS.length; i += 1) {
          if (banned && banned.has(PAINTINGS[i])) continue;
          allowed.push(i);
        }
      }
      return allowed[randInt(0, allowed.length - 1)];
    }

    function buildBoard() {
      board.replaceChildren();
      slots.length = 0;
      for (let t = 0; t < TREE_COUNT; t += 1) {
        const tree = document.createElement("div");
        tree.className = "tree";
        CORNERS.forEach((corner) => {
          const el = document.createElement("div");
          el.className = "slot";
          const a = makeLayer(corner);
          const b = makeLayer(corner);
          el.append(a.layer, b.layer);
          tree.appendChild(el);
          slots.push({
            el,
            corner,
            layers: [a, b],
            active: 0,
            painting: -1,
            busy: false,
          });
        });
        board.appendChild(tree);
      }
    }

    function showFirstPainting(slot) {
      const paintingIndex = pickPainting(-1, slot.corner.key);
      slot.painting = paintingIndex;
      const cur = slot.layers[slot.active];
      cur.img.style.backgroundImage = `url("${srcFor(paintingIndex)}")`;
      cur.layer.style.transition = "none";
      cur.layer.classList.add("is-on");
      void cur.layer.offsetWidth;
      cur.layer.style.transition = "";
    }

    function crossfadePainting(slot, paintingIndex, fadeMs) {
      slot.painting = paintingIndex;
      const url = srcFor(paintingIndex);
      const from = slot.layers[slot.active];
      const toIndex = 1 - slot.active;
      const to = slot.layers[toIndex];

      to.img.style.backgroundImage = `url("${url}")`;
      to.layer.style.transition = "none";
      to.layer.classList.remove("is-on");
      void to.layer.offsetWidth;

      const ms = `${fadeMs}ms`;
      to.layer.style.transition = `opacity ${ms} ${EASE}`;
      from.layer.style.transition = `opacity ${ms} ${EASE}`;
      to.layer.style.zIndex = "1";
      from.layer.style.zIndex = "2";
      to.layer.classList.add("is-on");
      from.layer.classList.remove("is-on");
      slot.active = toIndex;

      later(() => {
        from.layer.style.zIndex = "";
        to.layer.style.zIndex = "1";
      }, fadeMs);
    }

    function scheduleNextChange(slot) {
      later(() => enqueueChange(slot), rand(7000, 16000));
    }

    function pumpQueue() {
      if (!morphing) return;
      while (activeFades < MAX_CONCURRENT_FADES && changeQueue.length) {
        runChange(changeQueue.shift());
      }
    }

    function enqueueChange(slot) {
      if (!morphing) return;
      if (slot.busy) {
        scheduleNextChange(slot);
        return;
      }
      changeQueue.push(slot);
      pumpQueue();
    }

    function runChange(slot) {
      slot.busy = true;
      activeFades += 1;
      const next = pickPainting(slot.painting, slot.corner.key);
      const fadeMs = rand(2800, 4800);
      crossfadePainting(slot, next, fadeMs);
      later(() => {
        activeFades = Math.max(0, activeFades - 1);
        slot.busy = false;
        pumpQueue();
        if (morphing) scheduleNextChange(slot);
      }, fadeMs);
    }

    function startMorphEngine() {
      morphing = true;
      slots.forEach((slot) => {
        later(() => enqueueChange(slot), rand(400, 9000));
      });
    }

    function start() {
      stop();
      running = true;
      morphing = false;
      activeFades = 0;
      changeQueue = [];
      introInner.classList.remove("is-ready");
      buildBoard();
      // Текст сразу, без ожидания плиток.
      void introInner.offsetWidth;
      introInner.classList.add("is-ready");

      const revealOrder = slots.slice();
      for (let i = revealOrder.length - 1; i > 0; i -= 1) {
        const j = randInt(0, i);
        const tmp = revealOrder[i];
        revealOrder[i] = revealOrder[j];
        revealOrder[j] = tmp;
      }

      const n = revealOrder.length;
      const step = n <= 1 ? 0 : REVEAL_TOTAL_MS / (n - 1);
      let lastRevealAt = 0;

      revealOrder.forEach((slot, i) => {
        const delay = step * i;
        lastRevealAt = delay;
        later(() => {
          slot.el.classList.add("is-ready");
          showFirstPainting(slot);
        }, delay);
      });

      later(() => {
        startMorphEngine();
      }, lastRevealAt);
    }

    function stop() {
      running = false;
      morphing = false;
      clearTimers();
      activeFades = 0;
      changeQueue = [];
      introInner.classList.remove("is-ready");
    }

    return {
      start,
      stop,
      restart: start,
    };
  }

  introHybrid = createIntroHybrid();

  function prefetchImages() {
    for (const slide of SLIDES) {
      const n = slide.image;
      for (const ext of EXT_CANDIDATES) {
        const url = imageUrl(n, ext);
        if (imageCache.has(url)) break;
        const img = new Image();
        img.decoding = "async";
        img.onload = () => {
          imageCache.set(url, img);
        };
        img.onerror = () => {
          /* try next extension via separate Image in showImage if needed */
        };
        img.src = url;
        // Only kick the preferred .jpg; other formats exist only as rare fallbacks.
        break;
      }
    }
  }

  els.feelingSlider.addEventListener("input", () => {
    if (state.busy || els.survey.hidden) return;
    setFeelingIndex(els.feelingSlider.value, true);
  });
  els.feelingPrev.addEventListener("click", () => stepFeeling(-1));
  els.feelingNext.addEventListener("click", () => stepFeeling(1));
  els.feelingConfirm.addEventListener("click", () => {
    onChoose(FEELING_OPTIONS[state.feelingIndex]);
  });

  document.addEventListener("keydown", (e) => {
    if (els.survey.hidden || state.busy) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      stepFeeling(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      stepFeeling(1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      onChoose(FEELING_OPTIONS[state.feelingIndex]);
    }
  });

  if (els.btnStart) {
    els.btnStart.addEventListener("click", () => {
      if (hasCompletedSurvey()) {
        goMyTree();
        return;
      }
      resetSurvey();
      showScreen("survey");
      renderSlide();
    });
  }

  if (els.btnClaimTree) {
    els.btnClaimTree.addEventListener("click", () => claimMyTree());
  }
  if (els.btnDownloadTree) {
    els.btnDownloadTree.addEventListener("click", () => downloadMyTree());
  }
  if (els.btnRewardResults) {
    els.btnRewardResults.addEventListener("click", () => {
      showResults(state.pendingResultsAnswers || getLastAnswers() || []);
    });
  }

  renderFeelingList();
  prefetchImages();
  introHybrid.start();
  syncStartButton();
  applyRouteFromHash();
  window.addEventListener("hashchange", applyRouteFromHash);
})();
