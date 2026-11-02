import { Context, Data, Effect, Layer } from 'effect';
import { DatabaseClient } from '#/infrastructure/database/database';
import type { ListNotificationsResult, NotificationInput } from './types';

export class NotificationInboxError extends Data.TaggedError(
  'NotificationInboxError',
)<{
  readonly cause: unknown;
}> {}

export class NotificationInbox extends Context.Service<
  NotificationInbox,
  {
    createForUsers(
      input: NotificationInput,
    ): Effect.Effect<void, NotificationInboxError>;
    listForUser(input: {
      userId: string;
      limit: number;
      cursor: string | null;
    }): Effect.Effect<ListNotificationsResult, NotificationInboxError>;
    markAllAsRead(userId: string): Effect.Effect<void, NotificationInboxError>;
  }
>()('vornway/NotificationInbox') {
  static readonly layer = Layer.effect(
    NotificationInbox,
    Effect.gen(function* () {
      const { createNotificationInbox } = yield* Effect.promise(
        () => import('./notification-inbox'),
      );
      const inbox = createNotificationInbox(yield* DatabaseClient);
      const attempt = <A>(operation: () => Promise<A>) =>
        Effect.tryPromise({
          try: operation,
          catch: (cause) => new NotificationInboxError({ cause }),
        });

      return NotificationInbox.of({
        createForUsers: Effect.fn('NotificationInbox.createForUsers')((input) =>
          attempt(() => inbox.createForUsers(input)),
        ),
        listForUser: Effect.fn('NotificationInbox.listForUser')((input) =>
          attempt(() => inbox.listForUser(input)),
        ),
        markAllAsRead: Effect.fn('NotificationInbox.markAllAsRead')((userId) =>
          attempt(() => inbox.markAllAsRead(userId)),
        ),
      });
    }),
  );
}
