"use strict";

/* ======================================================
   hi-storage.js — IndexedDB wrapper for HI App
   All stores use { id } as keyPath.
   Falls back to localStorage if IndexedDB is unavailable.
   Depends on: nothing (standalone foundation module)
====================================================== */

const HI_DB_NAME    = "hi_app";
const HI_DB_VERSION = 5;
const HI_STORES     = [
  "identity", "personal", "professional", "social",
  "chat", "tasks", "licenses", "wallet",
  "merchant", "marketplace", "vault", "identityKeys", "deviceTrust",
];

let _hiDb            = null;
let _hiDbUnavailable = false;

/* ── Fallback helpers (localStorage) ── */

function hiFallbackKey(store, id) {
  return `${HI_DB_NAME}:fallback:${store}:${id}`;
}

function hiFallbackGet(store, id) {
  try {
    const raw = localStorage.getItem(hiFallbackKey(store, id));
    return Promise.resolve(raw ? JSON.parse(raw) : null);
  } catch (_) {
    return Promise.resolve(null);
  }
}

function hiFallbackGetAll(store) {
  const out    = [];
  const prefix = `${HI_DB_NAME}:fallback:${store}:`;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) {
        try { out.push(JSON.parse(localStorage.getItem(key))); } catch (_) {}
      }
    }
  } catch (_) {}
  return Promise.resolve(out);
}

function hiFallbackPut(store, item) {
  if (!item?.id) return Promise.reject(new Error("hi-storage: item.id is required"));
  try {
    localStorage.setItem(hiFallbackKey(store, item.id), JSON.stringify(item));
    return Promise.resolve(item.id);
  } catch (e) {
    return Promise.reject(e);
  }
}

function hiFallbackDelete(store, id) {
  try { localStorage.removeItem(hiFallbackKey(store, id)); } catch (_) {}
  return Promise.resolve(true);
}

/* ── IndexedDB open ── */

function hiOpenDB() {
  if (_hiDb) return Promise.resolve(_hiDb);
  if (_hiDbUnavailable || !window.indexedDB) {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(HI_DB_NAME, HI_DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      HI_STORES.forEach(name => {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: "id" });
        }
      });
    };

    req.onsuccess = (e) => {
      _hiDb = e.target.result;
      _hiDb.onversionchange = () => {
        try { _hiDb.close(); } catch (_) {}
        _hiDb = null;
      };
      _hiDb.onerror = (ev) => {
        console.warn("[hi-storage] IDB error:", ev.target.error);
      };
      resolve(_hiDb);
    };

    req.onerror = (e) => {
      _hiDbUnavailable = true;
      reject(e.target.error);
    };

    req.onblocked = () => {
      _hiDbUnavailable = true;
      reject(new Error("IndexedDB upgrade blocked — close other HI tabs and reload."));
    };
  });
}

/* ── Public CRUD API ── */

function hiGet(store, id) {
  return hiOpenDB()
    .then(db => new Promise((resolve, reject) => {
      const req = db.transaction(store, "readonly").objectStore(store).get(id);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror   = () => reject(req.error);
    }))
    .then(result => result ?? hiFallbackGet(store, id))
    .catch(() => hiFallbackGet(store, id));
}

function hiGetAll(store) {
  return hiOpenDB()
    .then(db => new Promise((resolve, reject) => {
      const req = db.transaction(store, "readonly").objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror   = () => reject(req.error);
    }))
    .then(results => hiFallbackGetAll(store).then(fallback => {
      const seen   = new Set();
      const merged = [];
      for (const item of [...(results ?? []), ...fallback]) {
        if (!item?.id || seen.has(item.id)) continue;
        seen.add(item.id);
        merged.push(item);
      }
      return merged;
    }))
    .catch(() => hiFallbackGetAll(store));
}

function hiPut(store, item) {
  if (!item?.id) return Promise.reject(new Error("hi-storage: item.id is required"));
  return hiOpenDB()
    .then(db => new Promise((resolve, reject) => {
      const req = db.transaction(store, "readwrite").objectStore(store).put(item);
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    }))
    .then(result => hiFallbackPut(store, item).catch(() => null).then(() => result))
    .catch(() => hiFallbackPut(store, item));
}

function hiDelete(store, id) {
  return hiOpenDB()
    .then(db => new Promise((resolve, reject) => {
      const req = db.transaction(store, "readwrite").objectStore(store).delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror   = () => reject(req.error);
    }))
    .then(result => { hiFallbackDelete(store, id); return result; })
    .catch(() => hiFallbackDelete(store, id));
}

/** Generate a unique ID (timestamp + random, base-36). */
function hiGenId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Today's date string YYYY-MM-DD in local time. */
function hiTodayDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
