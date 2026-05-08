const db = require('../../lib/db');
const auth = require('./_auth');

module.exports = async (req, res) => {
  if (!auth(req, res)) return;
  const { id } = req.query;

  if (req.method === 'GET') {
    const { rows } = await db.query("SELECT * FROM goals ORDER BY status='active' DESC, deadline ASC NULLS LAST");
    return res.json({ ok: true, data: rows });
  }

  if (req.method === 'POST') {
    const { title, body, progress, deadline, status } = req.body;
    const { rows } = await db.query(
      'INSERT INTO goals (title, body, progress, deadline, status) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [title, body, progress || 0, deadline || null, status || 'active']
    );
    return res.status(201).json({ ok: true, data: rows[0] });
  }

  if (req.method === 'PUT' && id) {
    const { title, body, progress, deadline, status } = req.body;
    const { rows } = await db.query(
      'UPDATE goals SET title=$2, body=$3, progress=$4, deadline=$5, status=$6, updated_at=NOW() WHERE id=$1 RETURNING *',
      [id, title, body, progress, deadline || null, status]
    );
    return res.json({ ok: true, data: rows[0] });
  }

  if (req.method === 'DELETE' && id) {
    await db.query('DELETE FROM goals WHERE id=$1', [id]);
    return res.json({ ok: true });
  }

  res.status(405).json({ ok: false, error: 'Method not allowed' });
};
