import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { runHttpEffect } from '#/shared/effect/run-effect';
import type { AppContext } from '#/shared/types/app';
import {
  createQuickSplitExpenseSchema,
  createQuickSplitSchema,
  listQuickSplitExpensesQuerySchema,
  listRecentQuickSplitExpensesQuerySchema,
  quickSplitParamsSchema,
} from './schema';
import { quickSplitsService } from './service';

const quickSplitExpenses = new Hono<AppContext>()
  .get(
    '/recent',
    zValidator('query', listRecentQuickSplitExpensesQuerySchema),
    async (c) => {
      const query = c.req.valid('query');
      const { id: userId } = c.get('user');

      return runHttpEffect(
        c,
        quickSplitsService.listRecentExpenses({
          ...query,
          userId,
        }),
      );
    },
  )
  .get(
    '/list',
    zValidator('query', listQuickSplitExpensesQuerySchema),
    async (c) => {
      const query = c.req.valid('query');
      const { id: userId } = c.get('user');

      return runHttpEffect(
        c,
        quickSplitsService.listExpenses({
          ...query,
          userId,
        }),
      );
    },
  );

const quickSplits = new Hono<AppContext>()
  .route('/expenses', quickSplitExpenses)
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
