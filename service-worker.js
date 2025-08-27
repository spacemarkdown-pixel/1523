const CACHE_NAME = 'zy-email-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/styles/styles.css',
  '/scripts/app.js',
  '/assets/logo.svg',
  '/assets/icon.svg',
  '/manifest.webmanifest'
];
self.addEventListener('install', (e)=>{
  e.waitUntil((async()=>{
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(ASSETS);
    self.skipWaiting();
  })());
});
self.addEventListener('activate', (e)=>{
  e.waitUntil((async()=>{
    const keys = await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)));
    self.clients.claim();
  })());
});
self.addEventListener('fetch', (e)=>{
  const url = new URL(e.request.url);
  if(e.request.method !== 'GET') return;
  if(url.origin === location.origin){
    // App shell: stale-while-revalidate
    e.respondWith((async()=>{
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(e.request);
      const network = fetch(e.request).then(res=>{ cache.put(e.request, res.clone()); return res; }).catch(()=>cached);
      return cached || network;
    })());
    return;
  }
  // Third-party: network first, fallback to cache
  e.respondWith((async()=>{
    try { const res = await fetch(e.request); return res; } catch { return (await caches.match(e.request)) || Response.error(); }
  })());
});