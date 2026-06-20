import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { notificationService } from '#/modules/notifications';
import type { AppContext } from '#/shared/types/app';
import { listNotificationsQuerySchema } from './notifications.validators';

const app = new Hono<AppContext>().get(
  '/',
  zValidator('query', listNotificationsQuerySchema),
  async (c) => {
    const { id: userId } = c.get('user');
    const query = c.req.valid('query');

    if (query.markAsRead) {
      await notificationService.markAllAsRead(userId);
    }

    const result = await notificationService.listForUser({
      userId,
      limit: query.limit,
      cursor: query.cursor ?? null,
    });

    return c.json(result);
  },
);

export default app;
