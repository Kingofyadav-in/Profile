"use strict";

/* ======================================================
   script.js — Production Version
   Clean • Modular • Optimized • Root-Safe
====================================================== */

/* ======================================================
   UTIL
====================================================== */

const $ = (id) => document.getElementById(id);
const $$ = (selector) => document.querySelectorAll(selector);

/* ======================================================
   THEME SYSTEM
====================================================== */

function applyTheme(theme) {
  document.body.classList.toggle("theme-dark", theme === "dark");
  document.body.classList.toggle("theme-light", theme === "light");

  const btn = $("themeToggle");
  if (btn) btn.textContent = theme === "dark" ? "🌙" : "☀️";

  updateLogo();
}

function initTheme() {
  const saved = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(saved || (prefersDark ? "dark" : "light"));
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
  });
}

/* ======================================================
   LOGO SYSTEM (ROOT SAFE)
====================================================== */

function updateLogo() {
  const theme = document.body.classList.contains("theme-light")
    ? "day"
    : "night";

  ["siteLogo", "personalLogo"].forEach(id => {
    const logo = document.getElementById(id);
    if (logo) {
      logo.src = `/logo/${theme}-logo.png`;
    }
  });
}

/* ======================================================
   ACTIVE NAV (SMART MATCH)
====================================================== */

function initActiveNav() {
  const current = window.location.pathname.replace(/\/$/, "");

  $$(".nav-list a").forEach(link => {
    const target = link.pathname.replace(/\/$/, "");
    if (current.endsWith(target)) {
      link.classList.add("active");
    }
  });
}

/* ======================================================
   FOOTER SYSTEM
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

  const hour = new Date().getHours();
  el.textContent =
    hour >= 10 && hour < 22 ? "STATUS: ACTIVE" : "STATUS: OFFLINE";
}

function startFooterUpdates() {
  updateClock();
  updateStatus();
  setInterval(() => {
    updateClock();
    updateStatus();
  }, 60000);
}

/* ======================================================
   SOCIAL LINKS
====================================================== */

function loadSocials() {
  const box = $("socialLinks");
  if (!box) return;

  const links = [
    { name: "facebook", url: "https://www.facebook.com/kingofyadav.in" },
    { name: "instagram", url: "https://www.instagram.com/kingofyadav.in" },
    { name: "youtube", url: "https://www.youtube.com/@kingofyadav-in" },
    { name: "github", url: "https://github.com/kingofyadav" }
  ];

  box.innerHTML = links
    .map(
      ({ name, url }) => `
      <a href="${url}" target="_blank" rel="noopener noreferrer" aria-label="${name}">
        <img src="https://cdn-icons-png.flaticon.com/512/${getIcon(name)}" alt="${name}" loading="lazy">
      </a>`
    )
    .join("");
}

function getIcon(name) {
  const map = {
    facebook: "124/124010.png",
    instagram: "2111/2111463.png",
    youtube: "1384/1384060.png",
    github: "733/733553.png"
  };
  return map[name] || "";
}

/* ======================================================
   MOBILE HEADER AUTO HIDE
====================================================== */

function initMobileHeader() {
  let lastScroll = 0;

  window.addEventListener("scroll", () => {
    if (window.innerWidth > 768) return;

    const header = document.querySelector(".site-header");
    if (!header) return;

    const current = window.scrollY;
    header.classList.toggle("hide", current > lastScroll && current > 100);
    lastScroll = current;
  }, { passive: true });
}

/* ======================================================
   SCROLL REVEAL (INTERSECTION OBSERVER)
====================================================== */

function initScrollReveal() {
  const elements = document.querySelectorAll(
    ".connect-card, .page-intro, .contact-library-item"
  );
  if (!elements.length) return;

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("active");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  elements.forEach((el, index) => {
    el.classList.add("reveal", `delay-${index % 4}`);
    observer.observe(el);
  });
}

/* ======================================================
   HERO PARALLAX (THROTTLED)
====================================================== */

function initParallax() {
  const hero = document.querySelector(".hero-pro");
  if (!hero) return;

  let ticking = false;

  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        hero.style.backgroundPositionY = `${window.scrollY * 0.3}px`;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

/* ======================================================
   GLOBAL CLICK DELEGATION
====================================================== */

function initGlobalClickHandler() {
  document.addEventListener("click", e => {
    const card = e.target.closest(
      ".post-card, .youtube-card, .instagram-card, .facebook-post, .youtube-post"
    );
    if (!card) return;

    const link = card.dataset.link;
    const video = card.dataset.video;

    if (link) {
      window.open(link, "_blank");
    } else if (video) {
      window.open(`https://www.youtube.com/watch?v=${video}`, "_blank");
    }
  });
}

/* ======================================================
   PWA (ROOT SAFE + UPDATE HANDLING)
====================================================== */

function initServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register(
        "/service-worker.js",
        { scope: "/" }
      );

      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            showSWUpdateBanner(reg);
          }
        });
      });
    } catch {}
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    window.location.reload();
  });
}

function showSWUpdateBanner(reg) {
  if ($("swUpdateBanner")) return;

  const banner = document.createElement("div");
  banner.id = "swUpdateBanner";
  banner.className = "sw-update-banner";
  banner.innerHTML = `
    <span>New version available.</span>
    <div>
      <button id="swLater">Later</button>
      <button id="swRefresh">Refresh</button>
    </div>
  `;

  document.body.appendChild(banner);

  $("swLater").onclick = () => banner.remove();
  $("swRefresh").onclick = () => {
    if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
  };
}
/* =====================================================
   GLOBAL ENQUIRY SYSTEM
===================================================== */

function openEnquiry() {
  document.body.classList.add("enquiry-active");
}

function closeEnquiry() {
  document.body.classList.remove("enquiry-active");
}

document.getElementById("enquiryForm")?.addEventListener("submit", async function(e) {

  e.preventDefault();

  const formData = {
    name: this.name.value,
    email: this.email.value,
    subject: this.subject.value,
    message: this.message.value
  };

  try {

    const response = await fetch("https://kingofyadav.in/api/enquiry", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(formData)
    });

    if (response.ok) {
      alert("✅ Enquiry Submitted Successfully");
      this.reset();
      closeEnquiry();
    }

  } catch (error) {
    alert("❌ Submission Failed");
  }

});
/* ======================================================
   INIT
====================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  setupThemeToggle();
  initActiveNav();
  startFooterUpdates();
  loadSocials();
  initMobileHeader();
  initScrollReveal();
  initParallax();
  initGlobalClickHandler();
  initServiceWorker();

  const year = $("year");
  if (year) year.textContent = new Date().getFullYear();
});
