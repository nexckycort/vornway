type ServiceWorkerNavigationMessage = {
  type: 'NAVIGATE';
  url: string;
};

function getSafeAppPath(value: string): string | null {
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function installServiceWorkerNavigation(
  navigate: (path: string) => void,
): () => void {
  if (!('serviceWorker' in navigator)) return () => undefined;

  const handleMessage = (event: MessageEvent<unknown>) => {
    const data = event.data as Partial<ServiceWorkerNavigationMessage> | null;
    if (data?.type !== 'NAVIGATE' || typeof data.url !== 'string') return;

    const path = getSafeAppPath(data.url);
    if (path) navigate(path);
  };

  navigator.serviceWorker.addEventListener('message', handleMessage);
  return () =>
    navigator.serviceWorker.removeEventListener('message', handleMessage);
}

function postToServiceWorker(message: Record<string, unknown>) {
  if (!('serviceWorker' in navigator)) return;

  const controller = navigator.serviceWorker.controller;
  if (controller) {
    controller.postMessage(message);
    return;
  }

  void navigator.serviceWorker.ready.then((registration) => {
    registration.active?.postMessage(message);
  });
}

export function syncServiceWorkerLocale(locale: 'en' | 'es') {
  postToServiceWorker({ type: 'SET_LOCALE', locale });
}

export function resolveNotificationUrl(url: string) {
  postToServiceWorker({ type: 'NOTIFICATION_RESOLVED', url });
}

export function clearVisibleNotifications() {
  postToServiceWorker({ type: 'CLEAR_NOTIFICATIONS' });
}
