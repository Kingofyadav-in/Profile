"use strict";

global.fetch = jest.fn();

// Each describe resets modules so env changes take effect cleanly
describe("_proxy — getUpstreamBase", () => {
  const OLD = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD };
    delete process.env.OTP_API_BASE;
    delete process.env.AUTH_API_BASE;
  });

  afterAll(() => { process.env = OLD; });

  it("falls back to localhost default when no env var is set", () => {
    const { getUpstreamBase } = require("../../api/auth/_proxy");
    expect(getUpstreamBase()).toBe("http://127.0.0.1:5050/api");
  });

  it("uses OTP_API_BASE when set", () => {
    process.env.OTP_API_BASE = "https://otp.example.com/api";
    const { getUpstreamBase } = require("../../api/auth/_proxy");
    expect(getUpstreamBase()).toBe("https://otp.example.com/api");
  });

  it("falls back to AUTH_API_BASE when OTP_API_BASE is absent", () => {
    process.env.AUTH_API_BASE = "https://auth.example.com/api";
    const { getUpstreamBase } = require("../../api/auth/_proxy");
    expect(getUpstreamBase()).toBe("https://auth.example.com/api");
  });

  it("strips trailing slashes from env var", () => {
    process.env.OTP_API_BASE = "https://otp.example.com///";
    const { getUpstreamBase } = require("../../api/auth/_proxy");
    expect(getUpstreamBase()).toBe("https://otp.example.com");
  });

  it("OTP_API_BASE takes precedence over AUTH_API_BASE", () => {
    process.env.OTP_API_BASE  = "https://otp.example.com/api";
    process.env.AUTH_API_BASE = "https://auth.example.com/api";
    const { getUpstreamBase } = require("../../api/auth/_proxy");
    expect(getUpstreamBase()).toBe("https://otp.example.com/api");
  });
});

describe("_proxy — proxyJson", () => {
  const { proxyJson } = require("../../api/auth/_proxy");

  function makeRes() {
    const h = {};
    return {
      statusCode: 0,
      _body: "",
      setHeader(k, v) { h[k] = v; },
      end(b) { this._body = b || ""; },
      headers: h,
    };
  }

  beforeEach(() => { global.fetch.mockReset(); });

  it("forwards 200 status and JSON body from upstream", async () => {
    global.fetch.mockResolvedValueOnce({
      status: 200,
      text: async () => '{"ok":true}',
      headers: { get: () => "application/json; charset=utf-8" },
    });
    const res = makeRes();
    await proxyJson({}, res, "/auth/request-otp", { phone: "9876543210" });
    expect(res.statusCode).toBe(200);
    expect(res._body).toBe('{"ok":true}');
  });

  it("forwards non-200 upstream status codes", async () => {
    global.fetch.mockResolvedValueOnce({
      status: 429,
      text: async () => '{"ok":false,"error":"rate limited"}',
      headers: { get: () => "application/json" },
    });
    const res = makeRes();
    await proxyJson({}, res, "/auth/request-otp", {});
    expect(res.statusCode).toBe(429);
  });

  it("sets Cache-Control: no-store on response", async () => {
    const headers = {};
    global.fetch.mockResolvedValueOnce({
      status: 200,
      text: async () => "ok",
      headers: { get: () => null },
    });
    const res = {
      statusCode: 0, _body: "",
      setHeader(k, v) { headers[k] = v; },
      end(b) { this._body = b || ""; },
    };
    await proxyJson({}, res, "/any", {});
    expect(headers["Cache-Control"]).toBe("no-store, max-age=0");
  });

  it("falls back to application/json content-type when upstream header is absent", async () => {
    const headers = {};
    global.fetch.mockResolvedValueOnce({
      status: 200,
      text: async () => "ok",
      headers: { get: () => null },
    });
    const res = {
      statusCode: 0, _body: "",
      setHeader(k, v) { headers[k] = v; },
      end(b) { this._body = b || ""; },
    };
    await proxyJson({}, res, "/any", {});
    expect(headers["Content-Type"]).toMatch(/application\/json/);
  });
});
