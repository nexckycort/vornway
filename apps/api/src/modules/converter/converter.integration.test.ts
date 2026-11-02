import { describe, expect } from 'bun:test';
import { Effect, Layer, Logger } from 'effect';
import { HttpClient, HttpClientResponse } from 'effect/http';
import { Database, DatabaseClient } from '#/infrastructure/database/database';
import { ErrorCapture } from '#/infrastructure/http/errors';
import { makeTestApp } from '../../../testkit/app';
import { testConfig } from '../../../testkit/config';
import { testDatabase } from '../../../testkit/database';
import { testEffect } from '../../../testkit/effect';
import { signIn } from '../../../testkit/login';
import { Converter } from './service';

const FRESH_AT = new Date().toISOString();
const STALE_AT = '2026-01-01T00:00:00.000Z';

const frankfurter = {
  amount: 1,
  base: 'EUR',
  date: '2026-11-01',
  rates: { USD: 1.1, COP: 4500 },
};
const openExchange = {
  result: 'success',
  time_last_update_unix: Date.parse('2026-11-01T12:00:00.000Z') / 1000,
  base_code: 'EUR',
  rates: { USD: 1.09, COP: 4400 },
};

const fakeProviders = (up: {
  readonly frankfurter: boolean;
  readonly openExchange: boolean;
}) => {
  const requested: string[] = [];
  const respond = (request: { readonly url: string }) => {
    requested.push(request.url);
    const isFrankfurter = request.url.startsWith(
      'https://api.frankfurter.dev/',
    );
    const available = isFrankfurter ? up.frankfurter : up.openExchange;
    return available
      ? Response.json(isFrankfurter ? frankfurter : openExchange)
      : new Response('down', { status: 503 });
  };

  return {
    requested,
    layer: Layer.succeed(
      HttpClient.HttpClient,
      HttpClient.make((request) =>
        Effect.succeed(HttpClientResponse.fromWeb(request, respond(request))),
      ),
    ),
  };
};

const withConverter = (provider: ReturnType<typeof fakeProviders>) =>
  Effect.gen(function* () {
    const db = yield* testDatabase;
    const layer = Converter.layer.pipe(
      Layer.provide(provider.layer),
      Layer.provide(Database.layer),
      Layer.provide([DatabaseClient.layer, ErrorCapture.layerLog]),
      Layer.provide(testConfig({ DATABASE_URL: db.url })),
      Layer.provideMerge(
        process.env.TEST_LOGS ? Layer.empty : Logger.layer([]),
      ),
    );
    return { db, layer };
  });

const seedFreshRates = (db: Effect.Success<typeof testDatabase>) =>
  db.query(
    `insert into currency_rate ("id", "baseCurrency", "quoteCurrency", "rate", "effectiveDate", "metadata", "createdAt", "updatedAt")
     values ('rate-usd', 'EUR', 'USD', 1.2, $1, null, $1, $1)`,
    [FRESH_AT],
  );

describe('converter', () => {
  testEffect('requires a session', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();

      expect((yield* app.fetch('/api/converter')).status).toBe(401);
    }),
  );

  testEffect(
    'serves the stored rates without calling a provider while they are fresh',
    () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* signIn(app, 'ana@vornway.test');
        yield* app.db.query(
          `insert into currency_rate ("id", "baseCurrency", "quoteCurrency", "rate", "effectiveDate", "metadata", "createdAt", "updatedAt")
         values ('rate-usd', 'EUR', 'USD', 1.2, $1, null, $1, $1)`,
          [FRESH_AT],
        );

        const result = yield* ana.device.get('/api/converter');

        expect(result.status).toBe(200);
        expect(result.body).toEqual({
          currencies: ['EUR', 'USD', 'COP'],
          rates: [
            {
              id: 'rate-usd',
              baseCurrency: 'EUR',
              quoteCurrency: 'USD',
              rate: 1.2,
              effectiveDate: FRESH_AT,
              metadata: null,
              createdAt: FRESH_AT,
            },
          ],
          lastUpdatedAt: FRESH_AT,
          disclaimer:
            'Estas tasas se actualizan cada 6 horas y son un aproximado, no un valor en tiempo real.',
        });
      }),
  );

  testEffect(
    'stores the six pairs from Frankfurter when the cached rates are stale',
    () =>
      Effect.gen(function* () {
        const provider = fakeProviders({
          frankfurter: true,
          openExchange: true,
        });
        const { db, layer } = yield* withConverter(provider);
        yield* db.query(
          `insert into currency_rate ("id", "baseCurrency", "quoteCurrency", "rate", "effectiveDate", "metadata", "createdAt", "updatedAt")
         values ('old', 'EUR', 'USD', 1, $1, null, $1, $1)`,
          [STALE_AT],
        );

        const result = yield* Effect.gen(function* () {
          const converter = yield* Converter;
          return yield* converter.rates();
        }).pipe(Effect.provide(layer));

        expect(provider.requested).toHaveLength(2);
        expect(
          result.rates.map(
            (rate) => `${rate.baseCurrency}-${rate.quoteCurrency}`,
          ),
        ).toEqual([
          'COP-EUR',
          'COP-USD',
          'EUR-COP',
          'EUR-USD',
          'USD-COP',
          'USD-EUR',
        ]);
        expect(
          result.rates.find(
            (rate) =>
              rate.baseCurrency === 'EUR' && rate.quoteCurrency === 'USD',
          ),
        ).toMatchObject({
          rate: 1.1,
          effectiveDate: new Date('2026-11-01T00:00:00.000Z'),
          metadata: { provider: 'frankfurter' },
        });
        expect(result.lastUpdatedAt).toEqual(
          new Date('2026-11-01T00:00:00.000Z'),
        );
      }),
  );

  testEffect('falls back to open.er-api when Frankfurter is down', () =>
    Effect.gen(function* () {
      const provider = fakeProviders({
        frankfurter: false,
        openExchange: true,
      });
      const { layer } = yield* withConverter(provider);

      const result = yield* Effect.gen(function* () {
        const converter = yield* Converter;
        return yield* converter.rates();
      }).pipe(Effect.provide(layer));

      const hosts = provider.requested.map((url) => new URL(url).host);
      expect(hosts).toContain('api.frankfurter.dev');
      expect(hosts.at(-1)).toBe('open.er-api.com');
      expect(
        result.rates.find(
          (rate) => rate.baseCurrency === 'EUR' && rate.quoteCurrency === 'COP',
        ),
      ).toMatchObject({
        rate: 4400,
        effectiveDate: new Date('2026-11-01T12:00:00.000Z'),
        metadata: { provider: 'open.er-api' },
      });
    }),
  );

  testEffect('answers an internal error when no provider responds', () =>
    Effect.gen(function* () {
      const provider = fakeProviders({
        frankfurter: false,
        openExchange: false,
      });
      const { layer } = yield* withConverter(provider);

      const error = yield* Effect.gen(function* () {
        const converter = yield* Converter;
        return yield* converter.rates();
      }).pipe(Effect.provide(layer), Effect.flip);

      expect(error._tag).toBe('InternalError');
    }),
  );

  testEffect('does not call a provider while the stored rates are fresh', () =>
    Effect.gen(function* () {
      const provider = fakeProviders({
        frankfurter: false,
        openExchange: false,
      });
      const { db, layer } = yield* withConverter(provider);
      yield* seedFreshRates(db);

      const result = yield* Effect.gen(function* () {
        const converter = yield* Converter;
        return yield* converter.rates();
      }).pipe(Effect.provide(layer));

      expect(provider.requested).toEqual([]);
      expect(result.rates).toHaveLength(1);
    }),
  );
});
