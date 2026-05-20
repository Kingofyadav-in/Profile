#!/usr/bin/env node
"use strict";

/**
 * CSS Bundler — concatenates per-page CSS groups into bundles.
 * Outputs to css/dist/. Link to bundles instead of individual files for production.
 *
 * Current mode: concatenation only (no minification).
 * To enable minification, install: npm i -D lightningcss
 *
 * Run: npm run build:css
 */

const fs   = require("fs");
const path = require("path");

const ROOT    = path.join(__dirname, "..");
const CSS_DIR = path.join(ROOT, "css");
const OUT_DIR = path.join(CSS_DIR, "dist");

fs.mkdirSync(OUT_DIR, { recursive: true });

const BUNDLES = {
  "core.css": ["base.css", "components.css", "layout.css"],
  "home.css": ["base.css", "components.css", "layout.css", "index.css", "effects.css"],
  "blog.css":      ["base.css", "components.css", "layout.css", "blog.css", "effects.css"],
  "blog-post.css": ["base.css", "components.css", "layout.css", "blog-post.css", "effects.css"],
  "personal.css":  ["base.css", "components.css", "layout.css", "personal.css", "hi-app.css", "auth.css"],
  "services.css":  ["base.css", "components.css", "layout.css", "services.css", "effects.css"],
  "contact.css":   ["base.css", "components.css", "layout.css", "contact.css"],
  "auth.css":      ["base.css", "components.css", "layout.css", "auth.css"],
};

let total = 0;
for (const [bundle, sources] of Object.entries(BUNDLES)) {
  const parts = sources.map(f => {
    const filePath = path.join(CSS_DIR, f);
    if (!fs.existsSync(filePath)) {
      console.warn(`  warning: ${f} not found — skipping`);
      return "";
    }
    return `/* --- ${f} --- */\n` + fs.readFileSync(filePath, "utf8");
  });

  const out = parts.join("\n\n");
  const outPath = path.join(OUT_DIR, bundle);
  fs.writeFileSync(outPath, out, "utf8");
  const kb = (Buffer.byteLength(out, "utf8") / 1024).toFixed(1);
  console.log(`  ${bundle.padEnd(20)} ${kb} KB  (${sources.length} files)`);
  total++;
}

console.log(`\nbuild:css — ${total} bundles written to css/dist/`);
