"use strict";

/* ======================================================
   CACHE CONFIG
====================================================== */
const CACHE_VERSION = "v2";
const CACHE_NAME = `hi-profile-${CACHE_VERSION}`;

/* Core assets (app shell) */
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/blog.html",
  "/services.html",
  "/contact.html",
  "/collaboration.html",
  "/style.css",
  "/script.js",
  "/manifest.json",
  "/logo/day-logo.png",
  "/logo/night-logo.png",
  "/favicon/favicon.ico"
];

/* ======================================================
   INSTALL
====================================================== */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );

  // Activate immediately on install
  self.skipWaiting();
});

/* ======================================================
   ACTIVATE
====================================================== */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );

  self.clients.claim();
});

/* ======================================================
   FETCH STRATEGY
====================================================== */
self.addEventListener("fetch", event => {
  const { request } = event;

  // Ignore non-GET requests
  if (request.method !== "GET") return;

  // Network-first for HTML pages
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(request).then(cached => {
      return cached || fetch(request);
    })
  );
});
