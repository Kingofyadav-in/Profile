const db = require('../../lib/db');
const auth = require('./_auth');

module.exports = async (req, res) => {
  if (!auth(req, res)) return;

  if (req.method === 'GET') {
    const { rows } = await db.query('SELECT * FROM mood_logs ORDER BY logged_on DESC LIMIT 30');
    return res.json({ ok: true, data: rows });
  }

  if (req.method === 'POST') {
    const { mood, energy, note } = req.body;
    const { rows } = await db.query(`
      INSERT INTO mood_logs (mood, energy, note)
      VALUES ($1,$2,$3)
      ON CONFLICT (logged_on) DO UPDATE SET mood=$1, energy=$2, note=$3
      RETURNING *
    `, [mood, energy, note]);
    return res.json({ ok: true, data: rows[0] });
  }

  res.status(405).json({ ok: false, error: 'Method not allowed' });
};
