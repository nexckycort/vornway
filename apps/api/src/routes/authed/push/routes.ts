import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import type { AppContext } from '~/shared/types/app';
import { pushNotificationService } from '~/modules/push';
import { pushSubscriptionSchema } from './push.validators';

const app = new Hono<AppContext>().post(
  '/subscriptions',
  zValidator('json', pushSubscriptionSchema),
  async (c) => {
    const { id: userId } = c.get('user');
    const payload = c.req.valid('json');
    const userAgent = c.req.header('user-agent');

    const subscription = await pushNotificationService.storeSubscription({
      userId,
      endpoint: payload.endpoint,
      p256dh: payload.keys.p256dh,
      auth: payload.keys.auth,
      userAgent,
    });

    return c.json(subscription, 201);
  },
);

export default app;
