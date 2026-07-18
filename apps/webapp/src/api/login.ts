import { createLoginClient } from '@vornway/api/hc/login';
import { API_URL } from '#/config/env';
import { fetchWithCredentials } from './fetch';

export const loginClient = createLoginClient(`${API_URL}/api/login`, {
  fetch: fetchWithCredentials,
});
