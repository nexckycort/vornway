import { describe, expect } from 'bun:test';
import { Effect } from 'effect';
import { makeTestApp } from '../../../testkit/app';
import { testEffect } from '../../../testkit/effect';

const json = (response: Response) => Effect.promise(() => response.json());

describe('HTTP edge', () => {
  testEffect('answers 404 for a route nothing serves', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();

      const unknown = yield* app.fetch('/api/anything/else');
      const unknownPost = yield* app.fetch('/oauth/nope', { method: 'POST' });

      expect([unknown.status, unknownPost.status]).toEqual([404, 404]);
    }),
  );

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
});
