import type { InternalError } from '@vornway/contracts/errors';
import type { StoredPushSubscription as StoredPushSubscriptionSchema } from '@vornway/contracts/modules/push/contract';
import { Context, Effect, Layer } from 'effect';
import { Push } from '#/infrastructure/push/push';
import { makeInternalFailure } from '../shared/internal-failure';

const nativeEndpoint = (token: string) =>
  `https://exp.host/--/api/v2/push/send?token=${encodeURIComponent(token)}`;

export class PushSubscriptions extends Context.Service<
  PushSubscriptions,
  {
    subscribeWeb(
      userId: string,
      input: {
        readonly endpoint: string;
        readonly keys: { readonly p256dh: string; readonly auth: string };
      },
      userAgent: string | undefined,
    ): Effect.Effect<typeof StoredPushSubscriptionSchema.Type, InternalError>;
    unsubscribeWeb(
      userId: string,
      endpoint: string,
    ): Effect.Effect<void, InternalError>;
    subscribeNative(
      userId: string,
      token: string,
      platform: 'ios' | 'android' | undefined,
    ): Effect.Effect<typeof StoredPushSubscriptionSchema.Type, InternalError>;
    unsubscribeNative(
      userId: string,
      token: string,
    ): Effect.Effect<void, InternalError>;
    sendTest(user: {
      readonly id: string;
      readonly name: string;
      readonly email: string;
    }): Effect.Effect<void>;
  }
>()('vornway/push/PushSubscriptions') {
  static readonly layer = Layer.effect(
    PushSubscriptions,
    Effect.gen(function* () {
      const push = yield* Push;
      const internalFailure = yield* makeInternalFailure;

      const store = Effect.fn('PushSubscriptions.store')(function* (input: {
        readonly userId: string;
        readonly endpoint: string;
        readonly p256dh: string;
        readonly auth: string;
        readonly userAgent?: string | null;
      }) {
        return yield* push
          .storeSubscription(input)
          .pipe(Effect.catchTag('PushError', internalFailure));
      });

      const revoke = Effect.fn('PushSubscriptions.revoke')(function* (
        userId: string,
        endpoint: string,
      ) {
        yield* push
          .revokeSubscription({ userId, endpoint })
          .pipe(Effect.catchTag('PushError', internalFailure));
      });

      const subscribeWeb = Effect.fn('PushSubscriptions.subscribeWeb')(
        function* (userId, input, userAgent) {
          return yield* store({
            userId,
            endpoint: input.endpoint,
            p256dh: input.keys.p256dh,
            auth: input.keys.auth,
            userAgent,
          });
        },
      );

      const unsubscribeWeb = Effect.fn('PushSubscriptions.unsubscribeWeb')(
        function* (userId, endpoint) {
          yield* revoke(userId, endpoint);
        },
      );

      const subscribeNative = Effect.fn('PushSubscriptions.subscribeNative')(
        function* (userId, token, platform) {
          return yield* store({
            userId,
            endpoint: nativeEndpoint(token),
            p256dh: token,
            auth: 'expo',
            userAgent: `expo:${platform ?? 'native'}`,
          });
        },
      );

      const unsubscribeNative = Effect.fn(
        'PushSubscriptions.unsubscribeNative',
      )(function* (userId, token) {
        yield* revoke(userId, nativeEndpoint(token));
      });

      const sendTest = Effect.fn('PushSubscriptions.sendTest')(
        function* (user) {
          yield* push
            .sendToUsers([user.id], {
              title: 'Push notifications enabled',
              body: `Hi ${user.name.trim() || user.email || 'Usuario'}, this is a test notification from Vornway.`,
              url: '/profile',
              type: 'push.test',
              tag: 'vornway:push-test',
              groupId: 'test',
              expenseId: 'test',
            })
            .pipe(
              Effect.catchTag('PushError', (error) =>
                Effect.logWarning('Push test notification failed', {
                  userId: user.id,
                  error,
                }),
              ),
            );
        },
      );

      return PushSubscriptions.of({
        subscribeWeb,
        unsubscribeWeb,
        subscribeNative,
        unsubscribeNative,
        sendTest,
      });
    }),
  );
}
