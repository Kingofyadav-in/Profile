const db = require('../lib/db');

const TOKEN = process.env.LIVE_CLASS_TOKEN;
const MAX_BLOCKS = 80;

function getToken(req) {
  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return req.headers['x-live-class-token'] || (req.body && req.body.token) || '';
}

function maskIp(ip) {
  if (!ip) return 'unknown';
  const parts = ip.split('.');
  if (parts.length === 4) { parts[3] = 'xxx'; return parts.join('.'); }
  return ip.replace(/:[^:]+$/, ':xxxx');
}

async function getSession(id) {
  const { rows } = await db.query(
    'SELECT * FROM live_class_sessions WHERE id = $1', [id]
  );
  if (!rows.length) return null;
  const session = rows[0];
  const blocks = await db.query(
    'SELECT * FROM live_class_blocks WHERE session_id = $1 ORDER BY position ASC', [id]
  );
  const viewers = await db.query(
    'SELECT * FROM live_class_viewers WHERE session_id = $1 AND last_seen > NOW() - INTERVAL \'70 seconds\'', [id]
  );
  session.blocks = blocks.rows;
  session.viewers = Object.fromEntries(viewers.rows.map(v => [v.id, v]));
  return session;
}

async function ensureSession(id) {
  await db.query(`
    INSERT INTO live_class_sessions (id, title, subtitle, theme, status, teacher, revision)
    VALUES ($1, 'Live Class', '', 'blackboard', 'active', '', 0)
    ON CONFLICT (id) DO NOTHING
  `, [id]);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-live-class-token');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const ROOM = 'main';

  if (req.method === 'GET') {
    await ensureSession(ROOM);
    const session = await getSession(ROOM);
    return res.json({ ok: true, state: session });
  }

  if (req.method === 'POST') {
    const { action, text, language, url, caption, name, device, id: viewerId } = req.body || {};
    const token = getToken(req);
    const isTeacher = TOKEN && token === TOKEN;
    const ip = maskIp(req.headers['x-forwarded-for'] || req.socket?.remoteAddress);

    await ensureSession(ROOM);

    if (action === 'join') {
      const vid = viewerId || `v-${Date.now()}`;
      await db.query(`
        INSERT INTO live_class_viewers (id, session_id, name, device, ip, joined_at, last_seen)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT (id, session_id) DO UPDATE SET name=$3, device=$4, last_seen=NOW()
      `, [vid, ROOM, name || 'Student', device || 'browser', ip]);
      const session = await getSession(ROOM);
      return res.json({ ok: true, viewerId: vid, state: session });
    }

    if (!isTeacher) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    const writeActions = ['write', 'text', 'heading', 'code', 'list', 'quote', 'homework', 'link', 'image', 'divider'];

    if (writeActions.includes(action)) {
      const countRes = await db.query('SELECT COUNT(*) FROM live_class_blocks WHERE session_id=$1', [ROOM]);
      if (parseInt(countRes.rows[0].count) >= MAX_BLOCKS) {
        await db.query('DELETE FROM live_class_blocks WHERE session_id=$1 AND id=(SELECT id FROM live_class_blocks WHERE session_id=$1 ORDER BY position ASC LIMIT 1)', [ROOM]);
      }
      const posRes = await db.query('SELECT COALESCE(MAX(position),0)+1 AS pos FROM live_class_blocks WHERE session_id=$1', [ROOM]);
      const blockId = `b-${Date.now()}`;
      await db.query(`
        INSERT INTO live_class_blocks (id, session_id, type, content, language, url, caption, position)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `, [blockId, ROOM, action === 'write' ? 'text' : action, text || '', language || null, url || null, caption || null, posRes.rows[0].pos]);
    } else if (action === 'undo') {
      await db.query('DELETE FROM live_class_blocks WHERE session_id=$1 AND id=(SELECT id FROM live_class_blocks WHERE session_id=$1 ORDER BY position DESC LIMIT 1)', [ROOM]);
    } else if (action === 'clear') {
      await db.query('DELETE FROM live_class_blocks WHERE session_id=$1', [ROOM]);
    } else if (action === 'reset') {
      await db.query('DELETE FROM live_class_blocks WHERE session_id=$1', [ROOM]);
      await db.query('UPDATE live_class_sessions SET title=$2, subtitle=$3, theme=$4, status=$5, focus_id=NULL WHERE id=$1', [ROOM, 'Live Class', '', 'blackboard', 'active']);
    } else if (action === 'focus') {
      await db.query('UPDATE live_class_sessions SET focus_id=$2 WHERE id=$1', [ROOM, text]);
    } else if (['title','subtitle','theme','status','teacher','room'].includes(action)) {
      await db.query(`UPDATE live_class_sessions SET ${action}=$2 WHERE id=$1`, [ROOM, text]);
    }

    await db.query('UPDATE live_class_sessions SET revision=revision+1, updated_at=NOW() WHERE id=$1', [ROOM]);
    const session = await getSession(ROOM);
    return res.json({ ok: true, state: session });
  }

  res.status(405).json({ ok: false, error: 'Method not allowed' });
};
