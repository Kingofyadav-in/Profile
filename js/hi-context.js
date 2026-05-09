"use strict";

/* ======================================================
   hi-context.js — AI Context Builder
   Builds a rich text snapshot of the user's life
   for injection into every AI conversation.
   Depends on: hi-storage.js
====================================================== */

async function hiBuildAIContext() {
  var lines = [];
  var today = hiTodayDate ? hiTodayDate() : new Date().toISOString().slice(0,10);

  lines.push("=== HI CONTEXT — " + today + " ===");
  lines.push("");

  /* Identity */
  try {
    var identity = await hiGet("identity", "primary");
    if (identity) {
      lines.push("IDENTITY");
      lines.push("Name: " + identity.name);
      if (identity.hdi)      lines.push("HDI: " + identity.hdi);
      if (identity.roles && identity.roles.length)
                             lines.push("Roles: " + (Array.isArray(identity.roles) ? identity.roles.join(" · ") : identity.roles));
      if (identity.location) lines.push("Location: " + identity.location);
      if (identity.tagline)  lines.push("Tagline: \"" + identity.tagline + "\"");
      if (identity.mission)  lines.push("Mission: " + identity.mission);
      lines.push("");
    }
  } catch(e) {}

  /* Mood + Energy today */
  try {
    var mood = await hiGet("personal", "mood-" + today);
    if (mood && (mood.mood || mood.energy)) {
      lines.push("TODAY'S VITALS");
      if (mood.mood)   lines.push("Mood: " + mood.mood + "/5");
      if (mood.energy) lines.push("Energy: " + mood.energy + "/5");
      lines.push("");
    }
  } catch(e) {}

  /* Habits today */
  try {
    var habitRecord = await hiGet("personal", "habits-" + today);
    var habitCfg    = await hiGet("personal", "habits-config");
    if (habitRecord && habitCfg && habitCfg.habits) {
      var done = habitCfg.habits.filter(function(h) { return habitRecord.checks && habitRecord.checks[h.id]; });
      var todo = habitCfg.habits.filter(function(h) { return !habitRecord.checks || !habitRecord.checks[h.id]; });
      lines.push("HABITS TODAY");
      if (done.length) lines.push("Done: " + done.map(function(h){return h.name;}).join(", "));
      if (todo.length) lines.push("Pending: " + todo.map(function(h){return h.name;}).join(", "));
      lines.push("");
    }
  } catch(e) {}

  /* Today's tasks */
  try {
    var allTasks = await hiGetAll("tasks");
    var todayTasks = allTasks.filter(function(t){ return t.date === today; });
    if (todayTasks.length) {
      lines.push("TODAY'S TASKS");
      todayTasks.forEach(function(t) {
        lines.push((t.done ? "[x] " : "[ ] ") + t.title);
      });
      var doneCount = todayTasks.filter(function(t){return t.done;}).length;
      lines.push("Summary: " + doneCount + "/" + todayTasks.length + " done");
      lines.push("");
    }
  } catch(e) {}

  /* Goals */
  try {
    var allPersonal = await hiGetAll("personal");
    var goals = allPersonal.filter(function(r){ return r.type === "goal"; });
    if (goals.length) {
      lines.push("PERSONAL GOALS");
      goals.slice(0, 6).forEach(function(g) {
        var pct = g.progress || 0;
        lines.push("• " + g.title + " — " + pct + "%"
          + (g.deadline ? " (by " + g.deadline + ")" : ""));
      });
      lines.push("");
    }
  } catch(e) {}

  /* Recent notes */
  try {
    var allPersonal2 = await hiGetAll("personal");
    var notes = allPersonal2.filter(function(r){ return r.type === "note"; })
                            .sort(function(a,b){ return b.updatedAt - a.updatedAt; })
                            .slice(0, 3);
    if (notes.length) {
      lines.push("RECENT NOTES");
      notes.forEach(function(n) {
        var snippet = (n.body || "").slice(0, 80).replace(/\n/g, " ");
        lines.push("• " + (n.title ? n.title + ": " : "") + snippet + (n.body && n.body.length > 80 ? "…" : ""));
      });
      lines.push("");
    }
  } catch(e) {}

  /* Professional projects + task counts */
  try {
    var allPro = await hiGetAll("professional");
    var projects = allPro.filter(function(r){ return r.type === "project"; });
    var protasks = allPro.filter(function(r){ return r.type === "protask"; });
    if (projects.length) {
      lines.push("PROFESSIONAL PROJECTS");
      projects.forEach(function(p) {
        var open = protasks.filter(function(t){ return t.projectId === p.id && !t.done; }).length;
        var done = protasks.filter(function(t){ return t.projectId === p.id && t.done; }).length;
        lines.push("• " + p.name + " — " + open + " open task" + (open !== 1 ? "s" : "")
          + (done ? ", " + done + " done" : ""));
      });
      lines.push("");
    }
  } catch(e) {}

  /* Upcoming events (next 14 days) */
  try {
    var allSocial = await hiGetAll("social");
    var events    = allSocial.filter(function(r){ return r.type === "event"; });
    var upcoming  = events.filter(function(e){
      var d = new Date(e.date); d.setHours(0,0,0,0);
      var t = new Date(); t.setHours(0,0,0,0);
      var diff = Math.round((d - t) / 86400000);
      return diff >= 0 && diff <= 14;
    }).sort(function(a,b){ return a.date.localeCompare(b.date); });

    if (upcoming.length) {
      lines.push("UPCOMING EVENTS (next 14 days)");
      upcoming.forEach(function(e) {
        lines.push("• " + e.title + " — " + e.date + (e.eventType ? " [" + e.eventType + "]" : ""));
      });
      lines.push("");
    }
  } catch(e) {}

  lines.push("=== END CONTEXT ===");
  return lines.join("\n");
}
