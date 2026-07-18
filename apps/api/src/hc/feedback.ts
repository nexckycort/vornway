import { hc } from 'hono/client';
import type { FeedbackRpc } from '#/routes/authed/feedback/routes';

export type { FeedbackRpc };

const feedbackClient = hc<FeedbackRpc>('');
export type FeedbackClient = typeof feedbackClient;

export const createFeedbackClient = (
  ...args: Parameters<typeof hc>
): FeedbackClient => hc<FeedbackRpc>(...args);
