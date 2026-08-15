import { createUsersClient } from '@vornway/api/hc/users';

import { API_URL } from '@/lib/auth-client';

import { fetchWithCredentials } from './fetch';

export const usersClient = createUsersClient(`${API_URL}/api/users`, {
  fetch: fetchWithCredentials,
});
