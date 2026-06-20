import { Hono } from 'hono';

import { createHomeService } from '#/modules/home';
import type { AppContext } from '#/shared/types/app';

const homeService = createHomeService();

const home = new Hono<AppContext>().get('/', async (c) => {
  const { id: userId } = c.get('user');
  const summary = await homeService.getSummary(userId);
  return c.json(summary);
});

export default home;
