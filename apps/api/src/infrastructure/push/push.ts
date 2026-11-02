import {
  Context,
  Data,
  Effect,
  Layer,
  Predicate,
  Redacted,
  Result,
} from 'effect';
import { HttpClient, HttpClientRequest } from 'effect/http';
import webpush from 'web-push';
import { env } from '#/config/env';
import { DatabaseClient } from '#/infrastructure/database/database';
import type {
  PushNotificationPayload,
  PushSubscriptionInput,
  StoredPushSubscription,
} from './types';

export class PushError extends Data.TaggedError('PushError')<{
  readonly cause: unknown;
}> {}

class DeliveryError extends Data.TaggedError('DeliveryError')<{
  readonly cause: unknown;
  readonly gone: boolean;
}> {}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const DELIVERY_TIMEOUT = '10 seconds';

export class Push extends Context.Service<
  Push,
  {
    storeSubscription(
      input: PushSubscriptionInput,
    ): Effect.Effect<StoredPushSubscription, PushError>;
    revokeSubscription(input: {
      userId: string;
      endpoint: string;
    }): Effect.Effect<void, PushError>;
    sendToUsers(
      userIds: string[],
      payload: PushNotificationPayload,
    ): Effect.Effect<void, PushError>;
  }
>()('vornway/Push') {
  static readonly layer = Layer.effect(
    Push,
    Effect.gen(function* () {
      const client = yield* DatabaseClient;
      const http = (yield* HttpClient.HttpClient).pipe(
        HttpClient.filterStatusOk,
      );
      const vapid = {
        subject: yield* env.vapidSubject,
        publicKey: yield* env.vapidPublicKey,
        privateKey: Redacted.value(yield* env.vapidPrivateKey),
      };
      const attempt = <A>(operation: () => Promise<A>) =>
        Effect.tryPromise({
          try: operation,
          catch: (cause) => new PushError({ cause }),
        });

      const deliverToExpo = (
        subscription: { readonly p256dh: string },
        payload: PushNotificationPayload,
      ) =>
        http
          .execute(
            HttpClientRequest.post(EXPO_PUSH_URL).pipe(
              HttpClientRequest.bodyJsonUnsafe({
                to: subscription.p256dh,
                title: payload.title,
                body: payload.body,
                sound: 'default',
                data: {
                  url: payload.url,
                  type: payload.type,
                  groupId: payload.groupId,
                  expenseId: payload.expenseId,
                },
              }),
            ),
          )
          .pipe(Effect.asVoid);

      const deliverToBrowser = (
        subscription: {
          readonly endpoint: string;
          readonly p256dh: string;
          readonly auth: string;
        },
        payload: PushNotificationPayload,
      ) =>
        Effect.asVoid(
          Effect.tryPromise(() =>
            webpush.sendNotification(
              {
                endpoint: subscription.endpoint,
                keys: { p256dh: subscription.p256dh, auth: subscription.auth },
              },
              JSON.stringify(payload),
              { vapidDetails: vapid },
            ),
          ),
        );

      const deliver = (
        subscription: {
          readonly endpoint: string;
          readonly p256dh: string;
          readonly auth: string;
          readonly userAgent: string | null;
        },
        payload: PushNotificationPayload,
      ) => {
        const send: Effect.Effect<void, unknown> =
          subscription.userAgent?.startsWith('expo:')
            ? deliverToExpo(subscription, payload)
            : deliverToBrowser(subscription, payload);
        return send.pipe(
          Effect.timeout(DELIVERY_TIMEOUT),
          Effect.mapError(
            (cause) => new DeliveryError({ cause, gone: isGone(cause) }),
          ),
        );
      };

      const storeSubscription = Effect.fn('Push.storeSubscription')(function* (
        input: PushSubscriptionInput,
      ) {
        const userAgent = input.userAgent ?? null;
        return yield* attempt(() =>
          client.pushSubscription.upsert({
            where: { endpoint: input.endpoint },
            create: {
              userId: input.userId,
              endpoint: input.endpoint,
              p256dh: input.p256dh,
              auth: input.auth,
              userAgent,
              revokedAt: null,
            },
            update: {
              userId: input.userId,
              p256dh: input.p256dh,
              auth: input.auth,
              userAgent,
              revokedAt: null,
            },
            select: { id: true, endpoint: true, revokedAt: true },
          }),
        );
      });

      const revokeSubscription = Effect.fn('Push.revokeSubscription')(
        function* ({ userId, endpoint }: { userId: string; endpoint: string }) {
          yield* attempt(() =>
            client.pushSubscription.updateMany({
              where: { endpoint, userId },
              data: { revokedAt: new Date() },
            }),
          );
        },
      );

      const sendToUsers = Effect.fn('Push.sendToUsers')(function* (
        userIds: string[],
        payload: PushNotificationPayload,
      ) {
        if (userIds.length === 0) return;

        const found = yield* attempt(() =>
          client.pushSubscription.findMany({
            where: { userId: { in: [...new Set(userIds)] }, revokedAt: null },
            select: {
              id: true,
              userId: true,
              endpoint: true,
              p256dh: true,
              auth: true,
              userAgent: true,
            },
          }),
        );
        const subscriptions = [
          ...new Map(found.map((row) => [row.endpoint, row])).values(),
        ];

        const outcomes = yield* Effect.forEach(
          subscriptions,
          (subscription) =>
            deliver(subscription, payload).pipe(
              Effect.result,
              Effect.map((result) => ({ subscription, result })),
            ),
          { concurrency: 'unbounded' },
        );

        const gone: string[] = [];
        yield* Effect.forEach(
          outcomes,
          ({ subscription, result }) => {
            if (Result.isSuccess(result)) return Effect.void;
            if (result.failure.gone) {
              gone.push(subscription.id);
              return Effect.void;
            }
            return Effect.logWarning('Push notification delivery failed', {
              endpoint: subscription.endpoint,
              userId: subscription.userId,
              error: result.failure.cause,
            });
          },
          { discard: true },
        );

        if (gone.length === 0) return;
        yield* attempt(() =>
          client.pushSubscription.updateMany({
            where: { id: { in: gone } },
            data: { revokedAt: new Date() },
          }),
        );
      });

      return Push.of({ storeSubscription, revokeSubscription, sendToUsers });
    }),
  );
}

const isGone = (cause: unknown) =>
  Predicate.hasProperty(cause, 'statusCode') &&
  (cause.statusCode === 404 || cause.statusCode === 410);
