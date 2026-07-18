import { createInvitesClient } from '@vornway/api/hc/invites';
import { API_URL } from '#/config/env';
import { fetchWithCredentials } from './fetch';

export const invitesClient = createInvitesClient(`${API_URL}/api/invites`, {
  fetch: fetchWithCredentials,
});
