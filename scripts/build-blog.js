#!/usr/bin/env node
"use strict";

/**
 * Blog template generator — reads blog-data.json and regenerates the <head>
 * and outer shell of every blog HTML file without touching the article body.
 *
 * This eliminates the need to manually update navigation, meta tags, or the
 * CSS link list across 17+ files. Run before deploy: npm run build:blog
 *
 * For NEW posts: add an entry to blog-data.json with a `content` field
 * (path to a Markdown or HTML fragment), then run this script.
 */

const fs   = require("fs");
const path = require("path");

const ROOT       = path.join(__dirname, "..");
const DATA_FILE  = path.join(ROOT, "blog-data.json");
const BLOG_DIR   = path.join(ROOT, "blog");

const posts = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

const CSS_LINKS = `  <link rel="stylesheet" href="/css/base.css?v=form-suite-1" />
  <link rel="stylesheet" href="/css/components.css?v=footer-clean-1" />
  <link rel="stylesheet" href="/css/layout.css?v=layout-1" />
  <link rel="stylesheet" href="/css/blog-post.css?v=article-polish-1" />`;

const JS_FOOTER = (post) => `<script src="/js/footer.js" defer></script>
<script src="/js/script.js?v=footer-clean-1" defer></script>
  <script src="/api-static/jarvis-widget.js?v=hi-jarvis-20260507" data-endpoint="/api/jarvis-chat" data-fallback-endpoint="/api/jarvis-chat" data-live-endpoint="wss://jarvis.kingofyadav.in/api/ws/public" data-enquiry-endpoint="https://jarvis.kingofyadav.in/api/public-enquiry" data-signup-endpoint="https://jarvis.kingofyadav.in/api/public-signup" data-title="Jarvis AI" data-subtitle="Ask Jarvis about King Yadav and the website." data-site-line="Explore identity, writing, services, ventures, and collaboration." defer></script>
  <script src="/js/blog-translate.js?v=hi-3" defer></script>`;

function buildHead(post) {
  const absUrl = `https://kingofyadav.in${post.url}`;
  const title  = `${post.title} | Amit Ku Yadav`;
  const desc   = post.excerpt || post.description || "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escAttr(desc)}" />
  <meta name="author" content="Amit Ku Yadav" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${escAttr(absUrl)}" />
  <meta property="og:title" content="${escAttr(title)}" />
  <meta property="og:description" content="${escAttr(desc)}" />
  <meta property="og:image" content="https://kingofyadav.in/og-image.png" />
  <meta property="og:url" content="${escAttr(absUrl)}" />
  <link rel="icon" href="/favicon/favicon.ico" />
${CSS_LINKS}
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": ${JSON.stringify(title)},
  "description": ${JSON.stringify(desc)},
  "author": {"@type": "Person", "name": "Amit Ku Yadav", "url": "https://kingofyadav.in"},
  "publisher": {"@type": "Person", "name": "Amit Ku Yadav", "url": "https://kingofyadav.in"},
  "url": ${JSON.stringify(absUrl)},
  "mainEntityOfPage": {"@type": "WebPage", "@id": ${JSON.stringify(absUrl)}}${post.date ? `,\n  "datePublished": ${JSON.stringify(post.date)}` : ""}
}
<\/script>
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escAttr(title)}" />
  <meta name="twitter:description" content="${escAttr(desc)}" />
  <meta name="twitter:image" content="https://kingofyadav.in/og-image.png" />
  <meta name="twitter:creator" content="@kingofyadav_in" />
  <meta name="twitter:site" content="@kingofyadav_in" />
</head>`;
}

function escHtml(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function escAttr(s) { return String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;"); }

/**
 * Rewrite the <head> block of an existing blog post file, preserving the body.
 */
function rewriteExistingPost(filePath, post) {
  if (!fs.existsSync(filePath)) return false;

  let content = fs.readFileSync(filePath, "utf8");

  // Extract everything from </head> to </html> — preserve article body
  const headEnd = content.indexOf("</head>");
  if (headEnd === -1) return false;

  const bodyContent = content.slice(headEnd + 7); // everything after </head>

  // Find the closing JS scripts and replace with canonical set
  // Strategy: replace from <footer class="site-footer onward
  const footerIdx = bodyContent.lastIndexOf('<footer class="site-footer');
  if (footerIdx === -1) {
    // Can't identify footer boundary — skip rewriting footer scripts
    const newContent = buildHead(post) + "\n" + bodyContent;
    fs.writeFileSync(filePath, newContent, "utf8");
    return true;
  }

  const beforeFooter = bodyContent.slice(0, footerIdx);
  const newContent = buildHead(post) + "\n" + beforeFooter +
    `<footer class="site-footer glass" data-footer></footer>

<button id="backToTop" aria-label="Back to top">
  <svg viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg>
</button>
${JS_FOOTER(post)}
</body>
</html>`;

  fs.writeFileSync(filePath, newContent, "utf8");
  return true;
}

let updated = 0, skipped = 0;

for (const post of posts) {
  if (!post.url) { skipped++; continue; }

  // Derive file path from URL: /blog/ai-future-of-work.html → blog/ai-future-of-work.html
  const relPath = post.url.replace(/^\//, "");
  const filePath = path.join(ROOT, relPath);

  if (!filePath.startsWith(BLOG_DIR)) { skipped++; continue; } // safety: only blog/

  if (rewriteExistingPost(filePath, post)) {
    console.log(`  updated: ${relPath}`);
    updated++;
  } else {
    console.log(`  skipped: ${relPath} (file not found)`);
    skipped++;
  }
}

console.log(`\nbuild:blog — ${updated} updated, ${skipped} skipped`);
