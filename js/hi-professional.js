"use strict";

/* ======================================================
   hi-professional.js — Professional Life Manager (Phase 3)
   Projects · Tasks · Today's Work
   Depends on: hi-storage.js
====================================================== */

const HI_DEFAULT_PROJECTS = [
  { id: "hi-life-os", name: "HI Life OS",              icon: "🪪", color: "#046A38", status: "active" },
  { id: "rhr",        name: "Royal Heritage Resort",   icon: "🏨", color: "#0F766E", status: "active" },
  { id: "nyf",        name: "National Youth Force",    icon: "🌐", color: "#FF671F", status: "active" },
  { id: "jal",        name: "Jhon Aamit LLP",          icon: "⚖️", color: "#000080", status: "active" },
  { id: "profile",    name: "kingofyadav.in Platform", icon: "🚀", color: "#6B21A8", status: "active" },
];

const HI_DEFAULT_PROTASKS = [
  { id: "seed-protask-hi-1",      projectId: "hi-life-os", title: "Connect identity, wallet, vault, assistant, and dashboard into one daily flow",   priority: "high",   done: false },
  { id: "seed-protask-hi-2",      projectId: "hi-life-os", title: "Add backup and restore checks so private records survive browser changes",         priority: "high",   done: false },
  { id: "seed-protask-profile-1", projectId: "profile",    title: "Keep homepage, services, blog, and contact pages aligned with current work",       priority: "normal", done: false },
  { id: "seed-protask-rhr-1",     projectId: "rhr",        title: "Prepare resort trust profile with services, enquiry paths, and local proof",       priority: "normal", done: false },
  { id: "seed-protask-nyf-1",     projectId: "nyf",        title: "Organize youth initiative programs, coordinators, and public communication",       priority: "high",   done: false },
  { id: "seed-protask-jal-1",     projectId: "jal",        title: "Document services, operating process, and client intake for business work",        priority: "normal", done: false },
];

let _hiActiveProjectId = null;

/* ── Projects ── */

async function hiLoadProjects() {
  const all      = await hiGetAll("professional");
  let   projects = all.filter(r => r.type === "project");
  if (!projects.length) {
    for (let i = 0; i < HI_DEFAULT_PROJECTS.length; i++) {
      const p = Object.assign({}, HI_DEFAULT_PROJECTS[i], { type: "project", createdAt: Date.now() + i });
      await hiPut("professional", p);
    }
    projects = HI_DEFAULT_PROJECTS.map(p => Object.assign({}, p, { type: "project", createdAt: Date.now() }));
  }
  return projects.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
}

async function hiEnsureProTaskSeedData() {
  const all      = await hiGetAll("professional");
  const hasTasks = all.some(r => r.type === "protask");
  if (hasTasks) return;
  const now = Date.now();
  for (let i = 0; i < HI_DEFAULT_PROTASKS.length; i++) {
    await hiPut("professional", Object.assign({}, HI_DEFAULT_PROTASKS[i], { type: "protask", seeded: true, createdAt: now + i }));
  }
}

async function hiRenderProjects() {
  const grid = document.getElementById("hi-projects-grid");
  if (!grid) return;

  const projects = await hiLoadProjects();
  await hiEnsureProTaskSeedData();
  if (!_hiActiveProjectId && projects.length) _hiActiveProjectId = projects[0].id;

  grid.innerHTML = projects.map(p => {
    const active = p.id === _hiActiveProjectId;
    return `<button type="button" class="hi-proj-card${active ? " active" : ""}" data-id="${hiEsc(p.id)}" style="--proj-color:${hiEsc(p.color)}">` +
      `<span class="hi-proj-icon">${p.icon ?? "📁"}</span>` +
      `<span class="hi-proj-name">${hiEsc(p.name)}</span>` +
    `</button>`;
  }).join("") +
  `<button type="button" class="hi-proj-card hi-proj-add" id="hiAddProjectBtn" aria-label="Add project">` +
    `<span class="hi-proj-icon">+</span>` +
    `<span class="hi-proj-name">Add Project</span>` +
  `</button>`;

  grid.querySelectorAll(".hi-proj-card:not(.hi-proj-add)").forEach(btn => {
    btn.addEventListener("click", () => {
      _hiActiveProjectId = btn.dataset.id;
      hiRenderProjects();
    });
  });

  document.getElementById("hiAddProjectBtn")?.addEventListener("click", () => hiOpenProjectModal(null));
  hiRenderProTasks();
}

/* ── Project Tasks ── */

