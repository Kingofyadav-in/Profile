const db = require('../lib/db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300');

  const id = req.query.id || (req.url.split('/').pop());
  if (!id) return res.status(400).json({ ok: false, error: 'License ID required' });

  const { rows } = await db.query(
    'SELECT * FROM hdi_licenses WHERE claim_id=$1 AND status=$2',
    [id, 'active']
  );

  if (!rows.length) return res.status(404).json({ ok: false, error: 'License not found' });

  const row = rows[0];
  const meta = row.metadata || {};

  return res.json({
    ok: true,
    license: {
      id:         row.claim_id,
      title:      meta.title      || 'Untitled',
      type:       meta.type       || 'content',
      url:        meta.url        || null,
      author:     meta.author     || 'Amit Ku Yadav',
      hdi_code:   meta.hdi_code   || null,
      created:    meta.created    || row.claim_date,
      hash:       row.content_hash,
      license:    meta.license    || 'CC-BY-NC-ND-4.0',
      status:     row.status,
      verify_url: 'https://kingofyadav.in/verify/' + row.claim_id,
      claim_url:  'https://kingofyadav.in/claim/'  + row.claim_id,
    }
  });
};
