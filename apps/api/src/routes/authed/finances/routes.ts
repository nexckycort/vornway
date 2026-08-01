import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import type { AppContext } from '#/shared/types/app';
import { financeOperations } from './operations';
import {
  createFinanceCategorySchema,
  createFinanceTransactionSchema,
  financeCategoryParamsSchema,
  financesSummaryQuerySchema,
  financeTransactionListQuerySchema,
  financeTransactionParamsSchema,
  updateFinanceCategorySchema,
  updateFinanceTransactionSchema,
  upsertFinanceBudgetSchema,
} from './schema';

export const financesRoutes = new Hono<AppContext>()
  .get('/summary', zValidator('query', financesSummaryQuerySchema), async (c) =>
    c.json(
      await financeOperations.summary(c.get('user').id, c.req.valid('query')),
    ),
  )
  .get(
    '/transactions',
    zValidator('query', financeTransactionListQuerySchema),
    async (c) => {
      const summary = await financeOperations.summary(c.get('user').id, {
        currency: 'COP',
      });
      return c.json(
        summary.recentTransactions.slice(0, c.req.valid('query').limit),
      );
    },
  )
  .post(
    '/transactions',
    zValidator('json', createFinanceTransactionSchema),
    async (c) =>
      c.json(
        await financeOperations.createTransaction(
          c.get('user').id,
          c.req.valid('json'),
        ),
        201,
      ),
  )
  .patch(
    '/transactions/:id',
    zValidator('param', financeTransactionParamsSchema),
    zValidator('json', updateFinanceTransactionSchema),
    async (c) => {
      const result = await financeOperations.updateTransaction(
        c.get('user').id,
        c.req.valid('param').id,
        c.req.valid('json'),
      );

      return result
        ? c.json(result)
        : c.json({ error: 'Finance transaction not found' }, 404);
    },
  )
  .post(
    '/categories',
    zValidator('json', createFinanceCategorySchema),
    async (c) =>
      c.json(
        await financeOperations.createCategory(
          c.get('user').id,
          c.req.valid('json'),
        ),
        201,
      ),
  )
  .patch(
    '/categories/:id',
    zValidator('param', financeCategoryParamsSchema),
    zValidator('json', updateFinanceCategorySchema),
    async (c) => {
      const result = await financeOperations.updateCategory(
        c.get('user').id,
        c.req.valid('param').id,
        c.req.valid('json'),
      );

      return result
        ? c.json(result)
        : c.json({ error: 'Finance category not found' }, 404);
    },
  )
  .post('/budgets', zValidator('json', upsertFinanceBudgetSchema), async (c) =>
    c.json(
      await financeOperations.upsertBudget(
        c.get('user').id,
        c.req.valid('json'),
      ),
      201,
    ),
  );

export type FinancesRpc = typeof financesRoutes;
