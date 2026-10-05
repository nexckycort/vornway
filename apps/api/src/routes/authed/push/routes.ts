import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { pushNotifications } from '#/infrastructure/push/push-notifications';
import type { AppContext } from '#/shared/types/app';
import {
  nativePushSubscriptionSchema,
  pushSubscriptionSchema,
  revokeNativePushSubscriptionSchema,
  revokePushSubscriptionSchema,
} from './push.validators';

function nativeEndpoint(token: string) {
  return `https://exp.host/--/api/v2/push/send?token=${encodeURIComponent(token)}`;
}

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
        type: 'push.test',
        tag: 'vornway:push-test',
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
  })
  .post(
    '/native-subscriptions',
    zValidator('json', nativePushSubscriptionSchema),
    async (c) => {
      const { id: userId } = c.get('user');
      const payload = c.req.valid('json');
      const subscription = await pushNotifications.storeSubscription({
        userId,
        endpoint: nativeEndpoint(payload.token),
        p256dh: payload.token,
        auth: 'expo',
        userAgent: `expo:${payload.platform ?? 'native'}`,
      });

      return c.json(subscription, 201);
    },
  )
  .delete(
    '/native-subscriptions',
    zValidator('json', revokeNativePushSubscriptionSchema),
    async (c) => {
      const { id: userId } = c.get('user');
      const { token } = c.req.valid('json');
      await pushNotifications.revokeSubscription({
        userId,
        endpoint: nativeEndpoint(token),
      });
      return c.json({ success: true });
    },
  );

export default pushRoutes;
export type PushRpc = typeof pushRoutes;
