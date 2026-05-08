const db = require('../../lib/db');
const auth = require('./_auth');

module.exports = async (req, res) => {
  if (!auth(req, res)) return;
  const { id } = req.query;

  if (req.method === 'GET') {
    const projects = await db.query('SELECT * FROM projects ORDER BY priority DESC, deadline ASC NULLS LAST');
    const tasks = await db.query('SELECT * FROM project_tasks ORDER BY created_at ASC');
    const tasksByProject = tasks.rows.reduce((acc, t) => {
      (acc[t.project_id] = acc[t.project_id] || []).push(t);
      return acc;
    }, {});
    const data = projects.rows.map(p => ({ ...p, tasks: tasksByProject[p.id] || [] }));
    return res.json({ ok: true, data });
  }

  if (req.method === 'POST') {
    if (req.body.project_id) {
      // Add task to project
      const { project_id, title, due_date } = req.body;
      const { rows } = await db.query(
        'INSERT INTO project_tasks (project_id, title, due_date) VALUES ($1,$2,$3) RETURNING *',
        [project_id, title, due_date || null]
      );
      return res.status(201).json({ ok: true, data: rows[0] });
    }
    const { title, description, priority, status, deadline } = req.body;
    const { rows } = await db.query(
      'INSERT INTO projects (title, description, priority, status, deadline) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [title, description, priority || 3, status || 'active', deadline || null]
    );
    return res.status(201).json({ ok: true, data: rows[0] });
  }

  if (req.method === 'PUT' && id) {
    if (req.body.task_id) {
      // Toggle task done
      const { task_id, done } = req.body;
      const { rows } = await db.query(
        'UPDATE project_tasks SET done=$2 WHERE id=$1 RETURNING *', [task_id, done]
      );
      return res.json({ ok: true, data: rows[0] });
    }
    const { title, description, priority, status, deadline } = req.body;
    const { rows } = await db.query(
      'UPDATE projects SET title=$2, description=$3, priority=$4, status=$5, deadline=$6, updated_at=NOW() WHERE id=$1 RETURNING *',
      [id, title, description, priority, status, deadline || null]
    );
    return res.json({ ok: true, data: rows[0] });
  }

  if (req.method === 'DELETE' && id) {
    await db.query('DELETE FROM projects WHERE id=$1', [id]);
    return res.json({ ok: true });
  }

  res.status(405).json({ ok: false, error: 'Method not allowed' });
};
