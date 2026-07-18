import { hc } from 'hono/client';
import type { InvitesRpc } from '#/routes/authed/invites/routes';

export type { InvitesRpc };

const invitesClient = hc<InvitesRpc>('');
export type InvitesClient = typeof invitesClient;

export const createInvitesClient = (
  ...args: Parameters<typeof hc>
): InvitesClient => hc<InvitesRpc>(...args);
