"use strict";

/* ======================================================
   hi-social.js — Social Life Manager  (Phase 4)
   People · Events · Follow-ups · Upcoming 7 Days
   Depends on: hi-storage.js
====================================================== */

var HI_RELATIONSHIP_TYPES = ["Family","Friend","Colleague","Mentor","Community","Contact","Partner"];
var HI_EVENT_TYPES = ["Meeting","Birthday","Gathering","Deadline","Community","Other"];

/* ── Helpers ── */

function hiDaysFromNow(dateStr) {
  if (!dateStr) return Infinity;
  var today = new Date(); today.setHours(0,0,0,0);
  var d = new Date(dateStr); d.setHours(0,0,0,0);
  return Math.round((d - today) / 86400000);
}

function hiShortDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });
}

function hiNextBirthday(bdayStr) {
  if (!bdayStr) return null;
  var parts = bdayStr.split("-");
  if (parts.length < 2) return null;
  var today = new Date(); today.setHours(0,0,0,0);
  var year = today.getFullYear();
  var next = new Date(year + "-" + parts[1] + "-" + parts[2]);
  next.setHours(0,0,0,0);
  if (next < today) next = new Date((year + 1) + "-" + parts[1] + "-" + parts[2]);
  return next.toISOString().slice(0,10);
}

/* ── UPCOMING (next 14 days) ── */

async function hiRenderUpcoming() {
  var el = document.getElementById("hi-upcoming-list");
  if (!el) return;

  var all    = await hiGetAll("social");
  var events = all.filter(function(r) { return r.type === "event"; });
  var people = all.filter(function(r) { return r.type === "person" && r.birthday; });
  var items  = [];

  events.forEach(function(e) {
    var d = hiDaysFromNow(e.date);
    if (d >= 0 && d <= 14) items.push({ label: e.title, date: e.date, days: d, tag: e.eventType || "Event", color: "#046A38" });
  });

  people.forEach(function(p) {
    var bd = hiNextBirthday(p.birthday);
    if (!bd) return;
    var d = hiDaysFromNow(bd);
    if (d >= 0 && d <= 14) items.push({ label: "🎂 " + p.name + "'s Birthday", date: bd, days: d, tag: "Birthday", color: "#FF671F" });
  });

  items.sort(function(a, b) { return a.days - b.days; });

  if (!items.length) {
    el.innerHTML = '<p class="hi-empty">No events in the next 14 days.</p>';
    return;
  }

  el.innerHTML = items.map(function(item) {
    var dayLabel = item.days === 0 ? "<strong style='color:var(--brand-green)'>Today</strong>"
      : item.days === 1 ? "<strong>Tomorrow</strong>"
      : "in " + item.days + " days";
    return '<div class="hi-upcoming-row">' +
      '<div class="hi-upcoming-dot" style="background:' + item.color + '"></div>' +
      '<div class="hi-upcoming-info">' +
        '<span class="hi-upcoming-title">' + hiEsc(item.label) + '</span>' +
        '<span class="hi-upcoming-meta">' + hiEsc(hiShortDate(item.date)) + ' &middot; ' + dayLabel + '</span>' +
      '</div>' +
      '<span class="hi-upcoming-tag" style="border-color:' + item.color + ';color:' + item.color + '">' + hiEsc(item.tag) + '</span>' +
    '</div>';
  }).join("");
}

/* ── PEOPLE ── */

async function hiLoadPeople() {
  var all = await hiGetAll("social");
  return all.filter(function(r) { return r.type === "person"; })
            .sort(function(a, b) { return a.name.localeCompare(b.name); });
}

