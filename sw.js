// sw.js — deja la app disponible sin internet y avisa cuando hay una versión nueva.
// Sube el número de CACHE cada vez que subas cambios importantes; así los
// teléfonos descargan la versión nueva en vez de quedarse con la vieja.
const CACHE = 'mi-panel-v1';
const ASSETS = [
  './', './index.html', './manifest.json', './css/app.css',
  './js/core.js', './js/audio.js', './js/coverart.js', './js/app.js',
  './js/pages/inicio.js', './js/pages/tareas.js', './js/pages/habitos.js',
  './js/pages/notas.js', './js/pages/dinero.js', './js/pages/musica.js',
  './js/pages/calendario.js', './js/pages/ajustes.js',
  './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Los archivos propios: primero caché, y se actualizan en segundo plano.
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then(cached => {
        const fresh = fetch(req).then(res => {
          if (res && res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
          return res;
        }).catch(() => cached);
        return cached || fresh;
      })
    );
    return;
  }
  // Fuentes y feriados (dominios externos): red primero, sin bloquear si falla.
  e.respondWith(fetch(req).catch(() => caches.match(req)));
});
