"use strict";

const db = require("../lib/db");
const { csrfGuard, send, badRequest, methodNotAllowed, preflight, CORS_HEADERS } = require("./_response");

// Mirrors migrations/006_hdi_claims.sql — Vercel deploys don't run migrations,
// so ensure the table once per cold start instead of failing every claim.
let tableReady = null;
function ensureTable() {
  if (!tableReady) {
    tableReady = db.query(
      `CREATE TABLE IF NOT EXISTS hdi_claims (
         id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
         license_id       VARCHAR(100),
         infringing_url   TEXT         NOT NULL,
         platform         VARCHAR(100),
         violation_type   VARCHAR(50),
         reporter_name    VARCHAR(200),
         reporter_email   TEXT         NOT NULL,
         reporter_contact TEXT,
         dmca_text        TEXT,
         status           VARCHAR(20)  NOT NULL DEFAULT 'open',
         submitted_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
       )`
    ).catch(err => { tableReady = null; throw err; });
  }
  return tableReady;
}

const buildDmca = ({ license_id, infringing_url, platform, violation_type, reporter_name, reporter_email }) => {
  const date = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
  return `DMCA TAKEDOWN NOTICE — ${date}

To: DMCA Agent / Legal Team, ${platform ?? "Platform"}

I, ${reporter_name ?? reporter_email}, am the reporter of a copyright violation on behalf of the original creator.

ORIGINAL WORK
License ID : ${license_id}
Verify URL : https://kingofyadav.in/verify/${license_id}
Author     : Amit Ku Yadav
License    : CC-BY-NC-ND-4.0

INFRINGING CONTENT
URL        : ${infringing_url}
Platform   : ${platform ?? "Unknown"}
Violation  : ${violation_type ?? "Unauthorized reproduction"}

I have a good faith belief that the use of the described material is not authorized by the copyright owner, its agent, or the law.

I swear, under penalty of perjury, that the information in this notification is accurate and that I am authorized to act on behalf of the copyright owner.

Contact : ${reporter_email}
Date    : ${date}

— Submitted via kingofyadav.in/claim/${license_id}`;
};

module.exports = async (req, res) => {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === "OPTIONS") { preflight(res); return; }
  if (req.method !== "POST") { methodNotAllowed(res, "POST, OPTIONS"); return; }
  if (csrfGuard(req, res)) return;

  const { license_id, infringing_url, platform, violation_type, reporter_name, reporter_email, reporter_contact } = req.body ?? {};
  if (!license_id || !infringing_url || !reporter_email) {
    badRequest(res, "license_id, infringing_url, reporter_email required");
    return;
  }

  const dmca = buildDmca({ license_id, infringing_url, platform, violation_type, reporter_name, reporter_email });

  await ensureTable();
  await db.query(
    `INSERT INTO hdi_claims
       (license_id, infringing_url, platform, violation_type, reporter_name, reporter_email, reporter_contact, dmca_text)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [license_id, infringing_url, platform ?? null, violation_type ?? null,
     reporter_name ?? null, reporter_email, reporter_contact ?? null, dmca]
  );

  send(res, 200, { ok: true, dmca });
};
