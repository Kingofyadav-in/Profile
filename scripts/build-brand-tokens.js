#!/usr/bin/env node
/**
 * Generates css/brand-tokens.css from brand-tokens.json.
 * Run: node scripts/build-brand-tokens.js
 * Called automatically by `npm run build`.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TOKENS_FILE = path.join(ROOT, "brand-tokens.json");
const OUT_FILE = path.join(ROOT, "css", "brand-tokens.css");

const tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, "utf8"));

const lines = [
  "/* AUTO-GENERATED — edit brand-tokens.json, not this file */",
  ":root {",
];

for (const [name, value] of Object.entries(tokens.colors || {})) {
  lines.push(`  --${name}: ${value};`);
}

for (const [name, value] of Object.entries(tokens.shadows || {})) {
  lines.push(`  --shadow-${name}: ${value};`);
}

lines.push("}");
lines.push("");

fs.writeFileSync(OUT_FILE, lines.join("\n"), "utf8");
console.log(`[brand-tokens] Written ${lines.length} lines → ${OUT_FILE}`);
