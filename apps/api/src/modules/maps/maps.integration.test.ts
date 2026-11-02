import { describe, expect } from 'bun:test';
import { Effect, Layer, Logger } from 'effect';
import { HttpClient, HttpClientResponse } from 'effect/http';
import { ErrorCapture } from '#/infrastructure/http/errors';
import { makeTestApp } from '../../../testkit/app';
import { testEffect } from '../../../testkit/effect';
import { signIn } from '../../../testkit/login';
import { Maps } from './service';

const SHORT_LINK = 'https://maps.app.goo.gl/abc';
const PLACE = 'https://www.google.com/maps/place/Paris+France';

const redirectingClient = (requested: string[]) =>
  HttpClient.make((request) => {
    requested.push(request.url);
    const response =
      request.url === SHORT_LINK
        ? new Response(null, { status: 302, headers: { location: PLACE } })
        : new Response('<html></html>', { status: 200 });
    return Effect.succeed(HttpClientResponse.fromWeb(request, response));
  });

describe('maps', () => {
  testEffect('requires a session', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();

      const result = yield* app.fetch('/api/maps/resolve', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: SHORT_LINK }),
      });

      expect(result.status).toBe(401);
    }),
  );

  testEffect(
    'refuses links that are not Google Maps, without fetching them',
    () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* signIn(app, 'ana@vornway.test');

        const result = yield* ana.device.post('/api/maps/resolve', {
          url: 'https://example.com/place',
        });

        expect(result.status).toBe(400);
        expect(result.body).toEqual({
          _tag: 'GoogleMapsOnly',
          error: 'Solo se permiten enlaces de Google Maps',
        });
      }),
  );

  testEffect('rejects a value that is not a URL', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();
      const ana = yield* signIn(app, 'ana@vornway.test');

      const result = yield* ana.device.post('/api/maps/resolve', {
        url: 'not a url',
      });

      expect(result.status).toBe(400);
      expect(result.body._tag).toBe('InvalidRequest');
    }),
  );

  testEffect(
    'follows the redirects of a short link to the place it names',
    () =>
      Effect.gen(function* () {
        const requested: string[] = [];
        const layer = Maps.layer.pipe(
          Layer.provide(
            Layer.succeed(HttpClient.HttpClient, redirectingClient(requested)),
          ),
          Layer.provide(ErrorCapture.layerLog),
          Layer.provideMerge(
            process.env.TEST_LOGS ? Layer.empty : Logger.layer([]),
          ),
        );

        const result = yield* Effect.gen(function* () {
          const maps = yield* Maps;
          return yield* maps.resolve(SHORT_LINK);
        }).pipe(Effect.provide(layer));

        expect(requested).toEqual([SHORT_LINK, PLACE]);
        expect(result).toEqual({
          originalUrl: SHORT_LINK,
          resolvedUrl: PLACE,
          embedUrl: 'https://www.google.com/maps?q=Paris%20France&output=embed',
        });
      }),
  );
});
