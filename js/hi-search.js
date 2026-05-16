"use strict";

/* ======================================================
   hi-search.js — HI Life OS local intelligent search
   Indexes: IndexedDB (notes, goals, tasks) + blog data.
   Uses a lightweight TF-IDF model suitable for personal
   data volumes (<10 MB text). Rebuilds every hour.
   Depends on: hi-storage.js
====================================================== */

let _hiSearchIndex = null;
let _hiSearchMeta  = { lastBuilt: 0, items: 0 };

/* ── Tokenizer ── */
function _hiTokenize(text) {
  if (!text || typeof text !== "string") return [];
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(t => t.length > 1); // allow 2-char tokens for names
}

/* ── Index builder ── */
async function hiBuildSearchIndex() {
  const index = { docs: {}, tokens: {} };
  let   total = 0;

  function addDoc(id, type, title, body, date, url) {
    if (!id || (!title && !body)) return;

    const safeTitle = String(title || "");
    const safeBody  = String(body  || "");

    index.docs[id] = {
      id, type,
      title:   safeTitle,
      snippet: safeBody.substring(0, 160),
      date,
      url,
    };
    total++;

    // Title weighted ×2 in token stream
    const words = _hiTokenize(`${safeTitle} ${safeTitle} ${safeBody}`);
    const tf    = {};
    words.forEach(w => { tf[w] = (tf[w] || 0) + 1; });

    for (const w in tf) {
      if (!index.tokens[w]) index.tokens[w] = {};
      index.tokens[w][id] = tf[w];
    }
  }

  /* 1. Private IndexedDB data */
  try {
    const [personal, tasks] = await Promise.all([
      hiGetAll("personal"),
      hiGetAll("tasks"),
    ]);

    personal.forEach(item => {
      if (item.type === "note") {
        addDoc(`note_${item.id}`, "Note", item.title, item.body,
          new Date(item.updatedAt || item.createdAt || Date.now()).toISOString(), null);
      } else if (item.type === "goal") {
        addDoc(`goal_${item.id}`, "Goal", item.title, item.note, item.deadline || null, null);
      }
    });

    tasks.forEach(task => {
      addDoc(`task_${task.id}`, "Task", task.title,
        task.done ? "Completed" : "Pending", task.date, null);
    });
  } catch (e) {
    console.warn("[HI Search] Could not index local DB:", e);
  }

  /* 2. Public blog data */
  try {
    const controller = new AbortController();
    const timer      = setTimeout(() => controller.abort(), 5000);
    const res        = await fetch("/blog-data.json", { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const blogData = await res.json();
      (blogData.posts || []).forEach(post => {
        addDoc(`blog_${post.id}`, "Blog", post.title,
          post.excerpt || post.content, post.date, post.url);
      });
    }
  } catch (e) {
    if (e.name !== "AbortError") console.warn("[HI Search] Could not index blog data:", e);
  }

  _hiSearchIndex = index;
  _hiSearchMeta  = { lastBuilt: Date.now(), items: total };
  return total;
}

/* ── Search ── */
async function hiSearch(query) {
  const stale = !_hiSearchIndex || (Date.now() - _hiSearchMeta.lastBuilt > 3_600_000);
  if (stale) await hiBuildSearchIndex();

  if (!query?.trim()) return [];

  const words     = _hiTokenize(query);
  if (!words.length) return [];

  const scores    = {};
  const totalDocs = Object.keys(_hiSearchIndex.docs).length;
  if (!totalDocs) return [];

  words.forEach(w => {
    // Exact match
    const exact = _hiSearchIndex.tokens[w] || {};
    const df    = Object.keys(exact).length;
    if (df) {
      const idf = Math.log((totalDocs + 1) / (df + 1));
      for (const docId in exact) {
        scores[docId] = (scores[docId] || 0) + exact[docId] * idf;
      }
    }

    // Prefix match (partial word) — lower weight
    if (w.length >= 3) {
      for (const token in _hiSearchIndex.tokens) {
        if (token !== w && token.startsWith(w)) {
          const pMatches = _hiSearchIndex.tokens[token];
          const pDf      = Object.keys(pMatches).length;
          const pIdf     = Math.log((totalDocs + 1) / (pDf + 1)) * 0.5;
          for (const docId in pMatches) {
            scores[docId] = (scores[docId] || 0) + pMatches[docId] * pIdf;
          }
        }
      }
    }
  });

  return Object.entries(scores)
    .map(([id, score]) => ({ doc: _hiSearchIndex.docs[id], score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(r => r.doc);
}

/* ── Debounced search for UI use ── */
let _searchTimer = null;
function hiSearchDebounced(query, callback, delay = 300) {
  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(() => {
    hiSearch(query).then(callback).catch(() => callback([]));
  }, delay);
}

window.hiSearch          = hiSearch;
window.hiSearchDebounced = hiSearchDebounced;
window.hiBuildSearchIndex = hiBuildSearchIndex;
