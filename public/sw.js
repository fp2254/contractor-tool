const CACHE_VERSION = "v57";
const SHELL_CACHE = `tradebase-shell-${CACHE_VERSION}`;
const STATIC_CACHE = `tradebase-static-${CACHE_VERSION}`;
const PAGES_CACHE = `tradebase-pages-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline";

// Pages to pre-cache on install so they're available immediately offline
const PRECACHE_PAGES = [
  "/offline",
  "/app",
  "/app/leads",
  "/app/customers",
  "/app/quotes",
  "/app/jobs",
  "/app/invoices",
  "/app/schedule",
  "/app/inventory",
  "/app/trade-contacts",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.addAll(PRECACHE_PAGES).catch(() => cache.add(OFFLINE_URL))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(
            (k) =>
              k !== SHELL_CACHE &&
              k !== STATIC_CACHE &&
              k !== PAGES_CACHE
          )
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Skip non-GET — let the browser handle mutations normally
  if (request.method !== "GET") return;

  // Skip Next.js internals
  if (url.pathname.startsWith("/_next/webpack-hmr")) return;
  if (url.searchParams.has("_rsc")) return;

  // Static assets (_next/static): cache-first forever (content-hashed filenames)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Images and icons: cache-first
  if (
    url.pathname.startsWith("/_next/image") ||
    url.pathname.match(/\.(png|jpg|jpeg|webp|svg|ico|gif)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // API routes: network-first, offline gets a JSON error (no caching — data must be fresh)
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/app/") && url.pathname.includes("/api")
  ) {
    event.respondWith(
      fetch(request).catch(() =>
        Response.json(
          { error: "You are offline. This action will be available when you reconnect." },
          { status: 503 }
        )
      )
    );
    return;
  }

  // Auth routes: always network
  if (url.pathname.startsWith("/auth/")) return;

  // Page navigations: network-first, cache the fresh response, fall back to cache then offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(PAGES_CACHE).then((c) => c.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const shell = await caches.match(OFFLINE_URL);
          return shell;
        })
    );
    return;
  }

  // Everything else: network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(PAGES_CACHE).then((c) => c.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// Listen for skip-waiting message from the update prompt
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
