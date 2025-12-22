const CACHE_NAME = 'mysli-vokrug-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Установка — кэшируем основные ресурсы
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache).catch(() => {
        // если какие-то ресурсы отсутствуют — не падаем
        return Promise.resolve();
      });
    }).then(() => self.skipWaiting())
  );
});

// Очистка старых кэшей
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    )).then(() => self.clients.claim())
  );
});

// Фетч — кеш-первая стратегия для статичных ресурсов, для навигации возвращаем index.html (SPA fallback)
self.addEventListener('fetch', event => {
  const request = event.request;

  // Обработка навигации (страницы)
  if (request.mode === 'navigate' || (request.method === 'GET' && request.headers.get('accept') && request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      caches.match('/index.html').then(cacheResp => {
        const networkFetch = fetch(request).then(networkResp => {
          // обновляем кэш
          caches.open(CACHE_NAME).then(cache => cache.put('/index.html', networkResp.clone()));
          return networkResp;
        }).catch(() => cacheResp);
        return networkFetch || cacheResp;
      })
    );
    return;
  }

  // Для других запросов — сначала попробуем кэш, затем сеть
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(networkResp => {
        // Кэшируем статические GET ресурсы (CSS, JS, images)
        if (request.method === 'GET') {
          const copy = networkResp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return networkResp;
      }).catch(() => new Response('', { status: 503, statusText: 'Offline' }));
    })
  );
});
