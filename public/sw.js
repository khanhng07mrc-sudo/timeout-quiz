// Timeout Quiz - Progressive Web App Service Worker
// Provides full offline capabilities for Sandbox, Quiz Bank Editor, audio assets, and UI.

const CACHE_NAME = 'timeout-quiz-v1';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon.svg',
  '/logo.svg',
  '/admin/sandbox',
  '/admin/quiz-bank',
  '/quiz-banks/index.json',
  '/sounds/lobby.wav',
  '/sounds/question_suspense.wav',
  '/sounds/tick.wav',
  '/sounds/go.wav',
  '/sounds/buzz.wav',
  '/sounds/correct.wav',
  '/sounds/wrong.wav',
  '/sounds/fanfare.wav',
  '/sounds/powerup.wav',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Some assets failed to pre-cache:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip WebSocket connections and non-GET requests
  if (event.request.method !== 'GET' || url.protocol.startsWith('ws')) {
    return;
  }

  // 1. Sounds & Static Icons/Files: Cache First, fallback to Network
  if (url.pathname.startsWith('/sounds/') || url.pathname.startsWith('/icons/') || url.pathname.endsWith('.svg') || url.pathname.endsWith('.wav')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          if (res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // 2. Next.js static scripts & styles (_next/static): Cache First with background refresh
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          if (res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // 3. Navigation (HTML pages) and API: Network First with Cache Fallback
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('/admin/sandbox');
          }
          return new Response(JSON.stringify({ error: 'Offline', isOffline: true }), {
            headers: { 'Content-Type': 'application/json' },
            status: 503,
          });
        });
      })
  );
});
