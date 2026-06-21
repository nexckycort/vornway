import { createUsersClient } from '@vornway/api/hc/users';
import { API_URL } from '#/config/env';
import { fetchWithCredentials } from './fetch';

export const usersClient = createUsersClient(`${API_URL}/api/users`, {
  fetch: fetchWithCredentials,
});
