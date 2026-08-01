import { hc } from 'hono/client';
import type { FinancesRpc } from '#/routes/authed/finances/routes';

export type { FinancesRpc };

const financesClient = hc<FinancesRpc>('');
export type FinancesClient = typeof financesClient;

export const createFinancesClient = (
  ...args: Parameters<typeof hc>
): FinancesClient => hc<FinancesRpc>(...args);
