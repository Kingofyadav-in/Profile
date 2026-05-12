"use strict";

/* ======================================================
   AUTH.JS — Client-Side Auth for Personal Section
   • PBKDF2-SHA-256 for new accounts via Web Crypto
   • Legacy SHA-256 / fallback hash support for existing accounts
   • Local admin account stored in localStorage (ak_users)
   • Token in sessionStorage (session) or localStorage (remember me)
====================================================== */

const AUTH_USERS_KEY  = "ak_users";
const AUTH_TOKEN_KEY  = "ak_auth_token";
const SESSION_EXP_MS  = 24 * 60 * 60 * 1000;        // 24 h
const REMEMBER_EXP_MS = 10 * 365 * 24 * 60 * 60 * 1000; // local one-time setup
const RATE_LIMIT_KEY  = "ak_login_attempts";
const DEVICE_ID_KEY   = "ak_device_id";
const MAX_ATTEMPTS    = 5;
const LOCKOUT_MS      = 15 * 60 * 1000;              // 15 min
const HASH_VERSION    = "pbkdf2-sha256";
const PBKDF2_ROUNDS   = 120000;
const AUTH_API_BASE_KEY = "ak_auth_api_base";
const DEFAULT_LOCAL_AUTH_API_BASE = "http://127.0.0.1:5050/api";
const DEFAULT_PROD_AUTH_API_BASE = "/api";

/* ======================================================
   HASH — SHA-256 with fallback for non-secure contexts
====================================================== */

async function hashPassword(password) {
  if (window.crypto && window.crypto.subtle) {
    try {
      const enc = new TextEncoder();
      const buf = await window.crypto.subtle.digest("SHA-256", enc.encode(password));
      return Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
    } catch { /* fall through to simple hash */ }
  }
  /* Fallback: cyrb53 double-hash for non-secure HTTP contexts */
  return cyrb53(password);
}

function makeSalt() {
  if (window.crypto && window.crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  }
  return cyrb53(String(Date.now()) + Math.random());
}

async function hashPasswordAdvanced(password, salt) {
  if (window.crypto && window.crypto.subtle && window.TextEncoder) {
    try {
      const enc = new TextEncoder();
      const key = await window.crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        "PBKDF2",
        false,
        ["deriveBits"]
      );
      const bits = await window.crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          salt: enc.encode(salt),
          iterations: PBKDF2_ROUNDS,
          hash: "SHA-256"
        },
        key,
        256
      );
      return Array.from(new Uint8Array(bits))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
    } catch { /* fall through to deterministic fallback */ }
  }
  return cyrb53(salt + ":" + password);
}

async function verifyPassword(user, password) {
  if (user.hashVersion === HASH_VERSION && user.passwordSalt) {
    return await hashPasswordAdvanced(password, user.passwordSalt) === user.passwordHash;
  }
  return await hashPassword(password) === user.passwordHash;
}

function cyrb53(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
       Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
       Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hi = (h2 >>> 0).toString(16).padStart(8, "0");
  const lo = (h1 >>> 0).toString(16).padStart(8, "0");
  return hi + lo + str.length.toString(16);
}

function isLocalHost() {
  if (typeof window === "undefined" || !window.location) return false;
  return /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(window.location.hostname || "");
}

function normalizeApiBase(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";

  if (/^\/[^/]/.test(value) || value === "/api") {
    return value.replace(/\/+$/, "");
  }

  try {
    const parsed = new URL(value, window.location.origin);
    if (!isLocalHost() && /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(parsed.hostname)) {
      return "";
    }
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return "";
  }
}

/* ======================================================
   RATE LIMITING
====================================================== */

function checkRateLimit() {
  try {
    const raw = sessionStorage.getItem(RATE_LIMIT_KEY);
    if (!raw) return { blocked: false };
    const data = JSON.parse(raw);
    if (Date.now() > data.resetAt) {
      sessionStorage.removeItem(RATE_LIMIT_KEY);
      return { blocked: false };
    }
    return { blocked: data.attempts >= MAX_ATTEMPTS };
  } catch { return { blocked: false }; }
}

function recordFailedAttempt() {
  try {
    const raw = sessionStorage.getItem(RATE_LIMIT_KEY);
    const data = raw ? JSON.parse(raw) : { attempts: 0, resetAt: Date.now() + LOCKOUT_MS };
    data.attempts++;
    if (Date.now() > data.resetAt) data.resetAt = Date.now() + LOCKOUT_MS;
    sessionStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data));
  } catch {}
}

