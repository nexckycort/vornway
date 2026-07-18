import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import type { AppContext } from '#/shared/types/app';
import { mapRouteErrorResponse } from './maps.errors';
import { resolveMapUrlSchema } from './maps.validators';
import { resolveGoogleMapsUrl } from './resolve-google-maps-url';

export const mapsRoutes = new Hono<AppContext>().post(
  '/resolve',
  zValidator('json', resolveMapUrlSchema),
  async (c) => {
    const { url } = c.req.valid('json');

    try {
      const result = await resolveGoogleMapsUrl(url);
      return c.json(result);
    } catch (error) {
      return mapRouteErrorResponse(c, error);
    }
  },
);

export default mapsRoutes;
export type MapsRpc = typeof mapsRoutes;
