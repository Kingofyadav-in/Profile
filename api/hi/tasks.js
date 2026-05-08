const db = require('../../lib/db');
const auth = require('./_auth');

module.exports = async (req, res) => {
  if (!auth(req, res)) return;
  const { id } = req.query;

  if (req.method === 'GET') {
    const { rows } = await db.query('SELECT * FROM tasks ORDER BY done ASC, due_date ASC NULLS LAST');
    return res.json({ ok: true, data: rows });
  }

  if (req.method === 'POST') {
    const { title, category, due_date } = req.body;
    const { rows } = await db.query(
      'INSERT INTO tasks (title, category, due_date) VALUES ($1,$2,$3) RETURNING *',
      [title, category, due_date || null]
    );
    return res.status(201).json({ ok: true, data: rows[0] });
  }

  if (req.method === 'PUT' && id) {
    const { title, category, done, due_date } = req.body;
    const { rows } = await db.query(
      'UPDATE tasks SET title=$2, category=$3, done=$4, due_date=$5, updated_at=NOW() WHERE id=$1 RETURNING *',
      [id, title, category, done, due_date || null]
    );
    return res.json({ ok: true, data: rows[0] });
  }

  if (req.method === 'DELETE' && id) {
    await db.query('DELETE FROM tasks WHERE id=$1', [id]);
    return res.json({ ok: true });
  }

  res.status(405).json({ ok: false, error: 'Method not allowed' });
};
