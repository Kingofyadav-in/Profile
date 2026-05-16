"use strict";

(function () {
  const UPI_ID    = "9523528114@paytm";
  const PAYEE_NAME = "Amit Ku Yadav";

  let _modal = null;
  let _state = null;

  function numericAmount(str) {
    const m = String(str ?? "").match(/\d[\d,]*/);
    return m ? m[0].replace(/,/g, "") : "0";
  }

  function upiBase(amount, orderId) {
    return `pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${encodeURIComponent(amount)}&cu=INR&tn=${encodeURIComponent(`Order ${orderId}`)}`;
  }

  function appLink(scheme, amount, orderId) {
    const schemes = {
      phonepe: "phonepe://pay?",
      gpay:    "tez://upi/pay?",
      paytm:   "paytmmp://pay?",
      bhim:    "upi://pay?",
    };
    return (schemes[scheme] ?? "upi://pay?") + upiBase(amount, orderId);
  }

  function qrSrc(amount, orderId) {
    const uri = `upi://pay?${upiBase(amount, orderId)}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&ecc=M&data=${encodeURIComponent(uri)}`;
  }

  function setStatus(text, cls) {
    const el = document.getElementById("upiStatus");
    if (!el) return;
    el.textContent = text;
    el.className   = cls ? `upi-status ${cls}` : "upi-status";
  }

  function openModal(record, formData, formId, onSuccess, onCancel) {
    _modal = document.getElementById("upiModal");
    if (!_modal) return;
    _state = { record, formData, formId, onSuccess, onCancel };

    const isQuote = record.amount === "Quote";
    const amt     = numericAmount(record.amount);
    const el      = id => document.getElementById(id);

    if (el("upiModalTitle"))   el("upiModalTitle").textContent   = record.planLabel;
    if (el("upiModalOrderId")) el("upiModalOrderId").textContent = `Order ID: ${record.orderId}`;
    if (el("upiModalAmount"))  el("upiModalAmount").textContent  = isQuote ? "Quoted after review" : `₹${amt}`;
    if (el("upiIdDisplay"))    el("upiIdDisplay").textContent    = UPI_ID;

    if (el("upiQrCode")) {
      if (isQuote) {
        el("upiQrCode").src = "";
        el("upiQrCode").alt = "";
      } else {
        el("upiQrCode").src = qrSrc(amt, record.orderId);
        el("upiQrCode").alt = `Scan to pay ₹${amt} via UPI`;
      }
    }

    if (!isQuote) {
      if (el("upiPhonePeLink")) el("upiPhonePeLink").href = appLink("phonepe", amt, record.orderId);
      if (el("upiGPayLink"))    el("upiGPayLink").href    = appLink("gpay",    amt, record.orderId);
      if (el("upiPaytmLink"))   el("upiPaytmLink").href   = appLink("paytm",   amt, record.orderId);
      if (el("upiBhimLink"))    el("upiBhimLink").href    = appLink("bhim",    amt, record.orderId);
    }

    const paySection = el("upiPaySection");
    if (paySection) paySection.hidden = isQuote;

    const utrInput = el("upiUtr");
    if (utrInput) utrInput.value = "";

    setStatus("", "");

    const btn = el("upiConfirmBtn");
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

  document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("upiModal");
    if (!modal) return;

    const copyBtn = document.getElementById("upiCopyBtn");
    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        if (!navigator.clipboard) { setStatus(`Copy manually: ${UPI_ID}`, ""); return; }
        try {
          await navigator.clipboard.writeText(UPI_ID);
          copyBtn.textContent = "Copied!";
          setTimeout(() => { copyBtn.textContent = "Copy"; }, 2_200);
        } catch {
          setStatus(`Copy manually: ${UPI_ID}`, "");
        }
      });
    }

    document.getElementById("upiModalClose")?.addEventListener("click", () => {
      _state?.onCancel?.();
      closeModal();
    });

    modal.addEventListener("click", e => {
      if (e.target === modal) { _state?.onCancel?.(); closeModal(); }
    });

    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && !modal.hidden) { _state?.onCancel?.(); closeModal(); }
    });

    const confirmBtn = document.getElementById("upiConfirmBtn");
    if (!confirmBtn) return;

    confirmBtn.addEventListener("click", async () => {
      if (!_state) return;
      const isQuote = _state.record.amount === "Quote";

      let utr = "";
      if (!isQuote) {
        const utrEl = document.getElementById("upiUtr");
        utr = (utrEl?.value ?? "").trim();
        if (!utr || !/^\d{10,}$/.test(utr)) {
          setStatus("Enter a valid numeric UTR / transaction ID from your UPI app (at least 10 digits).", "error");
          utrEl?.focus();
          return;
        }
      }

      confirmBtn.disabled = true;
      confirmBtn.querySelector(".upi-btn-label").textContent = "Submitting…";
      setStatus("Submitting…", "");

      if (_state.formData && utr) {
        _state.formData.set("upi_utr",       utr);
        _state.formData.set("payment_note",  `UPI paid. UTR: ${utr}`);
      }

      try {
        const res = await fetch(`https://formspree.io/f/${_state.formId}`, {
          method:  "POST",
          headers: { "Accept": "application/json" },
          body:    _state.formData,
        });
        if (!res.ok) throw new Error("formspree");

        fetch("/api/upi-payment", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            orderId:      _state.record.orderId,
            planLabel:    _state.record.planLabel,
            amount:       _state.record.amount,
            customerName: _state.record.customerName,
            utr:          utr || "quote-request",
            upiId:        UPI_ID,
          }),
        }).catch(() => {});

        setStatus(isQuote ? "Request submitted." : "Payment confirmed! Order submitted.", "success");

        const onSuccess = _state.onSuccess;
        setTimeout(() => { closeModal(); onSuccess?.(utr); }, 1_800);
      } catch {
        setStatus("Submission failed. Please contact via WhatsApp or email.", "error");
        confirmBtn.disabled = false;
        confirmBtn.querySelector(".upi-btn-label").textContent = isQuote ? "Submit Request" : "Confirm Payment";
      }
    });
  }, { once: true });
}());
