import { InternalError } from '@vornway/contracts/errors';
import { Cause, Effect } from 'effect';
import { ErrorCapture } from '#/infrastructure/http/errors';

export const makeInternalFailure = Effect.gen(function* () {
  const errors = yield* ErrorCapture;
  return (error: unknown) =>
    Effect.gen(function* () {
      const traceId = yield* errors.capture(Cause.fail(error));
      return yield* new InternalError({ traceId });
    });
});
