import { hc } from 'hono/client';
import type { QuickSplitsRpc } from '#/routes/authed/quick-splits/routes';

export type { QuickSplitsRpc };

const quickSplitsClient = hc<QuickSplitsRpc>('');
export type QuickSplitsClient = typeof quickSplitsClient;

export const createQuickSplitsClient = (
  ...args: Parameters<typeof hc>
): QuickSplitsClient => hc<QuickSplitsRpc>(...args);
