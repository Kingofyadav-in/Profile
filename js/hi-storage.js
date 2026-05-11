"use strict";

/* ======================================================
   hi-storage.js — IndexedDB wrapper for HI App
   Stores: identity | personal | professional | social
           chat | tasks | licenses
====================================================== */

const HI_DB_NAME    = "hi_app";
const HI_DB_VERSION = 2;
const HI_STORES     = ["identity","personal","professional","social","chat","tasks","licenses","wallet"];

var _hiDb = null;

function hiOpenDB() {
  if (_hiDb) return Promise.resolve(_hiDb);
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
      resolve(_hiDb);
    };

    req.onerror = function(e) {
      reject(e.target.error);
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
  });
}

function hiGetAll(store) {
  return hiOpenDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var req = db.transaction(store, "readonly").objectStore(store).getAll();
      req.onsuccess = function() { resolve(req.result || []); };
      req.onerror  = function() { reject(req.error); };
    });
  });
}

function hiPut(store, item) {
  return hiOpenDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var req = db.transaction(store, "readwrite").objectStore(store).put(item);
      req.onsuccess = function() { resolve(req.result); };
      req.onerror  = function() { reject(req.error); };
    });
  });
}

function hiDelete(store, id) {
  return hiOpenDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var req = db.transaction(store, "readwrite").objectStore(store).delete(id);
      req.onsuccess = function() { resolve(true); };
      req.onerror  = function() { reject(req.error); };
    });
  });
}

function hiGenId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
