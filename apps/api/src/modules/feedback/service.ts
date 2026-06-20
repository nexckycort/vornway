import type { Prisma } from '#/generated/prisma/client';
import { db } from '#/infrastructure/database/connection';
import {
  deleteFeedbackAttachment,
  resolveFeedbackAttachmentUrl,
  uploadFeedbackAttachment,
} from './attachment.service';
import type {
  CreateUserFeedbackInput,
  DeleteUserFeedbackInput,
  ListUserFeedbackInput,
  ListUserFeedbackResult,
  UserFeedbackItem,
  UserFeedbackMetadata,
} from './types';

function normalizeMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!metadata) return {};

  const next = { ...metadata };
  delete next.attachments;
  delete next.imageUrls;
  return next;
}

function readMetadata(metadata: Prisma.JsonValue | null): UserFeedbackMetadata {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }

  const parsed = metadata as UserFeedbackMetadata;
  const attachments = parsed.attachments?.flatMap((attachment) => {
    const resolvedUrl = resolveFeedbackAttachmentUrl(attachment.url);
    return resolvedUrl ? [{ url: resolvedUrl }] : [];
  });

  return {
    ...parsed,
    ...(attachments ? { attachments } : {}),
  };
}

function mapFeedbackRow(row: {
  id: string;
  userId: string;
  type: 'BUG' | 'FEATURE_REQUEST';
  title: string;
  description: string;
  status: 'OPEN' | 'IN_REVIEW' | 'PLANNED' | 'DONE' | 'REJECTED';
  priority: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
}): UserFeedbackItem {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    metadata: readMetadata(row.metadata),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function createFeedbackService() {
  return {
    create: async (
      input: CreateUserFeedbackInput,
    ): Promise<UserFeedbackItem> => {
      const baseMetadata = normalizeMetadata(input.metadata);

      const created = await db.userFeedback.create({
        data: {
          userId: input.userId,
          type: input.type,
          title: input.title.trim(),
          description: input.description.trim(),
          ...(input.priority?.trim()
            ? { priority: input.priority.trim() }
            : {}),
          metadata: baseMetadata as Prisma.InputJsonValue,
        },
        select: {
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
        },
      });

      if (!input.images?.length) {
        return mapFeedbackRow(created);
      }

      const attachments = await Promise.all(
        input.images.map(async (image, index) => ({
          url: await uploadFeedbackAttachment({
            userId: input.userId,
            feedbackId: created.id,
            index,
            dataUrl: image.dataUrl,
          }),
        })),
      );

      const updatedMetadata = {
        ...baseMetadata,
        attachments,
      } satisfies UserFeedbackMetadata;

      const updated = await db.userFeedback.update({
        where: { id: created.id },
        data: {
          metadata: updatedMetadata as Prisma.InputJsonValue,
        },
        select: {
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
        },
      });

      return mapFeedbackRow(updated);
    },
    listForUser: async ({
      userId,
      limit,
      cursor,
    }: ListUserFeedbackInput): Promise<ListUserFeedbackResult> => {
      const safeLimit = Math.max(1, Math.min(50, limit));
      const where = { userId };

      const [rows, total] = await Promise.all([
        db.userFeedback.findMany({
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
        db.userFeedback.count({ where }),
      ]);

      const nextCursor =
        rows.length === safeLimit ? (rows[rows.length - 1]?.id ?? null) : null;

      return {
        data: rows.map(mapFeedbackRow),
        pagination: {
          limit: safeLimit,
          total,
          nextCursor,
        },
      };
    },
    delete: async ({ userId, feedbackId }: DeleteUserFeedbackInput) => {
      const existing = await db.userFeedback.findFirst({
        where: {
          id: feedbackId,
          userId,
        },
        select: {
          id: true,
          metadata: true,
        },
      });

      if (!existing) {
        throw new Error('Reporte no encontrado');
      }

      const attachments = readMetadata(existing.metadata).attachments ?? [];

      await Promise.all(
        attachments.map((attachment) =>
          deleteFeedbackAttachment(attachment.url).catch(() => undefined),
        ),
      );

      await db.userFeedback.delete({
        where: { id: existing.id },
      });
    },
  };
}

export const feedbackService = createFeedbackService();
