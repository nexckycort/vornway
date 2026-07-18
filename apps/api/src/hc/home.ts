import { hc } from 'hono/client';
import type { HomeRpc } from '#/routes/authed/home/routes';

export type { HomeRpc };

const homeClient = hc<HomeRpc>('');
export type HomeClient = typeof homeClient;

export const createHomeClient = (...args: Parameters<typeof hc>): HomeClient =>
  hc<HomeRpc>(...args);
