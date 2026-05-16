"use strict";

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

function loadEnv(options = {}) {
  const cwd = options.cwd || process.cwd();
  const files = options.files || [".env", ".env.local"];
  const loadedFromFile = new Set();

  for (const name of files) {
    const file = path.resolve(cwd, name);
    if (!fs.existsSync(file)) continue;

    const parsed = dotenv.parse(fs.readFileSync(file));
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined || loadedFromFile.has(key)) {
        process.env[key] = value;
        loadedFromFile.add(key);
      }
    }
  }

  return loadedFromFile;
}

module.exports = { loadEnv };
