// Service worker minimal — hanya untuk memenuhi syarat "installable PWA".
// Tidak melakukan caching agresif supaya data Firebase selalu realtime/terbaru.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
