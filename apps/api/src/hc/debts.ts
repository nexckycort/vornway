import { hc } from 'hono/client';
import type { DebtsRpc } from '#/routes/authed/debts/routes';

export type { DebtsRpc };

const debtsClient = hc<DebtsRpc>('');
export type DebtsClient = typeof debtsClient;
export const createDebtsClient = (
  ...args: Parameters<typeof hc>
): DebtsClient => hc<DebtsRpc>(...args);
