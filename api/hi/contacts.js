const db = require('../../lib/db');
const auth = require('./_auth');

module.exports = async (req, res) => {
  if (!auth(req, res)) return;
  const { id } = req.query;

  if (req.method === 'GET') {
    const { rows } = await db.query('SELECT * FROM contacts ORDER BY name ASC');
    return res.json({ ok: true, data: rows });
  }

  if (req.method === 'POST') {
    const { name, email, phone, company, note, follow_up_date } = req.body;
    const { rows } = await db.query(
      'INSERT INTO contacts (name, email, phone, company, note, follow_up_date) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [name, email, phone, company, note, follow_up_date || null]
    );
    return res.status(201).json({ ok: true, data: rows[0] });
  }

  if (req.method === 'PUT' && id) {
    const { name, email, phone, company, note, follow_up_date } = req.body;
    const { rows } = await db.query(
      'UPDATE contacts SET name=$2, email=$3, phone=$4, company=$5, note=$6, follow_up_date=$7, updated_at=NOW() WHERE id=$1 RETURNING *',
      [id, name, email, phone, company, note, follow_up_date || null]
    );
    return res.json({ ok: true, data: rows[0] });
  }

  if (req.method === 'DELETE' && id) {
    await db.query('DELETE FROM contacts WHERE id=$1', [id]);
    return res.json({ ok: true });
  }

  res.status(405).json({ ok: false, error: 'Method not allowed' });
};
