import { createGoalsClient } from '@vornway/api/hc/goals';
import { API_URL } from '#/config/env';
import { fetchWithCredentials } from './fetch';

export const goalsClient = createGoalsClient(`${API_URL}/api/goals`, {
  fetch: fetchWithCredentials,
});
