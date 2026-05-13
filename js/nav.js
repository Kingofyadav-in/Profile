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
    { label: "Coins",         href: "/wallet/index.html" },
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
    { label: "&#x1F510; IP Vault", href: "/pages/hi-license.html", cls: "license-link" }
  ];

  function isActive(href) {
    // cleanUrls:true strips .html — normalize both sides
    var path = window.location.pathname.replace(/\.html$/, "");
    var h = href.replace(/\.html$/, "");
    if (h === "/") return path === "/" || path === "/index";
    if (h.endsWith("/")) return path === h || path === h + "index";
    return path === h;
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

  var nav = document.querySelector("[data-nav]");
  if (!nav) return;

  var type  = nav.getAttribute("data-nav");
  var links = type === "personal" ? PERSONAL_NAV : INDEX_NAV;

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
})();
