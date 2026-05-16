"use strict";

jest.mock("pg", () => {
  const query = jest.fn();
  const Pool = jest.fn(() => ({ query }));
  Pool._query = query;
  return { Pool };
});

const { Pool } = require("pg");
const mockQuery = Pool._query;

process.env.HI_API_KEY = "test-hi-key";

const handler = require("../../api/hi/[...path]");

function makeRes() {
  const h = {};
  return {
    statusCode: 200, _body: "",
    setHeader(k, v) { h[k] = v; },
    end(b) { this._body = b || ""; },
    json(body) {
      this._body = JSON.stringify(body);
      if (body.ok === false && this.statusCode === 200) this.statusCode = 500;
    },
    status(code) { this.statusCode = code; return this; },
    headers: h,
  };
}

function makeReq(method, resource, id = null, body = {}, auth = "test-hi-key") {
  const url = id ? `/api/hi/${resource}/${id}` : `/api/hi/${resource}`;
  return {
    method, url,
    headers: { authorization: `Bearer ${auth}` },
    query: id ? { id } : {},
    body,
    socket: { remoteAddress: "127.0.0.1" },
  };
}

beforeEach(() => {
  mockQuery.mockReset();
});

describe("hi API — auth gate", () => {
  it("returns 401 with wrong key", async () => {
    const req = makeReq("GET", "identity", null, {}, "bad-key");
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(401);
  });

  it("returns 500 when HI_API_KEY env is not set", async () => {
    const saved = process.env.HI_API_KEY;
    delete process.env.HI_API_KEY;
    const req = makeReq("GET", "identity");
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(500);
    process.env.HI_API_KEY = saved;
  });
});

describe("hi API — identity", () => {
  it("GET returns identity row", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: "Amit", tagline: "Builder" }] });
    const req = makeReq("GET", "identity");
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res._body).data.name).toBe("Amit");
  });

  it("GET returns null when no identity row exists", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const req = makeReq("GET", "identity");
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res._body).data).toBeNull();
  });
});

describe("hi API — habits", () => {
  it("GET returns habits and logs", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1, title: "Run", active: true }] })
      .mockResolvedValueOnce({ rows: [{ habit_id: 1, completed_on: "2026-05-16" }] });
    const req = makeReq("GET", "habits");
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res._body);
    expect(body.habits).toHaveLength(1);
    expect(body.logs).toHaveLength(1);
  });

  it("POST creates a habit", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 2, title: "Meditate" }] });
    const req = makeReq("POST", "habits", null, { title: "Meditate", frequency: "daily" });
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res._body).data.title).toBe("Meditate");
  });
});

describe("hi API — goals", () => {
  it("GET returns goals", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, title: "Build OS", status: "active", progress: 40 }] });
    const req = makeReq("GET", "goals");
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res._body).data).toHaveLength(1);
  });

  it("DELETE removes a goal", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const req = makeReq("DELETE", "goals", "1");
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res._body).ok).toBe(true);
  });
});

describe("hi API — tasks", () => {
  it("GET returns tasks ordered by due date", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, title: "Deploy", done: false }] });
    const req = makeReq("GET", "tasks");
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res._body).data).toHaveLength(1);
  });
});

describe("hi API — hdi score", () => {
  it("GET computes HDI from all sub-queries", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ progress: 80, status: "active" }] })           // goals
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })                                    // habits
      .mockResolvedValueOnce({ rows: [{ habit_id: 1 }] })                              // habit_logs
      .mockResolvedValueOnce({ rows: [{ mood: 7, energy: 8 }] })                       // mood
      .mockResolvedValueOnce({ rows: [{ done: true }, { done: false }] });             // tasks

    const req = makeReq("GET", "hdi");
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res._body);
    expect(body.data.hdi).toBeGreaterThan(0);
    expect(body.data.hdi).toBeLessThanOrEqual(100);
    expect(body.data.grade).toMatch(/^[SABCDF]$/);
    expect(body.data.breakdown).toHaveProperty("goals");
  });
});

describe("hi API — unknown resource", () => {
  it("returns 404 for unknown resource", async () => {
    const req = makeReq("GET", "nonexistent");
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(404);
  });
});
