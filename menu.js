(() => {
  const DONE_KEY = "tree-survey-done-v1";
  const LAST_KEY = "tree-survey-last-v10";
  const LEGACY_LAST_KEY = "tree-survey-last-v9";
  const MY_TREE_KEY = "tree-survey-my-tree-v2";

  const root = document.querySelector(".site-menu");
  if (!root) return;

  const toggle = root.querySelector(".site-menu-toggle");
  const panel = root.querySelector(".site-menu-panel");
  const backdrop = root.querySelector(".site-menu-backdrop");
  if (!toggle || !panel) return;

  const isIndex = !!document.getElementById("app");

  function hasCompletedSurvey() {
    try {
      if (localStorage.getItem(DONE_KEY) === "1") return true;
      if (localStorage.getItem(MY_TREE_KEY)) return true;
      if (localStorage.getItem(LAST_KEY)) return true;
      if (sessionStorage.getItem(LEGACY_LAST_KEY)) return true;
    } catch {
      /* ignore */
    }
    return false;
  }

  function refreshSurveyLocks() {
    const done = hasCompletedSurvey();
    root.querySelectorAll('[data-requires-survey="1"]').forEach((link) => {
      link.classList.toggle("is-disabled", !done);
      if (done) {
        link.removeAttribute("aria-disabled");
        link.removeAttribute("tabindex");
        link.title = "";
      } else {
        link.setAttribute("aria-disabled", "true");
        link.setAttribute("tabindex", "-1");
        link.title = "Доступно после прохождения опроса";
      }
    });
  }

  function setOpen(open) {
    root.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    panel.setAttribute("aria-hidden", open ? "false" : "true");
    if (backdrop) {
      backdrop.hidden = !open;
      backdrop.setAttribute("aria-hidden", open ? "false" : "true");
    }
    document.body.classList.toggle("site-menu-open", open);
  }

  function close() {
    setOpen(false);
  }

  setOpen(false);
  refreshSurveyLocks();

  toggle.addEventListener("click", () => {
    refreshSurveyLocks();
    setOpen(!root.classList.contains("is-open"));
  });

  if (backdrop) backdrop.addEventListener("click", close);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && root.classList.contains("is-open")) close();
  });

  root.querySelectorAll("[data-nav]").forEach((link) => {
    link.addEventListener("click", (e) => {
      const nav = link.getAttribute("data-nav");
      const locked =
        link.getAttribute("data-requires-survey") === "1" && !hasCompletedSurvey();

      if (locked) {
        e.preventDefault();
        return;
      }

      if (!isIndex || !window.TreeSurveyNav) {
        close();
        return;
      }
      if (nav === "history") {
        close();
        return;
      }
      e.preventDefault();
      close();
      if (nav === "home") window.TreeSurveyNav.goHome();
      else if (nav === "tree") window.TreeSurveyNav.goMyTree();
      else if (nav === "results") window.TreeSurveyNav.goResults();
    });
  });

  window.TreeSurveyMenu = {
    refresh: refreshSurveyLocks,
    hasCompletedSurvey,
    markDone() {
      try {
        localStorage.setItem(DONE_KEY, "1");
      } catch {
        /* ignore */
      }
      refreshSurveyLocks();
    },
  };
})();
