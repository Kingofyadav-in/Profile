"use strict";

jest.mock("pg", () => {
  const query = jest.fn();
  const Pool  = jest.fn(() => ({ query, on: jest.fn() }));
  Pool._query = query;
  return { Pool };
});

const { Pool } = require("pg");
const mockQuery = Pool._query;

const handler = require("../../api/public/[type]");

function makeRes() {
  const h = {};
  return {
    statusCode: 200,
    _body: "",
    headers: h,
    setHeader(k, v) { h[k] = v; },
    end(b) { this._body = b || ""; },
  };
}

function makeReq(method, type) {
  return {
    method,
    query: type ? { type } : {},
    url: type ? `/api/public/${type}` : "/api/public/",
  };
}

beforeEach(() => { mockQuery.mockReset(); });

describe("public handler — routing", () => {
  it("returns 204 for OPTIONS", async () => {
    const res = makeRes();
    await handler(makeReq("OPTIONS", "licenses"), res);
    expect(res.statusCode).toBe(204);
  });

  it("returns 405 for POST", async () => {
    const res = makeRes();
    await handler(makeReq("POST", "licenses"), res);
    expect(res.statusCode).toBe(405);
    expect(JSON.parse(res._body).ok).toBe(false);
  });
});

describe("public handler — license-count", () => {
  it("returns count of active licenses", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: 42 }] });
    const res = makeRes();
    await handler(makeReq("GET", "license-count"), res);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res._body).count).toBe(42);
  });

  it("returns 0 when table is empty", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: 0 }] });
    const res = makeRes();
    await handler(makeReq("GET", "license-count"), res);
    expect(JSON.parse(res._body).count).toBe(0);
  });
});

describe("public handler — licenses", () => {
  it("returns list of active licenses", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          claim_id: "abc-123",
          status: "active",
          claim_date: "2025-01-01",
          metadata: { title: "My Work", type: "article" },
        },
      ],
    });
    const res = makeRes();
    await handler(makeReq("GET", "licenses"), res);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res._body);
    expect(body.ok).toBe(true);
    expect(body.count).toBe(1);
    expect(body.data[0].claim_id).toBe("abc-123");
    expect(body.data[0].metadata.title).toBe("My Work");
  });

  it("returns empty list when no licenses found", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = makeRes();
    await handler(makeReq("GET", "licenses"), res);
    const body = JSON.parse(res._body);
    expect(body.count).toBe(0);
    expect(body.data).toHaveLength(0);
  });
});

describe("public handler — unknown type", () => {
  it("returns 404 for unrecognised type", async () => {
    const res = makeRes();
    await handler(makeReq("GET", "unknown-resource"), res);
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res._body).ok).toBe(false);
  });
});

describe("public handler — DB error", () => {
  it("returns 500 on database failure", async () => {
    mockQuery.mockRejectedValueOnce(new Error("connection refused"));
    const res = makeRes();
    await handler(makeReq("GET", "license-count"), res);
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res._body).ok).toBe(false);
  });
});
