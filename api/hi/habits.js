const db = require('../../lib/db');
const auth = require('./_auth');

module.exports = async (req, res) => {
  if (!auth(req, res)) return;
  const { id } = req.query;

  if (req.method === 'GET') {
    const habits = await db.query('SELECT * FROM habits WHERE active=true ORDER BY created_at ASC');
    const logs = await db.query('SELECT * FROM habit_logs WHERE completed_on >= CURRENT_DATE - 30');
    return res.json({ ok: true, habits: habits.rows, logs: logs.rows });
  }

  if (req.method === 'POST') {
    const { title, description, frequency } = req.body;
    const { rows } = await db.query(
      'INSERT INTO habits (title, description, frequency) VALUES ($1,$2,$3) RETURNING *',
      [title, description, frequency || 'daily']
    );
    return res.status(201).json({ ok: true, data: rows[0] });
  }

  if (req.method === 'PUT' && id) {
    // Toggle log for today
    if (req.body.log) {
      const { rows: existing } = await db.query(
        'SELECT id FROM habit_logs WHERE habit_id=$1 AND completed_on=CURRENT_DATE', [id]
      );
      if (existing.length) {
        await db.query('DELETE FROM habit_logs WHERE habit_id=$1 AND completed_on=CURRENT_DATE', [id]);
        return res.json({ ok: true, completed: false });
      } else {
        await db.query('INSERT INTO habit_logs (habit_id) VALUES ($1)', [id]);
        return res.json({ ok: true, completed: true });
      }
    }
    const { title, description, frequency, active } = req.body;
    const { rows } = await db.query(
      'UPDATE habits SET title=$2, description=$3, frequency=$4, active=$5 WHERE id=$1 RETURNING *',
      [id, title, description, frequency, active]
    );
    return res.json({ ok: true, data: rows[0] });
  }

  if (req.method === 'DELETE' && id) {
    await db.query('DELETE FROM habits WHERE id=$1', [id]);
    return res.json({ ok: true });
  }

  res.status(405).json({ ok: false, error: 'Method not allowed' });
};
