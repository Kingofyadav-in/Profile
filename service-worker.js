"use strict";

/* ======================================================
   SERVICE WORKER — ELITE PRODUCTION VERSION
   Strategy: App Shell + Runtime Caching
   Author: Amit Ku Yadav
====================================================== */

const VERSION = "v20260528-2031";
const STATIC_CACHE = `ak-static-${VERSION}`;
const DYNAMIC_CACHE = `ak-dynamic-${VERSION}`;
const MAX_DYNAMIC_ITEMS = 80;

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.json",

  /* App pages */
  "/pages/personal.html",
  "/pages/dashboard.html",
  "/pages/login.html",
  "/pages/about.html",
  "/pages/blog.html",
  "/pages/gallery.html",
  "/pages/services.html",
  "/pages/contact.html",
  "/pages/collaboration.html",
  "/pages/professional.html",
  "/pages/social.html",
  "/pages/order.html",
  "/pages/origin.html",
  "/pages/haven.html",
  "/pages/bhagalpur.html",
  "/pages/live-class.html",
  "/pages/hi-license.html",
  "/pages/hi-protect.html",

  /* CSS — versions matched to what pages request */
  "/css/base.css?v=form-suite-1",
  "/css/components.css?v=footer-clean-1",
  "/css/layout.css?v=layout-1",
  "/css/index.css?v=20260502-pro",
  "/css/blog.css?v=hi-1",
  "/css/services.css?v=20260502-pro",
  "/css/contact.css?v=hi-1",
  "/css/professional.css?v=hi-1",
  "/css/social.css?v=hi-1",
  "/css/personal.css?v=nav-pro-3",
  "/css/collaboration.css?v=mobile-hero-2",
  "/css/auth.css?v=auth-otp-1",
  "/css/effects.css?v=3",

  /* JS */
  "/js/script.js?v=footer-clean-1",
  "/js/effects.js?v=3",
  "/js/site-init.js?v=1",
  "/js/personal-data.js?v=20260502-pro",
  "/js/profile-renderer.js?v=20260502-pro",
  "/js/auth.js?v=auth-otp-1",
  "/js/nav.js",
  "/js/footer.js",

  /* LOGO */
  "/logo/day-logo.png",
  "/logo/night-logo.png",

  /* FAVICONS */
  "/favicon/favicon.ico",
  "/favicon/android-chrome-192x192.png",
  "/favicon/android-chrome-512x512.png",

  /* GALLERY */
  "/images/gallery/Screenshot_20250511_203439_Snapchat.jpg",
  "/images/gallery/Screenshot_20250511_203646_Snapchat.jpg"
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
    const networkFetch = fetch(request).then(res => {
      if (res.status === 200) {
        const cacheResponse = res.clone();
        return caches.open(DYNAMIC_CACHE)
          .then(cache => cache.put(request, cacheResponse))
          .then(() => limitCacheSize(DYNAMIC_CACHE, MAX_DYNAMIC_ITEMS))
          .then(() => res);
      }
      return res;
    }).catch(() => null);
    event.waitUntil(networkFetch);

    event.respondWith(
      caches.match(request).then(cached => {
        return cached || networkFetch;
      })
    );
    return;
  }

  /* CSS / JS / Fonts — Cache First (versioned query strings bust the cache on updates) */
  if (
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "font"
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          if (res.status === 200) {
            const cacheResponse = res.clone();
            return caches.open(STATIC_CACHE)
              .then(cache => cache.put(request, cacheResponse))
              .then(() => res);
          }
          return res;
        }).catch(() => cached);
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

async function limitCacheSize(name, size) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  const excess = keys.slice(0, Math.max(0, keys.length - size));
  await Promise.all(excess.map(k => cache.delete(k)));
}

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

/* ── Push Notifications ── */
self.addEventListener("push", (event) => {
  let data = { title: "Live Class", body: "Class update", url: "/pages/live-class.html", icon: "/favicon/android-chrome-192x192.png" };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:  data.body,
      icon:  data.icon,
      badge: "/favicon/favicon-32x32.png",
      data:  { url: data.url },
      vibrate: [200, 100, 200]
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const raw = (event.notification.data && event.notification.data.url) || "/";
  // Validate URL stays on same origin before opening — prevents open-redirect via push payload
  let safeUrl = "/";
  try {
    const parsed = new URL(raw, self.location.origin);
    if (parsed.origin === self.location.origin) {
      safeUrl = parsed.pathname + parsed.search + parsed.hash;
    }
  } catch (_) {}
  event.waitUntil(clients.openWindow(safeUrl));
});
