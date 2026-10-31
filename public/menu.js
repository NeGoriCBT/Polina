(() => {
  const root = document.querySelector(".site-menu");
  if (!root) return;

  const toggle = root.querySelector(".site-menu-toggle");
  const panel = root.querySelector(".site-menu-panel");
  const backdrop = root.querySelector(".site-menu-backdrop");
  if (!toggle || !panel) return;

  const isIndex = !!document.getElementById("app");

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

  toggle.addEventListener("click", () => {
    setOpen(!root.classList.contains("is-open"));
  });

  if (backdrop) backdrop.addEventListener("click", close);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && root.classList.contains("is-open")) close();
  });

  root.querySelectorAll("[data-nav]").forEach((link) => {
    link.addEventListener("click", (e) => {
      const nav = link.getAttribute("data-nav");
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
})();
