"use strict";

/* ======================================================
   hi-context.js — AI Context Builder
   Builds a rich text snapshot of the user's life OS
   for injection into every AI conversation.
   Depends on: hi-storage.js
====================================================== */

async function hiBuildAIContext() {
  const lines = [];
  const today = typeof hiTodayDate === "function" ? hiTodayDate() : new Date().toISOString().slice(0, 10);

  lines.push(`=== HI CONTEXT — ${today} ===`, "");

  /* ── Identity ── */
  try {
    const id = await hiGet("identity", "primary");
    if (id) {
      lines.push("IDENTITY");
      lines.push(`Name: ${id.name}`);
      if (id.username) lines.push(`Username: @${id.username}`);
      if (id.hdi)      lines.push(`HDI: ${id.hdi}`);
      if (id.email)    lines.push(`Email: ${id.email}`);
      if (id.phone)    lines.push(`Phone: ${[id.phoneCode, id.phone].filter(Boolean).join(" ")}`);
      if (id.roles?.length) lines.push(`Roles: ${Array.isArray(id.roles) ? id.roles.join(" · ") : id.roles}`);
      if (id.location) lines.push(`Location: ${id.location}`);
      if (id.tagline)  lines.push(`Tagline: "${id.tagline}"`);
      if (id.mission)  lines.push(`Mission: ${id.mission}`);
      lines.push("");
    }
  } catch (_) {}

  /* ── Mood + Energy ── */
  try {
    const mood = await hiGet("personal", `mood-${today}`);
    if (mood && (mood.mood || mood.energy)) {
      lines.push("TODAY'S VITALS");
      if (mood.mood)   lines.push(`Mood: ${mood.mood}/5`);
      if (mood.energy) lines.push(`Energy: ${mood.energy}/5`);
      lines.push("");
    }
  } catch (_) {}

  /* ── Habits ── */
  try {
    const [habitRecord, habitCfg] = await Promise.all([
      hiGet("personal", `habits-${today}`),
      hiGet("personal", "habits-config"),
    ]);
    if (habitRecord && habitCfg?.habits?.length) {
      const done = habitCfg.habits.filter(h => habitRecord.checks?.[h.id]);
      const todo = habitCfg.habits.filter(h => !habitRecord.checks?.[h.id]);
      lines.push("HABITS TODAY");
      if (done.length) lines.push(`Done: ${done.map(h => h.name).join(", ")}`);
      if (todo.length) lines.push(`Pending: ${todo.map(h => h.name).join(", ")}`);
      lines.push("");
    }
  } catch (_) {}

  /* ── Bulk personal data (single call) ── */
  let allPersonal = [];
  try { allPersonal = await hiGetAll("personal"); } catch (_) {}

  /* ── Today's tasks ── */
  try {
    const allTasks   = await hiGetAll("tasks");
    const todayTasks = allTasks.filter(t => t.date === today);
    if (todayTasks.length) {
      const doneCount = todayTasks.filter(t => t.done).length;
      lines.push("TODAY'S TASKS");
      todayTasks.forEach(t => lines.push(`${t.done ? "[x]" : "[ ]"} ${t.title}`));
      lines.push(`Summary: ${doneCount}/${todayTasks.length} done`, "");
    }
  } catch (_) {}

  /* ── Goals ── */
  const goals = allPersonal.filter(r => r.type === "goal");
  if (goals.length) {
    lines.push("PERSONAL GOALS");
    goals.slice(0, 6).forEach(g => {
      const pct      = g.progress || 0;
      const deadline = g.deadline ? ` (by ${g.deadline})` : "";
      lines.push(`• ${g.title} — ${pct}%${deadline}`);
    });
    lines.push("");
  }

  /* ── Recent notes ── */
  const notes = allPersonal
    .filter(r => r.type === "note")
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, 3);
  if (notes.length) {
    lines.push("RECENT NOTES");
    notes.forEach(n => {
      const body    = (n.body || "").replace(/\n/g, " ");
      const snippet = body.length > 80 ? `${body.slice(0, 80)}…` : body;
      lines.push(`• ${n.title ? n.title + ": " : ""}${snippet}`);
    });
    lines.push("");
  }

  /* ── Professional projects ── */
  try {
    const allPro   = await hiGetAll("professional");
    const projects = allPro.filter(r => r.type === "project");
    const protasks = allPro.filter(r => r.type === "protask");
    if (projects.length) {
      lines.push("PROFESSIONAL PROJECTS");
      projects.forEach(p => {
        const open = protasks.filter(t => t.projectId === p.id && !t.done).length;
        const done = protasks.filter(t => t.projectId === p.id && t.done).length;
        lines.push(`• ${p.name} — ${open} open task${open !== 1 ? "s" : ""}${done ? `, ${done} done` : ""}`);
      });
      lines.push("");
    }
  } catch (_) {}

  /* ── Upcoming events (next 14 days) ── */
  try {
    const allSocial = await hiGetAll("social");
    const todayMs   = new Date(today).setHours(0, 0, 0, 0);
    const upcoming  = allSocial
      .filter(r => r.type === "event")
      .filter(e => {
        const diff = Math.round((new Date(e.date).setHours(0, 0, 0, 0) - todayMs) / 86_400_000);
        return diff >= 0 && diff <= 14;
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    if (upcoming.length) {
      lines.push("UPCOMING EVENTS (next 14 days)");
      upcoming.forEach(e => {
        lines.push(`• ${e.title} — ${e.date}${e.eventType ? ` [${e.eventType}]` : ""}`);
      });
      lines.push("");
    }
  } catch (_) {}

  lines.push("=== END CONTEXT ===");
  return lines.join("\n");
}
