"use strict";

/* ======================================================
   hi-professional.js — Professional Life Manager (Phase 3)
   Projects · Tasks · Today's Work
   Depends on: hi-storage.js
====================================================== */

var HI_DEFAULT_PROJECTS = [
  { id: "hi-life-os", name: "HI Life OS",              icon: "🪪", color: "#046A38", status: "active" },
  { id: "rhr",        name: "Royal Heritage Resort",   icon: "🏨", color: "#0F766E", status: "active" },
  { id: "nyf",        name: "National Youth Force",    icon: "🌐", color: "#FF671F", status: "active" },
  { id: "jal",        name: "Jhon Aamit LLP",          icon: "⚖️", color: "#000080", status: "active" },
  { id: "profile",    name: "kingofyadav.in Platform", icon: "🚀", color: "#6B21A8", status: "active" }
];

var HI_DEFAULT_PROTASKS = [
  { id: "seed-protask-hi-1", projectId: "hi-life-os", title: "Connect identity, wallet, vault, assistant, and dashboard into one daily flow", priority: "high", done: false },
  { id: "seed-protask-hi-2", projectId: "hi-life-os", title: "Add backup and restore checks so private records survive browser changes", priority: "high", done: false },
  { id: "seed-protask-profile-1", projectId: "profile", title: "Keep homepage, services, blog, and contact pages aligned with current work", priority: "normal", done: false },
  { id: "seed-protask-rhr-1", projectId: "rhr", title: "Prepare resort trust profile with services, enquiry paths, and local proof", priority: "normal", done: false },
  { id: "seed-protask-nyf-1", projectId: "nyf", title: "Organize youth initiative programs, coordinators, and public communication", priority: "high", done: false },
  { id: "seed-protask-jal-1", projectId: "jal", title: "Document services, operating process, and client intake for business work", priority: "normal", done: false }
];

var _hiActiveProjectId = null;

/* ── Projects ── */

async function hiLoadProjects() {
  var all      = await hiGetAll("professional");
  var projects = all.filter(function(r) { return r.type === "project"; });
  if (!projects.length) {
    for (var i = 0; i < HI_DEFAULT_PROJECTS.length; i++) {
      var p = Object.assign({}, HI_DEFAULT_PROJECTS[i], { type: "project", createdAt: Date.now() + i });
      await hiPut("professional", p);
    }
    projects = HI_DEFAULT_PROJECTS.map(function(p) {
      return Object.assign({}, p, { type: "project", createdAt: Date.now() });
    });
  }
  return projects.sort(function(a, b) { return (a.createdAt || 0) - (b.createdAt || 0); });
}

async function hiEnsureProTaskSeedData() {
  var all = await hiGetAll("professional");
  var hasTasks = all.some(function(r) { return r.type === "protask"; });
  if (hasTasks) return;
  var now = Date.now();
  for (var i = 0; i < HI_DEFAULT_PROTASKS.length; i++) {
    await hiPut("professional", Object.assign({}, HI_DEFAULT_PROTASKS[i], {
      type: "protask",
      seeded: true,
      createdAt: now + i
    }));
  }
}

async function hiRenderProjects() {
  var grid = document.getElementById("hi-projects-grid");
  if (!grid) return;

  var projects = await hiLoadProjects();
  await hiEnsureProTaskSeedData();
  if (!_hiActiveProjectId && projects.length) _hiActiveProjectId = projects[0].id;

  grid.innerHTML = projects.map(function(p) {
    var active = p.id === _hiActiveProjectId;
    return '<button type="button" class="hi-proj-card' + (active ? " active" : "") + '" data-id="' + hiEsc(p.id) + '" style="--proj-color:' + hiEsc(p.color) + '">' +
      '<span class="hi-proj-icon">' + (p.icon || "📁") + '</span>' +
      '<span class="hi-proj-name">' + hiEsc(p.name) + '</span>' +
    '</button>';
  }).join("") +
  '<button type="button" class="hi-proj-card hi-proj-add" id="hiAddProjectBtn" aria-label="Add project">' +
    '<span class="hi-proj-icon">+</span>' +
    '<span class="hi-proj-name">Add Project</span>' +
  '</button>';

  grid.querySelectorAll(".hi-proj-card:not(.hi-proj-add)").forEach(function(btn) {
    btn.addEventListener("click", function() {
      _hiActiveProjectId = btn.dataset.id;
      hiRenderProjects();
    });
  });

  var addBtn = document.getElementById("hiAddProjectBtn");
  if (addBtn) addBtn.addEventListener("click", function() { hiOpenProjectModal(null); });

  hiRenderProTasks();
}

