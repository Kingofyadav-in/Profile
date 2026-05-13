const db = require('../lib/db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' });

  const { license_id, infringing_url, platform, violation_type, reporter_name, reporter_email, reporter_contact } = req.body || {};
  if (!license_id || !infringing_url || !reporter_email) {
    return res.status(400).json({ ok: false, error: 'license_id, infringing_url, reporter_email required' });
  }

  // Create table if not yet exists (safe first-run)
  await db.query(`
    CREATE TABLE IF NOT EXISTS hdi_claims (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      license_id       VARCHAR(100),
      infringing_url   TEXT NOT NULL,
      platform         VARCHAR(100),
      violation_type   VARCHAR(50),
      reporter_name    VARCHAR(200),
      reporter_email   TEXT NOT NULL,
      reporter_contact TEXT,
      dmca_text        TEXT,
      status           VARCHAR(20) DEFAULT 'open',
      submitted_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const dmca = buildDmca({ license_id, infringing_url, platform, violation_type, reporter_name, reporter_email });

  await db.query(`
    INSERT INTO hdi_claims
      (license_id, infringing_url, platform, violation_type, reporter_name, reporter_email, reporter_contact, dmca_text)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
  `, [license_id, infringing_url, platform || null, violation_type || null,
      reporter_name || null, reporter_email, reporter_contact || null, dmca]);

  return res.json({ ok: true, dmca });
};

function buildDmca({ license_id, infringing_url, platform, violation_type, reporter_name, reporter_email }) {
  const date = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  return `DMCA TAKEDOWN NOTICE — ${date}

To: DMCA Agent / Legal Team, ${platform || 'Platform'}

I, ${reporter_name || reporter_email}, am the reporter of a copyright violation on behalf of the original creator.

ORIGINAL WORK
License ID : ${license_id}
Verify URL : https://kingofyadav.in/verify/${license_id}
Author     : Amit Ku Yadav
License    : CC-BY-NC-ND-4.0

INFRINGING CONTENT
URL        : ${infringing_url}
Platform   : ${platform || 'Unknown'}
Violation  : ${violation_type || 'Unauthorized reproduction'}

I have a good faith belief that the use of the described material is not authorized by the copyright owner, its agent, or the law.

I swear, under penalty of perjury, that the information in this notification is accurate and that I am authorized to act on behalf of the copyright owner.

Contact : ${reporter_email}
Date    : ${date}

— Submitted via kingofyadav.in/claim/${license_id}`;
}
