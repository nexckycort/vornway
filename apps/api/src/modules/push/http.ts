import { Api } from '@vornway/contracts/api';
import { CurrentUser } from '@vornway/contracts/modules/auth/contract';
import { Effect, Layer } from 'effect';
import { HttpServerRequest } from 'effect/http';
import { HttpApiBuilder } from 'effect/http-api';
import { PushSubscriptions } from './service';

export const PushHandlers = HttpApiBuilder.group(Api, 'push', (handlers) =>
  Effect.gen(function* () {
    const subscriptions = yield* PushSubscriptions;
    return handlers
      .handle('subscribe', ({ payload }) =>
        Effect.gen(function* () {
          const user = yield* CurrentUser;
          const request = yield* HttpServerRequest.HttpServerRequest;
          return yield* subscriptions.subscribeWeb(
            user.id,
            payload,
            request.headers['user-agent'],
          );
        }),
      )
      .handle('unsubscribe', ({ payload }) =>
        Effect.flatMap(CurrentUser, (user) =>
          subscriptions.unsubscribeWeb(user.id, payload.endpoint),
        ).pipe(Effect.as({ success: true as const })),
      )
      .handle('test', () =>
        Effect.flatMap(CurrentUser, (user) =>
          subscriptions.sendTest(user),
        ).pipe(Effect.as({ success: true as const })),
      )
      .handle('subscribeNative', ({ payload }) =>
        Effect.flatMap(CurrentUser, (user) =>
          subscriptions.subscribeNative(
            user.id,
            payload.token,
            payload.platform,
          ),
        ),
      )
      .handle('unsubscribeNative', ({ payload }) =>
        Effect.flatMap(CurrentUser, (user) =>
          subscriptions.unsubscribeNative(user.id, payload.token),
        ).pipe(Effect.as({ success: true as const })),
      );
  }),
).pipe(Layer.provide(PushSubscriptions.layer));
