// Service worker simples: guarda o app para abrir sem internet; dados da nuvem nunca vão para o cache.
const CACHE = 'bloco32-v5';
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest'])));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Aviso vindo da nuvem (função "lembretes").
self.addEventListener('push', (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch {
    d = { title: 'Sua Agenda', body: e.data ? e.data.text() : '' };
  }
  e.waitUntil(self.registration.showNotification(d.title || 'Sua Agenda', { body: d.body || '', icon: './icon-192.png', badge: './icon-192.png', data: { url: d.url || './' } }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) if ('focus' in c) return c.focus();
      return self.clients.openWindow((e.notification.data && e.notification.data.url) || './');
    }),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // Supabase etc.: direto na rede
  // Rede primeiro (pega versão nova), cache se estiver sem internet.
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        const copy = r.clone();
        void caches.open(CACHE).then((c) => c.put(e.request, copy));
        return r;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html'))),
  );
});
