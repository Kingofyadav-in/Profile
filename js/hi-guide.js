"use strict";

/* ======================================================
   hi-guide.js — Reusable intro accordion for HI App pages
   Handles: expand/collapse, keyboard, dismiss, ARIA.
====================================================== */
(function () {

  function initGuide(root) {
    const key        = root.getAttribute("data-storage-key") || "hi_intro_dismissed";
    const banner     = root.querySelector(".hi-intro-banner");
    const body       = root.querySelector(".hi-guide-body");
    const toggleBtn  = root.querySelector(".hi-guide-toggle-btn");
    const dismissBtn = root.querySelector(".hi-guide-dismiss-btn");
    const items      = root.querySelectorAll(".hi-guide-item");

    if (!banner || !body || !toggleBtn) return;

    /* ── Set roles/attributes ── */
    banner.setAttribute("role", "button");
    if (!banner.hasAttribute("tabindex")) banner.setAttribute("tabindex", "0");
    body.setAttribute("role", "region");

    /* ── Restore dismissed state ── */
    try {
      if (localStorage.getItem(key) === "1") {
        banner.classList.add("hi-guide-dismissed");
        return; // no need to wire events on a dismissed banner
      }
    } catch (_) {}

    let isOpen = false;

    function setOpen(next) {
      isOpen = next;
      body.classList.toggle("hi-guide-open", isOpen);
      banner.setAttribute("aria-expanded", String(isOpen));
      toggleBtn.textContent = isOpen ? "Hide Guide" : "Show Guide";
    }

    function toggle(e) {
      if (dismissBtn && e?.target === dismissBtn) return;
      setOpen(!isOpen);
    }

    banner.addEventListener("click", toggle);
    banner.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(e); }
    });

    if (dismissBtn) {
      dismissBtn.addEventListener("click", e => {
        e.stopPropagation();
        banner.classList.add("hi-guide-dismissed");
        try { localStorage.setItem(key, "1"); } catch (_) {}
      });
    }

    /* ── Accordion items ── */
    items.forEach((item, idx) => {
      const header = item.querySelector(".hi-guide-item-header");
      if (!header) return;

      /* ARIA accordion pattern */
      const panelId  = `hi-guide-panel-${idx}`;
      const headerId = `hi-guide-header-${idx}`;
      const panel    = item.querySelector(".hi-guide-panel");

      header.id = headerId;
      header.setAttribute("role", "button");
      header.setAttribute("aria-expanded", "false");
      if (!header.hasAttribute("tabindex")) header.setAttribute("tabindex", "0");
      if (panel) {
        panel.id = panelId;
        header.setAttribute("aria-controls", panelId);
        panel.setAttribute("role", "region");
        panel.setAttribute("aria-labelledby", headerId);
      }

      function activateItem() {
        const wasActive = item.classList.contains("hi-guide-item-active");
        // Collapse all
        items.forEach(other => {
          other.classList.remove("hi-guide-item-active");
          const h = other.querySelector(".hi-guide-item-header");
          if (h) h.setAttribute("aria-expanded", "false");
        });
        // Expand clicked if it wasn't already open
        if (!wasActive) {
          item.classList.add("hi-guide-item-active");
          header.setAttribute("aria-expanded", "true");
        }
      }

      header.addEventListener("click", activateItem);
      header.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activateItem(); }
        if (e.key === "ArrowDown") { e.preventDefault(); items[idx + 1]?.querySelector(".hi-guide-item-header")?.focus(); }
        if (e.key === "ArrowUp")   { e.preventDefault(); items[idx - 1]?.querySelector(".hi-guide-item-header")?.focus(); }
      });
    });
  }

  function boot() {
    document.querySelectorAll(".hi-intro-guide").forEach(initGuide);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
}());
