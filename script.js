/* ================= GLOBAL SAFE HELPERS ================= */

function $(id) {
  return document.getElementById(id);
}

/* ================= THEME / MODE ================= */

let currentMode = null;

function updateTheme(hour) {
  const isDay = hour >= 6 && hour < 18;
  document.body.classList.toggle("theme-light", isDay);
  document.body.classList.toggle("theme-dark", !isDay);
}

/* ================= LOGO (FIXED FOR ROOT + SUBPAGES) ================= */

function updateLogo(hour) {
  const logo = $("siteLogo");
  if (!logo) return;

  const mode = hour >= 6 && hour < 18 ? "day" : "night";

  // Detect if current page is inside a subfolder like /page/
  const isSubPage = window.location.pathname.includes("/page/");

  const basePath = isSubPage ? "../logo/" : "logo/";
  const newSrc = `${basePath}${mode}-logo.png`;

  if (!logo.src.includes(newSrc)) {
    logo.src = newSrc;
  }
}

/* ================= CLOCK / STATUS ================= */

function updateClock(now) {
  const clock = $("footerClock");
  if (!clock) return;

  clock.textContent = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function updateStatus(hour) {
  const status = $("status");
  if (!status) return;

  status.textContent =
    hour >= 10 && hour < 22 ? "STATUS: ACTIVE" : "STATUS: OFFLINE";
}

/* ================= LOCATION ================= */

function updateLocation() {
  const loc = $("footerLocation");
  if (!loc) return;

  fetch("https://ipapi.co/json/")
    .then(r => r.json())
    .then(d => {
      loc.textContent = `${d.city || "Unknown"}, ${d.country_name || ""}`;
    })
    .catch(() => {
      loc.textContent = "Location unavailable";
    });
}

/* ================= SOCIAL ICONS ================= */

function loadSocials() {
  const box = $("socialLinks");
  if (!box) return;

  const socials = {
    facebook: "https://www.facebook.com/kingofyadav.in",
    instagram: "https://www.instagram.com/kingofyadav.in",
    youtube: "https://www.youtube.com/@kingofyadav-in",
    github: "https://github.com/kingofyadav"
  };

  Object.entries(socials).forEach(([p, url]) => {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.innerHTML = `<img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/${p}.svg">`;
    box.appendChild(a);
  });
}

/* ================= YEAR ================= */

function updateYear() {
  const y = $("year");
  if (y) y.textContent = new Date().getFullYear();
}

/* ================= MAIN TICK ================= */

function tick() {
  const now = new Date();
  const hour = now.getHours();

  updateTheme(hour);
  updateLogo(hour);
  updateClock(now);
  updateStatus(hour);
}

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", () => {
  tick();
  updateYear();
  updateLocation();
  loadSocials();
  setInterval(tick, 1000);
});
