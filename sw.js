/* Offline-module van Leervoortgang.
   - De app zelf: eerst online proberen (zo komt een nieuwe versie meteen binnen), anders de bewaarde kopie.
   - Lettertypes van Google Fonts: bewaarde kopie gebruiken.
   - Google Drive en aanmelden bij Google: nooit bewaren, altijd rechtstreeks. */
const CACHE = 'leervoortgang-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('leervoortgang-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    })));
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/drive/') || url.pathname.includes('/upload/')) return;
  if (url.searchParams.has('versiecheck')) return;

  // cache: 'no-cache' = altijd bij GitHub navragen of er een nieuwere versie is (GitHub laat browsers anders tot 10 minuten een oude kopie gebruiken).
  const net = req.mode === 'navigate' ? fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(req, { cache: 'no-cache' });
  e.respondWith(net.then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true })
    .then(hit => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined))
    .then(hit => hit || Response.error())));
});
