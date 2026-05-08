const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

function checkAuth(req, res) {
  const key = process.env.HI_API_KEY;
  if (!key) return true;
  if (req.headers['authorization'] === `Bearer ${key}`) return true;
  res.status(401).json({ ok: false, error: 'Unauthorized' });
  return false;
}

module.exports = async (req, res) => {
  if (!checkAuth(req, res)) return;

  const segments = req.url.split('?')[0].split('/').filter(Boolean);
  // segments: ['api','hi','resource','id'] → pick from index 2
  const hiIdx = segments.indexOf('hi');
  const resource = segments[hiIdx + 1];
  const id = segments[hiIdx + 2];
  const { method } = req;
  const db = pool;

  try {
    // ── IDENTITY ──────────────────────────────────────────────────
    if (resource === 'identity') {
      if (method === 'GET') {
        const { rows } = await db.query('SELECT * FROM identity LIMIT 1');
        return res.json({ ok: true, data: rows[0] || null });
      }
      if (method === 'PUT') {
        const { name, tagline, roles, mission, location, hdi_code } = req.body;
        const { rows } = await db.query(`
          INSERT INTO identity (name, tagline, roles, mission, location, hdi_code)
          VALUES ($1,$2,$3,$4,$5,$6)
          ON CONFLICT (id) DO UPDATE
            SET name=$1,tagline=$2,roles=$3,mission=$4,location=$5,hdi_code=$6,updated_at=NOW()
          RETURNING *`, [name, tagline, roles, mission, location, hdi_code]);
        return res.json({ ok: true, data: rows[0] });
      }
    }

    // ── HABITS ────────────────────────────────────────────────────
    if (resource === 'habits') {
      if (method === 'GET') {
        const habits = await db.query('SELECT * FROM habits WHERE active=true ORDER BY created_at ASC');
        const logs = await db.query('SELECT * FROM habit_logs WHERE completed_on >= CURRENT_DATE - 30');
        return res.json({ ok: true, habits: habits.rows, logs: logs.rows });
      }
      if (method === 'POST') {
        const { title, description, frequency } = req.body;
        const { rows } = await db.query(
          'INSERT INTO habits (title,description,frequency) VALUES ($1,$2,$3) RETURNING *',
          [title, description, frequency || 'daily']);
        return res.status(201).json({ ok: true, data: rows[0] });
      }
      if (method === 'PUT' && id) {
        if (req.body.log) {
          const { rows: ex } = await db.query('SELECT id FROM habit_logs WHERE habit_id=$1 AND completed_on=CURRENT_DATE', [id]);
          if (ex.length) { await db.query('DELETE FROM habit_logs WHERE habit_id=$1 AND completed_on=CURRENT_DATE', [id]); return res.json({ ok: true, completed: false }); }
          await db.query('INSERT INTO habit_logs (habit_id) VALUES ($1)', [id]);
          return res.json({ ok: true, completed: true });
        }
        const { title, description, frequency, active } = req.body;
        const { rows } = await db.query('UPDATE habits SET title=$2,description=$3,frequency=$4,active=$5 WHERE id=$1 RETURNING *', [id, title, description, frequency, active]);
        return res.json({ ok: true, data: rows[0] });
      }
      if (method === 'DELETE' && id) { await db.query('DELETE FROM habits WHERE id=$1', [id]); return res.json({ ok: true }); }
    }

    // ── GOALS ─────────────────────────────────────────────────────
    if (resource === 'goals') {
      if (method === 'GET') {
        const { rows } = await db.query("SELECT * FROM goals ORDER BY status='active' DESC, deadline ASC NULLS LAST");
        return res.json({ ok: true, data: rows });
      }
      if (method === 'POST') {
        const { title, body, progress, deadline, status } = req.body;
        const { rows } = await db.query('INSERT INTO goals (title,body,progress,deadline,status) VALUES ($1,$2,$3,$4,$5) RETURNING *', [title, body, progress || 0, deadline || null, status || 'active']);
        return res.status(201).json({ ok: true, data: rows[0] });
      }
      if (method === 'PUT' && id) {
        const { title, body, progress, deadline, status } = req.body;
        const { rows } = await db.query('UPDATE goals SET title=$2,body=$3,progress=$4,deadline=$5,status=$6,updated_at=NOW() WHERE id=$1 RETURNING *', [id, title, body, progress, deadline || null, status]);
        return res.json({ ok: true, data: rows[0] });
      }
      if (method === 'DELETE' && id) { await db.query('DELETE FROM goals WHERE id=$1', [id]); return res.json({ ok: true }); }
    }

    // ── NOTES ─────────────────────────────────────────────────────
    if (resource === 'notes') {
      if (method === 'GET') {
        const { rows } = await db.query('SELECT * FROM notes ORDER BY updated_at DESC');
        return res.json({ ok: true, data: rows });
      }
      if (method === 'POST') {
        const { title, body, tags } = req.body;
        const { rows } = await db.query('INSERT INTO notes (title,body,tags) VALUES ($1,$2,$3) RETURNING *', [title, body, JSON.stringify(tags || [])]);
        return res.status(201).json({ ok: true, data: rows[0] });
      }
      if (method === 'PUT' && id) {
        const { title, body, tags } = req.body;
        const { rows } = await db.query('UPDATE notes SET title=$2,body=$3,tags=$4,updated_at=NOW() WHERE id=$1 RETURNING *', [id, title, body, JSON.stringify(tags || [])]);
        return res.json({ ok: true, data: rows[0] });
      }
      if (method === 'DELETE' && id) { await db.query('DELETE FROM notes WHERE id=$1', [id]); return res.json({ ok: true }); }
    }

    // ── MOOD ──────────────────────────────────────────────────────
    if (resource === 'mood') {
      if (method === 'GET') {
        const { rows } = await db.query('SELECT * FROM mood_logs ORDER BY logged_on DESC LIMIT 30');
        return res.json({ ok: true, data: rows });
      }
      if (method === 'POST') {
        const { mood, energy, note } = req.body;
        const { rows } = await db.query(`INSERT INTO mood_logs (mood,energy,note) VALUES ($1,$2,$3) ON CONFLICT (logged_on) DO UPDATE SET mood=$1,energy=$2,note=$3 RETURNING *`, [mood, energy, note]);
        return res.json({ ok: true, data: rows[0] });
      }
    }

    // ── TASKS ─────────────────────────────────────────────────────
    if (resource === 'tasks') {
      if (method === 'GET') {
        const { rows } = await db.query('SELECT * FROM tasks ORDER BY done ASC, due_date ASC NULLS LAST');
        return res.json({ ok: true, data: rows });
      }
      if (method === 'POST') {
        const { title, category, due_date } = req.body;
        const { rows } = await db.query('INSERT INTO tasks (title,category,due_date) VALUES ($1,$2,$3) RETURNING *', [title, category, due_date || null]);
        return res.status(201).json({ ok: true, data: rows[0] });
      }
      if (method === 'PUT' && id) {
        const { title, category, done, due_date } = req.body;
        const { rows } = await db.query('UPDATE tasks SET title=$2,category=$3,done=$4,due_date=$5,updated_at=NOW() WHERE id=$1 RETURNING *', [id, title, category, done, due_date || null]);
        return res.json({ ok: true, data: rows[0] });
      }
      if (method === 'DELETE' && id) { await db.query('DELETE FROM tasks WHERE id=$1', [id]); return res.json({ ok: true }); }
    }

    // ── CONTACTS ──────────────────────────────────────────────────
    if (resource === 'contacts') {
      if (method === 'GET') {
        const { rows } = await db.query('SELECT * FROM contacts ORDER BY name ASC');
        return res.json({ ok: true, data: rows });
      }
      if (method === 'POST') {
        const { name, email, phone, company, note, follow_up_date } = req.body;
        const { rows } = await db.query('INSERT INTO contacts (name,email,phone,company,note,follow_up_date) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *', [name, email, phone, company, note, follow_up_date || null]);
        return res.status(201).json({ ok: true, data: rows[0] });
      }
      if (method === 'PUT' && id) {
        const { name, email, phone, company, note, follow_up_date } = req.body;
        const { rows } = await db.query('UPDATE contacts SET name=$2,email=$3,phone=$4,company=$5,note=$6,follow_up_date=$7,updated_at=NOW() WHERE id=$1 RETURNING *', [id, name, email, phone, company, note, follow_up_date || null]);
        return res.json({ ok: true, data: rows[0] });
      }
      if (method === 'DELETE' && id) { await db.query('DELETE FROM contacts WHERE id=$1', [id]); return res.json({ ok: true }); }
    }

    // ── EVENTS ────────────────────────────────────────────────────
    if (resource === 'events') {
      if (method === 'GET') {
        const { rows } = await db.query('SELECT e.*,c.name AS contact_name FROM events e LEFT JOIN contacts c ON e.contact_id=c.id ORDER BY e.event_date ASC');
        return res.json({ ok: true, data: rows });
      }
      if (method === 'POST') {
        const { title, description, event_date, follow_up_date, contact_id } = req.body;
        const { rows } = await db.query('INSERT INTO events (title,description,event_date,follow_up_date,contact_id) VALUES ($1,$2,$3,$4,$5) RETURNING *', [title, description, event_date, follow_up_date || null, contact_id || null]);
        return res.status(201).json({ ok: true, data: rows[0] });
      }
      if (method === 'PUT' && id) {
        const { title, description, event_date, follow_up_date, contact_id } = req.body;
        const { rows } = await db.query('UPDATE events SET title=$2,description=$3,event_date=$4,follow_up_date=$5,contact_id=$6 WHERE id=$1 RETURNING *', [id, title, description, event_date, follow_up_date || null, contact_id || null]);
        return res.json({ ok: true, data: rows[0] });
      }
      if (method === 'DELETE' && id) { await db.query('DELETE FROM events WHERE id=$1', [id]); return res.json({ ok: true }); }
    }

    // ── PROJECTS ──────────────────────────────────────────────────
    if (resource === 'projects') {
      if (method === 'GET') {
        const projects = await db.query('SELECT * FROM projects ORDER BY priority DESC, deadline ASC NULLS LAST');
        const tasks = await db.query('SELECT * FROM project_tasks ORDER BY created_at ASC');
        const byProject = tasks.rows.reduce((a, t) => { (a[t.project_id] = a[t.project_id] || []).push(t); return a; }, {});
        return res.json({ ok: true, data: projects.rows.map(p => ({ ...p, tasks: byProject[p.id] || [] })) });
      }
      if (method === 'POST') {
        if (req.body.project_id) {
          const { project_id, title, due_date } = req.body;
          const { rows } = await db.query('INSERT INTO project_tasks (project_id,title,due_date) VALUES ($1,$2,$3) RETURNING *', [project_id, title, due_date || null]);
          return res.status(201).json({ ok: true, data: rows[0] });
        }
        const { title, description, priority, status, deadline } = req.body;
        const { rows } = await db.query('INSERT INTO projects (title,description,priority,status,deadline) VALUES ($1,$2,$3,$4,$5) RETURNING *', [title, description, priority || 3, status || 'active', deadline || null]);
        return res.status(201).json({ ok: true, data: rows[0] });
      }
      if (method === 'PUT' && id) {
        if (req.body.task_id) {
          const { task_id, done } = req.body;
          const { rows } = await db.query('UPDATE project_tasks SET done=$2 WHERE id=$1 RETURNING *', [task_id, done]);
          return res.json({ ok: true, data: rows[0] });
        }
        const { title, description, priority, status, deadline } = req.body;
        const { rows } = await db.query('UPDATE projects SET title=$2,description=$3,priority=$4,status=$5,deadline=$6,updated_at=NOW() WHERE id=$1 RETURNING *', [id, title, description, priority, status, deadline || null]);
        return res.json({ ok: true, data: rows[0] });
      }
      if (method === 'DELETE' && id) { await db.query('DELETE FROM projects WHERE id=$1', [id]); return res.json({ ok: true }); }
    }

    // ── CHAT ──────────────────────────────────────────────────────
    if (resource === 'chat') {
      if (method === 'GET') {
        if (id) {
          const { rows } = await db.query('SELECT * FROM chat_sessions WHERE id=$1', [id]);
          return res.json({ ok: true, data: rows[0] || null });
        }
        const { rows } = await db.query('SELECT id,updated_at FROM chat_sessions ORDER BY updated_at DESC LIMIT 30');
        return res.json({ ok: true, data: rows });
      }
      if (method === 'POST') {
        const { session_id, messages } = req.body;
        const sid = session_id || `session-${new Date().toISOString().slice(0, 10)}`;
        const { rows } = await db.query(`INSERT INTO chat_sessions (id,messages) VALUES ($1,$2) ON CONFLICT (id) DO UPDATE SET messages=$2,updated_at=NOW() RETURNING *`, [sid, JSON.stringify(messages)]);
        return res.json({ ok: true, data: rows[0] });
      }
      if (method === 'DELETE' && id) { await db.query('DELETE FROM chat_sessions WHERE id=$1', [id]); return res.json({ ok: true }); }
    }

    res.status(404).json({ ok: false, error: `Unknown resource: ${resource}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
};
