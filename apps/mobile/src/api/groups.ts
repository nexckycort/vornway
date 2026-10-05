import { createGroupsClient } from '@vornway/api/hc/groups';

import { API_URL } from '@/lib/auth-client';

import { fetchWithCredentials } from './fetch';

export const groupsClient = createGroupsClient(`${API_URL}/api/groups`, {
  fetch: fetchWithCredentials,
});
