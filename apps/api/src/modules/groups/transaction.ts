import type { InternalError } from '@vornway/contracts/errors';
import { Effect } from 'effect';
import type { Prisma } from '#/generated/prisma/client';
import type { Database } from '#/infrastructure/database/database';

class Rollback<E> extends Error {
  constructor(readonly reason: E) {
    super('Transaction rolled back');
  }
}

export const rollbackable =
  (database: Database['Service']) =>
  <A, E>(
    operation: (
      tx: Prisma.TransactionClient,
      abort: (reason: E) => never,
    ) => Promise<A>,
  ): Effect.Effect<A, E | InternalError> =>
    database
      .attempt<A>((db) =>
        db.$transaction((tx) =>
          operation(tx, (reason) => {
            throw new Rollback(reason);
          }),
        ),
      )
      .pipe(
        Effect.catchTag(
          'DatabaseError',
          (error): Effect.Effect<never, E | InternalError> =>
            error.cause instanceof Rollback
              ? Effect.fail(error.cause.reason as E)
              : database.internal(error),
        ),
      );
