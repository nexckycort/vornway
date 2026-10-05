import { createMapsClient } from '@vornway/api/hc/maps';

import { API_URL } from '@/lib/auth-client';

import { fetchWithCredentials } from './fetch';

export const mapsClient = createMapsClient(`${API_URL}/api/maps`, {
  fetch: fetchWithCredentials,
});
