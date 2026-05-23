const buildVersion = new URL(self.location.href).searchParams.get('v') || 'v1';
let CACHE_NAME = `vornway-app-shell-${buildVersion}`;
const APP_CACHE_PREFIX = 'vornway-app-shell-';
const MAX_APP_CACHES = 3;

function hashString(value) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash).toString(36);
}

async function matchFromAnyCache(request) {
  const cacheNames = await caches.keys();

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
  }

  return null;
}

async function pruneOldAppCaches() {
  const cacheNames = await caches.keys();
  const appCaches = cacheNames
    .filter((cacheName) => cacheName.startsWith(APP_CACHE_PREFIX))
    .sort();
  const cachesToDelete = appCaches.slice(
    0,
    Math.max(0, appCaches.length - MAX_APP_CACHES),
  );

  await Promise.all(
    cachesToDelete.map((cacheName) => caches.delete(cacheName)),
  );
}

self.addEventListener('install', (event) => {
  self.skipWaiting();

  event.waitUntil(
    (async () => {
      const coreAssets = ['/', '/index.html', '/logo.webp', '/favicon.ico'];
      let assets = [];

      try {
        const response = await fetch('/asset-manifest.json', {
          cache: 'no-store',
        });

        if (response.ok) {
          const manifest = await response.json();
          assets = Array.isArray(manifest?.allFiles)
            ? manifest.allFiles
                .filter(
                  (asset) => typeof asset === 'string' && asset.length > 0,
                )
                .map((asset) => new URL(asset, self.location.origin).href)
            : [];

          if (assets.length > 0) {
            const manifestSignature = hashString(
              JSON.stringify(manifest.allFiles),
            );
            CACHE_NAME = `vornway-app-shell-${buildVersion}-${manifestSignature}`;
          }
        }
      } catch (_error) {
        assets = [];
      }

      const cache = await caches.open(CACHE_NAME);
      const urlsToCache = Array.from(
        new Set([
          ...coreAssets.map((asset) => new URL(asset, self.location.origin).href),
          ...assets,
        ]),
      );

      await Promise.allSettled(
        urlsToCache.map(async (url) => {
          const response = await fetch(url, { cache: 'reload' });
          if (response?.ok) {
            await cache.put(url, response);
          }
        }),
      );
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await pruneOldAppCaches();
      await clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  const isNavigation =
    request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html');

  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      if (isNavigation) {
        try {
          const response = await fetch(request);
          if (response?.ok) {
            void cache.put('/index.html', response.clone());
          }
          return response;
        } catch (_error) {
          const cachedRoot = await cache.match('/index.html');
          if (cachedRoot) {
            return cachedRoot;
          }
        }

        const cachedNavigation = await matchFromAnyCache('/index.html');
        if (cachedNavigation) {
          return cachedNavigation;
        }

        return fetch(request);
      }

      const cached = await cache.match(request);
      if (cached) {
        return cached;
      }

      const cachedFromAnyCache = await matchFromAnyCache(request);
      if (cachedFromAnyCache) {
        return cachedFromAnyCache;
      }

      try {
        const response = await fetch(request);
        if (response?.ok) {
          void cache.put(request, response.clone());
        }
        return response;
      } catch (error) {
        if (request.mode === 'navigate') {
          const rootResponse = await cache.match('/index.html');
          if (rootResponse) {
            return rootResponse;
          }
        }

        throw error;
      }
    })(),
  );
});

self.addEventListener('push', (event) => {
  const fallback = {
    title: 'Vornway',
    body: '',
    url: '/',
    groupId: null,
    expenseId: null,
  };

  let payload = fallback;

  try {
    if (event.data) {
      payload = { ...fallback, ...event.data.json() };
    }
  } catch (_error) {
    payload = fallback;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/logo.webp',
      badge: '/favicon.ico',
      data: {
        url: payload.url,
        groupId: payload.groupId,
        expenseId: payload.expenseId,
      },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const targetUrl =
    data.url ||
    (data.groupId && data.expenseId
      ? `/groups/${data.groupId}/expenses/${data.expenseId}`
      : '/');
  const absoluteUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url === absoluteUrl && 'focus' in client) {
            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }

        return undefined;
      }),
  );
});
