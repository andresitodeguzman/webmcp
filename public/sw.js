// Deliberately cache only a static offline explanation and app icons. Never
// cache app pages, Next.js/RSC responses, cart state, tickets, or checkout calls.
// Bump this version when the offline explanation, icons, or cache policy change.
const CACHE = "webmcp-offline-v1";
const ASSETS = [
  "/offline.html",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  // An update waits; it must not reload a visitor in the middle of a review.
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("webmcp-offline-") && key !== CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (ASSETS.includes(url.pathname) && url.pathname !== "/offline.html") {
    event.respondWith(
      caches
        .match(url.pathname)
        .then((cached) => cached || fetch(event.request)),
    );
    return;
  }
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    (async () => {
      try {
        // Bypass the HTTP page cache too. Offline navigation must not look like
        // a current shopping session or replay an old checkout screen.
        return await fetch(event.request, { cache: "no-store" });
      } catch {
        return (
          (await caches.match("/offline.html")) ||
          new Response(
            "You are offline. Reconnect and reload to start a fresh demo.",
            {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            },
          )
        );
      }
    })(),
  );
});
