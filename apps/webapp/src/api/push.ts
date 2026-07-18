import { createPushClient } from '@vornway/api/hc/push';
import { API_URL } from '#/config/env';
import { fetchWithCredentials } from './fetch';

export const pushClient = createPushClient(`${API_URL}/api/push`, {
  fetch: fetchWithCredentials,
});
