import { hc } from 'hono/client';
import type { PushRpc } from '#/routes/authed/push/routes';

export type { PushRpc };

const pushClient = hc<PushRpc>('');
export type PushClient = typeof pushClient;

export const createPushClient = (...args: Parameters<typeof hc>): PushClient =>
  hc<PushRpc>(...args);
