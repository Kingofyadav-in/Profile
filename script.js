"use strict";

function $(id) {
  return document.getElementById(id);
}

/* ================= THEME ================= */

function applyTheme(theme) {
  document.body.classList.toggle("theme-dark", theme === "dark");
  document.body.classList.toggle("theme-light", theme === "light");

  const btn = $("themeToggle");
  if (btn) btn.textContent = theme === "dark" ? "🌙" : "☀️";
}

function initTheme() {
  const saved = localStorage.getItem("theme");
  if (saved) {
    applyTheme(saved);
    return;
  }

  const hour = new Date().getHours();
  applyTheme(hour >= 6 && hour < 18 ? "light" : "dark");
}

function setupThemeToggle() {
  const btn = $("themeToggle");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const next = document.body.classList.contains("theme-dark")
      ? "light"
      : "dark";

    localStorage.setItem("theme", next);
    applyTheme(next);
    updateLogo();
  });
}

/* ================= LOGO ================= */

function updateLogo() {
  const logo = $("siteLogo");
  if (!logo) return;

  const theme = document.body.classList.contains("theme-light")
    ? "day"
    : "night";

  logo.src = `logo/${theme}-logo.png`;
}

/* ================= FOOTER ================= */

function updateClock() {
  const el = $("footerClock");
  if (!el) return;

  el.textContent = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function updateStatus() {
  const el = $("status");
  if (!el) return;

  const h = new Date().getHours();
  el.textContent = h >= 10 && h < 22
    ? "STATUS: ACTIVE"
    : "STATUS: OFFLINE";
}

function loadSocials() {
  const box = $("socialLinks");
  if (!box) return;

  const links = {
    facebook: "https://www.facebook.com/kingofyadav.in",
    instagram: "https://www.instagram.com/kingofyadav.in",
    youtube: "https://www.youtube.com/@kingofyadav-in",
    github: "https://github.com/kingofyadav"
  };

  for (const [name, url] of Object.entries(links)) {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    a.setAttribute("aria-label", `${name} profile`);
    a.innerHTML = `<img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/${name}.svg" alt="">`;
    box.appendChild(a);
  }
}

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  setupThemeToggle();
  updateLogo();
  updateClock();
  updateStatus();
  loadSocials();

  const year = $("year");
  if (year) year.textContent = new Date().getFullYear();

  // Update once per minute (enough)
  setInterval(() => {
    updateClock();
    updateStatus();
  }, 60_000);
});

/* ================= PWA ================= */

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("service-worker.js")
      .then(() => console.log("Service worker registered"))
      .catch(err => console.error("SW registration failed:", err));
  });
}
