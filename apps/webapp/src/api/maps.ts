import { createMapsClient } from '@vornway/api/hc/maps';
import { API_URL } from '#/config/env';
import { fetchWithCredentials } from './fetch';

export const mapsClient = createMapsClient(`${API_URL}/api/maps`, {
  fetch: fetchWithCredentials,
});
