var CACHE_NAME = 'kod-screen-v47';
var ASSETS = [
  '/screen.html',
  '/styles.css?v=v47',
  '/app.js?v=v47',
  '/screen-manifest.json'
];

self.addEventListener('install', function(e) {
  console.log('[SW] Installing v47...');
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    }).then(function() {
      console.log('[SW] Skip waiting and activate immediately');
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(e) {
  console.log('[SW] Activating v46...');
  e.waitUntil(
    caches.keys().then(function(names) {
      console.log('[SW] Deleting old caches:', names.filter(function(n) { return n !== CACHE_NAME; }));
      return Promise.all(
        names.filter(function(n) { return n !== CACHE_NAME; })
          .map(function(n) { return caches.delete(n); })
      );
    }).then(function() {
      console.log('[SW] Claiming clients');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  if (url.pathname.match(/^\/menu-.*\.json$/)) {
    e.respondWith(
      fetch(e.request).then(function(res) {
        var clone = res.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
        return res;
      }).catch(function() {
        return caches.match(e.request);
      })
    );
    return;
  }

  if (e.request.mode === 'navigate' || url.pathname.match(/\.(html|css|js|json|woff2?)(\?.*)?$/)) {
    e.respondWith(
      fetch(e.request).then(function(res) {
        var clone = res.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
        return res;
      }).catch(function() {
        return caches.match(e.request);
      })
    );
    return;
  }

  e.respondWith(fetch(e.request));
});
