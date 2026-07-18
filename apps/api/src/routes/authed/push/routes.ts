import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { pushNotifications } from '#/infrastructure/push/push-notifications';
import type { AppContext } from '#/shared/types/app';
import {
  pushSubscriptionSchema,
  revokePushSubscriptionSchema,
} from './push.validators';

export const pushRoutes = new Hono<AppContext>()
  .post(
    '/subscriptions',
    zValidator('json', pushSubscriptionSchema),
    async (c) => {
      const { id: userId } = c.get('user');
      const payload = c.req.valid('json');
      const userAgent = c.req.header('user-agent');

      const subscription = await pushNotifications.storeSubscription({
        userId,
        endpoint: payload.endpoint,
        p256dh: payload.keys.p256dh,
        auth: payload.keys.auth,
        userAgent,
      });

      return c.json(subscription, 201);
    },
  )
  .delete(
    '/subscriptions',
    zValidator('json', revokePushSubscriptionSchema),
    async (c) => {
      const { id: userId } = c.get('user');
      const { endpoint } = c.req.valid('json');

      await pushNotifications.revokeSubscription({
        userId,
        endpoint,
      });

      return c.json({ success: true });
    },
  )
  .post('/test', async (c) => {
    const { id: userId, name, email } = c.get('user');

    try {
      await pushNotifications.sendToUsers([userId], {
        title: 'Push notifications enabled',
        body: `Hi ${name?.trim() || email || 'Usuario'}, this is a test notification from Vornway.`,
        url: '/profile',
        groupId: 'test',
        expenseId: 'test',
      });
    } catch (error) {
      console.warn('Push test notification failed', {
        userId,
        error,
      });
    }

    return c.json({ success: true });
  });

export default pushRoutes;
export type PushRpc = typeof pushRoutes;
