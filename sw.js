const STATIC_CACHE = 'app-shell-v1';
const DYNAMIC_CACHE = 'dynamic-cache-v1';

const APP_SHELL_ASSETS = [
  './',
  './hotel-.html',
    
  './mainmanifest.json',
  './register.js',
  './app.js',
  './images/icons/192.png',
  './images/icons/512.png',
  './images/icons/180.png'
];

const DYNAMIC_ASSET_URLS = [
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(APP_SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // APP SHELL
  if (APP_SHELL_ASSETS.includes(url.pathname) || APP_SHELL_ASSETS.includes('.' + url.pathname)) {
    event.respondWith(
      caches.match(request, { ignoreSearch: true }).then((cached) => {
        return cached || fetch(request);
      })
    );
    return;
  }

  // CDN dinámico
  if (DYNAMIC_ASSET_URLS.some((u) => request.url.startsWith(u))) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((res) => {
            return caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, res.clone());
              return res;
            });
          })
          .catch(() => caches.match(url.pathname, { ignoreSearch: true }));
      })
    );
    return;
  }

  // Navegaciones: fallback a index.html si estás offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Otros GET: network-first con fallback a cache
  event.respondWith(
    fetch(request)
      .then((res) => res)
      .catch(() => caches.match(request, { ignoreSearch: true }))
  );
});
