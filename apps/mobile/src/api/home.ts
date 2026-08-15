import { createHomeClient } from '@vornway/api/hc/home';

import { API_URL } from '@/lib/auth-client';

import { fetchWithCredentials } from './fetch';

export const homeClient = createHomeClient(`${API_URL}/api/home`, {
  fetch: fetchWithCredentials,
});
