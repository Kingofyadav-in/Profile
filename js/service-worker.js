"use strict";

/* ======================================================
   SERVICE WORKER — ELITE PRODUCTION VERSION
   Strategy: App Shell + Runtime Caching
   Author: Amit Ku Yadav
====================================================== */

/* ======================================================
   1. VERSIONING
====================================================== */

const VERSION = "v6";
const STATIC_CACHE = `ak-static-${VERSION}`;
const DYNAMIC_CACHE = `ak-dynamic-${VERSION}`;
const MAX_DYNAMIC_ITEMS = 80;

/* ======================================================
   2. CORE APP SHELL (ONLY CRITICAL FILES)
====================================================== */

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.json",

  /* CSS */
  "/css/base.css",
  "/css/components.css",

  /* JS */
  "/script.js",

  /* LOGO */
  "/logo/day-logo.png",
  "/logo/night-logo.png",

  /* FAVICONS */
  "/favicon/favicon.ico",
  "/favicon/android-chrome-192x192.png",
  "/favicon/android-chrome-512x512.png"
];

/* ======================================================
   3. INSTALL — Precache Core
====================================================== */

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* ======================================================
   4. ACTIVATE — Clean Old Caches
====================================================== */

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* ======================================================
   5. FETCH STRATEGIES
====================================================== */

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  /* ------------------------------
     A. HTML — Network First
  ------------------------------ */

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(res => {
          return caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(request, res.clone());
            return res;
          });
        })
        .catch(() =>
          caches.match(request).then(res => res || caches.match("/offline.html"))
        )
    );
    return;
  }

  /* ------------------------------
     B. IMAGES — Stale While Revalidate
  ------------------------------ */

  if (request.destination === "image") {
    event.respondWith(
      caches.match(request).then(cached => {
        const networkFetch = fetch(request).then(res => {
          if (res.status === 200) {
            caches.open(DYNAMIC_CACHE).then(cache => {
              cache.put(request, res.clone());
              limitCacheSize(DYNAMIC_CACHE, MAX_DYNAMIC_ITEMS);
            });
          }
          return res;
        }).catch(() => null);

        return cached || networkFetch;
      })
    );
    return;
  }

  /* ------------------------------
     C. CSS / JS / Fonts — Cache First
  ------------------------------ */

  if (
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "font"
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        return cached || fetch(request).then(res => {
          return caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(request, res.clone());
            limitCacheSize(DYNAMIC_CACHE, MAX_DYNAMIC_ITEMS);
            return res;
          });
        });
      })
    );
    return;
  }

  /* ------------------------------
     D. External Requests (CDN etc.)
  ------------------------------ */

  if (url.origin !== location.origin) {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html"))
    );
    return;
  }
});

/* ======================================================
   6. CACHE SIZE CONTROL
====================================================== */

function limitCacheSize(name, size) {
  caches.open(name).then(cache => {
    cache.keys().then(keys => {
      if (keys.length > size) {
        cache.delete(keys[0]).then(() =>
          limitCacheSize(name, size)
        );
      }
    });
  });
}

/* ======================================================
   7. SKIP WAITING (Update Control)
====================================================== */

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
