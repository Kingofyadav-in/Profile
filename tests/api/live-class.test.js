"use strict";

process.env.NODE_ENV          = "test";
process.env.LIVE_CLASS_TOKEN  = "teacher-tok";
process.env.OPENAI_API_KEY    = "";   // intentionally blank — AI path returns 503
process.env.OPENAI_MODEL      = "gpt-4o-mini";

global.fetch = jest.fn();

jest.mock("pg", () => {
  const query = jest.fn();
  const Pool  = jest.fn(() => ({ query, on: jest.fn() }));
  Pool._query = query;
  return { Pool };
});

const { Pool }  = require("pg");
const mockQuery = Pool._query;
const handler   = require("../../api/live-class");

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRes() {
  const h = {};
  const res = {
    statusCode: 200,
    _json: null,
    _body: "",
    headers: h,
    setHeader(k, v) { h[k] = v; return this; },
    status(code) { this.statusCode = code; return this; },
    json(obj) { this._json = obj; this._body = JSON.stringify(obj); return this; },
    end(b) { this._body = b || ""; return this; },
  };
  return res;
}

function makeReq(method, opts = {}) {
  const { body = {}, query = {}, auth = "" } = opts;
  return {
    method,
    body,
    query,
    headers: {
      "authorization": auth ? `Bearer ${auth}` : "",
      "x-forwarded-for": "1.2.3.4",
    },
    socket: { remoteAddress: "1.2.3.4" },
  };
}

// Simulates the 5 DB calls made by ensureSession + getSession
function mockSession(extra = {}) {
  const session = { id: "main", title: "Live Class", subtitle: "", theme: "blackboard", status: "active", teacher: "", revision: 0, updated_at: new Date(), focus_id: null, ...extra };
  mockQuery
    .mockResolvedValueOnce({ rows: [] })          // ensureSession INSERT
    .mockResolvedValueOnce({ rows: [session] })   // getSession SELECT session
    .mockResolvedValueOnce({ rows: [] })          // getSession SELECT blocks
    .mockResolvedValueOnce({ rows: [] })          // getSession SELECT viewers
    .mockResolvedValueOnce({ rows: [] });         // getSession SELECT questions
}

beforeEach(() => {
  mockQuery.mockReset();
  global.fetch.mockReset();
});

// ── Routing ───────────────────────────────────────────────────────────────────

describe("live-class — routing", () => {
  it("returns 204 for OPTIONS preflight", async () => {
    const res = makeRes();
    await handler(makeReq("OPTIONS"), res);
    expect(res.statusCode).toBe(204);
  });

  it("returns 405 for PUT", async () => {
    const res = makeRes();
    await handler(makeReq("PUT"), res);
    expect(res.statusCode).toBe(405);
  });
});

// ── GET ───────────────────────────────────────────────────────────────────────

describe("live-class — GET session", () => {
  it("returns formatted session", async () => {
    mockSession();
    const res = makeRes();
    await handler(makeReq("GET"), res);
    expect(res.statusCode).toBe(200);
    expect(res._json).toHaveProperty("id", "main");
    expect(res._json).toHaveProperty("blocks");
    expect(res._json).toHaveProperty("viewers");
  });

  it("accepts custom room from query param", async () => {
    mockSession({ id: "room-A" });
    const res = makeRes();
    await handler(makeReq("GET", { query: { room: "room-A" } }), res);
    expect(res.statusCode).toBe(200);
  });

  it("returns replay blocks when ?replay param is set", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: "b1", content: "Hello", type: "text", created_at: new Date() }],
    });
    const res = makeRes();
    await handler(makeReq("GET", { query: { replay: "1" } }), res);
    expect(res.statusCode).toBe(200);
    expect(res._json.replay).toHaveLength(1);
    expect(res._json.replay[0].text).toBe("Hello");
  });

  it("returns empty replay array when no blocks exist", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = makeRes();
    await handler(makeReq("GET", { query: { replay: "1" } }), res);
    expect(res._json.replay).toHaveLength(0);
  });
});

// ── POST: public actions ──────────────────────────────────────────────────────

