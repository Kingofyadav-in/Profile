"use strict";

(function () {
  const ORDER_KEY       = "ky_service_orders";
  const ORDER_ID_PREFIX = "ORD";

  const PLANS = {
    starter: {
      key: "starter", label: "Starter Hosting", amount: "₹99/mo",
      short:   "Perfect for personal sites, simple launches, and portfolios.",
      details: ["1 website", "SSL and SSD hosting", "1 email account"],
      note:    "Good first step for a clean launch.",
    },
    pro: {
      key: "pro", label: "Pro Hosting", amount: "₹299/mo",
      short:   "For growing websites, multiple pages, and daily updates.",
      details: ["5 websites", "Daily backups", "Priority support"],
      note:    "Best for active business sites.",
    },
    store: {
      key: "store", label: "E-Commerce Store", amount: "₹899/mo",
      short:   "For shops that need catalog, checkout, and payment flow.",
      details: ["Product catalog", "Cart and checkout", "Order tracking setup"],
      note:    "Use this when you want to sell online.",
    },
    business: {
      key: "business", label: "Business Hosting", amount: "₹599/mo",
      short:   "For larger sites, stronger traffic, and formal business use.",
      details: ["Unlimited websites", "50 GB NVMe SSD", "Free domain for 1 year"],
      note:    "Solid for public-facing operations.",
    },
    custom: {
      key: "custom", label: "Custom Build", amount: "Quote",
      short:   "For websites, automation, software, or service systems that need a tailored scope.",
      details: ["Scope review", "Custom timeline", "Fixed quote after review"],
      note:    "Quote after scope confirmation.",
    },
  };

  function esc(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function getOrders() {
    try { return JSON.parse(localStorage.getItem(ORDER_KEY) ?? "[]"); }
    catch { return []; }
  }

  function upsertOrder(order) {
    const orders = getOrders();
    const idx    = orders.findIndex(item => item?.orderId === order.orderId);
    if (idx >= 0) orders[idx] = Object.assign({}, orders[idx], order);
    else orders.unshift(order);
    localStorage.setItem(ORDER_KEY, JSON.stringify(orders.slice(0, 10)));
  }

  function orderId() {
    const date   = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.floor(Math.random() * 9_000 + 1_000);
    return `${ORDER_ID_PREFIX}-${date}-${random}`;
  }

  /* mutable state — set during DOMContentLoaded */
  let packageCards      = [];
  let selectedPlan      = PLANS.starter;
  let planField         = null;
  let amountField       = null;
  let serviceSelect     = null;
  let summaryTitle      = null;
  let summaryDescription = null;
  let summaryPrice      = null;
  let summaryNote       = null;
  let summaryList       = null;
  let receipt           = null;

  function setSelectedPlan(key) {
    const plan = PLANS[key] ?? PLANS.starter;
    selectedPlan = plan;

    if (planField)    planField.value    = plan.key;
    if (amountField)  amountField.value  = plan.amount;
    if (serviceSelect) serviceSelect.value = plan.key;

    packageCards.forEach(card => card.classList.toggle("is-selected", card.dataset.plan === plan.key));

    if (summaryTitle)       summaryTitle.textContent       = plan.label;
    if (summaryDescription) summaryDescription.textContent = plan.short;
    if (summaryPrice)       summaryPrice.textContent       = plan.amount;
    if (summaryNote)        summaryNote.textContent        = plan.note;
    if (summaryList) {
      summaryList.innerHTML = plan.details.map(item => `<li>${esc(item)}</li>`).join("");
    }
  }

  function renderReceipt(order) {
    if (!receipt) return;
    if (!order) {
      receipt.innerHTML = '<p class="order-receipt-empty">No order request saved yet.</p>';
      return;
    }
    receipt.innerHTML =
      `<div class="order-receipt-card">` +
        `<div class="order-receipt-head">` +
          `<strong>${esc(order.planLabel)}</strong>` +
          `<span class="order-receipt-status">${esc(order.status)}</span>` +
        `</div>` +
        `<p><strong>${esc(order.customerName)}</strong>${order.projectName ? ` · ${esc(order.projectName)}` : ""}</p>` +
        `<div class="order-receipt-grid">` +
          `<div><span>Order ID</span><strong>${esc(order.orderId)}</strong></div>` +
          `<div><span>Amount</span><strong>${esc(order.amount)}</strong></div>` +
          `<div><span>Payment</span><strong>${esc(order.paymentPreference)}</strong></div>` +
          `<div><span>Timeline</span><strong>${esc(order.timelineLabel)}</strong></div>` +
        `</div>` +
        `<p>${esc(order.note)}</p>` +
      `</div>`;
  }

  function loadLastOrder() {
    const orders = getOrders();
    return orders.length ? orders[0] : null;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const form      = document.getElementById("orderForm");
    const submitBtn = document.getElementById("orderSubmit");
    const status    = document.getElementById("orderStatus");
    const selected  = new URL(window.location.href).searchParams.get("plan") ?? "starter";

    packageCards      = [...document.querySelectorAll(".order-package")];
    planField         = document.getElementById("selectedPlanField");
    amountField       = document.getElementById("selectedAmountField");
    serviceSelect     = document.getElementById("orderService");
    summaryTitle      = document.getElementById("orderSummaryTitle");
    summaryDescription = document.getElementById("orderSummaryDescription");
    summaryPrice      = document.getElementById("orderSummaryPrice");
    summaryNote       = document.getElementById("orderSummaryNote");
    summaryList       = document.getElementById("orderSummaryList");
    receipt           = document.getElementById("orderReceipt");

    const orderIdField = document.getElementById("orderIdField");
    if (orderIdField) orderIdField.value = orderId();

    setSelectedPlan(PLANS[selected] ? selected : "starter");
    renderReceipt(loadLastOrder());

    packageCards.forEach(card => {
      const activate = () => setSelectedPlan(card.dataset.plan ?? "starter");
      card.addEventListener("click", activate);
      card.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); }
      });
    });

    serviceSelect?.addEventListener("change", () => setSelectedPlan(serviceSelect.value));

    if (!form) return;

    form.addEventListener("submit", async e => {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }

      const formId = form.dataset.formspreeId;
      if (!formId) {
        if (status) { status.textContent = "Form endpoint is missing."; status.className = "form-status error"; }
        return;
      }

      const currentPlan = PLANS[serviceSelect?.value ?? selectedPlan.key] ?? selectedPlan;
      const record = {
        orderId:           document.getElementById("orderIdField").value,
        planKey:           currentPlan.key,
        planLabel:         currentPlan.label,
        amount:            currentPlan.amount,
        customerName:      (document.getElementById("orderName")?.value     ?? "").trim(),
        projectName:       (document.getElementById("orderBusiness")?.value ?? "").trim(),
        paymentPreference: (document.getElementById("orderPayment")?.selectedOptions[0]?.textContent ?? "").trim(),
        timelineLabel:     (document.getElementById("orderTimeline")?.selectedOptions[0]?.textContent ?? "").trim(),
        status:            "Pending payment",
        note:              "Scope review starts next. Payment is confirmed after the service details are aligned.",
      };

      upsertOrder(record);
      renderReceipt(record);

      if (document.getElementById("orderPayment")?.value === "upi" && window.UPIPayment) {
        const upiPayload = new FormData(form);
        upiPayload.set("subject",         "Service Purchase Request – UPI");
        upiPayload.set("order_id",        record.orderId);
        upiPayload.set("selected_plan",   record.planLabel);
        upiPayload.set("selected_amount", record.amount);
        upiPayload.set("customer_name",   record.customerName);
        upiPayload.set("project_name",    record.projectName);

        submitBtn.disabled    = true;
        submitBtn.textContent = "Processing…";
        if (status) { status.textContent = ""; status.className = "form-status"; }

        window.UPIPayment.open(
          record,
          upiPayload,
          formId,
          utr => {
            record.status = "Payment submitted";
            if (utr) record.utr = utr;
            upsertOrder(record);
            renderReceipt(record);
            if (status) {
              status.textContent = `Payment confirmed. Order ${record.orderId} submitted successfully.`;
              status.className   = "form-status success";
            }
            form.reset();
            setSelectedPlan(record.planKey);
            document.getElementById("orderIdField").value = orderId();
            submitBtn.disabled    = false;
            submitBtn.textContent = "Request Purchase";
          },
          () => {
            if (status) { status.textContent = "Payment cancelled. Your order details are saved."; status.className = "form-status"; }
            submitBtn.disabled    = false;
            submitBtn.textContent = "Request Purchase";
          },
        );
        return;
      }

      if (status) { status.textContent = "Submitting purchase request…"; status.className = "form-status"; }
      submitBtn.disabled    = true;
      submitBtn.textContent = "Sending…";

      const payload = new FormData(form);
      payload.set("subject",         "Service Purchase Request");
      payload.set("order_id",        record.orderId);
      payload.set("selected_plan",   record.planLabel);
      payload.set("selected_amount", record.amount);
      payload.set("customer_name",   record.customerName);
      payload.set("project_name",    record.projectName);

      try {
        const response = await fetch(`https://formspree.io/f/${formId}`, {
          method:  "POST",
          headers: { "Accept": "application/json" },
          body:    payload,
        });
        if (!response.ok) throw new Error("Request failed");
        record.status = "Request received";
        upsertOrder(record);
        renderReceipt(record);
        if (status) { status.textContent = "Request sent. Payment confirmation and delivery will follow."; status.className = "form-status success"; }
        form.reset();
        setSelectedPlan(record.planKey);
        document.getElementById("orderIdField").value = orderId();
      } catch {
        if (status) { status.textContent = "Saved locally. Please use contact details or try again."; status.className = "form-status error"; }
      } finally {
        submitBtn.disabled    = false;
        submitBtn.textContent = "Request Purchase";
      }
    });
  }, { once: true });
}());
