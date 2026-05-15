"use strict";

/* ======================================================
   hi-ecosystem.js
   Merchant + marketplace prototype surfaces for HI Wallet
   Depends on: auth.js, hi-storage.js, hi-app.js, hi-wallet.js
====================================================== */

var HI_MERCHANT_ID = "primary";

var HI_MARKETPLACE_SERVICES = [
  {
    id: "website-starter",
    title: "Website Starter",
    category: "Web",
    description: "Single-page identity website with contact, service section, and responsive design.",
    inr: 4999,
    hi: 4500
  },
  {
    id: "seo-review",
    title: "SEO Review",
    category: "Growth",
    description: "Technical SEO scan, page metadata cleanup, and practical improvement report.",
    inr: 1499,
    hi: 1200
  },
  {
    id: "ai-help",
    title: "AI Help Session",
    category: "AI",
    description: "Prompt workflow, automation idea, or AI setup guidance for one focused problem.",
    inr: 799,
    hi: 650
  },
  {
    id: "bug-report",
    title: "Verified Bug Report",
    category: "Contribution",
    description: "Submit a useful bug report or UX issue and receive an ecosystem reward.",
    inr: 0,
    hi: -5
  },
  {
    id: "lesson-complete",
    title: "Complete Lesson",
    category: "Education",
    description: "Finish a learning module and record education progress in the wallet ledger.",
    inr: 0,
    hi: -2
  },
  {
    id: "community-answer",
    title: "Community Help",
    category: "Trust",
    description: "Answer a practical community question and earn a small trust-based reward.",
    inr: 0,
    hi: -3
  }
];

function hiEcoText(id, value) {
  var el = document.getElementById(id);
  if (el) el.textContent = value;
}

function hiEcoStatus(id, message, type) {
  var el = document.getElementById(id);
  if (!el) return;
  el.textContent = message || "";
  el.className = "ecosystem-status" + (type ? " " + type : "");
}

async function hiEcoSecurityState(identity, wallet) {
  if (typeof hiWalletCurrentSecurityState === "function") {
    return await hiWalletCurrentSecurityState(identity, wallet);
  }
  return {
    trusted: true,
    canUse: !!(identity && wallet)
  };
}

async function hiEcoBuildReceipt(identity, wallet, payload) {
  var receipt = {
    createdAt: new Date().toISOString(),
    identityHdi: identity && identity.hdi ? identity.hdi : "",
    merchantHdi: "",
    deviceTrustId: wallet && wallet.currentDeviceTrustId ? wallet.currentDeviceTrustId : "",
    trustScore: wallet && typeof hiWalletTrustScore === "function" ? hiWalletTrustScore(identity, wallet) : 0,
    payload: payload
  };
  if (typeof hiCryptoSignPayload === "function") {
    receipt.signatureProof = await hiCryptoSignPayload(receipt.payload);
  }
  return receipt;
}

function hiEcoSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "merchant";
}

async function hiEcoLoadIdentityAndWallet() {
  try { await hiOpenDB(); } catch (e) {}
  var userEl = document.getElementById("authUserDisplay");
  if (userEl && typeof getAuthUser === "function") userEl.textContent = getAuthUser() || "";
  var logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn && typeof logout === "function") logoutBtn.addEventListener("click", logout);

  var identity = typeof hiLoadIdentity === "function" ? await hiLoadIdentity() : null;
  if (!identity || !identity.hdi) return { identity: null, wallet: null };
  var wallet = typeof hiWalletLoadOrCreate === "function" ? await hiWalletLoadOrCreate(identity) : null;
  return { identity: identity, wallet: wallet };
}

async function hiEcoMerchantAddress(name, hdi) {
  var slug = hiEcoSlug(name);
  var hash = typeof hiWalletHash === "function"
    ? await hiWalletHash(slug + "|" + hdi + "|" + Date.now())
    : String(Date.now().toString(36) + Math.random().toString(36).slice(2));
  return "hiwm_" + slug + "_" + hash.slice(0, 8);
}

async function hiEcoMerchantHdi(name) {
  var slug = hiEcoSlug(name).replace(/-/g, "").slice(0, 5).toUpperCase() || "MER";
  var hash = typeof hiWalletHash === "function"
    ? await hiWalletHash(name + "|" + hiWalletDeviceId())
    : Math.random().toString(36).slice(2, 8);
  return "MER-" + slug + "-" + new Date().getFullYear() + "-" + hash.slice(0, 6).toUpperCase();
}

