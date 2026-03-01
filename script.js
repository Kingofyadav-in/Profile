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

  // First check system preference
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(prefersDark ? "dark" : "light");
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

document.querySelectorAll(".nav-list a").forEach(link => {
  if (link.pathname === window.location.pathname) {
    link.classList.add("active");
  }
});

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
    a.rel = "noopener noreferrer";
    a.setAttribute("aria-label", name);

    const img = document.createElement("img");
    img.src = icon;
    img.alt = name;
    img.loading = "lazy";

    a.appendChild(img);
    box.appendChild(a);
  });
}

/* ================= PERSONAL ACCESS GATE (HARDENED) ================= */

const PERSONAL_HASH =
  "d9ec2d33f505a6f5bbf26bbef8bc1bfe44a905215d703556784e8d4da640ecce";
// <-- replace with real SHA-256 hash of your phrase

let attempts = 0;
const MAX_ATTEMPTS = 5;

async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
async function checkPersonalAccess(e) {
  if (e) e.preventDefault();

  const input = document.getElementById("accessKey");
  const error = document.getElementById("accessError");

  if (!input || !error) return;

  const value = input.value.trim();

  // Always hide error first
  error.style.display = "none";

  // Empty check
  if (!value) {
    error.textContent = "Please enter access phrase.";
    error.style.display = "block";
    return;
  }

  // Lock check
  if (attempts >= MAX_ATTEMPTS) {
    error.textContent = "Too many attempts. Try again in 30 seconds.";
    error.style.display = "block";
    return;
  }

  const enteredHash = await sha256(value);

  if (enteredHash === PERSONAL_HASH) {
    sessionStorage.setItem("personalAccess", "granted");
    window.location.href = "personal.html";
  } else {
    attempts++;

    error.textContent = "Incorrect access phrase.";
    error.style.display = "block";

    input.value = "";
    input.focus();

    if (attempts >= MAX_ATTEMPTS) {
      setTimeout(() => {
        attempts = 0;
      }, 30000);
    }
  }
}

function initPersonalAccessGate() {
  const form = document.getElementById("accessForm");
  const input = document.getElementById("accessKey");
  const error = document.getElementById("accessError");

  if (!form || !input) return;

  form.addEventListener("submit", checkPersonalAccess);

  // Hide error when typing
  input.addEventListener("input", () => {
    if (error) error.style.display = "none";
  });

  input.focus();
}
/* ================= PERSONAL PAGE GUARD ================= */

function guardPersonalPage() {
  if (!window.location.pathname.endsWith("personal.html")) return;

  const access = sessionStorage.getItem("personalAccess");

  if (access !== "granted") {
    window.location.replace("personal-access.html");
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

  initPersonalAccessGate();
  guardPersonalPage();


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
window.addEventListener("scroll", () => {
  const header = document.querySelector(".site-header");
  header.classList.toggle("scrolled", window.scrollY > 10);
});
