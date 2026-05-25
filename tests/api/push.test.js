"use strict";

process.env.NODE_ENV = "test";
process.env.LIVE_CLASS_TOKEN  = "teacher-secret";
process.env.VAPID_PUBLIC_KEY  = "fake-pub-key";
process.env.VAPID_PRIVATE_KEY = "fake-priv-key";
process.env.VAPID_SUBJECT     = "mailto:test@example.com";

jest.mock("web-push", () => ({
  setVapidDetails:  jest.fn(),
  sendNotification: jest.fn().mockResolvedValue({ statusCode: 201 }),
}));

jest.mock("pg", () => {
  const query = jest.fn();
  const Pool  = jest.fn(() => ({ query, on: jest.fn() }));
  Pool._query = query;
  return { Pool };
});

const { Pool }    = require("pg");
const mockQuery   = Pool._query;
const webpush     = require("web-push");
const handler     = require("../../api/push");

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

function makeReq(method, body = {}, auth = "") {
  return {
    method,
    body,
    headers: {
      origin: "https://kingofyadav.in",
      authorization: auth ? `Bearer ${auth}` : "",
    },
  };
}

beforeEach(() => {
  mockQuery.mockReset();
  webpush.sendNotification.mockClear();
});

describe("push handler — routing", () => {
  it("returns 204 for OPTIONS preflight", async () => {
    const res = makeRes();
    await handler(makeReq("OPTIONS"), res);
    expect(res.statusCode).toBe(204);
  });

  it("GET returns publicKey", async () => {
    const res = makeRes();
    await handler(makeReq("GET"), res);
    expect(res.statusCode).toBe(200);
    expect(res._json.ok).toBe(true);
    expect(res._json.publicKey).toBe("fake-pub-key");
  });
});

describe("push handler — subscribe", () => {
  it("stores a valid subscription", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = makeRes();
    await handler(makeReq("POST", {
      action:   "subscribe",
      endpoint: "https://fcm.example.com/sub/123",
      keys:     { p256dh: "p256key", auth: "authkey" },
      deviceId: "device-abc",
    }), res);
    expect(res.statusCode).toBe(200);
    expect(res._json.ok).toBe(true);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it("returns 400 when endpoint is missing", async () => {
    const res = makeRes();
    await handler(makeReq("POST", { action: "subscribe", keys: { p256dh: "k", auth: "a" } }), res);
    expect(res.statusCode).toBe(400);
    expect(res._json.ok).toBe(false);
  });

  it("returns 400 when keys are missing", async () => {
    const res = makeRes();
    await handler(makeReq("POST", { action: "subscribe", endpoint: "https://fcm.example.com/x" }), res);
    expect(res.statusCode).toBe(400);
  });
});

describe("push handler — notify", () => {
  it("returns 401 when teacher token is wrong", async () => {
    const res = makeRes();
    await handler(makeReq("POST", { action: "notify" }, "wrong-token"), res);
    expect(res.statusCode).toBe(401);
    expect(res._json.ok).toBe(false);
  });

  it("sends notifications to all subscribers", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { endpoint: "https://fcm.example.com/1", p256dh: "k1", auth: "a1" },
        { endpoint: "https://fcm.example.com/2", p256dh: "k2", auth: "a2" },
      ],
    });
    const res = makeRes();
    await handler(makeReq("POST", { action: "notify", title: "Class Now!" }, "teacher-secret"), res);
    expect(res.statusCode).toBe(200);
    expect(res._json.ok).toBe(true);
    expect(res._json.sent).toBe(2);
    expect(res._json.failed).toBe(0);
  });

  it("counts failed sends and cleans up 410 Gone subscriptions", async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ endpoint: "https://fcm.example.com/dead", p256dh: "k", auth: "a" }],
      })
      .mockResolvedValueOnce({ rows: [] }); // DELETE stale sub

    const err410 = Object.assign(new Error("Gone"), { statusCode: 410 });
    webpush.sendNotification.mockRejectedValueOnce(err410);

    const res = makeRes();
    await handler(makeReq("POST", { action: "notify" }, "teacher-secret"), res);
    expect(res._json.sent).toBe(0);
    expect(res._json.failed).toBe(1);
    expect(mockQuery).toHaveBeenCalledTimes(2); // SELECT + DELETE
  });
});

describe("push handler — unsubscribe", () => {
  it("DELETE removes the subscription by endpoint", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = makeRes();
    await handler(makeReq("DELETE", { endpoint: "https://fcm.example.com/1" }), res);
    expect(res.statusCode).toBe(200);
    expect(res._json.ok).toBe(true);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it("DELETE with no endpoint still returns ok", async () => {
    const res = makeRes();
    await handler(makeReq("DELETE", {}), res);
    expect(res.statusCode).toBe(200);
  });
});

describe("push handler — unknown action", () => {
  it("returns 400 for POST with unknown action", async () => {
    const res = makeRes();
    await handler(makeReq("POST", { action: "mystery" }), res);
    expect(res.statusCode).toBe(400);
  });
});
