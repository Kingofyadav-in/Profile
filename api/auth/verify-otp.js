"use strict";

const { proxyJson, getUpstreamBase } = require("./_proxy");

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.end(JSON.stringify(payload));
}

module.exports = async function handler(req, res) {
  res.setHeader("Allow", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    send(res, 405, { ok: false, error: "Method not allowed" });
    return;
  }

  const body = req.body || {};
  if (!body.phone && !body.mobile) {
    send(res, 400, { ok: false, error: "Enter a valid Indian mobile number." });
    return;
  }
  if (!body.otp) {
    send(res, 400, { ok: false, error: "Enter the OTP code." });
    return;
  }

  try {
    await proxyJson(req, res, "/auth/verify-otp", body);
  } catch (err) {
    send(res, 502, {
      ok: false,
      error: `OTP service unavailable. Configure OTP_API_BASE for ${getUpstreamBase()}.`
    });
  }
};
