"use strict";

const DEFAULT_LOCAL_API_BASE = "http://127.0.0.1:5050/api";

function getUpstreamBase() {
  const raw = String(process.env.OTP_API_BASE || process.env.AUTH_API_BASE || DEFAULT_LOCAL_API_BASE).trim();
  return raw.replace(/\/+$/, "");
}

async function proxyJson(req, res, pathSuffix, body) {
  const base = getUpstreamBase();
  const response = await fetch(`${base}${pathSuffix}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body || {}),
    signal: AbortSignal.timeout(15_000)
  });

  const text = await response.text();
  res.statusCode = response.status;
  res.setHeader("Content-Type", response.headers.get("content-type") || "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.end(text);
}

module.exports = {
  getUpstreamBase,
  proxyJson
};
