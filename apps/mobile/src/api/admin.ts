import { createAdminClient } from '@vornway/api/hc/admin';

import { API_URL } from '@/lib/auth-client';

import { fetchWithCredentials } from './fetch';

export const adminClient = createAdminClient(`${API_URL}/api/admin`, {
  fetch: fetchWithCredentials,
});
