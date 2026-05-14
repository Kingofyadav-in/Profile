"use strict";

/* ======================================================
   hi-storage.js — IndexedDB wrapper for HI App
   Stores: identity | personal | professional | social
           chat | tasks | licenses
====================================================== */

const HI_DB_NAME    = "hi_app";
const HI_DB_VERSION = 5;
const HI_STORES     = ["identity","personal","professional","social","chat","tasks","licenses","wallet"];
HI_STORES.push("merchant", "marketplace", "vault", "identityKeys", "deviceTrust");

var _hiDb = null;
var _hiDbUnavailable = false;

function hiFallbackKey(store, id) {
  return HI_DB_NAME + ":fallback:" + store + ":" + id;
}

function hiFallbackGet(store, id) {
  try {
    var raw = localStorage.getItem(hiFallbackKey(store, id));
    return Promise.resolve(raw ? JSON.parse(raw) : null);
  } catch (e) {
    return Promise.resolve(null);
  }
}

function hiFallbackGetAll(store) {
  var out = [];
  try {
    var prefix = HI_DB_NAME + ":fallback:" + store + ":";
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.indexOf(prefix) === 0) {
        try { out.push(JSON.parse(localStorage.getItem(key))); } catch (e) {}
      }
    }
  } catch (e) {}
  return Promise.resolve(out);
}

function hiFallbackPut(store, item) {
  try {
    if (!item || !item.id) return Promise.reject(new Error("Missing item id"));
    localStorage.setItem(hiFallbackKey(store, item.id), JSON.stringify(item));
    return Promise.resolve(item.id);
  } catch (e) {
    return Promise.reject(e);
  }
}

function hiFallbackDelete(store, id) {
  try { localStorage.removeItem(hiFallbackKey(store, id)); } catch (e) {}
  return Promise.resolve(true);
}

function hiOpenDB() {
  if (_hiDb) return Promise.resolve(_hiDb);
  if (_hiDbUnavailable || !window.indexedDB) return Promise.reject(new Error("IndexedDB unavailable"));
  return new Promise(function(resolve, reject) {
    var req = indexedDB.open(HI_DB_NAME, HI_DB_VERSION);

    req.onupgradeneeded = function(e) {
      var db = e.target.result;
      HI_STORES.forEach(function(name) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: "id" });
        }
      });
    };

    req.onsuccess = function(e) {
      _hiDb = e.target.result;
      _hiDb.onversionchange = function() {
        try { _hiDb.close(); } catch (err) {}
        _hiDb = null;
      };
      resolve(_hiDb);
    };

    req.onerror = function(e) {
      _hiDbUnavailable = true;
      reject(e.target.error);
    };

    req.onblocked = function() {
      _hiDbUnavailable = true;
      reject(new Error("IndexedDB upgrade blocked. Close other HI tabs and reload."));
    };
  });
}

function hiGet(store, id) {
  return hiOpenDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var req = db.transaction(store, "readonly").objectStore(store).get(id);
      req.onsuccess = function() { resolve(req.result || null); };
      req.onerror  = function() { reject(req.error); };
    });
  }).then(function(result) {
    return result || hiFallbackGet(store, id);
  }).catch(function() {
    return hiFallbackGet(store, id);
  });
}

function hiGetAll(store) {
  return hiOpenDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var req = db.transaction(store, "readonly").objectStore(store).getAll();
      req.onsuccess = function() { resolve(req.result || []); };
      req.onerror  = function() { reject(req.error); };
    });
  }).then(function(results) {
    return hiFallbackGetAll(store).then(function(fallbackResults) {
      var seen = {};
      var merged = [];
      (results || []).concat(fallbackResults || []).forEach(function(item) {
        if (!item || !item.id || seen[item.id]) return;
        seen[item.id] = true;
        merged.push(item);
      });
      return merged;
    });
  }).catch(function() {
    return hiFallbackGetAll(store);
  });
}

function hiPut(store, item) {
  return hiOpenDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var req = db.transaction(store, "readwrite").objectStore(store).put(item);
      req.onsuccess = function() { resolve(req.result); };
      req.onerror  = function() { reject(req.error); };
    });
  }).then(function(result) {
    hiFallbackPut(store, item).catch(function() {});
    return result;
  }).catch(function() {
    return hiFallbackPut(store, item);
  });
}

function hiDelete(store, id) {
  return hiOpenDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var req = db.transaction(store, "readwrite").objectStore(store).delete(id);
      req.onsuccess = function() { resolve(true); };
      req.onerror  = function() { reject(req.error); };
    });
  }).then(function(result) {
    hiFallbackDelete(store, id);
    return result;
  }).catch(function() {
    return hiFallbackDelete(store, id);
  });
}

function hiGenId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
