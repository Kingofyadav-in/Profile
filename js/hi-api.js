// HI App — Cloud Sync Layer
// Patches hiPut/hiDelete to sync to /api/hi/* after every write.
// Load this AFTER hi-storage.js and BEFORE calling hiApiInit().

const _HI_API_BASE = '/api/hi';
let _hiApiPulling = false;

// ─── Key management ──────────────────────────────────────────────────────────

function hiApiGetKey()       { return localStorage.getItem('hi_api_key'); }
function hiApiSetKey(k)      { localStorage.setItem('hi_api_key', k); }

// ─── ID map  localId → { apiId, resource } ──────────────────────────────────

function _idMap()            { return JSON.parse(localStorage.getItem('hi_id_map') || '{}'); }
function hiApiSetId(lid, aid, res) {
  const m = _idMap(); m[lid] = { apiId: aid, resource: res };
  localStorage.setItem('hi_id_map', JSON.stringify(m));
}
function hiApiLookup(lid)    { return _idMap()[lid] || null; }
function hiApiForgetId(lid)  { const m = _idMap(); delete m[lid]; localStorage.setItem('hi_id_map', JSON.stringify(m)); }

// ─── Fetch helper ────────────────────────────────────────────────────────────

async function hiApiFetch(path, method = 'GET', body = null) {
  const key = hiApiGetKey();
  if (!key) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${_HI_API_BASE}/${path}`, {
      method,
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: body != null ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
    const json = await res.json();
    return json.ok ? json : null;
  } catch (e) {
    if (e.name !== 'AbortError') console.warn('[HI API]', path, e.message);
    else console.warn('[HI API] Timeout:', path);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Push one record to API (fire-and-forget) ────────────────────────────────

async function _hiApiPush(store, record) {
  if (!record || !hiApiGetKey()) return;
  const entry = hiApiLookup(record.id);
  const apiId = entry?.apiId;
  const isNew = !apiId;

  if (store === 'identity') {
    return hiApiFetch('identity', 'PUT', {
      name: record.name, username: record.username, email: record.email,
      phone_code: record.phoneCode, phone: record.phone,
      tagline: record.tagline, roles: record.roles,
      mission: record.mission, location: record.location, hdi_code: record.hdi
    });
  }

  if (store === 'tasks') {
    const body = { title: record.title, done: !!record.done, due_date: record.date || null, category: 'personal' };
    if (isNew) {
      const r = await hiApiFetch('tasks', 'POST', body);
      if (r?.data?.id) hiApiSetId(record.id, r.data.id, 'tasks');
    } else {
      hiApiFetch(`tasks?id=${apiId}`, 'PUT', body);
    }
    return;
  }

  if (store === 'personal') {
    if (record.type === 'goal') {
      const body = { title: record.title, body: record.note || '', progress: record.progress || 0, deadline: record.deadline || null, status: 'active' };
      if (isNew) { const r = await hiApiFetch('goals', 'POST', body); if (r?.data?.id) hiApiSetId(record.id, r.data.id, 'goals'); }
      else hiApiFetch(`goals?id=${apiId}`, 'PUT', body);
      return;
    }
    if (record.type === 'note') {
      const body = { title: record.title || '', body: record.body || '' };
      if (isNew) { const r = await hiApiFetch('notes', 'POST', body); if (r?.data?.id) hiApiSetId(record.id, r.data.id, 'notes'); }
      else hiApiFetch(`notes?id=${apiId}`, 'PUT', body);
      return;
    }
    if (record.id?.startsWith('mood-')) {
      return hiApiFetch('mood', 'POST', { mood: record.mood, energy: record.energy, note: '' });
    }
  }

  if (store === 'professional') {
    if (record.type === 'project') {
      const body = { title: record.name, description: record.icon || '', priority: 3, status: record.status || 'active' };
      if (isNew) { const r = await hiApiFetch('projects', 'POST', body); if (r?.data?.id) hiApiSetId(record.id, r.data.id, 'projects'); }
      else hiApiFetch(`projects?id=${apiId}`, 'PUT', body);
      return;
    }
    if (record.type === 'protask') {
      const projEntry = hiApiLookup(record.projectId);
      if (!projEntry) return;
      if (isNew) {
        const r = await hiApiFetch('projects', 'POST', { title: record.title, project_id: projEntry.apiId });
        if (r?.data?.id) hiApiSetId(record.id, r.data.id, 'project_tasks');
      } else {
        hiApiFetch(`projects?id=${projEntry.apiId}`, 'PUT', { task_id: apiId, done: !!record.done });
      }
      return;
    }
  }

  if (store === 'social') {
    if (record.type === 'person') {
      const body = { name: record.name, email: record.email || '', phone: record.phone || '', company: record.role || '', note: record.note || '', follow_up_date: null, whatsapp: record.whatsapp || '', birthday: record.birthday || null, relationship: record.relationship || '' };
      if (isNew) { const r = await hiApiFetch('contacts', 'POST', body); if (r?.data?.id) hiApiSetId(record.id, r.data.id, 'contacts'); }
      else hiApiFetch(`contacts?id=${apiId}`, 'PUT', body);
      return;
    }
    if (record.type === 'event') {
      const body = { title: record.title, description: record.note || '', event_date: record.date, follow_up_date: null, event_time: record.time || null, event_type: record.eventType || 'Meeting' };
      if (isNew) { const r = await hiApiFetch('events', 'POST', body); if (r?.data?.id) hiApiSetId(record.id, r.data.id, 'events'); }
      else hiApiFetch(`events?id=${apiId}`, 'PUT', body);
      return;
    }
  }

  if (store === 'chat') {
    const sid = record.id || `session-${new Date().toISOString().slice(0,10)}`;
    return hiApiFetch('chat', 'POST', { session_id: sid, messages: record.messages || [] });
  }

  if (store === 'licenses') {
    const body = {
      claim_id: record.licenseId,
      content_hash: record.contentHash,
      status: 'active',
      metadata: {
        title: record.title,
        type: record.contentType,
        license: record.licenseType,
        author: record.ownerName,
        hdi_code: record.ownerHDI,
        created: record.createdAtStr
      }
    };
    if (isNew) {
      const r = await hiApiFetch('licenses', 'POST', body);
      if (r?.data?.id) hiApiSetId(record.id, r.data.id, 'licenses');
    } else {
      hiApiFetch(`licenses?id=${apiId}`, 'PUT', body);
    }
    return;
  }
}

// ─── Delete record from API ──────────────────────────────────────────────────

async function _hiApiDelete(localId) {
  const entry = hiApiLookup(localId);
  if (!entry) return;
  await hiApiFetch(`${entry.resource}?id=${entry.apiId}`, 'DELETE');
  hiApiForgetId(localId);
}

// ─── Pull API → IndexedDB (on load) ─────────────────────────────────────────

async function hiApiPull() {
  if (!hiApiGetKey()) return;
  _hiApiPulling = true;
  try {
    // Identity
    const identity = await hiApiFetch('identity');
    if (identity?.data) {
      const d = identity.data;
      await hiPut('identity', {
        id: 'primary',
        name: d.name,
        username: d.username || d.user_name || '',
        email: d.email || '',
        phoneCode: d.phone_code || d.phoneCode || '',
        phone: d.phone || '',
        tagline: d.tagline,
        roles: d.roles,
        mission: d.mission,
        location: d.location,
        hdi: d.hdi_code,
        updatedAt: Date.now()
      });
    }

    // Tasks
    const tasks = await hiApiFetch('tasks');
    if (tasks?.data) {
      for (const t of tasks.data) {
        hiApiSetId(t.id, t.id, 'tasks');
        await hiPut('tasks', { id: t.id, title: t.title, done: t.done, date: t.due_date, createdAt: new Date(t.created_at).getTime() });
      }
    }

    // Goals
    const goals = await hiApiFetch('goals');
    if (goals?.data) {
      for (const g of goals.data) {
        hiApiSetId(g.id, g.id, 'goals');
        await hiPut('personal', { id: g.id, type: 'goal', title: g.title, note: g.body, progress: g.progress, deadline: g.deadline, updatedAt: Date.now() });
      }
    }

    // Notes
    const notes = await hiApiFetch('notes');
    if (notes?.data) {
      for (const n of notes.data) {
        hiApiSetId(n.id, n.id, 'notes');
        await hiPut('personal', { id: n.id, type: 'note', title: n.title, body: n.body, updatedAt: Date.now() });
      }
    }

    // Mood (last 30 days)
    const mood = await hiApiFetch('mood');
    if (mood?.data) {
      for (const m of mood.data) {
        await hiPut('personal', { id: `mood-${m.logged_on}`, mood: m.mood, energy: m.energy, date: m.logged_on });
      }
    }

    // Contacts
    const contacts = await hiApiFetch('contacts');
    if (contacts?.data) {
      for (const c of contacts.data) {
        hiApiSetId(c.id, c.id, 'contacts');
        await hiPut('social', { id: c.id, type: 'person', name: c.name, email: c.email, phone: c.phone, role: c.company, note: c.note, whatsapp: c.whatsapp || '', birthday: c.birthday || '', relationship: c.relationship || '' });
      }
    }

    // Events
    const events = await hiApiFetch('events');
    if (events?.data) {
      for (const e of events.data) {
        hiApiSetId(e.id, e.id, 'events');
        await hiPut('social', { id: e.id, type: 'event', title: e.title, date: e.event_date, note: e.description, time: e.event_time || '', eventType: e.event_type || 'Meeting' });
      }
    }

    // Projects + tasks
    const projects = await hiApiFetch('projects');
    if (projects?.data) {
      for (const p of projects.data) {
        hiApiSetId(p.id, p.id, 'projects');
        await hiPut('professional', { id: p.id, type: 'project', name: p.title, icon: p.description, status: p.status });
        for (const t of (p.tasks || [])) {
          hiApiSetId(t.id, t.id, 'project_tasks');
          await hiPut('professional', { id: t.id, type: 'protask', title: t.title, projectId: p.id, done: t.done, priority: 'normal' });
        }
      }
    }

    // Today's chat session
    const today = new Date().toISOString().slice(0,10);
    const chat = await hiApiFetch(`chat?id=session-${today}`);
    if (chat?.data?.messages?.length) {
      await hiPut('chat', { id: `session-${today}`, messages: chat.data.messages, updatedAt: Date.now() });
    }

    // Licenses
    const licenses = await hiApiFetch('licenses');
    if (licenses?.data) {
      for (const l of licenses.data) {
        hiApiSetId(l.id, l.id, 'licenses');
        const m = l.metadata || {};
        await hiPut('licenses', {
          id: l.id,
          licenseId: l.claim_id,
          title: m.title || 'Untitled',
          contentType: m.type || 'Data',
          licenseType: m.license || 'personal',
          contentHash: l.content_hash,
          ownerName: m.author || '',
          ownerHDI: m.hdi_code || '',
          createdAtStr: m.created || '',
          updatedAt: Date.now()
        });
      }
    }

    console.log('[HI API] Sync complete ✓');
  } catch (e) {
    console.warn('[HI API] Pull failed:', e.message);
  } finally {
    _hiApiPulling = false;
  }
}

// ─── Patch hiPut / hiDelete ──────────────────────────────────────────────────

(function patchHiStorage() {
  const _origPut    = window.hiPut;
  const _origDelete = window.hiDelete;

  if (typeof _origPut === 'function') {
    window.hiPut = async function(store, item) {
      const result = await _origPut(store, item);
      if (!_hiApiPulling) _hiApiPush(store, item);
      return result;
    };
  }

  if (typeof _origDelete === 'function') {
    window.hiDelete = async function(store, id) {
      const result = await _origDelete(store, id);
      if (!_hiApiPulling) _hiApiDelete(id);
      return result;
    };
  }
})();

// ─── Init ────────────────────────────────────────────────────────────────────

async function hiApiInit() {
  if (!hiApiGetKey()) {
    console.info('[HI API] No API key set. Call hiApiSetKey("your-key") in console to enable cloud sync.');
    return;
  }
  await hiApiPull();
}
