"use strict";

const handler = require("../../api/jarvis-chat");

function makeRes() {
  const headers = {};
  const res = {
    statusCode: 200,
    _body: "",
    setHeader(k, v) { headers[k] = v; },
    end(body) { this._body = body || ""; },
    headers,
  };
  return res;
}

function makeReq(method, body) {
  const raw = JSON.stringify(body);
  const req = {
    method,
    headers: { "content-type": "application/json", "host": "kingofyadav.in" },
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

describe("jarvis-chat handler", () => {
  it("returns 204 for OPTIONS (CORS preflight)", async () => {
    const req = { method: "OPTIONS", headers: {}, socket: {} };
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(204);
  });

  it("returns 405 for GET", async () => {
    const req = { method: "GET", headers: { host: "kingofyadav.in" }, socket: { remoteAddress: "127.0.0.2" } };
    req.on = () => req;
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });

  it("returns 400 when message is missing", async () => {
    const req = makeReq("POST", {});
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res._body);
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/message/i);
  });

  it("returns fallback reply for known topic", async () => {
    const req = makeReq("POST", { message: "who is amit" });
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res._body);
    expect(body.ok).toBe(true);
    expect(body.mode).toBe("fallback");
    expect(typeof body.reply).toBe("string");
    expect(body.reply.length).toBeGreaterThan(10);
  });

  it("returns a default reply for unknown topic", async () => {
    const req = makeReq("POST", { message: "qzzxqwerty unknown topic zz" });
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res._body);
    expect(body.ok).toBe(true);
    expect(typeof body.reply).toBe("string");
  });

  it("includes content-type header in response", async () => {
    const req = makeReq("POST", { message: "services" });
    const res = makeRes();
    await handler(req, res);
    expect(res.headers["Content-Type"]).toMatch(/application\/json/);
  });
});
