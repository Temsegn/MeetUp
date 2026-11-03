/**
 * Samtal Service Worker
 *
 * Caching strategy:
 * - App shell (HTML, JS, CSS, fonts, icons): Cache-first with network fallback.
 * - Static assets (images, media, public files): Cache-first with network fallback.
 * - API requests (/api/**): Network-only — never cache authenticated or private data.
 * - Socket.io (/socket.io/**): Network-only — real-time, never cache.
 * - External CDN fonts (fonts.googleapis.com, fonts.gstatic.com): Stale-while-revalidate.
 */

const CACHE_VERSION = 'samtal-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const FONT_CACHE = `${CACHE_VERSION}-fonts`;

/** Assets to pre-cache on install (app shell). */
const PRECACHE_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-192x192-maskable.png',
  '/icons/icon-512x512-maskable.png',
];

// ─── Install ────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate ───────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  const KNOWN_CACHES = [STATIC_CACHE, FONT_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !KNOWN_CACHES.includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─── Fetch ───────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // ── Never cache: API calls (authenticated/private data)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // ── Never cache: Socket.io connections
  if (url.pathname.startsWith('/socket.io/')) {
    event.respondWith(fetch(request));
    return;
  }

  // ── Never cache: auth callback routes (OAuth etc.)
  if (url.pathname.startsWith('/auth/oauth/')) {
    event.respondWith(fetch(request));
    return;
  }

  // ── Google Fonts CSS: stale-while-revalidate
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(staleWhileRevalidate(request, FONT_CACHE));
    return;
  }

  // ── App shell + static assets: cache-first with network fallback
  event.respondWith(cacheFirst(request, STATIC_CACHE));
});

// ─── Strategies ──────────────────────────────────────────────────────────────

/** Cache-first: serve from cache; fall back to network and update cache. */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    // Only cache valid, same-origin or CORS responses
    if (response.ok && (response.type === 'basic' || response.type === 'cors')) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // If we have a cached root page, serve it for navigation requests (SPA fallback)
    if (request.mode === 'navigate') {
      const root = await cache.match('/');
      if (root) return root;
    }
    return new Response('Offline — please check your connection.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

/** Stale-while-revalidate: serve cache immediately, refresh in background. */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);

  return cached ?? fetchPromise;
}
