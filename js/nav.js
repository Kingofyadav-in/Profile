'use strict'

/* ======================================================
   nav.js — Global nav renderer (defer, runs before script.js)
   Three nav menus:
     data-nav="index"    → public / portfolio pages
     data-nav="personal" → HI Life OS private pages
     data-nav="wallet"   → HI Wallet ecosystem pages
====================================================== */
;(function () {
  var INDEX_NAV = [
    { label: 'Home', href: '/' },
    { label: 'Blog', href: '/pages/blog.html' },
    { label: 'Gallery', href: '/pages/gallery.html' },
    { label: 'Services', href: '/pages/services.html' },
    { label: 'Contact', href: '/pages/contact.html' },
    { label: 'Collaboration', href: '/pages/collaboration.html' },
    { label: 'Order', href: '/pages/order.html' },
    { label: '&#x1F534; Live Class', href: '/pages/live-class.html', cls: 'live-class-link' },
  ]

  var PERSONAL_NAV = [
    { label: 'HI Life OS', href: '/pages/personal.html' },
    { label: 'Dashboard', href: '/pages/dashboard.html' },
    { label: 'About Me', href: '/pages/about.html' },
    { label: 'Origin', href: '/pages/origin.html' },
    { label: 'Haven', href: '/pages/haven.html' },
    { label: 'Bhagalpur', href: '/pages/bhagalpur.html' },
    { label: '&#x1F510; IP Vault', href: '/pages/hi-license.html', cls: 'license-link' },
  ]

  var WALLET_NAV = [
    { label: 'HI Wallet', href: '/wallet/wallet.html' },
    { label: 'HI Coin', href: '/wallet/coin.html' },
    { label: 'Vault', href: '/wallet/vault.html' },
    { label: 'Merchant', href: '/wallet/merchant.html' },
    { label: 'Marketplace', href: '/wallet/marketplace/' },
  ]

  function isActive(href) {
    var path = window.location.pathname.replace(/\/$/, '') || '/'
    var h = href.replace(/\/$/, '') || '/'

    // Normalize .html
    path = path.replace(/\.html$/, '')
    h = h.replace(/\.html$/, '')

    if (h === '/') return path === '/' || path === '/index'
    return path === h || path.startsWith(h + '/')
  }

  function buildLink(link) {
    var a = document.createElement('a')
    a.href = link.href
    a.innerHTML = link.label
    if (link.cls) a.className = link.cls
    if (isActive(link.href)) {
      a.setAttribute('aria-current', 'page')
      a.classList.add('active')
    }
    return a
  }

  var navs = document.querySelectorAll('[data-nav]')
  navs.forEach(function (nav) {
    var type = nav.getAttribute('data-nav')
    var links =
      type === 'wallet'
        ? WALLET_NAV
        : type === 'personal' ||
      type === 'about' ||
      type === 'origin' ||
      type === 'haven' ||
      type === 'bhagalpur' ||
      type === 'hi-license'
        ? PERSONAL_NAV
        : INDEX_NAV

    // Force personal nav items if the current page is a personal page even if data-nav is "index" (failsafe)
    var isPersonalPage = [
      '/pages/personal',
      '/pages/about',
      '/pages/origin',
      '/pages/haven',
      '/pages/bhagalpur',
      '/pages/hi-license',
      '/pages/dashboard',
    ].some(function (p) {
      return window.location.pathname.startsWith(p)
    })

    var isWalletPage = window.location.pathname.startsWith('/wallet/')

    if (isPersonalPage) links = PERSONAL_NAV
    if (isWalletPage) links = WALLET_NAV

    nav.innerHTML = '' // Clear existing

    if (nav.classList.contains('personal-nav') || nav.classList.contains('wallet-nav')) {
      links.forEach(function (link) {
        nav.appendChild(buildLink(link))
      })
    } else {
      var ul = document.createElement('ul')
      ul.className = 'nav-list'
      links.forEach(function (link) {
        var li = document.createElement('li')
        li.appendChild(buildLink(link))
        ul.appendChild(li)
      })
      nav.appendChild(ul)
    }
  })

  /* ── Auto-inject auth bar (same pattern as index.html) ── */
  if (!document.getElementById('logoutBtn')) {
    var _inner = document.querySelector('.personal-header-inner, .header-inner')
    if (_inner) {
      /* Inject bar hidden — exactly like index.html homeAuthBar */
      var _bar = document.createElement('div')
      _bar.className = 'auth-bar'
      _bar.hidden = true
      _bar.innerHTML =
        '<span>Hi, <strong id="authUserDisplay"></strong></span>' +
        '<button class="auth-logout-btn" id="logoutBtn">Logout</button>'
      _inner.appendChild(_bar)

      /* If auth.js is loaded, let initAuthButton auto-detect (its job) */
      if (typeof initAuthButton === 'function') {
        initAuthButton()
        var _uEl = document.getElementById('authUserDisplay')
        if (_uEl && typeof getAuthUser === 'function') _uEl.textContent = getAuthUser() || ''
      } else {
        /* Inline fallback for pages without auth.js — same token key auth.js uses */
        var _token = null
        try {
          var _raw =
            sessionStorage.getItem('ak_auth_token') || localStorage.getItem('ak_auth_token')
          if (_raw) {
            var _t = JSON.parse(_raw)
            if (Date.now() < _t.exp) _token = _t
          }
        } catch (e) {}

        var _btn = document.getElementById('logoutBtn')
        _bar.hidden = false /* always show — Login or Logout */

        if (_token) {
          var _uEl2 = document.getElementById('authUserDisplay')
          if (_uEl2) _uEl2.textContent = _token.username || ''
          if (_btn) {
            _btn.className = 'auth-logout-btn is-logout'
            _btn.textContent = 'Logout'
            _btn.onclick = function () {
              try {
                sessionStorage.removeItem('ak_auth_token')
                localStorage.removeItem('ak_auth_token')
              } catch (e) {}
              window.location.replace('/pages/login.html')
            }
          }
        } else {
          if (_btn) {
            _btn.className = 'auth-logout-btn is-login'
            _btn.textContent = 'Login'
            _btn.onclick = function () {
              window.location.href =
                '/pages/login.html?next=' +
                encodeURIComponent(window.location.pathname + window.location.search)
            }
          }
        }
      }
    }
  }
})()
