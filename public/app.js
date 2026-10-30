(() => {
  "use strict";

  /** Same feeling question for every image (tree-1 … tree-15). */
  const FEELING_OPTIONS = [
    "радость",
    "восхищение",
    "тревога",
    "изумление",
    "печаль",
    "скука",
    "отвращение",
    "гнев",
    "интерес",
  ];
  const STYLES = [
    { name: "Ренессанс", year: "~1400" },
    { name: "Барокко", year: "~1600" },
    { name: "Рококо", year: "~1730" },
    { name: "Классицизм", year: "~1750" },
    { name: "Импрессионизм", year: "~1874" },
    { name: "Фовизм", year: "~1905" },
    { name: "Экспрессионизм", year: "~1905" },
    { name: "Кубизм", year: "~1907" },
    { name: "Авангардизм", year: "~1910" },
    { name: "Абстракционизм", year: "~1910" },
    { name: "Супрематизм", year: "~1915" },
    { name: "Дадаизм", year: "~1916" },
    { name: "Сюрреализм", year: "~1924" },
    { name: "Активная живопись", year: "~1945" },
    { name: "Минимализм", year: "~1960" },
  ];
  const SLIDES = STYLES.map((style, i) => ({
    image: i + 1,
    name: style.name,
    year: style.year,
    label: `${style.name} ${style.year}`,
    id: "feeling",
    text: "Что вы чувствуете в первую очередь?",
    options: FEELING_OPTIONS,
  }));

  const SLIDE_COUNT = SLIDES.length;
  const EXT_CANDIDATES = [".jpg", ".jpeg", ".webp", ".png"];
  const STORAGE_KEY = "tree-survey-submissions-v6";
  const LAST_KEY = "tree-survey-last-v6";
  const SUBMISSION_SCHEMA = 5;
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
    results: document.getElementById("screen-results"),
    btnStart: document.getElementById("btn-start"),
    btnResults: document.getElementById("btn-results"),
    btnAgain: document.getElementById("btn-again"),
    styleName: document.getElementById("style-name"),
    styleYear: document.getElementById("style-year"),
    surveyImage: document.getElementById("survey-image"),
    imagePlaceholder: document.getElementById("image-placeholder"),
    imageLabel: document.getElementById("image-label"),
    questionText: document.getElementById("question-text"),
    options: document.getElementById("options"),
    resultsSub: document.getElementById("results-sub"),
    resultsGrid: document.getElementById("results-grid"),
    resultsNote: document.getElementById("results-note"),
  };

  const state = {
    slideIndex: 0,
    answers: [],
    busy: false,
    storageMode: HAS_REMOTE ? "remote" : STATIC_HOST ? "local" : "server",
  };

  function showScreen(name) {
    const map = { intro: els.intro, survey: els.survey, results: els.results };
    for (const [key, el] of Object.entries(map)) {
      const active = key === name;
      el.hidden = !active;
      el.classList.toggle("is-active", active);
    }
  }

  function imageUrl(n, ext) {
    return `images/tree-${n}${ext}`;
  }

  function styleFor(n) {
    return SLIDES[n - 1] || { name: `Стиль ${n}`, year: "", label: `Стиль ${n}` };
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
          Number(row.image) === i + 1 &&
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
        const idx = Number(row.image) - 1;
        images[idx].counts[row.value] += 1;
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
    // Path prefix submissions15f9/ — resets aggregates for the new 9-feeling set.
    const url = `${remoteCfg.baseUrl.replace(/\/$/, "")}/${encodeURIComponent(remoteCfg.namespace)}/submissions15f9/${encodeURIComponent(id)}`;
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
      if (!String(path).startsWith("submissions15f9/")) continue;
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

  function renderSlide() {
    const slide = SLIDES[state.slideIndex];
    const n = slide.image;

    els.styleName.textContent = slide.name;
    els.styleYear.textContent = slide.year;
    els.questionText.textContent = slide.text;

    showImage(n, els.surveyImage, els.imagePlaceholder, els.imageLabel);

    const panel = document.querySelector(".question-panel");
    const frame = document.getElementById("image-frame");
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

    els.options.replaceChildren();
    for (const opt of slide.options) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option";
      btn.textContent = opt;
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-checked", "false");
      btn.addEventListener("click", () => onChoose(opt));
      els.options.appendChild(btn);
    }
  }

  async function onChoose(value) {
    if (state.busy) return;
    state.busy = true;

    const slide = SLIDES[state.slideIndex];
    state.answers.push({ image: slide.image, id: slide.id, value });

    const chosen = [...els.options.querySelectorAll(".option")].find((b) => b.textContent === value);
    if (chosen) chosen.classList.add("is-chosen");

    await wait(180);

    if (state.slideIndex < SLIDE_COUNT - 1) {
      state.slideIndex += 1;
      state.busy = false;
      renderSlide();
      return;
    }

    await finishSurvey();
  }

  async function finishSurvey() {
    await submitAnswers(state.answers);

    try {
      sessionStorage.setItem(LAST_KEY, JSON.stringify(state.answers));
    } catch {
      /* ignore */
    }

    await showResults(state.answers);
    state.busy = false;
  }

  function getLastAnswers() {
    try {
      const raw = sessionStorage.getItem(LAST_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async function showResults(userAnswers) {
    showScreen("results");
    els.resultsSub.textContent = "Загрузка…";
    els.resultsGrid.replaceChildren();

    const stats = await loadStats();
    const yours = userAnswers || getLastAnswers();
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

      const frame = document.createElement("figure");
      frame.className = "result-frame";
      const img = document.createElement("img");
      img.hidden = true;
      img.alt = "";
      const ph = document.createElement("div");
      ph.className = "frame-placeholder";
      const lab = document.createElement("span");
      lab.textContent = slide.name;
      ph.appendChild(lab);
      frame.append(img, ph);

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
      block.append(frame, statsCol);
      els.resultsGrid.appendChild(block);
      showImage(slide.image, img, ph, lab);
    }
  }

  function resetSurvey() {
    state.slideIndex = 0;
    state.answers = [];
    state.busy = false;
  }

  function wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function prefetchImages() {
    for (let n = 1; n <= SLIDE_COUNT; n++) {
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

  els.btnStart.addEventListener("click", () => {
    resetSurvey();
    showScreen("survey");
    renderSlide();
  });

  els.btnResults.addEventListener("click", () => {
    // Empty array: show shared aggregates only (no “ваш ответ” from a prior run).
    showResults([]);
  });

  els.btnAgain.addEventListener("click", () => {
    resetSurvey();
    showScreen("intro");
    for (const line of els.intro.querySelectorAll(".fade-line")) {
      line.style.animation = "none";
      void line.offsetWidth;
      line.style.animation = "";
    }
  });

  prefetchImages();
})();