async function hiLoadProTasks(projectId) {
  const all = await hiGetAll("professional");
  return all
    .filter(r => r.type === "protask" && r.projectId === projectId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

async function hiRenderProTasks() {
  const section = document.getElementById("hi-protasks-section");
  const title   = document.getElementById("hi-protask-project-name");
  const list    = document.getElementById("hi-protask-list");
  if (!list || !section) return;

  if (!_hiActiveProjectId) { section.hidden = true; return; }
  section.hidden = false;

  const projects = await hiLoadProjects();
  const proj     = projects.find(p => p.id === _hiActiveProjectId);
  if (title && proj) {
    title.textContent = `${proj.icon} ${proj.name}`;
    title.style.color = proj.color;
  }

  const tasks = await hiLoadProTasks(_hiActiveProjectId);
  if (!tasks.length) {
    list.innerHTML = '<li class="hi-task-empty">No tasks yet. Add the first task for this project.</li>';
    return;
  }

  list.innerHTML = tasks.map(t =>
    `<li class="hi-task-item${t.done ? " done" : ""}${t.priority === "high" ? " hi-prio-high" : ""}" data-id="${hiEsc(t.id)}">` +
      `<button type="button" class="hi-task-check" aria-label="Toggle complete">${t.done ? "✓" : ""}</button>` +
      `<span class="hi-task-title">${hiEsc(t.title)}</span>` +
      (t.priority === "high" ? '<span class="hi-prio-badge">HIGH</span>' : '') +
      `<button type="button" class="hi-task-delete" aria-label="Delete">✕</button>` +
    `</li>`
  ).join("");

  list.querySelectorAll(".hi-task-check").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.closest(".hi-task-item").dataset.id;
      const t  = await hiGet("professional", id);
      if (t) { t.done = !t.done; await hiPut("professional", t); }
      hiRenderProTasks();
    });
  });

  list.querySelectorAll(".hi-task-delete").forEach(btn => {
    btn.addEventListener("click", async () => {
      await hiDelete("professional", btn.closest(".hi-task-item").dataset.id);
      hiRenderProTasks();
    });
  });
}

function hiInitProTaskInput() {
  const form = document.getElementById("hi-protask-form");
  if (!form) return;
  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!_hiActiveProjectId) return;
    const input    = document.getElementById("hi-protask-input");
    const priority = document.getElementById("hi-protask-priority");
    const val      = (input?.value ?? "").trim();
    if (!val) return;
    await hiPut("professional", {
      id:        hiGenId(),
      type:      "protask",
      title:     val,
      projectId: _hiActiveProjectId,
      priority:  priority?.value ?? "normal",
      done:      false,
      createdAt: Date.now(),
    });
    if (input) input.value = "";
    hiRenderProTasks();
  });
}

/* ── Add / Edit Project Modal ── */

function hiOpenProjectModal(project) {
  const modal = document.getElementById("hi-project-modal");
  if (!modal) return;
  document.getElementById("hiProjectModalTitle").textContent  = project ? "Edit Project" : "Add Project";
  document.getElementById("hi-proj-f-name").value            = project?.name ?? "";
  document.getElementById("hi-proj-f-icon").value            = project?.icon ?? "";
  document.getElementById("hiProjectModalErr").textContent   = "";
  modal._editId = project?.id ?? null;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  setTimeout(() => document.getElementById("hi-proj-f-name")?.focus(), 60);
}

function hiCloseProjectModal() {
  const modal = document.getElementById("hi-project-modal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

async function hiSaveProjectModal() {
  const modal  = document.getElementById("hi-project-modal");
  const name   = (document.getElementById("hi-proj-f-name")?.value ?? "").trim();
  const icon   = (document.getElementById("hi-proj-f-icon")?.value ?? "").trim() || "📁";
  const errEl  = document.getElementById("hiProjectModalErr");
  if (!name) { errEl.textContent = "Project name is required."; return; }
  errEl.textContent = "";

  const palette  = ["#046A38", "#FF671F", "#000080", "#6B21A8", "#B45309", "#0F766E"];
  const projects = await hiLoadProjects();
  const id       = modal?._editId ?? hiGenId();
  const base     = await hiGet("professional", id);
  const project  = Object.assign({}, base ?? {}, {
    id,
    type:      "project",
    name,
    icon,
    color:     base?.color ?? palette[projects.length % palette.length],
    status:    "active",
    createdAt: base?.createdAt ?? Date.now(),
  });
  await hiPut("professional", project);

  if (typeof hiAutoClaimRecord === "function") {
    await hiAutoClaimRecord("professional", project, {
      contentType: "Project",
      content: [project.name, `Status: ${project.status}`, `Color: ${project.color}`].filter(Boolean).join("\n"),
    });
  }

  _hiActiveProjectId = id;
  hiRenderProjects();
  hiCloseProjectModal();
}

/* ── Stats bar ── */

async function hiRenderProStats() {
  const el = document.getElementById("hi-pro-stats");
  if (!el) return;

  const all      = await hiGetAll("professional");
  const projects = all.filter(r => r.type === "project");
  const tasks    = all.filter(r => r.type === "protask");
  const done     = tasks.filter(t => t.done);

  el.innerHTML =
    `<div class="hi-stat"><span class="hi-stat-val">${projects.length}</span><span class="hi-stat-label">Projects</span></div>` +
    `<div class="hi-stat"><span class="hi-stat-val">${tasks.length}</span><span class="hi-stat-label">Total Tasks</span></div>` +
    `<div class="hi-stat"><span class="hi-stat-val">${done.length}</span><span class="hi-stat-label">Completed</span></div>` +
    `<div class="hi-stat"><span class="hi-stat-val">${tasks.length - done.length}</span><span class="hi-stat-label">Open</span></div>`;
}

/* ── INIT ── */

document.addEventListener("DOMContentLoaded", () => {
  hiRenderProjects().then(hiRenderProStats);
  hiInitProTaskInput();

  const pOverlay = document.getElementById("hi-project-modal");
  document.getElementById("hiProjectModalSave")?.addEventListener("click",   hiSaveProjectModal);
  document.getElementById("hiProjectModalCancel")?.addEventListener("click", hiCloseProjectModal);
  document.getElementById("hiProjectModalClose")?.addEventListener("click",  hiCloseProjectModal);
  pOverlay?.addEventListener("click", e => { if (e.target === pOverlay) hiCloseProjectModal(); });

  document.addEventListener("keydown", e => { if (e.key === "Escape") hiCloseProjectModal(); });
}, { once: true });
