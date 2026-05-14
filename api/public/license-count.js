"use strict";

const pool = require("../../lib/db");

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.end(JSON.stringify(payload));
}

module.exports = async function handler(req, res) {
  res.setHeader("Allow", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "GET") {
    send(res, 405, { ok: false, error: "Method not allowed" });
    return;
  }

  try {
    const { rows } = await pool.query("SELECT COUNT(*)::int AS count FROM hdi_licenses");
    send(res, 200, { ok: true, count: Number(rows[0]?.count || 0) });
  } catch (err) {
    console.error("[public/license-count]", err);
    send(res, 500, { ok: false, error: "Unable to load license count." });
  }
};
