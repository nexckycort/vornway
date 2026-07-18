import { Hono } from 'hono';
import type { ExpensesHealthOperations } from './expenses-health';

export function createExpensesRouter(
  expenseOperations: ExpensesHealthOperations,
): Hono {
  const router = new Hono();

  router.get('/health', async (c) =>
    c.json(await expenseOperations.getHealth()),
  );

  return router;
}
