"use strict";

/* ======================================================
   hi-wallet.js
   Identity-bound local HI Coin wallet
   Depends on: auth.js, hi-storage.js, hi-app.js
====================================================== */

const HI_WALLET_MAX_SUPPLY    = 99;
const HI_WALLET_GENESIS_AMOUNT = 1;
let   _hiWalletRecoveryPhrase  = "";

/* ── Device ── */

function hiWalletDeviceId() {
  try {
    const existing = localStorage.getItem("ak_device_id");
    if (existing) return existing;
    const generated = `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem("ak_device_id", generated);
    return generated;
  } catch {
    return `dev_${Date.now().toString(36)}`;
  }
}

function hiWalletSimpleHash(str) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0");
}

async function hiWalletHash(str) {
  if (window.crypto?.subtle && window.TextEncoder) {
    try {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    } catch { /* fallback */ }
  }
  return hiWalletSimpleHash(str);
}

async function hiWalletFingerprint(identity) {
  const parts = [
    hiWalletDeviceId(),
    identity?.hdi ?? "",
    navigator.userAgent ?? "",
    navigator.language ?? "",
    navigator.platform ?? "",
    String(new Date().getTimezoneOffset()),
    screen ? [screen.width, screen.height, screen.colorDepth].join("x") : "",
  ];
  return hiWalletHash(parts.join("|"));
}

const hiWalletAddress  = hdi => `hiw_${String(hdi ?? "pending").replace(/[^A-Z0-9-]/gi, "").toLowerCase()}`;
const hiWalletId       = hdi => `wallet:${hdi}`;
const hiWalletDevTrustId = (hdi, fp) => `device:${hdi}:${String(fp ?? "").slice(0, 24)}`;

/* ── Device trust ── */

async function hiWalletRegisterDeviceTrust(identity, fingerprint) {
  const id       = hiWalletDevTrustId(identity.hdi, fingerprint);
  const existing = await hiGet("deviceTrust", id);
  const now      = Date.now();
  const trust    = Object.assign({}, existing ?? {}, {
    id,
    hdi:             identity.hdi,
    legacyHdi:       identity.legacyHdi ?? "",
    deviceId:        hiWalletDeviceId(),
    fingerprint,
    userAgent:       navigator.userAgent ?? "",
    language:        navigator.language  ?? "",
    platform:        navigator.platform  ?? "",
    timezoneOffset:  new Date().getTimezoneOffset(),
    screen:          screen ? [screen.width, screen.height, screen.colorDepth].join("x") : "",
    trusted:         existing ? existing.trusted === true : false,
    riskScore:       existing ? Math.max(25, Number(existing.riskScore ?? 75)) : 35,
    lastSeen:        now,
    updatedAt:       now,
  });
  if (!trust.createdAt) trust.createdAt = now;
  await hiPut("deviceTrust", trust);
  return trust;
}

async function hiWalletFindLegacyWallet(identity, currentId) {
  const wallets    = await hiGetAll("wallet");
  const candidates = wallets.filter(item => {
    if (!item || item.id === currentId) return false;
    return item.hdi === identity.hdi ||
      (identity.legacyHdi && item.hdi === identity.legacyHdi) ||
      (identity.legacyHdi && String(item.id ?? "").includes(identity.legacyHdi));
  });
  if (!candidates.length) return null;
  candidates.sort((a, b) => Number(b.updatedAt ?? b.createdAt ?? 0) - Number(a.updatedAt ?? a.createdAt ?? 0));
  return candidates[0];
}

async function hiWalletMigrateLegacyWallet(identity, fingerprint, deviceTrust) {
  const currentId = hiWalletId(identity.hdi);
  const legacy    = await hiWalletFindLegacyWallet(identity, currentId);
  if (!legacy) return null;
  const wallet = Object.assign({}, legacy, {
    id:                          currentId,
    hdi:                         identity.hdi,
    legacyHdi:                   identity.legacyHdi ?? legacy.hdi ?? "",
    ownerName:                   identity.name ?? legacy.ownerName ?? "",
    username:                    identity.username ?? legacy.username ?? "",
    address:                     hiWalletAddress(identity.hdi),
    currentDeviceId:             hiWalletDeviceId(),
    currentDeviceFingerprint:    fingerprint,
    currentDeviceTrustId:        deviceTrust.id,
    deviceTrustScore:            deviceTrust.riskScore,
    migratedFromWalletId:        legacy.id,
    migratedAt:                  legacy.migratedAt ?? Date.now(),
    updatedAt:                   Date.now(),
  });
  wallet.transactions = Array.isArray(wallet.transactions) ? wallet.transactions : [];
  await hiPut("wallet", wallet);
  return wallet;
}

async function hiWalletLoadOrCreate(identity) {
  const fingerprint = await hiWalletFingerprint(identity);
  const deviceTrust = await hiWalletRegisterDeviceTrust(identity, fingerprint);
  const id          = hiWalletId(identity.hdi);
  let   wallet      = await hiGet("wallet", id);
  if (!wallet) wallet = await hiWalletMigrateLegacyWallet(identity, fingerprint, deviceTrust);
  if (!wallet) {
    wallet = {
      id,
      type:         "hi-wallet",
      hdi:          identity.hdi,
      legacyHdi:    identity.legacyHdi ?? "",
      ownerName:    identity.name ?? "",
      username:     identity.username ?? "",
      address:      hiWalletAddress(identity.hdi),
      balance:      0,
      maxSupply:    HI_WALLET_MAX_SUPPLY,
      transactions: [],
      createdAt:    Date.now(),
      updatedAt:    Date.now(),
    };
    await hiPut("wallet", wallet);
  }
  wallet.currentDeviceId          = hiWalletDeviceId();
  wallet.currentDeviceFingerprint = fingerprint;
  wallet.currentDeviceTrustId     = deviceTrust.id;
  wallet.deviceTrustScore         = deviceTrust.riskScore;
  wallet.deviceId                 = wallet.currentDeviceId;
  wallet.deviceFingerprint        = fingerprint;
  wallet.address                  = hiWalletAddress(identity.hdi);
  wallet.transactions             = Array.isArray(wallet.transactions) ? wallet.transactions : [];
  if (!wallet.genesisIssued) {
    wallet = await hiWalletAddTransaction(identity, wallet, {
      type:         "Genesis HI",
      direction:    "credit",
      amount:       HI_WALLET_GENESIS_AMOUNT,
      counterparty: identity.hdi,
      note:         "1 Human = 1 Genesis HI",
    });
    wallet.genesisIssued = true;
    wallet.genesisAt     = wallet.genesisAt ?? Date.now();
  }
  await hiPut("wallet", wallet);
  return wallet;
}

/* ── UI helpers ── */

function hiWalletSetText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

const hiWalletSetStatus = (message, type) => hiWalletSetNamedStatus("walletStatus", message, type);

function hiWalletSetNamedStatus(id, message, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message ?? "";
  el.className   = type ? `wallet-status ${type}` : "wallet-status";
}

function hiWalletSetRecoveryPhrase(phrase) {
  _hiWalletRecoveryPhrase = String(phrase ?? "").trim();
  const el = document.getElementById("walletRecoveryPhrase");
  if (el) el.textContent = _hiWalletRecoveryPhrase || "Generate a recovery phrase";
}

async function hiWalletRefreshRecoveryStatus() {
  const status = typeof hiCryptoRecoveryStatus === "function"
    ? await hiCryptoRecoveryStatus()
    : { registered: false };
  hiWalletSetNamedStatus(
    "walletRecoveryStatus",
    status.registered ? "Recovery phrase registered for this HDI." : "Generate a recovery phrase before exporting backup.",
    status.registered ? "success" : "",
  );
  return status;
}

/* ── Security state ── */

async function hiWalletCurrentSecurityState(identity, wallet) {
  const keyStatus   = typeof hiCryptoSecurityStatus === "function"
    ? await hiCryptoSecurityStatus()
    : { exists: false, protected: false, unlocked: false };
  const deviceTrust = wallet?.currentDeviceTrustId ? await hiGet("deviceTrust", wallet.currentDeviceTrustId) : null;
  const trusted     = !!(deviceTrust?.trusted);
  return {
    keyStatus,
    deviceTrust,
    trusted,
    canUse: !!(identity && wallet && trusted && keyStatus.protected && keyStatus.unlocked),
  };
}

function hiWalletSetFormsEnabled(enabled) {
  document.querySelectorAll(".wallet-form input, .wallet-form select, .wallet-form button").forEach(el => {
    el.disabled = !enabled;
  });
  const exportBtn = document.getElementById("walletExportProof");
  if (exportBtn) exportBtn.disabled = !enabled;
}

async function hiWalletRenderSecurity(identity, wallet) {
  const state = await hiWalletCurrentSecurityState(identity, wallet);
  hiWalletSetText("walletKeyProtection", state.keyStatus.protected ? "Encrypted" : "Needs setup");
  hiWalletSetText("walletKeySession",    state.keyStatus.unlocked  ? "Unlocked"  : "Locked");
  hiWalletSetText("walletRiskState",     state.trusted             ? "Trusted device" : "Challenge required");
  hiWalletSetFormsEnabled(state.canUse);

  const protectBtn = document.getElementById("walletProtectKey");
  if (protectBtn) protectBtn.disabled = state.keyStatus.protected && state.keyStatus.unlocked;
  const unlockBtn  = document.getElementById("walletUnlockKey");
  if (unlockBtn)  unlockBtn.disabled  = state.keyStatus.protected && state.keyStatus.unlocked;
  const trustBtn   = document.getElementById("walletTrustDevice");
  if (trustBtn)   trustBtn.disabled   = !state.keyStatus.unlocked;

  if (!state.keyStatus.protected) {
    hiWalletSetNamedStatus("walletSecurityStatus", "Create a passphrase to encrypt the identity private key.", "");
  } else if (!state.keyStatus.unlocked) {
    hiWalletSetNamedStatus("walletSecurityStatus", "Unlock required for wallet actions and signed proofs.", "");
  } else {
    hiWalletSetNamedStatus("walletSecurityStatus", "Identity key unlocked in this browser session.", "success");
  }
  if (!state.trusted) {
    hiWalletSetNamedStatus("walletDeviceStatus", "This device is not trusted yet. Unlock, then trust it.", "");
  }
  await hiWalletRefreshRecoveryStatus();
  return state;
}

/* ── Device list ── */

async function hiWalletLoadDeviceTrust(identity) {
  const all = await hiGetAll("deviceTrust");
  return all
    .filter(item => item?.hdi === identity.hdi)
    .sort((a, b) => Number(b.lastSeen ?? b.updatedAt ?? 0) - Number(a.lastSeen ?? a.updatedAt ?? 0));
}

async function hiWalletRenderDevices(identity, wallet) {
  const list = document.getElementById("walletDeviceList");
  if (!list || !identity) return;
  const devices = await hiWalletLoadDeviceTrust(identity);
  if (!devices.length) {
    list.innerHTML = '<p class="wallet-empty">No trusted device records yet.</p>';
    return;
  }
  list.innerHTML = devices.map(device => {
    const seen = device.lastSeen
      ? new Date(device.lastSeen).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
      : "Never";
    const isCurrent = wallet?.currentDeviceTrustId === device.id;
    return `<article class="wlt-device-row">` +
      `<div><span>${isCurrent ? "Current Device" : "Known Device"}</span>` +
      `<strong>${device.trusted ? "Trusted" : "Untrusted"} · Risk ${hiEsc(device.riskScore ?? 0)}</strong>` +
      `<code>${hiEsc(device.fingerprint ?? device.id)}</code>` +
      `<code>Last seen ${hiEsc(seen)}</code></div>` +
      `<button type="button" data-device-toggle="${hiEsc(device.id)}">${device.trusted ? "Remove Trust" : "Trust"}</button>` +
    `</article>`;
  }).join("");

  list.querySelectorAll("[data-device-toggle]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id     = btn.getAttribute("data-device-toggle");
      const record = await hiGet("deviceTrust", id);
      if (!record) return;
      const state = await hiWalletCurrentSecurityState(identity, wallet);
      if (!record.trusted && !state.keyStatus.unlocked) {
        hiWalletSetNamedStatus("walletDeviceStatus", "Unlock identity key before trusting a device.", "error");
        return;
      }
      record.trusted   = !record.trusted;
      record.riskScore = record.trusted ? Math.max(75, Number(record.riskScore ?? 75)) : 25;
      record.updatedAt = Date.now();
      await hiPut("deviceTrust", record);
      await hiWalletRenderDevices(identity, wallet);
      await hiWalletRenderSecurity(identity, wallet);
    });
  });
}

/* ── Recovery phrase ── */

async function hiWalletGenerateRecoveryPhrase() {
  if (typeof hiCryptoGenerateRecoveryPhrase !== "function") {
    throw new Error("Recovery phrase generator is unavailable.");
  }
  const phrase = hiCryptoGenerateRecoveryPhrase(12);
  hiWalletSetRecoveryPhrase(phrase);
  try { sessionStorage.setItem("hi_wallet_recovery_phrase", phrase); } catch { /* non-critical */ }
  if (typeof hiCryptoRegisterRecoveryPhrase === "function") {
    await hiCryptoRegisterRecoveryPhrase(phrase);
  }
  await hiWalletRefreshRecoveryStatus();
  return phrase;
}

function hiWalletCopyRecoveryPhrase() {
  if (!_hiWalletRecoveryPhrase) throw new Error("Generate a recovery phrase first.");
  return navigator.clipboard.writeText(_hiWalletRecoveryPhrase);
}

/* ── Restore from vault backup ── */

async function hiWalletRestoreFromBackup() {
  const fileEl   = document.getElementById("walletRestoreFile");
  const passEl   = document.getElementById("walletRestorePassphrase");
  const phraseEl = document.getElementById("walletRestoreRecoveryPhrase");
  const file     = fileEl?.files?.[0];
  if (!file) throw new Error("Choose a HI Vault backup file.");
  const passphrase    = passEl?.value ?? "";
  const recoveryPhrase = (phraseEl?.value ?? "").trim();
  if (passphrase.length < 8) throw new Error("Use a passphrase with at least 8 characters.");
  if (recoveryPhrase.split(/\s+/).filter(Boolean).length < 12) throw new Error("Use at least 12 recovery words.");
  const text    = await file.text();
  const payload = await hiVaultDecryptBackup(text, passphrase, recoveryPhrase);
  const currentIdentity = typeof hiLoadIdentity === "function" ? await hiLoadIdentity() : null;
  if (currentIdentity?.hdi && payload.identityHdi && currentIdentity.hdi !== payload.identityHdi) {
    if (!confirm(`This backup belongs to a different identity (${payload.identityHdi}). Continue restoring?`)) {
      return false;
    }
  }
  await hiVaultRestorePayload(payload);
  if (passEl)   passEl.value   = "";
  if (phraseEl) phraseEl.value = "";
  if (fileEl)   fileEl.value   = "";
  hiWalletSetNamedStatus("walletRestoreStatus", "Backup restored. Reloading identity and wallet state...", "success");
  setTimeout(() => window.location.reload(), 700);
  return true;
}

/* ── Trust score / render ── */

function hiWalletTrustScore(identity, wallet) {
  if (!identity || !wallet) return 0;
  const txs            = Array.isArray(wallet.transactions) ? wallet.transactions : [];
  const identityAgeDays = Math.max(0, Math.floor((Date.now() - Number(identity.createdAt ?? Date.now())) / 86_400_000));
  let score = 35;
  if (identity.hdi)       score += 15;
  if (wallet.genesisIssued) score += 15;
  score += Math.min(15, txs.length * 3);
  score += Math.min(10, identityAgeDays);
  if (wallet.currentDeviceFingerprint ?? wallet.deviceFingerprint) score += 5;
  score += Math.min(10, Math.floor(Number(wallet.deviceTrustScore ?? 0) / 10));
  return Math.max(0, Math.min(100, score));
}

function hiWalletRenderLocked() {
  document.getElementById("walletLocked")?.classList.add("active");
  document.querySelectorAll(".wallet-form").forEach(form => { form.hidden = true; });
  const exportBtn = document.getElementById("walletExportProof");
  if (exportBtn) exportBtn.disabled = true;
  hiWalletSetText("walletBalance",      "0");
  hiWalletSetText("walletGenesisStatus","Identity required");
  hiWalletSetText("walletTrustScore",   "0");
  hiWalletSetText("walletHdi",          "Identity required");
  hiWalletSetText("walletOwner",        "No registered HI identity");
  hiWalletSetText("walletDevice",       hiWalletDeviceId());
  hiWalletSetText("walletFingerprint",  "Pending");
  hiWalletSetText("walletAddress",      "Create your HI identity first.");
  hiWalletSetText("statBalance",        "0 HI");
  hiWalletSetText("statTrust",          "0/100");
  hiWalletSetText("statTxCount",        "0");
  hiWalletSetText("statGenesis",        "Pending");
}

function hiWalletRenderLedger(wallet) {
  const list = document.getElementById("walletLedger");
  if (!list) return;
  const txs = wallet && Array.isArray(wallet.transactions) ? wallet.transactions.slice().reverse() : [];
  if (!txs.length) {
    list.innerHTML = '<p class="wallet-empty">No wallet activity yet. Create your HI identity to unlock Genesis HI.</p>';
    return;
  }
  list.innerHTML = txs.map(tx => {
    const d         = new Date(tx.createdAt ?? Date.now()).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    const direction = tx.direction === "debit" ? "debit" : "credit";
    const sign      = direction === "debit" ? "-" : "+";
    return `<article class="wallet-tx">` +
      `<span>${hiEsc(d)}</span>` +
      `<div><strong>${hiEsc(tx.type ?? "Wallet Activity")}</strong><small>${hiEsc(tx.note ?? tx.counterparty ?? "")}</small><code>${hiEsc(tx.hash ?? "")}</code></div>` +
      `<div class="wallet-tx-amount ${direction}">${sign}${hiEsc(tx.amount)} HI</div>` +
    `</article>`;
  }).join("");
}

function hiWalletRender(identity, wallet) {
  document.getElementById("walletLocked")?.classList.remove("active");
  document.querySelectorAll(".wallet-form").forEach(form => { form.hidden = false; });
  const exportBtn = document.getElementById("walletExportProof");
  if (exportBtn) exportBtn.disabled = false;

  const balance   = Number(wallet.balance ?? 0);
  const remaining = Math.max(0, HI_WALLET_MAX_SUPPLY - balance);
  hiWalletSetText("walletBalance",       String(balance));
  hiWalletSetText("walletGenesisStatus", wallet.genesisIssued ? "Issued" : "Pending");
  hiWalletSetText("walletTrustScore",    String(hiWalletTrustScore(identity, wallet)));
  hiWalletSetText("walletHdi",           identity.hdi ?? "HDI pending");
  hiWalletSetText("walletOwner",         identity.name ?? "Registered identity");
  hiWalletSetText("walletDevice",        wallet.deviceId ?? hiWalletDeviceId());
  hiWalletSetText("walletFingerprint",   (wallet.currentDeviceFingerprint ?? wallet.deviceFingerprint ?? "").slice(0, 24));
  hiWalletSetText("walletAddress",       wallet.address ?? "");

  const amount = document.getElementById("walletMintAmount");
  if (amount) amount.max = String(Math.max(1, remaining));
  const submit = document.getElementById("walletMintSubmit");
  if (submit) submit.disabled = remaining <= 0;
  if (remaining <= 0) {
    hiWalletSetStatus(`This identity/device wallet reached the ${HI_WALLET_MAX_SUPPLY} HI ecosystem demo cap.`, "");
  }
  const txs = Array.isArray(wallet.transactions) ? wallet.transactions : [];
  hiWalletSetText("statBalance",  `${balance} HI`);
  hiWalletSetText("statTrust",    `${hiWalletTrustScore(identity, wallet)}/100`);
  hiWalletSetText("statTxCount",  String(txs.length));
  hiWalletSetText("statGenesis",  wallet.genesisIssued ? "Issued ✓" : "Pending");
  hiWalletRenderLedger(wallet);
}

/* ── Transactions ── */

async function hiWalletAddTransaction(identity, wallet, data) {
  const direction    = data.direction === "debit" ? "debit" : "credit";
  const amount       = Math.max(1, parseInt(data.amount, 10) || 0);
  const currentBalance = Number(wallet.balance ?? 0);
  const nextBalance  = direction === "debit" ? currentBalance - amount : currentBalance + amount;
  if (direction === "debit" && nextBalance < 0) throw new Error("Insufficient HI balance.");
  const now   = Date.now();
  const txRaw = [
    wallet.id,
    identity.hdi,
    wallet.currentDeviceFingerprint ?? wallet.deviceFingerprint,
    data.type,
    direction,
    amount,
    nextBalance,
    data.counterparty ?? "",
    data.note ?? "",
    now,
  ].join("|");
  const tx = {
    id:                `tx_${hiGenId()}`,
    type:              data.type ?? "Wallet Activity",
    direction,
    amount,
    hdi:               identity.hdi,
    counterparty:      data.counterparty ?? "",
    note:              data.note ?? "",
    deviceFingerprint: wallet.currentDeviceFingerprint ?? wallet.deviceFingerprint,
    deviceTrustId:     wallet.currentDeviceTrustId ?? "",
    hash:              await hiWalletHash(txRaw),
    createdAt:         now,
  };
  wallet.balance   = nextBalance;
  wallet.ownerName = identity.name ?? wallet.ownerName;
  wallet.username  = identity.username ?? wallet.username;
  wallet.updatedAt = now;
  wallet.transactions = Array.isArray(wallet.transactions) ? wallet.transactions : [];
  wallet.transactions.push(tx);
  await hiPut("wallet", wallet);
  return wallet;
}

async function hiWalletGenerateCoin(identity, wallet, amount, reason) {
  return hiWalletAddTransaction(identity, wallet, {
    type:         "Earned HI Reward",
    direction:    "credit",
    amount,
    counterparty: "HI Economy",
    note:         reason ?? "Verified Contribution",
  });
}

async function hiWalletTransfer(identity, wallet, mode, address, amount) {
  if (mode === "receive" && Number(wallet.balance ?? 0) + amount > HI_WALLET_MAX_SUPPLY) {
    throw new Error(`Receive would exceed the ${HI_WALLET_MAX_SUPPLY} HI ecosystem demo cap.`);
  }
  return hiWalletAddTransaction(identity, wallet, {
    type:         mode === "receive" ? "Receive HI" : "Send HI",
    direction:    mode === "receive" ? "credit" : "debit",
    amount,
    counterparty: address,
    note:         mode === "receive" ? "Prototype receive record" : "Prototype send record",
  });
}

async function hiWalletMockUpi(identity, wallet, merchant, amount) {
  return hiWalletAddTransaction(identity, wallet, {
    type:         "Mock UPI Merchant Payment",
    direction:    "debit",
    amount,
    counterparty: merchant ?? "Merchant",
    note:         "Demo settlement only. No INR moved.",
  });
}

/* ── Proof export ── */

async function hiWalletBuildProof(identity, wallet) {
  const payload = {
    project:             "HI Wallet",
    phase:               "Phase 1A cryptographic identity prototype",
    compliancePosition:  "Not legal tender, not INR, not a bank, not real fintech settlement.",
    exportedAt:          new Date().toISOString(),
    identity: {
      name:                identity.name ?? "",
      hdi:                 identity.hdi ?? "",
      legacyHdi:           identity.legacyHdi ?? "",
      hdiMode:             identity.hdiMode ?? "",
      identityKeyVersion:  identity.identityKeyVersion ?? "",
      identityAlgorithm:   identity.identityAlgorithm ?? "",
      publicKeySpki:       identity.identityPublicKey ?? "",
      username:            identity.username ?? "",
    },
    wallet: {
      address:                  wallet.address,
      type:                     wallet.type,
      root:                     "HDI public key",
      currentDeviceId:          wallet.currentDeviceId ?? wallet.deviceId,
      currentDeviceFingerprint: wallet.currentDeviceFingerprint ?? wallet.deviceFingerprint,
      currentDeviceTrustId:     wallet.currentDeviceTrustId ?? "",
      deviceTrustScore:         wallet.deviceTrustScore ?? 0,
      balance:                  wallet.balance,
      maxSupply:                wallet.maxSupply,
      genesisIssued:            !!wallet.genesisIssued,
      trustScore:               hiWalletTrustScore(identity, wallet),
    },
    transactions: Array.isArray(wallet.transactions) ? wallet.transactions : [],
  };
  if (typeof hiCryptoSignPayload === "function") {
    return { proofType: "signed-hi-wallet-proof", payload, signatureProof: await hiCryptoSignPayload(payload) };
  }
  return { proofType: "unsigned-hi-wallet-proof", payload };
}

async function hiWalletExportProof(identity, wallet) {
  const proof = await hiWalletBuildProof(identity, wallet);
  const blob  = new Blob([JSON.stringify(proof, null, 2)], { type: "application/json" });
  const url   = URL.createObjectURL(blob);
  const a     = Object.assign(document.createElement("a"), {
    href:     url,
    download: `hi-wallet-proof-${String(identity.hdi ?? "identity").toLowerCase()}.json`,
  });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ── Init ── */

async function hiWalletInit() {
  try { await hiOpenDB(); } catch { /* degraded mode */ }
  const userEl = document.getElementById("authUserDisplay");
  if (userEl && typeof getAuthUser === "function") userEl.textContent = getAuthUser() ?? "";
  document.getElementById("logoutBtn")?.addEventListener("click", () => typeof logout === "function" && logout());

  let identity, wallet;
  try {
    identity = typeof hiLoadIdentity === "function" ? await hiLoadIdentity() : null;
    if (!identity?.hdi) { hiWalletRenderLocked(); return; }
    wallet = await hiWalletLoadOrCreate(identity);
  } catch {
    hiWalletSetStatus("Wallet failed to load. Reload the page or clear browser storage.", "error");
    hiWalletRenderLocked();
    return;
  }

  try {
    const savedPhrase = sessionStorage.getItem("hi_wallet_recovery_phrase");
    if (savedPhrase) hiWalletSetRecoveryPhrase(savedPhrase);
  } catch { /* non-critical */ }

  hiWalletRender(identity, wallet);
  await hiWalletRenderDevices(identity, wallet);
  await hiWalletRenderSecurity(identity, wallet);

  document.getElementById("walletGenerateRecoveryPhrase")?.addEventListener("click", async () => {
    try {
      await hiWalletGenerateRecoveryPhrase();
      hiWalletSetNamedStatus("walletRecoveryStatus", "Recovery phrase generated for this session.", "success");
    } catch (err) {
      hiWalletSetNamedStatus("walletRecoveryStatus", err.message ?? "Recovery phrase generation failed.", "error");
    }
  });

  document.getElementById("walletCopyRecoveryPhrase")?.addEventListener("click", async () => {
    try {
      await hiWalletCopyRecoveryPhrase();
      hiWalletSetNamedStatus("walletRecoveryStatus", "Recovery phrase copied.", "success");
    } catch (err) {
      hiWalletSetNamedStatus("walletRecoveryStatus", err.message ?? "Copy failed.", "error");
    }
  });

  document.getElementById("walletRestoreForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    hiWalletSetNamedStatus("walletRestoreStatus", "", "");
    try {
      await hiWalletRestoreFromBackup();
    } catch (err) {
      hiWalletSetNamedStatus("walletRestoreStatus", err.message ?? "Restore failed.", "error");
    }
  });

  document.getElementById("walletSecurityForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const pass = document.getElementById("walletPassphrase");
    try {
      await hiCryptoUnlockIdentityKey(pass?.value ?? "");
      if (pass) pass.value = "";
      hiWalletSetNamedStatus("walletSecurityStatus", "Identity key unlocked.", "success");
      await hiWalletRenderSecurity(identity, wallet);
    } catch (err) {
      hiWalletSetNamedStatus("walletSecurityStatus", err.message ?? "Unlock failed.", "error");
    }
  });

  document.getElementById("walletProtectKey")?.addEventListener("click", async () => {
    const pass = document.getElementById("walletPassphrase");
    try {
      await hiCryptoProtectIdentityKey(pass?.value ?? "");
      if (pass) pass.value = "";
      hiWalletSetNamedStatus("walletSecurityStatus", "Private key encrypted and unlocked for this session.", "success");
      await hiWalletRenderSecurity(identity, wallet);
    } catch (err) {
      hiWalletSetNamedStatus("walletSecurityStatus", err.message ?? "Key protection failed.", "error");
    }
  });

  document.getElementById("walletLockKey")?.addEventListener("click", async () => {
    if (typeof hiCryptoLockIdentityKey === "function") hiCryptoLockIdentityKey();
    hiWalletSetNamedStatus("walletSecurityStatus", "Identity key locked.", "");
    await hiWalletRenderSecurity(identity, wallet);
  });

  document.getElementById("walletTrustDevice")?.addEventListener("click", async () => {
    try {
      const state = await hiWalletCurrentSecurityState(identity, wallet);
      if (!state.keyStatus.unlocked) throw new Error("Unlock identity key before trusting this device.");
      const record = await hiGet("deviceTrust", wallet.currentDeviceTrustId);
      if (!record) throw new Error("Current device record is missing.");
      record.trusted   = true;
      record.riskScore = 95;
      record.trustedAt = Date.now();
      record.updatedAt = Date.now();
      await hiPut("deviceTrust", record);
      wallet.deviceTrustScore = record.riskScore;
      await hiPut("wallet", wallet);
      hiWalletSetNamedStatus("walletDeviceStatus", "Current device trusted.", "success");
      await hiWalletRenderDevices(identity, wallet);
      await hiWalletRenderSecurity(identity, wallet);
    } catch (err) {
      hiWalletSetNamedStatus("walletDeviceStatus", err.message ?? "Device trust failed.", "error");
    }
  });

  document.getElementById("walletRefreshDevices")?.addEventListener("click", async () => {
    await hiWalletRenderDevices(identity, wallet);
    await hiWalletRenderSecurity(identity, wallet);
  });

  const mintForm = document.getElementById("walletMintForm");
  if (!mintForm) return;
  mintForm.addEventListener("submit", async e => {
    e.preventDefault();
    hiWalletSetStatus("", "");
    if (!(await hiWalletCurrentSecurityState(identity, wallet)).canUse) {
      hiWalletSetStatus("Protect key, unlock, and trust this device before wallet actions.", "error");
      return;
    }
    const input  = document.getElementById("walletMintAmount");
    const amount = parseInt(input?.value ?? "0", 10);
    if (!Number.isFinite(amount) || amount < 1 || amount > HI_WALLET_MAX_SUPPLY) {
      hiWalletSetStatus(`Enter a HI amount from 1 to ${HI_WALLET_MAX_SUPPLY}.`, "error");
      return;
    }
    const remaining = HI_WALLET_MAX_SUPPLY - Number(wallet.balance ?? 0);
    if (amount > remaining) {
      hiWalletSetStatus(`Only ${remaining} HI can still be added before the prototype cap.`, "error");
      return;
    }
    const reason = document.getElementById("walletMintReason");
    wallet = await hiWalletGenerateCoin(identity, wallet, amount, reason?.value ?? "");
    if (input) input.value = "";
    hiWalletRender(identity, wallet);
    await hiWalletRenderSecurity(identity, wallet);
    hiWalletSetStatus(`Added ${amount} earned HI and saved it to the local ledger.`, "success");
  });

  document.getElementById("walletTransferForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    hiWalletSetNamedStatus("walletTransferStatus", "", "");
    if (!(await hiWalletCurrentSecurityState(identity, wallet)).canUse) {
      hiWalletSetNamedStatus("walletTransferStatus", "Protect key, unlock, and trust this device before transfers.", "error");
      return;
    }
    const modeEl    = document.getElementById("walletTransferMode");
    const addressEl = document.getElementById("walletTransferAddress");
    const amountEl  = document.getElementById("walletTransferAmount");
    const mode      = modeEl?.value  ?? "send";
    const address   = (addressEl?.value ?? "").trim();
    const amount    = parseInt(amountEl?.value ?? "0", 10);
    if (!address || !Number.isFinite(amount) || amount < 1) {
      hiWalletSetNamedStatus("walletTransferStatus", "Enter a wallet/HDI and valid amount.", "error");
      return;
    }
    if (mode === "send" && amount > Number(wallet.balance ?? 0)) {
      hiWalletSetNamedStatus("walletTransferStatus", "Insufficient HI balance for this send simulation.", "error");
      return;
    }
    wallet = await hiWalletTransfer(identity, wallet, mode, address, amount);
    if (amountEl) amountEl.value = "";
    hiWalletRender(identity, wallet);
    await hiWalletRenderSecurity(identity, wallet);
    hiWalletSetNamedStatus("walletTransferStatus", "Transfer saved to the local ledger.", "success");
  });

  document.getElementById("walletUpiForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    hiWalletSetNamedStatus("walletUpiStatus", "", "");
    if (!(await hiWalletCurrentSecurityState(identity, wallet)).canUse) {
      hiWalletSetNamedStatus("walletUpiStatus", "Protect key, unlock, and trust this device before payments.", "error");
      return;
    }
    const merchantEl = document.getElementById("walletMerchantName");
    const amountEl   = document.getElementById("walletUpiAmount");
    const merchant   = (merchantEl?.value ?? "").trim();
    const amount     = parseInt(amountEl?.value ?? "0", 10);
    if (!merchant || !Number.isFinite(amount) || amount < 1) {
      hiWalletSetNamedStatus("walletUpiStatus", "Enter merchant and valid HI amount.", "error");
      return;
    }
    if (amount > Number(wallet.balance ?? 0)) {
      hiWalletSetNamedStatus("walletUpiStatus", "Insufficient HI balance for mock merchant payment.", "error");
      return;
    }
    wallet = await hiWalletMockUpi(identity, wallet, merchant, amount);
    if (amountEl) amountEl.value = "";
    hiWalletRender(identity, wallet);
    await hiWalletRenderSecurity(identity, wallet);
    hiWalletSetNamedStatus("walletUpiStatus", "Mock merchant payment recorded. No real INR moved.", "success");
  });

  document.getElementById("walletExportProof")?.addEventListener("click", async () => {
    try {
      if (!(await hiWalletCurrentSecurityState(identity, wallet)).canUse) {
        throw new Error("Protect key, unlock, and trust this device before exporting signed proof.");
      }
      await hiWalletExportProof(identity, wallet);
    } catch (err) {
      hiWalletSetStatus(`Signed proof export failed: ${err.message ?? "unknown error"}`, "error");
    }
  });
}

document.addEventListener("DOMContentLoaded", hiWalletInit, { once: true });
