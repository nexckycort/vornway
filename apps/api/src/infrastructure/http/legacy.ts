import { Data, Effect, Layer } from 'effect';
import { HttpRouter, HttpServerRequest, HttpServerResponse } from 'effect/http';

class LegacyRouteError extends Data.TaggedError('LegacyRouteError')<{
  readonly cause: unknown;
}> {}

// Wildcard routes lose to every route the Effect API declares, so this only sees what has not been ported yet.
export const fallbackRoutes = (
  fetch: (request: Request) => Response | Promise<Response>,
) =>
  HttpRouter.add(
    '*',
    '/*',
    Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest;
      const source = request.source;
      if (!(source instanceof Request)) {
        return HttpServerResponse.text('Not Found', { status: 404 });
      }
      const response = yield* Effect.tryPromise({
        try: async () => await fetch(source),
        catch: (cause) => new LegacyRouteError({ cause }),
      });
      return HttpServerResponse.fromWeb(response);
    }).pipe(
      Effect.catchTag('LegacyRouteError', (error) =>
        Effect.logError('Legacy route failed', error).pipe(
          Effect.as(
            HttpServerResponse.jsonUnsafe(
              {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Error interno del servidor',
              },
              { status: 500 },
            ),
          ),
        ),
      ),
    ),
  );

export const LegacyRoutes = Layer.unwrap(
  Effect.gen(function* () {
    const { createHttpApp } = yield* Effect.promise(
      () => import('#/app/create-http-app'),
    );
    const hono = createHttpApp();
    return fallbackRoutes((request) => hono.fetch(request));
  }),
);
