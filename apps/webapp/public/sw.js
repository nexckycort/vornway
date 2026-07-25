const buildVersion = new URL(self.location.href).searchParams.get('v') || 'v1';
let CACHE_NAME = `vornway-app-shell-${buildVersion}`;
const APP_CACHE_PREFIX = 'vornway-app-shell-';
const MAX_APP_CACHES = 3;
const IMAGE_CACHE_NAME = 'vornway-images-v1';
const MAX_IMAGE_ENTRIES = 120;
const SETTINGS_CACHE_NAME = 'vornway-settings-v1';
const LOCALE_SETTINGS_KEY = '/__vornway-settings__/locale';

async function readLocale() {
  const cache = await caches.open(SETTINGS_CACHE_NAME);
  const response = await cache.match(LOCALE_SETTINGS_KEY);
  return response ? response.text() : 'es';
}

async function writeLocale(locale) {
  const cache = await caches.open(SETTINGS_CACHE_NAME);
  await cache.put(
    LOCALE_SETTINGS_KEY,
    new Response(locale === 'en' ? 'en' : 'es'),
  );
}

async function closeNotifications(predicate = () => true) {
  const notifications = await self.registration.getNotifications();
  notifications.forEach((notification) => {
    if (predicate(notification)) notification.close();
  });
}

function extractInvitePath(...values) {
  for (const value of values) {
    if (typeof value !== 'string' || !value.trim()) continue;

    const urlMatches = value.match(/https?:\/\/[^\s]+/g) ?? [value.trim()];
    for (const candidate of urlMatches) {
      try {
        const url = new URL(candidate, self.location.origin);
        const segments = url.pathname.split('/').filter(Boolean);
        const inviteCode =
          url.hostname === 'join.vornway.com'
            ? segments[0]
            : url.origin === self.location.origin && segments[0] === 'i'
              ? segments[1]
              : null;

        if (inviteCode && /^[a-zA-Z0-9-]{1,128}$/.test(inviteCode)) {
          return `/i/${inviteCode}`;
        }
      } catch {
        // Continue checking other shared values.
      }
    }
  }

  return null;
}

async function handleShareTarget(request) {
  const formData = await request.formData();
  const title = formData.get('title');
  const text = formData.get('text');
  const url = formData.get('url');
  const invitePath = extractInvitePath(url, text, title);

  return Response.redirect(
    new URL(invitePath ?? '/', self.location.origin),
    303,
  );
}

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

async function pruneImageCache(cache) {
  const keys = await cache.keys();
  const staleKeys = keys.slice(0, Math.max(0, keys.length - MAX_IMAGE_ENTRIES));
  await Promise.all(staleKeys.map((key) => cache.delete(key)));
}

async function cacheImage(request) {
  const cache = await caches.open(IMAGE_CACHE_NAME);
  const cached = await cache.match(request);
  const networkResponse = fetch(request)
    .then(async (response) => {
      if (response.ok || response.type === 'opaque') {
        await cache.put(request, response.clone());
        await pruneImageCache(cache);
      }
      return response;
    })
    .catch(() => cached || new Response('', { status: 504 }));

  return cached || networkResponse;
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
          ...coreAssets.map(
            (asset) => new URL(asset, self.location.origin).href,
          ),
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
    return;
  }

  if (event.data?.type === 'SET_LOCALE') {
    event.waitUntil(writeLocale(event.data.locale));
    return;
  }

  if (event.data?.type === 'CLEAR_NOTIFICATIONS') {
    event.waitUntil(closeNotifications());
    return;
  }

  if (
    event.data?.type === 'NOTIFICATION_RESOLVED' &&
    typeof event.data.url === 'string'
  ) {
    event.waitUntil(
      closeNotifications(
        (notification) => notification.data?.url === event.data.url,
      ),
    );
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (
    request.method === 'POST' &&
    new URL(request.url).pathname === '/share-target'
  ) {
    event.respondWith(handleShareTarget(request));
    return;
  }

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  const isNavigation =
    request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html');

  if (request.destination === 'image') {
    event.respondWith(cacheImage(request));
    return;
  }

  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      if (
        url.pathname === '/manifest.json' ||
        url.pathname === '/manifest.en.json'
      ) {
        try {
          const response = await fetch(request, { cache: 'no-store' });
          if (response?.ok) {
            void cache.put(request, response.clone());
          }
          return response;
        } catch (_error) {
          const cachedManifest = await matchFromAnyCache(request);
          if (cachedManifest) {
            return cachedManifest;
          }
          return fetch(request);
        }
      }

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
    type: 'activity',
    tag: null,
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
    (async () => {
      const locale = await readLocale();
      const tag =
        payload.tag ||
        (payload.groupId
          ? `group:${payload.groupId}:${payload.type || 'activity'}`
          : `vornway:${payload.type || 'activity'}`);

      await self.registration.showNotification(payload.title, {
        body: payload.body,
        icon: '/logo.webp',
        badge: '/favicon.ico',
        tag,
        renotify: true,
        actions: [
          {
            action: 'open',
            title: locale === 'en' ? 'Open' : 'Abrir',
          },
          {
            action: 'dismiss',
            title: locale === 'en' ? 'Dismiss' : 'Descartar',
          },
        ],
        data: {
          url: payload.url,
          type: payload.type,
          tag,
          groupId: payload.groupId,
          expenseId: payload.expenseId,
        },
      });

      try {
        await self.navigator.setAppBadge?.();
      } catch {
        // Badging is optional.
      }
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const data = event.notification.data || {};
  const targetUrl =
    data.url ||
    (data.groupId && data.expenseId
      ? `/groups/${data.groupId}/expenses/${data.expenseId}`
      : '/');
  event.waitUntil(
    (async () => {
      const windowClients = await clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      const existingClient =
        windowClients.find((client) => client.visibilityState === 'visible') ??
        windowClients[0];

      if (existingClient && 'focus' in existingClient) {
        await existingClient.focus();
        existingClient.postMessage({ type: 'NAVIGATE', url: targetUrl });
        return;
      }

      await clients.openWindow?.(targetUrl);
    })(),
  );
});
