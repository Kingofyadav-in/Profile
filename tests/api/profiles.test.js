"use strict";

const fs   = require("fs");
const path = require("path");

jest.mock("fs");

const handler = require("../../api/profiles/[slug]");

const PROFILES_DIR = path.resolve(process.cwd(), "data", "profiles");

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

function makeReq(method = "GET", slug = null) {
  return {
    method,
    query: slug ? { slug } : {},
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("profiles handler — routing", () => {
  it("returns 405 for POST", async () => {
    const res = makeRes();
    await handler(makeReq("POST", "amit"), res);
    expect(res.statusCode).toBe(405);
  });

  it("returns 405 for DELETE", async () => {
    const res = makeRes();
    await handler(makeReq("DELETE", "amit"), res);
    expect(res.statusCode).toBe(405);
  });
});

describe("profiles handler — slug validation", () => {
  it("returns 400 for slug that is too short", async () => {
    const res = makeRes();
    await handler(makeReq("GET", "x"), res);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res._body).error).toMatch(/invalid|slug/i);
  });

  it("returns 400 for slug that is too long (> 48 chars)", async () => {
    const res = makeRes();
    await handler(makeReq("GET", "a".repeat(49)), res);
    expect(res.statusCode).toBe(400);
  });

  it("sanitises path-traversal attempts and returns 404 (file not found)", async () => {
    fs.promises = {
      realpath: jest.fn().mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" })),
      readFile: jest.fn(),
    };
    const res = makeRes();
    await handler(makeReq("GET", "../../../etc/passwd"), res);
    // slug is sanitised to "etcpasswd" — valid pattern but file doesn't exist
    expect(res.statusCode).toBe(404);
  });
});

describe("profiles handler — file serving", () => {
  it("returns 200 with profile JSON for valid slug", async () => {
    const filePath = path.resolve(PROFILES_DIR, "amit.json");
    fs.promises = {
      realpath: jest.fn().mockResolvedValue(filePath),
      readFile: jest.fn().mockResolvedValue('{"name":"Amit"}'),
    };
    const res = makeRes();
    await handler(makeReq("GET", "amit"), res);
    expect(res.statusCode).toBe(200);
    expect(res._body).toBe('{"name":"Amit"}');
  });

  it("uses slug 'amit' as default when no query slug provided", async () => {
    const filePath = path.resolve(PROFILES_DIR, "amit.json");
    fs.promises = {
      realpath: jest.fn().mockResolvedValue(filePath),
      readFile: jest.fn().mockResolvedValue('{"name":"Amit"}'),
    };
    const res = makeRes();
    await handler({ method: "GET", query: {} }, res);
    expect(res.statusCode).toBe(200);
  });

  it("returns 404 when profile file does not exist", async () => {
    fs.promises = {
      realpath: jest.fn().mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" })),
      readFile: jest.fn(),
    };
    const res = makeRes();
    await handler(makeReq("GET", "nonexistent"), res);
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res._body).error).toMatch(/not found/i);
  });

  it("returns 404 when realpath escapes PROFILES_DIR (symlink guard)", async () => {
    fs.promises = {
      realpath: jest.fn().mockResolvedValue("/etc/passwd"),
      readFile: jest.fn(),
    };
    const res = makeRes();
    await handler(makeReq("GET", "amit"), res);
    expect(res.statusCode).toBe(404);
  });
});
