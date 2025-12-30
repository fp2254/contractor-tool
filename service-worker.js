// SELF-DESTRUCT SERVICE WORKER v129
// This SW immediately unregisters itself and clears ALL caches
// No caching, no fetch handling - pure network-only mode

self.addEventListener('install', (event) => {
  console.log('[SW v125] Installing self-destruct version');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW v125] Activating - NUKING all caches and unregistering');
  event.waitUntil(
    (async () => {
      // Delete ALL caches
      const cacheNames = await caches.keys();
      console.log('[SW v125] Found caches to delete:', cacheNames);
      await Promise.all(cacheNames.map(name => {
        console.log('[SW v125] Deleting cache:', name);
        return caches.delete(name);
      }));
      
      // Claim clients
      await self.clients.claim();
      console.log('[SW v125] Claimed clients');
      
      // Tell all clients to reload
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(client => {
        client.postMessage({ type: 'SW_NUKED', reload: true });
      });
      
      // Unregister this service worker
      await self.registration.unregister();
      console.log('[SW v125] Self-destructed');
    })()
  );
});

// NO FETCH HANDLER - all requests go straight to network
