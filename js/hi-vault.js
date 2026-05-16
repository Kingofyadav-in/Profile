"use strict";

/* ======================================================
   hi-vault.js
   Encrypted local backup + recovery for HI Wallet ecosystem
   Depends on: auth.js, hi-storage.js, hi-app.js
====================================================== */

const HI_VAULT_STORE_LIST = ["identity", "identityKeys", "deviceTrust", "wallet", "merchant", "marketplace", "licenses", "personal", "professional", "social", "tasks"];
const HI_VAULT_META_ID    = "primary";
const HI_VAULT_ITERATIONS = 250_000;

/* ── UI helpers ── */

function hiVaultEsc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hiVaultText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function hiVaultStatus(id, message, type = "") {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message ?? "";
  el.className   = type ? `vault-status ${type}` : "vault-status";
}

/* ── Binary helpers ── */

function hiVaultBytesToBase64(bytes) {
  let str = "";
  bytes.forEach(byte => { str += String.fromCharCode(byte); });
  return btoa(str);
}

function hiVaultBase64ToBytes(base64) {
  const str   = atob(base64);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}

function hiVaultRandomBytes(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function hiVaultRecoveryKey() {
  if (typeof hiCryptoGenerateRecoveryPhrase === "function") {
    return hiCryptoGenerateRecoveryPhrase(12);
  }
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes    = hiVaultRandomBytes(24);
  return Array.from(bytes).map(b => alphabet[b % alphabet.length]).join("").match(/.{1,4}/g).join("-");
}

async function hiVaultHash(value) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(value ?? "")));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

/* ── KDF ── */

async function hiVaultDeriveKey(passphrase, recoveryKey, saltBytes) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`${passphrase ?? ""}|${recoveryKey ?? ""}`),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBytes, iterations: HI_VAULT_ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/* ── Store collection ── */

async function hiVaultCollectStores() {
  const stores = {};
  for (const store of HI_VAULT_STORE_LIST) {
    try { stores[store] = await hiGetAll(store); }
    catch { stores[store] = []; }
  }
  return stores;
}

function hiVaultCountRecords(stores) {
  return Object.values(stores ?? {}).reduce((total, arr) => total + (arr?.length ?? 0), 0);
}

/* ── Vault meta ── */

async function hiVaultLoadMeta() {
  try { return await hiGet("vault", HI_VAULT_META_ID); }
  catch { return null; }
}

async function hiVaultSaveMeta(meta) {
  meta.id        = HI_VAULT_META_ID;
  meta.updatedAt = Date.now();
  if (!meta.createdAt) meta.createdAt = Date.now();
  await hiPut("vault", meta);
  return meta;
}

/* ── File download ── */

