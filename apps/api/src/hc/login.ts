import { hc } from 'hono/client';
import type { LoginRpc } from '#/routes/public/login/routes';

export type { LoginRpc };

const loginClient = hc<LoginRpc>('');
export type LoginClient = typeof loginClient;

export const createLoginClient = (
  ...args: Parameters<typeof hc>
): LoginClient => hc<LoginRpc>(...args);
