const db = require('../../lib/db');
const auth = require('./_auth');

module.exports = async (req, res) => {
  if (!auth(req, res)) return;
  const { id } = req.query;

  if (req.method === 'GET') {
    const { rows } = await db.query('SELECT * FROM notes ORDER BY updated_at DESC');
    return res.json({ ok: true, data: rows });
  }

  if (req.method === 'POST') {
    const { title, body, tags } = req.body;
    const { rows } = await db.query(
      'INSERT INTO notes (title, body, tags) VALUES ($1,$2,$3) RETURNING *',
      [title, body, JSON.stringify(tags || [])]
    );
    return res.status(201).json({ ok: true, data: rows[0] });
  }

  if (req.method === 'PUT' && id) {
    const { title, body, tags } = req.body;
    const { rows } = await db.query(
      'UPDATE notes SET title=$2, body=$3, tags=$4, updated_at=NOW() WHERE id=$1 RETURNING *',
      [id, title, body, JSON.stringify(tags || [])]
    );
    return res.json({ ok: true, data: rows[0] });
  }

  if (req.method === 'DELETE' && id) {
    await db.query('DELETE FROM notes WHERE id=$1', [id]);
    return res.json({ ok: true });
  }

  res.status(405).json({ ok: false, error: 'Method not allowed' });
};