function clearRateLimit() {
  try { sessionStorage.removeItem(RATE_LIMIT_KEY); } catch {}
}

function getDeviceId() {
  try {
    var existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    var generated = "dev_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(DEVICE_ID_KEY, generated);
    return generated;
  } catch (e) {
    return "dev_" + Date.now().toString(36);
  }
}

async function syncLocalAdminUser(user, action) {
  try {
    if (!user || !user.username || !user.passwordHash) return;
    var deviceId = user.deviceId || getDeviceId();
    var payload = {
      username: user.username,
      passwordHash: user.passwordHash,
      passwordSalt: user.passwordSalt || "",
      hashVersion: user.hashVersion || "legacy",
      action: action || "signup",
      source: "web",
      page: window.location.pathname,
      deviceId: deviceId,
      userAgent: navigator.userAgent || ""
    };
    await fetch("/api/local-admin-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true
    });
  } catch (e) {}
}

/* ======================================================
   TOKEN HELPERS
====================================================== */

function saveToken(username, remember) {
  const token = JSON.stringify({
    username,
    exp: Date.now() + (remember ? REMEMBER_EXP_MS : SESSION_EXP_MS)
  });
  try {
    if (remember) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      sessionStorage.setItem(AUTH_TOKEN_KEY, token);
    }
  } catch { /* storage blocked (private mode quota, etc.) */ }
}

function saveRemoteToken(user, apiToken) {
  const phone = user && user.phone ? String(user.phone) : "";
  const token = JSON.stringify({
    username: phone ? "+" + phone : "otp-user",
    phone: phone,
    apiToken: apiToken || "",
    provider: "msg91",
    exp: Date.now() + SESSION_EXP_MS
  });
  try {
    sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {}
}

function getToken() {
  try {
    const raw =
      sessionStorage.getItem(AUTH_TOKEN_KEY) ||
      localStorage.getItem(AUTH_TOKEN_KEY);
    if (!raw) return null;
    const token = JSON.parse(raw);
    if (Date.now() > token.exp) {
      clearToken();
      return null;
    }
    return token;
  } catch {
    clearToken();
    return null;
  }
}

function clearToken() {
  try {
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {}
}

function resetLocalAdminState() {
  try {
    localStorage.removeItem(AUTH_USERS_KEY);
    sessionStorage.removeItem(AUTH_USERS_KEY);
    clearToken();
    clearRateLimit();
    return { ok: true };
  } catch (err) {
    console.error("[auth] reset error:", err);
    return { ok: false, error: "Reset failed. Please try again." };
  }
}

function getLocalUsersSnapshot() {
  try {
    const users = JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || "[]");
    return users.map(user => ({
      username: String(user.username || ""),
      createdAt: user.createdAt || 0,
      createdAtLabel: user.createdAt ? new Date(user.createdAt).toLocaleString() : "unknown",
      hashVersion: String(user.hashVersion || "legacy"),
      sessionKey: String(user.sessionKey || user.deviceId || "local"),
      passwordHashPreview: String(user.passwordHash || "").slice(0, 16) + (String(user.passwordHash || "").length > 16 ? "…" : ""),
      passwordHashLength: String(user.passwordHash || "").length,
      hasSalt: Boolean(user.passwordSalt)
    }));
  } catch {
    return [];
  }
}

/* ======================================================
   PUBLIC API
====================================================== */

function isAuthenticated() {
  return getToken() !== null;
}

function getAuthUser() {
  const token = getToken();
  return token ? token.username : null;
}

function getAuthApiBase() {
  try {
    const candidates = [
      window.HI_AUTH_API_BASE,
      localStorage.getItem(AUTH_API_BASE_KEY),
      isLocalHost() ? DEFAULT_LOCAL_AUTH_API_BASE : DEFAULT_PROD_AUTH_API_BASE
    ];

    for (const candidate of candidates) {
      const normalized = normalizeApiBase(candidate);
      if (normalized) return normalized;
    }

    return isLocalHost() ? DEFAULT_LOCAL_AUTH_API_BASE : DEFAULT_PROD_AUTH_API_BASE;
  } catch {
    return isLocalHost() ? DEFAULT_LOCAL_AUTH_API_BASE : DEFAULT_PROD_AUTH_API_BASE;
  }
}

async function authApi(path, payload) {
  let response;
  try {
    response = await fetch(getAuthApiBase() + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {})
    });
  } catch (err) {
    throw new Error("OTP service unavailable. Check the Railway proxy or OTP_API_BASE.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    throw new Error(data.error || data.message || "Authentication request failed.");
  }
  return data;
}

