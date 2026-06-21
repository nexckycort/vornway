import { hc } from 'hono/client';
import type { FeedbackAppType } from '#/routes/authed/feedback/routes';

const feedbackClient = hc<FeedbackAppType>('');

export type FeedbackClient = typeof feedbackClient;

export const createFeedbackClient = (
  ...args: Parameters<typeof hc>
): FeedbackClient => hc<FeedbackAppType>(...args);
