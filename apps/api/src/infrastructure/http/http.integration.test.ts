import { describe, expect } from 'bun:test';
import { Effect } from 'effect';
import { makeTestApp } from '../../../testkit/app';
import { testEffect } from '../../../testkit/effect';
import { signIn } from '../../../testkit/login';

const json = (response: Response) => Effect.promise(() => response.json());

describe('HTTP edge', () => {
  testEffect('answers the health and version probes', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();

      expect(yield* json(yield* app.fetch('/'))).toEqual({
        service: 'vornway-api',
        status: 'ok',
      });
      expect(yield* json(yield* app.fetch('/version'))).toEqual({
        version: 'unknown',
      });
    }),
  );

  testEffect('serves the OpenAPI document and the docs page', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();

      const spec = yield* json(yield* app.fetch('/openapi.json'));
      const docs = yield* app.fetch('/docs');

      expect(Object.keys((spec as { paths: object }).paths)).toContain(
        '/api/users/search',
      );
      expect(docs.status).toBe(200);
      expect(docs.headers.get('content-type')).toContain('text/html');
    }),
  );

  testEffect('adds the secure headers and a request id', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();

      const response = yield* app.fetch('/', {
        headers: { 'x-request-id': 'req-123' },
      });
      const generated = yield* app.fetch('/');

      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('x-frame-options')).toBe('SAMEORIGIN');
      expect(response.headers.get('x-request-id')).toBe('req-123');
      expect(generated.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/);
    }),
  );

  testEffect('allows credentialed CORS from the web app origins only', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();
      const preflight = (origin: string) =>
        app.fetch('/api/users/search', {
          method: 'OPTIONS',
          headers: {
            origin,
            'access-control-request-method': 'GET',
          },
        });

      const allowed = yield* preflight('https://app.vornway.com');
      const refused = yield* preflight('https://evil.example');

      expect(allowed.headers.get('access-control-allow-origin')).toBe(
        'https://app.vornway.com',
      );
      expect(allowed.headers.get('access-control-allow-credentials')).toBe(
        'true',
      );
      expect(allowed.headers.get('access-control-max-age')).toBe('600');
      expect(refused.headers.get('access-control-allow-origin')).toBeNull();
    }),
  );

  describe('legacy fallback', () => {
    const legacy = () => new Response('legacy', { status: 200 });

    testEffect('only receives routes the Effect API does not serve', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp({ legacy });
        const ana = yield* signIn(app, 'ana@vornway.test');
        const text = (response: Response) =>
          Effect.promise(() => response.text());

        expect(yield* text(yield* app.fetch('/api/anything/else'))).toBe(
          'legacy',
        );

        const served = [
          '/',
          '/version',
          '/docs',
          '/openapi.json',
          '/api/auth/get-session',
          '/api/users/search?query=ana',
        ];
        for (const path of served) {
          expect(yield* text(yield* app.fetch(path))).not.toBe('legacy');
        }
        expect(
          (yield* ana.device.get('/api/users/search?query=ana')).status,
        ).toBe(200);
      }),
    );

    testEffect('answers a failing legacy route with a generic 500', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp({
          legacy: () => {
            throw new Error('legacy exploded');
          },
        });

        const response = yield* app.fetch('/api/login/mcp');

        expect(response.status).toBe(500);
        expect(yield* json(response)).toEqual({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error interno del servidor',
        });
      }),
    );
  });
});
