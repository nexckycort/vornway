import { createFinancesClient } from '@vornway/api/hc/finances';
import { API_URL } from '#/config/env';
import { fetchWithCredentials } from './fetch';

export const financesClient = createFinancesClient(`${API_URL}/api/finances`, {
  fetch: fetchWithCredentials,
});
