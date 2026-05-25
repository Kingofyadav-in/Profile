"use strict";

// Extended coverage for api/hi/[...path].js — covers resources not tested in hi-api.test.js

jest.mock("pg", () => {
  const query = jest.fn();
  const Pool  = jest.fn(() => ({ query }));
  Pool._query = query;
  return { Pool };
});

const { Pool }  = require("pg");
const mockQuery = Pool._query;

process.env.HI_API_KEY = "test-hi-key";

const handler = require("../../api/hi/[...path]");

function makeRes() {
  const h = {};
  return {
    statusCode: 200, _body: "",
    setHeader(k, v) { h[k] = v; },
    end(b) { this._body = b || ""; },
    json(body) { this._body = JSON.stringify(body); },
    status(code) { this.statusCode = code; return this; },
    headers: h,
  };
}

function makeReq(method, resource, id = null, body = {}) {
  const url = id ? `/api/hi/${resource}/${id}` : `/api/hi/${resource}`;
  return {
    method, url,
    headers: { authorization: "Bearer test-hi-key" },
    query: id ? { id } : {},
    body,
    socket: { remoteAddress: "127.0.0.1" },
  };
}

beforeEach(() => { mockQuery.mockReset(); });

// ── IDENTITY PUT ──────────────────────────────────────────────────────────────

describe("hi — identity PUT", () => {
  it("updates and returns identity row", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })                                // UPDATE
      .mockResolvedValueOnce({ rows: [{ id: 1, name: "Amit Updated" }] }) // INSERT (no-op)
      .mockResolvedValueOnce({ rows: [{ id: 1, name: "Amit Updated" }] }); // SELECT fallback
    const res = makeRes();
    await handler(makeReq("PUT", "identity", null, { name: "Amit Updated", tagline: "Builder", roles: ["dev"], mission: "Build", location: "India", hdi_code: "AM-01" }), res);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res._body).ok).toBe(true);
  });
});

// ── HABITS ────────────────────────────────────────────────────────────────────

describe("hi — habits PUT log toggle", () => {
  it("logs a habit completion for today", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })  // no existing log → insert
      .mockResolvedValueOnce({ rows: [] }); // INSERT log
    const res = makeRes();
    await handler(makeReq("PUT", "habits", "1", { log: true }), res);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res._body).completed).toBe(true);
  });

  it("untogles habit if already logged today", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // existing log found
      .mockResolvedValueOnce({ rows: [] });          // DELETE log
    const res = makeRes();
    await handler(makeReq("PUT", "habits", "1", { log: true }), res);
    expect(JSON.parse(res._body).completed).toBe(false);
  });

  it("updates habit fields", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, title: "Run", active: true }] });
    const res = makeRes();
    await handler(makeReq("PUT", "habits", "1", { title: "Run", frequency: "daily", active: true }), res);
    expect(res.statusCode).toBe(200);
  });

  it("DELETE removes habit", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = makeRes();
    await handler(makeReq("DELETE", "habits", "1"), res);
    expect(JSON.parse(res._body).ok).toBe(true);
  });
});

// ── GOALS ─────────────────────────────────────────────────────────────────────

describe("hi — goals POST and PUT", () => {
  it("POST creates a goal", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 2, title: "Learn Rust", status: "active" }] });
    const res = makeRes();
    await handler(makeReq("POST", "goals", null, { title: "Learn Rust", status: "active", progress: 0 }), res);
    expect(res.statusCode).toBe(201);
  });

  it("PUT updates a goal", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, title: "Updated", progress: 80 }] });
    const res = makeRes();
    await handler(makeReq("PUT", "goals", "1", { title: "Updated", progress: 80, status: "active" }), res);
    expect(res.statusCode).toBe(200);
  });
});

// ── NOTES ─────────────────────────────────────────────────────────────────────

