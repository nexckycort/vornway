import { createFeedbackClient } from '@vornway/api/hc/feedback';
import { API_URL } from '#/config/env';
import { fetchWithCredentials } from './fetch';

export const feedbackClient = createFeedbackClient(`${API_URL}/api/feedback`, {
  fetch: fetchWithCredentials,
});
