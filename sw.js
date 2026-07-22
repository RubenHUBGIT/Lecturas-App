const CACHE = 'lecturas-v6';
const ASSETS = ['./lectura.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// ── Pomodoro background timer ────────────────────────────────────────────────
// When the app goes to background the SW keeps the scheduled notification alive.
let pomoTimer = null;

self.addEventListener('message', e => {
  if (!e.data) return;

  if (e.data.type === 'POMO_START') {
    if (pomoTimer) { clearTimeout(pomoTimer); pomoTimer = null; }
    const delay = Math.max(0, e.data.endTime - Date.now());

    // waitUntil keeps the SW alive until the notification fires
    e.waitUntil(new Promise(resolve => {
      pomoTimer = setTimeout(() => {
        pomoTimer = null;
        self.registration.showNotification(e.data.title, {
          body:     e.data.body,
          icon:     './icon-192.png',
          badge:    './icon-192.png',
          vibrate:  [500, 150, 500, 150, 800],
          tag:      'pomodoro',
          renotify: true,
          data:     { url: self.registration.scope }
        }).then(resolve, resolve);
      }, delay);
    }));
  }

  if (e.data.type === 'POMO_CANCEL') {
    if (pomoTimer) { clearTimeout(pomoTimer); pomoTimer = null; }
  }
});

// Tap on the notification → bring the app to the foreground
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const match = list.find(c => c.url.startsWith(self.registration.scope));
      if (match) return match.focus();
      return clients.openWindow(self.registration.scope);
    })
  );
});
