import { describe, expect } from 'bun:test';
import { Effect } from 'effect';
import { makeTestApp } from '../../../testkit/app';
import { testEffect } from '../../../testkit/effect';
import { signIn } from '../../../testkit/login';

const DATA_URL = 'data:image/png;base64,iVBORw0KGgo=';

describe('users', () => {
  testEffect('require a session', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();

      expect((yield* app.fetch('/api/users/search?query=ana')).status).toBe(
        401,
      );
      expect(
        (yield* app.fetch('/api/users/me/username', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ username: 'ana' }),
        })).status,
      ).toBe(401);
    }),
  );

  describe('search', () => {
    testEffect('finds users by name, username or email, ignoring case', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* signIn(app, 'ana@vornway.test');
        yield* signIn(app, 'bruno@vornway.test');
        yield* ana.device.patch('/api/users/me/username', {
          username: 'ana.travels',
        });

        const byEmail = yield* ana.device.get('/api/users/search?query=BRUNO@');
        const byUsername = yield* ana.device.get(
          '/api/users/search?query=Ana.Trav',
        );

        expect(byEmail.status).toBe(200);
        expect(byEmail.body).toEqual({
          data: [
            {
              id: expect.any(String),
              name: expect.any(String),
              username: null,
              email: 'bruno@vornway.test',
              isCurrentUser: false,
            },
          ],
        });
        expect(byUsername.body.data).toEqual([
          expect.objectContaining({
            id: ana.id,
            username: 'ana.travels',
            isCurrentUser: true,
          }),
        ]);
      }),
    );

    testEffect('returns at most five matches', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* signIn(app, 'user0@vornway.test');
        for (const index of [1, 2, 3, 4, 5, 6]) {
          yield* signIn(app, `user${index}@vornway.test`);
        }

        const result = yield* ana.device.get('/api/users/search?query=vornway');

        expect(result.body.data).toHaveLength(5);
      }),
    );

    testEffect('rejects an empty query', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* signIn(app, 'ana@vornway.test');

        const result = yield* ana.device.get('/api/users/search?query=%20%20');

        expect(result.status).toBe(400);
        expect(result.body._tag).toBe('InvalidRequest');
      }),
    );
  });

  describe('username', () => {
    testEffect('sets the username of the signed-in user only', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* signIn(app, 'ana@vornway.test');
        const bruno = yield* signIn(app, 'bruno@vornway.test');

        const updated = yield* ana.device.patch('/api/users/me/username', {
          username: 'ana.travels',
        });

        expect(updated.status).toBe(200);
        expect(updated.body).toEqual({ id: ana.id, username: 'ana.travels' });
        expect(
          yield* app.db.query('select id, username from "user" order by email'),
        ).toEqual([
          { id: ana.id, username: 'ana.travels' },
          { id: bruno.id, username: null },
        ]);
      }),
    );

    testEffect('refuses a username another user already has', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* signIn(app, 'ana@vornway.test');
        const bruno = yield* signIn(app, 'bruno@vornway.test');
        yield* ana.device.patch('/api/users/me/username', {
          username: 'taken',
        });

        const conflict = yield* bruno.device.patch('/api/users/me/username', {
          username: 'taken',
        });

        expect(conflict.status).toBe(409);
        expect(conflict.body).toEqual({
          _tag: 'UsernameAlreadyTaken',
          code: 'USERNAME_ALREADY_TAKEN',
          message: 'Ese nombre de usuario ya esta en uso',
        });
        expect(
          yield* app.db.query('select username from "user" where id = $1', [
            bruno.id,
          ]),
        ).toEqual([{ username: null }]);
      }),
    );

    testEffect('lets a user keep re-saving their own username', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* signIn(app, 'ana@vornway.test');
        yield* ana.device.patch('/api/users/me/username', { username: 'ana' });

        const again = yield* ana.device.patch('/api/users/me/username', {
          username: 'ana',
        });

        expect(again.status).toBe(200);
      }),
    );

    testEffect('rejects usernames that are not valid', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* signIn(app, 'ana@vornway.test');

        for (const username of ['ab', 'Ana', 'has space', 'x'.repeat(25)]) {
          const result = yield* ana.device.patch('/api/users/me/username', {
            username,
          });
          expect(result.status).toBe(400);
          expect(result.body._tag).toBe('InvalidRequest');
        }
      }),
    );
  });

  describe('image', () => {
    testEffect('stores the avatar of the signed-in user only', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* signIn(app, 'ana@vornway.test');
        const bruno = yield* signIn(app, 'bruno@vornway.test');

        const updated = yield* ana.device.patch('/api/users/me/image', {
          dataUrl: DATA_URL,
        });

        expect(updated.status).toBe(200);
        expect(updated.body.imageUrl).toMatch(
          new RegExp(
            `^https://assets\\.vornway\\.com/users/${ana.id}/avatar\\.webp\\?v=\\d+$`,
          ),
        );
        expect(app.storage.uploads).toEqual([
          { key: `users/${ana.id}/avatar.webp`, dataUrl: DATA_URL },
        ]);
        expect(
          yield* app.db.query('select id, image from "user" order by email'),
        ).toEqual([
          { id: ana.id, image: `/users/${ana.id}/avatar.webp` },
          { id: bruno.id, image: null },
        ]);
      }),
    );

    testEffect('deletes the previous image when the path changes', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* signIn(app, 'ana@vornway.test');
        yield* app.db.query('update "user" set image = $1 where id = $2', [
          '/users/legacy/avatar.png',
          ana.id,
        ]);

        yield* ana.device.patch('/api/users/me/image', { dataUrl: DATA_URL });

        expect(app.storage.deleted).toEqual(['/users/legacy/avatar.png']);
      }),
    );

    testEffect('keeps the current image when the upload is refused', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* signIn(app, 'ana@vornway.test');

        const refused = yield* ana.device.patch('/api/users/me/image', {
          dataUrl: 'not-a-data-url',
        });

        expect(refused.status).toBe(400);
        expect(refused.body).toEqual({
          _tag: 'UserImageRejected',
          code: 'USER_IMAGE_UPLOAD_FAILED',
          message: 'No se pudo subir la imagen',
        });
        expect(
          yield* app.db.query('select image from "user" where id = $1', [
            ana.id,
          ]),
        ).toEqual([{ image: null }]);
      }),
    );
  });

  testEffect('serves the routes ahead of the legacy fallback', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();

      const root = yield* app.fetch('/');
      const unknown = yield* app.fetch('/api/users/unknown');

      expect(root.status).toBe(200);
      expect(yield* Effect.promise(() => root.json())).toEqual({
        service: 'vornway-api',
        status: 'ok',
      });
      expect(unknown.status).not.toBe(200);
    }),
  );
});
