"use strict";

/* ======================================================
  script.js — Site behavior helpers
  Purpose: theme, header, socials, minor UI interactions
  Author: Amit Ku Yadav
  Sections: util | theme | logo | nav | footer | socials | personal-access | page inits
====================================================== */

/* ======================================================
  UTIL
====================================================== */

function $(id) {
  return document.getElementById(id);
}

/* ======================================================
   THEME SYSTEM
====================================================== */

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
  } else {
    const prefersDark =
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(prefersDark ? "dark" : "light");
  }
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

/* ======================================================
   LOGO SYSTEM (UNIFIED – PRO FIX)
====================================================== */

function updateLogo() {
  const logos = [
    document.getElementById("siteLogo"),
    document.getElementById("personalLogo")
  ];

  const theme = document.body.classList.contains("theme-light")
    ? "day"
    : "night";

  logos.forEach(logo => {
    if (logo) {
      logo.src = `logo/${theme}-logo.png`;
    }
  });
}
/* ======================================================
   ACTIVE NAV
====================================================== */

document.querySelectorAll(".nav-list a").forEach(link => {
  if (link.pathname === window.location.pathname) {
    link.classList.add("active");
  }
});

/* ======================================================
   FOOTER
====================================================== */

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
  el.textContent =
    h >= 10 && h < 22 ? "STATUS: ACTIVE" : "STATUS: OFFLINE";
}

/* ======================================================
   SOCIALS
====================================================== */

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

/* ======================================================
   PERSONAL ACCESS GATE
====================================================== */

const PERSONAL_HASH =
  "d9ec2d33f505a6f5bbf26bbef8bc1bfe44a905215d703556784e8d4da640ecce";

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

  const input = $("accessKey");
  const error = $("accessError");
  if (!input || !error) return;

  error.style.display = "none";

  const value = input.value.trim();
  if (!value) {
    error.textContent = "Please enter access phrase.";
    error.style.display = "block";
    return;
  }

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
      setTimeout(() => (attempts = 0), 30000);
    }
  }
}

function guardPersonalPage() {
  // Personal page is public — no redirect performed.
  // Access gate intentionally disabled to make personal.html publicly accessible.
  return;
}

  /* ======================================================
   APPLE STYLE MOBILE HEADER (CLEAN)
====================================================== */

function initMobileHeader() {
  let lastScroll = 0;

  window.addEventListener("scroll", function () {
    if (window.innerWidth > 768) return;

    const header =
      document.querySelector(".site-header") ||
      document.querySelector(".personal-header");

    if (!header) return;

    const current = window.scrollY;

    if (current > lastScroll && current > 100) {
      header.classList.add("hide");
    } else {
      header.classList.remove("hide");
    }

    lastScroll = current;
  });
}

/* ======================================================
   SCROLL REVEAL
====================================================== */

function initScrollReveal() {
  const elements = document.querySelectorAll(
    ".connect-card, .page-intro, .contact-library-item"
  );

  if (!elements.length) return;

  elements.forEach((el, index) => {
    el.classList.add("reveal", `delay-${index % 4}`);
  });

  function revealOnScroll() {
    const trigger = window.innerHeight * 0.85;

    elements.forEach(el => {
      if (el.getBoundingClientRect().top < trigger) {
        el.classList.add("active");
      }
    });
  }

  window.addEventListener("scroll", revealOnScroll);
  revealOnScroll();
}

/* ======================================================
   HERO PARALLAX
====================================================== */

function initParallax() {
  window.addEventListener("scroll", () => {
    const hero = document.querySelector(".hero-pro");
    if (!hero) return;

    const offset = window.scrollY * 0.3;
    hero.style.backgroundPositionY = `${offset}px`;
  });
}

