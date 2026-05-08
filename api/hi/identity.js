const db = require('../../lib/db');
const auth = require('./_auth');

module.exports = async (req, res) => {
  if (!auth(req, res)) return;

  if (req.method === 'GET') {
    const { rows } = await db.query('SELECT * FROM identity LIMIT 1');
    return res.json({ ok: true, data: rows[0] || null });
  }

  if (req.method === 'PUT') {
    const { name, tagline, roles, mission, location, hdi_code } = req.body;
    const { rows } = await db.query(`
      INSERT INTO identity (name, tagline, roles, mission, location, hdi_code)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (id) DO UPDATE
        SET name=$1, tagline=$2, roles=$3, mission=$4, location=$5, hdi_code=$6, updated_at=NOW()
      RETURNING *
    `, [name, tagline, roles, mission, location, hdi_code]);
    return res.json({ ok: true, data: rows[0] });
  }

  res.status(405).json({ ok: false, error: 'Method not allowed' });
};
