'use strict'

/* ======================================================
   footer.js — Global footer renderer
   Self-contained: official brand icons, live clock, status dot.
====================================================== */
;(function () {
  var footer = document.querySelector('footer[data-footer]')
  if (!footer) return

  /* ── Detect theme early so logo src is correct before script.js runs ── */
  var _theme = 'dark'
  try { _theme = localStorage.getItem('theme') || 'dark' } catch (e) {}
  var _logoSrc = _theme === 'light' ? '/wallet/logo/day-logo.png' : '/wallet/logo/night-logo.png'

  /* ── Official brand social links ── */
  var SOCIALS = [
    {
      name: 'Profile',
      url: 'https://kingofyadav.in',
      color: null,
      external: true,
      svg: '<img class="footer-brand-logo" src="' + _logoSrc + '" width="26" height="26" alt="KingOfYadav.in" />',
    },
    {
      name: 'Facebook',
      url: 'https://www.facebook.com/kingofyadav.in',
      color: '#1877F2',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
    },
    {
      name: 'Instagram',
      url: 'https://www.instagram.com/kingofyadav.in',
      color: '#C13584',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>',
    },
    {
      name: 'YouTube',
      url: 'https://www.youtube.com/@kingofyadav-youtube',
      color: '#FF0000',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
    },
    {
      name: 'GitHub',
      url: 'https://github.com/kingofyadav-in',
      color: null,
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>',
    },
  ]

  var socialsHtml = SOCIALS.map(function (s) {
    var style = s.color ? ' style="color:' + s.color + '"' : ''
    var extAttrs = s.external === false ? '' : ' target="_blank" rel="noopener noreferrer"'
    return (
      '<a href="' +
      s.url +
      '"' +
      extAttrs +
      ' aria-label="' +
      s.name +
      '" class="footer-social-link' +
      (s.external === false ? ' footer-social-brand' : '') +
      '"' +
      style +
      '>' +
      s.svg +
      '</a>'
    )
  }).join('')

  /* ── Micro SVG icons for info rows ── */
  var IC_PHONE =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="13" height="13" aria-hidden="true"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>'
  var IC_MAIL =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="13" height="13" aria-hidden="true"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>'
  var IC_CLOCK =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="13" height="13" aria-hidden="true"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>'
  var IC_LOCATION =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="13" height="13" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>'

  /* ── Determine initial status ── */
  var initHour = parseInt(
    new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      hour12: false,
    }),
    10
  )
  var isActive = initHour >= 10 && initHour < 22

  footer.innerHTML =
    '<div class="footer-inner">' +
    '<div class="footer-brand">' +
    '<p class="footer-brand-name">Amit Ku Yadav</p>' +
    '<p class="footer-brand-tagline">Dynamic Personal Workspace</p>' +
    '<p class="footer-brand-location">' +
    IC_LOCATION +
    ' Bhagalpur, Bihar, India</p>' +
    '<div class="footer-socials">' +
    socialsHtml +
    '</div>' +
    '</div>' +
    '<div class="footer-right">' +
    '<div class="footer-info-row">' +
    IC_PHONE +
    '<a href="tel:+919523528114">+91&nbsp;95235&nbsp;28114</a>' +
    '</div>' +
    '<div class="footer-info-row">' +
    IC_MAIL +
    '<a href="mailto:kingofyadav.in@gmail.com">kingofyadav.in@gmail.com</a>' +
    '</div>' +
    '<div class="footer-info-row">' +
    IC_CLOCK +
    '<span id="footerClock">--:--</span>' +
    '<span class="footer-tz">IST</span>' +
    '</div>' +
    '<div class="footer-info-row footer-status-row">' +
    '<span class="footer-status-dot' +
    (isActive ? '' : ' offline') +
    '"></span>' +
    '<span id="status">' +
    (isActive ? 'ACTIVE' : 'OFFLINE') +
    '</span>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div class="footer-bottom">' +
    '&copy; <span id="year"></span> Amit Ku Yadav &middot; All rights reserved' +
    '</div>'

  /* ── Live clock (seconds resolution) ── */
  function tick() {
    var el = document.getElementById('footerClock')
    if (!el) return
    var now = new Date().toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
    el.textContent = now
  }
  tick()
  setInterval(tick, 1000)

  /* ── Year ── */
  var yearEl = document.getElementById('year')
  if (yearEl) yearEl.textContent = new Date().getFullYear()

  /* ── Status dot sync ── */
  function syncDot() {
    var dot = footer.querySelector('.footer-status-dot')
    if (!dot) return
    var h = parseInt(
      new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        hour12: false,
      }),
      10
    )
    var active = h >= 10 && h < 22
    dot.classList.toggle('offline', !active)
    var statusEl = document.getElementById('status')
    if (statusEl) statusEl.textContent = active ? 'ACTIVE' : 'OFFLINE'
  }
  setInterval(syncDot, 60000)
})()
