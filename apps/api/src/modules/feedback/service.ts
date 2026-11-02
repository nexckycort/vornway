import type { InternalError } from '@vornway/contracts/errors';
import {
  type CreateFeedbackPayload,
  FeedbackCreateFailed,
  type FeedbackItem,
  FeedbackNotFound,
  type FeedbackPage,
} from '@vornway/contracts/modules/feedback/contract';
import type { Cursor } from '@vornway/contracts/schema';
import { Context, Effect, Exit, Layer } from 'effect';
import { Database } from '#/infrastructure/database/database';
import { pageArgs, toPage } from '#/infrastructure/database/pagination';
import { Storage } from '#/infrastructure/storage/storage';
import {
  feedbackSelect,
  normalizeFeedbackMetadata,
  presentFeedback,
  readMetadata,
  resolvedAttachments,
} from './presenter';

export class Feedback extends Context.Service<
  Feedback,
  {
    list(
      userId: string,
      query: { readonly cursor?: Cursor; readonly limit?: number },
    ): Effect.Effect<typeof FeedbackPage.Type, InternalError>;
    create(
      userId: string,
      input: typeof CreateFeedbackPayload.Type,
    ): Effect.Effect<
      typeof FeedbackItem.Type,
      FeedbackCreateFailed | InternalError
    >;
    remove(
      userId: string,
      feedbackId: string,
    ): Effect.Effect<
      { readonly success: true },
      FeedbackNotFound | InternalError
    >;
  }
>()('vornway/feedback/Feedback') {
  static readonly layer = Layer.effect(
    Feedback,
    Effect.gen(function* () {
      const database = yield* Database;
      const storage = yield* Storage;

      const list = Effect.fn('Feedback.list')(function* (userId, query) {
        const { limit, args } = pageArgs(query);
        const [rows, total] = yield* Effect.all(
          [
            database.use((db) =>
              db.userFeedback.findMany({
                where: { userId },
                ...args,
                select: feedbackSelect,
              }),
            ),
            database.use((db) => db.userFeedback.count({ where: { userId } })),
          ],
          { concurrency: 'unbounded' },
        );
        const page = toPage(rows, limit, total);
        return { ...page, data: page.data.map(presentFeedback) };
      });

      const create = Effect.fn('Feedback.create')(function* (
        userId: string,
        input: typeof CreateFeedbackPayload.Type,
      ) {
        const feedbackId = crypto.randomUUID();
        const metadata = normalizeFeedbackMetadata(input.metadata);
        const created = yield* Effect.scoped(
          Effect.gen(function* () {
            const urls = yield* Effect.forEach(
              input.images ?? [],
              (image, index) =>
                Effect.acquireRelease(
                  storage.uploadFeedbackImage({
                    userId,
                    feedbackId,
                    index,
                    dataUrl: image.dataUrl,
                  }),
                  (url, exit) =>
                    Exit.isSuccess(exit)
                      ? Effect.void
                      : storage
                          .deleteFeedbackImage(url)
                          .pipe(Effect.ignore({ log: true })),
                ),
              { concurrency: 'unbounded' },
            ).pipe(
              Effect.catchTag('StorageError', () =>
                Effect.fail(new FeedbackCreateFailed()),
              ),
            );
            return yield* database.use((db) =>
              db.userFeedback.create({
                data: {
                  id: feedbackId,
                  userId,
                  type: input.type,
                  title: input.title,
                  description: input.description,
                  ...(input.priority ? { priority: input.priority } : {}),
                  metadata:
                    urls.length === 0
                      ? metadata
                      : {
                          ...metadata,
                          attachments: urls.map((url) => ({ url })),
                        },
                },
                select: feedbackSelect,
              }),
            );
          }),
        );
        return presentFeedback(created);
      });

      const remove = Effect.fn('Feedback.remove')(
        function* (userId, feedbackId) {
          const existing = yield* database.use((db) =>
            db.userFeedback.findFirst({
              where: { id: feedbackId, userId },
              select: { id: true, metadata: true },
            }),
          );
          if (!existing) return yield* new FeedbackNotFound();

          yield* Effect.forEach(
            resolvedAttachments(readMetadata(existing.metadata).attachments),
            (attachment) =>
              storage
                .deleteFeedbackImage(attachment.url)
                .pipe(Effect.ignore({ log: true })),
            { concurrency: 'unbounded', discard: true },
          );
          yield* database.use((db) =>
            db.userFeedback.delete({ where: { id: existing.id } }),
          );
          return { success: true as const };
        },
      );

      return Feedback.of({ list, create, remove });
    }),
  );
}
