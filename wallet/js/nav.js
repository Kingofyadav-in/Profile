'use strict'

/* ======================================================
   nav.js — Wallet nav renderer (defer, runs before script.js)
   data-nav="wallet" → HI Wallet ecosystem pages
====================================================== */
;(function () {
  var WALLET_NAV = [
    { label: 'RupeeCoin', href: '/wallet/index.html' },
    { label: 'Wallet', href: '/wallet/wallet.html' },
    { label: 'Network', href: '/wallet/coin.html' },
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

  document.body.classList.add('wallet-nav-ready')
})()