describe("live-class — POST join", () => {
  it("registers viewer and returns session", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // ensureSession
    mockQuery.mockResolvedValueOnce({ rows: [] }); // JOIN INSERT
    // getSession (4 queries)
    const session = { id: "main", title: "Live Class", subtitle: "", theme: "blackboard", status: "active", teacher: "", revision: 0, updated_at: new Date(), focus_id: null };
    mockQuery
      .mockResolvedValueOnce({ rows: [session] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = makeRes();
    await handler(makeReq("POST", { body: { action: "join", name: "Ravi", device: "mobile", deviceId: "dev-1" } }), res);
    expect(res.statusCode).toBe(200);
    expect(res._json).toHaveProperty("viewerId", "dev-1");
  });
});

describe("live-class — POST react", () => {
  it("stores emoji reaction and returns session", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // ensureSession
    mockQuery.mockResolvedValueOnce({ rows: [] }); // react INSERT
    const session = { id: "main", title: "Live Class", subtitle: "", theme: "blackboard", status: "active", teacher: "", revision: 0, updated_at: new Date(), focus_id: null };
    mockQuery
      .mockResolvedValueOnce({ rows: [session] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = makeRes();
    await handler(makeReq("POST", { body: { action: "react", text: "✋", deviceId: "dev-1", name: "Ravi" } }), res);
    expect(res.statusCode).toBe(200);
    expect(res._json.viewerId).toBe("dev-1");
  });
});

describe("live-class — POST question", () => {
  it("returns 400 for empty question text", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // ensureSession
    const res = makeRes();
    await handler(makeReq("POST", { body: { action: "question", text: "   " } }), res);
    expect(res.statusCode).toBe(400);
    expect(res._json.error).toMatch(/empty/i);
  });

  it("stores a valid question and returns session", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // ensureSession
    mockQuery.mockResolvedValueOnce({ rows: [] }); // INSERT question
    const session = { id: "main", title: "Live Class", subtitle: "", theme: "blackboard", status: "active", teacher: "", revision: 0, updated_at: new Date(), focus_id: null };
    mockQuery
      .mockResolvedValueOnce({ rows: [session] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = makeRes();
    await handler(makeReq("POST", { body: { action: "question", text: "What is Node.js?", name: "Student" } }), res);
    expect(res.statusCode).toBe(200);
    expect(res._json.ok).toBe(true);
  });
});

// ── POST: teacher-only actions ────────────────────────────────────────────────

describe("live-class — teacher auth", () => {
  it("returns 401 when no teacher token is provided", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // ensureSession
    const res = makeRes();
    await handler(makeReq("POST", { body: { action: "clear" } }), res);
    expect(res.statusCode).toBe(401);
  });

  it("returns 401 when wrong token is provided", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // ensureSession
    const res = makeRes();
    await handler(makeReq("POST", { body: { action: "clear" }, auth: "wrong" }), res);
    expect(res.statusCode).toBe(401);
  });
});

