import { describe, expect } from 'bun:test';
import { AdminOnly } from '@vornway/contracts/modules/auth/contract';
import { Effect, Layer, Schema } from 'effect';
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
} from 'effect/http-api';
import { makeTestApp } from '../../../testkit/app';
import { testEffect } from '../../../testkit/effect';
import { signIn } from '../../../testkit/login';
import { AdminOnlyLive } from './http';

class AdminApi extends HttpApiGroup.make('admin')
  .add(
    HttpApiEndpoint.get('ping', '/api/test/admin', { success: Schema.String }),
  )
  .middleware(AdminOnly) {}

const TestApi = HttpApi.make('TestApi').add(AdminApi);

const AdminHandlers = HttpApiBuilder.group(TestApi, 'admin', (handlers) =>
  Effect.succeed(handlers.handle('ping', () => Effect.succeed('pong'))),
);

const extraRoutes = HttpApiBuilder.layer(TestApi).pipe(
  Layer.provide(AdminHandlers),
  Layer.provide(AdminOnlyLive),
);

describe('SessionAuth', () => {
  testEffect('accepts the session cookie Better Auth issued', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();
      const ana = yield* signIn(app, 'ana@vornway.test');

      expect(
        (yield* ana.device.get('/api/users/search?query=ana')).status,
      ).toBe(200);
    }),
  );

  testEffect('rejects a request without a session or with a forged one', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();

      const anonymous = yield* app.fetch('/api/users/search?query=ana');
      const forged = yield* app.fetch('/api/users/search?query=ana', {
        headers: { cookie: 'better-auth.session_token=forged.signature' },
      });

      expect(anonymous.status).toBe(401);
      expect(yield* Effect.promise(() => anonymous.json())).toEqual({
        _tag: 'Unauthorized',
        message: 'Authentication required',
      });
      expect(forged.status).toBe(401);
    }),
  );

  testEffect('stops accepting a session after signing out', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();
      const ana = yield* signIn(app, 'ana@vornway.test');

      yield* ana.device.post('/api/auth/sign-out');

      expect(
        (yield* ana.device.get('/api/users/search?query=ana')).status,
      ).toBe(401);
    }),
  );
});

describe('AdminOnly', () => {
  testEffect('lets an admin through and keeps everyone else out', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp({ extraRoutes });
      const admin = yield* signIn(app, 'junior110120@gmail.com');
      const member = yield* signIn(app, 'ana@vornway.test');

      expect((yield* app.fetch('/api/test/admin')).status).toBe(401);
      expect((yield* member.device.get('/api/test/admin')).status).toBe(403);
      expect((yield* member.device.get('/api/test/admin')).body).toEqual({
        _tag: 'Forbidden',
        error: 'No autorizado',
      });
      expect((yield* admin.device.get('/api/test/admin')).status).toBe(200);
    }),
  );
});
