"use strict";

/* ======================================================
   hi-personal.js — Personal Life Manager  (Phase 2)
   Habits · Goals · Notes
   Depends on: hi-storage.js
====================================================== */

const HI_DEFAULT_HABITS = [
  { id: "planning", name: "Plan the day",      icon: "🧭" },
  { id: "health",   name: "Health discipline", icon: "💪" },
  { id: "reading",  name: "Read & research",   icon: "📚" },
  { id: "outreach", name: "People follow-up",  icon: "🤝" },
  { id: "review",   name: "Night review",      icon: "✅" },
];

const HI_DEFAULT_GOALS = [
  {
    id:       "goal-digital-world",
    title:    "Make HI Life OS a complete personal command center",
    note:     "Keep identity, tasks, people, wallet, vault, and AI context connected.",
    progress: 72,
    deadline: "2026-06-30",
  },
  {
    id:       "goal-public-credibility",
    title:    "Strengthen public credibility across kingofyadav.in",
    note:     "Publish clear proof of ventures, services, writing, and community work.",
    progress: 64,
    deadline: "2026-07-15",
  },
  {
    id:       "goal-community-network",
    title:    "Organize youth and community coordination",
    note:     "Track core people, meetings, follow-ups, and practical local initiatives.",
    progress: 48,
    deadline: "2026-08-01",
  },
];

const HI_DEFAULT_NOTES = [
  {
    id:    "note-operating-standard",
    title: "Operating Standard",
    body:  "Be clear, reachable, disciplined, and useful. The dashboard should turn identity, work, people, and decisions into one daily operating system.",
  },
  {
    id:    "note-public-work",
    title: "Public Work Direction",
    body:  "Focus on digital systems, business platforms, youth guidance, local relationships, and credible public communication. Every section should show work, not only claims.",
  },
  {
    id:    "note-ai-use",
    title: "AI Co-Pilot Rule",
    body:  "Use AI for review, structure, planning, and risk checks. Human judgment makes the final decision.",
  },
];

/* ── Habits ── */

async function hiLoadHabitsConfig() {
  let cfg = await hiGet("personal", "habits-config");
  if (!cfg) {
    cfg = { id: "habits-config", habits: HI_DEFAULT_HABITS };
    await hiPut("personal", cfg);
  }
  return cfg.habits;
}

const hiLoadHabitsToday = () => hiGet("personal", `habits-${hiTodayDate()}`);

async function hiToggleHabit(habitId) {
  const key    = `habits-${hiTodayDate()}`;
  const record = (await hiGet("personal", key)) ?? { id: key, date: hiTodayDate(), checks: {} };
  record.checks             = record.checks ?? {};
  record.checks[habitId]    = !record.checks[habitId];
  await hiPut("personal", record);
}

async function hiEnsurePersonalSeedData() {
  const all  = await hiGetAll("personal");
  const now  = Date.now();
  const hasGoal = all.some(r => r.type === "goal");
  const hasNote = all.some(r => r.type === "note");
  const hasMood = all.some(r => r.id   === `mood-${hiTodayDate()}`);

  if (!hasGoal) {
    for (let i = 0; i < HI_DEFAULT_GOALS.length; i++) {
      await hiPut("personal", Object.assign({}, HI_DEFAULT_GOALS[i], { type: "goal", seeded: true, createdAt: now + i, updatedAt: now + i }));
    }
  }

  if (!hasNote) {
    for (let i = 0; i < HI_DEFAULT_NOTES.length; i++) {
      await hiPut("personal", Object.assign({}, HI_DEFAULT_NOTES[i], { type: "note", seeded: true, createdAt: now + 100 + i, updatedAt: now + 100 + i }));
    }
  }

  if (!hasMood && typeof hiSaveMoodEnergy === "function") await hiSaveMoodEnergy(4, 4);
}

async function hiRenderHabits() {
  const grid = document.getElementById("hi-habits-grid");
  if (!grid) return;

  const habits = await hiLoadHabitsConfig();
  const today  = await hiLoadHabitsToday();
  const checks = today?.checks ?? {};

  grid.innerHTML = habits.map(h => {
    const done = !!checks[h.id];
    return `<button type="button" class="hi-habit-btn${done ? " done" : ""}" data-id="${hiEsc(h.id)}" aria-pressed="${done}">` +
      `<span class="hi-habit-icon">${h.icon}</span>` +
      `<span class="hi-habit-name">${hiEsc(h.name)}</span>` +
      (done ? '<span class="hi-habit-check">✓</span>' : '') +
    `</button>`;
  }).join("");

  grid.querySelectorAll(".hi-habit-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      await hiToggleHabit(btn.dataset.id);
      hiRenderHabits();
    });
  });
}

