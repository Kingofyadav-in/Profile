"use strict";

/* ======================================================
   hi-personal.js — Personal Life Manager  (Phase 2)
   Habits · Goals · Notes
   Depends on: hi-storage.js
====================================================== */

var HI_DEFAULT_HABITS = [
  { id: "sleep",      name: "Sleep 8h",   icon: "💤" },
  { id: "exercise",   name: "Exercise",   icon: "🏃" },
  { id: "reading",    name: "Reading",    icon: "📚" },
  { id: "meditation", name: "Meditation", icon: "🧘" }
];

/* ── Habits ── */

async function hiLoadHabitsConfig() {
  var cfg = await hiGet("personal", "habits-config");
  if (!cfg) {
    cfg = { id: "habits-config", habits: HI_DEFAULT_HABITS };
    await hiPut("personal", cfg);
  }
  return cfg.habits;
}

async function hiLoadHabitsToday() {
  return await hiGet("personal", "habits-" + hiTodayDate());
}

async function hiToggleHabit(habitId) {
  var key    = "habits-" + hiTodayDate();
  var record = (await hiGet("personal", key)) || { id: key, date: hiTodayDate(), checks: {} };
  record.checks        = record.checks || {};
  record.checks[habitId] = !record.checks[habitId];
  await hiPut("personal", record);
}

async function hiRenderHabits() {
  var grid = document.getElementById("hi-habits-grid");
  if (!grid) return;

  var habits = await hiLoadHabitsConfig();
  var today  = await hiLoadHabitsToday();
  var checks = today ? (today.checks || {}) : {};

  grid.innerHTML = habits.map(function(h) {
    var done = !!checks[h.id];
    return '<button type="button" class="hi-habit-btn' + (done ? " done" : "") + '" data-id="' + hiEsc(h.id) + '" aria-pressed="' + done + '">' +
      '<span class="hi-habit-icon">' + h.icon + '</span>' +
      '<span class="hi-habit-name">' + hiEsc(h.name) + '</span>' +
      (done ? '<span class="hi-habit-check">&#x2713;</span>' : '') +
    '</button>';
  }).join("");

  grid.querySelectorAll(".hi-habit-btn").forEach(function(btn) {
    btn.addEventListener("click", async function() {
      await hiToggleHabit(btn.dataset.id);
      hiRenderHabits();
    });
  });
}

/* ── Goals ── */

async function hiLoadGoals() {
  var all = await hiGetAll("personal");
  return all
    .filter(function(r) { return r.type === "goal"; })
    .sort(function(a, b) { return b.createdAt - a.createdAt; });
}

async function hiSaveGoal(data) {
  var item = Object.assign({}, data, { type: "goal", updatedAt: Date.now() });
  if (!item.id)        { item.id = hiGenId(); }
  if (!item.createdAt) { item.createdAt = Date.now(); }
  await hiPut("personal", item);
  if (typeof hiAutoClaimRecord === "function") {
    await hiAutoClaimRecord("personal", item, {
      contentType: "Goal",
      content: [item.title, item.note, item.deadline ? "Deadline: " + item.deadline : "", "Progress: " + (item.progress || 0) + "%"].filter(Boolean).join("\n")
    });
  }
  return item;
}

async function hiRenderGoals() {
  var list = document.getElementById("hi-goals-list");
  if (!list) return;

  var goals = await hiLoadGoals();

  if (!goals.length) {
    list.innerHTML = '<p class="hi-empty">No goals yet. Click &ldquo;+ Add Goal&rdquo; to start.</p>';
    return;
  }

  list.innerHTML = goals.map(function(g) {
    var pct = Math.min(100, Math.max(0, parseInt(g.progress || 0, 10)));
    return '<div class="hi-goal-card glass">' +
      '<div class="hi-goal-top">' +
        '<span class="hi-goal-title">' + hiEsc(g.title) + '</span>' +
        '<div class="hi-goal-btns">' +
          '<button type="button" class="hi-icon-btn hi-goal-edit-btn" data-id="' + hiEsc(g.id) + '" aria-label="Edit">&#x270F;&#xFE0F;</button>' +
          '<button type="button" class="hi-icon-btn hi-goal-del-btn"  data-id="' + hiEsc(g.id) + '" aria-label="Delete">&#x2715;</button>' +
        '</div>' +
      '</div>' +
      (g.note ? '<p class="hi-goal-note">' + hiEsc(g.note) + '</p>' : '') +
      '<div class="hi-progress-bar"><div class="hi-progress-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="hi-goal-footer">' +
        '<span class="hi-goal-pct">' + pct + '%</span>' +
        (g.deadline ? '<span class="hi-goal-deadline">&#x1F4C5; ' + hiEsc(g.deadline) + '</span>' : '') +
      '</div>' +
    '</div>';
  }).join("");

  list.querySelectorAll(".hi-goal-edit-btn").forEach(function(btn) {
    btn.addEventListener("click", async function() {
      var goal = await hiGet("personal", btn.dataset.id);
      if (goal) hiOpenGoalModal(goal);
    });
  });

  list.querySelectorAll(".hi-goal-del-btn").forEach(function(btn) {
    btn.addEventListener("click", async function() {
      if (!confirm("Delete this goal?")) return;
      await hiDelete("personal", btn.dataset.id);
      hiRenderGoals();
    });
  });
}

