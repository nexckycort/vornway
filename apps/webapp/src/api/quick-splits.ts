import { createQuickSplitsClient } from '@vornway/api/hc/quick-splits';
import { API_URL } from '#/config/env';
import { fetchWithCredentials } from './fetch';

export const quickSplitsClient = createQuickSplitsClient(
  `${API_URL}/api/quick-splits`,
  {
    fetch: fetchWithCredentials,
  },
);
