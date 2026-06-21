import { Effect } from 'effect';
import type { Prisma } from '#/generated/prisma/client';
import type { Database } from '#/infrastructure/database/context';
import {
  deleteFeedbackAttachment,
  resolveFeedbackAttachmentUrl,
  uploadFeedbackAttachment,
} from '#/modules/feedback/attachment.service';
import type { WithUserId } from '#/shared/types/app';
import {
  FeedbackCreateError,
  FeedbackDeleteError,
  FeedbackListError,
  FeedbackNotFoundError,
} from './errors';
import { type FeedbackRow, feedbackRepository } from './repository';
import type {
  CreateFeedbackInput,
  FeedbackIdParamInput,
  ListFeedbackQueryInput,
  ListFeedbackResult,
  UserFeedbackItem,
  UserFeedbackMetadata,
} from './schema';

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

function mapFeedbackRow(row: FeedbackRow): UserFeedbackItem {
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

export const feedbackService = {
  create: ({
    userId,
    type,
    title,
    description,
    priority,
    metadata,
    images,
  }: WithUserId<CreateFeedbackInput>) =>
    Effect.gen(function* () {
      const baseMetadata = normalizeMetadata(metadata);
      const normalizedPriority = priority?.trim() || null;

      const created = yield* Effect.tryPromise({
        try: () =>
          feedbackRepository.create({
            userId,
            type,
            title: title.trim(),
            description: description.trim(),
            priority: normalizedPriority,
            metadata: baseMetadata as Prisma.InputJsonValue,
          }),
        catch: (cause) => new FeedbackCreateError({ cause }),
      });

      if (!images?.length) {
        return mapFeedbackRow(created);
      }

      const attachments = yield* Effect.all(
        images.map((image, index) =>
          Effect.tryPromise({
            try: async () => ({
              url: await uploadFeedbackAttachment({
                userId,
                feedbackId: created.id,
                index,
                dataUrl: image.dataUrl,
              }),
            }),
            catch: (cause) => new FeedbackCreateError({ cause }),
          }),
        ),
        { concurrency: 'unbounded' },
      );

      const updatedMetadata = {
        ...baseMetadata,
        attachments,
      } satisfies UserFeedbackMetadata;

      const updated = yield* Effect.tryPromise({
        try: () =>
          feedbackRepository.updateMetadata({
            feedbackId: created.id,
            metadata: updatedMetadata as Prisma.InputJsonValue,
          }),
        catch: (cause) => new FeedbackCreateError({ cause }),
      });

      return mapFeedbackRow(updated);
    }).pipe(Effect.withSpan('feedback.create')),

  listForUser: ({
    userId,
    limit,
    cursor,
  }: WithUserId<ListFeedbackQueryInput>): Effect.Effect<
    ListFeedbackResult,
    FeedbackListError,
    Database
  > =>
    Effect.gen(function* () {
      const { rows, total } = yield* Effect.tryPromise({
        try: () =>
          feedbackRepository.listForUser({
            userId,
            limit,
            cursor: cursor ?? null,
          }),
        catch: (cause) => new FeedbackListError({ cause }),
      });

      const hasNextPage = rows.length > limit;
      const data = hasNextPage ? rows.slice(0, limit) : rows;
      const nextCursor = hasNextPage ? (data.at(-1)?.id ?? null) : null;

      return {
        data: data.map(mapFeedbackRow),
        pagination: {
          limit,
          total,
          nextCursor,
        },
      };
    }).pipe(Effect.withSpan('feedback.list_for_user')),

  delete: ({ userId, feedbackId }: WithUserId<FeedbackIdParamInput>) =>
    Effect.gen(function* () {
      const existing = yield* Effect.tryPromise({
        try: () =>
          feedbackRepository.findOwned({
            userId,
            feedbackId,
          }),
        catch: (cause) => new FeedbackDeleteError({ cause }),
      });

      if (!existing) {
        return yield* Effect.fail(new FeedbackNotFoundError({ feedbackId }));
      }

      const attachments = readMetadata(existing.metadata).attachments ?? [];

      yield* Effect.all(
        attachments.map((attachment) =>
          Effect.tryPromise({
            try: () => deleteFeedbackAttachment(attachment.url),
            catch: () => undefined,
          }).pipe(Effect.ignore),
        ),
        { concurrency: 'unbounded' },
      );

      yield* Effect.tryPromise({
        try: () => feedbackRepository.delete({ feedbackId: existing.id }),
        catch: (cause) => new FeedbackDeleteError({ cause }),
      });

      return { success: true as const };
    }).pipe(Effect.withSpan('feedback.delete')),
};