async function hiRenderPeople() {
  var grid = document.getElementById("hi-people-grid");
  if (!grid) return;
  var people = await hiLoadPeople();

  if (!people.length) {
    grid.innerHTML = '<p class="hi-empty">No contacts yet. Add the people who matter.</p>';
    return;
  }

  grid.innerHTML = people.map(function(p) {
    var initials = p.name.split(" ").map(function(w) { return w[0]||""; }).join("").slice(0,2).toUpperCase();
    var bd = p.birthday ? hiNextBirthday(p.birthday) : null;
    var bdDays = bd ? hiDaysFromNow(bd) : null;
    var bdBadge = (bdDays !== null && bdDays <= 7)
      ? '<span class="hi-bday-badge">🎂 ' + (bdDays === 0 ? "Today!" : "in " + bdDays + " days") + '</span>'
      : "";
    return '<div class="hi-person-card glass">' +
      '<div class="hi-person-top">' +
        '<div class="hi-person-avatar">' + initials + '</div>' +
        '<div class="hi-person-info">' +
          '<span class="hi-person-name">' + hiEsc(p.name) + '</span>' +
          '<span class="hi-person-role">' + hiEsc(p.role || "") + '</span>' +
          (p.relationship ? '<span class="hi-person-rel">' + hiEsc(p.relationship) + '</span>' : '') +
        '</div>' +
        '<div class="hi-goal-btns">' +
          '<button type="button" class="hi-icon-btn hi-person-edit" data-id="' + hiEsc(p.id) + '">&#x270F;&#xFE0F;</button>' +
          '<button type="button" class="hi-icon-btn hi-person-del"  data-id="' + hiEsc(p.id) + '">&#x2715;</button>' +
        '</div>' +
      '</div>' +
      bdBadge +
      (p.note ? '<p class="hi-person-note">' + hiEsc(p.note) + '</p>' : '') +
      '<div class="hi-person-actions">' +
        (p.phone    ? '<a class="hi-contact-btn" href="tel:' + hiEsc(p.phone) + '">&#x1F4DE; Call</a>' : '') +
        (p.whatsapp ? '<a class="hi-contact-btn hi-wa-btn" href="https://wa.me/' + p.whatsapp.replace(/\D/g,"") + '" target="_blank" rel="noopener">&#x1F4AC; WhatsApp</a>' : '') +
      '</div>' +
    '</div>';
  }).join("");

  grid.querySelectorAll(".hi-person-edit").forEach(function(btn) {
    btn.addEventListener("click", async function() {
      var p = await hiGet("social", btn.dataset.id);
      if (p) hiOpenPersonModal(p);
    });
  });

  grid.querySelectorAll(".hi-person-del").forEach(function(btn) {
    btn.addEventListener("click", async function() {
      if (!confirm("Remove this contact?")) return;
      await hiDelete("social", btn.dataset.id);
      hiRenderPeople();
      hiRenderUpcoming();
    });
  });
}

function hiOpenPersonModal(person) {
  var modal = document.getElementById("hi-person-modal");
  if (!modal) return;
  var isNew = !person;
  document.getElementById("hiPersonModalTitle").textContent = isNew ? "Add Contact" : "Edit Contact";
  document.getElementById("hi-person-f-name").value         = person ? (person.name         || "") : "";
  document.getElementById("hi-person-f-role").value         = person ? (person.role         || "") : "";
  document.getElementById("hi-person-f-phone").value        = person ? (person.phone        || "") : "";
  document.getElementById("hi-person-f-whatsapp").value     = person ? (person.whatsapp     || "") : "";
  document.getElementById("hi-person-f-birthday").value     = person ? (person.birthday     || "") : "";
  document.getElementById("hi-person-f-relationship").value = person ? (person.relationship || "") : "";
  document.getElementById("hi-person-f-note").value         = person ? (person.note         || "") : "";
  document.getElementById("hiPersonModalErr").textContent   = "";
  modal._editId = person ? person.id : null;
  modal.classList.add("open"); modal.setAttribute("aria-hidden","false");
  document.body.style.overflow = "hidden";
  setTimeout(function() { document.getElementById("hi-person-f-name").focus(); }, 60);
}

function hiClosePersonModal() {
  var m = document.getElementById("hi-person-modal");
  if (m) { m.classList.remove("open"); m.setAttribute("aria-hidden","true"); document.body.style.overflow=""; }
}

