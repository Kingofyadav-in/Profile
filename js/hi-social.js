"use strict";

/* ======================================================
   hi-social.js — Social Life Manager  (Phase 4)
   People · Events · Follow-ups · Upcoming 7 Days
   Depends on: hi-storage.js
====================================================== */

const HI_RELATIONSHIP_TYPES = ["Family", "Friend", "Colleague", "Mentor", "Community", "Contact", "Partner"];
const HI_EVENT_TYPES        = ["Meeting", "Birthday", "Gathering", "Deadline", "Community", "Other"];

const HI_DEFAULT_PEOPLE = [
  {
    id:           "seed-person-aniket",
    name:         "Aniket Ku Yadav",
    role:         "Community Representative",
    phone:        "+919939875791",
    whatsapp:     "+919939875791",
    relationship: "Community",
    note:         "Core working contact for local coordination and follow-up.",
  },
  {
    id:           "seed-person-abhishek",
    name:         "Abhishek Ku Yadav",
    role:         "Community Coordinator",
    phone:        "+919801249451",
    whatsapp:     "+919801249451",
    relationship: "Community",
    note:         "Supports people coordination, field updates, and practical execution.",
  },
  {
    id:           "seed-person-public",
    name:         "Public Enquiry Desk",
    role:         "Website, services, and collaboration intake",
    phone:        "+919523528114",
    whatsapp:     "+919523528114",
    relationship: "Contact",
    note:         "Primary contact channel published for kingofyadav.in enquiries.",
  },
];

const HI_DEFAULT_EVENTS = [
  { id: "seed-event-dashboard-review",   title: "Dashboard review and backup check",     daysFromNow: 1, time: "09:30", eventType: "Deadline",  note: "Confirm identity, tasks, people, and vault data are present." },
  { id: "seed-event-community-followup", title: "Community coordination follow-up",       daysFromNow: 3, time: "17:00", eventType: "Community", note: "Review youth, local, and member coordination updates." },
  { id: "seed-event-public-content",     title: "Public profile content update",          daysFromNow: 7, time: "11:00", eventType: "Meeting",   note: "Improve proof, services, ventures, and collaboration pages." },
];

/* ── Helpers ── */

function hiDaysFromNow(dateStr) {
  if (!dateStr) return Infinity;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d     = new Date(dateStr); d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86_400_000);
}

function hiShortDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function hiDateOffset(days) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function hiEnsureSocialSeedData() {
  const all       = await hiGetAll("social");
  const hasPeople = all.some(r => r.type === "person");
  const hasEvents = all.some(r => r.type === "event");
  const now       = Date.now();

  if (!hasPeople) {
    for (let i = 0; i < HI_DEFAULT_PEOPLE.length; i++) {
      await hiPut("social", Object.assign({}, HI_DEFAULT_PEOPLE[i], { type: "person", seeded: true, createdAt: now + i, updatedAt: now + i }));
    }
  }

  if (!hasEvents) {
    for (let i = 0; i < HI_DEFAULT_EVENTS.length; i++) {
      const ev = HI_DEFAULT_EVENTS[i];
      await hiPut("social", {
        type:      "event",
        id:        ev.id,
        title:     ev.title,
        date:      hiDateOffset(ev.daysFromNow),
        time:      ev.time,
        eventType: ev.eventType,
        note:      ev.note,
        seeded:    true,
        createdAt: now + 100 + i,
        updatedAt: now + 100 + i,
      });
    }
  }
}

function hiNextBirthday(bdayStr) {
  if (!bdayStr) return null;
  const parts = bdayStr.split("-");
  if (parts.length < 2) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const year  = today.getFullYear();
  let   next  = new Date(`${year}-${parts[1]}-${parts[2]}`);
  next.setHours(0, 0, 0, 0);
  if (next < today) next = new Date(`${year + 1}-${parts[1]}-${parts[2]}`);
  return next.toISOString().slice(0, 10);
}

/* ── UPCOMING (next 14 days) ── */

