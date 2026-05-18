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

const goalParamsSchema = z.object({
  id: z.string().min(1),
});

const createGoalSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(400).optional(),
  currency: z.string().min(1).max(8),
  targetAmount: z.number().positive(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  installmentCount: z.number().int().positive(),
  installmentAmount: z.number().positive().optional(),
  participants: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        userId: z.string().min(1).optional(),
      }),
    )
    .optional(),
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
).get(
  '/:id',
  zValidator('param', goalParamsSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { id: userId } = c.get('user');

    const goal = await goalsService.getById(userId, id);

    if (!goal) {
      return c.json({ error: 'Meta no encontrada' }, 404);
    }

    return c.json(goal);
  },
).post(
  '/',
  zValidator('json', createGoalSchema),
  async (c) => {
    const data = c.req.valid('json');
    const { id: userId, name: ownerName } = c.get('user');

    const goal = await goalsService.create({
      userId,
      ownerName,
      name: data.name,
      description: data.description,
      currency: data.currency,
      targetAmount: data.targetAmount,
      startDate: data.startDate,
      endDate: data.endDate,
      installmentCount: data.installmentCount,
      installmentAmount: data.installmentAmount,
      participants: data.participants,
    });

    return c.json(goal, 201);
  },
);

export default app;
