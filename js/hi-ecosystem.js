"use strict";

/* ======================================================
   hi-ecosystem.js
   Merchant + marketplace prototype surfaces for HI Wallet
   Depends on: auth.js, hi-storage.js, hi-app.js, hi-wallet.js
====================================================== */

const HI_MERCHANT_ID = "primary";

const HI_MARKETPLACE_SERVICES = [
  {
    id:          "website-starter",
    title:       "Website Starter",
    category:    "Web",
    description: "Single-page identity website with contact, service section, and responsive design.",
    inr:         4999,
    hi:          4500,
  },
  {
    id:          "seo-review",
    title:       "SEO Review",
    category:    "Growth",
    description: "Technical SEO scan, page metadata cleanup, and practical improvement report.",
    inr:         1499,
    hi:          1200,
  },
  {
    id:          "ai-help",
    title:       "AI Help Session",
    category:    "AI",
    description: "Prompt workflow, automation idea, or AI setup guidance for one focused problem.",
    inr:         799,
    hi:          650,
  },
  {
    id:          "bug-report",
    title:       "Verified Bug Report",
    category:    "Contribution",
    description: "Submit a useful bug report or UX issue and receive an ecosystem reward.",
    inr:         0,
    hi:          -5,
  },
  {
    id:          "lesson-complete",
    title:       "Complete Lesson",
    category:    "Education",
    description: "Finish a learning module and record education progress in the wallet ledger.",
    inr:         0,
    hi:          -2,
  },
  {
    id:          "community-answer",
    title:       "Community Help",
    category:    "Trust",
    description: "Answer a practical community question and earn a small trust-based reward.",
    inr:         0,
    hi:          -3,
  },
];

function hiEcoText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function hiEcoStatus(id, message, type = "") {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message ?? "";
  el.className   = type ? `ecosystem-status ${type}` : "ecosystem-status";
}

async function hiEcoSecurityState(identity, wallet) {
  if (typeof hiWalletCurrentSecurityState === "function") {
    return hiWalletCurrentSecurityState(identity, wallet);
  }
  return { trusted: true, canUse: !!(identity && wallet) };
}

async function hiEcoBuildReceipt(identity, wallet, payload) {
  const receipt = {
    createdAt:       new Date().toISOString(),
    identityHdi:     identity?.hdi ?? "",
    merchantHdi:     "",
    deviceTrustId:   wallet?.currentDeviceTrustId ?? "",
    trustScore:      (wallet && typeof hiWalletTrustScore === "function") ? hiWalletTrustScore(identity, wallet) : 0,
    payload,
  };
  if (typeof hiCryptoSignPayload === "function") {
    receipt.signatureProof = await hiCryptoSignPayload(receipt.payload);
  }
  return receipt;
}

function hiEcoSlug(value) {
  return String(value ?? "")
    .trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "merchant";
}

async function hiEcoLoadIdentityAndWallet() {
  try { await hiOpenDB(); } catch { /* degraded mode */ }
  const userEl = document.getElementById("authUserDisplay");
  if (userEl && typeof getAuthUser === "function") userEl.textContent = getAuthUser() ?? "";
  document.getElementById("logoutBtn")?.addEventListener("click", () => typeof logout === "function" && logout());

  const identity = typeof hiLoadIdentity === "function" ? await hiLoadIdentity() : null;
  if (!identity?.hdi) return { identity: null, wallet: null };
  const wallet   = typeof hiWalletLoadOrCreate === "function" ? await hiWalletLoadOrCreate(identity) : null;
  return { identity, wallet };
}

async function hiEcoMerchantAddress(name, hdi) {
  const slug = hiEcoSlug(name);
  const hash = typeof hiWalletHash === "function"
    ? await hiWalletHash(`${slug}|${hdi}|${Date.now()}`)
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  return `hiwm_${slug}_${hash.slice(0, 8)}`;
}

async function hiEcoMerchantHdi(name) {
  const slug = hiEcoSlug(name).replace(/-/g, "").slice(0, 5).toUpperCase() || "MER";
  const hash = typeof hiWalletHash === "function"
    ? await hiWalletHash(`${name}|${hiWalletDeviceId()}`)
    : Math.random().toString(36).slice(2, 8);
  return `MER-${slug}-${new Date().getFullYear()}-${hash.slice(0, 6).toUpperCase()}`;
}

