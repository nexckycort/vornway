import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { notificationInbox } from '#/infrastructure/notifications/notification-inbox';
import type { AppContext } from '#/shared/types/app';
import { listNotificationsQuerySchema } from './notifications.validators';

export const notificationsRoutes = new Hono<AppContext>()
  .get('/', zValidator('query', listNotificationsQuerySchema), async (c) => {
    const { id: userId } = c.get('user');
    const query = c.req.valid('query');

    const result = await notificationInbox.listForUser({
      userId,
      limit: query.limit,
      cursor: query.cursor ?? null,
    });

    return c.json(result);
  })
  .post('/read-all', async (c) => {
    const { id: userId } = c.get('user');

    await notificationInbox.markAllAsRead(userId);

    return c.json({ success: true });
  });

export default notificationsRoutes;
export type NotificationsRpc = typeof notificationsRoutes;