/* ── Project Tasks ── */

async function hiLoadProTasks(projectId) {
  var all = await hiGetAll("professional");
  return all
    .filter(function(r) { return r.type === "protask" && r.projectId === projectId; })
    .sort(function(a, b) { return a.createdAt - b.createdAt; });
}

async function hiRenderProTasks() {
  var section = document.getElementById("hi-protasks-section");
  var title   = document.getElementById("hi-protask-project-name");
  var list    = document.getElementById("hi-protask-list");
  if (!list || !section) return;

  if (!_hiActiveProjectId) { section.hidden = true; return; }
  section.hidden = false;

  var projects = await hiLoadProjects();
  var proj     = projects.find(function(p) { return p.id === _hiActiveProjectId; });
  if (title && proj) {
    title.textContent = proj.icon + " " + proj.name;
    title.style.color = proj.color;
  }

  var tasks = await hiLoadProTasks(_hiActiveProjectId);

  if (!tasks.length) {
    list.innerHTML = '<li class="hi-task-empty">No tasks yet. Add the first task for this project.</li>';
    return;
  }

  list.innerHTML = tasks.map(function(t) {
    return '<li class="hi-task-item' + (t.done ? " done" : "") + (t.priority === "high" ? " hi-prio-high" : "") + '" data-id="' + hiEsc(t.id) + '">' +
      '<button type="button" class="hi-task-check" aria-label="Toggle complete">' + (t.done ? "&#x2713;" : "") + '</button>' +
      '<span class="hi-task-title">' + hiEsc(t.title) + '</span>' +
      (t.priority === "high" ? '<span class="hi-prio-badge">HIGH</span>' : '') +
      '<button type="button" class="hi-task-delete" aria-label="Delete">&#x2715;</button>' +
    '</li>';
  }).join("");

  list.querySelectorAll(".hi-task-check").forEach(function(btn) {
    btn.addEventListener("click", async function() {
      var id = btn.closest(".hi-task-item").dataset.id;
      var t  = await hiGet("professional", id);
      if (t) { t.done = !t.done; await hiPut("professional", t); }
      hiRenderProTasks();
    });
  });

  list.querySelectorAll(".hi-task-delete").forEach(function(btn) {
    btn.addEventListener("click", async function() {
      await hiDelete("professional", btn.closest(".hi-task-item").dataset.id);
      hiRenderProTasks();
    });
  });
}

function hiInitProTaskInput() {
  var form = document.getElementById("hi-protask-form");
  if (!form) return;
  form.addEventListener("submit", async function(e) {
    e.preventDefault();
    if (!_hiActiveProjectId) return;
    var input    = document.getElementById("hi-protask-input");
    var priority = document.getElementById("hi-protask-priority");
    var val      = (input ? input.value : "").trim();
    if (!val) return;
    await hiPut("professional", {
      id: hiGenId(), type: "protask",
      title: val, projectId: _hiActiveProjectId,
      priority: priority ? priority.value : "normal",
      done: false, createdAt: Date.now()
    });
    if (input) input.value = "";
    hiRenderProTasks();
  });
}

/* ── Add Project Modal ── */

