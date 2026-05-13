"use strict";

/* ======================================================
   SERVICE WORKER — ELITE PRODUCTION VERSION
   Strategy: App Shell + Runtime Caching
   Author: Amit Ku Yadav
====================================================== */

const VERSION = "v27";
const STATIC_CACHE = `ak-static-${VERSION}`;
const DYNAMIC_CACHE = `ak-dynamic-${VERSION}`;
const MAX_DYNAMIC_ITEMS = 80;

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.json",

  /* Protected app pages */
  "/pages/personal.html",
  "/pages/wallet.html",
  "/pages/vault.html",
  "/pages/blog.html",
  "/pages/gallery.html",
  "/pages/services.html",
  "/pages/contact.html",

  /* CSS */
  "/css/base.css?v=20260502-pro",
  "/css/components.css?v=footer-clean-1",
  "/css/index.css?v=20260502-pro",
  "/css/blog.css?v=20260502-pro",
  "/css/services.css?v=20260502-pro",
  "/css/contact.css?v=20260502-pro",
  "/css/professional.css?v=20260502-pro",
  "/css/social.css?v=20260502-pro",
  "/css/personal.css?v=nav-pro-3",
  "/css/about.css?v=20260502-pro",
  "/css/myself.css?v=20260502-pro",
  "/css/myhome.css?v=20260502-pro",
  "/css/mycity.css?v=20260502-pro",
  "/css/blog-post.css?v=20260502-pro",
  "/css/brand.css?v=20260502-brand",
  "/css/collaboration.css?v=20260502-pro",
  "/css/auth.css?v=auth-otp-1",

  /* JS */
  "/js/script.js?v=footer-clean-1",
  "/js/personal-data.js?v=20260502-pro",
  "/js/profile-renderer.js?v=20260502-pro",
  "/js/auth.js?v=auth-otp-1",

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

  /* CSS / JS / Fonts — Network First */
  if (
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "font"
  ) {
    event.respondWith(
      fetch(request)
        .then(res => {
          if (res.status === 200) {
            caches.open(DYNAMIC_CACHE).then(cache => {
              cache.put(request, res.clone());
              limitCacheSize(DYNAMIC_CACHE, MAX_DYNAMIC_ITEMS);
            });
          }
          return res;
        })
        .catch(() => caches.match(request))
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
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(clients.openWindow(url));
});
