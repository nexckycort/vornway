import { Hono } from 'hono';

import { db } from '~/infrastructure/database/connection';
import type { AppContext } from '~/shared/types/app';

const app = new Hono<AppContext>().get('/stats', async (c) => {
  const [totalUsers, totalGroups] = await Promise.all([
    db.user.count(),
    db.group.count(),
  ]);

  return c.json({
    totalUsers,
    totalGroups,
  });
});

export default app;
