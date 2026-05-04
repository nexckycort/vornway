import { hc } from 'hono/client';
import type { PublicRoutes } from '~/routes/public/routes';

export type { InferRequestType, InferResponseType } from 'hono/client';

const publicClient = hc<PublicRoutes>('');
export type PublicClient = typeof publicClient;
export const createPublicClient = (
  ...args: Parameters<typeof hc>
): PublicClient => hc<PublicRoutes>(...args);
