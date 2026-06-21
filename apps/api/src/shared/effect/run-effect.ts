import { Cause, Effect, Exit, Option } from 'effect';
import type { Context, TypedResponse } from 'hono';
import type { Database } from '#/infrastructure/database/context';
import { DatabaseLive } from '#/infrastructure/database/layer';
import type {
  ErrorBody,
  ErrorMetadata,
  ErrorMetadataStatus,
  ErrorStatusOf,
} from '#/shared/errors/error-metadata';

type HttpEffectResponse<A, E> =
  | TypedResponse<A, 200, 'json'>
  | TypedResponse<ErrorBody, ErrorStatusOf<E> | 500, 'json'>;

export const runHttpEffect = async <
  A,
  E extends ErrorMetadata<ErrorMetadataStatus>,
>(
  c: Context,
  effect: Effect.Effect<A, E, Database>,
): Promise<HttpEffectResponse<A, E>> => {
  const exit = await Effect.runPromiseExit(
    effect.pipe(Effect.provide(DatabaseLive)),
  );

  if (Exit.isSuccess(exit)) {
    return c.json(exit.value, 200) as unknown as HttpEffectResponse<A, E>;
  }

  const failure = Cause.failureOption(exit.cause);

  if (Option.isSome(failure)) {
    const error = failure.value;

    return c.json(
      {
        code: error.code,
        message: error.message,
      },
      error.status,
    ) as unknown as HttpEffectResponse<A, E>;
  }

  return c.json(
    {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Error interno del servidor',
    },
    500,
  ) as unknown as HttpEffectResponse<A, E>;
};
