'use strict'

/* ======================================================
   nav.js — Wallet nav renderer (defer, runs before script.js)
   data-nav="wallet" → HI Wallet ecosystem pages
====================================================== */
;(function () {
  var WALLET_NAV = [
    { label: 'Overview', href: '/wallet/' },
    { label: 'HI Wallet', href: '/wallet/wallet.html' },
    { label: 'HI Coin', href: '/wallet/coin.html' },
    { label: 'Vault', href: '/wallet/vault.html' },
    { label: 'Merchant', href: '/wallet/merchant.html' },
    { label: 'Marketplace', href: '/wallet/marketplace/' },
  ]

  function isActive(href) {
    var path = window.location.pathname.replace(/\/$/, '') || '/'
    var h = new URL(href, window.location.href).pathname.replace(/\/$/, '') || '/'

    // Normalize .html
    path = path.replace(/\.html$/, '')
    h = h.replace(/\.html$/, '')

    if (h === '/wallet') return path === '/wallet' || path === '/wallet/index'
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
    var links = WALLET_NAV

    nav.innerHTML = '' // Clear existing

    if (nav.classList.contains('wallet-nav')) {
      links.forEach(function (link, index) {
        if (index) nav.appendChild(document.createTextNode(' '))
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
