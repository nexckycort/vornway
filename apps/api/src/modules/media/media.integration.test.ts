import { describe, expect } from 'bun:test';
import { Effect } from 'effect';
import { makeTestApp } from '../../../testkit/app';
import { testEffect } from '../../../testkit/effect';

const NOT_FOUND = { error: 'Archivo no encontrado' };
const COVER = new Uint8Array([82, 73, 70, 70, 1, 2, 3]);

describe('media', () => {
  testEffect('serves a group file publicly with long-lived caching', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();
      app.storage.objects.set('groups/g1/cover.webp', {
        bytes: COVER,
        contentType: 'image/webp',
      });

      const response = yield* app.fetch('/api/media/groups/g1/cover.webp');

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('image/webp');
      expect(response.headers.get('cache-control')).toBe(
        'public, max-age=31536000, immutable',
      );
      expect(
        new Uint8Array(yield* Effect.promise(() => response.arrayBuffer())),
      ).toEqual(COVER);
    }),
  );

  testEffect('serves nested expense attachments under the same prefix', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();
      app.storage.objects.set('groups/g1/expenses/e1/attachment.webp', {
        bytes: COVER,
        contentType: 'image/png',
      });

      const response = yield* app.fetch(
        '/api/media/groups/g1/expenses/e1/attachment.webp',
      );

      expect([response.status, response.headers.get('content-type')]).toEqual([
        200,
        'image/png',
      ]);
    }),
  );

  testEffect('answers the old not-found body for a missing or empty file', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();
      app.storage.objects.set('groups/empty/cover.webp', {
        bytes: new Uint8Array(),
        contentType: 'image/webp',
      });

      const responses = yield* Effect.all([
        app.fetch('/api/media/groups/missing/cover.webp'),
        app.fetch('/api/media/groups/empty/cover.webp'),
        app.fetch('/api/media/groups/'),
      ]);

      expect(responses.map((response) => response.status)).toEqual([
        404, 404, 404,
      ]);
      expect(
        yield* Effect.promise(() => responses[0]?.json() ?? Promise.resolve()),
      ).toEqual(NOT_FOUND);
    }),
  );

  testEffect('refuses paths that climb out of groups/', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();
      for (const key of [
        'groups/../users/u1/avatar.webp',
        'groups/g1/../users/u1/avatar.webp',
        'groups/g1//cover.webp',
      ]) {
        app.storage.objects.set(key, {
          bytes: COVER,
          contentType: 'image/webp',
        });
      }

      const responses = yield* Effect.all([
        app.fetch('/api/media/groups/%2e%2e/users/u1/avatar.webp'),
        app.fetch('/api/media/groups/g1/..%2Fusers/u1/avatar.webp'),
        app.fetch('/api/media/groups/g1//cover.webp'),
      ]);

      expect(responses.map((response) => response.status)).toEqual([
        404, 404, 404,
      ]);
    }),
  );

  testEffect('only serves files under groups/', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();
      app.storage.objects.set('users/u1/avatar.webp', {
        bytes: COVER,
        contentType: 'image/webp',
      });

      const response = yield* app.fetch('/api/media/users/u1/avatar.webp');

      expect(response.status).toBe(404);
    }),
  );
});
