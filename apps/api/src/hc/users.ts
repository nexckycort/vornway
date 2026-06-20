import { hc } from 'hono/client';
import type { UsersAppType } from '#/routes/authed/users/routes';

const usersClient = hc<UsersAppType>('');

export type UsersClient = typeof usersClient;

export const createUsersClient = (
  ...args: Parameters<typeof hc>
): UsersClient => hc<UsersAppType>(...args);
