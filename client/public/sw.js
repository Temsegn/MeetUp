/**
 * Samtal Service Worker
 *
 * Caching strategy:
 * - Page navigations (HTML): Network-first, cached shell only as offline fallback.
 * - Static files (/assets, /icons, /mediapipe, images, fonts): Cache-first.
 * - Everything else (API routes, socket.io): not intercepted — always network.
 * - External CDN fonts (fonts.googleapis.com, fonts.gstatic.com): Stale-while-revalidate.
 */

// Bump to drop every cache from previous deploys.
const CACHE_VERSION = 'samtal-v2';
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

/** Same-origin files that are safe to cache: hashed build output + public assets. */
const STATIC_PATH = /^\/(assets|icons|mediapipe)\//;
const STATIC_EXT = /\.(png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|webmanifest)$/i;

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // ── Google Fonts: stale-while-revalidate
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(staleWhileRevalidate(request, FONT_CACHE));
    return;
  }

  // Other origins (Unsplash backgrounds, etc.) — let the browser handle them.
  if (url.origin !== self.location.origin) return;

  // ── Page navigations: network-first so a new deploy is picked up
  // immediately; cached shell is only the offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request));
    return;
  }

  // ── Static files: cache-first (Vite asset names are content-hashed).
  if (STATIC_PATH.test(url.pathname) || STATIC_EXT.test(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Everything else (API: /meetings, /auth, /dashboard, socket.io, …) goes
  // straight to the network — never cache authenticated or live data.
});

/** Network-first for HTML; keeps '/' fresh in cache for offline use. */
async function networkFirstPage(request) {
  const cache = await caches.open(STATIC_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      cache.put('/', response.clone());
    }
    return response;
  } catch {
    const root = await cache.match('/');
    if (root) return root;
    return new Response('Offline — please check your connection.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

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