async function hiRenderUpcoming() {
  const el = document.getElementById("hi-upcoming-list");
  if (!el) return;

  const all    = await hiGetAll("social");
  const events = all.filter(r => r.type === "event");
  const people = all.filter(r => r.type === "person" && r.birthday);
  const items  = [];

  for (const e of events) {
    const d = hiDaysFromNow(e.date);
    if (d >= 0 && d <= 14) items.push({ label: e.title, date: e.date, days: d, tag: e.eventType || "Event", color: "#046A38" });
  }

  for (const p of people) {
    const bd = hiNextBirthday(p.birthday);
    if (!bd) continue;
    const d = hiDaysFromNow(bd);
    if (d >= 0 && d <= 14) items.push({ label: `🎂 ${p.name}'s Birthday`, date: bd, days: d, tag: "Birthday", color: "#FF671F" });
  }

  items.sort((a, b) => a.days - b.days);

  if (!items.length) {
    el.innerHTML = '<p class="hi-empty">No events in the next 14 days.</p>';
    return;
  }

  el.innerHTML = items.map(item => {
    const dayLabel = item.days === 0 ? "<strong style='color:var(--brand-green)'>Today</strong>"
      : item.days === 1 ? "<strong>Tomorrow</strong>"
      : `in ${item.days} days`;
    return `<div class="hi-upcoming-row">` +
      `<div class="hi-upcoming-dot" style="background:${item.color}"></div>` +
      `<div class="hi-upcoming-info">` +
        `<span class="hi-upcoming-title">${hiEsc(item.label)}</span>` +
        `<span class="hi-upcoming-meta">${hiEsc(hiShortDate(item.date))} &middot; ${dayLabel}</span>` +
      `</div>` +
      `<span class="hi-upcoming-tag" style="border-color:${item.color};color:${item.color}">${hiEsc(item.tag)}</span>` +
    `</div>`;
  }).join("");
}

/* ── PEOPLE ── */

async function hiLoadPeople() {
  const all = await hiGetAll("social");
  return all.filter(r => r.type === "person").sort((a, b) => a.name.localeCompare(b.name));
}

async function hiRenderPeople() {
  const grid = document.getElementById("hi-people-grid");
  if (!grid) return;
  const people = await hiLoadPeople();

  if (!people.length) {
    grid.innerHTML = '<p class="hi-empty">No contacts yet. Add the people who matter.</p>';
    return;
  }

  grid.innerHTML = people.map(p => {
    const initials = p.name.split(" ").map(w => w[0] ?? "").join("").slice(0, 2).toUpperCase();
    const bd       = p.birthday ? hiNextBirthday(p.birthday) : null;
    const bdDays   = bd ? hiDaysFromNow(bd) : null;
    const bdBadge  = (bdDays !== null && bdDays <= 7)
      ? `<span class="hi-bday-badge">🎂 ${bdDays === 0 ? "Today!" : `in ${bdDays} days`}</span>`
      : "";
    return `<div class="hi-person-card glass">` +
      `<div class="hi-person-top">` +
        `<div class="hi-person-avatar">${initials}</div>` +
        `<div class="hi-person-info">` +
          `<span class="hi-person-name">${hiEsc(p.name)}</span>` +
          `<span class="hi-person-role">${hiEsc(p.role ?? "")}</span>` +
          (p.relationship ? `<span class="hi-person-rel">${hiEsc(p.relationship)}</span>` : '') +
        `</div>` +
        `<div class="hi-goal-btns">` +
          `<button type="button" class="hi-icon-btn hi-person-edit" data-id="${hiEsc(p.id)}" aria-label="Edit">✏️</button>` +
          `<button type="button" class="hi-icon-btn hi-person-del"  data-id="${hiEsc(p.id)}" aria-label="Delete">✕</button>` +
        `</div>` +
      `</div>` +
      bdBadge +
      (p.note ? `<p class="hi-person-note">${hiEsc(p.note)}</p>` : '') +
      `<div class="hi-person-actions">` +
        (p.phone    ? `<a class="hi-contact-btn" href="tel:${hiEsc(p.phone)}">📞 Call</a>` : '') +
        (p.whatsapp ? `<a class="hi-contact-btn hi-wa-btn" href="https://wa.me/${p.whatsapp.replace(/\D/g, "")}" target="_blank" rel="noopener">💬 WhatsApp</a>` : '') +
      `</div>` +
    `</div>`;
  }).join("");

  grid.querySelectorAll(".hi-person-edit").forEach(btn => {
    btn.addEventListener("click", async () => {
      const p = await hiGet("social", btn.dataset.id);
      if (p) hiOpenPersonModal(p);
    });
  });

  grid.querySelectorAll(".hi-person-del").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Remove this contact?")) return;
      await hiDelete("social", btn.dataset.id);
      hiRenderPeople();
      hiRenderUpcoming();
    });
  });
}

