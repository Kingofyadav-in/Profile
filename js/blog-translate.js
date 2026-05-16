/* ============================================================
   Blog Translate — MyMemory API, no key required
   Injects a language bar into every .elite-article page
   ============================================================ */
"use strict";

(function () {
  const article = document.getElementById("article");
  if (!article) return;

  const MM_BASE  = "https://api.mymemory.translated.net/get";
  const MM_EMAIL = "circle.onelife@gmail.com"; // increases daily quota to 10 000 words
  const PAR      = 3;                           // parallel requests per group

  const LANGS = [
    { code: "hi", label: "हिन्दी",   name: "Hindi",                mm: "hi"    },
    { code: "bn", label: "বাংলা",    name: "Bengali",              mm: "bn"    },
    { code: "ta", label: "தமிழ்",   name: "Tamil",                mm: "ta"    },
    { code: "ur", label: "اردو",     name: "Urdu",                 mm: "ur"    },
    { code: "es", label: "Español",  name: "Spanish",              mm: "es"    },
    { code: "fr", label: "Français", name: "French",               mm: "fr"    },
    { code: "ar", label: "العربية",  name: "Arabic",               mm: "ar"    },
    { code: "zh", label: "中文",     name: "Chinese (Simplified)", mm: "zh-CN" },
  ];

  /* ── CSS ── */
  const css = document.createElement("style");
  css.textContent = [
    ".bp-tr{display:flex;align-items:center;flex-wrap:wrap;gap:8px;",
    "padding:10px 14px;margin:16px 0 22px;border-radius:10px;",
    "border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.025);}",
    "body.theme-light .bp-tr{border-color:rgba(0,0,0,.08);background:rgba(0,0,0,.025);}",
    ".bp-tr-lbl{font-size:.7rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;",
    "color:rgba(255,255,255,.38);flex-shrink:0;}",
    "body.theme-light .bp-tr-lbl{color:rgba(0,0,0,.4);}",
    ".bp-tr-langs{display:flex;flex-wrap:wrap;gap:5px;}",
    ".bp-lb{padding:4px 11px;border-radius:6px;border:1px solid rgba(255,255,255,.1);",
    "background:transparent;color:inherit;font:inherit;font-size:.79rem;font-weight:700;",
    "cursor:pointer;transition:background .15s,border-color .15s,color .15s;}",
    ".bp-lb:hover{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.2);}",
    ".bp-lb.active{background:rgba(4,106,56,.14);border-color:#046A38;color:#9ee28f;}",
    "body.theme-light .bp-lb:hover{background:rgba(0,0,0,.05);}",
    "body.theme-light .bp-lb.active{color:#046A38;}",
    ".bp-restore{padding:4px 10px;border-radius:6px;border:1px solid rgba(255,255,255,.1);",
    "background:transparent;color:rgba(255,255,255,.45);font:inherit;font-size:.76rem;",
    "font-weight:700;cursor:pointer;transition:background .15s;}",
    ".bp-restore:hover{background:rgba(255,255,255,.07);}",
    "body.theme-light .bp-restore{color:rgba(0,0,0,.45);}",
    ".bp-tr-status{font-size:.74rem;color:rgba(255,255,255,.38);margin-left:2px;}",
    "body.theme-light .bp-tr-status{color:rgba(0,0,0,.38);}",
    ".bp-working{opacity:.45;pointer-events:none;transition:opacity .25s;}",
  ].join("");
  document.head.appendChild(css);

  /* ── Build bar ── */
  const bar = document.createElement("div");
  bar.className = "bp-tr";

  const lbl = Object.assign(document.createElement("span"), { className: "bp-tr-lbl", textContent: "🌐 Read in:" });
  bar.appendChild(lbl);

  const langsWrap = document.createElement("div");
  langsWrap.className = "bp-tr-langs";
  for (const l of LANGS) {
    const b = Object.assign(document.createElement("button"), {
      type: "button", className: "bp-lb", textContent: l.label, title: l.name,
    });
    b.dataset.code = l.code;
    b.dataset.mm   = l.mm;
    b.dataset.name = l.name;
    langsWrap.appendChild(b);
  }
  bar.appendChild(langsWrap);

  const restoreBtn = Object.assign(document.createElement("button"), {
    type: "button", className: "bp-restore", textContent: "↩ Original", hidden: true,
  });
  bar.appendChild(restoreBtn);

  const status = document.createElement("span");
  status.className = "bp-tr-status";
  status.setAttribute("aria-live", "polite");
  bar.appendChild(status);

  const meta   = article.querySelector(".article-meta");
  const anchor = (meta?.nextSibling) ?? article.querySelector("h2");
  article.insertBefore(bar, anchor ?? article.firstChild);

  /* ── Collect translatable elements ── */
  function getEls() {
    const SKIP = [
      ".bp-tr", ".article-meta", ".license-badge",
      ".article-stat-grid", ".article-stat-value",
      "pre", "code", ".blog-back-link", ".blog-category",
    ];
    const excluded = new Set();
    for (const r of article.querySelectorAll(SKIP.join(","))) {
      excluded.add(r);
      r.querySelectorAll("*").forEach(c => excluded.add(c));
    }
    return [...article.querySelectorAll("h1,h2,h3,p,li,blockquote")].filter(el => {
      if (excluded.has(el)) return false;
      let p = el.parentNode;
      while (p && p !== article) { if (excluded.has(p)) return false; p = p.parentNode; }
      return el.textContent.trim().length > 2;
    });
  }

  /* ── State ── */
  let originals  = null;
  const cache    = {};
  let activeLang = null;
  let busy       = false;

  function saveOriginals(els) {
    if (originals) return;
    originals = els.map(el => el.innerHTML);
  }

  function restore() {
    const els = getEls();
    if (originals) els.forEach((el, i) => { if (originals[i] != null) el.innerHTML = originals[i]; });
    activeLang = null;
    restoreBtn.hidden  = true;
    status.textContent = "";
    langsWrap.querySelectorAll(".bp-lb").forEach(b => b.classList.remove("active"));
  }

  function applyLangButtons(code) {
    langsWrap.querySelectorAll(".bp-lb").forEach(b => b.classList.toggle("active", b.dataset.code === code));
  }

  /* ── MyMemory single-element call ── */
  async function mmTranslate(text, mmCode) {
    const url = `${MM_BASE}?q=${encodeURIComponent(text.slice(0, 500))}&langpair=${encodeURIComponent(`en|${mmCode}`)}&de=${MM_EMAIL}`;
    const r   = await fetch(url);
    if (!r.ok) throw new Error(`http ${r.status}`);
    const d   = await r.json();
    if (d.responseStatus !== 200) throw new Error(`mm-status ${d.responseStatus}`);
    const t   = d.responseData?.translatedText;
    if (!t || t.startsWith("MYMEMORY WARNING")) throw new Error("mm-limit");
    return t.trim();
  }

  /* ── Translate flow — PAR elements in parallel per group ── */
  async function translateTo(code, mmCode, name) {
    if (busy) return;
    if (activeLang === code) { restore(); return; }

    const els = getEls();
    saveOriginals(els);

    if (cache[code]) {
      els.forEach((el, i) => { if (cache[code][i]) el.textContent = cache[code][i]; });
      activeLang = code;
      applyLangButtons(code);
      restoreBtn.hidden  = false;
      status.textContent = `✓ ${name}`;
      return;
    }

    busy = true;
    article.classList.add("bp-working");
    status.textContent = "Translating…";
    applyLangButtons(code);

    const translated = new Array(els.length);

    for (let g = 0; g < els.length; g += PAR) {
      const end = Math.min(g + PAR, els.length);
      status.textContent = `Translating… ${Math.round(g / els.length * 100)}%`;

      const promises = [];
      for (let k = g; k < end; k++) {
        const idx = k;
        const el  = els[idx];
        promises.push(
          mmTranslate(el.textContent.trim(), mmCode)
            .then(val => { el.textContent = val; translated[idx] = val; })
            .catch(() => { translated[idx] = el.textContent; }),
        );
      }
      await Promise.all(promises);
    }

    cache[code]   = translated;
    activeLang    = code;
    busy          = false;
    article.classList.remove("bp-working");
    restoreBtn.hidden  = false;
    status.textContent = `✓ ${name}`;
  }

  /* ── Events ── */
  langsWrap.addEventListener("click", e => {
    const b = e.target.closest(".bp-lb");
    if (b) translateTo(b.dataset.code, b.dataset.mm, b.dataset.name);
  });

  restoreBtn.addEventListener("click", restore);
}());
