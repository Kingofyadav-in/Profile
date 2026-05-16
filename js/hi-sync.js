"use strict";

/* ======================================================
   hi-sync.js — HI App local backup and restore
   Exports/imports IndexedDB stores as portable JSON.
   Depends on: hi-storage.js
====================================================== */

const HI_SYNC_VERSION = "1.0";
const HI_SYNC_STORES  = ["identity", "personal", "professional", "social", "chat", "tasks", "licenses"];
const HI_SYNC_LS_KEYS = ["ak_pd"];

function hiSyncSetStatus(message, type = "") {
  const el = document.getElementById("hi-sync-status");
  if (!el) return;
  el.textContent = message ?? "";
  el.className   = type ? `hi-sync-status ${type}` : "hi-sync-status";
}

function hiSyncDownload(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function hiExportLocalStorageData() {
  const out = {};
  for (const key of HI_SYNC_LS_KEYS) {
    let raw = null;
    try { raw = localStorage.getItem(key); } catch { /* ignore */ }
    if (raw === null) continue;
    try { out[key] = JSON.parse(raw); } catch { out[key] = raw; }
  }
  return out;
}

function hiImportLocalStorageData(payload) {
  const data = (payload?.localStorage && typeof payload.localStorage === "object")
    ? payload.localStorage : {};
  let imported = 0;
  for (const key of HI_SYNC_LS_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
    try { localStorage.setItem(key, JSON.stringify(data[key])); imported++; } catch { /* ignore */ }
  }
  return imported;
}

async function hiExportAllData() {
  const stores = {};
  for (const name of HI_SYNC_STORES) {
    stores[name] = await hiGetAll(name);
  }

  const identity = stores.identity?.find(item => item?.id === "primary") ?? null;

  return {
    protocol:   "HI-App-Backup",
    version:    HI_SYNC_VERSION,
    app:        "HI App",
    site:       "kingofyadav.in",
    exportedAt: new Date().toISOString(),
    ownerHDI:   identity?.hdi ?? "",
    stores,
    localStorage: hiExportLocalStorageData(),
  };
}

async function hiDownloadAllData() {
  hiSyncSetStatus("Preparing backup…");
  const payload = await hiExportAllData();
  const stamp   = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
  const hdi     = payload.ownerHDI || "HI";
  hiSyncDownload(`hi-app-backup-${hdi}-${stamp}.json`, payload);
  hiSyncSetStatus("Backup exported.");
}

function hiReadJSONFile(file) {
  return new Promise((resolve, reject) => {
    const reader  = new FileReader();
    reader.onload = () => {
      try { resolve(JSON.parse(reader.result)); }
      catch { reject(new Error("Backup file is not valid JSON.")); }
    };
    reader.onerror = () => reject(new Error("Could not read backup file."));
    reader.readAsText(file);
  });
}

function hiValidateBackup(payload) {
  if (!payload || typeof payload !== "object")    throw new Error("Backup is empty.");
  if (payload.protocol !== "HI-App-Backup")       throw new Error("This is not a HI App backup.");
  if (!payload.stores  || typeof payload.stores !== "object") throw new Error("Backup stores are missing.");
}

function hiBuildImportPreview(payload) {
  hiValidateBackup(payload);
  const lines = [];
  let total   = 0;

  for (const name of HI_SYNC_STORES) {
    const records = Array.isArray(payload.stores[name]) ? payload.stores[name] : [];
    const count   = records.filter(r => r?.id).length;
    total += count;
    if (count) lines.push(`${name}: ${count}`);
  }

  const localData = (payload.localStorage && typeof payload.localStorage === "object")
    ? payload.localStorage : {};
  const localKeys = HI_SYNC_LS_KEYS.filter(k => Object.prototype.hasOwnProperty.call(localData, k));
  if (localKeys.length) lines.push(`local personal data: ${localKeys.join(", ")}`);

  return {
    records:      total,
    localStorage: localKeys.length,
    message:      lines.length ? lines.join("\n") : "No importable records found.",
  };
}

async function hiImportAllData(payload, { clearExisting = false } = {}) {
  hiValidateBackup(payload);
  let imported = 0;

  for (const name of HI_SYNC_STORES) {
    const records = Array.isArray(payload.stores[name]) ? payload.stores[name] : [];

    if (clearExisting) {
      const existing = await hiGetAll(name);
      for (const item of existing) {
        if (item?.id) await hiDelete(name, item.id);
      }
    }

    for (const record of records) {
      if (!record?.id) continue;
      await hiPut(name, record);
      imported++;
    }
  }

  return { records: imported, localStorage: hiImportLocalStorageData(payload) };
}

async function hiImportFromFile(file) {
  if (!file) return;
  hiSyncSetStatus("Reading backup…");

  const payload = await hiReadJSONFile(file);
  const preview = hiBuildImportPreview(payload);

  const ok = confirm(
    `Import this HI backup?\n\n${preview.message}\n\nExisting records with the same IDs will be updated.`
  );
  if (!ok) { hiSyncSetStatus("Import cancelled."); return; }

  const result = await hiImportAllData(payload, { clearExisting: false });
  hiSyncSetStatus(`Imported ${result.records} records and ${result.localStorage} local item(s). Refreshing…`);
  setTimeout(() => window.location.reload(), 800);
}

function hiInitSyncControls() {
  const exportBtn   = document.getElementById("hiExportAllBtn");
  const importInput = document.getElementById("hiImportFile");

  exportBtn?.addEventListener("click", () => {
    hiDownloadAllData().catch(err => hiSyncSetStatus(err.message || "Export failed.", "error"));
  });

  importInput?.addEventListener("change", () => {
    const file = importInput.files?.[0];
    hiImportFromFile(file)
      .catch(err => hiSyncSetStatus(err.message || "Import failed.", "error"))
      .finally(() => { importInput.value = ""; });
  });
}

document.addEventListener("DOMContentLoaded", hiInitSyncControls, { once: true });
