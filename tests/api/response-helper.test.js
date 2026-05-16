"use strict";

const r = require("../../api/_response");

function makeRes() {
  const headers = {};
  return {
    statusCode: 200,
    _body: "",
    setHeader(k, v) { headers[k] = v; },
    end(b) { this._body = b || ""; },
    headers,
  };
}

describe("_response helpers", () => {
  it("ok() sets 200 with ok:true", () => {
    const res = makeRes();
    r.ok(res, { name: "Amit" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res._body);
    expect(body.ok).toBe(true);
    expect(body.data.name).toBe("Amit");
  });

  it("created() sets 201", () => {
    const res = makeRes();
    r.created(res, { id: 1 });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res._body).ok).toBe(true);
  });

  it("badRequest() sets 400 with code", () => {
    const res = makeRes();
    r.badRequest(res, "Missing field");
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res._body);
    expect(body.ok).toBe(false);
    expect(body.code).toBe("BAD_REQUEST");
  });

  it("unauthorized() sets 401", () => {
    const res = makeRes();
    r.unauthorized(res);
    expect(res.statusCode).toBe(401);
  });

  it("notFound() sets 404", () => {
    const res = makeRes();
    r.notFound(res, "Resource missing");
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res._body).code).toBe("NOT_FOUND");
  });

  it("tooManyRequests() sets 429 and Retry-After header", () => {
    const res = makeRes();
    r.tooManyRequests(res, 30);
    expect(res.statusCode).toBe(429);
    expect(res.headers["Retry-After"]).toBe("30");
  });

  it("preflight() sets 204 with CORS headers", () => {
    const res = makeRes();
    r.preflight(res);
    expect(res.statusCode).toBe(204);
    expect(res.headers["Access-Control-Allow-Origin"]).toBe("*");
  });
});
