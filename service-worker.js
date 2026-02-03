const CACHE_NAME = "hi-profile-v1";

const ASSETS = [
  "/Profile/",
  "/Profile/index.html",
  "/Profile/style.css",
  "/Profile/script.js",
  "/Profile/manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