async function hiEcoLoadMerchant() {
  try { return await hiGet("merchant", HI_MERCHANT_ID); }
  catch (e) { return null; }
}

async function hiEcoSaveMerchant(merchant) {
  merchant.id = HI_MERCHANT_ID;
  merchant.updatedAt = Date.now();
  if (!merchant.createdAt) merchant.createdAt = Date.now();
  await hiPut("merchant", merchant);
  return merchant;
}

function hiEcoRenderLocked() {
  var locked = document.getElementById("ecosystemLocked");
  if (locked) locked.classList.add("active");
  Array.prototype.forEach.call(document.querySelectorAll(".ecosystem-form, .ecosystem-action[data-requires-wallet]"), function(el) {
    el.hidden = el.classList.contains("ecosystem-form") ? true : el.hidden;
    if (el.tagName === "BUTTON") el.disabled = true;
  });
}

function hiEcoMerchantQr(merchant, amount) {
  if (!merchant) return "Create merchant profile";
  return "hi://merchant/" + hiEcoSlug(merchant.name) + "?id=" + encodeURIComponent(merchant.merchantHdi) + "&amount=" + encodeURIComponent(amount || 0);
}

function hiEcoRenderMerchant(merchant) {
  merchant = merchant || {};
  var payments = Array.isArray(merchant.payments) ? merchant.payments : [];
  var total = payments.reduce(function(sum, item) { return sum + Number(item.amountHi || 0); }, 0);
  var customers = {};
  payments.forEach(function(item) { if (item.customer) customers[item.customer] = true; });

  hiEcoText("merchantNameView", merchant.name || "Not onboarded");
  hiEcoText("merchantHdiView", merchant.merchantHdi || "Pending");
  hiEcoText("merchantWalletView", merchant.walletAddress || "Pending");
  hiEcoText("merchantCategoryView", merchant.category || "Service");
  hiEcoText("merchantSalesView", String(payments.length));
  hiEcoText("merchantCustomersView", String(Object.keys(customers).length));
  hiEcoText("merchantReceivedView", String(total) + " HI");
  hiEcoText("merchantSettlementView", "Simulated INR");
  hiEcoText("merchantQrCode", hiEcoMerchantQr(merchant, document.getElementById("merchantQrAmount") ? document.getElementById("merchantQrAmount").value : ""));

  var list = document.getElementById("merchantPaymentLog");
  if (!list) return;
  if (!payments.length) {
    list.innerHTML = '<p class="ecosystem-status">No merchant payments recorded yet.</p>';
    return;
  }
  list.innerHTML = payments.slice().reverse().map(function(payment) {
    var d = new Date(payment.createdAt || Date.now()).toLocaleString("en-IN", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
    });
    var proofState = payment.signedReceipt && payment.signedReceipt.signature ? "Signed receipt" : "Local log";
    var proofHash = payment.signedReceipt && payment.signedReceipt.signature ? String(payment.signedReceipt.signature).slice(0, 14) : "";
    return '<article class="ecosystem-row"><div><strong>' + hiEsc(payment.customer || "Customer") + '</strong><small>' +
      hiEsc(d + " - " + (payment.status || "SIMULATED_SETTLED")) + '</small><small>' +
      hiEsc(proofState + (proofHash ? " · " + proofHash : "")) + '</small></div><div class="ecosystem-amount">+' +
      hiEsc(payment.amountHi) + ' HI</div></article>';
  }).join("");
}

