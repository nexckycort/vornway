import { hc } from 'hono/client';
import type { MapsRpc } from '#/routes/authed/maps/routes';

export type { MapsRpc };

const mapsClient = hc<MapsRpc>('');
export type MapsClient = typeof mapsClient;

export const createMapsClient = (...args: Parameters<typeof hc>): MapsClient =>
  hc<MapsRpc>(...args);
