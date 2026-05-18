"use strict";

// Theme flash prevention — runs before body paint
(function () {
  try {
    var t = localStorage.getItem("theme");
    if (t) {
      document.body.classList.remove("theme-dark", "theme-light");
      document.body.classList.add(t);
    }
  } catch (e) {}
})();

// Live-class board theme restore
(function () {
  try {
    var lt = localStorage.getItem("live_class_theme");
    if (lt && document.body.dataset.boardTheme !== undefined) document.body.dataset.boardTheme = lt;
  } catch (e) {}
})();

// Auth bar wiring — reveals user chip if session is active
(function () {
  if (typeof isAuthenticated !== "function" || !isAuthenticated()) return;
  document.addEventListener("DOMContentLoaded", function () {
    var bar = document.getElementById("homeAuthBar");
    if (bar) bar.hidden = false;
    var el = document.getElementById("authUserDisplay");
    if (el && typeof getAuthUser === "function") el.textContent = getAuthUser() || "";
    var btn = document.getElementById("logoutBtn");
    if (btn && typeof logout === "function") btn.addEventListener("click", logout);
  });
})();
