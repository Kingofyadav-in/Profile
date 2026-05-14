"use strict";

/* ======================================================
   hi-search.js — HI Vault Local Intelligent Search
   Indexes public blog data and private IndexedDB data.
   Allows the AI (and the user) to search across their Life OS.
   Depends on: hi-storage.js
====================================================== */

var _hiSearchIndex = null;
var _hiSearchMeta  = { lastBuilt: 0, items: 0 };

// Very simple, lightweight TF-IDF style indexer for browser
// Suitable for personal data volumes (< 10MB text)

async function hiBuildSearchIndex() {
  console.log("[HI Search] Building local search index...");
  var index = {
    docs: {},
    tokens: {} // token -> { docId: frequency }
  };
  
  var totalItems = 0;

  function tokenize(text) {
    if (!text) return [];
    return text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(function(t) { return t.length > 2; });
  }

  function addDoc(id, type, title, body, date, url) {
    if (!id || (!title && !body)) return;
    
    var doc = { id: id, type: type, title: title, snippet: (body || "").substring(0, 150), date: date, url: url };
    index.docs[id] = doc;
    totalItems++;
    
    var words = tokenize(title + " " + title + " " + body); // Title weighted x2
    var tf = {};
    words.forEach(function(w) { tf[w] = (tf[w] || 0) + 1; });
    
    for (var w in tf) {
      if (!index.tokens[w]) index.tokens[w] = {};
      index.tokens[w][id] = tf[w];
    }
  }

  // 1. Index Private Data (IndexedDB)
  try {
    var personal = await hiGetAll("personal");
    personal.forEach(function(item) {
      if (item.type === "note") {
        addDoc("note_" + item.id, "Note", item.title, item.body, new Date(item.updatedAt || item.createdAt || Date.now()).toISOString(), null);
      } else if (item.type === "goal") {
        addDoc("goal_" + item.id, "Goal", item.title, item.note, item.deadline || null, null);
      }
    });

    var tasks = await hiGetAll("tasks");
    tasks.forEach(function(task) {
      addDoc("task_" + task.id, "Task", task.title, task.done ? "Completed" : "Pending", task.date, null);
    });
  } catch (e) {
    console.warn("[HI Search] Could not index local DB", e);
  }

  // 2. Index Public Data (blog-data.json)
  try {
    var res = await fetch("/blog-data.json");
    if (res.ok) {
      var blogData = await res.json();
      (blogData.posts || []).forEach(function(post) {
        addDoc("blog_" + post.id, "Blog", post.title, post.excerpt || post.content, post.date, post.url);
      });
    }
  } catch (e) {
    console.warn("[HI Search] Could not index blog data", e);
  }

  _hiSearchIndex = index;
  _hiSearchMeta = { lastBuilt: Date.now(), items: totalItems };
  console.log("[HI Search] Index built with " + totalItems + " items.");
  return totalItems;
}

async function hiSearch(query) {
  if (!_hiSearchIndex || (Date.now() - _hiSearchMeta.lastBuilt > 3600000)) { // Rebuild every hour
    await hiBuildSearchIndex();
  }
  
  if (!query) return [];
  var words = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(function(t) { return t.length > 2; });
  if (!words.length) return [];

  var scores = {};
  var totalDocs = Object.keys(_hiSearchIndex.docs).length;

  words.forEach(function(w) {
    var matches = _hiSearchIndex.tokens[w] || {};
    var df = Object.keys(matches).length;
    if (df === 0) return;
    var idf = Math.log(totalDocs / df);
    
    for (var docId in matches) {
      var tf = matches[docId];
      scores[docId] = (scores[docId] || 0) + (tf * idf);
    }
  });

  var results = [];
  for (var id in scores) {
    results.push({ doc: _hiSearchIndex.docs[id], score: scores[id] });
  }

  results.sort(function(a, b) { return b.score - a.score; });
  return results.slice(0, 5).map(function(r) { return r.doc; });
}

window.hiSearch = hiSearch;
window.hiBuildSearchIndex = hiBuildSearchIndex;
