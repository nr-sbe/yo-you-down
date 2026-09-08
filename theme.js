// Apply the saved preference before CSS paints. First visit is always dark.
(() => {
  let theme = "dark";
  try {
    if (localStorage.getItem("yyd-theme") === "light") theme = "light";
  } catch {
    /* Storage can be disabled. */
  }
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]').content =
    theme === "dark" ? "#121722" : "#f6f7fb";
})();
