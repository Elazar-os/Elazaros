var CACHE_NAME = 'kod-screen-v30';

// Simplified service worker - no caching, just pass through
self.addEventListener('install', function(e) {
  console.log('[SW] Installing v30 - no cache mode');
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  console.log('[SW] Activating v30 - clearing all caches');
  e.waitUntil(
    caches.keys().then(function(names) {
      console.log('[SW] Deleting all caches:', names);
      return Promise.all(names.map(function(n) { return caches.delete(n); }));
    }).then(function() {
      console.log('[SW] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Pass through all requests without caching
self.addEventListener('fetch', function(e) {
  e.respondWith(fetch(e.request));
});