async function hiSavePersonModal() {
  var modal  = document.getElementById("hi-person-modal");
  var name   = (document.getElementById("hi-person-f-name").value         || "").trim();
  var errEl  = document.getElementById("hiPersonModalErr");
  if (!name) { errEl.textContent = "Name is required."; return; }
  errEl.textContent = "";
  var data = {
    type: "person",
    id:           modal._editId || hiGenId(),
    name:         name,
    role:         (document.getElementById("hi-person-f-role").value         || "").trim(),
    phone:        (document.getElementById("hi-person-f-phone").value        || "").trim(),
    whatsapp:     (document.getElementById("hi-person-f-whatsapp").value     || "").trim(),
    birthday:     (document.getElementById("hi-person-f-birthday").value     || ""),
    relationship: (document.getElementById("hi-person-f-relationship").value || ""),
    note:         (document.getElementById("hi-person-f-note").value         || "").trim(),
    updatedAt:    Date.now()
  };
  var existing = modal._editId ? await hiGet("social", modal._editId) : null;
  if (!modal._editId) data.createdAt = Date.now();
  else if (existing)  data.createdAt = existing.createdAt;
  await hiPut("social", data);
  hiRenderPeople();
  hiRenderUpcoming();
  hiClosePersonModal();
}

/* ── EVENTS ── */

async function hiLoadEvents() {
  var all = await hiGetAll("social");
  return all.filter(function(r) { return r.type === "event"; })
            .sort(function(a, b) { return a.date.localeCompare(b.date); });
}

async function hiRenderEvents() {
  var list = document.getElementById("hi-events-list");
  if (!list) return;
  var events  = await hiLoadEvents();
  var today   = hiTodayDate();
  var future  = events.filter(function(e) { return e.date >= today; });
  var past    = events.filter(function(e) { return e.date < today; });
  var display = future.concat(past.slice(0, 3));

  if (!display.length) {
    list.innerHTML = '<p class="hi-empty">No events yet. Add meetings, birthdays, and gatherings.</p>';
    return;
  }

  list.innerHTML = display.map(function(e) {
    var days = hiDaysFromNow(e.date);
    var isPast = days < 0;
    var tagColors = { Meeting:"#046A38", Birthday:"#FF671F", Deadline:"#dc2626", Community:"#000080", Gathering:"#6B21A8", Other:"#555" };
    var color = tagColors[e.eventType] || "#555";
    return '<div class="hi-event-row' + (isPast ? " past" : "") + '">' +
      '<div class="hi-event-date-block" style="border-color:' + color + '">' +
        '<span class="hi-event-day">'   + new Date(e.date).getDate() + '</span>' +
        '<span class="hi-event-month">' + new Date(e.date).toLocaleString("en-IN",{month:"short"}) + '</span>' +
      '</div>' +
      '<div class="hi-event-info">' +
        '<span class="hi-event-title">' + hiEsc(e.title) + '</span>' +
        '<span class="hi-event-meta">' +
          '<span class="hi-event-tag" style="color:' + color + '">' + hiEsc(e.eventType||"Event") + '</span>' +
          (e.time ? ' &middot; ' + hiEsc(e.time) : '') +
          (e.note ? ' &middot; ' + hiEsc(e.note.slice(0,60)) : '') +
        '</span>' +
      '</div>' +
      '<div class="hi-goal-btns">' +
        '<button type="button" class="hi-icon-btn hi-event-edit" data-id="' + hiEsc(e.id) + '">&#x270F;&#xFE0F;</button>' +
        '<button type="button" class="hi-icon-btn hi-event-del"  data-id="' + hiEsc(e.id) + '">&#x2715;</button>' +
      '</div>' +
    '</div>';
  }).join("");

  list.querySelectorAll(".hi-event-edit").forEach(function(btn) {
    btn.addEventListener("click", async function() {
      var ev = await hiGet("social", btn.dataset.id); if (ev) hiOpenEventModal(ev);
    });
  });
  list.querySelectorAll(".hi-event-del").forEach(function(btn) {
    btn.addEventListener("click", async function() {
      if (!confirm("Delete this event?")) return;
      await hiDelete("social", btn.dataset.id);
      hiRenderEvents(); hiRenderUpcoming();
    });
  });
}

