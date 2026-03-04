/* RideOn Service Worker - Stage 1 (Offline + Caching)
   Minimal, dependency-free strategies tuned for Next.js App Router.
   - Navigations: NetworkFirst with offline fallback
   - _next build assets & CSS/JS: CacheFirst
   - Images/Fonts: StaleWhileRevalidate
   - JSON GET APIs: NetworkFirst (cache on success)
*/

const BUILD_ID = new URL(self.location.href).searchParams.get('buildId') || '';
const VERSION = BUILD_ID ? `rideon-${BUILD_ID}` : 'rideon-v2';
const STATIC_CACHE = `static-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;
const OFFLINE_URL = '/offline.html';

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

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Bypass Firebase auth helpers to avoid OAuth redirect interference on iOS
  if (url.pathname.startsWith('/__/auth/')) {
    return;
  }

  // Navigations → NetworkFirst with offline fallback
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
          // If no cache, fall through: let it error to surface issues in dev
          throw _;
        }
      })()
    );
    return;
  }
});
