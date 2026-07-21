import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import type { AppContext } from '#/shared/types/app';
import { quickSplitOperations } from './quick-split-operations';
import {
  createQuickSplitExpenseSchema,
  createQuickSplitSchema,
  listQuickSplitExpensesQuerySchema,
  quickSplitExpenseParamsSchema,
  quickSplitParamsSchema,
  settleQuickSplitDebtSchema,
} from './schema';

const quickSplitExpenses = new Hono<AppContext>().get(
  '/',
  zValidator('query', listQuickSplitExpensesQuerySchema),
  async (c) => {
    const query = c.req.valid('query');
    const { id: userId } = c.get('user');

    const result = await quickSplitOperations.listExpenses({
      ...query,
      userId,
    });

    return c.json(result);
  },
);

export const quickSplitsRoutes = new Hono<AppContext>()
  .route('/expenses', quickSplitExpenses)
  .post('/', zValidator('json', createQuickSplitSchema), async (c) => {
    const data = c.req.valid('json');
    const { id: userId } = c.get('user');

    const result = await quickSplitOperations.create({
      ...data,
      userId,
    });

    return c.json(result, 201);
  })
  .post(
    '/:id/expenses',
    zValidator('param', quickSplitParamsSchema),
    zValidator('json', createQuickSplitExpenseSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const data = c.req.valid('json');
      const { id: userId } = c.get('user');

      const result = await quickSplitOperations.createExpense({
        ...data,
        userId,
        quickSplitId: id,
      });

      return c.json(result, 201);
    },
  )
  .post(
    '/:id/expenses/:expenseId/settlements',
    zValidator('param', quickSplitExpenseParamsSchema),
    zValidator('json', settleQuickSplitDebtSchema),
    async (c) => {
      const { id, expenseId } = c.req.valid('param');
      const data = c.req.valid('json');
      const { id: userId } = c.get('user');

      const result = await quickSplitOperations.settleDebt({
        ...data,
        userId,
        quickSplitId: id,
        expenseId,
      });

      return c.json(result, 201);
    },
  )
  .put(
    '/:id/expenses/:expenseId',
    zValidator('param', quickSplitExpenseParamsSchema),
    zValidator('json', createQuickSplitExpenseSchema),
    async (c) => {
      const { id, expenseId } = c.req.valid('param');
      const data = c.req.valid('json');
      const { id: userId } = c.get('user');

      const result = await quickSplitOperations.updateExpense({
        ...data,
        userId,
        quickSplitId: id,
        expenseId,
      });

      return c.json(result);
    },
  )
  .get(
    '/:id/expenses/:expenseId',
    zValidator('param', quickSplitExpenseParamsSchema),
    async (c) => {
      const { id, expenseId } = c.req.valid('param');
      const { id: userId } = c.get('user');

      const result = await quickSplitOperations.getExpenseDetail({
        quickSplitId: id,
        expenseId,
        userId,
      });

      return c.json(result);
    },
  )
  .delete(
    '/:id/expenses/:expenseId',
    zValidator('param', quickSplitExpenseParamsSchema),
    async (c) => {
      const { id, expenseId } = c.req.valid('param');
      const { id: userId } = c.get('user');

      const result = await quickSplitOperations.deleteExpense({
        quickSplitId: id,
        expenseId,
        userId,
      });

      return c.json(result);
    },
  );

export default quickSplitsRoutes;

export type QuickSplitsRpc = typeof quickSplitsRoutes;
export type QuickSplitsAppType = QuickSplitsRpc;
