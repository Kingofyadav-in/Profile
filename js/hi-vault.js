"use strict";

/* ======================================================
   hi-vault.js
   Encrypted local backup + recovery for HI Wallet ecosystem
   Depends on: auth.js, hi-storage.js, hi-app.js
====================================================== */

var HI_VAULT_STORE_LIST = ["identity", "identityKeys", "deviceTrust", "wallet", "merchant", "marketplace", "licenses", "personal", "professional", "social", "tasks"];
var HI_VAULT_META_ID = "primary";
var HI_VAULT_ITERATIONS = 250000;

function hiVaultEsc(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hiVaultText(id, value) {
  var el = document.getElementById(id);
  if (el) el.textContent = value;
}

function hiVaultStatus(id, message, type) {
  var el = document.getElementById(id);
  if (!el) return;
  el.textContent = message || "";
  el.className = "vault-status" + (type ? " " + type : "");
}

function hiVaultBytesToBase64(bytes) {
  var str = "";
  bytes.forEach(function(byte) { str += String.fromCharCode(byte); });
  return btoa(str);
}

function hiVaultBase64ToBytes(base64) {
  var str = atob(base64);
  var bytes = new Uint8Array(str.length);
  for (var i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}

function hiVaultRandomBytes(length) {
  var bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function hiVaultRecoveryKey() {
  if (typeof hiCryptoGenerateRecoveryPhrase === "function") {
    return hiCryptoGenerateRecoveryPhrase(12);
  }
  var alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  var bytes = hiVaultRandomBytes(24);
  var chars = [];
  for (var i = 0; i < bytes.length; i++) chars.push(alphabet[bytes[i] % alphabet.length]);
  return chars.join("").match(/.{1,4}/g).join("-");
}

async function hiVaultHash(value) {
  var enc = new TextEncoder();
  var buf = await crypto.subtle.digest("SHA-256", enc.encode(String(value || "")));
  return Array.from(new Uint8Array(buf)).map(function(b) {
    return b.toString(16).padStart(2, "0");
  }).join("");
}

async function hiVaultDeriveKey(passphrase, recoveryKey, saltBytes) {
  var enc = new TextEncoder();
  var material = await crypto.subtle.importKey(
    "raw",
    enc.encode(String(passphrase || "") + "|" + String(recoveryKey || "")),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBytes, iterations: HI_VAULT_ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function hiVaultCollectStores() {
  var stores = {};
  for (var i = 0; i < HI_VAULT_STORE_LIST.length; i++) {
    var store = HI_VAULT_STORE_LIST[i];
    try { stores[store] = await hiGetAll(store); }
    catch (e) { stores[store] = []; }
  }
  return stores;
}

function hiVaultCountRecords(stores) {
  return Object.keys(stores || {}).reduce(function(total, key) {
    return total + ((stores[key] || []).length);
  }, 0);
}

async function hiVaultLoadMeta() {
  try { return await hiGet("vault", HI_VAULT_META_ID); }
  catch (e) { return null; }
}

async function hiVaultSaveMeta(meta) {
  meta.id = HI_VAULT_META_ID;
  meta.updatedAt = Date.now();
  if (!meta.createdAt) meta.createdAt = Date.now();
  await hiPut("vault", meta);
  return meta;
}

function hiVaultDownload(name, content) {
  var blob = new Blob([content], { type: "application/json" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function hiVaultEncryptBackup(passphrase, recoveryKey, identity) {
  var stores = await hiVaultCollectStores();
  var payload = {
    product: "HI Vault",
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    identityHdi: identity && identity.hdi ? identity.hdi : "",
    offlineCache: "IndexedDB",
    stores: stores
  };
  var plain = new TextEncoder().encode(JSON.stringify(payload));
  var salt = hiVaultRandomBytes(16);
  var iv = hiVaultRandomBytes(12);
  var key = await hiVaultDeriveKey(passphrase, recoveryKey, salt);
  var encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, plain);
  return {
    product: "HI Vault",
    encrypted: true,
    algorithm: "AES-GCM",
    kdf: "PBKDF2-SHA256",
    iterations: HI_VAULT_ITERATIONS,
    createdAt: new Date().toISOString(),
    salt: hiVaultBytesToBase64(salt),
    iv: hiVaultBytesToBase64(iv),
    data: hiVaultBytesToBase64(new Uint8Array(encrypted))
  };
}

async function hiVaultDecryptBackup(fileText, passphrase, recoveryKey) {
  var backup;
  try {
    backup = JSON.parse(fileText);
  } catch (e) {
    throw new Error("Backup file is not valid JSON.");
  }
  if (!backup || backup.product !== "HI Vault" || !backup.encrypted) {
    throw new Error("Invalid HI Vault backup file.");
  }
  var salt = hiVaultBase64ToBytes(backup.salt);
  var iv = hiVaultBase64ToBytes(backup.iv);
  var data = hiVaultBase64ToBytes(backup.data);
  var key = await hiVaultDeriveKey(passphrase, recoveryKey, salt);
  var decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, data);
  return JSON.parse(new TextDecoder().decode(decrypted));
}

async function hiVaultRestorePayload(payload) {
  if (!payload || !payload.stores) throw new Error("Backup payload has no stores.");
  var restored = 0;
  for (var i = 0; i < HI_VAULT_STORE_LIST.length; i++) {
    var store = HI_VAULT_STORE_LIST[i];
    var records = payload.stores[store] || [];
    for (var j = 0; j < records.length; j++) {
      if (records[j] && records[j].id) {
        await hiPut(store, records[j]);
        restored++;
      }
    }
  }
  return restored;
}

function hiVaultRenderStoreList(stores) {
  var list = document.getElementById("vaultStoreList");
  if (!list) return;
  list.innerHTML = HI_VAULT_STORE_LIST.map(function(store) {
    var count = stores && stores[store] ? stores[store].length : 0;
    return '<article class="vault-row"><div><strong>' + hiVaultEsc(store) + '</strong><small>IndexedDB offline cache</small></div><strong>' + hiVaultEsc(count) + '</strong></article>';
  }).join("");
}

async function hiVaultRender(identity) {
  var stores = await hiVaultCollectStores();
  var meta = await hiVaultLoadMeta();
  hiVaultText("vaultIdentity", identity && identity.hdi ? identity.hdi : "Identity required");
  hiVaultText("vaultRecordCount", String(hiVaultCountRecords(stores)));
  hiVaultText("vaultStoreCount", String(HI_VAULT_STORE_LIST.length));
  hiVaultText("vaultLastExport", meta && meta.lastExportAt ? new Date(meta.lastExportAt).toLocaleString("en-IN") : "Never");
  hiVaultText("vaultRecoveryStatus", meta && meta.recoveryKeyHash ? "Recovery key registered" : "Not generated");
  hiVaultRenderStoreList(stores);
}

async function hiVaultInit() {
  if (!window.crypto || !crypto.subtle || !window.TextEncoder || !window.TextDecoder) {
    hiVaultStatus("vaultExportStatus", "This browser does not support required Web Crypto features.", "error");
    return;
  }

  try { await hiOpenDB(); } catch (e) {}
  var userEl = document.getElementById("authUserDisplay");
  if (userEl && typeof getAuthUser === "function") userEl.textContent = getAuthUser() || "";
  var logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn && typeof logout === "function") logoutBtn.addEventListener("click", logout);

  var identity = typeof hiLoadIdentity === "function" ? await hiLoadIdentity() : null;
  if (!identity || !identity.hdi) {
    var locked = document.getElementById("vaultLocked");
    if (locked) locked.classList.add("active");
  }
  await hiVaultRender(identity);

  var keyBtn = document.getElementById("vaultGenerateKey");
  if (keyBtn) keyBtn.addEventListener("click", async function() {
    var key = hiVaultRecoveryKey();
    var out = document.getElementById("vaultRecoveryKey");
    if (out) out.textContent = key;
    await hiVaultSaveMeta({
      recoveryKeyHash: await hiVaultHash(key),
      recoveryKeyCreatedAt: Date.now()
    });
    await hiVaultRender(identity);
    hiVaultStatus("vaultKeyStatus", "Recovery phrase generated. Store it offline before exporting backup.", "success");
  });

  var copyBtn = document.getElementById("vaultCopyKey");
  if (copyBtn) copyBtn.addEventListener("click", async function() {
    var key = document.getElementById("vaultRecoveryKey");
    if (!key || !key.textContent || key.textContent === "Generate a recovery phrase") {
      hiVaultStatus("vaultKeyStatus", "Generate a recovery phrase first.", "error");
      return;
    }
    try {
      await navigator.clipboard.writeText(key.textContent);
      hiVaultStatus("vaultKeyStatus", "Recovery phrase copied.", "success");
    } catch (e) {
      hiVaultStatus("vaultKeyStatus", "Copy failed. Select and copy the key manually.", "error");
    }
  });

  var exportForm = document.getElementById("vaultExportForm");
  if (exportForm) exportForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    hiVaultStatus("vaultExportStatus", "", "");
    var pass = document.getElementById("vaultExportPassphrase");
    var keyEl = document.getElementById("vaultRecoveryKey");
    var passphrase = pass ? pass.value : "";
    var recoveryKey = keyEl ? keyEl.textContent.trim() : "";
    if (passphrase.length < 8) {
      hiVaultStatus("vaultExportStatus", "Use a passphrase with at least 8 characters.", "error");
      return;
    }
    if (!recoveryKey || recoveryKey === "Generate a recovery phrase") {
      hiVaultStatus("vaultExportStatus", "Generate a recovery phrase before exporting.", "error");
      return;
    }
    try {
      var backup = await hiVaultEncryptBackup(passphrase, recoveryKey, identity);
      hiVaultDownload("hi-vault-" + String(identity && identity.hdi ? identity.hdi : "backup").toLowerCase() + ".hivault.json", JSON.stringify(backup, null, 2));
      var meta = await hiVaultLoadMeta() || {};
      meta.lastExportAt = Date.now();
      meta.lastExportHash = await hiVaultHash(backup.data);
      await hiVaultSaveMeta(meta);
      if (pass) pass.value = "";
      await hiVaultRender(identity);
      hiVaultStatus("vaultExportStatus", "Encrypted HI Vault backup exported.", "success");
    } catch (err) {
      hiVaultStatus("vaultExportStatus", "Backup export failed: " + err.message, "error");
    }
  });

  var importForm = document.getElementById("vaultImportForm");
  if (importForm) importForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    hiVaultStatus("vaultImportStatus", "", "");
    var fileEl = document.getElementById("vaultImportFile");
    var passEl = document.getElementById("vaultImportPassphrase");
    var keyEl = document.getElementById("vaultImportRecoveryKey");
    var file = fileEl && fileEl.files ? fileEl.files[0] : null;
    if (!file) {
      hiVaultStatus("vaultImportStatus", "Choose a HI Vault backup file.", "error");
      return;
    }
    try {
      var text = await file.text();
      var payload = await hiVaultDecryptBackup(text, passEl ? passEl.value : "", keyEl ? keyEl.value.trim() : "");
      var currentIdentity = typeof hiLoadIdentity === "function" ? await hiLoadIdentity() : null;
      if (currentIdentity && currentIdentity.hdi && payload.identityHdi && currentIdentity.hdi !== payload.identityHdi) {
        if (!confirm("This backup belongs to a different identity (" + payload.identityHdi + "). Restoring will overwrite your current data. Continue?")) {
          hiVaultStatus("vaultImportStatus", "Import cancelled.", "");
          return;
        }
      }
      var restored = await hiVaultRestorePayload(payload);
      var meta = await hiVaultLoadMeta() || {};
      meta.lastImportAt = Date.now();
      meta.lastImportIdentity = payload.identityHdi || "";
      await hiVaultSaveMeta(meta);
      if (passEl) passEl.value = "";
      if (keyEl) keyEl.value = "";
      await hiVaultRender(await hiLoadIdentity());
      hiVaultStatus("vaultImportStatus", "Restored " + restored + " records into IndexedDB offline cache.", "success");
    } catch (err) {
      hiVaultStatus("vaultImportStatus", "Import failed. Check file, passphrase, and recovery phrase.", "error");
    }
  });
}

document.addEventListener("DOMContentLoaded", hiVaultInit);
