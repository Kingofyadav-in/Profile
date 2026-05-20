"use strict";

// ── Rate Limiter ───────────────────────────────────────────────────────────────
// Default store is in-memory (resets on cold start — acceptable for Vercel
// single-instance use). To persist across instances, swap _store for an
// Upstash Redis client with the same get/set interface:
//
//   const { Redis } = require("@upstash/redis");
//   const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL,
//                             token: process.env.UPSTASH_REDIS_REST_TOKEN });
//   const _store = {
//     async get(k) { return redis.get(k); },
//     async set(k, v, ttlMs) { redis.set(k, v, { px: ttlMs }); },
//   };
//
// IPs are SHA-256 hashed before storage for privacy.

const { createHash } = require("crypto");

// ── In-memory store with bounded size ─────────────────────────────────────────

const _map = new Map();
const _MAX_STORE_SIZE = 50_000;

function _pruneIfNeeded() {
  if (_map.size < _MAX_STORE_SIZE) return;
  const now = Date.now();
  for (const [k, v] of _map) {
    if (now >= v.resetAt) _map.delete(k);
  }
  if (_map.size >= _MAX_STORE_SIZE) {
    let toPrune = Math.floor(_MAX_STORE_SIZE * 0.2);
    for (const k of _map.keys()) {
      if (toPrune-- <= 0) break;
      _map.delete(k);
    }
  }
}

const _store = {
  get(key) {
    const e = _map.get(key);
    if (!e || Date.now() >= e.resetAt) return null;
    return e;
  },
  set(key, value) {
    _pruneIfNeeded();
    _map.set(key, value);
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function hashIp(ip) {
  return createHash("sha256").update(String(ip)).digest("hex").slice(0, 32);
}

function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (xff) return String(xff).split(",")[0].trim();
  return String(req.socket?.remoteAddress || "unknown");
}

function check(key, max, windowMs) {
  const now = Date.now();
  const entry = _store.get(key);
  if (!entry) {
    _store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  _store.set(key, entry);
  return true;
}

// ── Middleware factory ────────────────────────────────────────────────────────

/**
 * Returns a Vercel-compatible middleware that enforces rate limiting.
 * @param {object} opts
 * @param {number} opts.max       Max requests per window
 * @param {number} opts.windowMs  Window length in milliseconds
 * @param {Function} [opts.keyFn] Custom key fn(req, ip) → string
 *
 * Usage:  if (!limit(req, res)) return;
 */
function rateLimit({ max = 20, windowMs = 60_000, keyFn = null } = {}) {
  return function limit(req, res) {
    const ip = getClientIp(req);
    const rawKey = keyFn ? keyFn(req, ip) : ip;
    const key = hashIp(rawKey);
    if (check(key, max, windowMs)) return true;

    const retryAfter = Math.ceil(windowMs / 1000);
    res.setHeader("Retry-After", String(retryAfter));
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", "0");
    res.setHeader("X-RateLimit-Reset", String(Math.ceil((Date.now() + windowMs) / 1000)));
    res.statusCode = 429;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, error: "Too many requests — please slow down.", code: "RATE_LIMITED" }));
    return false;
  };
}

// ── Pre-built limiters ────────────────────────────────────────────────────────

const chat   = rateLimit({ max: 30,  windowMs: 60_000  }); // 30/min per IP
const auth   = rateLimit({ max: 5,   windowMs: 60_000  }); // 5 OTP attempts/min
const upload = rateLimit({ max: 10,  windowMs: 60_000  }); // 10 upload/min
const strict = rateLimit({ max: 5,   windowMs: 300_000 }); // 5/5 min (payments)

module.exports = { rateLimit, check, hashIp, getClientIp, chat, auth, upload, strict };
