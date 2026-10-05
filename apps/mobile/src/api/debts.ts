import { createDebtsClient } from '@vornway/api/hc/debts';

import { API_URL } from '@/lib/auth-client';

import { fetchWithCredentials } from './fetch';

export const debtsClient = createDebtsClient(`${API_URL}/api/debts`, {
  fetch: fetchWithCredentials,
});
