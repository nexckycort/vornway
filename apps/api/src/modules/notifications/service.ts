import type { InternalError } from '@vornway/contracts/errors';
import type { NotificationsPage } from '@vornway/contracts/modules/notifications/contract';
import type { Cursor } from '@vornway/contracts/schema';
import { Context, Effect, Layer } from 'effect';
import { makeInternalFailure } from '#/infrastructure/http/errors';
import { NotificationInbox } from '#/infrastructure/notifications/inbox';

const DEFAULT_LIMIT = 20;

export class Notifications extends Context.Service<
  Notifications,
  {
    list(
      userId: string,
      query: { readonly cursor?: Cursor; readonly limit?: number },
    ): Effect.Effect<typeof NotificationsPage.Type, InternalError>;
    markAllRead(userId: string): Effect.Effect<void, InternalError>;
  }
>()('@vornway/api/modules/notifications/service/Notifications') {
  static readonly layer = Layer.effect(
    Notifications,
    Effect.gen(function* () {
      const inbox = yield* NotificationInbox;
      const internalFailure = yield* makeInternalFailure;

      const list = Effect.fn('Notifications.list')(function* (
        userId: string,
        query: { readonly cursor?: Cursor; readonly limit?: number },
      ) {
        return yield* inbox
          .listForUser({
            userId,
            limit: query.limit ?? DEFAULT_LIMIT,
            cursor: query.cursor ?? null,
          })
          .pipe(Effect.catchTag('NotificationInboxError', internalFailure));
      });

      const markAllRead = Effect.fn('Notifications.markAllRead')(function* (
        userId: string,
      ) {
        yield* inbox
          .markAllAsRead(userId)
          .pipe(Effect.catchTag('NotificationInboxError', internalFailure));
      });

      return Notifications.of({ list, markAllRead });
    }),
  );
}