/* ======================================================
   INIT
====================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // Initialization
  initTheme();
  setupThemeToggle();
  updateLogo();
  updateClock();
  updateStatus();
  loadSocials();
  guardPersonalPage();
  initMobileHeader();
  initScrollReveal();
  initParallax();

  // Year
  const year = $("year");
  if (year) year.textContent = new Date().getFullYear();

  // Periodic updates
  setInterval(() => {
    updateClock();
    updateStatus();
  }, 60000);

  // Personal access form (if present)
  const accessForm = document.getElementById("accessForm");
  if (accessForm) {
    accessForm.addEventListener("submit", checkPersonalAccess);
  }

  // YouTube thumbnails: set dynamic thumbs where applicable
  document.querySelectorAll(".youtube-post").forEach(function(card) {
    const videoId = card.dataset.video;
    const img = card.querySelector(".yt-dynamic-thumb");
    if (videoId && img) {
      img.src = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    }
  });

  // Global click delegation for post cards / media cards
  document.addEventListener("click", function(e) {
    const postCard = e.target.closest('.post-card, .youtube-card, .instagram-card, .facebook-post, .instagram-post, .youtube-post');
    if (postCard) {
      const link = postCard.dataset.link;
      // Special-case: youtube-card may use data-video
      const videoId = postCard.dataset.video;
      if (link) {
        window.open(link, "_blank");
        return;
      }
      if (videoId) {
        window.open(`https://www.youtube.com/watch?v=${videoId}`, "_blank");
      }
    }
  });
});

/* ======================================================
   PWA
====================================================== */
/* digital card JS removed — platform anchors use standard behavior */

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("service-worker.js");

      // Listen for new service worker installing
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            // If there's an existing controller, it's an update
            if (navigator.serviceWorker.controller) {
              showSWUpdateBanner(reg);
            }
          }
        });
      });
    } catch (err) {
      // registration failed — ignore in production
    }
  });

  // When the new SW takes control, reload so user sees the new version
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

function showSWUpdateBanner(registration) {
  if (document.getElementById('swUpdateBanner')) return;

  const banner = document.createElement('div');
  banner.id = 'swUpdateBanner';
  banner.style.position = 'fixed';
  banner.style.left = '16px';
  banner.style.right = '16px';
  banner.style.bottom = '20px';
  banner.style.zIndex = 9999;
  banner.style.display = 'flex';
  banner.style.gap = '12px';
  banner.style.alignItems = 'center';
  banner.style.justifyContent = 'space-between';
  banner.style.padding = '12px 16px';
  banner.style.borderRadius = '10px';
  banner.style.boxShadow = '0 8px 30px rgba(0,0,0,0.25)';
  banner.style.background = 'var(--card-bg, #111)';
  banner.style.color = 'var(--card-text, #fff)';

  const text = document.createElement('div');
  text.textContent = 'A new version is available.';

  const actions = document.createElement('div');

  const later = document.createElement('button');
  later.textContent = 'Later';
  later.style.marginRight = '8px';
  later.onclick = () => banner.remove();

  const refresh = document.createElement('button');
  refresh.textContent = 'Refresh';
  refresh.style.background = 'var(--brand-green)';
  refresh.style.color = '#fff';
  refresh.style.border = 'none';
  refresh.style.padding = '8px 12px';
  refresh.style.borderRadius = '6px';

  refresh.onclick = () => {
    if (!registration || !registration.waiting) return;
    // Ask SW to skip waiting
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  };

  actions.appendChild(later);
  actions.appendChild(refresh);
  banner.appendChild(text);
  banner.appendChild(actions);
  document.body.appendChild(banner);
}
/* ================= MEDIA INTERACTION ================= */

document.querySelectorAll(".youtube-card").forEach(card => {
  card.addEventListener("click", () => {
    const id = card.dataset.video;
    window.open(`https://www.youtube.com/watch?v=${id}`, "_blank");
  });
});

document.querySelectorAll(".instagram-card").forEach(card => {
  card.addEventListener("click", () => {
    window.open("https://www.instagram.com/kingofyadav.in/", "_blank");
  });
});
/* ================= SOCIAL POST CLICK ================= */

document.querySelectorAll(".post-card").forEach(card => {
  card.addEventListener("click", () => {
    const link = card.dataset.link;
    if (link) {
      window.open(link, "_blank");
    }
  });
});