/* ── Goals ── */

async function hiLoadGoals() {
  const all = await hiGetAll("personal");
  return all.filter(r => r.type === "goal").sort((a, b) => b.createdAt - a.createdAt);
}

async function hiSaveGoal(data) {
  const item = Object.assign({}, data, { type: "goal", updatedAt: Date.now() });
  if (!item.id)        item.id        = hiGenId();
  if (!item.createdAt) item.createdAt = Date.now();
  await hiPut("personal", item);
  if (typeof hiAutoClaimRecord === "function") {
    await hiAutoClaimRecord("personal", item, {
      contentType: "Goal",
      content: [item.title, item.note, item.deadline ? `Deadline: ${item.deadline}` : "", `Progress: ${item.progress ?? 0}%`].filter(Boolean).join("\n"),
    });
  }
  return item;
}

async function hiRenderGoals() {
  const list = document.getElementById("hi-goals-list");
  if (!list) return;

  const goals = await hiLoadGoals();
  if (!goals.length) {
    list.innerHTML = '<p class="hi-empty">No goals yet. Click &ldquo;+ Add Goal&rdquo; to start.</p>';
    return;
  }

  list.innerHTML = goals.map(g => {
    const pct = Math.min(100, Math.max(0, parseInt(g.progress ?? 0, 10)));
    return `<div class="hi-goal-card glass">` +
      `<div class="hi-goal-top">` +
        `<span class="hi-goal-title">${hiEsc(g.title)}</span>` +
        `<div class="hi-goal-btns">` +
          `<button type="button" class="hi-icon-btn hi-goal-edit-btn" data-id="${hiEsc(g.id)}" aria-label="Edit">✏️</button>` +
          `<button type="button" class="hi-icon-btn hi-goal-del-btn"  data-id="${hiEsc(g.id)}" aria-label="Delete">✕</button>` +
        `</div>` +
      `</div>` +
      (g.note ? `<p class="hi-goal-note">${hiEsc(g.note)}</p>` : '') +
      `<div class="hi-progress-bar"><div class="hi-progress-fill" style="width:${pct}%"></div></div>` +
      `<div class="hi-goal-footer">` +
        `<span class="hi-goal-pct">${pct}%</span>` +
        (g.deadline ? `<span class="hi-goal-deadline">📅 ${hiEsc(g.deadline)}</span>` : '') +
      `</div>` +
    `</div>`;
  }).join("");

  list.querySelectorAll(".hi-goal-edit-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const goal = await hiGet("personal", btn.dataset.id);
      if (goal) hiOpenGoalModal(goal);
    });
  });

  list.querySelectorAll(".hi-goal-del-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this goal?")) return;
      await hiDelete("personal", btn.dataset.id);
      hiRenderGoals();
    });
  });
}

function hiOpenGoalModal(goal) {
  const modal = document.getElementById("hi-goal-modal");
  if (!modal) return;
  const isNew = !goal;
  document.getElementById("hiGoalModalTitle").textContent      = isNew ? "Add Goal" : "Edit Goal";
  document.getElementById("hi-goal-f-title").value             = goal?.title    ?? "";
  document.getElementById("hi-goal-f-note").value              = goal?.note     ?? "";
  document.getElementById("hi-goal-f-progress").value          = goal?.progress ?? 0;
  document.getElementById("hi-goal-f-deadline").value          = goal?.deadline ?? "";
  const lbl = document.getElementById("hiGoalProgressVal");
  if (lbl) lbl.textContent = `${goal?.progress ?? 0}%`;
  document.getElementById("hiGoalModalErr").textContent = "";
  modal._editId = goal?.id ?? null;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  setTimeout(() => document.getElementById("hi-goal-f-title")?.focus(), 60);
}