function hiOpenPersonModal(person) {
  const modal = document.getElementById("hi-person-modal");
  if (!modal) return;
  document.getElementById("hiPersonModalTitle").textContent        = person ? "Edit Contact" : "Add Contact";
  document.getElementById("hi-person-f-name").value               = person?.name         ?? "";
  document.getElementById("hi-person-f-role").value               = person?.role         ?? "";
  document.getElementById("hi-person-f-phone").value              = person?.phone        ?? "";
  document.getElementById("hi-person-f-whatsapp").value           = person?.whatsapp     ?? "";
  document.getElementById("hi-person-f-birthday").value           = person?.birthday     ?? "";
  document.getElementById("hi-person-f-relationship").value       = person?.relationship ?? "";
  document.getElementById("hi-person-f-note").value               = person?.note         ?? "";
  document.getElementById("hiPersonModalErr").textContent         = "";
  modal._editId = person?.id ?? null;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  setTimeout(() => document.getElementById("hi-person-f-name")?.focus(), 60);
}

function hiClosePersonModal() {
  const m = document.getElementById("hi-person-modal");
  if (!m) return;
  m.classList.remove("open");
  m.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

async function hiSavePersonModal() {
  const modal = document.getElementById("hi-person-modal");
  const name  = (document.getElementById("hi-person-f-name")?.value ?? "").trim();
  const errEl = document.getElementById("hiPersonModalErr");
  if (!name) { errEl.textContent = "Name is required."; return; }
  errEl.textContent = "";

  const existing = modal._editId ? await hiGet("social", modal._editId) : null;
  await hiPut("social", {
    type:         "person",
    id:           modal._editId ?? hiGenId(),
    name,
    role:         (document.getElementById("hi-person-f-role")?.value         ?? "").trim(),
    phone:        (document.getElementById("hi-person-f-phone")?.value        ?? "").trim(),
    whatsapp:     (document.getElementById("hi-person-f-whatsapp")?.value     ?? "").trim(),
    birthday:     (document.getElementById("hi-person-f-birthday")?.value     ?? ""),
    relationship: (document.getElementById("hi-person-f-relationship")?.value ?? ""),
    note:         (document.getElementById("hi-person-f-note")?.value         ?? "").trim(),
    createdAt:    existing?.createdAt ?? Date.now(),
    updatedAt:    Date.now(),
  });
  hiRenderPeople();
  hiRenderUpcoming();
  hiClosePersonModal();
}

/* ── EVENTS ── */

async function hiLoadEvents() {
  const all = await hiGetAll("social");
  return all.filter(r => r.type === "event").sort((a, b) => a.date.localeCompare(b.date));
}

const TAG_COLORS = { Meeting: "#046A38", Birthday: "#FF671F", Deadline: "#dc2626", Community: "#000080", Gathering: "#6B21A8", Other: "#555" };

async function hiRenderEvents() {
  const list = document.getElementById("hi-events-list");
  if (!list) return;

  const events  = await hiLoadEvents();
  const today   = hiTodayDate();
  const future  = events.filter(e => e.date >= today);
  const past    = events.filter(e => e.date <  today);
  const display = [...future, ...past.slice(0, 3)];

  if (!display.length) {
    list.innerHTML = '<p class="hi-empty">No events yet. Add meetings, birthdays, and gatherings.</p>';
    return;
  }

  list.innerHTML = display.map(e => {
    const days  = hiDaysFromNow(e.date);
    const color = TAG_COLORS[e.eventType] ?? "#555";
    const dateObj = new Date(e.date);
    return `<div class="hi-event-row${days < 0 ? " past" : ""}">` +
      `<div class="hi-event-date-block" style="border-color:${color}">` +
        `<span class="hi-event-day">${dateObj.getDate()}</span>` +
        `<span class="hi-event-month">${dateObj.toLocaleString("en-IN", { month: "short" })}</span>` +
      `</div>` +
      `<div class="hi-event-info">` +
        `<span class="hi-event-title">${hiEsc(e.title)}</span>` +
        `<span class="hi-event-meta">` +
          `<span class="hi-event-tag" style="color:${color}">${hiEsc(e.eventType ?? "Event")}</span>` +
          (e.time ? ` &middot; ${hiEsc(e.time)}` : '') +
          (e.note ? ` &middot; ${hiEsc(e.note.slice(0, 60))}` : '') +
        `</span>` +
      `</div>` +
      `<div class="hi-goal-btns">` +
        `<button type="button" class="hi-icon-btn hi-event-edit" data-id="${hiEsc(e.id)}" aria-label="Edit">✏️</button>` +
        `<button type="button" class="hi-icon-btn hi-event-del"  data-id="${hiEsc(e.id)}" aria-label="Delete">✕</button>` +
      `</div>` +
    `</div>`;
  }).join("");

  list.querySelectorAll(".hi-event-edit").forEach(btn => {
    btn.addEventListener("click", async () => {
      const ev = await hiGet("social", btn.dataset.id);
      if (ev) hiOpenEventModal(ev);
    });
  });
  list.querySelectorAll(".hi-event-del").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this event?")) return;
      await hiDelete("social", btn.dataset.id);
      hiRenderEvents();
      hiRenderUpcoming();
    });
  });
}

