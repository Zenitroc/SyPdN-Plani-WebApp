// Service worker desactivado temporalmente.
// Este archivo limpia instalaciones previas para evitar assets viejos en produccion.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(key => caches.delete(key)));
    await self.registration.unregister();

    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      client.postMessage({ type: 'SW_DISABLED' });
    }
  })());
});
