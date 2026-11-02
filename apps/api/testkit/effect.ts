import { test } from 'bun:test';
import { Cause, Effect, Exit, type Scope } from 'effect';

export const testEffect = <A, E>(
  name: string,
  body: () => Effect.Effect<A, E, Scope.Scope>,
  timeout?: number,
) =>
  test(
    name,
    async () => {
      const exit = await Effect.runPromiseExit(Effect.scoped(body()));
      if (Exit.isFailure(exit)) throw Cause.squash(exit.cause);
    },
    timeout,
  );
