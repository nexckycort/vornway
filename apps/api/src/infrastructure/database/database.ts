import { PrismaPg } from '@prisma/adapter-pg';
import type { InternalError } from '@vornway/contracts/errors';
import { Context, Data, Effect, Layer, Redacted } from 'effect';
import { env } from '#/config/env';
import { Prisma, PrismaClient } from '#/generated/prisma/client';
import { makeInternalFailure } from '#/infrastructure/http/errors';

export class DatabaseError extends Data.TaggedError('DatabaseError')<{
  readonly cause: unknown;
}> {
  get isUniqueViolation() {
    return this.code === 'P2002';
  }

  get isNotFound() {
    return this.code === 'P2025';
  }

  private get code() {
    return this.cause instanceof Prisma.PrismaClientKnownRequestError
      ? this.cause.code
      : undefined;
  }
}

export class DatabaseClient extends Context.Service<
  DatabaseClient,
  PrismaClient
>()('@vornway/api/infrastructure/database/database/DatabaseClient') {
  static readonly layer = Layer.effect(
    DatabaseClient,
    Effect.gen(function* () {
      const url = yield* env.databaseUrl;
      return yield* Effect.acquireRelease(
        Effect.sync(
          () =>
            new PrismaClient({
              adapter: new PrismaPg({ connectionString: Redacted.value(url) }),
            }),
        ),
        (client) =>
          Effect.ignore(Effect.tryPromise(() => client.$disconnect())),
      );
    }),
  );
}

export class Database extends Context.Service<
  Database,
  {
    use<A>(
      operation: (client: PrismaClient) => Promise<A>,
    ): Effect.Effect<A, InternalError>;
    transaction<A>(
      operation: (client: Prisma.TransactionClient) => Promise<A>,
    ): Effect.Effect<A, InternalError>;
    attempt<A>(
      operation: (client: PrismaClient) => Promise<A>,
    ): Effect.Effect<A, DatabaseError>;
    internal(error: DatabaseError): Effect.Effect<never, InternalError>;
  }
>()('@vornway/api/infrastructure/database/database') {
  static readonly layer = Layer.effect(
    Database,
    Effect.gen(function* () {
      const client = yield* DatabaseClient;
      const failInternal = yield* makeInternalFailure;

      const internal = Effect.fn('Database.internal')((error: DatabaseError) =>
        failInternal(error),
      );
      const attempt = <A>(operation: (client: PrismaClient) => Promise<A>) =>
        Effect.tryPromise({
          try: () => operation(client),
          catch: (cause) => new DatabaseError({ cause }),
        });

      return Database.of({
        internal,
        attempt: Effect.fn('Database.attempt')(attempt),
        use: Effect.fn('Database.use')((operation) =>
          attempt(operation).pipe(Effect.catchTag('DatabaseError', internal)),
        ),
        transaction: Effect.fn('Database.transaction')((operation) =>
          attempt((tx) => tx.$transaction(operation)).pipe(
            Effect.catchTag('DatabaseError', internal),
          ),
        ),
      });
    }),
  );
}
