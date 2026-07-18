import { hc } from 'hono/client';
import type { GroupsRpc } from '#/routes/authed/groups/routes';

export type { GroupsRpc };

const groupsClient = hc<GroupsRpc>('');
export type GroupsClient = typeof groupsClient;

export const createGroupsClient = (
  ...args: Parameters<typeof hc>
): GroupsClient => hc<GroupsRpc>(...args);
