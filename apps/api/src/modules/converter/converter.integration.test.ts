import { describe, expect } from 'bun:test';
import { DateTime, Effect } from 'effect';
import { makeTestApp, type TestApp } from '../../../testkit/app';
import { testEffect } from '../../../testkit/effect';
import { signIn } from '../../../testkit/login';

const FRESH_AT = DateTime.formatIso(DateTime.nowUnsafe());
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

const providers = (up: {
  readonly frankfurter: boolean;
  readonly openExchange: boolean;
}) => {
  const respond = (request: { readonly url: string }) => {
    const isFrankfurter = request.url.startsWith(
      'https://api.frankfurter.dev/',
    );
    const available = isFrankfurter ? up.frankfurter : up.openExchange;
    return available
      ? Response.json(isFrankfurter ? frankfurter : openExchange)
      : new Response('down', { status: 503 });
  };
  return respond;
};

const seedRate = (
  app: TestApp,
  rate: { readonly id: string; readonly createdAt: string },
) =>
  app.db.query(
    `insert into currency_rate ("id", "baseCurrency", "quoteCurrency", "rate", "effectiveDate", "metadata", "createdAt", "updatedAt")
     values ($1, 'EUR', 'USD', 1.2, $2, null, $2, $2)`,
    [rate.id, rate.createdAt],
  );

const rateOf = (
  rates: readonly Record<string, unknown>[],
  base: string,
  quote: string,
) =>
  rates.find(
    (rate) => rate.baseCurrency === base && rate.quoteCurrency === quote,
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
        yield* seedRate(app, { id: 'rate-usd', createdAt: FRESH_AT });

        const result = yield* ana.device.get('/api/converter');

        expect(result.status).toBe(200);
        expect(app.http.requests).toEqual([]);
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
        const app = yield* makeTestApp({
          http: providers({ frankfurter: true, openExchange: true }),
        });
        const ana = yield* signIn(app, 'ana@vornway.test');
        yield* seedRate(app, { id: 'old', createdAt: STALE_AT });

        const result = yield* ana.device.get('/api/converter');
        const rates = result.body.rates as Record<string, unknown>[];

        expect(result.status).toBe(200);
        expect(app.http.requests).toHaveLength(2);
        expect(
          rates.map((rate) => `${rate.baseCurrency}-${rate.quoteCurrency}`),
        ).toEqual([
          'COP-EUR',
          'COP-USD',
          'EUR-COP',
          'EUR-USD',
          'USD-COP',
          'USD-EUR',
        ]);
        expect(rateOf(rates, 'EUR', 'USD')).toMatchObject({
          rate: 1.1,
          effectiveDate: '2026-11-01T00:00:00.000Z',
          metadata: { provider: 'frankfurter' },
        });
        expect(result.body.lastUpdatedAt).toBe('2026-11-01T00:00:00.000Z');
      }),
  );

  testEffect('falls back to open.er-api when Frankfurter is down', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp({
        http: providers({ frankfurter: false, openExchange: true }),
      });
      const ana = yield* signIn(app, 'ana@vornway.test');

      const result = yield* ana.device.get('/api/converter');

      const hosts = app.http.requests.map(
        (request) => new URL(request.url).host,
      );
      expect(hosts).toContain('api.frankfurter.dev');
      expect(hosts.at(-1)).toBe('open.er-api.com');
      expect(
        rateOf(result.body.rates as Record<string, unknown>[], 'EUR', 'COP'),
      ).toMatchObject({
        rate: 4400,
        effectiveDate: '2026-11-01T12:00:00.000Z',
        metadata: { provider: 'open.er-api' },
      });
    }),
  );

  testEffect('answers an internal error when no provider responds', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp({
        http: providers({ frankfurter: false, openExchange: false }),
      });
      const ana = yield* signIn(app, 'ana@vornway.test');

      const result = yield* ana.device.get('/api/converter');

      expect(result.status).toBe(500);
      expect(result.body._tag).toBe('InternalError');
    }),
  );
});
