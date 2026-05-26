import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { resolveGoogleMapsUrl } from '~/modules/maps/service';
import type { AppContext } from '~/shared/types/app';
import { resolveMapUrlSchema } from './maps.validators';

const maps = new Hono<AppContext>().post(
  '/resolve',
  zValidator('json', resolveMapUrlSchema),
  async (c) => {
    const { url } = c.req.valid('json');

    try {
      const result = await resolveGoogleMapsUrl(url);
      return c.json(result);
    } catch (error) {
      if (error instanceof Error) {
        return c.json({ error: error.message }, 400);
      }

      throw error;
    }
  },
);

export default maps;
