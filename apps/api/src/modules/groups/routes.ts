import { Hono } from 'hono';
import type { GroupsService } from './service';

export function createGroupsRouter(service: GroupsService): Hono {
  const router = new Hono();

  router.get('/health', async (c) => c.json(await service.getHealth()));

  return router;
}
