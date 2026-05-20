"use strict";

const fs   = require("fs");
const path = require("path");

const PROFILES_DIR = path.resolve(process.cwd(), "data", "profiles");

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const rawSlug = req.query?.slug ? String(req.query.slug) : "amit";
  const slug = rawSlug.replace(/[^a-z0-9-]/gi, "").toLowerCase() || "amit";
  if (!/^[a-z0-9-]{2,48}$/.test(slug)) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "Invalid profile slug" }));
    return;
  }

  const filePath = path.resolve(PROFILES_DIR, `${slug}.json`);
  // Prefix check — slug sanitization already prevents traversal, this is belt-and-suspenders
  if (!filePath.startsWith(PROFILES_DIR + path.sep)) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "Invalid profile slug" }));
    return;
  }

  try {
    // Symlink guard: reject if resolved path escapes PROFILES_DIR
    const real = await fs.promises.realpath(filePath);
    if (!real.startsWith(PROFILES_DIR + path.sep)) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: "Profile not found", slug }));
      return;
    }
    const json = await fs.promises.readFile(real, "utf8");
    res.statusCode = 200;
    res.end(json);
  } catch {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: "Profile not found", slug }));
  }
};
