/* ============================================================
   Blog Translate — Jarvis AI powered, no external dependency
   Injects a language bar into every .elite-article page
   ============================================================ */
(function () {
  'use strict';

  var article = document.getElementById('article');
  if (!article) return;

  var ENDPOINT = 'https://jarvis.kingofyadav.in/api/jarvis-chat';
  var SPLIT    = '<<<P>>>';

  var LANGS = [
    { code: 'hi', label: 'हिन्दी', name: 'Hindi' },
    { code: 'bn', label: 'বাংলা',  name: 'Bengali' },
    { code: 'ta', label: 'தமிழ்', name: 'Tamil' },
    { code: 'ur', label: 'اردو',  name: 'Urdu' },
    { code: 'es', label: 'Español', name: 'Spanish' },
    { code: 'fr', label: 'Français', name: 'French' },
    { code: 'ar', label: 'العربية', name: 'Arabic' },
    { code: 'zh', label: '中文',  name: 'Chinese (Simplified)' }
  ];

  /* ── CSS ─────────────────────────────────────────────── */
  var css = document.createElement('style');
  css.textContent = [
    '.bp-tr{display:flex;align-items:center;flex-wrap:wrap;gap:8px;',
    'padding:10px 14px;margin:16px 0 22px;border-radius:10px;',
    'border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.025);}',
    'body.theme-light .bp-tr{border-color:rgba(0,0,0,.08);background:rgba(0,0,0,.025);}',
    '.bp-tr-lbl{font-size:.7rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;',
    'color:rgba(255,255,255,.38);flex-shrink:0;}',
    'body.theme-light .bp-tr-lbl{color:rgba(0,0,0,.4);}',
    '.bp-tr-langs{display:flex;flex-wrap:wrap;gap:5px;}',
    '.bp-lb{padding:4px 11px;border-radius:6px;border:1px solid rgba(255,255,255,.1);',
    'background:transparent;color:inherit;font:inherit;font-size:.79rem;font-weight:700;',
    'cursor:pointer;transition:background .15s,border-color .15s,color .15s;}',
    '.bp-lb:hover{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.2);}',
    '.bp-lb.active{background:rgba(4,106,56,.14);border-color:#046A38;color:#9ee28f;}',
    'body.theme-light .bp-lb:hover{background:rgba(0,0,0,.05);}',
    'body.theme-light .bp-lb.active{color:#046A38;}',
    '.bp-restore{padding:4px 10px;border-radius:6px;border:1px solid rgba(255,255,255,.1);',
    'background:transparent;color:rgba(255,255,255,.45);font:inherit;font-size:.76rem;',
    'font-weight:700;cursor:pointer;transition:background .15s;}',
    '.bp-restore:hover{background:rgba(255,255,255,.07);}',
    'body.theme-light .bp-restore{color:rgba(0,0,0,.45);}',
    '.bp-tr-status{font-size:.74rem;color:rgba(255,255,255,.38);margin-left:2px;}',
    'body.theme-light .bp-tr-status{color:rgba(0,0,0,.38);}',
    '.bp-working{opacity:.45;pointer-events:none;transition:opacity .25s;}'
  ].join('');
  document.head.appendChild(css);

  /* ── Build bar ───────────────────────────────────────── */
  var bar = document.createElement('div');
  bar.className = 'bp-tr';

  var lbl = document.createElement('span');
  lbl.className = 'bp-tr-lbl';
  lbl.textContent = '🌐 Read in:';
  bar.appendChild(lbl);

  var langsWrap = document.createElement('div');
  langsWrap.className = 'bp-tr-langs';
  LANGS.forEach(function (l) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'bp-lb';
    b.dataset.lang = l.code; b.dataset.name = l.name;
    b.textContent = l.label; b.title = l.name;
    langsWrap.appendChild(b);
  });
  bar.appendChild(langsWrap);

  var restoreBtn = document.createElement('button');
  restoreBtn.type = 'button'; restoreBtn.className = 'bp-restore';
  restoreBtn.textContent = '↩ Original'; restoreBtn.hidden = true;
  bar.appendChild(restoreBtn);

  var status = document.createElement('span');
  status.className = 'bp-tr-status'; status.setAttribute('aria-live', 'polite');
  bar.appendChild(status);

  /* Insert after .article-meta, before first h2 */
  var meta = article.querySelector('.article-meta');
  var anchor = (meta && meta.nextSibling) ? meta.nextSibling : article.querySelector('h2');
  article.insertBefore(bar, anchor || article.firstChild);

  /* ── Collect translatable elements ───────────────────── */
  function getEls() {
    var SKIP_SELECTORS = [
      '.bp-tr', '.article-meta', '.license-badge',
      '.article-stat-grid', '.article-stat-value',
      'pre', 'code', '.blog-back-link', '.blog-category'
    ];
    var skipRoots = article.querySelectorAll(SKIP_SELECTORS.join(','));
    var excluded = new Set();
    skipRoots.forEach(function (r) {
      excluded.add(r);
      r.querySelectorAll('*').forEach(function (c) { excluded.add(c); });
    });

    return Array.from(article.querySelectorAll(
      'h1, h2, h3, p, li, blockquote'
    )).filter(function (el) {
      if (excluded.has(el)) return false;
      var p = el.parentNode;
      while (p && p !== article) {
        if (excluded.has(p)) return false;
        p = p.parentNode;
      }
      return el.textContent.trim().length > 2;
    });
  }

  /* ── State ───────────────────────────────────────────── */
  var originals  = null;   // array of innerHTML strings
  var cache      = {};     // { langCode: [translated strings] }
  var activeLang = null;
  var busy       = false;

  function saveOriginals(els) {
    if (originals) return;
    originals = els.map(function (el) { return el.innerHTML; });
  }

  function restore() {
    var els = getEls();
    if (originals) els.forEach(function (el, i) { if (originals[i] != null) el.innerHTML = originals[i]; });
    activeLang = null;
    restoreBtn.hidden = true;
    status.textContent = '';
    langsWrap.querySelectorAll('.bp-lb').forEach(function (b) { b.classList.remove('active'); });
  }

  function applyLangButtons(code) {
    langsWrap.querySelectorAll('.bp-lb').forEach(function (b) {
      b.classList.toggle('active', b.dataset.lang === code);
    });
  }

  /* ── Jarvis API call ─────────────────────────────────── */
  function jarvis(text, langName) {
    var sid = 'tr-' + Math.random().toString(36).slice(2, 8);
    var prompt =
      'Translate each text block below into ' + langName + '. ' +
      'The blocks are separated by the delimiter ' + SPLIT + '. ' +
      'Return ONLY the translated blocks in the same order, separated by ' + SPLIT + '. ' +
      'No explanations, no extra text, no markdown:\n\n' + text;

    return fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: prompt, session_id: sid })
    })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) { return d.response || d.reply || d.message || d.text || ''; });
  }

  /* ── Translate flow ──────────────────────────────────── */
  function translateTo(code, name) {
    if (busy) return;

    /* Toggle off */
    if (activeLang === code) { restore(); return; }

    var els = getEls();
    saveOriginals(els);

    /* Serve from cache */
    if (cache[code]) {
      els.forEach(function (el, i) { if (cache[code][i]) el.textContent = cache[code][i]; });
      activeLang = code;
      applyLangButtons(code);
      restoreBtn.hidden = false;
      status.textContent = '✓ ' + name;
      return;
    }

    /* Fresh translation — batch into ~700-char chunks */
    busy = true;
    article.classList.add('bp-working');
    status.textContent = 'Translating…';
    applyLangButtons(code);

    var chunks  = [];           // [{ indices:[n,n,...], texts:[str,...] }]
    var cur     = { indices: [], texts: [] };
    var curLen  = 0;

    els.forEach(function (el, i) {
      var t = el.textContent.trim();
      if (curLen + t.length > 700 && cur.indices.length) {
        chunks.push(cur);
        cur = { indices: [], texts: [] };
        curLen = 0;
      }
      cur.indices.push(i); cur.texts.push(t); curLen += t.length + SPLIT.length;
    });
    if (cur.indices.length) chunks.push(cur);

    var translated = new Array(els.length);
    var done = 0;

    function next(ci) {
      if (ci >= chunks.length) {
        /* All done */
        cache[code] = translated;
        activeLang  = code;
        busy        = false;
        article.classList.remove('bp-working');
        restoreBtn.hidden = false;
        status.textContent = '✓ ' + name;
        return;
      }

      status.textContent = 'Translating… ' + Math.round(ci / chunks.length * 100) + '%';
      var chunk = chunks[ci];
      var body  = chunk.texts.join('\n' + SPLIT + '\n');

      jarvis(body, name)
        .then(function (resp) {
          var parts = resp.split(SPLIT);
          chunk.indices.forEach(function (elIdx, j) {
            var val = (parts[j] || '').trim();
            if (val) {
              els[elIdx].textContent = val;
              translated[elIdx] = val;
            } else {
              translated[elIdx] = els[elIdx].textContent; // keep original on miss
            }
          });
        })
        .catch(function () {
          chunk.indices.forEach(function (elIdx) {
            translated[elIdx] = els[elIdx].textContent;
          });
        })
        .then(function () { next(ci + 1); });
    }

    next(0);
  }

  /* ── Events ──────────────────────────────────────────── */
  langsWrap.addEventListener('click', function (e) {
    var b = e.target.closest('.bp-lb');
    if (b) translateTo(b.dataset.lang, b.dataset.name);
  });

  restoreBtn.addEventListener('click', restore);
})();
