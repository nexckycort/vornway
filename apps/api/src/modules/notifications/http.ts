import { Api } from '@vornway/contracts/api';
import { CurrentUser } from '@vornway/contracts/modules/auth/contract';
import { Effect, Layer } from 'effect';
import { HttpApiBuilder } from 'effect/http-api';
import { Notifications } from './service';

export const NotificationsHandlers = HttpApiBuilder.group(
  Api,
  'notifications',
  (handlers) =>
    Effect.gen(function* () {
      const notifications = yield* Notifications;
      return handlers
        .handle('list', ({ query }) =>
          Effect.flatMap(CurrentUser, (user) =>
            notifications.list(user.id, query),
          ),
        )
        .handle('readAll', () =>
          Effect.flatMap(CurrentUser, (user) =>
            notifications.markAllRead(user.id),
          ).pipe(Effect.as({ success: true as const })),
        );
    }),
).pipe(Layer.provide(Notifications.layer));
