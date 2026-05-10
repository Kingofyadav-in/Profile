"use strict";

/* ======================================================
   hi-app.js — HI App Core  (Phase 0 + 1)
   Identity · Today View · Tasks · Mood/Energy · Tabs
   Depends on: hi-storage.js (must load first)
====================================================== */

var HI_IDENTITY_ID = "primary";

/* ── Helpers ── */

function hiEsc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hiTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function hiFormatDate(d) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  }).format(d || new Date());
}

function hiGreeting() {
  var h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 20) return "Good evening";
  return "Good night";
}

function hiBuildUsername(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 40);
}

function hiFormatIdentityPhone(identity) {
  if (!identity || !identity.phone) return "";
  var code = identity.phoneCode || "";
  return (code ? code + " " : "") + identity.phone;
}

/* ── HDI Generator ── */

async function hiGenerateHDI(name) {
  var deviceId = localStorage.getItem("ak_device_id") || "device";
  var raw = String(name) + "|" + deviceId;
  try {
    var enc = new TextEncoder();
    var buf = await crypto.subtle.digest("SHA-256", enc.encode(raw));
    var hex = Array.from(new Uint8Array(buf))
      .map(function(b) { return b.toString(16).padStart(2, "0"); }).join("");
    var initials = String(name).split(" ")
      .map(function(w) { return w[0] || ""; }).join("").toUpperCase().slice(0, 3);
    var year = new Date().getFullYear();
    return initials + "-" + year + "-" + hex.slice(0, 6).toUpperCase();
  } catch (e) {
    /* Fallback for non-HTTPS */
    var code = String(name).replace(/\s+/g, "").slice(0, 3).toUpperCase();
    return code + "-" + new Date().getFullYear() + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  }
}

/* ── Identity ── */

async function hiLoadIdentity() {
  try { return await hiGet("identity", HI_IDENTITY_ID); }
  catch (e) { return null; }
}

async function hiSaveIdentity(data) {
  if (!data.hdi && data.name) {
    data.hdi = await hiGenerateHDI(data.name);
  }
  data.id        = HI_IDENTITY_ID;
  data.updatedAt = Date.now();
  if (!data.createdAt) data.createdAt = Date.now();
  await hiPut("identity", data);
  return data;
}

/* ── Render Identity Card ── */

function hiRenderIdentity(identity) {
  var card = document.getElementById("hi-identity-card");
  hiRenderHeroIdentity(identity);
  if (!card) return;

  if (!identity) {
    card.innerHTML =
      '<div class="hi-identity-setup">' +
        '<div class="hi-setup-icon">&#x1F5AA;</div>' +
        '<h2>Set Up Your Identity</h2>' +
        '<p>Create your Human Digital Identity — the foundation of HI App.</p>' +
        '<button class="hi-btn-primary" id="hiSetupIdentityBtn">Create Identity</button>' +
      '</div>';
    var btn = document.getElementById("hiSetupIdentityBtn");
    if (btn) btn.addEventListener("click", function() { hiOpenIdentityModal(null); });
    return;
  }

  var roles = Array.isArray(identity.roles)
    ? identity.roles.join(" · ")
    : (identity.roles || "");

  card.innerHTML =
    '<div class="hi-identity-inner">' +
      '<div class="hi-identity-left">' +
        '<div class="hi-identity-avatar">' + hiEsc(identity.name.charAt(0)) + '</div>' +
        (identity.hdi
          ? '<div class="hi-hdi-badge" title="Human Digital Identity">' + hiEsc(identity.hdi) + '</div>'
          : '') +
      '</div>' +
      '<div class="hi-identity-right">' +
        '<h2 class="hi-identity-name">' + hiEsc(identity.name) + '</h2>' +
        (identity.username ? '<p class="hi-identity-username">@' + hiEsc(identity.username) + '</p>' : '') +
        (roles    ? '<p class="hi-identity-roles">'   + hiEsc(roles)             + '</p>' : '') +
        (identity.email || identity.phone
          ? '<div class="hi-identity-contact">' +
              (identity.email ? '<span>' + hiEsc(identity.email) + '</span>' : '') +
              (identity.phone ? '<span>' + hiEsc(hiFormatIdentityPhone(identity)) + '</span>' : '') +
            '</div>'
          : '') +
        (identity.tagline  ? '<p class="hi-identity-tagline">&ldquo;' + hiEsc(identity.tagline) + '&rdquo;</p>' : '') +
        (identity.location ? '<p class="hi-identity-location">&#x1F4CD; ' + hiEsc(identity.location) + '</p>' : '') +
        (identity.mission  ? '<p class="hi-identity-mission">'  + hiEsc(identity.mission)  + '</p>' : '') +
      '</div>' +
      '<button class="hi-edit-identity-btn" id="hiEditIdentityBtn" title="Edit identity">&#x270F;&#xFE0F;</button>' +
    '</div>';

  var editBtn = document.getElementById("hiEditIdentityBtn");
  if (editBtn) editBtn.addEventListener("click", function() { hiOpenIdentityModal(identity); });
}

