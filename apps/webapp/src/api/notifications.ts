import { createNotificationsClient } from '@vornway/api/hc/notifications';
import { API_URL } from '#/config/env';
import { fetchWithCredentials } from './fetch';

export const notificationsClient = createNotificationsClient(
  `${API_URL}/api/notifications`,
  {
    fetch: fetchWithCredentials,
  },
);
