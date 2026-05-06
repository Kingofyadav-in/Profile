"use strict";

/* ======================================================
   hi-sync.js — HI App local backup and restore
   Exports/imports IndexedDB stores as portable JSON.
   Depends on: hi-storage.js
====================================================== */

var HI_SYNC_VERSION = "1.0";
var HI_SYNC_STORES = ["identity","personal","professional","social","chat","tasks","licenses"];
var HI_SYNC_LOCAL_STORAGE_KEYS = ["ak_pd"];

function hiSyncSetStatus(message, type) {
  var el = document.getElementById("hi-sync-status");
  if (!el) return;
  el.textContent = message || "";
  el.className = "hi-sync-status" + (type ? " " + type : "");
}

function hiSyncDownload(filename, data) {
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
}

function hiExportLocalStorageData() {
  var data = {};
  for (var i = 0; i < HI_SYNC_LOCAL_STORAGE_KEYS.length; i++) {
    var key = HI_SYNC_LOCAL_STORAGE_KEYS[i];
    var raw = null;
    try { raw = localStorage.getItem(key); }
    catch(e) { raw = null; }
    if (raw === null) continue;

    try { data[key] = JSON.parse(raw); }
    catch(e) { data[key] = raw; }
  }
  return data;
}

function hiImportLocalStorageData(payload) {
  var imported = 0;
  var data = payload && payload.localStorage && typeof payload.localStorage === "object" ? payload.localStorage : {};

  for (var i = 0; i < HI_SYNC_LOCAL_STORAGE_KEYS.length; i++) {
    var key = HI_SYNC_LOCAL_STORAGE_KEYS[i];
    if (!Object.prototype.hasOwnProperty.call(data, key)) continue;

    try {
      localStorage.setItem(key, JSON.stringify(data[key]));
      imported++;
    } catch(e) {}
  }

  return imported;
}

async function hiExportAllData() {
  var stores = {};
  for (var i = 0; i < HI_SYNC_STORES.length; i++) {
    var storeName = HI_SYNC_STORES[i];
    stores[storeName] = await hiGetAll(storeName);
  }

  var identity = stores.identity.find(function(item) { return item && item.id === "primary"; }) || null;
  var payload = {
    protocol: "HI-App-Backup",
    version: HI_SYNC_VERSION,
    app: "HI App",
    site: "kingofyadav.in",
    exportedAt: new Date().toISOString(),
    ownerHDI: identity ? (identity.hdi || "") : "",
    stores: stores,
    localStorage: hiExportLocalStorageData()
  };

  return payload;
}

async function hiDownloadAllData() {
  hiSyncSetStatus("Preparing backup...");
  var payload = await hiExportAllData();
  var stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
  var hdi = payload.ownerHDI || "HI";
  hiSyncDownload("hi-app-backup-" + hdi + "-" + stamp + ".json", payload);
  hiSyncSetStatus("Backup exported.");
}

function hiReadJSONFile(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function() {
      try { resolve(JSON.parse(reader.result)); }
      catch(e) { reject(new Error("Backup file is not valid JSON.")); }
    };
    reader.onerror = function() { reject(new Error("Could not read backup file.")); };
    reader.readAsText(file);
  });
}

function hiValidateBackup(payload) {
  if (!payload || typeof payload !== "object") throw new Error("Backup is empty.");
  if (payload.protocol !== "HI-App-Backup") throw new Error("This is not a HI App backup.");
  if (!payload.stores || typeof payload.stores !== "object") throw new Error("Backup stores are missing.");
}

function hiBuildImportPreview(payload) {
  hiValidateBackup(payload);
  var lines = [];
  var total = 0;

  for (var i = 0; i < HI_SYNC_STORES.length; i++) {
    var storeName = HI_SYNC_STORES[i];
    var records = Array.isArray(payload.stores[storeName]) ? payload.stores[storeName] : [];
    var count = records.filter(function(record) { return record && record.id; }).length;
    total += count;
    if (count) lines.push(storeName + ": " + count);
  }

  var localData = payload.localStorage && typeof payload.localStorage === "object" ? payload.localStorage : {};
  var localKeys = HI_SYNC_LOCAL_STORAGE_KEYS.filter(function(key) {
    return Object.prototype.hasOwnProperty.call(localData, key);
  });
  if (localKeys.length) lines.push("local personal data: " + localKeys.join(", "));

  return {
    records: total,
    localStorage: localKeys.length,
    message: lines.length ? lines.join("\n") : "No importable records found."
  };
}

async function hiImportAllData(payload, options) {
  hiValidateBackup(payload);
  var opts = options || {};
  var imported = 0;

  for (var i = 0; i < HI_SYNC_STORES.length; i++) {
    var storeName = HI_SYNC_STORES[i];
    var records = Array.isArray(payload.stores[storeName]) ? payload.stores[storeName] : [];

    if (opts.clearExisting) {
      var existing = await hiGetAll(storeName);
      for (var d = 0; d < existing.length; d++) {
        if (existing[d] && existing[d].id) await hiDelete(storeName, existing[d].id);
      }
    }

    for (var r = 0; r < records.length; r++) {
      if (!records[r] || !records[r].id) continue;
      await hiPut(storeName, records[r]);
      imported++;
    }
  }

  return {
    records: imported,
    localStorage: hiImportLocalStorageData(payload)
  };
}

async function hiImportFromFile(file) {
  if (!file) return;
  hiSyncSetStatus("Reading backup...");
  var payload = await hiReadJSONFile(file);
  var preview = hiBuildImportPreview(payload);
  var ok = confirm(
    "Import this HI backup?\n\n" +
    preview.message +
    "\n\nExisting records with the same IDs will be updated."
  );
  if (!ok) {
    hiSyncSetStatus("Import cancelled.");
    return;
  }
  var result = await hiImportAllData(payload, { clearExisting: false });
  hiSyncSetStatus("Imported " + result.records + " records and " + result.localStorage + " local item(s). Refreshing...");
  setTimeout(function() { window.location.reload(); }, 800);
}

function hiInitSyncControls() {
  var exportBtn = document.getElementById("hiExportAllBtn");
  var importInput = document.getElementById("hiImportFile");

  if (exportBtn) {
    exportBtn.addEventListener("click", function() {
      hiDownloadAllData().catch(function(err) {
        hiSyncSetStatus(err.message || "Export failed.", "error");
      });
    });
  }

  if (importInput) {
    importInput.addEventListener("change", function() {
      var file = importInput.files && importInput.files[0];
      hiImportFromFile(file).catch(function(err) {
        hiSyncSetStatus(err.message || "Import failed.", "error");
      }).finally(function() {
        importInput.value = "";
      });
    });
  }
}

document.addEventListener("DOMContentLoaded", hiInitSyncControls);
