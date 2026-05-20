"use strict";

/**
 * Structured request/error logger for all API routes.
 * Emits one JSON line per request to stdout — ingestible by Vercel logs,
 * Datadog, Sentry, or any log aggregator that reads stdout.
 *
 * @module api/_logger
 */

const crypto = require("crypto");

/**
 * Hash an IP for privacy-preserving logging (one-way, daily-rotated salt).
 * @param {string} ip
 * @returns {string} 8-char hex prefix
 */
function _hashIp(ip) {
  const salt = new Date().toISOString().slice(0, 10); // rotate daily
  return crypto
    .createHash("sha256")
    .update(salt + (ip || ""))
    .digest("hex")
    .slice(0, 8);
}

/**
 * Extract the real client IP from Vercel / Node headers.
 * @param {object} req
 * @returns {string}
 */
function _clientIp(req) {
  return (
    String(req.headers?.["x-forwarded-for"] || "").split(",")[0].trim() ||
    String(req.socket?.remoteAddress || "unknown")
  );
}

/**
 * Log a completed API request.
 * @param {object} req   - Node IncomingMessage
 * @param {number} status - HTTP status code
 * @param {number} ms    - elapsed milliseconds
 * @param {object} [extra] - optional extra fields
 */
function logRequest(req, status, ms, extra = {}) {
  const entry = {
    ts:     new Date().toISOString(),
    method: req.method,
    path:   req.url?.split("?")[0] ?? "/",
    status,
    ms:     Math.round(ms),
    ip:     _hashIp(_clientIp(req)),
    ua:     String(req.headers?.["user-agent"] || "").slice(0, 80),
    ...extra,
  };
  console.log(JSON.stringify(entry));
}

/**
 * Log an unexpected server error.
 * @param {Error}  err
 * @param {object} req
 * @param {object} [extra]
 */
function logError(err, req, extra = {}) {
  const entry = {
    ts:      new Date().toISOString(),
    level:   "error",
    method:  req?.method ?? "UNKNOWN",
    path:    req?.url?.split("?")[0] ?? "/",
    message: err?.message ?? String(err),
    stack:   err?.stack?.split("\n").slice(0, 4).join(" "),
    ip:      _hashIp(_clientIp(req)),
    ...extra,
  };
  console.error(JSON.stringify(entry));
}

/**
 * Higher-order wrapper — times the handler and logs on completion.
 * @param {Function} handler  async (req, res) => void
 * @returns {Function}
 */
function withLogging(handler) {
  return async function logged(req, res) {
    const start = Date.now();
    const origEnd = res.end.bind(res);
    res.end = function (...args) {
      logRequest(req, res.statusCode ?? 200, Date.now() - start);
      return origEnd(...args);
    };
    try {
      await handler(req, res);
    } catch (err) {
      logError(err, req);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ ok: false, error: "Internal server error" }));
      }
    }
  };
}

module.exports = { logRequest, logError, withLogging };
