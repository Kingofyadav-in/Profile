"use strict";

process.env.NODE_ENV = "test";

const handler = require("../../api/upi-payment");

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

function makeReq(method, body = {}, origin = "https://kingofyadav.in") {
  return { method, body, headers: { origin } };
}

describe("upi-payment — routing", () => {
  it("returns 204 for OPTIONS preflight", async () => {
    const res = makeRes();
    await handler(makeReq("OPTIONS"), res);
    expect(res.statusCode).toBe(204);
  });

  it("returns 405 for GET", async () => {
    const res = makeRes();
    await handler(makeReq("GET"), res);
    expect(res.statusCode).toBe(405);
  });

  it("returns 400 when orderId is missing from body", async () => {
    const res = makeRes();
    await handler(makeReq("POST", {}), res);
    expect(res.statusCode).toBe(400);
    expect(res._json.error).toMatch(/orderId/i);
  });

  it("returns 400 when body is absent entirely", async () => {
    const res = makeRes();
    await handler({ method: "POST", headers: { origin: "https://kingofyadav.in" } }, res);
    expect(res.statusCode).toBe(400);
  });
});

describe("upi-payment — quote request", () => {
  it("records quote request when utr is absent", async () => {
    const res = makeRes();
    await handler(makeReq("POST", { orderId: "ORD-001" }), res);
    expect(res.statusCode).toBe(200);
    expect(res._json.ok).toBe(true);
    expect(res._json.orderId).toBe("ORD-001");
    expect(res._json.message).toMatch(/quote/i);
  });

  it("treats 'quote-request' utr as a quote", async () => {
    const res = makeRes();
    await handler(makeReq("POST", { orderId: "ORD-002", utr: "quote-request" }), res);
    expect(res.statusCode).toBe(200);
    expect(res._json.message).toMatch(/quote/i);
  });
});

describe("upi-payment — UTR submission", () => {
  it("records payment when utr is a real value", async () => {
    const res = makeRes();
    await handler(makeReq("POST", { orderId: "ORD-003", utr: "UTR123456789" }), res);
    expect(res.statusCode).toBe(200);
    expect(res._json.ok).toBe(true);
    expect(res._json.message).toMatch(/payment/i);
  });
});
