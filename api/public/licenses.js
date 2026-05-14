"use strict";

const pool = require("../../lib/db");

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
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
    const { rows } = await pool.query(
      "SELECT claim_id,status,metadata,claim_date FROM hdi_licenses WHERE status=$1 ORDER BY claim_date DESC",
      ["active"]
    );
    send(res, 200, {
      ok: true,
      count: rows.length,
      data: rows.map(publicLicense)
    });
  } catch (err) {
    console.error("[public/licenses]", err);
    send(res, 500, { ok: false, error: "Unable to load public licenses." });
  }
};