function hiRenderHeroDots(containerId, value) {
  var el = document.getElementById(containerId);
  if (!el) return;
  var count = Math.max(0, Math.min(5, parseInt(value || 0, 10)));
  var html = "";
  for (var i = 1; i <= 5; i++) {
    html += '<i class="' + (i <= count ? "active" : "") + '"></i>';
  }
  el.innerHTML = html;
}

async function hiRenderHeroIdentity(identity) {
  var title = document.getElementById("hiHeroTitle");
  var nameEl = document.getElementById("hiHeroIdentityName");
  var hdiEl = document.getElementById("hiHeroHDI");
  var editBtn = document.getElementById("hiHeroEditIdentityBtn");
  var name = identity && identity.name ? identity.name : "Amit Ku Yadav";

  if (title) title.textContent = "Life OS for " + name;
  if (nameEl) nameEl.textContent = name;
  if (hdiEl) hdiEl.textContent = identity && identity.hdi ? identity.hdi : "HDI pending";
  if (editBtn) {
    editBtn.textContent = identity ? "Edit Identity" : "Create Identity";
    editBtn.onclick = function() { hiOpenIdentityModal(identity || null); };
  }
}

async function hiRenderHeroToday() {
  var greetingEl = document.getElementById("hiHeroGreeting");
  var dateEl = document.getElementById("hiHeroDate");
  if (greetingEl) greetingEl.textContent = hiGreeting();
  if (dateEl) dateEl.textContent = hiFormatDate();
  var moodData = await hiLoadMoodToday();
  hiRenderHeroDots("hiHeroMoodDots", moodData ? moodData.mood : 0);
  hiRenderHeroDots("hiHeroEnergyDots", moodData ? moodData.energy : 0);
}

/* ── Identity Modal ── */

function hiOpenIdentityModal(identity) {
  var modal = document.getElementById("hi-identity-modal");
  if (!modal) return;

  document.getElementById("hiIdentityModalTitle").textContent =
    identity ? "Edit Identity" : "Create Your Identity";

  document.getElementById("hi-id-name").value =
    identity ? (identity.name || "") : "Amit Ku Yadav";
  document.getElementById("hi-id-username").value =
    identity ? (identity.username || hiBuildUsername(identity.name)) : "kingofyadav";
  document.getElementById("hi-id-email").value =
    identity ? (identity.email || "") : "";
  document.getElementById("hi-id-phone-code").value =
    identity ? (identity.phoneCode || "+91") : "+91";
  document.getElementById("hi-id-phone").value =
    identity ? (identity.phone || "") : "";
  document.getElementById("hi-id-tagline").value =
    identity ? (identity.tagline || "") : "";
  document.getElementById("hi-id-roles").value =
    identity
      ? (Array.isArray(identity.roles) ? identity.roles.join(", ") : (identity.roles || ""))
      : "Founder · Builder · Creator";
  document.getElementById("hi-id-mission").value =
    identity ? (identity.mission || "") : "";
  document.getElementById("hi-id-location").value =
    identity ? (identity.location || "") : "Bhagalpur, India";

  var errEl = document.getElementById("hiIdentityModalErr");
  if (errEl) errEl.textContent = "";

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  setTimeout(function() {
    var f = document.getElementById("hi-id-name");
    if (f) f.focus();
  }, 60);
}

