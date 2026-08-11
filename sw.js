const CACHE_NAME = 'krupa-pos-v3';

self.addEventListener('install', (evt) => {
  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evt) => {
  // Always fetch fresh network content first!
  evt.respondWith(
    fetch(evt.request).catch(() => caches.match(evt.request))
  );
});