function hiVaultDownload(name, content) {
  const blob = new Blob([content], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ── Encrypt / decrypt ── */

async function hiVaultEncryptBackup(passphrase, recoveryKey, identity) {
  const stores  = await hiVaultCollectStores();
  const payload = {
    product:       "HI Vault",
    schemaVersion: 1,
    exportedAt:    new Date().toISOString(),
    identityHdi:   identity?.hdi ?? "",
    offlineCache:  "IndexedDB",
    stores,
  };
  const plain     = new TextEncoder().encode(JSON.stringify(payload));
  const salt      = hiVaultRandomBytes(16);
  const iv        = hiVaultRandomBytes(12);
  const key       = await hiVaultDeriveKey(passphrase, recoveryKey, salt);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);
  return {
    product:    "HI Vault",
    encrypted:  true,
    algorithm:  "AES-GCM",
    kdf:        "PBKDF2-SHA256",
    iterations: HI_VAULT_ITERATIONS,
    createdAt:  new Date().toISOString(),
    salt:       hiVaultBytesToBase64(salt),
    iv:         hiVaultBytesToBase64(iv),
    data:       hiVaultBytesToBase64(new Uint8Array(encrypted)),
  };
}

async function hiVaultDecryptBackup(fileText, passphrase, recoveryKey) {
  let backup;
  try { backup = JSON.parse(fileText); }
  catch { throw new Error("Backup file is not valid JSON."); }
  if (!backup || backup.product !== "HI Vault" || !backup.encrypted) throw new Error("Invalid HI Vault backup file.");
  const salt      = hiVaultBase64ToBytes(backup.salt);
  const iv        = hiVaultBase64ToBytes(backup.iv);
  const data      = hiVaultBase64ToBytes(backup.data);
  const key       = await hiVaultDeriveKey(passphrase, recoveryKey, salt);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return JSON.parse(new TextDecoder().decode(decrypted));
}

async function hiVaultRestorePayload(payload) {
  if (!payload?.stores) throw new Error("Backup payload has no stores.");
  let restored = 0;
  for (const store of HI_VAULT_STORE_LIST) {
    const records = payload.stores[store] ?? [];
    for (const record of records) {
      if (record?.id) { await hiPut(store, record); restored++; }
    }
  }
  return restored;
}

/* ── Render ── */

function hiVaultRenderStoreList(stores) {
  const list = document.getElementById("vaultStoreList");
  if (!list) return;
  list.innerHTML = HI_VAULT_STORE_LIST.map(store => {
    const count = stores?.[store]?.length ?? 0;
    return `<article class="vault-row"><div><strong>${hiVaultEsc(store)}</strong><small>IndexedDB offline cache</small></div><strong>${hiVaultEsc(count)}</strong></article>`;
  }).join("");
}

async function hiVaultRender(identity) {
  const stores = await hiVaultCollectStores();
  const meta   = await hiVaultLoadMeta();
  hiVaultText("vaultIdentity",       identity?.hdi       ? identity.hdi : "Identity required");
  hiVaultText("vaultRecordCount",    String(hiVaultCountRecords(stores)));
  hiVaultText("vaultStoreCount",     String(HI_VAULT_STORE_LIST.length));
  hiVaultText("vaultLastExport",     meta?.lastExportAt  ? new Date(meta.lastExportAt).toLocaleString("en-IN") : "Never");
  hiVaultText("vaultRecoveryStatus", meta?.recoveryKeyHash ? "Recovery key registered" : "Not generated");
  hiVaultRenderStoreList(stores);
}

/* ── Init ── */

async function hiVaultInit() {
  if (!window.crypto?.subtle || !window.TextEncoder || !window.TextDecoder) {
    hiVaultStatus("vaultExportStatus", "This browser does not support required Web Crypto features.", "error");
    return;
  }

  try { await hiOpenDB(); } catch { /* degraded mode */ }

  const userEl = document.getElementById("authUserDisplay");
  if (userEl && typeof getAuthUser === "function") userEl.textContent = getAuthUser() ?? "";
  document.getElementById("logoutBtn")?.addEventListener("click", () => typeof logout === "function" && logout());

  const identity = typeof hiLoadIdentity === "function" ? await hiLoadIdentity() : null;
  if (!identity?.hdi) document.getElementById("vaultLocked")?.classList.add("active");
  await hiVaultRender(identity);

  document.getElementById("vaultGenerateKey")?.addEventListener("click", async () => {
    const key = hiVaultRecoveryKey();
    const out = document.getElementById("vaultRecoveryKey");
    if (out) out.textContent = key;
    await hiVaultSaveMeta({ recoveryKeyHash: await hiVaultHash(key), recoveryKeyCreatedAt: Date.now() });
    await hiVaultRender(identity);
    hiVaultStatus("vaultKeyStatus", "Recovery phrase generated. Store it offline before exporting backup.", "success");
  });

  document.getElementById("vaultCopyKey")?.addEventListener("click", async () => {
    const key = document.getElementById("vaultRecoveryKey");
    if (!key?.textContent || key.textContent === "Generate a recovery phrase") {
      hiVaultStatus("vaultKeyStatus", "Generate a recovery phrase first.", "error");
      return;
    }
    try {
      await navigator.clipboard.writeText(key.textContent);
      hiVaultStatus("vaultKeyStatus", "Recovery phrase copied.", "success");
    } catch {
      hiVaultStatus("vaultKeyStatus", "Copy failed. Select and copy the key manually.", "error");
    }
  });

  document.getElementById("vaultExportForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    hiVaultStatus("vaultExportStatus", "", "");
    const passphrase  = document.getElementById("vaultExportPassphrase")?.value ?? "";
    const recoveryKey = (document.getElementById("vaultRecoveryKey")?.textContent ?? "").trim();
    if (passphrase.length < 8) {
      hiVaultStatus("vaultExportStatus", "Use a passphrase with at least 8 characters.", "error");
      return;
    }
    if (!recoveryKey || recoveryKey === "Generate a recovery phrase") {
      hiVaultStatus("vaultExportStatus", "Generate a recovery phrase before exporting.", "error");
      return;
    }
    try {
      const backup   = await hiVaultEncryptBackup(passphrase, recoveryKey, identity);
      const hdiSlug  = String(identity?.hdi ?? "backup").toLowerCase();
      hiVaultDownload(`hi-vault-${hdiSlug}.hivault.json`, JSON.stringify(backup, null, 2));
      const meta = (await hiVaultLoadMeta()) ?? {};
      meta.lastExportAt   = Date.now();
      meta.lastExportHash = await hiVaultHash(backup.data);
      await hiVaultSaveMeta(meta);
      const passEl = document.getElementById("vaultExportPassphrase");
      if (passEl) passEl.value = "";
      await hiVaultRender(identity);
      hiVaultStatus("vaultExportStatus", "Encrypted HI Vault backup exported.", "success");
    } catch (err) {
      hiVaultStatus("vaultExportStatus", `Backup export failed: ${err.message}`, "error");
    }
  });

  document.getElementById("vaultImportForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    hiVaultStatus("vaultImportStatus", "", "");
    const fileEl = document.getElementById("vaultImportFile");
    const file   = fileEl?.files?.[0];
    if (!file) { hiVaultStatus("vaultImportStatus", "Choose a HI Vault backup file.", "error"); return; }
    try {
      const text     = await file.text();
      const passphrase   = document.getElementById("vaultImportPassphrase")?.value ?? "";
      const recoveryKey  = (document.getElementById("vaultImportRecoveryKey")?.value ?? "").trim();
      const payload  = await hiVaultDecryptBackup(text, passphrase, recoveryKey);
      const currentIdentity = typeof hiLoadIdentity === "function" ? await hiLoadIdentity() : null;
      if (currentIdentity?.hdi && payload.identityHdi && currentIdentity.hdi !== payload.identityHdi) {
        if (!confirm(`This backup belongs to a different identity (${payload.identityHdi}). Restoring will overwrite your current data. Continue?`)) {
          hiVaultStatus("vaultImportStatus", "Import cancelled.", "");
          return;
        }
      }
      const restored = await hiVaultRestorePayload(payload);
      const meta     = (await hiVaultLoadMeta()) ?? {};
      meta.lastImportAt       = Date.now();
      meta.lastImportIdentity = payload.identityHdi ?? "";
      await hiVaultSaveMeta(meta);
      const passEl = document.getElementById("vaultImportPassphrase");
      const keyEl  = document.getElementById("vaultImportRecoveryKey");
      if (passEl) passEl.value = "";
      if (keyEl)  keyEl.value  = "";
      await hiVaultRender(await hiLoadIdentity());
      hiVaultStatus("vaultImportStatus", `Restored ${restored} records into IndexedDB offline cache.`, "success");
    } catch {
      hiVaultStatus("vaultImportStatus", "Import failed. Check file, passphrase, and recovery phrase.", "error");
    }
  });
}

document.addEventListener("DOMContentLoaded", hiVaultInit, { once: true });
