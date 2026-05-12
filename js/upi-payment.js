"use strict";

(function () {
  var UPI_ID = "9523528114@paytm";
  var PAYEE_NAME = "Amit Ku Yadav";

  var _modal = null;
  var _state = null;

  function numericAmount(str) {
    var m = String(str || "").match(/\d[\d,]*/);
    return m ? m[0].replace(/,/g, "") : "0";
  }

  function upiBase(amount, orderId) {
    return (
      "pa=" + encodeURIComponent(UPI_ID) +
      "&pn=" + encodeURIComponent(PAYEE_NAME) +
      "&am=" + encodeURIComponent(amount) +
      "&cu=INR" +
      "&tn=" + encodeURIComponent("Order " + orderId)
    );
  }

  function appLink(scheme, amount, orderId) {
    var schemes = {
      phonepe: "phonepe://pay?",
      gpay: "tez://upi/pay?",
      paytm: "paytmmp://pay?",
      bhim: "upi://pay?"
    };
    return (schemes[scheme] || "upi://pay?") + upiBase(amount, orderId);
  }

  function qrSrc(amount, orderId) {
    var uri = "upi://pay?" + upiBase(amount, orderId);
    return "https://api.qrserver.com/v1/create-qr-code/?size=220x220&ecc=M&data=" + encodeURIComponent(uri);
  }

  function setStatus(text, cls) {
    var el = document.getElementById("upiStatus");
    if (!el) return;
    el.textContent = text;
    el.className = "upi-status" + (cls ? " " + cls : "");
  }

  function openModal(record, formData, formId, onSuccess, onCancel) {
    _modal = document.getElementById("upiModal");
    if (!_modal) return;
    _state = { record: record, formData: formData, formId: formId, onSuccess: onSuccess, onCancel: onCancel };

    var isQuote = record.amount === "Quote";
    var amt = numericAmount(record.amount);

    var el = function (id) { return document.getElementById(id); };

    if (el("upiModalTitle")) el("upiModalTitle").textContent = record.planLabel;
    if (el("upiModalOrderId")) el("upiModalOrderId").textContent = "Order ID: " + record.orderId;
    if (el("upiModalAmount")) el("upiModalAmount").textContent = isQuote ? "Quoted after review" : "₹" + amt;
    if (el("upiIdDisplay")) el("upiIdDisplay").textContent = UPI_ID;

    if (el("upiQrCode")) {
      if (isQuote) {
        el("upiQrCode").src = "";
        el("upiQrCode").alt = "";
      } else {
        el("upiQrCode").src = qrSrc(amt, record.orderId);
        el("upiQrCode").alt = "Scan to pay ₹" + amt + " via UPI";
      }
    }

    if (!isQuote) {
      if (el("upiPhonePeLink")) el("upiPhonePeLink").href = appLink("phonepe", amt, record.orderId);
      if (el("upiGPayLink")) el("upiGPayLink").href = appLink("gpay", amt, record.orderId);
      if (el("upiPaytmLink")) el("upiPaytmLink").href = appLink("paytm", amt, record.orderId);
      if (el("upiBhimLink")) el("upiBhimLink").href = appLink("bhim", amt, record.orderId);
    }

    var paySection = el("upiPaySection");
    if (paySection) paySection.hidden = isQuote;

    var utrInput = el("upiUtr");
    if (utrInput) utrInput.value = "";

    setStatus("", "");

    var btn = el("upiConfirmBtn");
    if (btn) {
      btn.disabled = false;
      btn.querySelector(".upi-btn-label").textContent = isQuote ? "Submit Request" : "Confirm Payment";
    }

    _modal.hidden = false;
    document.body.style.overflow = "hidden";
    if (utrInput && !isQuote) utrInput.focus();
  }

  function closeModal() {
    if (_modal) {
      _modal.hidden = true;
      document.body.style.overflow = "";
    }
    _state = null;
  }

  window.UPIPayment = { open: openModal, close: closeModal };

  document.addEventListener("DOMContentLoaded", function () {
    var modal = document.getElementById("upiModal");
    if (!modal) return;

    // Copy UPI ID
    var copyBtn = document.getElementById("upiCopyBtn");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        if (!navigator.clipboard) {
          setStatus("Copy manually: " + UPI_ID, "");
          return;
        }
        navigator.clipboard.writeText(UPI_ID).then(function () {
          copyBtn.textContent = "Copied!";
          setTimeout(function () { copyBtn.textContent = "Copy"; }, 2200);
        }).catch(function () {
          setStatus("Copy manually: " + UPI_ID, "");
        });
      });
    }

    // Close button
    var closeBtn = document.getElementById("upiModalClose");
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        if (_state && _state.onCancel) _state.onCancel();
        closeModal();
      });
    }

    // Overlay click
    modal.addEventListener("click", function (e) {
      if (e.target === modal) {
        if (_state && _state.onCancel) _state.onCancel();
        closeModal();
      }
    });

    // Escape key
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !modal.hidden) {
        if (_state && _state.onCancel) _state.onCancel();
        closeModal();
      }
    });

    // Confirm / submit
    var confirmBtn = document.getElementById("upiConfirmBtn");
    if (!confirmBtn) return;

    confirmBtn.addEventListener("click", async function () {
      if (!_state) return;
      var isQuote = _state.record.amount === "Quote";

      var utr = "";
      if (!isQuote) {
        var utrEl = document.getElementById("upiUtr");
        utr = utrEl ? utrEl.value.trim() : "";
        if (!utr || !/^\d{10,}$/.test(utr)) {
          setStatus("Enter a valid numeric UTR / transaction ID from your UPI app (at least 10 digits).", "error");
          if (utrEl) utrEl.focus();
          return;
        }
      }

      confirmBtn.disabled = true;
      confirmBtn.querySelector(".upi-btn-label").textContent = "Submitting…";
      setStatus("Submitting…", "");

      if (_state.formData && utr) {
        _state.formData.set("upi_utr", utr);
        _state.formData.set("payment_note", "UPI paid. UTR: " + utr);
      }

      try {
        var res = await fetch("https://formspree.io/f/" + _state.formId, {
          method: "POST",
          headers: { "Accept": "application/json" },
          body: _state.formData
        });

        if (!res.ok) throw new Error("formspree");

        // Non-critical: record UTR in local API
        fetch("/api/upi-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: _state.record.orderId,
            planLabel: _state.record.planLabel,
            amount: _state.record.amount,
            customerName: _state.record.customerName,
            utr: utr || "quote-request",
            upiId: UPI_ID
          })
        }).catch(function () {});

        setStatus(isQuote ? "Request submitted." : "Payment confirmed! Order submitted.", "success");

        var onSuccess = _state.onSuccess;
        setTimeout(function () {
          closeModal();
          if (onSuccess) onSuccess(utr);
        }, 1800);

      } catch (err) {
        setStatus("Submission failed. Please contact via WhatsApp or email.", "error");
        confirmBtn.disabled = false;
        confirmBtn.querySelector(".upi-btn-label").textContent = isQuote ? "Submit Request" : "Confirm Payment";
      }
    });
  });
})();