describe("hi — notes CRUD", () => {
  it("GET returns notes list", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, title: "My Note", body: "content" }] });
    const res = makeRes();
    await handler(makeReq("GET", "notes"), res);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res._body).data).toHaveLength(1);
  });

  it("POST creates a note", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, title: "New Note" }] });
    const res = makeRes();
    await handler(makeReq("POST", "notes", null, { title: "New Note", body: "Hello" }), res);
    expect(res.statusCode).toBe(201);
  });

  it("PUT updates a note", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, title: "Updated" }] });
    const res = makeRes();
    await handler(makeReq("PUT", "notes", "1", { title: "Updated", body: "New body", tags: [] }), res);
    expect(res.statusCode).toBe(200);
  });

  it("DELETE removes a note", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = makeRes();
    await handler(makeReq("DELETE", "notes", "1"), res);
    expect(JSON.parse(res._body).ok).toBe(true);
  });
});

// ── MOOD ─────────────────────────────────────────────────────────────────────

describe("hi — mood CRUD", () => {
  it("GET returns mood logs", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ mood: 8, energy: 7, logged_on: "2026-05-26" }] });
    const res = makeRes();
    await handler(makeReq("GET", "mood"), res);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res._body).data).toHaveLength(1);
  });

  it("POST upserts today's mood", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ mood: 9, energy: 8 }] });
    const res = makeRes();
    await handler(makeReq("POST", "mood", null, { mood: 9, energy: 8, note: "Great day" }), res);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res._body).data.mood).toBe(9);
  });
});

// ── TASKS ─────────────────────────────────────────────────────────────────────

describe("hi — tasks POST, PUT, DELETE", () => {
  it("POST creates a task", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 3, title: "Write tests", done: false }] });
    const res = makeRes();
    await handler(makeReq("POST", "tasks", null, { title: "Write tests", category: "dev" }), res);
    expect(res.statusCode).toBe(201);
  });

  it("PUT updates a task", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 3, title: "Write tests", done: true }] });
    const res = makeRes();
    await handler(makeReq("PUT", "tasks", "3", { title: "Write tests", done: true }), res);
    expect(res.statusCode).toBe(200);
  });

  it("DELETE removes a task", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = makeRes();
    await handler(makeReq("DELETE", "tasks", "3"), res);
    expect(JSON.parse(res._body).ok).toBe(true);
  });
});

// ── CONTACTS ─────────────────────────────────────────────────────────────────

describe("hi — contacts CRUD", () => {
  it("GET returns contacts list", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: "Alice" }] });
    const res = makeRes();
    await handler(makeReq("GET", "contacts"), res);
    expect(JSON.parse(res._body).data).toHaveLength(1);
  });

  it("POST creates a contact", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 2, name: "Bob" }] });
    const res = makeRes();
    await handler(makeReq("POST", "contacts", null, { name: "Bob", email: "bob@example.com" }), res);
    expect(res.statusCode).toBe(201);
  });

  it("PUT updates a contact", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: "Alice Updated" }] });
    const res = makeRes();
    await handler(makeReq("PUT", "contacts", "1", { name: "Alice Updated" }), res);
    expect(res.statusCode).toBe(200);
  });

  it("DELETE removes a contact", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = makeRes();
    await handler(makeReq("DELETE", "contacts", "1"), res);
    expect(JSON.parse(res._body).ok).toBe(true);
  });
});

// ── EVENTS ───────────────────────────────────────────────────────────────────

describe("hi — events CRUD", () => {
  it("GET returns events with contact names", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, title: "Meeting", contact_name: "Alice" }] });
    const res = makeRes();
    await handler(makeReq("GET", "events"), res);
    expect(JSON.parse(res._body).data).toHaveLength(1);
  });

  it("POST creates an event", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 2, title: "Call" }] });
    const res = makeRes();
    await handler(makeReq("POST", "events", null, { title: "Call", event_date: "2026-06-01" }), res);
    expect(res.statusCode).toBe(201);
  });

  it("PUT updates an event", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, title: "Updated Meeting" }] });
    const res = makeRes();
    await handler(makeReq("PUT", "events", "1", { title: "Updated Meeting", event_date: "2026-06-02" }), res);
    expect(res.statusCode).toBe(200);
  });

  it("DELETE removes an event", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = makeRes();
    await handler(makeReq("DELETE", "events", "1"), res);
    expect(JSON.parse(res._body).ok).toBe(true);
  });
});

