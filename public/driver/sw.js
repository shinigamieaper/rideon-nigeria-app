/* RideOn Driver App Service Worker (scope: /driver/) */
const VERSION = 'rideon-driver-v2'; // Bump version for push support
const STATIC_CACHE = `static-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;
const OFFLINE_URL = '/driver/offline.html';

// ─────────────────────────────────────────────────────────────────────────────
// PUSH NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  console.log('[SW] Push event received:', event);

  let data = { title: 'RideOn Driver', body: 'You have a new notification' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      // If not JSON, try as text
      data = { title: 'RideOn Driver', body: event.data.text() };
    }
  }

  const title = data.notification?.title || data.title || 'RideOn Driver';
  const options = {
    body: data.notification?.body || data.body || '',
    icon: '/icons/driver/icon-192.png',
    badge: '/icons/driver/icon-192.png',
    vibrate: [200, 100, 200],
    tag: data.data?.type || 'default',
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.fcmOptions?.link || data.data?.clickAction || '/driver/bookings/new',
      ...data.data,
    },
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event.action, event.notification.data);

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Get the URL to open
  const urlToOpen = event.notification.data?.url || '/driver/bookings/new';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if a window is already open and focus it
      for (const client of clientList) {
        if (client.url.includes('/driver') && 'focus' in client) {
          client.focus();
          client.navigate(urlToOpen);
          return;
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
});

// ─────────────────────────────────────────────────────────────────────────────
// CACHING STRATEGIES
// ─────────────────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll([
      OFFLINE_URL,
      '/favicon.ico'
    ]))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      );
    })()
  );
  self.clients.claim();
});

function isHTMLRequest(request) {
  return request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigations within /driver/
  if (isHTMLRequest(req)) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        } catch (_) {
          const cached = await caches.match(req);
          return cached || caches.match(OFFLINE_URL);
        }
      })()
    );
    return;
  }

  // Next.js build assets and CSS/JS → CacheFirst
  if (url.pathname.startsWith('/_next/') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        const copy = res.clone();
        caches.open(STATIC_CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      })()
    );
    return;
  }

  // Images/Fonts → StaleWhileRevalidate
  const dest = req.destination;
  if (dest === 'image' || dest === 'font' || /\.(png|jpg|jpeg|svg|ico|webp|gif|bmp|ttf|otf|woff|woff2)$/i.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        const networkPromise = fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
            return res;
          })
          .catch(() => cached);
        return cached || networkPromise;
      })()
    );
    return;
  }

  // JSON API (GET) → NetworkFirst
  if (req.method === 'GET' && (req.headers.get('accept') || '').includes('application/json')) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        } catch (_) {
          const cached = await caches.match(req);
          if (cached) return cached;
          throw _;
        }
      })()
    );
    return;
  }
});
