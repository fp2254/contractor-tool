const CACHE_NAME = 'tradebase-v61';
const RUNTIME_CACHE = 'tradebase-runtime-v48';

const APP_SHELL = [
  '/app',
  '/index.html',
  '/landing.html',
  '/landing.css',
  '/style.css',
  '/script.js',
  '/config.js',
  '/db.js',
  '/languages.js',
  '/templates.js',
  '/manifest.json',
  '/icon.svg',
  '/apple-touch-icon.png',
  '/icon-180.png',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
          })
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  // Always use network-first for root and app routes to ensure fresh content
  if (url.pathname === '/' || url.pathname === '/app') {
    event.respondWith(networkFirstStrategy(request));
  } else if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
  } else if (APP_SHELL.includes(url.pathname)) {
    event.respondWith(cacheFirstStrategy(request));
  } else {
    event.respondWith(networkFirstStrategy(request));
  }
});

async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    if (request.destination === 'document') {
      return caches.match('/index.html');
    }
    throw error;
  }
}

async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    if (request.url.includes('/api/')) {
      return new Response(
        JSON.stringify({ 
          error: 'offline', 
          message: 'You are offline. Changes will sync when you reconnect.' 
        }),
        { 
          status: 503, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    throw error;
  }
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncPendingData());
  }
});

async function syncPendingData() {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'SYNC_REQUESTED'
    });
  });
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
