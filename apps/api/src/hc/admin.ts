import { hc } from 'hono/client';
import type { AdminRpc } from '#/routes/authed/admin/routes';

export type { AdminRpc };

const adminClient = hc<AdminRpc>('');
export type AdminClient = typeof adminClient;

export const createAdminClient = (
  ...args: Parameters<typeof hc>
): AdminClient => hc<AdminRpc>(...args);
