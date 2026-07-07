#!/usr/bin/env node
"use strict";

/**
 * fix-headers.js
 * Audits and patches missing <head> tags across all HTML pages.
 *
 * Fixes applied to every page:
 *  - <meta name="author">
 *  - <meta property="og:site_name">
 *  - <link rel="manifest">
 *  - <link rel="apple-touch-icon">
 *  - Full twitter:card block (derives title/description from og: values)
 *
 * Does NOT touch: private pages with noindex (hi-protect.html is patched
 * minimally since og: data is also missing there).
 */

const fs   = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

// blog/ is deliberately excluded — those heads are regenerated wholesale by
// scripts/build-blog.js, so patches here would be wiped on the next build.
const SEARCH_DIRS = [
  ROOT,
  path.join(ROOT, "pages"),
  path.join(ROOT, "brands"),
];

// Pages that are intentionally noindex/private — still fix technical tags
// but skip adding twitter card (no benefit for private pages)
const SKIP_TWITTER = new Set(["hi-protect.html"]);

function extract(html, pattern) {
  const m = html.match(pattern);
  return m ? m[1] : null;
}

function hasTag(html, snippet) {
  return html.includes(snippet);
}

function patchFile(filePath) {
  let html = fs.readFileSync(filePath, "utf8");
  const fileName = path.basename(filePath);
  const patches = [];

  // ── Extract existing og: values for twitter fallbacks ──────────────────
  const ogTitle = extract(html, /property="og:title"\s+content="([^"]+)"/);
  const ogDesc  = extract(html, /property="og:description"\s+content="([^"]+)"/);
  const ogImage = extract(html, /property="og:image"\s+content="([^"]+)"/);
  const ogUrl   = extract(html, /property="og:url"\s+content="([^"]+)"/);
  const title   = extract(html, /<title>([^<]+)<\/title>/);

  // ── 1. author ──────────────────────────────────────────────────────────
  if (!hasTag(html, 'name="author"')) {
    patches.push(['name="author"', '<meta name="author" content="Amit Ku Yadav" />']);
  }

  // ── 2. og:site_name ────────────────────────────────────────────────────
  if (!hasTag(html, 'og:site_name')) {
    patches.push(['og:site_name', '<meta property="og:site_name" content="Amit Ku Yadav" />']);
  }

  // ── 3. og tags for hi-protect (entirely missing) ───────────────────────
  if (!hasTag(html, 'og:title') && title) {
    const desc = extract(html, /name="description"\s+content="([^"]+)"/) || title;
    const url  = extract(html, /rel="canonical"\s+href="([^"]+)"/) || "https://kingofyadav.in";
    patches.push(['og:type',        '<meta property="og:type"        content="website" />']);
    patches.push(['og:title',       `<meta property="og:title"       content="${title}" />`]);
    patches.push(['og:description', `<meta property="og:description" content="${desc}" />`]);
    patches.push(['og:image',       '<meta property="og:image"       content="https://kingofyadav.in/og-image.png" />']);
    patches.push(['og:url',         `<meta property="og:url"         content="${url}" />`]);
    // og:site_name is handled by check 2 above — pushing it here too would duplicate it
  }

  // ── 4. twitter block ───────────────────────────────────────────────────
  const skipTwitter = SKIP_TWITTER.has(fileName);
  if (!skipTwitter && !hasTag(html, 'twitter:card')) {
    const tTitle = ogTitle || title || "Amit Ku Yadav";
    const tDesc  = ogDesc  || "Digital systems builder, ventures, and social impact work.";
    const tImg   = ogImage || "https://kingofyadav.in/og-image.png";
    const block  = [
      '<meta name="twitter:card"        content="summary_large_image" />',
      `<meta name="twitter:title"       content="${tTitle}" />`,
      `<meta name="twitter:description" content="${tDesc}" />`,
      `<meta name="twitter:image"       content="${tImg}" />`,
      '<meta name="twitter:creator"     content="@kingofyadav_in" />',
      '<meta name="twitter:site"        content="@kingofyadav_in" />',
    ].join("\n  ");
    patches.push(['twitter:card', block]);
  }

  // Add missing twitter:description to pages that already have twitter:card
  if (!skipTwitter && hasTag(html, 'twitter:card') && !hasTag(html, 'twitter:description')) {
    const tDesc = ogDesc || "Digital systems builder, ventures, and social impact work.";
    patches.push(['twitter:description', `<meta name="twitter:description" content="${tDesc}" />`]);
  }

  // Add missing twitter:site to pages that have twitter:card
  if (!skipTwitter && hasTag(html, 'twitter:card') && !hasTag(html, 'twitter:site')) {
    patches.push(['twitter:site', '<meta name="twitter:site" content="@kingofyadav_in" />']);
  }

  // ── 5. apple-touch-icon ────────────────────────────────────────────────
  if (!hasTag(html, 'apple-touch-icon')) {
    patches.push(['apple-touch-icon', '<link rel="apple-touch-icon" href="/favicon/apple-touch-icon.png" />']);
  }

  // ── 6. manifest ────────────────────────────────────────────────────────
  if (!hasTag(html, 'rel="manifest"')) {
    patches.push(['manifest', '<link rel="manifest" href="/manifest.json" />']);
  }

  // ── Apply patches ──────────────────────────────────────────────────────
  if (patches.length === 0) return false;

  // Insert all missing tags just before </head>
  // We insert them in one block for a clean edit
  const insertions = patches.map(([, tag]) => `  ${tag}`).join("\n");
  html = html.replace(/(\s*)<\/head>/, `\n${insertions}\n$1</head>`);

  fs.writeFileSync(filePath, html, "utf8");
  console.log(`  fixed (${patches.map(([k]) => k).join(", ")}): ${path.relative(ROOT, filePath)}`);
  return true;
}

let total = 0;
let fixed = 0;

for (const dir of SEARCH_DIRS) {
  if (!fs.existsSync(dir)) continue;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".html")) continue;
    total++;
    if (patchFile(path.join(dir, entry.name))) fixed++;
  }
}

console.log(`\nfix-headers: scanned ${total} files, patched ${fixed}`);
