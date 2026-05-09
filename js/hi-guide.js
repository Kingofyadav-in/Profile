"use strict";

/* Reusable guide behavior for HI App intro accordions. */
(function () {
  function initGuide(root) {
    var key = root.getAttribute("data-storage-key") || "hi_intro_dismissed";
    var banner = root.querySelector(".hi-intro-banner");
    var body = root.querySelector(".hi-guide-body");
    var toggleBtn = root.querySelector(".hi-guide-toggle-btn");
    var dismissBtn = root.querySelector(".hi-guide-dismiss-btn");
    var items = root.querySelectorAll(".hi-guide-item");
    var isOpen = false;

    if (!banner || !body || !toggleBtn) return;

    try {
      if (localStorage.getItem(key) === "1") {
        banner.classList.add("hi-guide-dismissed");
      }
    } catch (e) {}

    function setGuideOpen(next) {
      isOpen = next;
      body.classList.toggle("hi-guide-open", isOpen);
      banner.setAttribute("aria-expanded", String(isOpen));
      toggleBtn.textContent = isOpen ? "Hide Guide" : "Show Guide";
    }

    function toggleGuide(event) {
      if (event && dismissBtn && event.target === dismissBtn) return;
      setGuideOpen(!isOpen);
    }

    banner.addEventListener("click", toggleGuide);
    banner.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleGuide(event);
      }
    });

    if (dismissBtn) {
      dismissBtn.addEventListener("click", function (event) {
        event.stopPropagation();
        banner.classList.add("hi-guide-dismissed");
        try { localStorage.setItem(key, "1"); } catch (err) {}
      });
    }

    items.forEach(function (item) {
      var header = item.querySelector(".hi-guide-item-header");
      if (!header) return;
      header.addEventListener("click", function () {
        var isActive = item.classList.contains("hi-guide-item-active");
        items.forEach(function (other) {
          var otherHeader = other.querySelector(".hi-guide-item-header");
          other.classList.remove("hi-guide-item-active");
          if (otherHeader) otherHeader.setAttribute("aria-expanded", "false");
        });
        if (!isActive) {
          item.classList.add("hi-guide-item-active");
          header.setAttribute("aria-expanded", "true");
        }
      });
      header.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          header.click();
        }
      });
    });
  }

  function boot() {
    document.querySelectorAll(".hi-intro-guide").forEach(initGuide);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
}());
