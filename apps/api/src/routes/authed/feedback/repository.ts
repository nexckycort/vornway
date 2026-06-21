import type { Prisma } from '#/generated/prisma/client';
import { db } from '#/infrastructure/database/connection';

export const feedbackSelect = {
  id: true,
  userId: true,
  type: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserFeedbackSelect;

export type FeedbackRow = Prisma.UserFeedbackGetPayload<{
  select: typeof feedbackSelect;
}>;

export const feedbackRepository = {
  create: async (input: {
    userId: string;
    type: FeedbackRow['type'];
    title: string;
    description: string;
    priority?: string | null;
    metadata: Prisma.InputJsonValue;
  }) =>
    db.userFeedback.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        description: input.description,
        ...(input.priority ? { priority: input.priority } : {}),
        metadata: input.metadata,
      },
      select: feedbackSelect,
    }),

  updateMetadata: async (input: {
    feedbackId: string;
    metadata: Prisma.InputJsonValue;
  }) =>
    db.userFeedback.update({
      where: { id: input.feedbackId },
      data: {
        metadata: input.metadata,
      },
      select: feedbackSelect,
    }),

  listForUser: async (input: {
    userId: string;
    limit: number;
    cursor: string | null;
  }) => {
    const where = { userId: input.userId };

    const [rows, total] = await Promise.all([
      db.userFeedback.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        ...(input.cursor
          ? {
              cursor: { id: input.cursor },
              skip: 1,
            }
          : {}),
        take: input.limit + 1,
        select: feedbackSelect,
      }),
      db.userFeedback.count({ where }),
    ]);

    return { rows, total };
  },

  findOwned: async (input: { userId: string; feedbackId: string }) =>
    db.userFeedback.findFirst({
      where: {
        id: input.feedbackId,
        userId: input.userId,
      },
      select: {
        id: true,
        metadata: true,
      },
    }),

  delete: async (input: { feedbackId: string }) =>
    db.userFeedback.delete({
      where: { id: input.feedbackId },
    }),
};
