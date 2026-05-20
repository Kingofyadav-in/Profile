"use strict";

/**
 * Shared input-validation helpers for all API routes.
 * Each function throws a plain Error with a `.status` property on bad input,
 * letting the caller catch and respond with the right HTTP status code.
 *
 * @module api/_validate
 */

/**
 * Assert a required string field is present and within max length.
 * @param {unknown} value
 * @param {string}  fieldName
 * @param {number}  [maxLen=1000]
 * @returns {string} trimmed value
 */
function requireString(value, fieldName, maxLen = 1000) {
  if (value == null || String(value).trim() === "") {
    const err = new Error(`${fieldName} is required`);
    err.status = 400;
    throw err;
  }
  const str = String(value).trim();
  if (str.length > maxLen) {
    const err = new Error(`${fieldName} must be at most ${maxLen} characters`);
    err.status = 400;
    throw err;
  }
  return str;
}

/**
 * Assert an optional string field is within max length (returns "" if absent).
 * @param {unknown} value
 * @param {string}  fieldName
 * @param {number}  [maxLen=1000]
 * @returns {string}
 */
function optionalString(value, fieldName, maxLen = 1000) {
  if (value == null || String(value).trim() === "") return "";
  const str = String(value).trim();
  if (str.length > maxLen) {
    const err = new Error(`${fieldName} must be at most ${maxLen} characters`);
    err.status = 400;
    throw err;
  }
  return str;
}

/**
 * Assert an Indian mobile number (10 digits, starts with 6–9).
 * @param {unknown} value
 * @returns {string} digits-only, e.g. "9876543210"
 */
function requireIndianPhone(value) {
  const raw = String(value ?? "").replace(/\D/g, "");
  if (!/^[6-9]\d{9}$/.test(raw)) {
    const err = new Error("Enter a valid 10-digit Indian mobile number");
    err.status = 400;
    throw err;
  }
  return raw;
}

/**
 * Assert a basic email format.
 * @param {unknown} value
 * @returns {string} lowercased email
 */
function requireEmail(value) {
  const str = String(value ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
    const err = new Error("Enter a valid email address");
    err.status = 400;
    throw err;
  }
  if (str.length > 254) {
    const err = new Error("Email address too long");
    err.status = 400;
    throw err;
  }
  return str;
}

/**
 * Assert a URL is non-empty and a valid http(s) URL.
 * @param {unknown} value
 * @param {string}  fieldName
 * @returns {string}
 */
function requireUrl(value, fieldName) {
  const str = String(value ?? "").trim();
  try {
    const parsed = new URL(str);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
  } catch {
    const err = new Error(`${fieldName} must be a valid http(s) URL`);
    err.status = 400;
    throw err;
  }
  return str;
}

/**
 * Assert a positive integer.
 * @param {unknown} value
 * @param {string}  fieldName
 * @param {number}  [max]
 * @returns {number}
 */
function requirePositiveInt(value, fieldName, max) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    const err = new Error(`${fieldName} must be a positive integer`);
    err.status = 400;
    throw err;
  }
  if (max != null && n > max) {
    const err = new Error(`${fieldName} must be at most ${max}`);
    err.status = 400;
    throw err;
  }
  return n;
}

/**
 * Assert a value is one of a list of allowed values.
 * @param {unknown}  value
 * @param {string}   fieldName
 * @param {string[]} allowed
 * @returns {string}
 */
function requireEnum(value, fieldName, allowed) {
  const str = String(value ?? "");
  if (!allowed.includes(str)) {
    const err = new Error(`${fieldName} must be one of: ${allowed.join(", ")}`);
    err.status = 400;
    throw err;
  }
  return str;
}

/**
 * Assert an OTP is a 4–8 digit numeric string.
 * @param {unknown} value
 * @returns {string}
 */
function requireOtp(value) {
  const str = String(value ?? "").trim();
  if (!/^\d{4,8}$/.test(str)) {
    const err = new Error("OTP must be a 4–8 digit number");
    err.status = 400;
    throw err;
  }
  return str;
}

/**
 * Assert a 64-character binary perceptual hash string.
 * @param {unknown} value
 * @returns {string}
 */
function requirePHash(value) {
  const str = String(value ?? "");
  if (!/^[01]{64}$/.test(str)) {
    const err = new Error("phash must be a 64-character binary string (0s and 1s)");
    err.status = 400;
    throw err;
  }
  return str;
}

/**
 * Validate request body against a schema object of validators.
 * Returns { ok, errors } without throwing — for bulk validation.
 * @param {object} body
 * @param {object} schema  { fieldName: validatorFn }
 * @returns {{ ok: boolean, errors: string[] }}
 */
function validate(body, schema) {
  const errors = [];
  for (const [field, fn] of Object.entries(schema)) {
    try { fn(body[field]); }
    catch (e) { errors.push(e.message); }
  }
  return { ok: errors.length === 0, errors };
}

module.exports = {
  requireString,
  optionalString,
  requireIndianPhone,
  requireEmail,
  requireUrl,
  requirePositiveInt,
  requireEnum,
  requireOtp,
  requirePHash,
  validate,
};
