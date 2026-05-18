"use strict";

/* ============================================================
   hi-detect.js — Repost Detector UI
   Depends on: hi-watermark.js, hi-api.js (for API_BASE / hiApiFetch)
   ============================================================ */

const HiDetect = (() => {

  const API_BASE = "/api/hi";

  function _apiFetch(path, opts = {}) {
    const key = typeof hiGetApiKey === "function" ? hiGetApiKey() : (localStorage.getItem("hi_api_key") || "");
    return fetch(API_BASE + path, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
        ...(opts.headers || {}),
      },
    }).then(r => r.json());
  }

  // ── Detector ─────────────────────────────────────────────────

  async function detectFile(file, onProgress) {
    const result = { phash: null, watermark: null, matches: [], checked: 0, method: [] };

    onProgress?.("Computing fingerprint…");

    // 1. Watermark check (images only)
    const wm = await HiWatermark.detectWatermark(file).catch(() => null);
    if (wm) {
      result.watermark = wm;
      result.method.push("watermark");
    }

    // 2. pHash
    result.phash = await HiWatermark.computePHash(file);

    onProgress?.("Checking against protected content database…");

    // 3. Server comparison (public endpoint — no auth needed)
    const resp = await fetch(API_BASE + "/detect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phash: result.phash, watermark: result.watermark }),
    }).then(r => r.json()).catch(() => ({ ok: false, matches: [] }));

    if (resp.ok) {
      result.matches  = resp.matches  || [];
      result.checked  = resp.checked  || 0;
      result.method.push("phash");
    }

    return result;
  }

  // ── Report repost ─────────────────────────────────────────────

  async function reportRepost({ infringing_url, license_id, platform, phash, reporter_note }) {
    return _apiFetch("/report", {
      method: "POST",
      body: JSON.stringify({ infringing_url, license_id, platform, phash, reporter_note }),
    });
  }

  // ── Alerts ───────────────────────────────────────────────────

  async function getAlerts() {
    return _apiFetch("/alerts");
  }

  async function updateAlertStatus(id, status) {
    return _apiFetch(`/alerts?id=${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  }

  async function deleteAlert(id) {
    return _apiFetch(`/alerts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  // ── Social verify ─────────────────────────────────────────────

  async function addSocialAccount({ platform, profile_url }) {
    return _apiFetch("/social-verify", {
      method: "POST",
      body: JSON.stringify({ platform, profile_url }),
    });
  }

  async function getSocialVerifications() {
    return _apiFetch("/social-verify");
  }

  async function checkSocialVerification(id) {
    return _apiFetch(`/social-verify?id=${encodeURIComponent(id)}&action=check`, {
      method: "PUT",
    });
  }

  async function deleteSocialVerification(id) {
    return _apiFetch(`/social-verify?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  return {
    detectFile,
    reportRepost,
    getAlerts,
    updateAlertStatus,
    deleteAlert,
    addSocialAccount,
    getSocialVerifications,
    checkSocialVerification,
    deleteSocialVerification,
  };
})();
