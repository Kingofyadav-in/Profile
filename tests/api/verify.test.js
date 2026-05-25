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

const handler = require("../../api/verify");

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

function makeReq(id = null) {
  return {
    method: "GET",
    query: id ? { id } : {},
    url: id ? `/api/verify/${id}` : "/api/verify/",
  };
}

beforeEach(() => { mockQuery.mockReset(); });

describe("verify handler — validation", () => {
  it("returns 400 when id is absent", async () => {
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res.statusCode).toBe(400);
    expect(res._json.ok).toBe(false);
  });
});

describe("verify handler — license lookup", () => {
  it("returns license data when claim_id matches an active license", async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{
          claim_id: "LIC-001",
          status: "active",
          claim_date: "2025-01-01",
          content_hash: "abc123",
          metadata: {
            title: "My Article",
            type: "article",
            author: "Amit Ku Yadav",
            license: "CC-BY-NC-ND-4.0",
            created: "2025-01-01",
            url: "https://example.com/article",
            hdi_code: "HDI-001",
          },
        }],
      })
      .mockResolvedValueOnce({ rows: [] }); // claims table (not reached but safe)

    const res = makeRes();
    await handler(makeReq("LIC-001"), res);

    expect(res.statusCode).toBe(200);
    expect(res._json.ok).toBe(true);
    expect(res._json.type).toBe("license");
    expect(res._json.data.id).toBe("LIC-001");
    expect(res._json.data.title).toBe("My Article");
    expect(res._json.data.verify_url).toMatch(/LIC-001/);
  });

  it("fills in defaults when metadata fields are missing", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        claim_id: "LIC-002",
        status: "active",
        claim_date: "2025-01-01",
        content_hash: null,
        metadata: {},
      }],
    });

    const res = makeRes();
    await handler(makeReq("LIC-002"), res);

    expect(res._json.data.title).toBe("Untitled");
    expect(res._json.data.author).toBe("Amit Ku Yadav");
  });
});

describe("verify handler — claim lookup", () => {
  it("returns violation_claim when no license found but claim matches", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // license not found
      .mockResolvedValueOnce({
        rows: [{
          id: "CLM-001",
          license_id: "LIC-999",
          platform: "Twitter",
          status: "open",
          submitted_at: "2025-03-01",
          violation_type: "reproduction",
        }],
      });

    const res = makeRes();
    await handler(makeReq("CLM-001"), res);

    expect(res.statusCode).toBe(200);
    expect(res._json.type).toBe("violation_claim");
    expect(res._json.data.id).toBe("CLM-001");
    expect(res._json.data.platform).toBe("Twitter");
  });
});

describe("verify handler — not found", () => {
  it("returns 404 when neither license nor claim matches", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = makeRes();
    await handler(makeReq("UNKNOWN-ID"), res);

    expect(res.statusCode).toBe(404);
    expect(res._json.ok).toBe(false);
  });
});