// ── PROJECTS ─────────────────────────────────────────────────────────────────

describe("hi — projects CRUD", () => {
  it("GET returns projects with their tasks", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1, title: "Profile Site" }] })
      .mockResolvedValueOnce({ rows: [{ project_id: 1, title: "Setup CI", done: false }] });
    const res = makeRes();
    await handler(makeReq("GET", "projects"), res);
    const body = JSON.parse(res._body);
    expect(body.data[0].tasks).toHaveLength(1);
  });

  it("POST creates a project", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 2, title: "New App" }] });
    const res = makeRes();
    await handler(makeReq("POST", "projects", null, { title: "New App", status: "active" }), res);
    expect(res.statusCode).toBe(201);
  });

  it("POST creates a project task", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 5, title: "Deploy", project_id: 1 }] });
    const res = makeRes();
    await handler(makeReq("POST", "projects", null, { project_id: 1, title: "Deploy" }), res);
    expect(res.statusCode).toBe(201);
  });

  it("PUT updates a project", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, title: "Updated" }] });
    const res = makeRes();
    await handler(makeReq("PUT", "projects", "1", { title: "Updated", status: "active" }), res);
    expect(res.statusCode).toBe(200);
  });

  it("PUT toggles a project task done state", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 5, done: true }] });
    const res = makeRes();
    await handler(makeReq("PUT", "projects", "1", { task_id: 5, done: true }), res);
    expect(res.statusCode).toBe(200);
  });

  it("DELETE removes a project", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = makeRes();
    await handler(makeReq("DELETE", "projects", "1"), res);
    expect(JSON.parse(res._body).ok).toBe(true);
  });
});

// ── CHAT ─────────────────────────────────────────────────────────────────────

describe("hi — chat sessions", () => {
  it("GET returns recent session summaries", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: "s1", updated_at: new Date() }] });
    const res = makeRes();
    await handler(makeReq("GET", "chat"), res);
    expect(JSON.parse(res._body).data).toHaveLength(1);
  });

  it("GET with id returns single session", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: "s1", messages: "[]" }] });
    const res = makeRes();
    await handler(makeReq("GET", "chat", "s1"), res);
    expect(JSON.parse(res._body).data.id).toBe("s1");
  });

  it("POST upserts session messages", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: "s1", messages: "[]" }] });
    const res = makeRes();
    await handler(makeReq("POST", "chat", null, { session_id: "s1", messages: [] }), res);
    expect(res.statusCode).toBe(200);
  });

  it("DELETE removes a chat session", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = makeRes();
    await handler(makeReq("DELETE", "chat", "s1"), res);
    expect(JSON.parse(res._body).ok).toBe(true);
  });
});

// ── LICENSES ─────────────────────────────────────────────────────────────────

describe("hi — licenses GET and POST", () => {
  it("GET returns all licenses", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ claim_id: "LIC-001", status: "active" }] });
    const res = makeRes();
    await handler(makeReq("GET", "licenses"), res);
    expect(JSON.parse(res._body).data).toHaveLength(1);
  });

  it("POST creates a new license", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ claim_id: "LIC-002", status: "active" }] });
    const res = makeRes();
    await handler(makeReq("POST", "licenses", null, {
      claim_id: "LIC-002",
      content_hash: "abc123",
      status: "active",
      metadata: { title: "My Work" },
    }), res);
    expect(res.statusCode).toBe(201);
  });
});
