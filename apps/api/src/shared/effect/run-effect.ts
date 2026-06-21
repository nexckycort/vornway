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

type HttpSuccessStatus = 200 | 201;

type HttpEffectResponse<A, E, S extends HttpSuccessStatus> =
  | TypedResponse<A, S, 'json'>
  | TypedResponse<ErrorBody, ErrorStatusOf<E> | 500, 'json'>;

export const runHttpEffect = async <
  A,
  E extends ErrorMetadata<ErrorMetadataStatus>,
  S extends HttpSuccessStatus = 200,
>(
  c: Context,
  effect: Effect.Effect<A, E, Database>,
  successStatus: S = 200 as S,
): Promise<HttpEffectResponse<A, E, S>> => {
  const exit = await Effect.runPromiseExit(
    effect.pipe(Effect.provide(DatabaseLive)),
  );

  if (Exit.isSuccess(exit)) {
    return c.json(exit.value, successStatus) as unknown as HttpEffectResponse<
      A,
      E,
      S
    >;
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
    ) as unknown as HttpEffectResponse<A, E, S>;
  }

  return c.json(
    {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Error interno del servidor',
    },
    500,
  ) as unknown as HttpEffectResponse<A, E, S>;
};