async function hiEcoInitMerchant() {
  var state = await hiEcoLoadIdentityAndWallet();
  if (!state.identity) {
    hiEcoRenderLocked();
    hiEcoRenderMerchant(null);
    return;
  }

  var merchant = await hiEcoLoadMerchant();
  hiEcoRenderMerchant(merchant);

  async function merchantSecurityGate(statusId) {
    var security = await hiEcoSecurityState(state.identity, state.wallet);
    if (!security.canUse) {
      hiEcoStatus(statusId, "Unlock and trust the identity key before merchant actions.", "error");
      return null;
    }
    return security;
  }

  var form = document.getElementById("merchantOnboardForm");
  if (form) form.addEventListener("submit", async function(e) {
    e.preventDefault();
    hiEcoStatus("merchantStatus", "", "");
    var nameEl = document.getElementById("merchantName");
    var categoryEl = document.getElementById("merchantCategory");
    var upiEl = document.getElementById("merchantUpi");
    var name = nameEl ? nameEl.value.trim() : "";
    if (!name) {
      hiEcoStatus("merchantStatus", "Enter a merchant name.", "error");
      return;
    }
    var security = await merchantSecurityGate("merchantStatus");
    if (!security) return;
    merchant = merchant || { payments: [] };
    merchant.name = name;
    merchant.category = categoryEl ? categoryEl.value : "Service";
    merchant.settlementUpi = upiEl ? upiEl.value.trim() : "";
    merchant.ownerHdi = state.identity.hdi;
    merchant.merchantHdi = merchant.merchantHdi || await hiEcoMerchantHdi(name);
    merchant.walletAddress = merchant.walletAddress || await hiEcoMerchantAddress(name, state.identity.hdi);
    merchant = await hiEcoSaveMerchant(merchant);
    hiEcoRenderMerchant(merchant);
    hiEcoStatus("merchantStatus", "Merchant profile saved locally.", "success");
  });

  var qrAmount = document.getElementById("merchantQrAmount");
  if (qrAmount) qrAmount.addEventListener("input", function() { hiEcoRenderMerchant(merchant); });

  var payForm = document.getElementById("merchantPaymentForm");
  if (payForm) payForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    hiEcoStatus("merchantPaymentStatus", "", "");
    var security = await merchantSecurityGate("merchantPaymentStatus");
    if (!security) return;
    if (!merchant || !merchant.merchantHdi) {
      hiEcoStatus("merchantPaymentStatus", "Create merchant profile first.", "error");
      return;
    }
    var customerEl = document.getElementById("merchantCustomer");
    var amountEl = document.getElementById("merchantPaymentAmount");
    var amount = parseInt(amountEl ? amountEl.value : "0", 10);
    if (!Number.isFinite(amount) || amount < 1) {
      hiEcoStatus("merchantPaymentStatus", "Enter a valid HI amount.", "error");
      return;
    }
    merchant.payments = Array.isArray(merchant.payments) ? merchant.payments : [];
    var receiptPayload = {
      type: "merchant-payment",
      merchantHdi: merchant.merchantHdi,
      merchantName: merchant.name,
      customer: customerEl && customerEl.value.trim() ? customerEl.value.trim() : state.identity.hdi,
      amountHi: amount,
      status: "SIMULATED_SETTLED",
      createdAt: Date.now(),
      trustScore: state.wallet ? hiWalletTrustScore(state.identity, state.wallet) : 0
    };
    var receipt = await hiEcoBuildReceipt(state.identity, state.wallet, receiptPayload);
    merchant.payments.push({
      id: "mp_" + hiGenId(),
      customer: receiptPayload.customer,
      amountHi: amount,
      status: "SIMULATED_SETTLED",
      createdAt: receiptPayload.createdAt,
      trustScore: receiptPayload.trustScore,
      signedReceipt: receipt.signatureProof || null,
      receiptPayload: receiptPayload
    });
    merchant = await hiEcoSaveMerchant(merchant);
    if (amountEl) amountEl.value = "";
    hiEcoRenderMerchant(merchant);
    hiEcoStatus("merchantPaymentStatus", receipt.signatureProof ? "Merchant payment recorded with signed receipt." : "Merchant payment recorded. No real INR moved.", "success");
  });
}

function hiEcoRenderMarketplace(identity, wallet) {
  hiEcoText("marketWalletBalance", wallet ? String(wallet.balance || 0) + " HI" : "Locked");
  hiEcoText("marketTrustScore", wallet && typeof hiWalletTrustScore === "function" ? String(hiWalletTrustScore(identity, wallet)) : "0");
  hiEcoText("marketHdi", identity ? identity.hdi : "Identity required");

  var grid = document.getElementById("marketplaceGrid");
  if (!grid) return;
  grid.innerHTML = HI_MARKETPLACE_SERVICES.map(function(service) {
    var isReward = service.hi < 0;
    var amount = Math.abs(service.hi);
    return '<article class="ecosystem-card">' +
      '<span>' + hiEsc(service.category) + '</span>' +
      '<h3>' + hiEsc(service.title) + '</h3>' +
      '<p>' + hiEsc(service.description) + '</p>' +
      '<div class="ecosystem-price">' +
        (service.inr ? '<b>INR ' + hiEsc(service.inr) + '</b>' : '<b>Contribution</b>') +
        '<b>' + (isReward ? "Earn +" : "Pay ") + hiEsc(amount) + ' HI</b>' +
      '</div>' +
      '<div class="ecosystem-actions">' +
        '<button class="ecosystem-action primary" data-market-service="' + hiEsc(service.id) + '" type="button"' + (!wallet ? " disabled" : "") + '>' + (isReward ? "Record Reward" : "Pay With HI") + '</button>' +
      '</div>' +
    '</article>';
  }).join("");
}

