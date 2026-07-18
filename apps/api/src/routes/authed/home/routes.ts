import { Hono } from 'hono';

import type { AppContext } from '#/shared/types/app';
import { createHomeSummaryQuery } from './get-home-summary.query';

const homeSummaryQuery = createHomeSummaryQuery();

export const homeRoutes = new Hono<AppContext>().get('/', async (c) => {
  const { id: userId } = c.get('user');
  const summary = await homeSummaryQuery.getSummary(userId);
  return c.json(summary);
});

export default homeRoutes;
export type HomeRpc = typeof homeRoutes;
