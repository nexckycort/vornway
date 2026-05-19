self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('vornway-app-shell-v1').then((cache) =>
      cache.addAll(['/', '/index.html', '/logo.webp', '/favicon.ico']),
    ),
  );
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

  event.respondWith(
    (async () => {
      const cache = await caches.open('vornway-app-shell-v1');

      try {
        const response = await fetch(request);
        if (response && response.ok) {
          void cache.put(request, response.clone());
        }
        return response;
      } catch (_error) {
        const cached = await cache.match(request);
        if (cached) {
          return cached;
        }

        if (request.mode === 'navigate') {
          const rootResponse = await cache.match('/index.html');
          if (rootResponse) {
            return rootResponse;
          }
        }

        throw _error;
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
