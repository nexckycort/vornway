import type { InternalError } from '@vornway/contracts/errors';
import type { CurrencyConverter as CurrencyConverterSchema } from '@vornway/contracts/modules/converter/contract';
import { CURRENCIES } from '@vornway/contracts/modules/converter/contract';
import { Context, Effect, Layer } from 'effect';
import { HttpClient } from 'effect/http';
import { Database } from '#/infrastructure/database/database';
import { makeInternalFailure } from '#/infrastructure/http/errors';
import { fetchRateSnapshot } from './providers';
import { lastEffectiveDate, latestRates, pairRates } from './rates';

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const DISCLAIMER =
  'Estas tasas se actualizan cada 6 horas y son un aproximado, no un valor en tiempo real.';

export class Converter extends Context.Service<
  Converter,
  {
    rates(): Effect.Effect<typeof CurrencyConverterSchema.Type, InternalError>;
  }
>()('vornway/converter/Converter') {
  static readonly layer = Layer.effect(
    Converter,
    Effect.gen(function* () {
      const database = yield* Database;
      const internalFailure = yield* makeInternalFailure;
      const http = yield* HttpClient.HttpClient;
      const client = http.pipe(HttpClient.filterStatusOk);

      const refreshRates = Effect.fn('Converter.refreshRates')(
        function* () {
          const latest = yield* database.use((db) =>
            db.currencyRate.findFirst({
              orderBy: { createdAt: 'desc' },
              select: { createdAt: true },
            }),
          );
          if (latest && Date.now() - latest.createdAt.getTime() < SIX_HOURS_MS)
            return;

          const snapshot = yield* fetchRateSnapshot(client);
          yield* database.use((db) =>
            db.currencyRate.createMany({
              data: pairRates(snapshot.eurToUsd, snapshot.eurToCop).map(
                (rate) => ({
                  ...rate,
                  effectiveDate: snapshot.effectiveDate,
                  metadata: snapshot.metadata,
                }),
              ),
            }),
          );
        },
        Effect.catchTag('RateProviderError', internalFailure),
      );

      const rates = Effect.fn('Converter.rates')(function* () {
        yield* refreshRates();
        const stored = yield* database.use((db) =>
          db.currencyRate.findMany({
            where: {
              baseCurrency: { in: [...CURRENCIES] },
              quoteCurrency: { in: [...CURRENCIES] },
            },
            orderBy: [{ createdAt: 'desc' }, { effectiveDate: 'desc' }],
          }),
        );
        const current = latestRates(stored);
        return {
          currencies: [...CURRENCIES],
          rates: current,
          lastUpdatedAt: lastEffectiveDate(current),
          disclaimer: DISCLAIMER,
        };
      });

      return Converter.of({ rates });
    }),
  );
}
