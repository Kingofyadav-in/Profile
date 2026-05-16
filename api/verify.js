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
        author:     meta.author  ?? "Amit Ku Yadav",
        created:    meta.created ?? row.claim_date,
        status:     row.status,
        license:    meta.license ?? "CC-BY-NC-ND-4.0",
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

  return res.status(404).json({ ok: false, error: "Resource not found" });
};
