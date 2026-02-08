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
  const box = document.getElementById("socialLinks");
  if (!box) return;

  const links = [
    {
      name: "facebook",
      url: "https://www.facebook.com/kingofyadav.in",
      icon: "https://cdn-icons-png.flaticon.com/512/124/124010.png"
    },
    {
      name: "instagram",
      url: "https://www.instagram.com/kingofyadav.in",
      icon: "https://cdn-icons-png.flaticon.com/512/2111/2111463.png"
    },
    {
      name: "youtube",
      url: "https://www.youtube.com/@kingofyadav-in",
      icon: "https://cdn-icons-png.flaticon.com/512/1384/1384060.png"
    },
    {
      name: "github",
      url: "https://github.com/kingofyadav",
      icon: "https://cdn-icons-png.flaticon.com/512/733/733553.png"
    }
  ];

  box.innerHTML = "";

  links.forEach(({ name, url, icon }) => {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    a.setAttribute("aria-label", name);

    const img = document.createElement("img");
    img.src = icon;
    img.alt = name;
    img.loading = "lazy";

    a.appendChild(img);
    box.appendChild(a);
  });
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
