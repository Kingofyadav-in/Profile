"use strict";

(function () {
  var ORDER_KEY = "ky_service_orders";
  var ORDER_ID_PREFIX = "ORD";

  var PLANS = {
    starter: {
      key: "starter",
      label: "Starter Hosting",
      amount: "₹99/mo",
      short: "Perfect for personal sites, simple launches, and portfolios.",
      details: ["1 website", "SSL and SSD hosting", "1 email account"],
      note: "Good first step for a clean launch."
    },
    pro: {
      key: "pro",
      label: "Pro Hosting",
      amount: "₹299/mo",
      short: "For growing websites, multiple pages, and daily updates.",
      details: ["5 websites", "Daily backups", "Priority support"],
      note: "Best for active business sites."
    },
    store: {
      key: "store",
      label: "E-Commerce Store",
      amount: "₹899/mo",
      short: "For shops that need catalog, checkout, and payment flow.",
      details: ["Product catalog", "Cart and checkout", "Order tracking setup"],
      note: "Use this when you want to sell online."
    },
    business: {
      key: "business",
      label: "Business Hosting",
      amount: "₹599/mo",
      short: "For larger sites, stronger traffic, and formal business use.",
      details: ["Unlimited websites", "50 GB NVMe SSD", "Free domain for 1 year"],
      note: "Solid for public-facing operations."
    },
    custom: {
      key: "custom",
      label: "Custom Build",
      amount: "Quote",
      short: "For websites, automation, software, or service systems that need a tailored scope.",
      details: ["Scope review", "Custom timeline", "Fixed quote after review"],
      note: "Quote after scope confirmation."
    }
  };

  function esc(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getOrders() {
    try {
      return JSON.parse(localStorage.getItem(ORDER_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function upsertOrder(order) {
    var orders = getOrders();
    var idx = orders.findIndex(function (item) {
      return item && item.orderId === order.orderId;
    });
    if (idx >= 0) {
      orders[idx] = Object.assign({}, orders[idx], order);
    } else {
      orders.unshift(order);
    }
    localStorage.setItem(ORDER_KEY, JSON.stringify(orders.slice(0, 10)));
  }

  function orderId() {
    var d = new Date();
    var date = d.toISOString().slice(0, 10).replace(/-/g, "");
    var random = Math.floor(Math.random() * 9000 + 1000);
    return ORDER_ID_PREFIX + "-" + date + "-" + random;
  }

  function setSelectedPlan(key) {
    var plan = PLANS[key] || PLANS.starter;
    selectedPlan = plan;

    if (planField) planField.value = plan.key;
    if (amountField) amountField.value = plan.amount;
    if (serviceSelect) serviceSelect.value = plan.key;

    packageCards.forEach(function (card) {
      card.classList.toggle("is-selected", card.dataset.plan === plan.key);
    });

    if (summaryTitle) summaryTitle.textContent = plan.label;
    if (summaryDescription) summaryDescription.textContent = plan.short;
    if (summaryPrice) summaryPrice.textContent = plan.amount;
    if (summaryNote) summaryNote.textContent = plan.note;

    if (summaryList) {
      summaryList.innerHTML = plan.details.map(function (item) {
        return "<li>" + esc(item) + "</li>";
      }).join("");
    }
  }

  function renderReceipt(order) {
    if (!receipt) return;
    if (!order) {
      receipt.innerHTML = '<p class="order-receipt-empty">No order request saved yet.</p>';
      return;
    }

    receipt.innerHTML =
      '<div class="order-receipt-card">' +
        '<div class="order-receipt-head">' +
          '<strong>' + esc(order.planLabel) + '</strong>' +
          '<span class="order-receipt-status">' + esc(order.status) + '</span>' +
        '</div>' +
        '<p><strong>' + esc(order.customerName) + '</strong>' + (order.projectName ? ' · ' + esc(order.projectName) : '') + '</p>' +
        '<div class="order-receipt-grid">' +
          '<div><span>Order ID</span><strong>' + esc(order.orderId) + '</strong></div>' +
          '<div><span>Amount</span><strong>' + esc(order.amount) + '</strong></div>' +
          '<div><span>Payment</span><strong>' + esc(order.paymentPreference) + '</strong></div>' +
          '<div><span>Timeline</span><strong>' + esc(order.timelineLabel) + '</strong></div>' +
        '</div>' +
        '<p>' + esc(order.note) + '</p>' +
      '</div>';
  }

  function loadLastOrder() {
    var orders = getOrders();
    return orders.length ? orders[0] : null;
  }

  var packageCards = [];
  var selectedPlan = PLANS.starter;
  var planField = null;
  var amountField = null;
  var serviceSelect = null;
  var summaryTitle = null;
  var summaryDescription = null;
  var summaryPrice = null;
  var summaryNote = null;
  var summaryList = null;
  var receipt = null;

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("orderForm");
    var submitBtn = document.getElementById("orderSubmit");
    var status = document.getElementById("orderStatus");
    var url = new URL(window.location.href);
    var selected = url.searchParams.get("plan") || "starter";

    packageCards = Array.prototype.slice.call(document.querySelectorAll(".order-package"));
    planField = document.getElementById("selectedPlanField");
    amountField = document.getElementById("selectedAmountField");
    serviceSelect = document.getElementById("orderService");
    summaryTitle = document.getElementById("orderSummaryTitle");
    summaryDescription = document.getElementById("orderSummaryDescription");
    summaryPrice = document.getElementById("orderSummaryPrice");
    summaryNote = document.getElementById("orderSummaryNote");
    summaryList = document.getElementById("orderSummaryList");
    receipt = document.getElementById("orderReceipt");

    if (document.getElementById("orderIdField")) {
      document.getElementById("orderIdField").value = orderId();
    }

    setSelectedPlan(PLANS[selected] ? selected : "starter");
    renderReceipt(loadLastOrder());

    packageCards.forEach(function (card) {
      function activate() {
        setSelectedPlan(card.dataset.plan || "starter");
      }
      card.addEventListener("click", activate);
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate();
        }
      });
    });

    if (serviceSelect) {
      serviceSelect.addEventListener("change", function () {
        setSelectedPlan(serviceSelect.value);
      });
    }

    if (!form) return;

    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var formId = form.dataset.formspreeId;
      if (!formId) {
        if (status) {
          status.textContent = "Form endpoint is missing.";
          status.className = "form-status error";
        }
        return;
      }

      var currentPlan = PLANS[serviceSelect ? serviceSelect.value : selectedPlan.key] || selectedPlan;
      var record = {
        orderId: document.getElementById("orderIdField").value,
        planKey: currentPlan.key,
        planLabel: currentPlan.label,
        amount: currentPlan.amount,
        customerName: (document.getElementById("orderName").value || "").trim(),
        projectName: (document.getElementById("orderBusiness").value || "").trim(),
        paymentPreference: (document.getElementById("orderPayment")?.selectedOptions[0]?.textContent || "").trim(),
        timelineLabel: (document.getElementById("orderTimeline")?.selectedOptions[0]?.textContent || "").trim(),
        status: "Pending send",
        note: "Scope review starts next. Payment is confirmed after the service details are aligned."
      };

      if (status) {
        status.textContent = "Submitting purchase request…";
        status.className = "form-status";
      }
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";

      upsertOrder(record);
      renderReceipt(record);

      var payload = new FormData(form);
      payload.set("subject", "Service Purchase Request");
      payload.set("order_id", record.orderId);
      payload.set("selected_plan", record.planLabel);
      payload.set("selected_amount", record.amount);
      payload.set("customer_name", record.customerName);
      payload.set("project_name", record.projectName);

      try {
        var response = await fetch("https://formspree.io/f/" + formId, {
          method: "POST",
          headers: { "Accept": "application/json" },
          body: payload
        });

        if (!response.ok) {
          throw new Error("Request failed");
        }

        record.status = "Request received";
        upsertOrder(record);
        renderReceipt(record);
        if (status) {
          status.textContent = "Request sent. Payment confirmation and delivery will follow.";
          status.className = "form-status success";
        }
        form.reset();
        setSelectedPlan(record.planKey);
        document.getElementById("orderIdField").value = orderId();
      } catch (err) {
        if (status) {
          status.textContent = "Saved locally. Please use contact details or try again.";
          status.className = "form-status error";
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Request Purchase";
      }
    });
  });
})();