async function requestPhoneOtp(phone) {
  return authApi("/auth/request-otp", { phone: phone });
}

async function verifyPhoneOtp(phone, otp) {
  const data = await authApi("/auth/verify-otp", { phone: phone, otp: otp });
  saveRemoteToken(data.user || { phone: phone }, data.token || "");
  return data;
}

function hasAnyUser() {
  try {
    const users = JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || "[]");
    return users.length > 0;
  } catch {
    return false;
  }
}

async function signup(username, password) {
  try {
    username = username.trim().toLowerCase();
    if (!username || !password)  return { ok: false, error: "All fields are required." };
    if (username.length < 3)     return { ok: false, error: "Username must be at least 3 characters." };
    if (!/^[a-z0-9._-]+$/.test(username)) {
      return { ok: false, error: "Username can use letters, numbers, dot, dash, and underscore only." };
    }
    if (password.length < 8)     return { ok: false, error: "Password must be at least 8 characters." };

    const users = JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || "[]");
    if (users.length > 0) {
      return { ok: false, error: "A local admin account already exists on this device." };
    }

    if (users.find(u => u.username === username)) {
      return { ok: false, error: "That username is already taken." };
    }

    const passwordSalt = makeSalt();
    const passwordHash = await hashPasswordAdvanced(password, passwordSalt);
    users.push({
      username,
      passwordHash,
      passwordSalt,
      hashVersion: HASH_VERSION,
      createdAt: Date.now(),
      deviceId: getDeviceId(),
      sessionKey: username + "::" + getDeviceId()
    });
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
    await syncLocalAdminUser(users[users.length - 1], "signup");
    return { ok: true };
  } catch (err) {
    console.error("[auth] signup error:", err);
    return { ok: false, error: "Signup failed. Please try again." };
  }
}

async function login(username, password, remember = true) {
  try {
    if (checkRateLimit().blocked) {
      return { ok: false, error: "Too many attempts. Please wait 15 minutes." };
    }

    username = username.trim().toLowerCase();
    if (!username || !password) return { ok: false, error: "All fields are required." };

    const users = JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || "[]");
    const user  = users.find(u => u.username === username);
    if (!user) { recordFailedAttempt(); return { ok: false, error: "Incorrect username or password." }; }

    const matches = await verifyPassword(user, password);
    if (!matches) { recordFailedAttempt(); return { ok: false, error: "Incorrect username or password." }; }

    clearRateLimit();
    saveToken(username, remember);
    await syncLocalAdminUser(user, "login");
    return { ok: true };
  } catch (err) {
    console.error("[auth] login error:", err);
    return { ok: false, error: "Login failed. Please try again." };
  }
}

function logout() {
  clearToken();
  window.location.replace("/pages/login.html");
}

function authLoginUrl() {
  const next = encodeURIComponent(
    window.location.pathname + window.location.search
  );
  return "/pages/login.html?next=" + next;
}

function initAuthButton() {
  const btn = document.getElementById("logoutBtn");
  if (!btn) return;

  const bar = btn.closest(".auth-bar");
  if (bar) bar.hidden = false;

  const authed = isAuthenticated();
  btn.textContent = authed ? "Logout" : "Login";
  btn.setAttribute("aria-label", authed ? "Logout" : "Login");
  btn.classList.toggle("is-login", !authed);
  btn.classList.toggle("is-logout", authed);

  btn.onclick = function () {
    if (isAuthenticated()) {
      logout();
      return;
    }
    window.location.href = authLoginUrl();
  };
}

/* ======================================================
   ROUTE GUARD
   Call this synchronously at top of protected pages.
   Hides body until auth confirmed to prevent flash.
====================================================== */

function requireAuth() {
  if (!isAuthenticated()) {
    document.documentElement.style.visibility = "hidden";
    const next = encodeURIComponent(
      window.location.pathname + window.location.search
    );
    window.location.replace("/pages/login.html?next=" + next);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAuthButton);
} else {
  initAuthButton();
}
