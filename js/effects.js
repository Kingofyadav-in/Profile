'use strict';
/* ======================================================
   effects.js — World-Class Pro UI Engine v3
   12 Features: Tilt · Scrollbar(CSS) · Ripple · BlurUp ·
   PageTransitions · Progress · Magnetic · Skeleton ·
   GradientMesh · ThemeFlash · BlogSearch · StickyLabels
   Auto-init · Respects prefers-reduced-motion
====================================================== */

(function () {
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var IS_TOUCH = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  var IS_DESKTOP = !IS_TOUCH;
  var _tabHidden = document.hidden;
  var _slowDevice = false;
  var _mesh = null;
  var _meshRaf = null;
  var _mx = 0.5;
  var _my = 0.5;
  var _cx = 0.5;
  var _cy = 0.5;

  function fxEnabled() {
    try { return localStorage.getItem('zs-fx') !== 'off'; }
    catch (e) { return true; }
  }

  function setFx(on) {
    try { localStorage.setItem('zs-fx', on ? 'on' : 'off'); } catch (e) {}
    document.documentElement.classList.toggle('fx-off', !on);
    var btn = document.getElementById('fxToggle');
    if (btn) {
      btn.textContent = on ? '⚡' : '○';
      btn.title = on ? 'Effects on - click to disable' : 'Effects off - click to enable';
      btn.setAttribute('aria-pressed', String(on));
      btn.classList.toggle('fx-btn-off', !on);
    }
    if (on) updateGradientMesh();
  }

  function initFxSwitch() {
    setFx(fxEnabled());
    var btn = document.getElementById('fxToggle');
    if (btn) btn.addEventListener('click', function () { setFx(!fxEnabled()); });
  }


  /* ── 1. 3D Card Tilt ─────────────────────────────── */

  function initCardTilt() {
    if (REDUCED || !IS_DESKTOP) return;

    var cards = document.querySelectorAll('.life-card, .blog-card, .service-card, .connect-card');
    cards.forEach(function (card) {
      card.addEventListener('mouseenter', function () {
        if (!fxEnabled() || _slowDevice) return;
        card.style.transition = 'transform 0.08s ease';
      });

      card.addEventListener('mousemove', function (e) {
        if (!fxEnabled() || _slowDevice) return;
        var rect  = card.getBoundingClientRect();
        var cx    = rect.left + rect.width  / 2;
        var cy    = rect.top  + rect.height / 2;
        var rx    = ((e.clientY - cy) / (rect.height / 2)) * 7;
        var ry    = ((e.clientX - cx) / (rect.width  / 2)) * -7;
        card.style.transform = 'perspective(700px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) scale(1.025)';
      });

      card.addEventListener('mouseleave', function () {
        card.style.transition = 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)';
        card.style.transform  = '';
        setTimeout(function () { card.style.transition = ''; }, 460);
      });
    });
  }


  /* ── 3. Button Ripple ────────────────────────────── */

  function initRipple() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.btn-primary, .btn-secondary');
      if (!btn || !fxEnabled()) return;

      var rect   = btn.getBoundingClientRect();
      var ripple = document.createElement('span');
      ripple.className = 'fx-ripple';
      ripple.style.left = (e.clientX - rect.left) + 'px';
      ripple.style.top  = (e.clientY - rect.top)  + 'px';
      btn.appendChild(ripple);
      ripple.addEventListener('animationend', function () { ripple.remove(); });
    });
  }


  /* ── 4. Blur-Up Image Loading ────────────────────── */

  function initBlurUp() {
    var imgs = document.querySelectorAll('img[loading="lazy"]');
    imgs.forEach(function (img) {
      if (img.complete && img.naturalWidth) return;
      img.classList.add('fx-blur-img');
      img.addEventListener('load', function () {
        img.classList.add('fx-blur-loaded');
      }, { once: true });
      if (img.complete) img.classList.add('fx-blur-loaded');
    });
  }


  /* ── 5. Page Transitions (JS fallback) ───────────── */

  function initPageTransitions() {
    /* CSS @view-transition handles modern browsers natively.
       JS fallback: simple fade-out for unsupported browsers. */
    if (typeof document.startViewTransition !== 'undefined') return;

    var fading = false;
    document.addEventListener('click', function (e) {
      if (fading) return;
      var link = e.target.closest('a[href]');
      if (!link || link.target === '_blank' || link.getAttribute('href').startsWith('#')) return;
      try {
        var url = new URL(link.href, location.href);
        if (url.origin !== location.origin) return;
      } catch (err) { return; }

      e.preventDefault();
      fading = true;
      document.body.style.transition = 'opacity 0.18s ease';
      document.body.style.opacity = '0';
      setTimeout(function () { location.href = link.href; }, 190);
    });
  }


  /* ── 6. Reading / Scroll Progress Bar ────────────── */

  function initReadingProgress() {
    var bar = document.getElementById('scrollProgress');
    /* If the page doesn't have the bar, inject it */
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'scrollProgress';
      document.body.insertBefore(bar, document.body.firstChild);
      /* Wire scroll (script.js already does this for pages that ship the element) */
      window.addEventListener('scroll', function () {
        var total = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = total > 0 ? (window.scrollY / total * 100) + '%' : '0%';
      }, { passive: true });
    }
    /* CSS in effects.css handles height / color / position */
  }


  /* ── 7. Magnetic Buttons ─────────────────────────── */

  function initMagneticButtons() {
    if (REDUCED || !IS_DESKTOP) return;

    var btns = document.querySelectorAll('.btn-primary');
    btns.forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        if (!fxEnabled() || _slowDevice) return;
        var rect = btn.getBoundingClientRect();
        var dx   = (e.clientX - (rect.left + rect.width  / 2)) * 0.24;
        var dy   = (e.clientY - (rect.top  + rect.height / 2)) * 0.24;
        btn.style.transition = 'transform 0.12s ease';
        btn.style.transform  = 'translate(' + dx + 'px, ' + dy + 'px) translateY(-2px) scale(1.03)';
      });

      btn.addEventListener('mouseleave', function () {
        btn.style.transition = 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)';
        btn.style.transform  = '';
        setTimeout(function () { btn.style.transition = ''; }, 460);
      });
    });
  }


  /* ── 8. Skeleton Loading (home blog preview) ─────── */

  function initSkeleton() {
    var grid = document.getElementById('home-blog-preview');
    if (!grid) return;

    function animateCards(container) {
      var children = Array.from(container.children);
      children.forEach(function (card, i) {
        card.style.opacity   = '0';
        card.style.transform = 'translateY(16px)';
        setTimeout(function () {
          card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
          card.style.opacity    = '1';
          card.style.transform  = 'translateY(0)';
        }, i * 110);
      });
    }

    /* Already populated (blog-data loaded synchronously before effects) */
    if (grid.children.length > 0) {
      animateCards(grid);
      return;
    }

    /* Insert shimmer skeletons */
    for (var i = 0; i < 3; i++) {
      var skel = document.createElement('div');
      skel.className = 'fx-skel-card';
      skel.innerHTML =
        '<div class="fx-skel fx-skel-h"></div>' +
        '<div class="fx-skel-body">' +
          '<div class="fx-skel fx-skel-ln fx-skel-ln-s"></div>' +
          '<div class="fx-skel fx-skel-ln"></div>' +
          '<div class="fx-skel fx-skel-ln fx-skel-ln-l"></div>' +
          '<div class="fx-skel fx-skel-ln fx-skel-ln-s"></div>' +
        '</div>';
      grid.appendChild(skel);
    }

    /* Replace when real content arrives */
    var obs = new MutationObserver(function () {
      var real = grid.querySelectorAll('.life-card, .blog-card');
      if (real.length > 0) {
        grid.querySelectorAll('.fx-skel-card').forEach(function (s) { s.remove(); });
        animateCards(grid);
        obs.disconnect();
      }
    });
    obs.observe(grid, { childList: true });
  }


  /* ── 9. Animated Gradient Mesh Background ────────── */

  function updateGradientMesh() {
    if (!_mesh || !fxEnabled() || _tabHidden) return;
    var dark = document.body.classList.contains('theme-dark');
    var scrollMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    var sp = window.scrollY / scrollMax;
    var by = _cy * 0.78 + sp * 0.22;
    var x = (_cx * 100).toFixed(1) + '%';
    var y = (by * 100).toFixed(1) + '%';
    var x2 = ((1 - _cx) * 100).toFixed(1) + '%';
    var y2 = ((1 - by) * 100).toFixed(1) + '%';

    _mesh.style.background = dark
      ? 'radial-gradient(ellipse 56% 46% at ' + x + ' ' + y + ', rgba(4,106,56,0.22) 0%, transparent 65%),' +
        'radial-gradient(ellipse 50% 42% at ' + x2 + ' ' + y2 + ', rgba(255,103,31,0.13) 0%, transparent 60%),' +
        'radial-gradient(ellipse 72% 56% at 50% 0%, rgba(4,106,56,0.07) 0%, transparent 55%)'
      : 'radial-gradient(ellipse 60% 50% at ' + x + ' ' + y + ', rgba(4,106,56,0.07) 0%, transparent 65%),' +
        'radial-gradient(ellipse 55% 45% at ' + x2 + ' ' + y2 + ', rgba(255,103,31,0.04) 0%, transparent 60%)';

    document.documentElement.style.setProperty('--mx', _cx.toFixed(4));
    document.documentElement.style.setProperty('--my', _cy.toFixed(4));
  }

  function meshLoop() {
    if (!_mesh || _tabHidden || _slowDevice) {
      _meshRaf = null;
      return;
    }
    var lerp = 0.055;
    _cx += (_mx - _cx) * lerp;
    _cy += (_my - _cy) * lerp;
    updateGradientMesh();
    if (Math.abs(_mx - _cx) > 0.0004 || Math.abs(_my - _cy) > 0.0004) {
      _meshRaf = requestAnimationFrame(meshLoop);
    } else {
      _meshRaf = null;
    }
  }

  function requestMeshFrame() {
    if (_meshRaf || _tabHidden || _slowDevice || !fxEnabled()) return;
    _meshRaf = requestAnimationFrame(meshLoop);
  }

  function initGradientMesh() {
    _mesh = document.getElementById('fx-gradient-mesh');
    if (!_mesh) {
      _mesh = document.createElement('div');
      _mesh.id = 'fx-gradient-mesh';
      _mesh.setAttribute('aria-hidden', 'true');
      document.body.insertBefore(_mesh, document.body.firstChild);
    }

    document.addEventListener('mousemove', function (e) {
      _mx = e.clientX / Math.max(1, window.innerWidth);
      _my = e.clientY / Math.max(1, window.innerHeight);
      requestMeshFrame();
    }, { passive: true });

    window.addEventListener('scroll', requestMeshFrame, { passive: true });
    updateGradientMesh();
  }

  function initCursorSpotlight() {
    if (REDUCED || !IS_DESKTOP) return;
    if (document.getElementById('fx-cursor-glow')) return;

    var glow = document.createElement('div');
    glow.id = 'fx-cursor-glow';
    glow.setAttribute('aria-hidden', 'true');
    document.body.appendChild(glow);

    var gx = -999;
    var gy = -999;
    var raf = null;

    document.addEventListener('mousemove', function (e) {
      if (!fxEnabled() || _slowDevice) return;
      gx = e.clientX;
      gy = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        glow.style.left = gx + 'px';
        glow.style.top = gy + 'px';
        var hot = document.elementFromPoint(gx, gy)?.closest('.btn-primary,.btn-secondary,.nav-list a,.brand-link,#siteLogo,.personal-logo,.logo');
        glow.style.setProperty('--glow-color', hot ? 'rgba(255,103,31,0.08)' : 'rgba(4,106,56,0.06)');
        raf = null;
      });
    }, { passive: true });
  }

  function logoCenter() {
    return document.getElementById('siteLogo') ||
      document.getElementById('personalLogo') ||
      document.querySelector('.logo, .personal-logo');
  }

  function fxThemeRipple() {
    if (!fxEnabled() || REDUCED) return;
    var logo = logoCenter();
    if (!logo) return;
    var r = logo.getBoundingClientRect();
    var cx = r.left + r.width / 2;
    var cy = r.top + r.height / 2;
    var rad = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy)) * 2.2;
    var el = document.createElement('div');
    el.className = 'fx-logo-ripple';
    el.style.cssText = 'left:' + cx + 'px;top:' + cy + 'px;width:' + rad + 'px;height:' + rad + 'px';
    document.body.appendChild(el);
    el.addEventListener('animationend', function () { el.remove(); }, { once: true });
  }

  function fxSpinLogo() {
    if (!fxEnabled() || REDUCED) return;
    var logo = logoCenter();
    if (!logo) return;
    logo.classList.remove('fx-spin');
    void logo.offsetWidth;
    logo.classList.add('fx-spin');
    logo.addEventListener('animationend', function () { logo.classList.remove('fx-spin'); }, { once: true });
  }


  /* ── 10. Theme Switch Flash ──────────────────────── */

  function initThemeTransition() {
    if (REDUCED) return;

    var lastClass = document.body.className;
    var obs = new MutationObserver(function () {
      var cur = document.body.className;
      if (cur === lastClass) return;
      var themeChanged = /theme-(dark|light)/.test(cur) && cur !== lastClass;
      lastClass = cur;
      updateGradientMesh();

      var flash = document.createElement('div');
      flash.className = 'fx-theme-flash';
      document.body.appendChild(flash);
      flash.addEventListener('animationend', function () { flash.remove(); }, { once: true });
      if (themeChanged) {
        fxThemeRipple();
        fxSpinLogo();
      }
    });
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }


  /* ── 11. Blog Search + Filter ────────────────────── */

  function initBlogSearch() {
    var grid = document.getElementById('blog-dynamic-grid');
    if (!grid) return;

    /* Build search UI */
    var wrap = document.createElement('div');
    wrap.className = 'fx-blog-search';
    wrap.innerHTML =
      '<div class="fx-blog-search-bar">' +
        '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
          '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>' +
        '</svg>' +
        '<input type="search" id="fxBlogSearch" placeholder="Search articles…" aria-label="Search blog articles" autocomplete="off" spellcheck="false"/>' +
        '<span class="fx-blog-count" id="fxBlogCount" aria-live="polite"></span>' +
      '</div>' +
      '<div class="fx-blog-tags" id="fxBlogTags" role="toolbar" aria-label="Filter by category"></div>';

    grid.insertAdjacentElement('beforebegin', wrap);

    var input   = document.getElementById('fxBlogSearch');
    var countEl = document.getElementById('fxBlogCount');
    var tagsEl  = document.getElementById('fxBlogTags');
    var activeTag = '';

    /* Collect unique categories */
    function buildTags() {
      var cats = new Set();
      grid.querySelectorAll('.blog-category').forEach(function (el) {
        var t = el.textContent.trim();
        if (t) cats.add(t);
      });

      cats.forEach(function (cat) {
        var btn = document.createElement('button');
        btn.className = 'fx-tag-btn';
        btn.type = 'button';
        btn.textContent = cat;
        btn.addEventListener('click', function () {
          activeTag = activeTag === cat ? '' : cat;
          tagsEl.querySelectorAll('.fx-tag-btn').forEach(function (b) {
            b.classList.toggle('active', b.textContent === activeTag);
          });
          filter();
        });
        tagsEl.appendChild(btn);
      });
    }

    function filter() {
      var q     = input.value.trim().toLowerCase();
      var cards = grid.querySelectorAll('article.blog-card, a.blog-card');
      var shown = 0;

      /* Remove old no-results message */
      var prev = grid.querySelector('.fx-no-results');
      if (prev) prev.remove();

      cards.forEach(function (card) {
        var title = (card.querySelector('h3, h2') || {}).textContent || '';
        var body  = (card.querySelector('p')      || {}).textContent || '';
        var cat   = (card.querySelector('.blog-category') || {}).textContent || '';

        var matchQ   = !q   || title.toLowerCase().includes(q) || body.toLowerCase().includes(q);
        var matchTag = !activeTag || cat.trim() === activeTag;

        if (matchQ && matchTag) {
          card.style.display = '';
          shown++;
        } else {
          card.style.display = 'none';
        }
      });

      if (countEl) countEl.textContent = shown + ' article' + (shown !== 1 ? 's' : '');

      if (shown === 0) {
        var msg = document.createElement('p');
        msg.className = 'fx-no-results';
        msg.textContent = 'No articles match "' + input.value + '".';
        grid.appendChild(msg);
      }
    }

    function updateCount() {
      var total = grid.querySelectorAll('article.blog-card, a.blog-card').length;
      if (countEl && total > 0) countEl.textContent = total + ' article' + (total !== 1 ? 's' : '');
    }

    input.addEventListener('input', filter);

    /* Wait for dynamic content then build tags + count */
    if (grid.querySelectorAll('.blog-card').length > 0) {
      buildTags();
      updateCount();
    } else {
      var obs = new MutationObserver(function () {
        if (grid.querySelectorAll('.blog-card').length > 0) {
          buildTags();
          updateCount();
          obs.disconnect();
        }
      });
      obs.observe(grid, { childList: true, subtree: true });
    }
  }


  /* ── Existing: Particle Background ──────────────── */

  function initParticles() {
    var hero = document.querySelector('.home-intro');
    if (!hero || REDUCED) return;

    var canvas = document.createElement('canvas');
    canvas.id = 'fx-particle-canvas';
    hero.insertBefore(canvas, hero.firstChild);

    var ctx = canvas.getContext('2d');
    var W, H, particles = [];
    var COLORS = [
      'rgba(4,106,56,',
      'rgba(255,103,31,',
      'rgba(4,106,56,',
      'rgba(180,220,180,',
    ];

    function resize() {
      W = canvas.width  = hero.offsetWidth;
      H = canvas.height = hero.offsetHeight;
    }

    function make() {
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

    function tick() {
      if (_tabHidden || _slowDevice || !fxEnabled()) {
        requestAnimationFrame(tick);
        return;
      }
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.y += p.vy; p.x += p.vx;
        if (p.y < -6) { p.y = H + 6; p.x = Math.random() * W; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + p.alpha + ')';
        ctx.fill();
      }
      requestAnimationFrame(tick);
    }

    resize();
    particles = Array.from({ length: IS_TOUCH ? 28 : 65 }, make);
    window.addEventListener('resize', resize);
    requestAnimationFrame(tick);
  }


  /* ── Existing: Scroll Reveal ─────────────────────── */

  function initReveal() {
    if (REDUCED || !window.IntersectionObserver) return;

    var SELECTORS = [
      '.life-card', '.blog-card', '.service-card', '.connect-card',
      '.home-about-card', '.home-cta', '.trust-strip > div',
      '.about-stat', 'p.home-section-label', '.home-section-title',
    ].join(',');

    var els = document.querySelectorAll(SELECTORS);
    if (!els.length) return;

    document.querySelectorAll('.life-grid, .blog-grid, .services-grid, .connect-grid, .trust-strip').forEach(function (g) {
      g.classList.add('fx-stagger');
    });

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('fx-visible'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -36px 0px' });

    var VH = window.innerHeight || 800;
    els.forEach(function (el) {
      var rect = el.getBoundingClientRect();
      if (rect.top < VH - 80 && rect.bottom > 0) return;
      el.classList.add('fx-reveal');
      obs.observe(el);
    });
  }


  /* ── Existing: Typewriter ────────────────────────── */

  function initTypewriter() {
    var el = document.querySelector('[data-typewriter]');
    if (!el) return;

    var text  = el.getAttribute('data-typewriter') || '';
    var delay = parseInt(el.getAttribute('data-tw-delay') || '960', 10);
    var speed = parseInt(el.getAttribute('data-tw-speed') || '52', 10);

    var cursor = document.createElement('span');
    cursor.className = 'fx-tw-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    el.insertAdjacentElement('afterend', cursor);
    el.textContent = '';

    if (REDUCED) { el.textContent = text; cursor.remove(); return; }

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


  /* ── Existing: Stat Counters ─────────────────────── */

  function initCounters() {
    var els = document.querySelectorAll('[data-count]');
    if (!els.length) return;

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        obs.unobserve(e.target);
        var el     = e.target;
        var target = parseFloat(el.getAttribute('data-count'));
        var suffix = el.getAttribute('data-count-suffix') || '';
        var prefix = el.getAttribute('data-count-prefix') || '';
        var dec    = String(target).includes('.');
        var dur    = REDUCED ? 0 : 1500;
        var start  = performance.now();

        if (dur === 0) { el.textContent = prefix + target + suffix; return; }

        function step(now) {
          var p    = Math.min((now - start) / dur, 1);
          var ease = 1 - Math.pow(1 - p, 3);
          el.textContent = prefix + (dec ? (target * ease).toFixed(1) : Math.round(target * ease)) + suffix;
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.5 });

    els.forEach(function (el) { obs.observe(el); });
  }


  /* ── Boot ────────────────────────────────────────── */

  function boot() {
    initFxSwitch();
    initGradientMesh();
    initCursorSpotlight();
    initReadingProgress();
    initParticles();
    initReveal();
    initTypewriter();
    initCounters();
    initCardTilt();
    initRipple();
    initBlurUp();
    initPageTransitions();
    initMagneticButtons();
    initSkeleton();
    initThemeTransition();
    initBlogSearch();
    initRuntimeGuards();
  }

  function initRuntimeGuards() {
    document.addEventListener('visibilitychange', function () {
      _tabHidden = document.hidden;
      if (!_tabHidden) requestMeshFrame();
    });

    if (REDUCED) return;
    var t0 = performance.now();
    var n = 0;
    (function perfCheck() {
      if (++n < 30) {
        requestAnimationFrame(perfCheck);
        return;
      }
      var avg = (performance.now() - t0) / n;
      if (avg > 37) {
        _slowDevice = true;
        document.documentElement.classList.add('fx-slow');
        console.info('[Profile FX] Slow device - heavy effects disabled');
      }
    })();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
