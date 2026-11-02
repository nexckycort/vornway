import { describe, expect } from 'bun:test';
import { Effect, Layer, Logger } from 'effect';
import { ErrorCapture } from '#/infrastructure/http/errors';
import { Push, PushError } from '#/infrastructure/push/push';
import { makeTestApp, type TestApp } from '../../../testkit/app';
import { testEffect } from '../../../testkit/effect';
import { signIn } from '../../../testkit/login';
import { PushSubscriptions } from './service';

const ENDPOINT = 'https://push.example.com/subscriptions/ana';
const KEYS = { p256dh: 'p256dh-key', auth: 'auth-key' };
const EXPO_TOKEN = 'ExponentPushToken[abc]';
const EXPO_ENDPOINT = `https://exp.host/--/api/v2/push/send?token=${encodeURIComponent(EXPO_TOKEN)}`;

// The device helper can't send a body on DELETE, and the revoke routes take one.
const sessionCookie = (app: TestApp, email: string) =>
  Effect.gen(function* () {
    const headers = {
      'content-type': 'application/json',
      'expo-origin': 'vornway://',
    };
    yield* app.fetch('/api/auth/email-otp/send-verification-otp', {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, type: 'sign-in' }),
    });
    const signedIn = yield* app.fetch('/api/auth/sign-in/email-otp', {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, otp: app.email.otpFor(email) }),
    });
    return signedIn.headers
      .getSetCookie()
      .map((cookie) => cookie.split(';')[0])
      .join('; ');
  });

const revokeWithBody = (
  app: TestApp,
  cookie: string,
  path: string,
  body: object,
) =>
  Effect.gen(function* () {
    const response = yield* app.fetch(path, {
      method: 'DELETE',
      headers: {
        'content-type': 'application/json',
        'expo-origin': 'vornway://',
        cookie,
      },
      body: JSON.stringify(body),
    });
    return {
      status: response.status,
      body: yield* Effect.promise(() => response.json()),
    };
  });

const recordingPush = (options: { readonly failing: boolean }) => {
  const revoked: { readonly userId: string; readonly endpoint: string }[] = [];
  const layer = Layer.succeed(
    Push,
    Push.of({
      storeSubscription: (input) =>
        options.failing
          ? Effect.fail(new PushError({ cause: 'unavailable' }))
          : Effect.succeed({
              id: input.endpoint,
              endpoint: input.endpoint,
              revokedAt: null,
            }),
      revokeSubscription: (input) =>
        Effect.sync(() => {
          revoked.push(input);
        }),
      sendToUsers: () => Effect.fail(new PushError({ cause: 'unavailable' })),
    }),
  );
  return { revoked, layer };
};

