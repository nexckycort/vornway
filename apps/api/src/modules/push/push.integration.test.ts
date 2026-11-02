import { describe, expect } from 'bun:test';
import { Effect } from 'effect';
import { makeTestApp } from '../../../testkit/app';
import { testEffect } from '../../../testkit/effect';
import { signIn } from '../../../testkit/login';

const ENDPOINT = 'https://push.example.com/subscriptions/ana';
const KEYS = { p256dh: 'p256dh-key', auth: 'auth-key' };
const EXPO_TOKEN = 'ExponentPushToken[abc]';
const EXPO_ENDPOINT = `https://exp.host/--/api/v2/push/send?token=${encodeURIComponent(EXPO_TOKEN)}`;

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

      const removed = yield* ana.device.delete('/api/push/subscriptions', {
        endpoint: ENDPOINT,
      });

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

        const removed = yield* ana.device.delete(
          '/api/push/native-subscriptions',
          { token: EXPO_TOKEN },
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

  testEffect("does not let a user remove another user's subscription", () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();
      const ana = yield* signIn(app, 'ana@vornway.test');
      const bruno = yield* signIn(app, 'bruno@vornway.test');
      yield* ana.device.post('/api/push/subscriptions', {
        endpoint: ENDPOINT,
        keys: KEYS,
      });

      const attempt = yield* bruno.device.delete('/api/push/subscriptions', {
        endpoint: ENDPOINT,
      });

      expect(attempt.status).toBe(200);
      expect(app.push.revoked).toEqual([
        { userId: bruno.id, endpoint: ENDPOINT },
      ]);
      expect(app.push.subscriptions.get(ENDPOINT)?.userId).toBe(ana.id);
    }),
  );

  testEffect(
    'answers an internal error when the subscription cannot be stored',
    () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* signIn(app, 'ana@vornway.test');
        app.push.unavailable = true;

        const result = yield* ana.device.post('/api/push/subscriptions', {
          endpoint: ENDPOINT,
          keys: KEYS,
        });

        expect(result.status).toBe(500);
        expect(result.body._tag).toBe('InternalError');
      }),
  );

  testEffect('does not fail the test notification when delivery fails', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();
      const ana = yield* signIn(app, 'ana@vornway.test');
      app.push.unavailable = true;

      const result = yield* ana.device.post('/api/push/test');

      expect(result.status).toBe(200);
      expect(result.body).toEqual({ success: true });
      expect(app.push.sent).toEqual([]);
    }),
  );
});
