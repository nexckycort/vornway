import { createQuickSplitsClient } from '@vornway/api/hc/quick-splits';

import { API_URL } from '@/lib/auth-client';

import { fetchWithCredentials } from './fetch';

export const quickSplitsClient = createQuickSplitsClient(
  `${API_URL}/api/quick-splits`,
  { fetch: fetchWithCredentials },
);
