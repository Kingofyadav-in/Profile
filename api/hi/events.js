const db = require('../../lib/db');
const auth = require('./_auth');

module.exports = async (req, res) => {
  if (!auth(req, res)) return;
  const { id } = req.query;

  if (req.method === 'GET') {
    const { rows } = await db.query(
      'SELECT e.*, c.name AS contact_name FROM events e LEFT JOIN contacts c ON e.contact_id=c.id ORDER BY e.event_date ASC'
    );
    return res.json({ ok: true, data: rows });
  }

  if (req.method === 'POST') {
    const { title, description, event_date, follow_up_date, contact_id } = req.body;
    const { rows } = await db.query(
      'INSERT INTO events (title, description, event_date, follow_up_date, contact_id) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [title, description, event_date, follow_up_date || null, contact_id || null]
    );
    return res.status(201).json({ ok: true, data: rows[0] });
  }

  if (req.method === 'PUT' && id) {
    const { title, description, event_date, follow_up_date, contact_id } = req.body;
    const { rows } = await db.query(
      'UPDATE events SET title=$2, description=$3, event_date=$4, follow_up_date=$5, contact_id=$6 WHERE id=$1 RETURNING *',
      [id, title, description, event_date, follow_up_date || null, contact_id || null]
    );
    return res.json({ ok: true, data: rows[0] });
  }

  if (req.method === 'DELETE' && id) {
    await db.query('DELETE FROM events WHERE id=$1', [id]);
    return res.json({ ok: true });
  }

  res.status(405).json({ ok: false, error: 'Method not allowed' });
};
