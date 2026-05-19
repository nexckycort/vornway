self.addEventListener('install', (event) => {
  self.skipWaiting();

  event.waitUntil(
    (async () => {
      const cache = await caches.open('vornway-app-shell-v1');

      await cache.addAll(['/', '/index.html', '/logo.webp', '/favicon.ico']);

      try {
        const response = await fetch('/asset-manifest.json', {
          cache: 'no-store',
        });

        if (!response.ok) {
          return;
        }

        const manifest = await response.json();
        const assets = Array.isArray(manifest?.allFiles)
          ? manifest.allFiles
              .filter((asset) => typeof asset === 'string' && asset.length > 0)
              .map((asset) => new URL(asset, self.location.origin).href)
          : [];

        if (assets.length > 0) {
          await cache.addAll(assets);
        }
      } catch (_error) {
        return;
      }
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open('vornway-app-shell-v1');

    const cached = await cache.match(request);
    if (cached) {
      return cached;
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
  })());
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
