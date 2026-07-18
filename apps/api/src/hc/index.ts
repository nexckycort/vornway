import { hc } from 'hono/client';
import type { AuthedRoutes } from '#/routes/authed/routes';
import type { PublicRoutes } from '#/routes/public/routes';

export type { InferRequestType, InferResponseType } from 'hono/client';
export type { AuthedRoutes, PublicRoutes };

const publicClient = hc<PublicRoutes>('');
export type PublicClient = typeof publicClient;
export const createPublicClient = (
  ...args: Parameters<typeof hc>
): PublicClient => hc<PublicRoutes>(...args);

const authedClient = hc<AuthedRoutes>('');
export type AuthedClient = typeof authedClient;
export const createAuthedClient = (
  ...args: Parameters<typeof hc>
): AuthedClient => hc<AuthedRoutes>(...args);
