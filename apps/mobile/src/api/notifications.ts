import { createNotificationsClient } from '@vornway/api/hc/notifications';

import { API_URL } from '@/lib/auth-client';

import { fetchWithCredentials } from './fetch';

export const notificationsClient = createNotificationsClient(
  `${API_URL}/api/notifications`,
  { fetch: fetchWithCredentials },
);
