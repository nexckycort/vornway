import { createPushClient } from '@vornway/api/hc/push';

import { API_URL } from '@/lib/auth-client';

import { fetchWithCredentials } from './fetch';

export const pushClient = createPushClient(`${API_URL}/api/push`, {
  fetch: fetchWithCredentials,
});
