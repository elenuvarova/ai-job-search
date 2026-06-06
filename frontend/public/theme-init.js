// Set the theme before first paint to avoid a dark→light flash.
// External (not inline) so the production CSP can keep script-src 'self'
// without needing 'unsafe-inline' or a per-build hash.
(function () {
  try {
    var saved = localStorage.getItem("scout_theme");
    var theme =
      saved ||
      (window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark");
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();
