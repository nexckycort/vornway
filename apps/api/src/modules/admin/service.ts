import type { InternalError } from '@vornway/contracts/errors';
import {
  type AdminFeedbackItem,
  AdminFeedbackNotFound,
  type AdminFeedbackPage,
  type AdminStats,
  type UpdateAdminFeedbackPayload,
} from '@vornway/contracts/modules/admin/contract';
import type { FeedbackPageQuery } from '@vornway/contracts/modules/feedback/contract';
import { Context, Effect, Layer } from 'effect';
import { Database } from '#/infrastructure/database/database';
import { pageArgs, toPage } from '#/infrastructure/database/pagination';
import { adminFeedbackInclude, presentAdminFeedback } from './presenter';

export class Admin extends Context.Service<
  Admin,
  {
    stats(): Effect.Effect<typeof AdminStats.Type, InternalError>;
    listFeedback(
      query: typeof FeedbackPageQuery.Type,
    ): Effect.Effect<typeof AdminFeedbackPage.Type, InternalError>;
    updateFeedback(
      feedbackId: string,
      changes: typeof UpdateAdminFeedbackPayload.Type,
    ): Effect.Effect<
      typeof AdminFeedbackItem.Type,
      AdminFeedbackNotFound | InternalError
    >;
  }
>()('vornway/admin/Admin') {
  static readonly layer = Layer.effect(
    Admin,
    Effect.gen(function* () {
      const database = yield* Database;

      const stats = Effect.fn('Admin.stats')(function* () {
        const [totalUsers, totalGroups] = yield* Effect.all(
          [
            database.use((db) => db.user.count()),
            database.use((db) => db.group.count()),
          ],
          { concurrency: 'unbounded' },
        );
        return { totalUsers, totalGroups };
      });

      const listFeedback = Effect.fn('Admin.listFeedback')(function* (query) {
        const { limit, args } = pageArgs(query);
        const [rows, total] = yield* Effect.all(
          [
            database.use((db) =>
              db.userFeedback.findMany({
                ...args,
                include: adminFeedbackInclude,
              }),
            ),
            database.use((db) => db.userFeedback.count()),
          ],
          { concurrency: 'unbounded' },
        );
        const page = toPage(rows, limit, total);
        return { ...page, data: page.data.map(presentAdminFeedback) };
      });

      const updateFeedback = Effect.fn('Admin.updateFeedback')(function* (
        feedbackId: string,
        changes: typeof UpdateAdminFeedbackPayload.Type,
      ) {
        const updated = yield* database
          .attempt((db) =>
            db.userFeedback.update({
              where: { id: feedbackId },
              data: {
                ...(changes.status ? { status: changes.status } : {}),
                ...(changes.priority !== undefined
                  ? { priority: changes.priority || null }
                  : {}),
              },
              include: adminFeedbackInclude,
            }),
          )
          .pipe(
            Effect.catchTag('DatabaseError', (error) =>
              Effect.gen(function* () {
                if (error.isNotFound) return yield* new AdminFeedbackNotFound();
                return yield* database.internal(error);
              }),
            ),
          );
        return presentAdminFeedback(updated);
      });

      return Admin.of({ stats, listFeedback, updateFeedback });
    }),
  );
}
