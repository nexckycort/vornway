import { Effect, Layer, Logger } from 'effect';
import { HttpRouter, HttpServer } from 'effect/http';
import { AppRoutesNoDeps } from '#/app';
import { Auth } from '#/infrastructure/auth/auth';
import { Database, DatabaseClient } from '#/infrastructure/database/database';
import { ErrorCapture } from '#/infrastructure/http/errors';
import { fallbackRoutes } from '#/infrastructure/http/legacy';
import { NotificationInbox } from '#/infrastructure/notifications/inbox';
import { TEST_ORIGIN, testConfig } from './config';
import { testDatabase } from './database';
import {
  makeEmailInbox,
  makeHttp,
  makePush,
  makeStorage,
  type OutboundHandler,
} from './fakes';

type Fetch = (path: string, init?: RequestInit) => Effect.Effect<Response>;

export const makeTestApp = Effect.fn(function* (
  options: {
    readonly http?: OutboundHandler;
    readonly legacy?: (request: Request) => Response | Promise<Response>;
    readonly extraRoutes?: Layer.Layer<
      never,
      never,
      Layer.Services<typeof AppRoutesNoDeps>
    >;
  } = {},
) {
  const db = yield* testDatabase;
  const email = makeEmailInbox();
  const storage = makeStorage();
  const push = makePush();
  const http = makeHttp(options.http);

  const { handler, dispose } = HttpRouter.toWebHandler(
    Layer.mergeAll(
      AppRoutesNoDeps,
      options.extraRoutes ?? Layer.empty,
      options.legacy ? fallbackRoutes(options.legacy) : Layer.empty,
    ).pipe(
      Layer.provide(Auth.layer),
      Layer.provide([
        Database.layer,
        NotificationInbox.layer,
        email.layer,
        storage.layer,
        push.layer,
        http.layer,
        HttpServer.layerServices,
      ]),
      Layer.provide([DatabaseClient.layer, ErrorCapture.layerLog]),
      Layer.provide(testConfig({ DATABASE_URL: db.url })),
      Layer.provideMerge(
        process.env.TEST_LOGS ? Layer.empty : Logger.layer([]),
      ),
    ),
    { disableLogger: true },
  );
  yield* Effect.addFinalizer(() => Effect.promise(dispose));

  const fetch: Fetch = (path, init) =>
    Effect.promise(() =>
      handler(new Request(new URL(path, TEST_ORIGIN).href, init)),
    );

  return {
    db,
    email,
    storage,
    push,
    http,
    fetch,
    device: () => makeDevice(fetch),
  };
});

export type TestApp = Effect.Success<ReturnType<typeof makeTestApp>>;
export type Device = ReturnType<TestApp['device']>;

// Keeps its own cookies like `@better-auth/expo` does, since React Native has no cookie jar.
const makeDevice = (fetch: Fetch) => {
  const cookies = new Map<string, string>();

  const call = (method: string, path: string, json?: object) =>
    Effect.gen(function* () {
      const headers = new Headers({ 'expo-origin': 'vornway://' });
      if (cookies.size > 0) {
        headers.set(
          'cookie',
          [...cookies].map(([name, value]) => `${name}=${value}`).join('; '),
        );
      }
      if (json) headers.set('content-type', 'application/json');

      const response = yield* fetch(path, {
        method,
        headers,
        ...(json && { body: JSON.stringify(json) }),
      });

      for (const cookie of response.headers.getSetCookie()) {
        const [pair = ''] = cookie.split(';');
        const name = pair.slice(0, pair.indexOf('='));
        const value = pair.slice(pair.indexOf('=') + 1);
        if (value && !/max-age=0/i.test(cookie)) cookies.set(name, value);
        else cookies.delete(name);
      }

      const text = yield* Effect.promise(() => response.text());
      return {
        status: response.status,
        body: (text ? JSON.parse(text) : null) as Record<string, unknown>,
      };
    });

  return {
    get: (path: string) => call('GET', path),
    post: (path: string, json: object = {}) => call('POST', path, json),
    put: (path: string, json: object = {}) => call('PUT', path, json),
    patch: (path: string, json: object = {}) => call('PATCH', path, json),
    delete: (path: string, json?: object) => call('DELETE', path, json),
  };
};
