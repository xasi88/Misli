const CACHE = 'misli-cache-v2';
const ASSETS = [
  '/', '/index.html', '/styles.css', '/app.js', '/manifest.webmanifest', '/firebase-config.example.js',
  '/icons/icon-192.png', '/icons/icon-512.png'
];
self.addEventListener('install', e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});
self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
      .catch(()=>self.clients.claim())
  );
});
self.addEventListener('fetch', e=>{
  if(e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(res=>res || fetch(e.request).then(r=>{
      return caches.open(CACHE).then(cache=>{ cache.put(e.request, r.clone()); return r; });
    })).catch(()=>{
      if(e.request.mode === 'navigate') return caches.match('/index.html');
      return caches.match(e.request);
    })
  );
});