async function hiEcoInitMarketplace() {
  var state = await hiEcoLoadIdentityAndWallet();
  if (!state.identity || !state.wallet) {
    hiEcoRenderLocked();
    hiEcoRenderMarketplace(state.identity, state.wallet);
    return;
  }

  var wallet = state.wallet;
  hiEcoRenderMarketplace(state.identity, wallet);
  var security = await hiEcoSecurityState(state.identity, wallet);
  if (!security.canUse) {
    hiEcoStatus("marketplaceStatus", "Unlock and trust the identity key before marketplace payments.", "error");
  }

  var grid = document.getElementById("marketplaceGrid");
  if (grid) grid.addEventListener("click", async function(e) {
    var btn = e.target.closest("[data-market-service]");
    if (!btn) return;
    hiEcoStatus("marketplaceStatus", "", "");
    var paymentSecurity = await hiEcoSecurityState(state.identity, wallet);
    if (!paymentSecurity.canUse) {
      hiEcoStatus("marketplaceStatus", "Unlock and trust the identity key before marketplace payments.", "error");
      return;
    }
    var service = HI_MARKETPLACE_SERVICES.filter(function(item) { return item.id === btn.getAttribute("data-market-service"); })[0];
    if (!service) return;
    var isReward = service.hi < 0;
    var amount = Math.abs(service.hi);
    if (!isReward && amount > Number(wallet.balance || 0)) {
      hiEcoStatus("marketplaceStatus", "Insufficient HI balance for this service payment.", "error");
      return;
    }
    var receiptPayload = {
      type: isReward ? "service-reward" : "service-payment",
      serviceId: service.id,
      serviceTitle: service.title,
      amountHi: amount,
      direction: isReward ? "credit" : "debit",
      createdAt: Date.now(),
      trustScore: hiWalletTrustScore(state.identity, wallet)
    };
    var receipt = await hiEcoBuildReceipt(state.identity, wallet, receiptPayload);
    wallet = await hiWalletAddTransaction(state.identity, wallet, {
      type: isReward ? "Service Economy Reward" : "Service Marketplace Payment",
      direction: isReward ? "credit" : "debit",
      amount: amount,
      counterparty: service.title,
      note: isReward ? "Earned through HI service economy" : "Prototype HI service payment"
    });
    hiEcoRenderMarketplace(state.identity, wallet);
    hiEcoStatus("marketplaceStatus", receipt.signatureProof ? (isReward ? "Reward added with signed proof." : "Service payment recorded with signed proof.") : (isReward ? "Reward added to your HI ledger." : "Service payment recorded in your HI ledger."), "success");
  });

  var earnForm = document.getElementById("marketEarnForm");
  if (earnForm) earnForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    hiEcoStatus("marketEarnStatus", "", "");
    var reasonEl = document.getElementById("marketEarnReason");
    var amountEl = document.getElementById("marketEarnAmount");
    var amount = parseInt(amountEl ? amountEl.value : "0", 10);
    if (!Number.isFinite(amount) || amount < 1 || amount > HI_WALLET_MAX_SUPPLY) {
      hiEcoStatus("marketEarnStatus", "Enter a reward amount from 1 to " + HI_WALLET_MAX_SUPPLY + " HI.", "error");
      return;
    }
    wallet = await hiWalletAddTransaction(state.identity, wallet, {
      type: "Verified Ecosystem Contribution",
      direction: "credit",
      amount: amount,
      counterparty: "HI Marketplace",
      note: reasonEl ? reasonEl.value : "Verified Contribution"
    });
    if (amountEl) amountEl.value = "";
    hiEcoRenderMarketplace(state.identity, wallet);
    hiEcoStatus("marketEarnStatus", "Contribution reward saved to your ledger with the current trust state.", "success");
  });
}

document.addEventListener("DOMContentLoaded", function() {
  if (document.body.classList.contains("merchant-page")) hiEcoInitMerchant();
  if (document.body.classList.contains("marketplace-page")) hiEcoInitMarketplace();
});
