import { describe, expect } from 'bun:test';
import { Effect } from 'effect';
import { makeTestApp } from '../../../testkit/app';
import { testEffect } from '../../../testkit/effect';
import { signIn } from '../../../testkit/login';

const SHORT_LINK = 'https://maps.app.goo.gl/abc';
const PLACE = 'https://www.google.com/maps/place/Paris+France';

const redirectShortLink = (request: { readonly url: string }) =>
  request.url === SHORT_LINK
    ? new Response(null, { status: 302, headers: { location: PLACE } })
    : new Response('<html></html>', { status: 200 });

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

        expect(app.http.requests).toEqual([]);
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
        const app = yield* makeTestApp({ http: redirectShortLink });
        const ana = yield* signIn(app, 'ana@vornway.test');

        const result = yield* ana.device.post('/api/maps/resolve', {
          url: SHORT_LINK,
        });

        expect(app.http.requests.map((request) => request.url)).toEqual([
          SHORT_LINK,
          PLACE,
        ]);
        expect(result.status).toBe(200);
        expect(result.body).toEqual({
          originalUrl: SHORT_LINK,
          resolvedUrl: PLACE,
          embedUrl: 'https://www.google.com/maps?q=Paris%20France&output=embed',
        });
      }),
  );

  testEffect('answers an internal error when the link cannot be followed', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp({
        http: () => {
          throw new Error('connection refused');
        },
      });
      const ana = yield* signIn(app, 'ana@vornway.test');

      const result = yield* ana.device.post('/api/maps/resolve', {
        url: SHORT_LINK,
      });

      expect(result.status).toBe(500);
      expect(result.body._tag).toBe('InternalError');
    }),
  );
});
