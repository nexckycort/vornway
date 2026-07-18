import { createHomeClient } from '@vornway/api/hc/home';
import { API_URL } from '#/config/env';
import { fetchWithCredentials } from './fetch';

export const homeClient = createHomeClient(`${API_URL}/api/home`, {
  fetch: fetchWithCredentials,
});
