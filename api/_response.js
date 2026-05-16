"use strict";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function send(res, status, payload, extra = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  for (const [k, v] of Object.entries(extra)) res.setHeader(k, v);
  res.end(JSON.stringify(payload));
}

function ok(res, data, status = 200, extra = {}) {
  send(res, status, { ok: true, data }, extra);
}

function created(res, data) {
  send(res, 201, { ok: true, data });
}

function error(res, status, message, code = null) {
  const payload = { ok: false, error: message };
  if (code) payload.code = code;
  send(res, status, payload);
}

function badRequest(res, message = "Bad request") {
  error(res, 400, message, "BAD_REQUEST");
}

function unauthorized(res, message = "Unauthorized") {
  error(res, 401, message, "UNAUTHORIZED");
}

function forbidden(res, message = "Forbidden") {
  error(res, 403, message, "FORBIDDEN");
}

function notFound(res, message = "Not found") {
  error(res, 404, message, "NOT_FOUND");
}

function methodNotAllowed(res, allow = "POST, OPTIONS") {
  res.setHeader("Allow", allow);
  error(res, 405, "Method not allowed", "METHOD_NOT_ALLOWED");
}

function tooManyRequests(res, retryAfter = 60) {
  res.setHeader("Retry-After", String(retryAfter));
  error(res, 429, "Too many requests — please slow down", "RATE_LIMITED");
}

function serverError(res, err = null) {
  const msg = process.env.NODE_ENV === "development" && err
    ? String(err.message || err)
    : "Internal server error";
  error(res, 500, msg, "INTERNAL_ERROR");
}

function preflight(res, allow = "POST, OPTIONS") {
  res.setHeader("Allow", allow);
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  res.statusCode = 204;
  res.end();
}

module.exports = {
  send, ok, created, error,
  badRequest, unauthorized, forbidden, notFound,
  methodNotAllowed, tooManyRequests, serverError, preflight,
  CORS_HEADERS,
};
