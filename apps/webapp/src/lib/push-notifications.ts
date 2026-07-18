import { pushClient } from '#/api/push';
import { API_URL, VAPID_PUBLIC_KEY } from '#/config/env';

type PushPermissionStatus =
  | 'unsupported'
  | 'permission-required'
  | 'enabled'
  | 'blocked';

function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

function base64UrlToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) {
    return null;
  }

  const registration = await navigator.serviceWorker.register('/sw.js', {
    scope: '/',
  });

  void registration.update();

  return registration;
}

export async function getPushNotificationStatus(): Promise<PushPermissionStatus> {
  if (!isPushSupported()) {
    return 'unsupported';
  }

  if (Notification.permission === 'denied') {
    return 'blocked';
  }

  const registration = await registerPushServiceWorker();
  if (!registration) {
    return 'unsupported';
  }

  const subscription = await registration.pushManager.getSubscription();

  if (subscription && Notification.permission === 'granted') {
    return 'enabled';
  }

  return 'permission-required';
}

async function syncSubscriptionWithBackend(subscription: PushSubscription) {
  const subscriptionData = subscription.toJSON() as {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  const endpoint = pushClient.subscriptions.$post;

  const response = await endpoint({
    json: {
      endpoint: subscriptionData.endpoint,
      keys: {
        p256dh: subscriptionData.keys.p256dh,
        auth: subscriptionData.keys.auth,
      },
    },
  });

  if (!response.ok) {
    throw new Error('No se pudo registrar la suscripción push');
  }
}

async function sendPushTestNotification() {
  const endpoint = pushClient.test.$post;
  const response = await endpoint({});

  if (!response.ok) {
    throw new Error('No se pudo enviar la notificación de prueba');
  }
}

async function revokePushSubscription(subscription: PushSubscription) {
  if (!API_URL) {
    throw new Error('Falta API_URL');
  }

  const subscriptionData = subscription.toJSON() as {
    endpoint: string;
  };

  const response = await fetch(
    `${API_URL.replace(/\/$/, '')}/api/push/subscriptions`,
    {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint: subscriptionData.endpoint,
      }),
    },
  );

  if (!response.ok) {
    throw new Error('No se pudo desactivar la suscripción push');
  }
}

export async function enablePushNotifications(): Promise<PushPermissionStatus> {
  if (!isPushSupported()) {
    return 'unsupported';
  }

  const registration = await registerPushServiceWorker();
  if (!registration) {
    return 'unsupported';
  }

  const permission = await Notification.requestPermission();

  if (permission === 'denied') {
    return 'blocked';
  }

  if (permission !== 'granted') {
    return 'permission-required';
  }

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    if (!VAPID_PUBLIC_KEY) {
      throw new Error('Falta la clave pública VAPID');
    }

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(
        VAPID_PUBLIC_KEY,
      ).buffer.slice(0) as ArrayBuffer,
    });
  }

  await syncSubscriptionWithBackend(subscription);
  try {
    await sendPushTestNotification();
  } catch (error) {
    console.warn('No se pudo enviar la notificación de prueba', error);
  }

  return 'enabled';
}

export async function disablePushNotifications(): Promise<PushPermissionStatus> {
  if (!isPushSupported()) {
    return 'unsupported';
  }

  const registration = await registerPushServiceWorker();
  if (!registration) {
    return 'unsupported';
  }

  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await revokePushSubscription(subscription);
    await subscription.unsubscribe();
  }

  if (Notification.permission === 'denied') {
    return 'blocked';
  }

  return 'permission-required';
}
