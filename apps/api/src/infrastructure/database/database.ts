import { Context, Data, Effect, Layer } from 'effect';
import type { Prisma, PrismaClient } from '#/generated/prisma/client';
import { db } from './connection';

export class DatabaseError extends Data.TaggedError('DatabaseError')<{
  readonly cause: unknown;
}> {}

type Transaction = Prisma.TransactionClient;

export class Database extends Context.Service<
  Database,
  {
    use<A>(
      operation: (client: PrismaClient) => Promise<A>,
    ): Effect.Effect<A, DatabaseError>;
    transaction<A>(
      operation: (client: Transaction) => Promise<A>,
    ): Effect.Effect<A, DatabaseError>;
  }
>()('vornway/Database') {
  static readonly layer = Layer.succeed(
    Database,
    Database.of({
      use: Effect.fn('Database.use')((operation) =>
        Effect.tryPromise({
          try: () => operation(db),
          catch: (cause) => new DatabaseError({ cause }),
        }),
      ),
      transaction: Effect.fn('Database.transaction')((operation) =>
        Effect.tryPromise({
          try: () => db.$transaction(operation),
          catch: (cause) => new DatabaseError({ cause }),
        }),
      ),
    }),
  );
}
