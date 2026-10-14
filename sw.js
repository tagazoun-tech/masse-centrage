// Masse et centrage : mode hors-ligne
const CACHE = 'masse-centrage-v1';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  // Page : le réseau d'abord (3 s maximum) pour récupérer les mises à jour, sinon la copie en cache
  if (req.mode === 'navigate') {
    const network = fetch(req).then(res => {
      if (!res.ok) throw new Error('réponse ' + res.status);
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put('./index.html', copy));
      return res;
    });
    const timeout = new Promise((_, reject) => setTimeout(reject, 3000));
    e.respondWith(
      Promise.race([network, timeout]).catch(() =>
        caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // Autres fichiers (icônes, manifeste) : le cache d'abord
  e.respondWith(
    caches.match(req).then(r => r || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});