async function hiEcoLoadMerchant() {
  try { return await hiGet("merchant", HI_MERCHANT_ID); }
  catch { return null; }
}

async function hiEcoSaveMerchant(merchant) {
  merchant.id        = HI_MERCHANT_ID;
  merchant.updatedAt = Date.now();
  if (!merchant.createdAt) merchant.createdAt = Date.now();
  await hiPut("merchant", merchant);
  return merchant;
}

function hiEcoRenderLocked() {
  document.getElementById("ecosystemLocked")?.classList.add("active");
  document.querySelectorAll(".ecosystem-form, .ecosystem-action[data-requires-wallet]").forEach(el => {
    if (el.classList.contains("ecosystem-form")) el.hidden = true;
    if (el.tagName === "BUTTON") el.disabled = true;
  });
}

function hiEcoMerchantQr(merchant, amount) {
  if (!merchant) return "Create merchant profile";
  return `hi://merchant/${hiEcoSlug(merchant.name)}?id=${encodeURIComponent(merchant.merchantHdi)}&amount=${encodeURIComponent(amount ?? 0)}`;
}

function hiEcoRenderMerchant(merchant) {
  merchant = merchant ?? {};
  const payments  = Array.isArray(merchant.payments) ? merchant.payments : [];
  const total     = payments.reduce((sum, item) => sum + Number(item.amountHi ?? 0), 0);
  const customers = {};
  payments.forEach(item => { if (item.customer) customers[item.customer] = true; });

  hiEcoText("merchantNameView",       merchant.name          || "Not onboarded");
  hiEcoText("merchantHdiView",        merchant.merchantHdi   || "Pending");
  hiEcoText("merchantWalletView",     merchant.walletAddress  || "Pending");
  hiEcoText("merchantCategoryView",   merchant.category       || "Service");
  hiEcoText("merchantSalesView",      String(payments.length));
  hiEcoText("merchantCustomersView",  String(Object.keys(customers).length));
  hiEcoText("merchantReceivedView",   `${total} HI`);
  hiEcoText("merchantSettlementView", "Simulated INR");
  hiEcoText("merchantQrCode",         hiEcoMerchantQr(merchant, document.getElementById("merchantQrAmount")?.value ?? ""));

  const list = document.getElementById("merchantPaymentLog");
  if (!list) return;
  if (!payments.length) {
    list.innerHTML = '<p class="ecosystem-status">No merchant payments recorded yet.</p>';
    return;
  }
  list.innerHTML = [...payments].reverse().map(payment => {
    const d         = new Date(payment.createdAt ?? Date.now()).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    const proofState = payment.signedReceipt?.signature ? "Signed receipt" : "Local log";
    const proofHash  = payment.signedReceipt?.signature ? String(payment.signedReceipt.signature).slice(0, 14) : "";
    return `<article class="ecosystem-row"><div><strong>${hiEsc(payment.customer || "Customer")}</strong>` +
      `<small>${hiEsc(`${d} - ${payment.status || "SIMULATED_SETTLED"}`)}</small>` +
      `<small>${hiEsc(`${proofState}${proofHash ? ` · ${proofHash}` : ""}`)}</small></div>` +
      `<div class="ecosystem-amount">+${hiEsc(payment.amountHi)} HI</div></article>`;
  }).join("");
}

