import { Context, Data, Effect, Layer } from 'effect';
import { DatabaseClient } from '#/infrastructure/database/database';
import type {
  PushNotificationPayload,
  PushSubscriptionInput,
  StoredPushSubscription,
} from './types';

export class PushError extends Data.TaggedError('PushError')<{
  readonly cause: unknown;
}> {}

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
      const { createPushNotifications } = yield* Effect.promise(
        () => import('./push-notifications'),
      );
      const push = createPushNotifications({ db: yield* DatabaseClient });
      const attempt = <A>(operation: () => Promise<A>) =>
        Effect.tryPromise({
          try: operation,
          catch: (cause) => new PushError({ cause }),
        });

      return Push.of({
        storeSubscription: Effect.fn('Push.storeSubscription')((input) =>
          attempt(() => push.storeSubscription(input)),
        ),
        revokeSubscription: Effect.fn('Push.revokeSubscription')((input) =>
          attempt(() => push.revokeSubscription(input)),
        ),
        sendToUsers: Effect.fn('Push.sendToUsers')((userIds, payload) =>
          attempt(() => push.sendToUsers(userIds, payload)),
        ),
      });
    }),
  );
}
