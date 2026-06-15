import { Hono } from 'hono';

import { db } from '~/infrastructure/database/connection';
import type { AppContext } from '~/shared/types/app';

const ALLOWED_EMAIL = 'junior110120@gmail.com';

const app = new Hono<AppContext>().get('/stats', async (c) => {
  const { email } = c.get('user');

  if (email?.toLowerCase().trim() !== ALLOWED_EMAIL) {
    return c.json({ error: 'No autorizado' }, 403);
  }

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
