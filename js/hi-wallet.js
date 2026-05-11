"use strict";

/* ======================================================
   hi-wallet.js
   Identity-bound local HI Coin wallet
   Depends on: auth.js, hi-storage.js, hi-app.js
====================================================== */

var HI_WALLET_MAX_SUPPLY = 99;

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
  return wallet;
}

function hiWalletSetText(id, value) {
  var el = document.getElementById(id);
  if (el) el.textContent = value;
}

function hiWalletSetStatus(message, type) {
  var el = document.getElementById("walletStatus");
  if (!el) return;
  el.textContent = message || "";
  el.className = "wallet-status" + (type ? " " + type : "");
}

function hiWalletRenderLocked() {
  var locked = document.getElementById("walletLocked");
  var form = document.getElementById("walletMintForm");
  if (locked) locked.classList.add("active");
  if (form) form.hidden = true;
  hiWalletSetText("walletBalance", "0");
  hiWalletSetText("walletRemaining", "99");
  hiWalletSetText("walletHdi", "Identity required");
  hiWalletSetText("walletOwner", "No registered HI identity");
  hiWalletSetText("walletDevice", hiWalletDeviceId());
  hiWalletSetText("walletFingerprint", "Pending");
  hiWalletSetText("walletAddress", "Create your HI identity first.");
}

function hiWalletRenderLedger(wallet) {
  var list = document.getElementById("walletLedger");
  if (!list) return;
  var txs = wallet && Array.isArray(wallet.transactions) ? wallet.transactions.slice().reverse() : [];
  if (!txs.length) {
    list.innerHTML = '<p class="wallet-empty">No coin generated yet. Use the generator after your HI identity is active.</p>';
    return;
  }
  list.innerHTML = txs.map(function(tx) {
    var d = new Date(tx.createdAt || Date.now()).toLocaleString("en-IN", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
    });
    return '<article class="wallet-tx">' +
      '<span>' + hiEsc(d) + '</span>' +
      '<div><strong>' + hiEsc(tx.type || "Generated") + '</strong><code>' + hiEsc(tx.hash || "") + '</code></div>' +
      '<div class="wallet-tx-amount">+' + hiEsc(tx.amount) + ' HI</div>' +
    '</article>';
  }).join("");
}

function hiWalletRender(identity, wallet) {
  var locked = document.getElementById("walletLocked");
  var form = document.getElementById("walletMintForm");
  if (locked) locked.classList.remove("active");
  if (form) form.hidden = false;

  var balance = Number(wallet.balance || 0);
  var remaining = Math.max(0, HI_WALLET_MAX_SUPPLY - balance);
  hiWalletSetText("walletBalance", String(balance));
  hiWalletSetText("walletRemaining", String(remaining));
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
    hiWalletSetStatus("This identity/device wallet already generated the 99 HI coin maximum.", "");
  }
  hiWalletRenderLedger(wallet);
}

async function hiWalletGenerateCoin(identity, wallet, amount) {
  var nextBalance = Number(wallet.balance || 0) + amount;
  var now = Date.now();
  var txRaw = [
    wallet.id,
    identity.hdi,
    wallet.deviceFingerprint,
    amount,
    nextBalance,
    now
  ].join("|");
  var tx = {
    id: "tx_" + hiGenId(),
    type: "Identity Coin Generation",
    amount: amount,
    hdi: identity.hdi,
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

async function hiWalletInit() {
  try { await hiOpenDB(); } catch (e) {}
  var userEl = document.getElementById("authUserDisplay");
  if (userEl && typeof getAuthUser === "function") userEl.textContent = getAuthUser() || "";
  var logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn && typeof logout === "function") logoutBtn.addEventListener("click", logout);

  var identity = typeof hiLoadIdentity === "function" ? await hiLoadIdentity() : null;
  if (!identity || !identity.hdi) {
    hiWalletRenderLocked();
    return;
  }

  var wallet = await hiWalletLoadOrCreate(identity);
  hiWalletRender(identity, wallet);

  var form = document.getElementById("walletMintForm");
  if (!form) return;
  form.addEventListener("submit", async function(e) {
    e.preventDefault();
    hiWalletSetStatus("", "");
    var input = document.getElementById("walletMintAmount");
    var amount = parseInt(input ? input.value : "0", 10);
    if (!Number.isFinite(amount) || amount < 1 || amount > 99) {
      hiWalletSetStatus("Enter a coin amount from 1 to 99.", "error");
      return;
    }
    var remaining = HI_WALLET_MAX_SUPPLY - Number(wallet.balance || 0);
    if (amount > remaining) {
      hiWalletSetStatus("Only " + remaining + " HI coin can still be generated for this identity/device.", "error");
      return;
    }
    wallet = await hiWalletGenerateCoin(identity, wallet, amount);
    if (input) input.value = "";
    hiWalletRender(identity, wallet);
    hiWalletSetStatus("Generated " + amount + " HI coin and saved it with your HDI/device identity.", "success");
  });
}

document.addEventListener("DOMContentLoaded", hiWalletInit);
