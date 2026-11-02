import { Effect } from 'effect';
import { HttpRouter, HttpServerRequest, HttpServerResponse } from 'effect/http';
import { createHttpApp } from './app/create-http-app';

const hono = createHttpApp();

export const AppRoutes = HttpRouter.add(
  '*',
  '/*',
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const source = request.source;
    if (!(source instanceof Request))
      return HttpServerResponse.text('Not Found', { status: 404 });
    const response = yield* Effect.tryPromise({
      try: async () => await hono.fetch(source),
      catch: () => new Error('Legacy route failed'),
    });
    return HttpServerResponse.fromWeb(response);
  }),
);