function hiOpenGoalModal(goal) {
  var modal = document.getElementById("hi-goal-modal");
  if (!modal) return;
  var isNew = !goal;
  document.getElementById("hiGoalModalTitle").textContent = isNew ? "Add Goal" : "Edit Goal";
  document.getElementById("hi-goal-f-title").value    = goal ? (goal.title    || "")  : "";
  document.getElementById("hi-goal-f-note").value     = goal ? (goal.note     || "")  : "";
  document.getElementById("hi-goal-f-progress").value = goal ? (goal.progress || 0)   : 0;
  document.getElementById("hi-goal-f-deadline").value = goal ? (goal.deadline || "")  : "";
  var lbl = document.getElementById("hiGoalProgressVal");
  if (lbl) lbl.textContent = (goal ? goal.progress || 0 : 0) + "%";
  document.getElementById("hiGoalModalErr").textContent = "";
  modal._editId = goal ? goal.id : null;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  setTimeout(function() { document.getElementById("hi-goal-f-title").focus(); }, 60);
}

function hiCloseGoalModal() {
  var modal = document.getElementById("hi-goal-modal");
  if (modal) {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
}

async function hiSaveGoalModal() {
  var modal    = document.getElementById("hi-goal-modal");
  var title    = (document.getElementById("hi-goal-f-title").value    || "").trim();
  var note     = (document.getElementById("hi-goal-f-note").value     || "").trim();
  var progress = parseInt(document.getElementById("hi-goal-f-progress").value || "0", 10);
  var deadline = (document.getElementById("hi-goal-f-deadline").value || "").trim();
  var errEl    = document.getElementById("hiGoalModalErr");
  if (!title) { errEl.textContent = "Goal title is required."; return; }
  errEl.textContent = "";
  var data = { title: title, note: note, progress: progress, deadline: deadline };
  if (modal && modal._editId) data.id = modal._editId;
  await hiSaveGoal(data);
  hiRenderGoals();
  hiCloseGoalModal();
}

/* ── Notes ── */

async function hiLoadNotes() {
  var all = await hiGetAll("personal");
  return all
    .filter(function(r) { return r.type === "note"; })
    .sort(function(a, b) { return b.updatedAt - a.updatedAt; });
}

async function hiSaveNote(data) {
  var item = Object.assign({}, data, { type: "note", updatedAt: Date.now() });
  if (!item.id)        { item.id = hiGenId(); }
  if (!item.createdAt) { item.createdAt = Date.now(); }
  await hiPut("personal", item);
  if (typeof hiAutoClaimRecord === "function") {
    await hiAutoClaimRecord("personal", item, {
      contentType: "Note",
      title: item.title || "Private Note",
      content: item.body || item.title || "Private Note"
    });
  }
  return item;
}

async function hiRenderNotes() {
  var list = document.getElementById("hi-notes-list");
  if (!list) return;

  var notes = await hiLoadNotes();

  if (!notes.length) {
    list.innerHTML = '<p class="hi-empty">No notes yet. Capture your first thought.</p>';
    return;
  }

  list.innerHTML = notes.map(function(n) {
    var d = new Date(n.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    return '<div class="hi-note-card glass">' +
      '<div class="hi-note-top">' +
        '<span class="hi-note-date">' + hiEsc(d) + '</span>' +
        '<div class="hi-goal-btns">' +
          '<button type="button" class="hi-icon-btn hi-note-edit-btn" data-id="' + hiEsc(n.id) + '" aria-label="Edit">&#x270F;&#xFE0F;</button>' +
          '<button type="button" class="hi-icon-btn hi-note-del-btn"  data-id="' + hiEsc(n.id) + '" aria-label="Delete">&#x2715;</button>' +
        '</div>' +
      '</div>' +
      (n.title ? '<h4 class="hi-note-title">' + hiEsc(n.title) + '</h4>' : '') +
      '<p class="hi-note-body">' + hiEsc((n.body || "").slice(0, 220)) + ((n.body || "").length > 220 ? "…" : "") + '</p>' +
    '</div>';
  }).join("");

  list.querySelectorAll(".hi-note-edit-btn").forEach(function(btn) {
    btn.addEventListener("click", async function() {
      var note = await hiGet("personal", btn.dataset.id);
      if (note) hiOpenNoteModal(note);
    });
  });

  list.querySelectorAll(".hi-note-del-btn").forEach(function(btn) {
    btn.addEventListener("click", async function() {
      if (!confirm("Delete this note?")) return;
      await hiDelete("personal", btn.dataset.id);
      hiRenderNotes();
    });
  });
}

function hiOpenNoteModal(note) {
  var modal = document.getElementById("hi-note-modal");
  if (!modal) return;
  document.getElementById("hiNoteModalTitle").textContent = note ? "Edit Note" : "Quick Note";
  document.getElementById("hi-note-f-title").value = note ? (note.title || "") : "";
  document.getElementById("hi-note-f-body").value  = note ? (note.body  || "") : "";
  document.getElementById("hiNoteModalErr").textContent = "";
  modal._editId = note ? note.id : null;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  setTimeout(function() { document.getElementById("hi-note-f-body").focus(); }, 60);
}

function hiCloseNoteModal() {
  var modal = document.getElementById("hi-note-modal");
  if (modal) {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
}

async function hiSaveNoteModal() {
  var modal = document.getElementById("hi-note-modal");
  var title = (document.getElementById("hi-note-f-title").value || "").trim();
  var body  = (document.getElementById("hi-note-f-body").value  || "").trim();
  var errEl = document.getElementById("hiNoteModalErr");
  if (!body) { errEl.textContent = "Write something first."; return; }
  errEl.textContent = "";
  var data = { title: title, body: body };
  if (modal && modal._editId) data.id = modal._editId;
  await hiSaveNote(data);
  hiRenderNotes();
  hiCloseNoteModal();
}

/* ── INIT ── */

document.addEventListener("DOMContentLoaded", function() {
  hiRenderHabits();
  hiRenderGoals();
  hiRenderNotes();

  /* Add buttons */
  var addGoalBtn = document.getElementById("hiAddGoalBtn");
  if (addGoalBtn) addGoalBtn.addEventListener("click", function() { hiOpenGoalModal(null); });

  var addNoteBtn = document.getElementById("hiAddNoteBtn");
  if (addNoteBtn) addNoteBtn.addEventListener("click", function() { hiOpenNoteModal(null); });

  /* Goal modal */
  var gSave    = document.getElementById("hiGoalModalSave");
  var gCancel  = document.getElementById("hiGoalModalCancel");
  var gClose   = document.getElementById("hiGoalModalClose");
  var gOverlay = document.getElementById("hi-goal-modal");
  if (gSave)   gSave.addEventListener("click", hiSaveGoalModal);
  if (gCancel) gCancel.addEventListener("click", hiCloseGoalModal);
  if (gClose)  gClose.addEventListener("click", hiCloseGoalModal);
  if (gOverlay) gOverlay.addEventListener("click", function(e) { if (e.target === gOverlay) hiCloseGoalModal(); });

  /* Progress range live label */
  var pr = document.getElementById("hi-goal-f-progress");
  if (pr) pr.addEventListener("input", function() {
    var lbl = document.getElementById("hiGoalProgressVal");
    if (lbl) lbl.textContent = pr.value + "%";
  });

  /* Note modal */
  var nSave    = document.getElementById("hiNoteModalSave");
  var nCancel  = document.getElementById("hiNoteModalCancel");
  var nClose   = document.getElementById("hiNoteModalClose");
  var nOverlay = document.getElementById("hi-note-modal");
  if (nSave)    nSave.addEventListener("click", hiSaveNoteModal);
  if (nCancel)  nCancel.addEventListener("click", hiCloseNoteModal);
  if (nClose)   nClose.addEventListener("click", hiCloseNoteModal);
  if (nOverlay) nOverlay.addEventListener("click", function(e) { if (e.target === nOverlay) hiCloseNoteModal(); });

  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") { hiCloseGoalModal(); hiCloseNoteModal(); }
  });
});
