const db = require('../../lib/db');
const auth = require('./_auth');

module.exports = async (req, res) => {
  if (!auth(req, res)) return;
  const { id } = req.query; // session id: "session-YYYY-MM-DD"

  if (req.method === 'GET') {
    if (id) {
      const { rows } = await db.query('SELECT * FROM chat_sessions WHERE id=$1', [id]);
      return res.json({ ok: true, data: rows[0] || null });
    }
    const { rows } = await db.query('SELECT id, updated_at FROM chat_sessions ORDER BY updated_at DESC LIMIT 30');
    return res.json({ ok: true, data: rows });
  }

  // POST — upsert session messages
  if (req.method === 'POST') {
    const { session_id, messages } = req.body;
    const sid = session_id || `session-${new Date().toISOString().slice(0, 10)}`;
    const { rows } = await db.query(`
      INSERT INTO chat_sessions (id, messages)
      VALUES ($1, $2)
      ON CONFLICT (id) DO UPDATE SET messages=$2, updated_at=NOW()
      RETURNING *
    `, [sid, JSON.stringify(messages)]);
    return res.json({ ok: true, data: rows[0] });
  }

  if (req.method === 'DELETE' && id) {
    await db.query('DELETE FROM chat_sessions WHERE id=$1', [id]);
    return res.json({ ok: true });
  }

  res.status(405).json({ ok: false, error: 'Method not allowed' });
};