function hiOpenEventModal(ev) {
  var modal = document.getElementById("hi-event-modal");
  if (!modal) return;
  document.getElementById("hiEventModalTitle").textContent  = ev ? "Edit Event" : "Add Event";
  document.getElementById("hi-event-f-title").value        = ev ? (ev.title     ||"") : "";
  document.getElementById("hi-event-f-date").value         = ev ? (ev.date      ||"") : hiTodayDate();
  document.getElementById("hi-event-f-time").value         = ev ? (ev.time      ||"") : "";
  document.getElementById("hi-event-f-type").value         = ev ? (ev.eventType ||"Meeting") : "Meeting";
  document.getElementById("hi-event-f-note").value         = ev ? (ev.note      ||"") : "";
  document.getElementById("hiEventModalErr").textContent   = "";
  modal._editId = ev ? ev.id : null;
  modal.classList.add("open"); modal.setAttribute("aria-hidden","false");
  document.body.style.overflow="hidden";
  setTimeout(function() { document.getElementById("hi-event-f-title").focus(); }, 60);
}

function hiCloseEventModal() {
  var m = document.getElementById("hi-event-modal");
  if (m) { m.classList.remove("open"); m.setAttribute("aria-hidden","true"); document.body.style.overflow=""; }
}

async function hiSaveEventModal() {
  var modal  = document.getElementById("hi-event-modal");
  var title  = (document.getElementById("hi-event-f-title").value || "").trim();
  var date   = document.getElementById("hi-event-f-date").value;
  var errEl  = document.getElementById("hiEventModalErr");
  if (!title || !date) { errEl.textContent = "Title and date are required."; return; }
  errEl.textContent = "";
  var existing = modal._editId ? await hiGet("social", modal._editId) : null;
  await hiPut("social", {
    type: "event", id: modal._editId || hiGenId(),
    title: title, date: date,
    time:      (document.getElementById("hi-event-f-time").value || "").trim(),
    eventType: document.getElementById("hi-event-f-type").value || "Meeting",
    note:      (document.getElementById("hi-event-f-note").value || "").trim(),
    createdAt: existing ? existing.createdAt : Date.now(),
    updatedAt: Date.now()
  });
  hiRenderEvents(); hiRenderUpcoming(); hiCloseEventModal();
}

/* ── INIT ── */

document.addEventListener("DOMContentLoaded", function() {
  hiRenderUpcoming();
  hiRenderPeople();
  hiRenderEvents();

  var addPersonBtn = document.getElementById("hiAddPersonBtn");
  if (addPersonBtn) addPersonBtn.addEventListener("click", function() { hiOpenPersonModal(null); });

  var addEventBtn = document.getElementById("hiAddEventBtn");
  if (addEventBtn) addEventBtn.addEventListener("click", function() { hiOpenEventModal(null); });

  function bindModal(saveId, cancelId, closeId, overlayId, saveFn, closeFn) {
    var s = document.getElementById(saveId);
    var c = document.getElementById(cancelId);
    var x = document.getElementById(closeId);
    var o = document.getElementById(overlayId);
    if (s) s.addEventListener("click", saveFn);
    if (c) c.addEventListener("click", closeFn);
    if (x) x.addEventListener("click", closeFn);
    if (o) o.addEventListener("click", function(e) { if (e.target===o) closeFn(); });
  }
  bindModal("hiPersonModalSave","hiPersonModalCancel","hiPersonModalClose","hi-person-modal", hiSavePersonModal, hiClosePersonModal);
  bindModal("hiEventModalSave", "hiEventModalCancel", "hiEventModalClose", "hi-event-modal",  hiSaveEventModal,  hiCloseEventModal);

  document.addEventListener("keydown", function(e) {
    if (e.key==="Escape") { hiClosePersonModal(); hiCloseEventModal(); }
  });
});