function hiCloseGoalModal() {
  const modal = document.getElementById("hi-goal-modal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

async function hiSaveGoalModal() {
  const modal      = document.getElementById("hi-goal-modal");
  const titleEl    = document.getElementById("hi-goal-f-title");
  const noteEl     = document.getElementById("hi-goal-f-note");
  const progressEl = document.getElementById("hi-goal-f-progress");
  const deadlineEl = document.getElementById("hi-goal-f-deadline");
  const errEl      = document.getElementById("hiGoalModalErr");
  if (!titleEl || !errEl) return;

  const title    = (titleEl.value    ?? "").trim();
  const note     = (noteEl?.value    ?? "").trim();
  const progress = parseInt(progressEl?.value ?? "0", 10);
  const deadline = (deadlineEl?.value ?? "").trim();

  if (!title) { errEl.textContent = "Goal title is required."; return; }
  errEl.textContent = "";

  const data = { title, note, progress, deadline };
  if (modal?._editId) data.id = modal._editId;
  await hiSaveGoal(data);
  hiRenderGoals();
  hiCloseGoalModal();
}

/* ── Notes ── */

async function hiLoadNotes() {
  const all = await hiGetAll("personal");
  return all.filter(r => r.type === "note").sort((a, b) => b.updatedAt - a.updatedAt);
}

async function hiSaveNote(data) {
  const item = Object.assign({}, data, { type: "note", updatedAt: Date.now() });
  if (!item.id)        item.id        = hiGenId();
  if (!item.createdAt) item.createdAt = Date.now();
  await hiPut("personal", item);
  if (typeof hiAutoClaimRecord === "function") {
    await hiAutoClaimRecord("personal", item, {
      contentType: "Note",
      title:       item.title || "Private Note",
      content:     item.body  || item.title || "Private Note",
    });
  }
  return item;
}

async function hiRenderNotes() {
  const list = document.getElementById("hi-notes-list");
  if (!list) return;

  const notes = await hiLoadNotes();
  if (!notes.length) {
    list.innerHTML = '<p class="hi-empty">No notes yet. Capture your first thought.</p>';
    return;
  }

  list.innerHTML = notes.map(n => {
    const d    = new Date(n.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    const body = n.body ?? "";
    return `<div class="hi-note-card glass">` +
      `<div class="hi-note-top">` +
        `<span class="hi-note-date">${hiEsc(d)}</span>` +
        `<div class="hi-goal-btns">` +
          `<button type="button" class="hi-icon-btn hi-note-edit-btn" data-id="${hiEsc(n.id)}" aria-label="Edit">✏️</button>` +
          `<button type="button" class="hi-icon-btn hi-note-del-btn"  data-id="${hiEsc(n.id)}" aria-label="Delete">✕</button>` +
        `</div>` +
      `</div>` +
      (n.title ? `<h4 class="hi-note-title">${hiEsc(n.title)}</h4>` : '') +
      `<p class="hi-note-body">${hiEsc(body.slice(0, 220))}${body.length > 220 ? "…" : ""}</p>` +
    `</div>`;
  }).join("");

  list.querySelectorAll(".hi-note-edit-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const note = await hiGet("personal", btn.dataset.id);
      if (note) hiOpenNoteModal(note);
    });
  });

  list.querySelectorAll(".hi-note-del-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this note?")) return;
      await hiDelete("personal", btn.dataset.id);
      hiRenderNotes();
    });
  });
}

function hiOpenNoteModal(note) {
  const modal = document.getElementById("hi-note-modal");
  if (!modal) return;
  document.getElementById("hiNoteModalTitle").textContent  = note ? "Edit Note" : "Quick Note";
  document.getElementById("hi-note-f-title").value         = note?.title ?? "";
  document.getElementById("hi-note-f-body").value          = note?.body  ?? "";
  document.getElementById("hiNoteModalErr").textContent    = "";
  modal._editId = note?.id ?? null;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  setTimeout(() => document.getElementById("hi-note-f-body")?.focus(), 60);
}

