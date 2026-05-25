"use strict";

process.env.NODE_ENV = "test";

jest.mock("pg", () => {
  const query = jest.fn();
  const Pool  = jest.fn(() => ({ query, on: jest.fn() }));
  Pool._query = query;
  return { Pool };
});

const { Pool } = require("pg");
const mockQuery = Pool._query;

const handler = require("../../api/claim");

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

function makeReq(method, body = {}) {
  return {
    method,
    body,
    headers: { origin: "https://kingofyadav.in" },
  };
}

beforeEach(() => { mockQuery.mockReset(); });

describe("claim handler — routing", () => {
  it("returns 204 for OPTIONS preflight", async () => {
    const res = makeRes();
    await handler(makeReq("OPTIONS"), res);
    expect(res.statusCode).toBe(204);
  });

  it("returns 405 for GET", async () => {
    const res = makeRes();
    await handler(makeReq("GET"), res);
    expect(res.statusCode).toBe(405);
    expect(res._json.ok).toBe(false);
  });

  it("returns 405 for PUT", async () => {
    const res = makeRes();
    await handler(makeReq("PUT"), res);
    expect(res.statusCode).toBe(405);
  });
});

describe("claim handler — validation", () => {
  it("returns 400 when license_id is missing", async () => {
    const res = makeRes();
    await handler(makeReq("POST", { infringing_url: "https://bad.com", reporter_email: "a@b.com" }), res);
    expect(res.statusCode).toBe(400);
    expect(res._json.error).toMatch(/license_id/i);
  });

  it("returns 400 when infringing_url is missing", async () => {
    const res = makeRes();
    await handler(makeReq("POST", { license_id: "LIC-001", reporter_email: "a@b.com" }), res);
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 when reporter_email is missing", async () => {
    const res = makeRes();
    await handler(makeReq("POST", { license_id: "LIC-001", infringing_url: "https://bad.com" }), res);
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 when body is entirely absent", async () => {
    const res = makeRes();
    await handler({ method: "POST", headers: { origin: "https://kingofyadav.in" } }, res);
    expect(res.statusCode).toBe(400);
  });
});

describe("claim handler — DMCA submission", () => {
  it("creates claim record and returns DMCA text", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // CREATE TABLE IF NOT EXISTS
      .mockResolvedValueOnce({ rows: [] }); // INSERT

    const res = makeRes();
    await handler(makeReq("POST", {
      license_id:      "LIC-001",
      infringing_url:  "https://evil.com/stolen",
      platform:        "Instagram",
      violation_type:  "reproduction",
      reporter_name:   "John Doe",
      reporter_email:  "john@doe.com",
      reporter_contact: "+91 9876543210",
    }), res);

    expect(res.statusCode).toBe(200);
    expect(res._json.ok).toBe(true);
    expect(res._json.dmca).toMatch(/DMCA/);
    expect(res._json.dmca).toMatch(/LIC-001/);
    expect(res._json.dmca).toMatch(/Instagram/);
    expect(res._json.dmca).toMatch(/john@doe.com/);
  });

  it("works without optional fields (platform, reporter_name)", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = makeRes();
    await handler(makeReq("POST", {
      license_id:     "LIC-002",
      infringing_url: "https://evil.com/other",
      reporter_email: "reporter@test.com",
    }), res);

    expect(res.statusCode).toBe(200);
    expect(res._json.ok).toBe(true);
    expect(res._json.dmca).toMatch(/reporter@test.com/);
  });
});