async function hiEcoInitMerchant() {
  const state = await hiEcoLoadIdentityAndWallet();
  if (!state.identity) { hiEcoRenderLocked(); hiEcoRenderMerchant(null); return; }

  let merchant = await hiEcoLoadMerchant();
  hiEcoRenderMerchant(merchant);

  const merchantSecurityGate = async statusId => {
    const security = await hiEcoSecurityState(state.identity, state.wallet);
    if (!security.canUse) { hiEcoStatus(statusId, "Unlock and trust the identity key before merchant actions.", "error"); return null; }
    return security;
  };

  document.getElementById("merchantOnboardForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    hiEcoStatus("merchantStatus", "", "");
    const name = (document.getElementById("merchantName")?.value ?? "").trim();
    if (!name) { hiEcoStatus("merchantStatus", "Enter a merchant name.", "error"); return; }
    if (!await merchantSecurityGate("merchantStatus")) return;
    merchant               = merchant ?? { payments: [] };
    merchant.name          = name;
    merchant.category      = document.getElementById("merchantCategory")?.value ?? "Service";
    merchant.settlementUpi = (document.getElementById("merchantUpi")?.value ?? "").trim();
    merchant.ownerHdi      = state.identity.hdi;
    merchant.merchantHdi   = merchant.merchantHdi   || await hiEcoMerchantHdi(name);
    merchant.walletAddress  = merchant.walletAddress  || await hiEcoMerchantAddress(name, state.identity.hdi);
    merchant = await hiEcoSaveMerchant(merchant);
    hiEcoRenderMerchant(merchant);
    hiEcoStatus("merchantStatus", "Merchant profile saved locally.", "success");
  });

  document.getElementById("merchantQrAmount")?.addEventListener("input", () => hiEcoRenderMerchant(merchant));

  document.getElementById("merchantPaymentForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    hiEcoStatus("merchantPaymentStatus", "", "");
    if (!await merchantSecurityGate("merchantPaymentStatus")) return;
    if (!merchant?.merchantHdi) { hiEcoStatus("merchantPaymentStatus", "Create merchant profile first.", "error"); return; }
    const amount = parseInt(document.getElementById("merchantPaymentAmount")?.value ?? "0", 10);
    if (!Number.isFinite(amount) || amount < 1) { hiEcoStatus("merchantPaymentStatus", "Enter a valid HI amount.", "error"); return; }
    merchant.payments = Array.isArray(merchant.payments) ? merchant.payments : [];
    const customer = (document.getElementById("merchantCustomer")?.value ?? "").trim() || state.identity.hdi;
    const receiptPayload = {
      type:         "merchant-payment",
      merchantHdi:  merchant.merchantHdi,
      merchantName: merchant.name,
      customer,
      amountHi:     amount,
      status:       "SIMULATED_SETTLED",
      createdAt:    Date.now(),
      trustScore:   state.wallet ? hiWalletTrustScore(state.identity, state.wallet) : 0,
    };
    const receipt = await hiEcoBuildReceipt(state.identity, state.wallet, receiptPayload);
    merchant.payments.push({
      id:             `mp_${hiGenId()}`,
      customer:       receiptPayload.customer,
      amountHi:       amount,
      status:         "SIMULATED_SETTLED",
      createdAt:      receiptPayload.createdAt,
      trustScore:     receiptPayload.trustScore,
      signedReceipt:  receipt.signatureProof ?? null,
      receiptPayload,
    });
    merchant = await hiEcoSaveMerchant(merchant);
    const amountEl = document.getElementById("merchantPaymentAmount");
    if (amountEl) amountEl.value = "";
    hiEcoRenderMerchant(merchant);
    hiEcoStatus("merchantPaymentStatus", receipt.signatureProof
      ? "Merchant payment recorded with signed receipt."
      : "Merchant payment recorded. No real INR moved.", "success");
  });
}

function hiEcoRenderMarketplace(identity, wallet) {
  hiEcoText("marketWalletBalance", wallet ? `${wallet.balance ?? 0} HI` : "Locked");
  hiEcoText("marketTrustScore",    (wallet && typeof hiWalletTrustScore === "function") ? String(hiWalletTrustScore(identity, wallet)) : "0");
  hiEcoText("marketHdi",           identity?.hdi ?? "Identity required");

  const grid = document.getElementById("marketplaceGrid");
  if (!grid) return;
  grid.innerHTML = HI_MARKETPLACE_SERVICES.map(service => {
    const isReward = service.hi < 0;
    const amount   = Math.abs(service.hi);
    return `<article class="ecosystem-card">` +
      `<span>${hiEsc(service.category)}</span>` +
      `<h3>${hiEsc(service.title)}</h3>` +
      `<p>${hiEsc(service.description)}</p>` +
      `<div class="ecosystem-price">` +
        (service.inr ? `<b>INR ${hiEsc(service.inr)}</b>` : `<b>Contribution</b>`) +
        `<b>${isReward ? "Earn +" : "Pay "}${hiEsc(amount)} HI</b>` +
      `</div>` +
      `<div class="ecosystem-actions">` +
        `<button class="ecosystem-action primary" data-market-service="${hiEsc(service.id)}" type="button"${!wallet ? " disabled" : ""}>` +
          (isReward ? "Record Reward" : "Pay With HI") +
        `</button>` +
      `</div>` +
    `</article>`;
  }).join("");
}

