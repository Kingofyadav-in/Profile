"use strict";

const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");

loadEnvFile(".env");
loadEnvFile(".env.local");

const PORT = Number(process.env.PORT || 5050);
const HOST = process.env.HOST || "0.0.0.0";
const MSG91_AUTHKEY = process.env.MSG91_AUTHKEY || "";
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID || "";
const AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET || "dev-only-change-this-secret";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const OTP_LENGTH = String(process.env.MSG91_OTP_LENGTH || "6");
const OTP_EXPIRY_MINUTES = String(process.env.MSG91_OTP_EXPIRY_MINUTES || "5");
const allowedOrigins = CORS_ORIGIN.split(",").map(origin => origin.trim()).filter(Boolean);

const attempts = new Map();

function loadEnvFile(name) {
  const file = path.join(process.cwd(), name);
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eq = trimmed.indexOf("=");
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  });
}

function json(res, status, payload) {
  const origin = String(res.req && res.req.headers && res.req.headers.origin || "");
  const allowOrigin = allowedOrigins.includes("*") || !allowedOrigins.length
    ? "*"
    : (allowedOrigins.includes(origin) ? origin : allowedOrigins[0]);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": allowOrigin === "*" ? "Origin" : "Origin, Access-Control-Request-Method, Access-Control-Request-Headers",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try { resolve(JSON.parse(body)); }
      catch { reject(new Error("Invalid JSON body")); }
    });
    req.on("error", reject);
  });
}

function normalizeIndianMobile(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 10) digits = "91" + digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return "";
}

function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const data = attempts.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > data.resetAt) {
    data.count = 0;
    data.resetAt = now + windowMs;
  }
  data.count += 1;
  attempts.set(key, data);
  return data.count <= max;
}

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function signToken(payload) {
  const header = { alg: "HS256", typ: "JWT" };
  const body = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(body))}`;
  const sig = crypto.createHmac("sha256", AUTH_JWT_SECRET).update(unsigned).digest("base64url");
  return `${unsigned}.${sig}`;
}

function validateStartupConfig() {
  const warnings = [];
  if (!MSG91_AUTHKEY || MSG91_AUTHKEY === "your_msg91_authkey") {
    warnings.push("MSG91_AUTHKEY is missing or still a placeholder.");
  }
  if (!MSG91_TEMPLATE_ID || MSG91_TEMPLATE_ID === "your_msg91_otp_template_id") {
    warnings.push("MSG91_TEMPLATE_ID is missing or still a placeholder.");
  }
  if (!AUTH_JWT_SECRET || AUTH_JWT_SECRET === "dev-only-change-this-secret") {
    warnings.push("AUTH_JWT_SECRET is missing or using the default development secret.");
  }
  if (warnings.length) {
    console.warn("[otp-api] configuration warnings:");
    warnings.forEach(msg => console.warn(`[otp-api] ${msg}`));
  }
}

async function msg91SendOtp(mobile) {
  const url = new URL("https://control.msg91.com/api/v5/otp");
  url.searchParams.set("template_id", MSG91_TEMPLATE_ID);
  url.searchParams.set("mobile", mobile);
  url.searchParams.set("otp_length", OTP_LENGTH);
  url.searchParams.set("otp_expiry", OTP_EXPIRY_MINUTES);
  url.searchParams.set("authkey", MSG91_AUTHKEY);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "authkey": MSG91_AUTHKEY
    },
    body: "{}"
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok && data.type !== "error", status: response.status, data };
}

async function msg91VerifyOtp(mobile, otp) {
  const url = new URL("https://control.msg91.com/api/v5/otp/verify");
  url.searchParams.set("mobile", mobile);
  url.searchParams.set("otp", otp);
  url.searchParams.set("authkey", MSG91_AUTHKEY);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "accept": "application/json",
      "authkey": MSG91_AUTHKEY
    }
  });
  const data = await response.json().catch(() => ({}));
  const message = String(data.message || "").toLowerCase();
  return {
    ok: response.ok && data.type !== "error" && message.includes("verified"),
    status: response.status,
    data
  };
}

async function handleRequest(req, res) {
  if (req.method === "OPTIONS") return json(res, 204, {});

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (req.method === "GET" && url.pathname === "/api/health") {
    return json(res, 200, { ok: true, service: "otp-api" });
  }

  if (req.method !== "POST") {
    return json(res, 405, { ok: false, error: "Method not allowed" });
  }

  if (!MSG91_AUTHKEY || !MSG91_TEMPLATE_ID) {
    return json(res, 500, {
      ok: false,
      error: "MSG91 is not configured. Set MSG91_AUTHKEY and MSG91_TEMPLATE_ID."
    });
  }

  let body;
  try { body = await readBody(req); }
  catch (err) { return json(res, 400, { ok: false, error: err.message }); }

  const mobile = normalizeIndianMobile(body.phone || body.mobile);
  if (!mobile) {
    return json(res, 400, { ok: false, error: "Enter a valid Indian mobile number." });
  }

  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "local";

  if (url.pathname === "/api/auth/request-otp") {
    if (!rateLimit(`send:${ip}:${mobile}`, 5, 15 * 60 * 1000)) {
      return json(res, 429, { ok: false, error: "Too many OTP requests. Try again later." });
    }
    const result = await msg91SendOtp(mobile);
    if (!result.ok) {
      return json(res, 502, { ok: false, error: result.data.message || "Failed to send OTP." });
    }
    return json(res, 200, { ok: true, phone: mobile, message: "OTP sent." });
  }

  if (url.pathname === "/api/auth/verify-otp") {
    const otp = String(body.otp || "").trim();
    if (!/^\d{4,9}$/.test(otp)) {
      return json(res, 400, { ok: false, error: "Enter the OTP code." });
    }
    if (!rateLimit(`verify:${ip}:${mobile}`, 8, 15 * 60 * 1000)) {
      return json(res, 429, { ok: false, error: "Too many verification attempts. Try again later." });
    }
    const result = await msg91VerifyOtp(mobile, otp);
    if (!result.ok) {
      return json(res, 401, { ok: false, error: result.data.message || "Invalid OTP." });
    }
    const token = signToken({ sub: mobile, phone: mobile, provider: "msg91" });
    return json(res, 200, { ok: true, token, user: { phone: mobile, provider: "msg91" } });
  }

  return json(res, 404, { ok: false, error: "Not found" });
}

http.createServer((req, res) => {
  handleRequest(req, res).catch(err => {
    console.error("[otp-api]", err);
    json(res, 500, { ok: false, error: "Internal server error" });
  });
}).listen(PORT, HOST, () => {
  validateStartupConfig();
  console.log(`OTP API listening on http://${HOST}:${PORT}/api`);
});
