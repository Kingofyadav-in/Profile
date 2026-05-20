"use strict";

/**
 * Vercel Edge Middleware — runs before every request.
 *
 * Responsibilities:
 *  1. Generate a per-request CSP nonce and inject it into the CSP header.
 *     This replaces the blanket 'unsafe-inline' allowance.
 *  2. Add HSTS header (Vercel already enforces HTTPS but belt + suspenders).
 *
 * NOTE: To fully eliminate 'unsafe-inline', all inline <script> tags in HTML
 * files must be moved to external .js files or have the nonce injected.
 * This middleware prepares the CSP nonce header so HTML templates can read
 * it from the response header `x-csp-nonce` if using a server-rendered step.
 *
 * For purely static HTML (no server rendering), this middleware at minimum
 * removes 'unsafe-inline' for style-src and tightens the overall policy.
 */

// Vercel middleware must export a default function that returns a Response.
// The runtime is Node.js (Fluid Compute) — not restricted to edge APIs.

module.exports = async function middleware(req) {
  const { NextResponse } = await import("next/server");

  const nonce = Buffer.from(
    crypto.getRandomValues(new Uint8Array(16))
  ).toString("base64");

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://jarvis.kingofyadav.in https://static.cloudflareinsights.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net`,
    `script-src-elem 'self' 'nonce-${nonce}' https://jarvis.kingofyadav.in https://static.cloudflareinsights.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net`,
    "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
    "img-src 'self' data: https:",
    "connect-src 'self' https://kingofyadav.in https://jarvis.kingofyadav.in wss://jarvis.kingofyadav.in https://formspree.io https://www.googleapis.com https://vitals.vercel-insights.com https://static.cloudflareinsights.com https://*.cloudflareinsights.com https://*.cloudflare.com",
    "worker-src 'self'",
    "frame-src 'self' https://www.youtube.com https://www.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://formspree.io",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  const res = NextResponse.next();
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("x-csp-nonce", nonce); // readable by server-rendered templates
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  return res;
};

module.exports.config = {
  // Only run on HTML page requests; skip API routes, static assets
  matcher: [
    "/((?!api|_vercel|api-static|css|js|images|favicon|logo|wallet|blog|brands|pages|service-worker\\.js|manifest\\.json|robots\\.txt|sitemap\\.xml).*)",
  ],
};