describe('push', () => {
  testEffect('requires a session', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();

      const result = yield* app.fetch('/api/push/subscriptions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ endpoint: ENDPOINT, keys: KEYS }),
      });

      expect(result.status).toBe(401);
    }),
  );

  testEffect('stores a browser subscription for the signed-in user', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();
      const ana = yield* signIn(app, 'ana@vornway.test');

      const stored = yield* ana.device.post('/api/push/subscriptions', {
        endpoint: ENDPOINT,
        keys: KEYS,
      });

      expect(stored.status).toBe(201);
      expect(stored.body).toEqual({
        id: ENDPOINT,
        endpoint: ENDPOINT,
        revokedAt: null,
      });
      expect(app.push.subscriptions.get(ENDPOINT)).toMatchObject({
        userId: ana.id,
        ...KEYS,
      });
    }),
  );

  testEffect('rejects a subscription whose endpoint is not a URL', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();
      const ana = yield* signIn(app, 'ana@vornway.test');

      const result = yield* ana.device.post('/api/push/subscriptions', {
        endpoint: 'not-a-url',
        keys: KEYS,
      });

      expect(result.status).toBe(400);
      expect(result.body._tag).toBe('InvalidRequest');
    }),
  );

  testEffect('removes a browser subscription', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();
      const ana = yield* signIn(app, 'ana@vornway.test');
      yield* ana.device.post('/api/push/subscriptions', {
        endpoint: ENDPOINT,
        keys: KEYS,
      });
      const cookie = yield* sessionCookie(app, 'ana@vornway.test');

      const removed = yield* revokeWithBody(
        app,
        cookie,
        '/api/push/subscriptions',
        {
          endpoint: ENDPOINT,
        },
      );

      expect(removed.status).toBe(200);
      expect(removed.body).toEqual({ success: true });
      expect(app.push.subscriptions.has(ENDPOINT)).toBe(false);
    }),
  );

  testEffect(
    'stores and removes native subscriptions under the Expo endpoint',
    () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* signIn(app, 'ana@vornway.test');

        const stored = yield* ana.device.post(
          '/api/push/native-subscriptions',
          {
            token: EXPO_TOKEN,
            platform: 'ios',
          },
        );
        expect(stored.status).toBe(201);
        expect(app.push.subscriptions.get(EXPO_ENDPOINT)).toMatchObject({
          userId: ana.id,
          p256dh: EXPO_TOKEN,
          auth: 'expo',
          userAgent: 'expo:ios',
        });

        const cookie = yield* sessionCookie(app, 'ana@vornway.test');
        const removed = yield* revokeWithBody(
          app,
          cookie,
          '/api/push/native-subscriptions',
          {
            token: EXPO_TOKEN,
          },
        );
        expect(removed.body).toEqual({ success: true });
        expect(app.push.subscriptions.has(EXPO_ENDPOINT)).toBe(false);
      }),
  );

  testEffect('sends a test notification to the signed-in user', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();
      const ana = yield* signIn(app, 'ana@vornway.test');

      const result = yield* ana.device.post('/api/push/test');

      expect(result.status).toBe(200);
      expect(result.body).toEqual({ success: true });
      expect(app.push.sent).toEqual([
        {
          userIds: [ana.id],
          payload: expect.objectContaining({
            title: 'Push notifications enabled',
            tag: 'vornway:push-test',
          }),
        },
      ]);
    }),
  );

  describe('service', () => {
    const run = <A, E>(
      program: Effect.Effect<A, E, PushSubscriptions>,
      push: ReturnType<typeof recordingPush>,
    ) =>
      program.pipe(
        Effect.provide(
          PushSubscriptions.layer.pipe(
            Layer.provide(push.layer),
            Layer.provide(ErrorCapture.layerLog),
            Layer.provideMerge(
              process.env.TEST_LOGS ? Layer.empty : Logger.layer([]),
            ),
          ),
        ),
      );

    testEffect(
      "revokes through the signed-in user, so one user cannot remove another user's subscription",
      () =>
        Effect.gen(function* () {
          const push = recordingPush({ failing: false });

          yield* run(
            Effect.flatMap(PushSubscriptions, (subscriptions) =>
              subscriptions.unsubscribeWeb('user-ana', ENDPOINT),
            ),
            push,
          );

          expect(push.revoked).toEqual([
            { userId: 'user-ana', endpoint: ENDPOINT },
          ]);
        }),
    );

    testEffect(
      'answers an internal error when the subscription cannot be stored',
      () =>
        Effect.gen(function* () {
          const push = recordingPush({ failing: true });

          const error = yield* run(
            Effect.flatMap(PushSubscriptions, (subscriptions) =>
              subscriptions.subscribeWeb(
                'user-ana',
                { endpoint: ENDPOINT, keys: KEYS },
                undefined,
              ),
            ).pipe(Effect.flip),
            push,
          );

          expect(error._tag).toBe('InternalError');
        }),
    );

    testEffect('does not fail the test notification when delivery fails', () =>
      Effect.gen(function* () {
        const push = recordingPush({ failing: false });

        const result = yield* run(
          Effect.flatMap(PushSubscriptions, (subscriptions) =>
            subscriptions.sendTest({
              id: 'user-ana',
              name: 'Ana',
              email: 'ana@vornway.test',
            }),
          ),
          push,
        );

        expect(result).toBeUndefined();
      }),
    );
  });
});
