#!/usr/bin/env node
"use strict";

/**
 * build-version.js
 * Updates ?v= cache-bust strings in all HTML files to today's date.
 * Pattern: any .css?v=... or .js?v=... link/script reference.
 * Run: node scripts/build-version.js
 */

const fs   = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const today = new Date();
const pad   = n => String(n).padStart(2, "0");
const VERSION = `${today.getFullYear()}${pad(today.getMonth() + 1)}${pad(today.getDate())}`;

const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "test-results", "playwright-report", "coverage",
]);

// Matches .css?v=... or .js?v=... in href/src attributes
const VERSION_RE = /(\.(?:css|js))\?v=[a-zA-Z0-9_.-]+/g;

function* htmlFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) yield* htmlFiles(full);
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      yield full;
    }
  }
}

let filesUpdated = 0;
let filesScanned = 0;

for (const filePath of htmlFiles(ROOT)) {
  const original = fs.readFileSync(filePath, "utf8");
  filesScanned++;
  const updated = original.replace(VERSION_RE, (_, ext) => `${ext}?v=${VERSION}`);
  if (updated !== original) {
    fs.writeFileSync(filePath, updated, "utf8");
    filesUpdated++;
    console.log(`  updated: ${path.relative(ROOT, filePath)}`);
  }
}

console.log(`\nbuild-version: ${VERSION} — scanned ${filesScanned} HTML files, updated ${filesUpdated}`);