function hiOpenProjectModal(project) {
  var modal = document.getElementById("hi-project-modal");
  if (!modal) return;
  document.getElementById("hiProjectModalTitle").textContent = project ? "Edit Project" : "Add Project";
  document.getElementById("hi-proj-f-name").value = project ? (project.name || "") : "";
  document.getElementById("hi-proj-f-icon").value = project ? (project.icon || "") : "";
  document.getElementById("hiProjectModalErr").textContent = "";
  modal._editId = project ? project.id : null;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  setTimeout(function() { document.getElementById("hi-proj-f-name").focus(); }, 60);
}

function hiCloseProjectModal() {
  var modal = document.getElementById("hi-project-modal");
  if (modal) {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
}

async function hiSaveProjectModal() {
  var modal  = document.getElementById("hi-project-modal");
  var name   = (document.getElementById("hi-proj-f-name").value || "").trim();
  var icon   = (document.getElementById("hi-proj-f-icon").value || "").trim() || "📁";
  var errEl  = document.getElementById("hiProjectModalErr");
  if (!name) { errEl.textContent = "Project name is required."; return; }
  errEl.textContent = "";

  var palette  = ["#046A38","#FF671F","#000080","#6B21A8","#B45309","#0F766E"];
  var projects = await hiLoadProjects();
  var color    = palette[projects.length % palette.length];

  var id   = (modal && modal._editId) ? modal._editId : hiGenId();
  var base = await hiGet("professional", id);
  var project = Object.assign({}, base || {}, {
    id: id, type: "project", name: name, icon: icon,
    color: base ? base.color : color,
    status: "active",
    createdAt: base ? base.createdAt : Date.now()
  });
  await hiPut("professional", project);
  if (typeof hiAutoClaimRecord === "function") {
    await hiAutoClaimRecord("professional", project, {
      contentType: "Project",
      content: [project.name, "Status: " + project.status, "Color: " + project.color].filter(Boolean).join("\n")
    });
  }

  _hiActiveProjectId = id;
  hiRenderProjects();
  hiCloseProjectModal();
}

/* ── Stats bar ── */

async function hiRenderProStats() {
  var el = document.getElementById("hi-pro-stats");
  if (!el) return;

  var all      = await hiGetAll("professional");
  var projects = all.filter(function(r) { return r.type === "project"; });
  var tasks    = all.filter(function(r) { return r.type === "protask"; });
  var done     = tasks.filter(function(t) { return t.done; });

  el.innerHTML =
    '<div class="hi-stat"><span class="hi-stat-val">' + projects.length + '</span><span class="hi-stat-label">Projects</span></div>' +
    '<div class="hi-stat"><span class="hi-stat-val">' + tasks.length    + '</span><span class="hi-stat-label">Total Tasks</span></div>' +
    '<div class="hi-stat"><span class="hi-stat-val">' + done.length     + '</span><span class="hi-stat-label">Completed</span></div>' +
    '<div class="hi-stat"><span class="hi-stat-val">' + (tasks.length - done.length) + '</span><span class="hi-stat-label">Open</span></div>';
}

/* ── INIT ── */

document.addEventListener("DOMContentLoaded", function() {
  hiRenderProjects().then(hiRenderProStats);
  hiInitProTaskInput();

  /* Project modal */
  var pSave    = document.getElementById("hiProjectModalSave");
  var pCancel  = document.getElementById("hiProjectModalCancel");
  var pClose   = document.getElementById("hiProjectModalClose");
  var pOverlay = document.getElementById("hi-project-modal");
  if (pSave)    pSave.addEventListener("click", hiSaveProjectModal);
  if (pCancel)  pCancel.addEventListener("click", hiCloseProjectModal);
  if (pClose)   pClose.addEventListener("click", hiCloseProjectModal);
  if (pOverlay) pOverlay.addEventListener("click", function(e) { if (e.target === pOverlay) hiCloseProjectModal(); });

  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") hiCloseProjectModal();
  });
});
