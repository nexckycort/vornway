import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import type { AppContext } from '#/shared/types/app';
import { financeOperations } from './operations';
import {
  createFinanceAccountSchema,
  createFinanceCategorySchema,
  createFinanceTransactionSchema,
  financeAccountListQuerySchema,
  financeAccountParamsSchema,
  financeCategoryParamsSchema,
  financeMovementListQuerySchema,
  financesSummaryQuerySchema,
  financeTransactionListQuerySchema,
  financeTransactionParamsSchema,
  updateFinanceAccountSchema,
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
  .get(
    '/movements',
    zValidator('query', financeMovementListQuerySchema),
    async (c) =>
      c.json(
        await financeOperations.listMovements(
          c.get('user').id,
          c.req.valid('query'),
        ),
      ),
  )
  .get(
    '/accounts',
    zValidator('query', financeAccountListQuerySchema),
    async (c) =>
      c.json(
        await financeOperations.listAccounts(
          c.get('user').id,
          c.req.valid('query'),
        ),
      ),
  )
  .post(
    '/accounts',
    zValidator('json', createFinanceAccountSchema),
    async (c) =>
      c.json(
        await financeOperations.createAccount(
          c.get('user').id,
          c.req.valid('json'),
        ),
        201,
      ),
  )
  .patch(
    '/accounts/:id',
    zValidator('param', financeAccountParamsSchema),
    zValidator('json', updateFinanceAccountSchema),
    async (c) => {
      const result = await financeOperations.updateAccount(
        c.get('user').id,
        c.req.valid('param').id,
        c.req.valid('json'),
      );

      return result
        ? c.json(result)
        : c.json({ error: 'Finance account not found' }, 404);
    },
  )
  .post(
    '/accounts/:id/close',
    zValidator('param', financeAccountParamsSchema),
    async (c) => {
      const result = await financeOperations.closeAccount(
        c.get('user').id,
        c.req.valid('param').id,
      );

      return result
        ? c.json(result)
        : c.json({ error: 'Finance account not found' }, 404);
    },
  )
  .delete(
    '/accounts/:id',
    zValidator('param', financeAccountParamsSchema),
    async (c) => {
      const result = await financeOperations.deleteAccount(
        c.get('user').id,
        c.req.valid('param').id,
      );

      return result
        ? c.json({ ok: true })
        : c.json({ error: 'Finance account not found' }, 404);
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
  .delete(
    '/transactions/:id',
    zValidator('param', financeTransactionParamsSchema),
    async (c) => {
      const result = await financeOperations.deleteTransaction(
        c.get('user').id,
        c.req.valid('param').id,
      );

      return result
        ? c.json({ ok: true })
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
  .delete(
    '/categories/:id',
    zValidator('param', financeCategoryParamsSchema),
    async (c) => {
      const result = await financeOperations.deleteCategory(
        c.get('user').id,
        c.req.valid('param').id,
      );

      return result
        ? c.json({ ok: true })
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