function hiOpenEventModal(ev) {
  const modal = document.getElementById("hi-event-modal");
  if (!modal) return;
  document.getElementById("hiEventModalTitle").textContent  = ev ? "Edit Event" : "Add Event";
  document.getElementById("hi-event-f-title").value        = ev?.title     ?? "";
  document.getElementById("hi-event-f-date").value         = ev?.date      ?? hiTodayDate();
  document.getElementById("hi-event-f-time").value         = ev?.time      ?? "";
  document.getElementById("hi-event-f-type").value         = ev?.eventType ?? "Meeting";
  document.getElementById("hi-event-f-note").value         = ev?.note      ?? "";
  document.getElementById("hiEventModalErr").textContent   = "";
  modal._editId = ev?.id ?? null;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  setTimeout(() => document.getElementById("hi-event-f-title")?.focus(), 60);
}

function hiCloseEventModal() {
  const m = document.getElementById("hi-event-modal");
  if (!m) return;
  m.classList.remove("open");
  m.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

async function hiSaveEventModal() {
  const modal = document.getElementById("hi-event-modal");
  const title = (document.getElementById("hi-event-f-title")?.value ?? "").trim();
  const date  = document.getElementById("hi-event-f-date")?.value ?? "";
  const errEl = document.getElementById("hiEventModalErr");
  if (!title || !date) { errEl.textContent = "Title and date are required."; return; }
  errEl.textContent = "";

  const existing = modal._editId ? await hiGet("social", modal._editId) : null;
  await hiPut("social", {
    type:      "event",
    id:        modal._editId ?? hiGenId(),
    title,
    date,
    time:      (document.getElementById("hi-event-f-time")?.value ?? "").trim(),
    eventType: document.getElementById("hi-event-f-type")?.value ?? "Meeting",
    note:      (document.getElementById("hi-event-f-note")?.value ?? "").trim(),
    createdAt: existing?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  });
  hiRenderEvents();
  hiRenderUpcoming();
  hiCloseEventModal();
}

/* ── INIT ── */

document.addEventListener("DOMContentLoaded", () => {
  hiEnsureSocialSeedData().then(() => {
    hiRenderUpcoming();
    hiRenderPeople();
    hiRenderEvents();
  });

  document.getElementById("hiAddPersonBtn")?.addEventListener("click", () => hiOpenPersonModal(null));
  document.getElementById("hiAddEventBtn")?.addEventListener("click",  () => hiOpenEventModal(null));

  function bindModal(saveId, cancelId, closeId, overlayId, saveFn, closeFn) {
    document.getElementById(saveId)?.addEventListener("click", saveFn);
    document.getElementById(cancelId)?.addEventListener("click", closeFn);
    document.getElementById(closeId)?.addEventListener("click", closeFn);
    const o = document.getElementById(overlayId);
    o?.addEventListener("click", e => { if (e.target === o) closeFn(); });
  }
  bindModal("hiPersonModalSave", "hiPersonModalCancel", "hiPersonModalClose", "hi-person-modal", hiSavePersonModal, hiClosePersonModal);
  bindModal("hiEventModalSave",  "hiEventModalCancel",  "hiEventModalClose",  "hi-event-modal",  hiSaveEventModal,  hiCloseEventModal);

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { hiClosePersonModal(); hiCloseEventModal(); }
  });
}, { once: true });
