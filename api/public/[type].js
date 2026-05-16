"use strict";

const pool = require("../../lib/db");

function send(res, status, payload, cache = "no-store") {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", cache);
  res.end(JSON.stringify(payload));
}

function publicLicense(row) {
  const meta = row.metadata || {};
  return {
    claim_id: row.claim_id,
    status: row.status,
    claim_date: row.claim_date,
    metadata: {
      title: meta.title || "Untitled",
      type: meta.type || "content",
      url: meta.url || null,
      created: meta.created || row.claim_date,
      author: meta.author || "Amit Ku Yadav",
      license: meta.license || "CC-BY-NC-ND-4.0"
    },
    verify_url: "/verify/" + row.claim_id,
    claim_url: "/claim/" + row.claim_id
  };
}

module.exports = async function handler(req, res) {
  res.setHeader("Allow", "GET, OPTIONS");

  if (req.method === "OPTIONS") { res.statusCode = 204; res.end(); return; }
  if (req.method !== "GET") { send(res, 405, { ok: false, error: "Method not allowed" }); return; }

  const type = (req.query && req.query.type) || req.url.split("/").pop().split("?")[0];

  try {
    if (type === "license-count") {
      const { rows } = await pool.query("SELECT COUNT(*)::int AS count FROM hdi_licenses");
      send(res, 200, { ok: true, count: Number(rows[0]?.count || 0) }, "no-store, max-age=0");
      return;
    }

    if (type === "licenses") {
      const { rows } = await pool.query(
        "SELECT claim_id,status,metadata,claim_date FROM hdi_licenses WHERE status=$1 ORDER BY claim_date DESC",
        ["active"]
      );
      send(res, 200, { ok: true, count: rows.length, data: rows.map(publicLicense) },
        "public, max-age=300, stale-while-revalidate=600");
      return;
    }

    send(res, 404, { ok: false, error: "Not found" });
  } catch (err) {
    console.error(`[public/${type}]`, err);
    send(res, 500, { ok: false, error: "Server error" });
  }
};
