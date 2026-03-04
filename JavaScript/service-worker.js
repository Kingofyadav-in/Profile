"use strict";

/* ======================================================
   1. CACHE CONFIG
   ====================================================== */
const CACHE_VERSION = "v5"; // bumped for pro upgrade
const CACHE_NAME = `hi-profile-${CACHE_VERSION}`;

/* CORE ASSETS (App Shell)
   NOTE: I have updated these to match your 'css/' folder structure.
   If a file doesn't exist, it will be logged in the console.
*/
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/about.html",
  "/blog.html",
  "/services.html",
  "/contact.html",
  "/collaboration.html",
  "/personal.html",
  "/professional.html",
  "/social.html",
  "/script.js",
  "/manifest.json",
  // CSS Folder Assets
  "/css/base.css",
  "/css/components.css",
  "/css/index.css",
  "/css/about.css",
  "/css/blog.css",
  "/css/contact.css",
  "/css/personal.css",
  "/css/professional.css",
  "/css/services.css",
  "/css/social.css",
  // Images & Icons
  "/logo/day-logo.png",
  "/logo/night-logo.png",
  "/favicon/favicon.ico",
  "/offline.html",
  "/favicon/android-chrome-192x192.png",
  "/favicon/android-chrome-512x512.png"
];

/* ======================================================
   2. INSTALL (With Fail-Safe)
   ====================================================== */
self.addEventListener("install", (event) => {
  console.log("[SW] Installing (pro)...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Precaching app shell (resilient)");
      return Promise.all(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[SW] Resource failed to cache: ${url}`, err && err.message);
          })
        )
      );
    })
  );
  // Activate worker immediately
  self.skipWaiting();
});

/* ======================================================
   3. ACTIVATE (Cleanup Old Caches)
   ====================================================== */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  console.log("[SW] Activated (pro) and old caches cleared.");
  self.clients.claim();
});

/* ======================================================
   4. FETCH STRATEGY
   ====================================================== */
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Ignore non-GET requests (like POST, WebSocket upgrades)
  if (request.method !== "GET" || request.url.includes("/ws")) return;

  const acceptHeader = request.headers.get("accept") || "";

  // NAVIGATION (HTML) — network-first with offline fallback
  if (acceptHeader.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // update the cache for navigations
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/offline.html')))
    );
    return;
  }

  // IMAGES — cache-first with background update (stale-while-revalidate)
  if (request.destination === 'image') {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const networkFetch = fetch(request).then((res) => {
          if (res && res.status === 200) cache.put(request, res.clone());
          return res;
        }).catch(() => null);
        return cached || networkFetch;
      })
    );
    return;
  }

  // For other static assets (CSS/JS/fonts) use cache-first then network
  event.respondWith(
    caches.match(request).then((cached) => {
      return cached || fetch(request).then((response) => {
        // optionally cache new static responses
        if (request.url.startsWith(self.location.origin)) {
          caches.open(CACHE_NAME).then((cache) => {
            try { cache.put(request, response.clone()); } catch (e) { /* ignore */ }
          });
        }
        return response;
      }).catch(() => {
        // if all fails and this is a navigation, return offline
        if (acceptHeader.includes('text/html')) return caches.match('/offline.html');
        return caches.match('/favicon/favicon.ico');
      });
    })
  );
});

// Allow clients to trigger skipWaiting for immediate activation
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

