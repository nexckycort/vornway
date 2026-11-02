import { describe, expect } from 'bun:test';
import { Effect, Layer, Logger } from 'effect';
import type { HttpClientRequest } from 'effect/http';
import { makeTestApp } from '../../../testkit/app';
import { testConfig } from '../../../testkit/config';
import { testEffect } from '../../../testkit/effect';
import { makeHttp, type OutboundHandler } from '../../../testkit/fakes';
import { signIn } from '../../../testkit/login';
import { DatabaseClient } from '../database/database';
import { Push } from './push';
import type { PushNotificationPayload } from './types';

const EXPO_TOKEN = 'ExponentPushToken[abc]';
const PAYLOAD: PushNotificationPayload = {
  title: 'Nuevo gasto en Viaje',
  body: 'Ana agregó una cena',
  url: '/groups/g1',
  type: 'expense.created',
  tag: 'expense:e1',
  groupId: 'g1',
  expenseId: 'e1',
};

const jsonBody = (request: HttpClientRequest.HttpClientRequest | undefined) =>
  request?.body._tag === 'Uint8Array'
    ? JSON.parse(new TextDecoder().decode(request.body.body))
    : undefined;

const withPush = (url: string, handler?: OutboundHandler) => {
  const http = makeHttp(handler);
  const layer = Push.layer.pipe(
    Layer.provide([DatabaseClient.layer, http.layer]),
    Layer.provide(testConfig({ DATABASE_URL: url })),
    Layer.provideMerge(process.env.TEST_LOGS ? Layer.empty : Logger.layer([])),
  );
  return { http, layer };
};

const expoSubscription = (userId: string) => ({
  userId,
  endpoint: `https://exp.host/--/api/v2/push/send?token=${encodeURIComponent(EXPO_TOKEN)}`,
  p256dh: EXPO_TOKEN,
  auth: 'expo',
  userAgent: 'expo:ios',
});

describe('Push', () => {
  testEffect('delivers to an Expo subscription through the HttpClient', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();
      const ana = yield* signIn(app, 'ana@vornway.test');
      const { http, layer } = withPush(app.db.url, () =>
        Response.json({ data: { status: 'ok' } }),
      );

      yield* Effect.gen(function* () {
        const push = yield* Push;
        yield* push.storeSubscription(expoSubscription(ana.id));
        yield* push.sendToUsers([ana.id, ana.id], PAYLOAD);
      }).pipe(Effect.provide(layer));

      expect(http.requests).toHaveLength(1);
      const [request] = http.requests;
      expect([request?.method, request?.url]).toEqual([
        'POST',
        'https://exp.host/--/api/v2/push/send',
      ]);
      expect(jsonBody(request)).toEqual({
        to: EXPO_TOKEN,
        title: PAYLOAD.title,
        body: PAYLOAD.body,
        sound: 'default',
        data: {
          url: PAYLOAD.url,
          type: PAYLOAD.type,
          groupId: PAYLOAD.groupId,
          expenseId: PAYLOAD.expenseId,
        },
      });
    }),
  );

  testEffect('keeps the subscription when Expo refuses a delivery', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();
      const ana = yield* signIn(app, 'ana@vornway.test');
      const { layer } = withPush(
        app.db.url,
        () => new Response('nope', { status: 500 }),
      );

      const result = yield* Effect.gen(function* () {
        const push = yield* Push;
        yield* push.storeSubscription(expoSubscription(ana.id));
        yield* push.sendToUsers([ana.id], PAYLOAD);
      }).pipe(Effect.provide(layer), Effect.result);

      expect(result._tag).toBe('Success');
      expect(
        yield* app.db.query('select "revokedAt" from push_subscription'),
      ).toEqual([{ revokedAt: null }]);
    }),
  );

  testEffect(
    'stops delivering to a revoked subscription, only for its owner',
    () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* signIn(app, 'ana@vornway.test');
        const bruno = yield* signIn(app, 'bruno@vornway.test');
        const { http, layer } = withPush(app.db.url, () => Response.json({}));

        yield* Effect.gen(function* () {
          const push = yield* Push;
          yield* push.storeSubscription(expoSubscription(ana.id));
          yield* push.revokeSubscription({
            userId: bruno.id,
            endpoint: expoSubscription(ana.id).endpoint,
          });
          yield* push.sendToUsers([ana.id], PAYLOAD);
          yield* push.revokeSubscription({
            userId: ana.id,
            endpoint: expoSubscription(ana.id).endpoint,
          });
          yield* push.sendToUsers([ana.id], PAYLOAD);
        }).pipe(Effect.provide(layer));

        expect(http.requests).toHaveLength(1);
      }),
  );
});
