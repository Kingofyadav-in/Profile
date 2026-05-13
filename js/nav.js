"use strict";

/* ======================================================
   nav.js — Global nav renderer (defer, runs before script.js)
   Two nav menus:
     data-nav="index"    → public / portfolio pages
     data-nav="personal" → HI Life OS private pages
====================================================== */

(function () {
  var INDEX_NAV = [
    { label: "Home",          href: "/" },
    { label: "Professional",  href: "/pages/professional.html" },
    { label: "Social",        href: "/pages/social.html" },
    { label: "Blog",          href: "/pages/blog.html" },
    { label: "Gallery",       href: "/pages/gallery.html" },
    { label: "Services",      href: "/pages/services.html" },
    { label: "Contact",       href: "/pages/contact.html" },
    { label: "Collaboration", href: "/pages/collaboration.html" },
    { label: "Order",         href: "/pages/order.html" },
    { label: "Digital Coin",  href: "/pages/coin.html" },
    { label: "Marketplace",   href: "/marketplace/" },
    { label: "&#x1F534; Live Class", href: "/pages/live-class.html", cls: "live-class-link" }
  ];

  var PERSONAL_NAV = [
    { label: "HI Life OS",  href: "/pages/personal.html" },
    { label: "About Me",    href: "/pages/about.html" },
    { label: "Origin",      href: "/pages/origin.html" },
    { label: "Haven",       href: "/pages/haven.html" },
    { label: "Bhagalpur",   href: "/pages/bhagalpur.html" },
    { label: "Wallet",      href: "/pages/wallet.html" },
    { label: "Vault",       href: "/pages/vault.html" },
    { label: "Merchant",    href: "/pages/merchant.html" },
    { label: "Marketplace", href: "/marketplace/" },
    { label: "Dashboard",     href: "/pages/dashboard.html" },
    { label: "&#x1F5AA; License", href: "/pages/hi-license.html", cls: "license-link" }
  ];

  function isActive(href) {
    var path = window.location.pathname.replace(/\/$/, "") || "/";
    var h = href.replace(/\/$/, "") || "/";

    // Normalize .html
    path = path.replace(/\.html$/, "");
    h = h.replace(/\.html$/, "");

    if (h === "/") return path === "/" || path === "/index";
    return path === h || path.startsWith(h + "/");
  }

  function buildLink(link) {
    var a = document.createElement("a");
    a.href = link.href;
    a.innerHTML = link.label;
    if (link.cls) a.className = link.cls;
    if (isActive(link.href)) {
      a.setAttribute("aria-current", "page");
      a.classList.add("active");
    }
    return a;
  }

  var navs = document.querySelectorAll("[data-nav]");
  navs.forEach(function(nav) {
    var type  = nav.getAttribute("data-nav");
    var links = (type === "personal" || type === "about" || type === "origin" || type === "haven" || type === "bhagalpur" || type === "wallet" || type === "vault" || type === "merchant" || type === "hi-license") ? PERSONAL_NAV : INDEX_NAV;

    // Force personal nav items if the current page is a personal page even if data-nav is "index" (failsafe)
    var isPersonalPage = [
      "/pages/personal", "/pages/about", "/pages/origin", "/pages/haven",
      "/pages/bhagalpur", "/pages/wallet", "/pages/vault", "/pages/merchant",
      "/pages/hi-license", "/marketplace", "/pages/dashboard"
    ].some(function(p) { return window.location.pathname.startsWith(p); });

    if (isPersonalPage) links = PERSONAL_NAV;

    nav.innerHTML = ""; // Clear existing

    if (nav.classList.contains("personal-nav")) {
      links.forEach(function (link) { nav.appendChild(buildLink(link)); });
    } else {
      var ul = document.createElement("ul");
      ul.className = "nav-list";
      links.forEach(function (link) {
        var li = document.createElement("li");
        li.appendChild(buildLink(link));
        ul.appendChild(li);
      });
      nav.appendChild(ul);
    }
  });

  /* ── Auto-inject auth bar on pages that don't have one ── */
  if (!document.getElementById("logoutBtn")) {
    var inner = document.querySelector(".personal-header-inner, .header-inner");
    if (inner) {
      /* Minimal token read — mirrors auth.js getToken without depending on it */
      var _token = null;
      try {
        var _raw = sessionStorage.getItem("ak_auth_token") || localStorage.getItem("ak_auth_token");
        if (_raw) { var _t = JSON.parse(_raw); if (Date.now() < _t.exp) _token = _t; }
      } catch (e) {}

      var _authed   = !!_token;
      var _username = _token ? (_token.username || "") : "";

      var _bar = document.createElement("div");
      _bar.className = "auth-bar";
      _bar.innerHTML =
        (_authed
          ? '<span>Hi, <strong>' + _username + '</strong></span>'
          : "") +
        '<button class="auth-logout-btn ' + (_authed ? "is-logout" : "is-login") + '" id="logoutBtn">' +
        (_authed ? "Logout" : "Login") +
        "</button>";

      inner.appendChild(_bar);

      document.getElementById("logoutBtn").addEventListener("click", function () {
        if (_authed) {
          try {
            sessionStorage.removeItem("ak_auth_token");
            localStorage.removeItem("ak_auth_token");
          } catch (e) {}
          window.location.replace("/pages/login.html");
        } else {
          window.location.href =
            "/pages/login.html?next=" +
            encodeURIComponent(window.location.pathname + window.location.search);
        }
      });
    }
  }
})();
