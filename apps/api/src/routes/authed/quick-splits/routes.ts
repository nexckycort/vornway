import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { runHttpEffect } from '#/shared/effect/run-effect';
import type { AppContext } from '#/shared/types/app';
import {
  createQuickSplitExpenseSchema,
  createQuickSplitSchema,
  quickSplitParamsSchema,
} from './schema';
import { quickSplitsService } from './service';

const quickSplits = new Hono<AppContext>()
  .post('/', zValidator('json', createQuickSplitSchema), async (c) => {
    const data = c.req.valid('json');
    const { id: userId } = c.get('user');

    return runHttpEffect(
      c,
      quickSplitsService.create({
        ...data,
        userId,
      }),
      201,
    );
  })
  .post(
    '/:id/expenses',
    zValidator('param', quickSplitParamsSchema),
    zValidator('json', createQuickSplitExpenseSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const data = c.req.valid('json');
      const { id: userId } = c.get('user');

      return runHttpEffect(
        c,
        quickSplitsService.createExpense({
          ...data,
          userId,
          quickSplitId: id,
        }),
        201,
      );
    },
  );

export default quickSplits;

export type QuickSplitsAppType = typeof quickSplits;
