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
