"use strict";

const { rateLimit, check } = require("../../api/_rate-limit");

describe("rate limiter", () => {
  it("allows requests under the limit", () => {
    for (let i = 0; i < 5; i++) {
      expect(check(`test-key-${Math.random()}`, 10, 60_000)).toBe(true);
    }
  });

  it("blocks after limit is exceeded", () => {
    const key = `limit-test-${Date.now()}`;
    for (let i = 0; i < 3; i++) check(key, 3, 60_000);
    expect(check(key, 3, 60_000)).toBe(false);
  });

  it("resets after window expires", async () => {
    const key = `window-test-${Date.now()}`;
    for (let i = 0; i < 2; i++) check(key, 2, 1); // 1ms window
    await new Promise(r => setTimeout(r, 5));
    expect(check(key, 2, 1)).toBe(true); // window expired
  });

  it("middleware returns false and sets 429 when over limit", () => {
    const limit = rateLimit({ max: 1, windowMs: 60_000 });
    const headers = {};
    const res = {
      statusCode: 200,
      _body: "",
      setHeader(k, v) { headers[k] = v; },
      end(b) { this._body = b; },
    };
    const ip = `mw-test-${Date.now()}`;
    const req = { headers: { "x-forwarded-for": ip }, socket: {} };

    expect(limit(req, res)).toBe(true);  // first request allowed
    expect(limit(req, res)).toBe(false); // second blocked
    expect(res.statusCode).toBe(429);
    expect(headers["Retry-After"]).toBeTruthy();
    const body = JSON.parse(res._body);
    expect(body.code).toBe("RATE_LIMITED");
  });
});
