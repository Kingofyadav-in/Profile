"use strict";

const fs   = require("fs");
const path = require("path");

module.exports = function handler(req, res) {
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

  const filePath = path.join(process.cwd(), "data", "profiles", `${slug}.json`);

  try {
    const json = fs.readFileSync(filePath, "utf8");
    res.statusCode = 200;
    res.end(json);
  } catch {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: "Profile not found", slug }));
  }
};
