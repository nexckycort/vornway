import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import * as z from 'zod';

import { createGoalsService } from '~/modules/goals';
import type { AppContext } from '~/shared/types/app';

const goalsService = createGoalsService();

const goalsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).default(12),
  cursor: z.string().optional(),
});

const app = new Hono<AppContext>().get(
  '/',
  zValidator('query', goalsQuerySchema),
  async (c) => {
    const query = c.req.valid('query');
    const { id: userId } = c.get('user');

    const goals = await goalsService.list(userId, query);
    return c.json(goals);
  },
);

export default app;
