'use strict';
/* ======================================================
   effects.js — Pro UI Effects Engine v1
   Particles · Scroll Reveal · Typewriter · Counters
   Auto-init · Respects prefers-reduced-motion
====================================================== */

(function () {
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 1. Particle Background ──────────────────────────── */

  function initParticles() {
    var hero = document.querySelector('.home-intro');
    if (!hero || REDUCED) return;

    var canvas = document.createElement('canvas');
    canvas.id = 'fx-particle-canvas';
    hero.insertBefore(canvas, hero.firstChild);

    var ctx = canvas.getContext('2d');
    var W, H, particles = [];

    var COLORS = [
      'rgba(4,106,56,',    /* brand green */
      'rgba(255,103,31,',  /* brand orange */
      'rgba(4,106,56,',    /* double green weight */
      'rgba(180,220,180,', /* soft mint */
    ];

    function resize() {
      W = canvas.width  = hero.offsetWidth;
      H = canvas.height = hero.offsetHeight;
    }

    function makeParticle() {
      return {
        x:     Math.random() * W,
        y:     Math.random() * H,
        r:     Math.random() * 2.2 + 0.6,
        vy:    -(Math.random() * 0.38 + 0.08),
        vx:    (Math.random() - 0.5) * 0.14,
        alpha: Math.random() * 0.35 + 0.08,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      };
    }

    function seed() {
      particles = Array.from({ length: 65 }, makeParticle);
    }

    function tick() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.y += p.vy;
        p.x += p.vx;
        if (p.y < -6) { p.y = H + 6; p.x = Math.random() * W; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + p.alpha + ')';
        ctx.fill();
      }
      requestAnimationFrame(tick);
    }

    resize();
    seed();
    window.addEventListener('resize', resize);
    requestAnimationFrame(tick);
  }


  /* ── 2. Scroll Reveal ────────────────────────────────── */

  function initReveal() {
    if (REDUCED || !window.IntersectionObserver) return;

    var SELECTORS = [
      '.life-card',
      '.blog-card',
      '.service-card',
      '.connect-card',
      '.home-about-card',
      '.home-cta',
      '.trust-strip > div',
      '.about-stat',
      'p.home-section-label',
      '.home-section-title',
    ].join(',');

    var els = document.querySelectorAll(SELECTORS);
    if (!els.length) return;

    /* Mark grid containers for stagger */
    document.querySelectorAll('.life-grid, .blog-grid, .services-grid, .connect-grid, .trust-strip').forEach(function (g) {
      g.classList.add('fx-stagger');
    });

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('fx-visible');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -36px 0px' });

    var VH = window.innerHeight || 800;

    els.forEach(function (el) {
      var rect = el.getBoundingClientRect();
      /* Already in view on load → skip hide-then-show flash */
      if (rect.top < VH - 80 && rect.bottom > 0) return;
      el.classList.add('fx-reveal');
      obs.observe(el);
    });
  }


  /* ── 3. Typewriter ───────────────────────────────────── */

  function initTypewriter() {
    var el = document.querySelector('[data-typewriter]');
    if (!el) return;

    var text  = el.getAttribute('data-typewriter') || '';
    var delay = parseInt(el.getAttribute('data-tw-delay') || '960', 10);
    var speed = parseInt(el.getAttribute('data-tw-speed') || '52',  10);

    /* Cursor sibling */
    var cursor = document.createElement('span');
    cursor.className = 'fx-tw-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    el.insertAdjacentElement('afterend', cursor);

    el.textContent = '';

    if (REDUCED) {
      el.textContent = text;
      cursor.remove();
      return;
    }

    var i = 0;
    function type() {
      if (i < text.length) {
        el.textContent += text[i++];
        setTimeout(type, speed + Math.random() * 28);
      } else {
        setTimeout(function () {
          cursor.style.transition = 'opacity 0.4s';
          cursor.style.opacity = '0';
          setTimeout(function () { cursor.remove(); }, 420);
        }, 2800);
      }
    }

    setTimeout(type, delay);
  }


  /* ── 4. Stat Counters ────────────────────────────────── */

  function initCounters() {
    var els = document.querySelectorAll('[data-count]');
    if (!els.length) return;

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        obs.unobserve(e.target);
        animateCounter(e.target);
      });
    }, { threshold: 0.5 });

    els.forEach(function (el) { obs.observe(el); });
  }

  function animateCounter(el) {
    var target  = parseFloat(el.getAttribute('data-count'));
    var suffix  = el.getAttribute('data-count-suffix') || '';
    var prefix  = el.getAttribute('data-count-prefix') || '';
    var decimal = String(target).includes('.');
    var dur     = REDUCED ? 0 : 1500;
    var start   = performance.now();

    function step(now) {
      var p    = Math.min((now - start) / dur, 1);
      var ease = 1 - Math.pow(1 - p, 3); /* easeOutCubic */
      var val  = target * ease;
      el.textContent = prefix + (decimal ? val.toFixed(1) : Math.round(val)) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }

    if (dur === 0) {
      el.textContent = prefix + target + suffix;
    } else {
      requestAnimationFrame(step);
    }
  }


  /* ── Boot ────────────────────────────────────────────── */

  function boot() {
    initParticles();
    initReveal();
    initTypewriter();
    initCounters();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
