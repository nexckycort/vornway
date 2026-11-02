import { Cursor } from '@vornway/contracts/schema';
import { Context, Data, Effect, Layer } from 'effect';
import { DatabaseClient } from '#/infrastructure/database/database';
import { resolveUserImageUrl } from '#/infrastructure/storage/image-urls';
import type {
  ListNotificationsResult,
  NotificationInboxItem,
  NotificationInput,
} from './types';

export class NotificationInboxError extends Data.TaggedError(
  'NotificationInboxError',
)<{
  readonly cause: unknown;
}> {}

const MAX_LIMIT = 50;

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
      const client = yield* DatabaseClient;
      const attempt = <A>(operation: () => Promise<A>) =>
        Effect.tryPromise({
          try: operation,
          catch: (cause) => new NotificationInboxError({ cause }),
        });

      const createForUsers = Effect.fn('NotificationInbox.createForUsers')(
        function* (input: NotificationInput) {
          const userIds = [
            ...new Set(input.userIds.filter((userId) => userId.length > 0)),
          ];
          if (userIds.length === 0) return;

          yield* attempt(() =>
            client.notification.createMany({
              data: userIds.map((userId) => ({
                userId,
                type: input.type,
                title: input.title,
                body: input.body,
                url: input.url,
                ...(input.groupId ? { groupId: input.groupId } : {}),
                ...(input.expenseId ? { expenseId: input.expenseId } : {}),
                ...(input.actorName ? { actorName: input.actorName } : {}),
                ...(input.actorImage
                  ? { actorImage: resolveUserImageUrl(input.actorImage, null) }
                  : {}),
              })),
            }),
          );
        },
      );

      const listForUser = Effect.fn('NotificationInbox.listForUser')(
        function* ({
          userId,
          limit,
          cursor,
        }: {
          userId: string;
          limit: number;
          cursor: string | null;
        }) {
          const take = Math.max(1, Math.min(MAX_LIMIT, limit));
          const [rows, total, unreadCount] = yield* attempt(() =>
            Promise.all([
              client.notification.findMany({
                where: { userId },
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
                take,
              }),
              client.notification.count({ where: { userId } }),
              client.notification.count({ where: { userId, readAt: null } }),
            ]),
          );

          const last = rows.at(-1);
          return {
            data: rows.map(
              (row): NotificationInboxItem => ({
                id: row.id,
                type: row.type,
                title: row.title,
                body: row.body,
                url: row.url,
                groupId: row.groupId,
                expenseId: row.expenseId,
                actorName: row.actorName,
                actorImage: resolveUserImageUrl(row.actorImage, null),
                readAt: row.readAt?.toISOString() ?? null,
                createdAt: row.createdAt.toISOString(),
              }),
            ),
            pagination: {
              limit: take,
              total,
              nextCursor:
                rows.length === take && last ? Cursor.make(last.id) : null,
            },
            unreadCount,
          };
        },
      );

      const markAllAsRead = Effect.fn('NotificationInbox.markAllAsRead')(
        function* (userId: string) {
          yield* attempt(() =>
            client.notification.updateMany({
              where: { userId, readAt: null },
              data: { readAt: new Date() },
            }),
          );
        },
      );

      return NotificationInbox.of({
        createForUsers,
        listForUser,
        markAllAsRead,
      });
    }),
  );
}
