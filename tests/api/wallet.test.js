"use strict";

// Mock pg before requiring the handler so Pool never opens a real connection.
jest.mock("pg", () => {
  const query = jest.fn();
  const Pool = jest.fn(() => ({ query }));
  Pool._query = query; // expose for test control
  return { Pool };
});

const { Pool } = require("pg");
const mockQuery = Pool._query;

// Set required env before loading handler
process.env.HI_API_KEY = "test-hi-key";

const handler = require("../../api/wallet/[...path]");

function makeRes() {
  const h = {};
  return {
    statusCode: 200, _body: "",
    setHeader(k, v) { h[k] = v; },
    end(b) { this._body = b || ""; },
    headers: h,
  };
}

function makeReq(method, path, bodyObj = {}, authKey = "test-hi-key") {
  const raw = JSON.stringify(bodyObj);
  const req = {
    method,
    url: `/api/wallet/${path}`,
    headers: {
      "authorization": `Bearer ${authKey}`,
      "content-type": "application/json",
    },
    query: {},
    socket: { remoteAddress: "127.0.0.1" },
    _raw: raw,
    on(event, cb) {
      if (event === "data") cb(raw);
      if (event === "end") cb();
      return this;
    },
    destroy() {},
  };
  return req;
}

beforeEach(() => {
  mockQuery.mockReset();
});

describe("wallet handler — auth", () => {
  it("returns 401 when HI_API_KEY missing", async () => {
    const req = makeReq("GET", "balance", {}, "wrong-key");
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res._body).ok).toBe(false);
  });

  it("returns 204 for OPTIONS (preflight)", async () => {
    const req = { method: "OPTIONS", url: "/api/wallet/balance", headers: { authorization: "Bearer test-hi-key" }, socket: {}, query: {}, on: () => {}, destroy: () => {} };
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(204);
  });
});

describe("wallet handler — balance", () => {
  it("returns balance with supply stats", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ balance: 10, locked_balance: 2 }] })
      .mockResolvedValueOnce({ rows: [{ issued: 10 }] });

    const req = makeReq("GET", "balance");
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res._body);
    expect(body.ok).toBe(true);
    expect(body.data.balance).toBe(10);
    expect(body.data.available).toBe(8);
    expect(body.data.max_supply).toBe(99);
    expect(body.data.remaining_mintable).toBe(89);
  });
});

describe("wallet handler — transactions", () => {
  it("GET returns paginated transactions", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1, type: "mint", amount: 5 }] })
      .mockResolvedValueOnce({ rows: [{ total: 1 }] });

    const req = makeReq("GET", "transactions");
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res._body);
    expect(body.data.transactions).toHaveLength(1);
    expect(body.data.total).toBe(1);
  });

  it("POST mint returns 400 if supply exceeded", async () => {
    // No request_id → idempotency check skipped; first query is the supply check
    mockQuery.mockResolvedValueOnce({ rows: [{ issued: 95 }] }); // supply check

    const req = makeReq("POST", "transactions", { type: "mint", amount: 10 });
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res._body).error).toMatch(/max supply/i);
  });

  it("POST mint succeeds and returns 201", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })                     // idempotency
      .mockResolvedValueOnce({ rows: [{ issued: 5 }] })        // supply
      .mockResolvedValueOnce({ rows: [] })                     // wallet update
      .mockResolvedValueOnce({ rows: [{ id: 1, type: "mint", amount: 3 }] }); // insert

    const req = makeReq("POST", "transactions", { type: "mint", amount: 3, request_id: "req-abc" });
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res._body).data.type).toBe("mint");
  });

  it("POST with duplicate request_id returns existing row (idempotent)", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 5, type: "mint", amount: 3, request_id: "req-dup" }] });

    const req = makeReq("POST", "transactions", { type: "mint", amount: 3, request_id: "req-dup" });
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res._body).data.request_id).toBe("req-dup");
    // Only 1 query fired — the idempotency lookup — no further DB writes
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });
});

describe("wallet handler — vault", () => {
  it("GET returns list of backups", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, label: "backup-1", size_bytes: 2048 }] });
    const req = makeReq("GET", "vault");
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res._body).data.backups).toHaveLength(1);
  });

  it("POST vault requires ciphertext", async () => {
    const req = makeReq("POST", "vault", { label: "test" });
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res._body).error).toMatch(/ciphertext/i);
  });

  it("POST vault stores backup and returns 201", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 2, label: "backup", size_bytes: 100 }] });
    const req = makeReq("POST", "vault", { label: "backup", ciphertext: "abc123encrypted" });
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(201);
  });
});

describe("wallet handler — marketplace", () => {
  it("GET returns active listings", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, title: "Item", price_coins: 2 }] });
    const req = makeReq("GET", "marketplace");
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res._body).data.listings).toHaveLength(1);
  });

  it("POST listing requires title and price_coins", async () => {
    const req = makeReq("POST", "marketplace", { description: "no title" });
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  it("POST listing creates and returns 201", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 3, title: "Widget", price_coins: 1, status: "active" }] });
    const req = makeReq("POST", "marketplace", { title: "Widget", price_coins: 1 });
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(201);
  });
});
