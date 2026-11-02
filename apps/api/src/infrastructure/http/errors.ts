import {
  ErrorBoundary,
  InternalError,
  InvalidRequest,
  RequestValidation,
} from '@vornway/contracts/errors';
import { Cause, Context, Effect, Layer, Option } from 'effect';
import { HttpApiMiddleware } from 'effect/http-api';

const MAX_REASON_LENGTH = 1024;

export class ErrorCapture extends Context.Service<
  ErrorCapture,
  {
    capture(cause: Cause.Cause<unknown>): Effect.Effect<string>;
  }
>()('vornway/http/ErrorCapture') {
  static readonly layerLog = Layer.succeed(
    ErrorCapture,
    ErrorCapture.of({
      capture: Effect.fn('ErrorCapture.capture')(function* (cause) {
        const span = yield* Effect.option(Effect.currentSpan);
        const traceId = Option.match(span, {
          onNone: () => crypto.randomUUID(),
          onSome: (current) => current.traceId,
        });
        yield* Effect.logError('Unexpected error', cause).pipe(
          Effect.annotateLogs({ traceId }),
        );
        return traceId;
      }),
    }),
  );
}

export const makeInternalFailure = Effect.gen(function* () {
  const errors = yield* ErrorCapture;
  return (error: unknown) =>
    Effect.gen(function* () {
      const traceId = yield* errors.capture(Cause.fail(error));
      return yield* new InternalError({ traceId });
    });
});

export const ErrorBoundaryLive = Layer.effect(
  ErrorBoundary,
  Effect.gen(function* () {
    const errors = yield* ErrorCapture;
    return ErrorBoundary.of((httpEffect) =>
      Effect.catchCause(httpEffect, (cause) =>
        Effect.gen(function* () {
          if (!Cause.hasDies(cause)) return yield* Effect.failCause(cause);
          const traceId = yield* errors.capture(cause);
          return yield* new InternalError({ traceId });
        }),
      ),
    );
  }),
);

export const RequestValidationLive =
  HttpApiMiddleware.layerSchemaErrorTransform(RequestValidation, (error) => {
    const message = error.cause.message.slice(0, MAX_REASON_LENGTH);
    return Effect.logWarning('Invalid request').pipe(
      Effect.annotateLogs({ kind: error.kind, reason: message }),
      Effect.andThen(new InvalidRequest({ message, kind: error.kind })),
    );
  });
