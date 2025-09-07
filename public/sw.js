// public/sw.js
const CACHE_NAME = 'spn-assets';

self.addEventListener('install', (event) => {
  // activación inmediata del SW actualizado
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // tomar control sin recargar
  event.waitUntil(self.clients.claim());
});

// Network-first para .js y .css (si offline, usa caché)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  const isAsset = url.pathname.endsWith('.js') || url.pathname.endsWith('.css');

  if (!isAsset) return; // solo manejamos assets

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      // forzar revalidación del servidor, sin servir del cache del navegador
      const fresh = await fetch(req, { cache: 'no-store' });
      // guardar copia (clave sin query para que el ?v= no duplique)
      const cacheKey = new Request(url.origin + url.pathname, { method: req.method, headers: req.headers });
      cache.put(cacheKey, fresh.clone()).catch(()=>{});
      return fresh;
    } catch (e) {
      // fallback a caché si estamos offline
      const cacheKey = new Request(url.origin + url.pathname, { method: req.method, headers: req.headers });
      const cached = await cache.match(cacheKey);
      if (cached) return cached;
      // última chance: devolver el error original
      throw e;
    }
  })());
});
