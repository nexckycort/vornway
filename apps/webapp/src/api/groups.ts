import { createGroupsClient } from '@vornway/api/hc/groups';
import { API_URL } from '#/config/env';
import { fetchWithCredentials } from './fetch';

export const groupsClient = createGroupsClient(`${API_URL}/api/groups`, {
  fetch: fetchWithCredentials,
});
