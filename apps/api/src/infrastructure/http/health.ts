import { Effect } from 'effect';
import { HttpRouter, HttpServerResponse } from 'effect/http';

// build.ts replaces this literal expression at compile time.
const version = process.env.APP_VERSION ?? 'unknown';

export const HealthRoutes = HttpRouter.use((router) =>
  Effect.gen(function* () {
    yield* router.add(
      'GET',
      '/',
      Effect.succeed(
        HttpServerResponse.jsonUnsafe({ service: 'vornway-api', status: 'ok' }),
      ),
    );
    yield* router.add(
      'GET',
      '/version',
      Effect.succeed(HttpServerResponse.jsonUnsafe({ version })),
    );
  }),
);
