"use strict";

/**
 * HI Cloud Sync — bridges browser IndexedDB ↔ server /api/hi/* endpoints.
 * Uses HI_API_KEY stored in sessionStorage (set on login) for auth.
 * All methods return { ok, data?, error? }.
 */

(function (global) {

  const API_BASE = "/api/hi";
  const KEY_STORAGE = "hi_api_key";

  function getKey() {
    try { return sessionStorage.getItem(KEY_STORAGE) || ""; } catch { return ""; }
  }

  async function call(method, path, body = null) {
    const key = getKey();
    if (!key) return { ok: false, error: "Not authenticated" };

    const opts = {
      method,
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    };
    if (body !== null) opts.body = JSON.stringify(body);

    try {
      const res = await fetch(`${API_BASE}/${path}`, opts);
      const json = await res.json();
      return json;
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // ── Identity ────────────────────────────────────────────────────────────────
  async function getIdentity() { return call("GET", "identity"); }
  async function saveIdentity(data) { return call("PUT", "identity", data); }

  // ── Habits ──────────────────────────────────────────────────────────────────
  async function getHabits() { return call("GET", "habits"); }
  async function addHabit(data) { return call("POST", "habits", data); }
  async function updateHabit(id, data) { return call("PUT", `habits?id=${id}`, data); }
  async function deleteHabit(id) { return call("DELETE", `habits?id=${id}`); }
  async function logHabit(id) { return call("PUT", `habits?id=${id}`, { log: true }); }

  // ── Goals ───────────────────────────────────────────────────────────────────
  async function getGoals() { return call("GET", "goals"); }
  async function addGoal(data) { return call("POST", "goals", data); }
  async function updateGoal(id, data) { return call("PUT", `goals?id=${id}`, data); }
  async function deleteGoal(id) { return call("DELETE", `goals?id=${id}`); }

  // ── Notes ───────────────────────────────────────────────────────────────────
  async function getNotes() { return call("GET", "notes"); }
  async function addNote(data) { return call("POST", "notes", data); }
  async function updateNote(id, data) { return call("PUT", `notes?id=${id}`, data); }
  async function deleteNote(id) { return call("DELETE", `notes?id=${id}`); }

  // ── Mood ────────────────────────────────────────────────────────────────────
  async function getMood() { return call("GET", "mood"); }
  async function logMood(data) { return call("POST", "mood", data); }

  // ── Tasks ───────────────────────────────────────────────────────────────────
  async function getTasks() { return call("GET", "tasks"); }
  async function addTask(data) { return call("POST", "tasks", data); }
  async function updateTask(id, data) { return call("PUT", `tasks?id=${id}`, data); }
  async function deleteTask(id) { return call("DELETE", `tasks?id=${id}`); }

  // ── Contacts ────────────────────────────────────────────────────────────────
  async function getContacts() { return call("GET", "contacts"); }
  async function addContact(data) { return call("POST", "contacts", data); }
  async function updateContact(id, data) { return call("PUT", `contacts?id=${id}`, data); }
  async function deleteContact(id) { return call("DELETE", `contacts?id=${id}`); }

  // ── Events ──────────────────────────────────────────────────────────────────
  async function getEvents() { return call("GET", "events"); }
  async function addEvent(data) { return call("POST", "events", data); }
  async function updateEvent(id, data) { return call("PUT", `events?id=${id}`, data); }
  async function deleteEvent(id) { return call("DELETE", `events?id=${id}`); }

  // ── Projects ────────────────────────────────────────────────────────────────
  async function getProjects() { return call("GET", "projects"); }
  async function addProject(data) { return call("POST", "projects", data); }
  async function updateProject(id, data) { return call("PUT", `projects?id=${id}`, data); }
  async function deleteProject(id) { return call("DELETE", `projects?id=${id}`); }

  // ── HDI Score ───────────────────────────────────────────────────────────────
  async function getHDI() { return call("GET", "hdi"); }

  // ── Chat Sessions ───────────────────────────────────────────────────────────
  async function getChatSessions() { return call("GET", "chat"); }
  async function saveChat(sessionId, messages) {
    return call("POST", "chat", { session_id: sessionId, messages });
  }
  async function deleteChat(id) { return call("DELETE", `chat?id=${id}`); }

  // ── Full Snapshot Pull ──────────────────────────────────────────────────────
  async function pullAll() {
    const [identity, habits, goals, notes, tasks, contacts, events, projects, hdi] =
      await Promise.allSettled([
        getIdentity(), getHabits(), getGoals(), getNotes(),
        getTasks(), getContacts(), getEvents(), getProjects(), getHDI()
      ]);

    return {
      ok: true,
      identity:  identity.value?.data  || null,
      habits:    habits.value?.habits   || [],
      habitLogs: habits.value?.logs     || [],
      goals:     goals.value?.data      || [],
      notes:     notes.value?.data      || [],
      tasks:     tasks.value?.data      || [],
      contacts:  contacts.value?.data   || [],
      events:    events.value?.data     || [],
      projects:  projects.value?.data   || [],
      hdi:       hdi.value?.data        || null,
    };
  }

  // ── Export to window ────────────────────────────────────────────────────────
  global.HICloud = {
    getIdentity, saveIdentity,
    getHabits, addHabit, updateHabit, deleteHabit, logHabit,
    getGoals, addGoal, updateGoal, deleteGoal,
    getNotes, addNote, updateNote, deleteNote,
    getMood, logMood,
    getTasks, addTask, updateTask, deleteTask,
    getContacts, addContact, updateContact, deleteContact,
    getEvents, addEvent, updateEvent, deleteEvent,
    getProjects, addProject, updateProject, deleteProject,
    getHDI,
    getChatSessions, saveChat, deleteChat,
    pullAll,
  };

})(typeof window !== "undefined" ? window : global);