describe("live-class — POST write block (teacher)", () => {
  function setupWriteSession() {
    mockQuery.mockResolvedValueOnce({ rows: [] });              // ensureSession
    mockQuery.mockResolvedValueOnce({ rows: [{ count: "0" }] }); // block count
    mockQuery.mockResolvedValueOnce({ rows: [{ pos: 1 }] });    // next position
    mockQuery.mockResolvedValueOnce({ rows: [] });              // INSERT block
    mockQuery.mockResolvedValueOnce({ rows: [] });              // UPDATE revision
    const session = { id: "main", title: "Live Class", subtitle: "", theme: "blackboard", status: "active", teacher: "", revision: 1, updated_at: new Date(), focus_id: null };
    mockQuery
      .mockResolvedValueOnce({ rows: [session] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
  }

  it("writes a text block and returns updated session", async () => {
    setupWriteSession();
    const res = makeRes();
    await handler(makeReq("POST", { body: { action: "write", text: "Hello students" }, auth: "teacher-tok" }), res);
    expect(res.statusCode).toBe(200);
    expect(res._json).toHaveProperty("revision");
  });

  it("writes a heading block", async () => {
    setupWriteSession();
    const res = makeRes();
    await handler(makeReq("POST", { body: { action: "heading", text: "Chapter 1" }, auth: "teacher-tok" }), res);
    expect(res.statusCode).toBe(200);
  });

  it("writes a code block", async () => {
    setupWriteSession();
    const res = makeRes();
    await handler(makeReq("POST", { body: { action: "code", text: "console.log(42)" }, auth: "teacher-tok" }), res);
    expect(res.statusCode).toBe(200);
  });
});

describe("live-class — POST undo (teacher)", () => {
  it("removes the last block", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // ensureSession
    mockQuery.mockResolvedValueOnce({ rows: [] }); // DELETE last block
    mockQuery.mockResolvedValueOnce({ rows: [] }); // UPDATE revision
    const session = { id: "main", title: "Live Class", subtitle: "", theme: "blackboard", status: "active", teacher: "", revision: 0, updated_at: new Date(), focus_id: null };
    mockQuery
      .mockResolvedValueOnce({ rows: [session] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const res = makeRes();
    await handler(makeReq("POST", { body: { action: "undo" }, auth: "teacher-tok" }), res);
    expect(res.statusCode).toBe(200);
  });
});

describe("live-class — POST clear (teacher)", () => {
  it("deletes all blocks", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // ensureSession
    mockQuery.mockResolvedValueOnce({ rows: [] }); // DELETE all blocks
    mockQuery.mockResolvedValueOnce({ rows: [] }); // UPDATE revision
    const session = { id: "main", title: "Live Class", subtitle: "", theme: "blackboard", status: "active", teacher: "", revision: 0, updated_at: new Date(), focus_id: null };
    mockQuery
      .mockResolvedValueOnce({ rows: [session] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const res = makeRes();
    await handler(makeReq("POST", { body: { action: "clear" }, auth: "teacher-tok" }), res);
    expect(res.statusCode).toBe(200);
  });
});

describe("live-class — POST reset (teacher)", () => {
  it("clears blocks and resets session metadata", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // ensureSession
    mockQuery.mockResolvedValueOnce({ rows: [] }); // DELETE blocks
    mockQuery.mockResolvedValueOnce({ rows: [] }); // UPDATE session reset
    mockQuery.mockResolvedValueOnce({ rows: [] }); // UPDATE revision
    const session = { id: "main", title: "Live Class", subtitle: "", theme: "blackboard", status: "active", teacher: "", revision: 0, updated_at: new Date(), focus_id: null };
    mockQuery
      .mockResolvedValueOnce({ rows: [session] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const res = makeRes();
    await handler(makeReq("POST", { body: { action: "reset" }, auth: "teacher-tok" }), res);
    expect(res.statusCode).toBe(200);
  });
});

describe("live-class — POST session field update (teacher)", () => {
  it("updates title field", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // ensureSession
    mockQuery.mockResolvedValueOnce({ rows: [] }); // UPDATE title
    mockQuery.mockResolvedValueOnce({ rows: [] }); // UPDATE revision
    const session = { id: "main", title: "New Title", subtitle: "", theme: "blackboard", status: "active", teacher: "", revision: 1, updated_at: new Date(), focus_id: null };
    mockQuery
      .mockResolvedValueOnce({ rows: [session] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const res = makeRes();
    await handler(makeReq("POST", { body: { action: "title", text: "New Title" }, auth: "teacher-tok" }), res);
    expect(res.statusCode).toBe(200);
  });

  it("updates focus field", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // ensureSession
    mockQuery.mockResolvedValueOnce({ rows: [] }); // UPDATE focus_id
    mockQuery.mockResolvedValueOnce({ rows: [] }); // UPDATE revision
    const session = { id: "main", title: "Live Class", subtitle: "", theme: "blackboard", status: "active", teacher: "", revision: 1, updated_at: new Date(), focus_id: "b-123" };
    mockQuery
      .mockResolvedValueOnce({ rows: [session] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const res = makeRes();
    await handler(makeReq("POST", { body: { action: "focus", text: "b-123" }, auth: "teacher-tok" }), res);
    expect(res.statusCode).toBe(200);
  });

  it("dismisses a question", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // ensureSession
    mockQuery.mockResolvedValueOnce({ rows: [] }); // DELETE question
    mockQuery.mockResolvedValueOnce({ rows: [] }); // UPDATE revision
    const session = { id: "main", title: "Live Class", subtitle: "", theme: "blackboard", status: "active", teacher: "", revision: 1, updated_at: new Date(), focus_id: null };
    mockQuery
      .mockResolvedValueOnce({ rows: [session] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const res = makeRes();
    await handler(makeReq("POST", { body: { action: "dismiss", text: "q-id-1" }, auth: "teacher-tok" }), res);
    expect(res.statusCode).toBe(200);
  });
});

describe("live-class — POST AI (teacher)", () => {
  it("returns 503 when OPENAI_API_KEY is not configured", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // ensureSession
    const res = makeRes();
    await handler(makeReq("POST", { body: { action: "ai", text: "Node.js basics" }, auth: "teacher-tok" }), res);
    expect(res.statusCode).toBe(503);
    expect(res._json.error).toMatch(/OPENAI_API_KEY/i);
  });

  it("returns 400 when AI topic is empty", async () => {
    process.env.OPENAI_API_KEY = "sk-test-key";
    mockQuery.mockResolvedValueOnce({ rows: [] }); // ensureSession
    const res = makeRes();
    await handler(makeReq("POST", { body: { action: "ai", text: "   " }, auth: "teacher-tok" }), res);
    expect(res.statusCode).toBe(400);
    expect(res._json.error).toMatch(/topic/i);
    process.env.OPENAI_API_KEY = "";
  });
});
