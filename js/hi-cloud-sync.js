"use strict";

/* ======================================================
   hi-cloud-sync.js — Browser ↔ /api/hi/* cloud bridge
   Auth: Bearer token from sessionStorage (hi_api_key).
   All methods return { ok, data?, error? }.
   Depends on: nothing (standalone)
====================================================== */

(function (global) {

  const API_BASE    = "/api/hi";
  const KEY_STORAGE = "hi_api_key";
  const TIMEOUT_MS  = 15_000;

  function getKey() {
    try { return sessionStorage.getItem(KEY_STORAGE) || ""; } catch { return ""; }
  }

  async function call(method, path, body = null) {
    const key = getKey();
    if (!key) return { ok: false, error: "Not authenticated" };

    const controller = new AbortController();
    const timer      = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const opts = {
      method,
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type":  "application/json",
      },
    };
    if (body !== null) opts.body = JSON.stringify(body);

    try {
      const res  = await fetch(`${API_BASE}/${path}`, opts);
      clearTimeout(timer);
      const json = await res.json();
      if (!res.ok && json.ok === undefined) return { ok: false, error: json.message || `HTTP ${res.status}` };
      return json;
    } catch (err) {
      clearTimeout(timer);
      if (err.name === "AbortError") return { ok: false, error: "Request timed out" };
      return { ok: false, error: err.message };
    }
  }

  // ── Identity ─────────────────────────────────────────────────────────────────
  const getIdentity   = ()          => call("GET",    "identity");
  const saveIdentity  = (data)      => call("PUT",    "identity", data);

  // ── Habits ───────────────────────────────────────────────────────────────────
  const getHabits     = ()          => call("GET",    "habits");
  const addHabit      = (data)      => call("POST",   "habits", data);
  const updateHabit   = (id, data)  => call("PUT",    `habits?id=${id}`, data);
  const deleteHabit   = (id)        => call("DELETE", `habits?id=${id}`);
  const logHabit      = (id)        => call("PUT",    `habits?id=${id}`, { log: true });

  // ── Goals ─────────────────────────────────────────────────────────────────────
  const getGoals      = ()          => call("GET",    "goals");
  const addGoal       = (data)      => call("POST",   "goals", data);
  const updateGoal    = (id, data)  => call("PUT",    `goals?id=${id}`, data);
  const deleteGoal    = (id)        => call("DELETE", `goals?id=${id}`);

  // ── Notes ─────────────────────────────────────────────────────────────────────
  const getNotes      = ()          => call("GET",    "notes");
  const addNote       = (data)      => call("POST",   "notes", data);
  const updateNote    = (id, data)  => call("PUT",    `notes?id=${id}`, data);
  const deleteNote    = (id)        => call("DELETE", `notes?id=${id}`);

  // ── Mood ──────────────────────────────────────────────────────────────────────
  const getMood       = ()          => call("GET",    "mood");
  const logMood       = (data)      => call("POST",   "mood", data);

  // ── Tasks ─────────────────────────────────────────────────────────────────────
  const getTasks      = ()          => call("GET",    "tasks");
  const addTask       = (data)      => call("POST",   "tasks", data);
  const updateTask    = (id, data)  => call("PUT",    `tasks?id=${id}`, data);
  const deleteTask    = (id)        => call("DELETE", `tasks?id=${id}`);

  // ── Contacts ──────────────────────────────────────────────────────────────────
  const getContacts   = ()          => call("GET",    "contacts");
  const addContact    = (data)      => call("POST",   "contacts", data);
  const updateContact = (id, data)  => call("PUT",    `contacts?id=${id}`, data);
  const deleteContact = (id)        => call("DELETE", `contacts?id=${id}`);

  // ── Events ────────────────────────────────────────────────────────────────────
  const getEvents     = ()          => call("GET",    "events");
  const addEvent      = (data)      => call("POST",   "events", data);
  const updateEvent   = (id, data)  => call("PUT",    `events?id=${id}`, data);
  const deleteEvent   = (id)        => call("DELETE", `events?id=${id}`);

  // ── Projects ──────────────────────────────────────────────────────────────────
  const getProjects   = ()          => call("GET",    "projects");
  const addProject    = (data)      => call("POST",   "projects", data);
  const updateProject = (id, data)  => call("PUT",    `projects?id=${id}`, data);
  const deleteProject = (id)        => call("DELETE", `projects?id=${id}`);

  // ── HDI Score ─────────────────────────────────────────────────────────────────
  const getHDI        = ()          => call("GET",    "hdi");

  // ── Chat Sessions ─────────────────────────────────────────────────────────────
  const getChatSessions = ()                    => call("GET",    "chat");
  const saveChat        = (sessionId, messages) => call("POST",   "chat", { session_id: sessionId, messages });
  const deleteChat      = (id)                  => call("DELETE", `chat?id=${id}`);

  // ── Full Snapshot Pull ────────────────────────────────────────────────────────
  async function pullAll() {
    const settled = await Promise.allSettled([
      getIdentity(), getHabits(), getGoals(), getNotes(),
      getTasks(), getContacts(), getEvents(), getProjects(), getHDI(),
    ]);

    const [identity, habits, goals, notes, tasks, contacts, events, projects, hdi] = settled;

    return {
      ok:        true,
      identity:  identity.value?.data  ?? null,
      habits:    habits.value?.habits  ?? [],
      habitLogs: habits.value?.logs    ?? [],
      goals:     goals.value?.data     ?? [],
      notes:     notes.value?.data     ?? [],
      tasks:     tasks.value?.data     ?? [],
      contacts:  contacts.value?.data  ?? [],
      events:    events.value?.data    ?? [],
      projects:  projects.value?.data  ?? [],
      hdi:       hdi.value?.data       ?? null,
    };
  }

  // ── Export ────────────────────────────────────────────────────────────────────
  global.HICloud = {
    getIdentity, saveIdentity,
    getHabits, addHabit, updateHabit, deleteHabit, logHabit,
    getGoals,   addGoal,  updateGoal,  deleteGoal,
    getNotes,   addNote,  updateNote,  deleteNote,
    getMood, logMood,
    getTasks,   addTask,  updateTask,  deleteTask,
    getContacts, addContact, updateContact, deleteContact,
    getEvents,  addEvent,  updateEvent,  deleteEvent,
    getProjects, addProject, updateProject, deleteProject,
    getHDI,
    getChatSessions, saveChat, deleteChat,
    pullAll,
  };

})(typeof window !== "undefined" ? window : globalThis);
