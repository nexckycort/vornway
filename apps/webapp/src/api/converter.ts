import { createConverterClient } from '@vornway/api/hc/converter';
import { API_URL } from '#/config/env';
import { fetchWithCredentials } from './fetch';

export const converterClient = createConverterClient(
  `${API_URL}/api/converter`,
  {
    fetch: fetchWithCredentials,
  },
);
