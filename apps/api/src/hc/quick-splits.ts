import { hc } from 'hono/client';
import type { QuickSplitsAppType } from '#/routes/authed/quick-splits/routes';

const quickSplitsClient = hc<QuickSplitsAppType>('');

export type QuickSplitsClient = typeof quickSplitsClient;

export const createQuickSplitsClient = (
  ...args: Parameters<typeof hc>
): QuickSplitsClient => hc<QuickSplitsAppType>(...args);