async function hiEcoInitMarketplace() {
  const state = await hiEcoLoadIdentityAndWallet();
  if (!state.identity || !state.wallet) {
    hiEcoRenderLocked();
    hiEcoRenderMarketplace(state.identity, state.wallet);
    return;
  }

  let wallet = state.wallet;
  hiEcoRenderMarketplace(state.identity, wallet);

  const security = await hiEcoSecurityState(state.identity, wallet);
  if (!security.canUse) {
    hiEcoStatus("marketplaceStatus", "Unlock and trust the identity key before marketplace payments.", "error");
  }

  document.getElementById("marketplaceGrid")?.addEventListener("click", async e => {
    const btn = e.target.closest("[data-market-service]");
    if (!btn) return;
    hiEcoStatus("marketplaceStatus", "", "");
    const paymentSecurity = await hiEcoSecurityState(state.identity, wallet);
    if (!paymentSecurity.canUse) {
      hiEcoStatus("marketplaceStatus", "Unlock and trust the identity key before marketplace payments.", "error");
      return;
    }
    const service = HI_MARKETPLACE_SERVICES.find(s => s.id === btn.getAttribute("data-market-service"));
    if (!service) return;
    const isReward = service.hi < 0;
    const amount   = Math.abs(service.hi);
    if (!isReward && amount > Number(wallet.balance ?? 0)) {
      hiEcoStatus("marketplaceStatus", "Insufficient HI balance for this service payment.", "error");
      return;
    }
    const receiptPayload = {
      type:         isReward ? "service-reward" : "service-payment",
      serviceId:    service.id,
      serviceTitle: service.title,
      amountHi:     amount,
      direction:    isReward ? "credit" : "debit",
      createdAt:    Date.now(),
      trustScore:   hiWalletTrustScore(state.identity, wallet),
    };
    const receipt = await hiEcoBuildReceipt(state.identity, wallet, receiptPayload);
    wallet = await hiWalletAddTransaction(state.identity, wallet, {
      type:         isReward ? "Service Economy Reward" : "Service Marketplace Payment",
      direction:    isReward ? "credit" : "debit",
      amount,
      counterparty: service.title,
      note:         isReward ? "Earned through HI service economy" : "Prototype HI service payment",
    });
    hiEcoRenderMarketplace(state.identity, wallet);
    hiEcoStatus("marketplaceStatus", receipt.signatureProof
      ? (isReward ? "Reward added with signed proof." : "Service payment recorded with signed proof.")
      : (isReward ? "Reward added to your HI ledger."  : "Service payment recorded in your HI ledger."), "success");
  });

  document.getElementById("marketEarnForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    hiEcoStatus("marketEarnStatus", "", "");
    const amount = parseInt(document.getElementById("marketEarnAmount")?.value ?? "0", 10);
    if (!Number.isFinite(amount) || amount < 1 || amount > HI_WALLET_MAX_SUPPLY) {
      hiEcoStatus("marketEarnStatus", `Enter a reward amount from 1 to ${HI_WALLET_MAX_SUPPLY} HI.`, "error");
      return;
    }
    wallet = await hiWalletAddTransaction(state.identity, wallet, {
      type:         "Verified Ecosystem Contribution",
      direction:    "credit",
      amount,
      counterparty: "HI Marketplace",
      note:         document.getElementById("marketEarnReason")?.value || "Verified Contribution",
    });
    const amountEl = document.getElementById("marketEarnAmount");
    if (amountEl) amountEl.value = "";
    hiEcoRenderMarketplace(state.identity, wallet);
    hiEcoStatus("marketEarnStatus", "Contribution reward saved to your ledger with the current trust state.", "success");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.classList.contains("merchant-page"))   hiEcoInitMerchant();
  if (document.body.classList.contains("marketplace-page")) hiEcoInitMarketplace();
}, { once: true });
