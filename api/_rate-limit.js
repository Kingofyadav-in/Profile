"use strict";

// In-memory rate limiter — resets on cold start (Vercel serverless friendly).
// For persistent limiting across instances, replace _store with an upstash/redis client.

const _store = new Map(); // ip → { count, resetAt }

function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (xff) return String(xff).split(",")[0].trim();
  return String(req.socket?.remoteAddress || "unknown");
}

/**
 * Check rate limit. Returns true if the request is allowed, false if it should be blocked.
 * @param {string} key      - Partition key (e.g. ip, or ip+route)
 * @param {number} max      - Max requests per window
 * @param {number} windowMs - Window length in milliseconds
 */
function check(key, max, windowMs) {
  const now = Date.now();
  const entry = _store.get(key);

  if (!entry || now >= entry.resetAt) {
    _store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
}

/**
 * Returns a Vercel-compatible middleware that enforces rate limiting.
 * Usage:
 *   const limit = rateLimit({ max: 20, windowMs: 60_000 });
 *   // In handler:
 *   if (!limit(req, res)) return;
 */
function rateLimit({ max = 20, windowMs = 60_000, keyFn = null } = {}) {
  return function limit(req, res) {
    const ip = getClientIp(req);
    const key = keyFn ? keyFn(req, ip) : ip;
    if (check(key, max, windowMs)) return true;

    const retryAfter = Math.ceil(windowMs / 1000);
    res.setHeader("Retry-After", String(retryAfter));
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", "0");
    res.statusCode = 429;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, error: "Too many requests — please slow down.", code: "RATE_LIMITED" }));
    return false;
  };
}

// Pre-built limiters used across the API
const chat   = rateLimit({ max: 30,  windowMs: 60_000  }); // 30 req/min per IP
const auth   = rateLimit({ max: 5,   windowMs: 60_000  }); // 5 OTP attempts/min
const upload = rateLimit({ max: 10,  windowMs: 60_000  }); // 10 upload/min
const strict = rateLimit({ max: 5,   windowMs: 300_000 }); // 5 req/5 min (payment etc.)

module.exports = { rateLimit, check, getClientIp, chat, auth, upload, strict };
