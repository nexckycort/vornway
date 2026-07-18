import webpush from 'web-push';

import { env } from '#/config/env';
import { db } from '#/infrastructure/database/connection';
import type {
  PushNotificationPayload,
  PushNotifications,
  PushSubscriptionInput,
  StoredPushSubscription,
} from './types';

type PushSubscriptionRecord = {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  revokedAt: Date | null;
};

type DbLike = {
  pushSubscription: {
    upsert: (args: {
      where: { endpoint: string };
      create: {
        userId: string;
        endpoint: string;
        p256dh: string;
        auth: string;
        userAgent: string | null;
        revokedAt: Date | null;
      };
      update: {
        userId: string;
        p256dh: string;
        auth: string;
        userAgent: string | null;
        revokedAt: Date | null;
      };
      select: {
        id: true;
        endpoint: true;
        revokedAt: true;
      };
    }) => Promise<StoredPushSubscription>;
    findMany: (args: {
      where: { userId: { in: string[] }; revokedAt: null };
      select: {
        id: true;
        userId: true;
        endpoint: true;
        p256dh: true;
        auth: true;
        revokedAt: true;
      };
    }) => Promise<PushSubscriptionRecord[]>;
    updateMany: (args: {
      where: { id?: { in: string[] }; endpoint?: string; userId?: string };
      data: { revokedAt: Date };
    }) => Promise<{ count: number }>;
  };
};

type Sender = {
  send: (
    subscription: PushSubscriptionRecord,
    payload: PushNotificationPayload,
  ) => Promise<void>;
};

type Logger = Pick<Console, 'warn' | 'error'>;

type CreatePushNotificationsDeps = {
  db?: DbLike;
  sender?: Sender;
  logger?: Logger;
};

function createDefaultSender(): Sender {
  let vapidConfigured = false;

  function ensureVapidConfigured() {
    if (vapidConfigured) {
      return;
    }

    webpush.setVapidDetails(
      env.VAPID_SUBJECT,
      env.VAPID_PUBLIC_KEY,
      env.VAPID_PRIVATE_KEY,
    );
    vapidConfigured = true;
  }

  return {
    send: async (subscription, payload) => {
      ensureVapidConfigured();
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        JSON.stringify(payload),
      );
    },
  };
}

function isRevocationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const statusCode = (error as { statusCode?: unknown }).statusCode;
  return statusCode === 404 || statusCode === 410;
}

export function createPushNotifications(
  deps: CreatePushNotificationsDeps = {},
): PushNotifications {
  const database = deps.db ?? db;
  const sender = deps.sender ?? createDefaultSender();
  const logger = deps.logger ?? console;

  return {
    storeSubscription: async ({
      userId,
      endpoint,
      p256dh,
      auth,
      userAgent,
    }: PushSubscriptionInput) => {
      return database.pushSubscription.upsert({
        where: { endpoint },
        create: {
          userId,
          endpoint,
          p256dh,
          auth,
          userAgent: userAgent ?? null,
          revokedAt: null,
        },
        update: {
          userId,
          p256dh,
          auth,
          userAgent: userAgent ?? null,
          revokedAt: null,
        },
        select: {
          id: true,
          endpoint: true,
          revokedAt: true,
        },
      });
    },
    revokeSubscription: async ({ userId, endpoint }) => {
      await database.pushSubscription.updateMany({
        where: {
          endpoint,
          userId,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    },
    sendToUsers: async (userIds, payload) => {
      if (userIds.length === 0) {
        return;
      }

      const subscriptions = await database.pushSubscription.findMany({
        where: {
          userId: {
            in: Array.from(new Set(userIds)),
          },
          revokedAt: null,
        },
        select: {
          id: true,
          userId: true,
          endpoint: true,
          p256dh: true,
          auth: true,
          revokedAt: true,
        },
      });

      const uniqueSubscriptions = Array.from(
        new Map(
          subscriptions.map((subscription) => [
            subscription.endpoint,
            subscription,
          ]),
        ).values(),
      );

      if (uniqueSubscriptions.length === 0) {
        return;
      }

      const settled = await Promise.allSettled(
        uniqueSubscriptions.map((subscription) =>
          sender.send(subscription, payload),
        ),
      );

      const revokedSubscriptionIds: string[] = [];

      settled.forEach((result, index) => {
        const subscription = uniqueSubscriptions[index];

        if (result.status === 'fulfilled') {
          return;
        }

        if (isRevocationError(result.reason)) {
          revokedSubscriptionIds.push(subscription.id);
          return;
        }

        logger.warn('Push notification delivery failed', {
          endpoint: subscription.endpoint,
          userId: subscription.userId,
          error: result.reason,
        });
      });

      if (revokedSubscriptionIds.length > 0) {
        await database.pushSubscription.updateMany({
          where: {
            id: {
              in: revokedSubscriptionIds,
            },
          },
          data: {
            revokedAt: new Date(),
          },
        });
      }
    },
  };
}

export const pushNotifications = createPushNotifications();
