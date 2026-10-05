import { createInvitesClient } from '@vornway/api/hc/invites';

import { API_URL } from '@/lib/auth-client';

import { fetchWithCredentials } from './fetch';

export const invitesClient = createInvitesClient(`${API_URL}/api/invites`, {
  fetch: fetchWithCredentials,
});
