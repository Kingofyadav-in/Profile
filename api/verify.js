"use strict";

const db = require("../lib/db");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, max-age=300");

  const id = req.query.id ?? req.url.split("/").pop();
  if (!id) return res.status(400).json({ ok: false, error: "ID required" });

  // 1. Check Licenses Table
  const { rows: licenseRows } = await db.query(
    "SELECT * FROM hdi_licenses WHERE claim_id=$1 AND status=$2",
    [id, "active"]
  );

  if (licenseRows.length) {
    const row  = licenseRows[0];
    const meta = row.metadata ?? {};
    return res.json({
      ok: true,
      type: "license",
      data: {
        id:         row.claim_id,
        title:      meta.title   ?? "Untitled",
        type:       meta.type    ?? "content",
        category:   meta.category ?? null,
        author:     meta.author  ?? "Amit Ku Yadav",
        created:    meta.created ?? row.claim_date,
        status:     row.status,
        license:    meta.license ?? "CC-BY-NC-ND-4.0",
        url:        meta.url     ?? null,
        hash:       row.content_hash ?? null,
        hdi_code:   meta.hdi_code ?? null,
        verify_url: `https://kingofyadav.in/verify/${row.claim_id}`,
      },
    });
  }

  // 2. Check Claims (Violations) Table
  const { rows: claimRows } = await db.query(
    "SELECT * FROM hdi_claims WHERE id=$1 OR license_id=$1",
    [id]
  );

  if (claimRows.length) {
    const claim = claimRows[0];
    return res.json({
      ok: true,
      type: "violation_claim",
      data: {
        id:             claim.id,
        license_id:     claim.license_id,
        platform:       claim.platform,
        status:         claim.status,
        submitted_at:   claim.submitted_at,
        violation_type: claim.violation_type,
      },
    });
  }

  // 3. Static identity records (not stored in DB)
  const STATIC = {
    "hid-jarvis-001": {
      id:         "hid-jarvis-001",
      title:      "Jarvis · Human Identity Document",
      type:       "Human Identity Document",
      category:   "identity",
      author:     "Amit Ku Yadav",
      created:    "2026-06-02T00:00:00Z",
      status:     "verified",
      license:    "HID-SOVEREIGN-1.0",
      url:        "https://kingofyadav.in",
      hdi_code:   "@kingofyadav",
      hash:       null,
      verify_url: "https://kingofyadav.in/verify/hid-jarvis-001",
    },
  };

  if (STATIC[id]) {
    return res.json({ ok: true, type: "identity", data: STATIC[id] });
  }

  return res.status(404).json({ ok: false, error: "Resource not found" });
};
