#!/usr/bin/env node
"use strict";

/**
 * Bump service-worker.js VERSION to a timestamp-based string.
 * Run before every deploy: npm run build:sw
 *
 * Format: v<YYYYMMDD>-<HHMM>  e.g. v20260520-1423
 */

const fs = require("fs");
const path = require("path");

const SW_PATH = path.join(__dirname, "..", "service-worker.js");

const now = new Date();
const pad = n => String(n).padStart(2, "0");
const version = `v${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}`;

let content = fs.readFileSync(SW_PATH, "utf8");
const updated = content.replace(/^const VERSION = ".*?";/m, `const VERSION = "${version}";`);

if (updated === content) {
  console.error("ERROR: Could not find `const VERSION = \"...\";` in service-worker.js");
  process.exit(1);
}

fs.writeFileSync(SW_PATH, updated, "utf8");
console.log(`service-worker.js VERSION → ${version}`);
