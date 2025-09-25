/* Drawer Count Service Worker */
const CACHE_VERSION = 'v0.3.11';
const PRECACHE = `precache-${CACHE_VERSION}`;
const RUNTIME = `runtime-${CACHE_VERSION}`;

// Scope-aware URL helpers (works under subpaths like /drawer-count-app/)
const toScopePath = (p) => new URL(p, self.registration.scope).pathname;
const RAW_PRECACHE_URLS = [
  '.',                 // scope root
  'index.html',
  'offline.html',
  'manifest.webmanifest',
  'style.css',
  'main.js',
  'components/drawer-count.js',
  'sw-register.js',
  'icons/favicon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon-180x180.png',
  'icons/favicon-32x32.png',
  'icons/favicon-16x16.png',
  // Background images used for random body background
  'images/1g-eclipse-bg.png',
  'images/crownvic-bg.png',
  'images/eclipse-challenge-bg.png',
  'images/vw-bg.png',
  'images/1g-eclipse-bg.webp',
  'images/crownvic-bg.webp',
  'images/eclipse-challenge-bg.webp',
  'images/vw-bg.webp',
  'favicon.ico',
  'browserconfig.xml'
];
// Map to scope-relative paths and ensure uniqueness to avoid Cache.addAll duplicate request errors
const PRECACHE_URLS = Array.from(new Set(RAW_PRECACHE_URLS.map(toScopePath)));
const stripQuery = (p) => p.split('?')[0];
const INDEX_PATH = toScopePath('index.html');
const ROOT_PATH = toScopePath('.');
const OFFLINE_PATH = toScopePath('offline.html');

// Connectivity state + broadcaster
let isOffline = false;
let forcedMode = null; // null | 'offline' | 'mixed'
const broadcastStatus = async (offline) => {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clients) client.postMessage({ type: 'NETWORK_STATUS', offline, forced: forcedMode });
};
const setOffline = (flag) => {
  if (isOffline !== flag) {
    isOffline = flag;
    // fire only on transitions
    broadcastStatus(isOffline);
  }
};

