"use strict";

/* ======================================================
   SERVICE WORKER — ELITE PRODUCTION VERSION
   Strategy: App Shell + Runtime Caching
   Author: Amit Ku Yadav
====================================================== */

const VERSION = "v14-live-class-join";
const STATIC_CACHE = `ak-static-${VERSION}`;
const DYNAMIC_CACHE = `ak-dynamic-${VERSION}`;
const MAX_DYNAMIC_ITEMS = 100;

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.json",

  /* Pages */
  "/pages/personal.html",
  "/pages/hi-license.html",
  "/pages/live-class.html",

  /* CSS — core */
  "/css/base.css?v=hi-1",
  "/css/components.css?v=20260504-pwa2",
  "/css/index.css?v=hi-1",
  "/css/blog.css?v=hi-1",
  "/css/services.css?v=hi-1",
  "/css/contact.css?v=hi-1",
  "/css/professional.css?v=hi-1",
  "/css/social.css?v=hi-1",
  "/css/personal.css?v=hi-1",
  "/css/about.css?v=hi-1",
  "/css/myself.css?v=hi-3",
  "/css/personal-pages.css?v=hi-1",
  "/css/live-class.css?v=hi-5",
  "/css/myhome.css?v=hi-1",
  "/css/mycity.css?v=hi-1",
  "/css/blog-post.css?v=hi-1",
  "/css/brand.css?v=hi-1",
  "/css/collaboration.css?v=hi-4",
  "/css/hi-guide.css?v=hi-2",
  "/css/auth.css?v=hi-1",

  /* CSS — HI App */
  "/css/hi-app.css?v=hi-1",
  "/css/hi-app.css?v=hi-3",

  /* JS — core */
  "/js/script.js?v=hi-1",
  "/js/personal-data.js?v=hi-1",
  "/js/profile-renderer.js?v=hi-1",
  "/js/auth.js?v=hi-1",

  /* JS — HI App */
  "/js/hi-storage.js?v=hi-1",
  "/js/hi-app.js?v=hi-1",
  "/js/hi-personal.js?v=hi-1",
  "/js/hi-professional.js?v=hi-1",
  "/js/hi-social.js?v=hi-1",
  "/js/hi-context.js?v=hi-1",
  "/js/hi-assistant.js?v=hi-1",
  "/js/hi-license.js?v=hi-1",
  "/js/hi-sync.js?v=hi-1",
  "/js/hi-guide.js?v=hi-2",
  "/js/live-class.js?v=hi-6",
  "/pages/live-class.html",

  /* LOGO */
  "/logo/day-logo.png",
  "/logo/night-logo.png",

  /* FAVICONS */
  "/favicon/favicon.ico",
  "/favicon/android-chrome-192x192.png",
  "/favicon/android-chrome-512x512.png",
  "/favicon/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

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

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  /* HTML — Network First */
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(res =>
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(request, res.clone());
            return res;
          })
        )
        .catch(() =>
          caches.match(request).then(res => res || caches.match("/offline.html"))
        )
    );
    return;
  }

  /* Images — Stale While Revalidate */
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

  /* CSS / JS / Fonts — Stale While Revalidate */
  if (
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "font"
  ) {
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

  /* External requests */
  if (url.origin !== location.origin) {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html"))
    );
  }
});

function limitCacheSize(name, size) {
  caches.open(name).then(cache => {
    cache.keys().then(keys => {
      if (keys.length > size) {
        cache.delete(keys[0]).then(() => limitCacheSize(name, size));
      }
    });
  });
}

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
