import { createAdminClient } from '@vornway/api/hc/admin';
import { API_URL } from '#/config/env';
import { fetchWithCredentials } from './fetch';

export const adminClient = createAdminClient(`${API_URL}/api/admin`, {
  fetch: fetchWithCredentials,
});