const forcedOfflineResponse = async (request) => {
  try {
    const url = new URL(request.url);
    if (url.origin === self.location.origin && url.pathname.startsWith(new URL('/api/', self.registration.scope).pathname)) {
      return new Response(JSON.stringify({ offline: true, forced: true }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (request.mode === 'navigate') {
      const precache = await caches.open(PRECACHE);
      return (
        (await precache.match(INDEX_PATH)) ||
        (await precache.match(ROOT_PATH)) ||
        (await precache.match(OFFLINE_PATH)) ||
        new Response('Offline', { status: 503 })
      );
    }
    if (request.method === 'GET') {
      const precache = await caches.open(PRECACHE);
      const runtime = await caches.open(RUNTIME);
      const cached =
        (await precache.match(request)) ||
        (await runtime.match(request)) ||
        (await precache.match(stripQuery(url.pathname))) ||
        (await runtime.match(stripQuery(url.pathname)));
      if (cached) return cached;
    }
  } catch (_) { /* ignore */ }
  return new Response('', { status: 503 });
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => ![PRECACHE, RUNTIME].includes(k)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Allow clients to request current status
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;
  if (data.type === 'GET_NETWORK_STATUS') {
    event.source?.postMessage({ type: 'NETWORK_STATUS', offline: isOffline, forced: forcedMode });
  } else if (data.type === 'DEV_SET_NETWORK_MODE') {
    const rawMode = typeof data.mode === 'string' ? data.mode.toLowerCase() : '';
    if (rawMode === 'offline') {
      forcedMode = 'offline';
      setOffline(true);
    } else if (rawMode === 'mixed') {
      forcedMode = 'mixed';
      setOffline(false);
    } else {
      forcedMode = null;
      setOffline(false);
    }
    broadcastStatus(isOffline);
    if (event.source && !event.source.closed) {
      event.source.postMessage({ type: 'DEV_NETWORK_MODE_ACK', mode: forcedMode });
    }
  } else if (data.type === 'OPEN_APP') {
    // Handle OPEN_APP request without using waitUntil for response messages
    (async () => {
      try {
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        // Try to focus an existing client within scope
        for (const client of clients) {
          try {
            // Limit to this SW scope
            const clientUrl = new URL(client.url);
            const scopeUrl = new URL(self.registration.scope);
            if (clientUrl.origin === scopeUrl.origin && clientUrl.pathname.startsWith(scopeUrl.pathname)) {
              await client.focus();
              // Send response immediately without waitUntil
              if (event.source && !event.source.closed) {
                event.source.postMessage({ type: 'OPEN_APP_DONE' });
              }
              return;
            }
          } catch (_) { /* ignore */ }
        }
        // Otherwise open a new window at start_url
        const startUrl = new URL('.', self.registration.scope).toString();
        await self.clients.openWindow(startUrl);
        // Send response immediately without waitUntil
        if (event.source && !event.source.closed) {
          event.source.postMessage({ type: 'OPEN_APP_DONE' });
        }
      } catch (_) {
        // Send error response if something goes wrong
        if (event.source && !event.source.closed) {
          event.source.postMessage({ type: 'OPEN_APP_ERROR' });
        }
      }
    })();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (forcedMode === 'offline') {
    setOffline(true);
    event.respondWith(forcedOfflineResponse(request));
    return;
  }

  if (forcedMode === 'mixed') {
    setOffline(false);
    if (url.origin === self.location.origin && /\/health$/i.test(url.pathname)) {
      event.respondWith(
        new Response(
          JSON.stringify({ ok: true, db: { configured: true, connected: false }, forced: true }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );
      return;
    }
  }

  // Always bypass cache for API requests; prefer live data
  if (url.origin === self.location.origin && url.pathname.startsWith(new URL('/api/', self.registration.scope).pathname)) {
    if (request.method === 'GET' || request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH' || request.method === 'DELETE') {
      event.respondWith((async () => {
        try {
          const res = await fetch(request);
          setOffline(false);
          return res;
        } catch {
          setOffline(true);
          return new Response(JSON.stringify({ offline: true }), { status: 503, headers: { 'Content-Type': 'application/json' } });
        }
      })());
      return;
    }
  }

  if (request.mode === 'navigate') {
    // Network-first for navigations with scope-aware fallbacks
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(RUNTIME);
          cache.put(request, response.clone());
          setOffline(false);
          return response;
        } catch {
          setOffline(true);
          const precache = await caches.open(PRECACHE);
          const cachedApp =
            (await precache.match(INDEX_PATH)) || (await precache.match(ROOT_PATH));
          return (
            cachedApp ||
            (await precache.match(OFFLINE_PATH)) ||
            new Response('Offline', { status: 503 })
          );
        }
      })()
    );
    return;
  }

  // Static assets: try cache first, then network (scope-aware lookup)
  if (url.origin === self.location.origin) {
    const normalizedPath = url.pathname;
    if (normalizedPath.endsWith('/config.js')) {
      // Always fetch fresh config
      event.respondWith((async () => {
        try {
          const res = await fetch(request, { cache: 'no-store' });
          setOffline(false);
          return res;
        } catch {
          setOffline(true);
          return new Response('', { status: 503 });
        }
      })());
      return;
    }
    // Consider query-stripped matches as pre-cacheable
    const isPrecacheAsset = PRECACHE_URLS.includes(normalizedPath) || PRECACHE_URLS.includes(stripQuery(normalizedPath));
    if (isPrecacheAsset) {
      event.respondWith(
        (async () => {
          const cache = await caches.open(PRECACHE);
          const exact = await cache.match(request);
          if (exact) return exact;
          const noQuery = await cache.match(new Request(stripQuery(normalizedPath), { cache: 'reload' }));
          if (noQuery) return noQuery;
          // Network fallback with status tracking
          try {
            const res = await fetch(request);
            setOffline(false);
            return res;
          } catch {
            setOffline(true);
            return new Response('', { status: 503 });
          }
        })()
      );
      return;
    }
  }

  // Default: stale-while-revalidate for same-origin GET with offline fallbacks
  if (request.method === 'GET' && url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME);
        const cached = await cache.match(request);
        try {
          const network = await fetch(request);
          cache.put(request, network.clone());
          setOffline(false);
          return cached || network;
        } catch {
          setOffline(true);
          if (cached) return cached;

          // Offline fallbacks
          const accept = request.headers.get('accept') || '';
          if (accept.includes('text/html') || request.destination === 'document') {
            const precache = await caches.open(PRECACHE);
            return (
              (await precache.match(INDEX_PATH)) ||
              (await precache.match(ROOT_PATH)) ||
              (await precache.match(OFFLINE_PATH)) ||
              new Response('Offline', { status: 503 })
            );
          }
          if (accept.includes('application/json')) {
            return new Response(JSON.stringify({ offline: true }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          return new Response('', { status: 503 });
        }
      })()
    );
  }
});
