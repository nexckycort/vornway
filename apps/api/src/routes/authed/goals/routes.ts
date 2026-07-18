import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import * as z from 'zod';

import type { AppContext } from '#/shared/types/app';
import { createGoalOperations } from './goal-operations';
import { goalRouteErrorResponse } from './goals.errors';

const goalOperations = createGoalOperations();

const goalsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).default(12),
  cursor: z.string().optional(),
  search: z.string().trim().min(1).max(120).optional(),
});

const goalParamsSchema = z.object({
  id: z.string().min(1),
});

const contributionParamsSchema = z.object({
  id: z.string().min(1),
  contributionId: z.string().min(1),
});

const createGoalSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(400).optional(),
  goalType: z
    .enum(['trip', 'gift', 'saving', 'event', 'custom'])
    .default('saving'),
  emoji: z.string().max(16).nullable().optional(),
  coverImageUrl: z.string().max(600).nullable().optional(),
  themeColor: z.string().max(32).nullable().optional(),
  contributionMode: z
    .enum(['manual', 'monthly', 'flexible', 'suggested'])
    .default('manual'),
  currency: z.string().min(1).max(8),
  targetAmount: z.number().positive(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  installmentCount: z.number().int().positive(),
  installmentAmount: z.number().positive().optional(),
  suggestedContributionAmount: z.number().positive().nullable().optional(),
  participants: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        userId: z.string().min(1).optional(),
      }),
    )
    .optional(),
});

const updateGoalSchema = createGoalSchema.partial();

const createGoalContributionSchema = z.object({
  memberId: z.string().min(1),
  amount: z.number().positive(),
  contributedAt: z.coerce.date().optional(),
  notes: z.string().max(400).optional(),
});

const contributionsApp = new Hono<AppContext>()
  .onError((error, c) => goalRouteErrorResponse(c, error))
  .post(
    '/',
    zValidator('param', goalParamsSchema),
    zValidator('json', createGoalContributionSchema),
    async (c) => {
      const { id: goalId } = c.req.valid('param');
      const data = c.req.valid('json');
      const { id: userId } = c.get('user');

      const contribution = await goalOperations.addContribution({
        userId,
        goalId,
        memberId: data.memberId,
        amount: data.amount,
        contributedAt: data.contributedAt,
        notes: data.notes,
      });

      return c.json(contribution, 201);
    },
  )
  .delete(
    '/:contributionId',
    zValidator('param', contributionParamsSchema),
    async (c) => {
      const { id: goalId, contributionId } = c.req.valid('param');
      const { id: userId } = c.get('user');

      const contribution = await goalOperations.deleteContribution({
        userId,
        goalId,
        contributionId,
      });

      return c.json(contribution);
    },
  );

export const goalsRoutes = new Hono<AppContext>()
  .onError((error, c) => goalRouteErrorResponse(c, error))
  .get('/', zValidator('query', goalsQuerySchema), async (c) => {
    const query = c.req.valid('query');
    const { id: userId } = c.get('user');

    const goals = await goalOperations.list(userId, query);
    return c.json(goals);
  })
  .get('/:id', zValidator('param', goalParamsSchema), async (c) => {
    const { id } = c.req.valid('param');
    const { id: userId } = c.get('user');

    const goal = await goalOperations.getById(userId, id);

    if (!goal) {
      return c.json({ error: 'Meta no encontrada' }, 404);
    }

    return c.json(goal);
  })
  .patch(
    '/:id',
    zValidator('param', goalParamsSchema),
    zValidator('json', updateGoalSchema),
    async (c) => {
      const { id: goalId } = c.req.valid('param');
      const data = c.req.valid('json');
      const { id: userId } = c.get('user');

      const goal = await goalOperations.update({
        userId,
        goalId,
        name: data.name,
        description: data.description,
        goalType: data.goalType,
        emoji: data.emoji,
        coverImageUrl: data.coverImageUrl,
        themeColor: data.themeColor,
        contributionMode: data.contributionMode,
        currency: data.currency,
        targetAmount: data.targetAmount,
        startDate: data.startDate,
        endDate: data.endDate,
        installmentCount: data.installmentCount,
        installmentAmount: data.installmentAmount,
        suggestedContributionAmount: data.suggestedContributionAmount,
      });

      return c.json(goal);
    },
  )
  .post('/', zValidator('json', createGoalSchema), async (c) => {
    const data = c.req.valid('json');
    const { id: userId, name: ownerName } = c.get('user');

    const goal = await goalOperations.create({
      userId,
      ownerName,
      name: data.name,
      description: data.description,
      goalType: data.goalType,
      emoji: data.emoji,
      coverImageUrl: data.coverImageUrl,
      themeColor: data.themeColor,
      contributionMode: data.contributionMode,
      currency: data.currency,
      targetAmount: data.targetAmount,
      startDate: data.startDate,
      endDate: data.endDate,
      installmentCount: data.installmentCount,
      installmentAmount: data.installmentAmount,
      suggestedContributionAmount: data.suggestedContributionAmount,
      participants: data.participants,
    });

    return c.json(goal, 201);
  })
  .route('/:id/contributions', contributionsApp);

export default goalsRoutes;
export type GoalsRpc = typeof goalsRoutes;
