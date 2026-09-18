/* Tuition Manager — service worker
   Bump CACHE_VERSION on every deploy so returning users pick up
   the new app shell instead of being stuck on a cached old one.
   All real data lives in IndexedDB, which this never touches. */
const CACHE_VERSION = "v4";
const CACHE_NAME = "tuition-manager-" + CACHE_VERSION;
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-192-maskable.png",
  "./icon-512-maskable.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

// Stale-while-revalidate for same-origin app-shell files.
// Cross-origin requests (the jsPDF CDN scripts) are left to the
// network as-is — PDF export already tells the user plainly if
// that fails offline, so the service worker doesn't need to.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; })
          .catch(() => cached);
        return cached || network;
      })
    )
  );
});
