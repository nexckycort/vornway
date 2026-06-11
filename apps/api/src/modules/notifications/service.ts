import { db } from '~/infrastructure/database/connection';
import { resolveUserImageUrl } from '../users/user-image.service';
import type {
  ListNotificationsResult,
  NotificationInboxItem,
  NotificationService,
} from './types';

function mapNotificationRow(row: {
  id: string;
  type: string;
  title: string;
  body: string;
  url: string;
  groupId: string | null;
  expenseId: string | null;
  actorName: string | null;
  actorImage: string | null;
  readAt: Date | null;
  createdAt: Date;
}): NotificationInboxItem {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    url: row.url,
    groupId: row.groupId,
    expenseId: row.expenseId,
    actorName: row.actorName,
    actorImage: resolveUserImageUrl(row.actorImage, null),
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function createNotificationService(): NotificationService {
  return {
    createForUsers: async (input) => {
      const uniqueUserIds = Array.from(
        new Set(input.userIds.filter((userId) => userId.length > 0)),
      );

      if (uniqueUserIds.length === 0) {
        return;
      }

      await db.notification.createMany({
        data: uniqueUserIds.map((userId) => ({
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
      });
    },
    listForUser: async ({ userId, limit, cursor }) => {
      const safeLimit = Math.max(1, Math.min(50, limit));
      const where = { userId };

      const [rows, total, unreadCount] = await Promise.all([
        db.notification.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          ...(cursor
            ? {
                skip: 1,
                cursor: { id: cursor },
              }
            : {}),
          take: safeLimit,
        }),
        db.notification.count({ where }),
        db.notification.count({
          where: {
            userId,
            readAt: null,
          },
        }),
      ]);

      const nextCursor =
        rows.length === safeLimit ? (rows[rows.length - 1]?.id ?? null) : null;

      return {
        data: rows.map(mapNotificationRow),
        pagination: {
          limit: safeLimit,
          total,
          nextCursor,
        },
        unreadCount,
      } satisfies ListNotificationsResult;
    },
    markAllAsRead: async (userId) => {
      await db.notification.updateMany({
        where: {
          userId,
          readAt: null,
        },
        data: {
          readAt: new Date(),
        },
      });
    },
  };
}

export const notificationService = createNotificationService();