function hiCloseNoteModal() {
  const modal = document.getElementById("hi-note-modal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

async function hiSaveNoteModal() {
  const modal   = document.getElementById("hi-note-modal");
  const titleEl = document.getElementById("hi-note-f-title");
  const bodyEl  = document.getElementById("hi-note-f-body");
  const errEl   = document.getElementById("hiNoteModalErr");
  if (!bodyEl || !errEl) return;

  const title = (titleEl?.value ?? "").trim();
  const body  = (bodyEl.value   ?? "").trim();
  if (!body) { errEl.textContent = "Write something first."; return; }
  errEl.textContent = "";

  const data = { title, body };
  if (modal?._editId) data.id = modal._editId;
  await hiSaveNote(data);
  hiRenderNotes();
  hiCloseNoteModal();
}

/* ── Habit Config ── */

function hiOpenHabitModal() {
  const modal = document.getElementById("hi-habit-modal");
  if (!modal) return;
  hiLoadHabitsConfig().then(habits => {
    hiRenderHabitEditor(habits);
    document.getElementById("hiHabitModalErr").textContent = "";
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  });
}

function hiCloseHabitModal() {
  const modal = document.getElementById("hi-habit-modal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function hiRenderHabitEditor(habits) {
  const editor = document.getElementById("hi-habit-list-editor");
  if (!editor) return;
  editor.innerHTML = habits.map((h, i) =>
    `<div class="hi-habit-edit-row" data-index="${i}">` +
      `<input type="text" class="hi-habit-edit-icon" value="${hiEsc(h.icon)}" placeholder="Icon" />` +
      `<input type="text" class="hi-habit-edit-name" value="${hiEsc(h.name)}" placeholder="Habit Name" />` +
      `<button type="button" class="hi-habit-edit-del" aria-label="Remove">&times;</button>` +
    `</div>`
  ).join("");

  editor.querySelectorAll(".hi-habit-edit-del").forEach(btn => {
    btn.addEventListener("click", () => btn.closest(".hi-habit-edit-row").remove());
  });
}

function hiAddHabitRow() {
  const editor = document.getElementById("hi-habit-list-editor");
  if (!editor) return;
  const div = document.createElement("div");
  div.className = "hi-habit-edit-row";
  div.innerHTML =
    '<input type="text" class="hi-habit-edit-icon" value="✨" placeholder="Icon" />' +
    '<input type="text" class="hi-habit-edit-name" value="" placeholder="Habit Name" />' +
    '<button type="button" class="hi-habit-edit-del" aria-label="Remove">&times;</button>';
  div.querySelector(".hi-habit-edit-del").addEventListener("click", () => div.remove());
  editor.appendChild(div);
  div.querySelector(".hi-habit-edit-name").focus();
}

async function hiSaveHabitModal() {
  const editor = document.getElementById("hi-habit-list-editor");
  if (!editor) return;

  const habits = [];
  editor.querySelectorAll(".hi-habit-edit-row").forEach(row => {
    const icon = (row.querySelector(".hi-habit-edit-icon")?.value ?? "").trim();
    const name = (row.querySelector(".hi-habit-edit-name")?.value ?? "").trim();
    if (name) habits.push({ id: name.toLowerCase().replace(/[^\w]/g, "-"), name, icon: icon || "✨" });
  });

  if (!habits.length) {
    document.getElementById("hiHabitModalErr").textContent = "Add at least one habit.";
    return;
  }

  await hiPut("personal", { id: "habits-config", habits });
  hiRenderHabits();
  hiCloseHabitModal();
}

/* ── INIT ── */

document.addEventListener("DOMContentLoaded", () => {
  hiEnsurePersonalSeedData().then(() => {
    hiRenderHabits();
    hiRenderGoals();
    hiRenderNotes();
    if (typeof hiRenderHeroToday === "function") hiRenderHeroToday();
  });

  document.getElementById("hiAddGoalBtn")?.addEventListener("click", () => hiOpenGoalModal(null));
  document.getElementById("hiAddNoteBtn")?.addEventListener("click", () => hiOpenNoteModal(null));
  document.getElementById("hiHabitConfigBtn")?.addEventListener("click", hiOpenHabitModal);

  /* Goal modal */
  const gOverlay = document.getElementById("hi-goal-modal");
  document.getElementById("hiGoalModalSave")?.addEventListener("click",   hiSaveGoalModal);
  document.getElementById("hiGoalModalCancel")?.addEventListener("click", hiCloseGoalModal);
  document.getElementById("hiGoalModalClose")?.addEventListener("click",  hiCloseGoalModal);
  gOverlay?.addEventListener("click", e => { if (e.target === gOverlay) hiCloseGoalModal(); });

  document.getElementById("hi-goal-f-progress")?.addEventListener("input", function() {
    const lbl = document.getElementById("hiGoalProgressVal");
    if (lbl) lbl.textContent = `${this.value}%`;
  });

  /* Note modal */
  const nOverlay = document.getElementById("hi-note-modal");
  document.getElementById("hiNoteModalSave")?.addEventListener("click",   hiSaveNoteModal);
  document.getElementById("hiNoteModalCancel")?.addEventListener("click", hiCloseNoteModal);
  document.getElementById("hiNoteModalClose")?.addEventListener("click",  hiCloseNoteModal);
  nOverlay?.addEventListener("click", e => { if (e.target === nOverlay) hiCloseNoteModal(); });

  /* Habit modal */
  const hOverlay = document.getElementById("hi-habit-modal");
  document.getElementById("hiHabitModalSave")?.addEventListener("click",   hiSaveHabitModal);
  document.getElementById("hiHabitModalCancel")?.addEventListener("click", hiCloseHabitModal);
  document.getElementById("hiHabitModalClose")?.addEventListener("click",  hiCloseHabitModal);
  document.getElementById("hiHabitAddRowBtn")?.addEventListener("click",   hiAddHabitRow);
  hOverlay?.addEventListener("click", e => { if (e.target === hOverlay) hiCloseHabitModal(); });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { hiCloseGoalModal(); hiCloseNoteModal(); hiCloseHabitModal(); }
  });
}, { once: true });
