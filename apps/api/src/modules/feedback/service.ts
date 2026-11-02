import type { InternalError } from '@vornway/contracts/errors';
import {
  type CreateFeedbackPayload,
  FeedbackCreateFailed,
  type FeedbackItem,
  FeedbackNotFound,
  type FeedbackPage,
} from '@vornway/contracts/modules/feedback/contract';
import type { Cursor } from '@vornway/contracts/schema';
import { Context, Effect, Layer } from 'effect';
import { Database } from '#/infrastructure/database/database';
import { pageArgs } from '#/infrastructure/database/pagination';
import { toCursorPage } from '../shared/page';
import { FeedbackAttachments } from './attachments';
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
      const attachments = yield* FeedbackAttachments;

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
        const page = toCursorPage(rows, limit, total);
        return { ...page, data: page.data.map(presentFeedback) };
      });

      const create = Effect.fn('Feedback.create')(function* (
        userId: string,
        input: typeof CreateFeedbackPayload.Type,
      ) {
        const created = yield* database.use((db) =>
          db.userFeedback.create({
            data: {
              userId,
              type: input.type,
              title: input.title,
              description: input.description,
              ...(input.priority ? { priority: input.priority } : {}),
              metadata: normalizeFeedbackMetadata(input.metadata),
            },
            select: feedbackSelect,
          }),
        );
        if (!input.images || input.images.length === 0)
          return presentFeedback(created);

        const urls = yield* Effect.forEach(
          input.images,
          (image, index) =>
            attachments.upload({
              userId,
              feedbackId: created.id,
              index,
              dataUrl: image.dataUrl,
            }),
          { concurrency: 'unbounded' },
        ).pipe(
          Effect.catchTag('FeedbackAttachmentError', () =>
            Effect.fail(new FeedbackCreateFailed()),
          ),
        );

        const updated = yield* database.use((db) =>
          db.userFeedback.update({
            where: { id: created.id },
            data: {
              metadata: {
                ...normalizeFeedbackMetadata(input.metadata),
                attachments: urls.map((url) => ({ url })),
              },
            },
            select: feedbackSelect,
          }),
        );
        return presentFeedback(updated);
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
              attachments
                .remove(attachment.url)
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
