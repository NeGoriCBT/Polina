(() => {
  "use strict";

  /** One question per image — order matches tree-1 … tree-7. */
  const SLIDES = [
    {
      image: 1,
      id: "feeling",
      text: "Что вы чувствуете в первую очередь?",
      options: ["спокойствие", "тревогу", "радость", "грусть", "ничего особенного"],
    },
    {
      image: 2,
      id: "mood",
      text: "Какое настроение у картинки?",
      options: ["тёплое", "холодное", "нейтральное"],
    },
    {
      image: 3,
      id: "like",
      text: "Насколько она вам нравится?",
      options: ["очень", "скорее да", "скорее нет", "совсем нет"],
    },
    {
      image: 4,
      id: "alive",
      text: "Кажется ли дерево живым?",
      options: ["да", "скорее да", "скорее нет", "нет"],
    },
    {
      image: 5,
      id: "place",
      text: "Где бы вы её представили?",
      options: ["дома", "в музее", "в книге", "нигде"],
    },
    {
      image: 6,
      id: "tone",
      text: "Эта картина скорее…",
      options: ["мечта", "кошмар", "обычный день", "сказка"],
    },
    {
      image: 7,
      id: "beside",
      text: "Хотели бы вы оказаться рядом с этим деревом?",
      options: ["да", "скорее да", "скорее нет", "нет"],
    },
  ];

  const SLIDE_COUNT = SLIDES.length;
  const EXT_CANDIDATES = [".png", ".jpg", ".jpeg", ".webp"];
  const STORAGE_KEY = "tree-survey-submissions-v2";
  const LAST_KEY = "tree-survey-last";

  const els = {
    intro: document.getElementById("screen-intro"),
    survey: document.getElementById("screen-survey"),
    results: document.getElementById("screen-results"),
    btnStart: document.getElementById("btn-start"),
    btnAgain: document.getElementById("btn-again"),
    progressImage: document.getElementById("progress-image"),
    progressQuestion: document.getElementById("progress-question"),
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
    storageMode: "server", // "server" | "local"
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
    // Relative path so GitHub Pages under /Polina/ works
    return `images/tree-${n}${ext}`;
  }

  function tryLoadImage(n, imgEl, placeholderEl, labelEl) {
    labelEl.textContent = `Стиль ${n}`;
    imgEl.hidden = true;
    placeholderEl.hidden = false;
    imgEl.removeAttribute("src");

    let i = 0;
    const tryNext = () => {
      if (i >= EXT_CANDIDATES.length) return;
      const ext = EXT_CANDIDATES[i++];
      const probe = new Image();
      probe.onload = () => {
        imgEl.src = imageUrl(n, ext);
        imgEl.alt = `Стиль ${n}`;
        imgEl.hidden = false;
        placeholderEl.hidden = true;
      };
      probe.onerror = tryNext;
      probe.src = imageUrl(n, ext);
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

  function aggregateLocal(submissions) {
    const images = SLIDES.map((slide) => ({
      image: slide.image,
      label: `Стиль ${slide.image}`,
      question: { id: slide.id, text: slide.text, options: slide.options },
      counts: Object.fromEntries(slide.options.map((o) => [o, 0])),
    }));

    for (const sub of submissions) {
      if (!sub || !Array.isArray(sub.answers)) continue;
      for (const row of sub.answers) {
        const idx = Number(row.image) - 1;
        if (idx < 0 || idx >= SLIDE_COUNT) continue;
        const slide = SLIDES[idx];
        if (row.id !== slide.id) continue;
        if (typeof row.value === "string" && Object.prototype.hasOwnProperty.call(images[idx].counts, row.value)) {
          images[idx].counts[row.value] += 1;
        }
      }
    }

    return {
      schema: 2,
      totalSubmissions: submissions.length,
      images,
      source: "local",
    };
  }

  async function submitAnswers(answers) {
    try {
      const res = await fetch("api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) throw new Error("submit failed");
      state.storageMode = "server";
      return { ok: true, mode: "server" };
    } catch {
      const list = readLocalSubmissions();
      list.push({
        schema: 2,
        submittedAt: new Date().toISOString(),
        answers,
      });
      writeLocalSubmissions(list);
      state.storageMode = "local";
      return { ok: true, mode: "local", totalSubmissions: list.length };
    }
  }

  async function loadStats() {
    try {
      const res = await fetch("api/stats");
      if (!res.ok) throw new Error("stats failed");
      const stats = await res.json();
      state.storageMode = "server";
      return stats;
    } catch {
      state.storageMode = "local";
      return aggregateLocal(readLocalSubmissions());
    }
  }

  function renderSlide() {
    const slide = SLIDES[state.slideIndex];
    const n = slide.image;

    els.progressImage.textContent = `Стиль ${n} из ${SLIDE_COUNT}`;
    els.progressQuestion.textContent = `Вопрос ${state.slideIndex + 1} из ${SLIDE_COUNT}`;
    els.questionText.textContent = slide.text;

    tryLoadImage(n, els.surveyImage, els.imagePlaceholder, els.imageLabel);

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
      els.resultsNote.textContent =
        state.storageMode === "local"
          ? "Сейчас статистика хранится в этом браузере (на GitHub Pages нет общего сервера). Для общей сводки у всех запускайте npm start локально."
          : "Данные обезличены. Каждый проход добавляется к общей сводке на сервере.";
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
      lab.textContent = `Стиль ${slide.image}`;
      ph.appendChild(lab);
      frame.append(img, ph);

      const statsCol = document.createElement("div");
      statsCol.className = "result-stats";
      const h2 = document.createElement("h2");
      h2.textContent = `Стиль ${slide.image}`;
      statsCol.appendChild(h2);

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
      tryLoadImage(slide.image, img, ph, lab);
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

  els.btnStart.addEventListener("click", () => {
    resetSurvey();
    showScreen("survey");
    renderSlide();
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
})();
