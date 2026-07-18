import { hc } from 'hono/client';
import type { UsersRpc } from '#/routes/authed/users/routes';

export type { UsersRpc };

const usersClient = hc<UsersRpc>('');
export type UsersClient = typeof usersClient;

export const createUsersClient = (
  ...args: Parameters<typeof hc>
): UsersClient => hc<UsersRpc>(...args);
