#!/usr/bin/env node
"use strict";

/**
 * build-sitemap.js
 * Generates sitemap.xml from blog-data.json + known static pages.
 * Run: node scripts/build-sitemap.js
 */

const fs   = require("fs");
const path = require("path");

const ROOT    = path.resolve(__dirname, "..");
const BASE    = "https://kingofyadav.in";
const TODAY   = new Date().toISOString().slice(0, 10);

const STATIC_PAGES = [
  { loc: "/",                            changefreq: "weekly",  priority: "1.0" },
  { loc: "/pages/professional.html",     changefreq: "monthly", priority: "0.9" },
  { loc: "/pages/social.html",           changefreq: "weekly",  priority: "0.9" },
  { loc: "/pages/about.html",            changefreq: "monthly", priority: "0.8" },
  { loc: "/pages/blog.html",             changefreq: "weekly",  priority: "0.8" },
  { loc: "/pages/gallery.html",          changefreq: "monthly", priority: "0.8" },
  { loc: "/pages/services.html",         changefreq: "monthly", priority: "0.8" },
  { loc: "/pages/now.html",              changefreq: "weekly",  priority: "0.8" },
  { loc: "/pages/projects.html",         changefreq: "monthly", priority: "0.9" },
  { loc: "/pages/contact.html",          changefreq: "yearly",  priority: "0.7" },
  { loc: "/pages/collaboration.html",    changefreq: "yearly",  priority: "0.7" },
  { loc: "/pages/live-class.html",       changefreq: "weekly",  priority: "0.7" },
  { loc: "/pages/order.html",            changefreq: "monthly", priority: "0.7" },
  { loc: "/brands/royal-heritage-resort.html", changefreq: "monthly", priority: "0.8" },
  { loc: "/brands/jhon-aamit-llp.html",        changefreq: "monthly", priority: "0.8" },
  { loc: "/brands/national-youth-force.html",  changefreq: "monthly", priority: "0.8" },
];

function urlEntry({ loc, lastmod, changefreq, priority }) {
  return [
    "  <url>",
    `    <loc>${BASE}${loc}</loc>`,
    `    <lastmod>${lastmod || TODAY}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>",
  ].join("\n");
}

// Load blog data
const blogDataPath = path.join(ROOT, "blog-data.json");
const blogPosts = JSON.parse(fs.readFileSync(blogDataPath, "utf8"));

const lines = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  "",
  "  <!-- HOME + STATIC PAGES -->",
];

for (const page of STATIC_PAGES) {
  lines.push(urlEntry({ ...page, lastmod: TODAY }));
}

lines.push("", "  <!-- BLOG POSTS -->");

for (const post of blogPosts) {
  lines.push(urlEntry({
    loc:        post.url,
    lastmod:    post.date || TODAY,
    changefreq: "yearly",
    priority:   "0.7",
  }));
}

lines.push("", "</urlset>", "");

fs.writeFileSync(path.join(ROOT, "sitemap.xml"), lines.join("\n"), "utf8");
console.log(`build-sitemap: wrote sitemap.xml — ${STATIC_PAGES.length} static + ${blogPosts.length} blog URLs`);
