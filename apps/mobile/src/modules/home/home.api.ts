import { createHomeClient } from '@vornway/api/hc/home';
import { createNotificationsClient } from '@vornway/api/hc/notifications';
import { createQuickSplitsClient } from '@vornway/api/hc/quick-splits';

import { API_URL, authClient } from '@/lib/auth-client';

const authenticatedFetch: typeof fetch = (input, init) => {
  const headers = new Headers(init?.headers);
  const cookie = authClient.getCookie();

  if (cookie) {
    headers.set('Cookie', cookie);
  }

  return fetch(input, { ...init, headers });
};

const rpcOptions = { fetch: authenticatedFetch };

export const homeClient = createHomeClient(`${API_URL}/api/home`, rpcOptions);
export const quickSplitsClient = createQuickSplitsClient(
  `${API_URL}/api/quick-splits`,
  rpcOptions,
);
export const notificationsClient = createNotificationsClient(
  `${API_URL}/api/notifications`,
  rpcOptions,
);
