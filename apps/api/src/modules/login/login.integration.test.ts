import { describe, expect } from 'bun:test';
import { Effect } from 'effect';
import { makeTestApp, type TestApp } from '../../../testkit/app';
import { testEffect } from '../../../testkit/effect';
import { stringifyJson } from '../../../testkit/json';
import { signIn } from '../../../testkit/login';
import { createGroup } from '../groups/test-support';

const sendOtp = (app: TestApp, body: object) =>
  app.device().post('/api/login/send-otp', body);

const requestOtp = (app: TestApp, email: string) =>
  Effect.gen(function* () {
    yield* sendOtp(app, { email, name: 'Ana' });
    return app.email.otpFor(email);
  });

const anonymousDevice = (app: TestApp) =>
  Effect.gen(function* () {
    const device = app.device();
    const response = yield* device.post('/api/auth/sign-in/anonymous');
    const { user } = response.body as { user: { id: string } };
    return { device, id: user.id };
  });

describe('login', () => {
  describe('send-otp', () => {
    testEffect('creates the account and emails a code', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();

        const sent = yield* sendOtp(app, {
          email: ' Ana@Gmail.com ',
          name: 'Ana',
        });

        expect(sent.status).toBe(200);
        expect(sent.body).toEqual({
          code: 'OTP_SENT',
          message: 'Código de verificación enviado',
        });
        expect(app.email.messages).toEqual([
          { to: 'ana@gmail.com', otp: expect.any(String) },
        ]);
        expect(yield* app.db.query('select email, name from "user"')).toEqual([
          { email: 'ana@gmail.com', name: 'Ana' },
        ]);
      }),
    );

    testEffect('emails a code to an existing account without a name', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        yield* signIn(app, 'ana@gmail.com');
        const before = app.email.messages.length;

        const sent = yield* sendOtp(app, { email: 'ana@gmail.com' });

        expect(sent.status).toBe(200);
        expect(app.email.messages).toHaveLength(before + 1);
      }),
    );

    testEffect('refuses addresses outside the allowed providers', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();

        const refused = yield* sendOtp(app, { email: 'ana@empresa.com' });

        expect(refused.status).toBe(400);
        expect(refused.body).toEqual({
          _tag: 'InvalidEmailDomain',
          code: 'INVALID_DOMAIN',
          message: 'Usa un correo de Gmail, Outlook, Yahoo o iCloud',
        });
        expect(app.email.messages).toEqual([]);
      }),
    );

    testEffect('answers conflict when the account already exists', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        yield* signIn(app, 'ana@gmail.com');

        const conflict = yield* sendOtp(app, {
          email: 'ana@gmail.com',
          name: 'Ana',
        });

        expect(conflict.status).toBe(409);
        expect(conflict.body).toEqual({
          _tag: 'LoginUserAlreadyExists',
          code: 'USER_ALREADY_EXISTS',
          message: 'El usuario ya existe',
        });
      }),
    );

    testEffect('answers not found for an unknown account without a name', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();

        const missing = yield* sendOtp(app, { email: 'ana@gmail.com' });

        expect(missing.status).toBe(404);
        expect(missing.body).toEqual({
          _tag: 'LoginUserNotFound',
          code: 'USER_NOT_FOUND',
          message: 'Usuario no encontrado',
        });
        expect(app.email.messages).toEqual([]);
      }),
    );

    testEffect('rejects an empty email or name', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();

        const noEmail = yield* sendOtp(app, { email: '' });
        const noName = yield* sendOtp(app, { email: 'a@gmail.com', name: '' });

        expect([noEmail.status, noEmail.body._tag]).toEqual([
          400,
          'InvalidRequest',
        ]);
        expect(noName.status).toBe(400);
      }),
    );
  });

  describe('verify-otp', () => {
    testEffect('answers the user and sets no session cookie', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const otp = yield* requestOtp(app, 'ana@gmail.com');

        const response = yield* app.fetch('/api/login/verify-otp', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: stringifyJson({ email: 'ANA@gmail.com', otp: ` ${otp} ` }),
        });
        const body = (yield* Effect.promise(() => response.json())) as {
          success: boolean;
          user: Record<string, unknown>;
        };

        expect(response.status).toBe(200);
        expect(response.headers.getSetCookie()).toEqual([]);
        expect(body.success).toBe(true);
        expect(body.user).toMatchObject({
          email: 'ana@gmail.com',
          name: 'Ana',
        });
      }),
    );

    testEffect('rejects a wrong code with the old error body', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        yield* requestOtp(app, 'ana@gmail.com');

        const rejected = yield* app.device().post('/api/login/verify-otp', {
          email: 'ana@gmail.com',
          otp: '000000',
        });

        expect(rejected.status).toBe(401);
        expect(rejected.body).toEqual({
          _tag: 'OtpRejected',
          success: false,
          error: 'Código OTP incorrecto o expirado',
        });
      }),
    );

    testEffect('rejects an empty code', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();

        const refused = yield* app
          .device()
          .post('/api/login/verify-otp', { email: 'ana@gmail.com', otp: '' });

        expect(refused.status).toBe(400);
        expect(refused.body._tag).toBe('InvalidRequest');
      }),
    );

    testEffect('moves the groups of an anonymous account to the real one', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const anonymous = yield* anonymousDevice(app);
        const group = yield* createGroup(anonymous.device);
        const otp = yield* requestOtp(app, 'ana@gmail.com');

        const verified = yield* app.device().post('/api/login/verify-otp', {
          email: 'ana@gmail.com',
          otp,
          previousUserId: anonymous.id,
          wasAnonymous: true,
        });
        const { user } = verified.body as { user: { id: string } };

        expect(verified.status).toBe(200);
        expect(
          yield* app.db.query(
            'select "userId" from group_member where "groupId" = $1',
            [group.id],
          ),
        ).toEqual([{ userId: user.id }]);
      }),
    );

    testEffect('deletes the anonymous account when nothing else holds it', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const anonymous = yield* anonymousDevice(app);
        const otp = yield* requestOtp(app, 'ana@gmail.com');

        yield* app.device().post('/api/login/verify-otp', {
          email: 'ana@gmail.com',
          otp,
          previousUserId: anonymous.id,
          wasAnonymous: true,
        });

        expect(
          yield* app.db.query('select id from "user" where id = $1', [
            anonymous.id,
          ]),
        ).toEqual([]);
      }),
    );

    testEffect('keeps the previous account unless it was anonymous', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const anonymous = yield* anonymousDevice(app);
        const otp = yield* requestOtp(app, 'ana@gmail.com');

        yield* app.device().post('/api/login/verify-otp', {
          email: 'ana@gmail.com',
          otp,
          previousUserId: anonymous.id,
        });

        expect(
          yield* app.db.query('select id from "user" where id = $1', [
            anonymous.id,
          ]),
        ).toHaveLength(1);
      }),
    );
  });

  describe('sync-google', () => {
    testEffect('answers the user of the current session', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* signIn(app, 'ana@gmail.com');

        const synced = yield* ana.device.post('/api/login/sync-google');

        expect(synced.status).toBe(200);
        expect(synced.body).toMatchObject({
          success: true,
          user: { id: ana.id, email: 'ana@gmail.com' },
        });
      }),
    );

    testEffect('answers unauthorized without a session', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();

        const missing = yield* app.device().post('/api/login/sync-google');

        expect(missing.status).toBe(401);
        expect(missing.body).toEqual({
          _tag: 'GoogleSessionMissing',
          success: false,
          error: 'No se encontró una sesión activa de Google.',
        });
      }),
    );

    testEffect('moves the groups of an anonymous account', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const anonymous = yield* anonymousDevice(app);
        const group = yield* createGroup(anonymous.device);
        const ana = yield* signIn(app, 'ana@gmail.com');

        yield* ana.device.post('/api/login/sync-google', {
          previousUserId: anonymous.id,
          wasAnonymous: true,
        });

        expect(
          yield* app.db.query(
            'select "userId" from group_member where "groupId" = $1',
            [group.id],
          ),
        ).toEqual([{ userId: ana.id }]);
      }),
    );
  });

  describe('mcp-token', () => {
    testEffect('exchanges a code for a bearer token', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const otp = yield* requestOtp(app, 'ana@gmail.com');

        const issued = yield* app
          .device()
          .post('/api/login/mcp-token', { email: 'ana@gmail.com', otp });

        expect(issued.status).toBe(200);
        expect(issued.body).toMatchObject({
          tokenType: 'Bearer',
          accessToken: expect.stringMatching(/^[\w-]+\.[\w-]+\.[\w-]+$/),
          expiresIn: 60 * 60 * 24 * 30,
          user: { email: 'ana@gmail.com' },
        });
      }),
    );

    testEffect('refuses a wrong code', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        yield* requestOtp(app, 'ana@gmail.com');

        const rejected = yield* app
          .device()
          .post('/api/login/mcp-token', { email: 'ana@gmail.com', otp: '1' });

        expect(rejected.status).toBe(401);
        expect(rejected.body).toMatchObject({
          _tag: 'OtpRejected',
          success: false,
        });
      }),
    );
  });

  describe('me', () => {
    testEffect('answers the signed-in user', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* signIn(app, 'ana@gmail.com');

        const me = yield* ana.device.get('/api/login/me');

        expect(me.status).toBe(200);
        expect(me.body).toMatchObject({ id: ana.id, email: 'ana@gmail.com' });
      }),
    );

    testEffect('answers unauthorized without a session', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();

        const me = yield* app.device().get('/api/login/me');

        expect(me.status).toBe(401);
        expect(me.body._tag).toBe('Unauthorized');
      }),
    );
  });
});
