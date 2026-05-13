"use strict";

/* ======================================================
   hi-wallet.js
   Identity-bound local HI Coin wallet
   Depends on: auth.js, hi-storage.js, hi-app.js
====================================================== */

var HI_WALLET_MAX_SUPPLY = 99;
var HI_WALLET_GENESIS_AMOUNT = 1;

function hiWalletDeviceId() {
  try {
    var existing = localStorage.getItem("ak_device_id");
    if (existing) return existing;
    var generated = "dev_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("ak_device_id", generated);
    return generated;
  } catch (e) {
    return "dev_" + Date.now().toString(36);
  }
}

function hiWalletSimpleHash(str) {
  var h1 = 0xdeadbeef;
  var h2 = 0x41c6ce57;
  for (var i = 0; i < str.length; i++) {
    var ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0");
}

async function hiWalletHash(str) {
  if (window.crypto && crypto.subtle && window.TextEncoder) {
    try {
      var enc = new TextEncoder();
      var buf = await crypto.subtle.digest("SHA-256", enc.encode(str));
      return Array.from(new Uint8Array(buf)).map(function(b) {
        return b.toString(16).padStart(2, "0");
      }).join("");
    } catch (e) {}
  }
  return hiWalletSimpleHash(str);
}

async function hiWalletFingerprint(identity) {
  var parts = [
    hiWalletDeviceId(),
    identity && identity.hdi ? identity.hdi : "",
    navigator.userAgent || "",
    navigator.language || "",
    navigator.platform || "",
    String(new Date().getTimezoneOffset()),
    screen ? [screen.width, screen.height, screen.colorDepth].join("x") : ""
  ];
  return await hiWalletHash(parts.join("|"));
}

function hiWalletAddress(hdi, fingerprint) {
  return "hiw_" + String(hdi || "pending").replace(/[^A-Z0-9-]/gi, "").toLowerCase() + "_" + fingerprint.slice(0, 16);
}

function hiWalletId(hdi, fingerprint) {
  return "wallet:" + hdi + ":" + fingerprint.slice(0, 16);
}

async function hiWalletLoadOrCreate(identity) {
  var fingerprint = await hiWalletFingerprint(identity);
  var id = hiWalletId(identity.hdi, fingerprint);
  var wallet = await hiGet("wallet", id);
  if (!wallet) {
    wallet = {
      id: id,
      type: "hi-wallet",
      hdi: identity.hdi,
      ownerName: identity.name || "",
      username: identity.username || "",
      deviceId: hiWalletDeviceId(),
      deviceFingerprint: fingerprint,
      address: hiWalletAddress(identity.hdi, fingerprint),
      balance: 0,
      maxSupply: HI_WALLET_MAX_SUPPLY,
      transactions: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await hiPut("wallet", wallet);
  }
  wallet.transactions = Array.isArray(wallet.transactions) ? wallet.transactions : [];
  if (!wallet.genesisIssued) {
    wallet = await hiWalletAddTransaction(identity, wallet, {
      type: "Genesis HI",
      direction: "credit",
      amount: HI_WALLET_GENESIS_AMOUNT,
      counterparty: identity.hdi,
      note: "1 Human = 1 Genesis HI"
    });
    wallet.genesisIssued = true;
    wallet.genesisAt = wallet.genesisAt || Date.now();
    await hiPut("wallet", wallet);
  }
  return wallet;
}

function hiWalletSetText(id, value) {
  var el = document.getElementById(id);
  if (el) el.textContent = value;
}

function hiWalletSetStatus(message, type) {
  hiWalletSetNamedStatus("walletStatus", message, type);
}

function hiWalletSetNamedStatus(id, message, type) {
  var el = document.getElementById(id);
  if (!el) return;
  el.textContent = message || "";
  el.className = "wallet-status" + (type ? " " + type : "");
}

function hiWalletTrustScore(identity, wallet) {
  if (!identity || !wallet) return 0;
  var txs = Array.isArray(wallet.transactions) ? wallet.transactions : [];
  var identityAgeDays = Math.max(0, Math.floor((Date.now() - Number(identity.createdAt || Date.now())) / 86400000));
  var score = 35;
  if (identity.hdi) score += 15;
  if (wallet.genesisIssued) score += 15;
  score += Math.min(15, txs.length * 3);
  score += Math.min(10, identityAgeDays);
  if (wallet.deviceFingerprint) score += 10;
  return Math.max(0, Math.min(100, score));
}

function hiWalletRenderLocked() {
  var locked = document.getElementById("walletLocked");
  if (locked) locked.classList.add("active");
  Array.prototype.forEach.call(document.querySelectorAll(".wallet-form"), function(form) {
    form.hidden = true;
  });
  var exportBtn = document.getElementById("walletExportProof");
  if (exportBtn) exportBtn.disabled = true;
  hiWalletSetText("walletBalance", "0");
  hiWalletSetText("walletGenesisStatus", "Identity required");
  hiWalletSetText("walletTrustScore", "0");
  hiWalletSetText("walletHdi", "Identity required");
  hiWalletSetText("walletOwner", "No registered HI identity");
  hiWalletSetText("walletDevice", hiWalletDeviceId());
  hiWalletSetText("walletFingerprint", "Pending");
  hiWalletSetText("walletAddress", "Create your HI identity first.");
  hiWalletSetText("statBalance", "0 HI");
  hiWalletSetText("statTrust", "0/100");
  hiWalletSetText("statTxCount", "0");
  hiWalletSetText("statGenesis", "Pending");
}

function hiWalletRenderLedger(wallet) {
  var list = document.getElementById("walletLedger");
  if (!list) return;
  var txs = wallet && Array.isArray(wallet.transactions) ? wallet.transactions.slice().reverse() : [];
  if (!txs.length) {
    list.innerHTML = '<p class="wallet-empty">No wallet activity yet. Create your HI identity to unlock Genesis HI.</p>';
    return;
  }
  list.innerHTML = txs.map(function(tx) {
    var d = new Date(tx.createdAt || Date.now()).toLocaleString("en-IN", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
    });
    var direction = tx.direction === "debit" ? "debit" : "credit";
    var sign = direction === "debit" ? "-" : "+";
    return '<article class="wallet-tx">' +
      '<span>' + hiEsc(d) + '</span>' +
      '<div><strong>' + hiEsc(tx.type || "Wallet Activity") + '</strong><small>' + hiEsc(tx.note || tx.counterparty || "") + '</small><code>' + hiEsc(tx.hash || "") + '</code></div>' +
      '<div class="wallet-tx-amount ' + direction + '">' + sign + hiEsc(tx.amount) + ' HI</div>' +
    '</article>';
  }).join("");
}

function hiWalletRender(identity, wallet) {
  var locked = document.getElementById("walletLocked");
  if (locked) locked.classList.remove("active");
  Array.prototype.forEach.call(document.querySelectorAll(".wallet-form"), function(form) {
    form.hidden = false;
  });
  var exportBtn = document.getElementById("walletExportProof");
  if (exportBtn) exportBtn.disabled = false;

  var balance = Number(wallet.balance || 0);
  var remaining = Math.max(0, HI_WALLET_MAX_SUPPLY - balance);
  hiWalletSetText("walletBalance", String(balance));
  hiWalletSetText("walletGenesisStatus", wallet.genesisIssued ? "Issued" : "Pending");
  hiWalletSetText("walletTrustScore", String(hiWalletTrustScore(identity, wallet)));
  hiWalletSetText("walletHdi", identity.hdi || "HDI pending");
  hiWalletSetText("walletOwner", identity.name || "Registered identity");
  hiWalletSetText("walletDevice", wallet.deviceId || hiWalletDeviceId());
  hiWalletSetText("walletFingerprint", (wallet.deviceFingerprint || "").slice(0, 24));
  hiWalletSetText("walletAddress", wallet.address || "");

  var amount = document.getElementById("walletMintAmount");
  if (amount) amount.max = String(Math.max(1, remaining));
  var submit = document.getElementById("walletMintSubmit");
  if (submit) submit.disabled = remaining <= 0;
  if (remaining <= 0) {
    hiWalletSetStatus("This identity/device wallet reached the " + HI_WALLET_MAX_SUPPLY + " HI ecosystem demo cap.", "");
  }
  var txs = Array.isArray(wallet.transactions) ? wallet.transactions : [];
  hiWalletSetText("statBalance", String(balance) + " HI");
  hiWalletSetText("statTrust", String(hiWalletTrustScore(identity, wallet)) + "/100");
  hiWalletSetText("statTxCount", String(txs.length));
  hiWalletSetText("statGenesis", wallet.genesisIssued ? "Issued ✓" : "Pending");
  hiWalletRenderLedger(wallet);
}

async function hiWalletAddTransaction(identity, wallet, data) {
  var direction = data.direction === "debit" ? "debit" : "credit";
  var amount = Math.max(1, parseInt(data.amount, 10) || 0);
  var currentBalance = Number(wallet.balance || 0);
  var nextBalance = direction === "debit" ? currentBalance - amount : currentBalance + amount;
  if (direction === "debit" && nextBalance < 0) {
    throw new Error("Insufficient HI balance.");
  }
  var now = Date.now();
  var txRaw = [
    wallet.id,
    identity.hdi,
    wallet.deviceFingerprint,
    data.type,
    direction,
    amount,
    nextBalance,
    data.counterparty || "",
    data.note || "",
    now
  ].join("|");
  var tx = {
    id: "tx_" + hiGenId(),
    type: data.type || "Wallet Activity",
    direction: direction,
    amount: amount,
    hdi: identity.hdi,
    counterparty: data.counterparty || "",
    note: data.note || "",
    deviceFingerprint: wallet.deviceFingerprint,
    hash: await hiWalletHash(txRaw),
    createdAt: now
  };
  wallet.balance = nextBalance;
  wallet.ownerName = identity.name || wallet.ownerName;
  wallet.username = identity.username || wallet.username;
  wallet.updatedAt = now;
  wallet.transactions = Array.isArray(wallet.transactions) ? wallet.transactions : [];
  wallet.transactions.push(tx);
  await hiPut("wallet", wallet);
  return wallet;
}

async function hiWalletGenerateCoin(identity, wallet, amount, reason) {
  return await hiWalletAddTransaction(identity, wallet, {
    type: "Earned HI Reward",
    direction: "credit",
    amount: amount,
    counterparty: "HI Economy",
    note: reason || "Verified Contribution"
  });
}

async function hiWalletTransfer(identity, wallet, mode, address, amount) {
  if (mode === "receive" && Number(wallet.balance || 0) + amount > HI_WALLET_MAX_SUPPLY) {
    throw new Error("Receive would exceed the " + HI_WALLET_MAX_SUPPLY + " HI ecosystem demo cap.");
  }
  return await hiWalletAddTransaction(identity, wallet, {
    type: mode === "receive" ? "Receive HI" : "Send HI",
    direction: mode === "receive" ? "credit" : "debit",
    amount: amount,
    counterparty: address,
    note: mode === "receive" ? "Prototype receive record" : "Prototype send record"
  });
}

async function hiWalletMockUpi(identity, wallet, merchant, amount) {
  return await hiWalletAddTransaction(identity, wallet, {
    type: "Mock UPI Merchant Payment",
    direction: "debit",
    amount: amount,
    counterparty: merchant || "Merchant",
    note: "Demo settlement only. No INR moved."
  });
}

function hiWalletExportProof(identity, wallet) {
  var proof = {
    project: "HI Wallet",
    phase: "Phase 1 local prototype",
    compliancePosition: "Not legal tender, not INR, not a bank, not real fintech settlement.",
    exportedAt: new Date().toISOString(),
    identity: {
      name: identity.name || "",
      hdi: identity.hdi || "",
      username: identity.username || ""
    },
    wallet: {
      address: wallet.address,
      type: wallet.type,
      deviceId: wallet.deviceId,
      deviceFingerprint: wallet.deviceFingerprint,
      balance: wallet.balance,
      maxSupply: wallet.maxSupply,
      genesisIssued: !!wallet.genesisIssued,
      trustScore: hiWalletTrustScore(identity, wallet)
    },
    transactions: Array.isArray(wallet.transactions) ? wallet.transactions : []
  };
  var blob = new Blob([JSON.stringify(proof, null, 2)], { type: "application/json" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "hi-wallet-proof-" + String(identity.hdi || "identity").toLowerCase() + ".json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function hiWalletInit() {
  try { await hiOpenDB(); } catch (e) {}
  var userEl = document.getElementById("authUserDisplay");
  if (userEl && typeof getAuthUser === "function") userEl.textContent = getAuthUser() || "";
  var logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn && typeof logout === "function") logoutBtn.addEventListener("click", logout);

  var identity, wallet;
  try {
    identity = typeof hiLoadIdentity === "function" ? await hiLoadIdentity() : null;
    if (!identity || !identity.hdi) {
      hiWalletRenderLocked();
      return;
    }
    wallet = await hiWalletLoadOrCreate(identity);
  } catch (e) {
    hiWalletSetStatus("Wallet failed to load. Reload the page or clear browser storage.", "error");
    hiWalletRenderLocked();
    return;
  }
  hiWalletRender(identity, wallet);

  var form = document.getElementById("walletMintForm");
  if (!form) return;
  form.addEventListener("submit", async function(e) {
    e.preventDefault();
    hiWalletSetStatus("", "");
    var input = document.getElementById("walletMintAmount");
    var amount = parseInt(input ? input.value : "0", 10);
    if (!Number.isFinite(amount) || amount < 1 || amount > HI_WALLET_MAX_SUPPLY) {
      hiWalletSetStatus("Enter a HI amount from 1 to " + HI_WALLET_MAX_SUPPLY + ".", "error");
      return;
    }
    var remaining = HI_WALLET_MAX_SUPPLY - Number(wallet.balance || 0);
    if (amount > remaining) {
      hiWalletSetStatus("Only " + remaining + " HI can still be added before the prototype cap.", "error");
      return;
    }
    var reason = document.getElementById("walletMintReason");
    wallet = await hiWalletGenerateCoin(identity, wallet, amount, reason ? reason.value : "");
    if (input) input.value = "";
    hiWalletRender(identity, wallet);
    hiWalletSetStatus("Added " + amount + " earned HI and saved it to the local ledger.", "success");
  });

  var transferForm = document.getElementById("walletTransferForm");
  if (transferForm) transferForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    hiWalletSetNamedStatus("walletTransferStatus", "", "");
    var modeEl = document.getElementById("walletTransferMode");
    var addressEl = document.getElementById("walletTransferAddress");
    var amountEl = document.getElementById("walletTransferAmount");
    var mode = modeEl ? modeEl.value : "send";
    var address = addressEl ? addressEl.value.trim() : "";
    var amount = parseInt(amountEl ? amountEl.value : "0", 10);
    if (!address || !Number.isFinite(amount) || amount < 1) {
      hiWalletSetNamedStatus("walletTransferStatus", "Enter a wallet/HDI and valid amount.", "error");
      return;
    }
    if (mode === "send" && amount > Number(wallet.balance || 0)) {
      hiWalletSetNamedStatus("walletTransferStatus", "Insufficient HI balance for this send simulation.", "error");
      return;
    }
    wallet = await hiWalletTransfer(identity, wallet, mode, address, amount);
    if (amountEl) amountEl.value = "";
    hiWalletRender(identity, wallet);
    hiWalletSetNamedStatus("walletTransferStatus", "Transfer saved to the local ledger.", "success");
  });

  var upiForm = document.getElementById("walletUpiForm");
  if (upiForm) upiForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    hiWalletSetNamedStatus("walletUpiStatus", "", "");
    var merchantEl = document.getElementById("walletMerchantName");
    var amountEl = document.getElementById("walletUpiAmount");
    var merchant = merchantEl ? merchantEl.value.trim() : "";
    var amount = parseInt(amountEl ? amountEl.value : "0", 10);
    if (!merchant || !Number.isFinite(amount) || amount < 1) {
      hiWalletSetNamedStatus("walletUpiStatus", "Enter merchant and valid HI amount.", "error");
      return;
    }
    if (amount > Number(wallet.balance || 0)) {
      hiWalletSetNamedStatus("walletUpiStatus", "Insufficient HI balance for mock merchant payment.", "error");
      return;
    }
    wallet = await hiWalletMockUpi(identity, wallet, merchant, amount);
    if (amountEl) amountEl.value = "";
    hiWalletRender(identity, wallet);
    hiWalletSetNamedStatus("walletUpiStatus", "Mock merchant payment recorded. No real INR moved.", "success");
  });

  var exportBtn = document.getElementById("walletExportProof");
  if (exportBtn) exportBtn.addEventListener("click", function() {
    hiWalletExportProof(identity, wallet);
  });
}

document.addEventListener("DOMContentLoaded", hiWalletInit);