function hiCloseIdentityModal() {
  var modal = document.getElementById("hi-identity-modal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

async function hiSaveIdentityModal() {
  var name     = (document.getElementById("hi-id-name").value     || "").trim();
  var username = (document.getElementById("hi-id-username").value || "").trim();
  var email    = (document.getElementById("hi-id-email").value    || "").trim();
  var phoneCode= (document.getElementById("hi-id-phone-code").value || "").trim();
  var phone    = (document.getElementById("hi-id-phone").value    || "").trim();
  var tagline  = (document.getElementById("hi-id-tagline").value  || "").trim();
  var rolesRaw = (document.getElementById("hi-id-roles").value    || "").trim();
  var mission  = (document.getElementById("hi-id-mission").value  || "").trim();
  var location = (document.getElementById("hi-id-location").value || "").trim();
  var errEl    = document.getElementById("hiIdentityModalErr");

  if (!name) {
    if (errEl) errEl.textContent = "Name is required.";
    return;
  }
  username = hiBuildUsername(username || name);
  if (!username) {
    if (errEl) errEl.textContent = "Username is required.";
    return;
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    if (errEl) errEl.textContent = "Enter a valid email address.";
    return;
  }
  if (phoneCode && !/^\+\d{1,4}$/.test(phoneCode)) {
    if (errEl) errEl.textContent = "Country code must look like +91.";
    return;
  }
  phone = phone.replace(/[^\d\s-]/g, "").trim();
  if (errEl) errEl.textContent = "";

  var existing = await hiLoadIdentity();
  var roles = rolesRaw
    ? rolesRaw.split(/[,·]/).map(function(r) { return r.trim(); }).filter(Boolean)
    : [];

  var data = Object.assign({}, existing || {}, {
    name: name,
    username: username,
    email: email,
    phoneCode: phoneCode || "+91",
    phone: phone,
    tagline: tagline,
    roles: roles,
    mission: mission,
    location: location
  });
  if (existing && existing.hdi) data.hdi = existing.hdi;

  var saved = await hiSaveIdentity(data);
  hiRenderIdentity(saved);
  hiRenderHeroIdentity(saved);
  if (typeof window.pdSyncIdentityDetails === "function") {
    window.pdSyncIdentityDetails(saved);
  }
  hiCloseIdentityModal();
}

/* ── Today Header ── */

function hiRenderTodayHeader() {
  var greetEl = document.getElementById("hi-greeting");
  var dateEl  = document.getElementById("hi-today-date");

  if (greetEl) {
    var user = (typeof getAuthUser === "function") ? getAuthUser() : null;
    greetEl.textContent = hiGreeting() + (user ? ", " + user : "");
  }
  if (dateEl) {
    dateEl.textContent = hiFormatDate();
  }
  hiRenderHeroToday();
}

/* ── Tasks ── */

async function hiLoadTodayTasks() {
  var today = hiTodayDate();
  var all   = await hiGetAll("tasks");
  return all
    .filter(function(t) { return t.date === today; })
    .sort(function(a, b) { return a.createdAt - b.createdAt; });
}

async function hiAddTask(title) {
  var task = {
    id: hiGenId(), title: title.trim(),
    done: false, date: hiTodayDate(), createdAt: Date.now()
  };
  await hiPut("tasks", task);
  return task;
}

async function hiToggleTask(id) {
  var task = await hiGet("tasks", id);
  if (!task) return;
  task.done   = !task.done;
  task.doneAt = task.done ? Date.now() : null;
  await hiPut("tasks", task);
}

async function hiRenderTasks() {
  var list = document.getElementById("hi-task-list");
  if (!list) return;

  var tasks = await hiLoadTodayTasks();

  if (!tasks.length) {
    list.innerHTML = '<li class="hi-task-empty">No tasks yet. Add your first task for today.</li>';
    return;
  }

  list.innerHTML = tasks.map(function(t) {
    return '<li class="hi-task-item' + (t.done ? ' done' : '') + '" data-id="' + hiEsc(t.id) + '">' +
      '<button class="hi-task-check" aria-label="' + (t.done ? 'Mark incomplete' : 'Mark complete') + '">' +
        (t.done ? '&#x2713;' : '') +
      '</button>' +
      '<span class="hi-task-title">' + hiEsc(t.title) + '</span>' +
      '<button class="hi-task-delete" aria-label="Delete task">&#x2715;</button>' +
    '</li>';
  }).join("");

  list.querySelectorAll(".hi-task-check").forEach(function(btn) {
    btn.addEventListener("click", async function() {
      var id = btn.closest(".hi-task-item").dataset.id;
      await hiToggleTask(id);
      hiRenderTasks();
    });
  });

  list.querySelectorAll(".hi-task-delete").forEach(function(btn) {
    btn.addEventListener("click", async function() {
      var id = btn.closest(".hi-task-item").dataset.id;
      await hiDelete("tasks", id);
      hiRenderTasks();
    });
  });
}

function hiInitTaskInput() {
  var form = document.getElementById("hi-task-form");
  if (!form) return;
  form.addEventListener("submit", async function(e) {
    e.preventDefault();
    var input = document.getElementById("hi-task-input");
    var val   = (input ? input.value : "").trim();
    if (!val) return;
    await hiAddTask(val);
    if (input) input.value = "";
    hiRenderTasks();
  });
}

/* ── Mood & Energy ── */

async function hiLoadMoodToday() {
  try { return await hiGet("personal", "mood-" + hiTodayDate()); }
  catch (e) { return null; }
}

async function hiSaveMoodEnergy(mood, energy) {
  await hiPut("personal", {
    id: "mood-" + hiTodayDate(),
    mood: mood, energy: energy,
    date: hiTodayDate(), updatedAt: Date.now()
  });
}

function hiRenderDots(containerId, value, max, onSelect) {
  var el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = "";
  for (var i = 1; i <= max; i++) {
    var dot = document.createElement("button");
    dot.className   = "hi-dot" + (i <= value ? " active" : "");
    dot.type        = "button";
    dot.setAttribute("aria-label", i + " of " + max);
    dot.setAttribute("data-val", i);
    el.appendChild(dot);
  }
  el.onclick = function(e) {
    var btn = e.target.closest(".hi-dot");
    if (!btn) return;
    onSelect(parseInt(btn.dataset.val, 10));
  };
}

async function hiInitMood() {
  var moodData      = await hiLoadMoodToday();
  var currentMood   = moodData ? (moodData.mood   || 0) : 0;
  var currentEnergy = moodData ? (moodData.energy || 0) : 0;

  function renderAll() {
    hiRenderDots("hi-mood-dots", currentMood, 5, async function(val) {
      currentMood = val;
      await hiSaveMoodEnergy(currentMood, currentEnergy);
      hiRenderHeroDots("hiHeroMoodDots", currentMood);
      hiRenderHeroDots("hiHeroEnergyDots", currentEnergy);
      renderAll();
    });
    hiRenderDots("hi-energy-dots", currentEnergy, 5, async function(val) {
      currentEnergy = val;
      await hiSaveMoodEnergy(currentMood, currentEnergy);
      hiRenderHeroDots("hiHeroMoodDots", currentMood);
      hiRenderHeroDots("hiHeroEnergyDots", currentEnergy);
      renderAll();
    });
    hiRenderHeroDots("hiHeroMoodDots", currentMood);
    hiRenderHeroDots("hiHeroEnergyDots", currentEnergy);
  }
  renderAll();
}

/* ── Tabs ── */

function hiInitTabs() {
  var tabBtns     = document.querySelectorAll(".hi-tab-btn");
  var tabContents = document.querySelectorAll(".hi-tab-content");
  if (!tabBtns.length) return;

  tabBtns.forEach(function(btn) {
    btn.addEventListener("click", function() {
      var target = btn.dataset.tab;
      tabBtns.forEach(function(b) {
        b.classList.toggle("active", b.dataset.tab === target);
      });
      tabContents.forEach(function(c) {
        c.hidden = c.dataset.tab !== target;
      });
    });
  });
}

/* ── INIT ── */

document.addEventListener("DOMContentLoaded", async function() {
  /* Open IndexedDB first — if it fails, graceful degradation */
  try { await hiOpenDB(); } catch (e) {
    console.warn("[HI] IndexedDB unavailable — running in degraded mode", e);
  }

  /* Identity */
  var identity = await hiLoadIdentity();
  hiRenderIdentity(identity);
  if (typeof window.pdSyncIdentityDetails === "function") {
    window.pdSyncIdentityDetails(identity);
  }
  var pdEditBtn = document.getElementById("hiPersonalDetailsEditBtn");
  if (pdEditBtn) {
    pdEditBtn.addEventListener("click", function() {
      hiOpenIdentityModal(identity || null);
    });
  }

  /* Today */
  hiRenderTodayHeader();
  hiRenderTasks();
  hiInitTaskInput();
  hiInitMood();

  /* Tabs */
  hiInitTabs();

  /* Identity modal buttons */
  var mSave   = document.getElementById("hiIdentityModalSave");
  var mCancel = document.getElementById("hiIdentityModalCancel");
  var mClose  = document.getElementById("hiIdentityModalClose");
  var overlay = document.getElementById("hi-identity-modal");

  if (mSave)   mSave.addEventListener("click", hiSaveIdentityModal);
  if (mCancel) mCancel.addEventListener("click", hiCloseIdentityModal);
  if (mClose)  mClose.addEventListener("click", hiCloseIdentityModal);
  if (overlay) {
    overlay.addEventListener("click", function(e) {
      if (e.target === overlay) hiCloseIdentityModal();
    });
  }

  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") hiCloseIdentityModal();
  });

  /* Modal Enter key submit */
  if (overlay) {
    overlay.addEventListener("keydown", function(e) {
      if (e.key === "Enter" && e.target.tagName !== "TEXTAREA" && e.target.tagName !== "BUTTON") {
        e.preventDefault();
        hiSaveIdentityModal();
      }
    });
  }

  /* AI FAB is wired by hi-assistant.js. */
});
