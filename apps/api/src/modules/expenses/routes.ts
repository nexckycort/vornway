import { Hono } from 'hono';
import type { ExpensesService } from './service';

export function createExpensesRouter(service: ExpensesService): Hono {
  const router = new Hono();

  router.get('/health', async (c) => c.json(await service.getHealth()));

  return router;
}
