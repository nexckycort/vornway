import { Data, Effect, Schema } from 'effect';
import { type HttpClient, HttpClientResponse } from 'effect/http';
import type { Prisma } from '#/generated/prisma/client';

export class RateProviderError extends Data.TaggedError('RateProviderError')<{
  readonly cause: unknown;
}> {}

export type RateSnapshot = {
  readonly eurToUsd: number;
  readonly eurToCop: number;
  readonly effectiveDate: Date;
  readonly metadata: Prisma.InputJsonValue;
};

const ProviderRate = Schema.Number.check(
  Schema.isFinite(),
  Schema.isGreaterThan(0),
);

const FrankfurterPayload = Schema.Struct({
  date: Schema.String,
  rates: Schema.Record(Schema.String, Schema.Unknown),
});

const OpenExchangePayload = Schema.Struct({
  result: Schema.Literal('success'),
  time_last_update_unix: Schema.Number,
  rates: Schema.Record(Schema.String, Schema.Unknown),
});

const fetchFrankfurter = Effect.fnUntraced(
  function* (client: HttpClient.HttpClient, quote: 'USD' | 'COP') {
    const response = yield* client.get(
      'https://api.frankfurter.dev/v1/latest',
      {
        urlParams: { base: 'EUR', symbols: quote },
      },
    );
    const raw = yield* HttpClientResponse.schemaBodyJson(Schema.Json)(response);
    const payload = yield* Schema.decodeUnknownEffect(FrankfurterPayload)(raw);
    const rate = yield* Schema.decodeUnknownEffect(ProviderRate)(
      payload.rates[quote],
    );
    return { raw, date: payload.date, rate };
  },
  Effect.mapError((cause) => new RateProviderError({ cause })),
);

const frankfurterSnapshot = (client: HttpClient.HttpClient) =>
  Effect.all(
    {
      usd: fetchFrankfurter(client, 'USD'),
      cop: fetchFrankfurter(client, 'COP'),
    },
    { concurrency: 'unbounded' },
  ).pipe(
    Effect.map(
      ({ usd, cop }): RateSnapshot => ({
        eurToUsd: usd.rate,
        eurToCop: cop.rate,
        effectiveDate: new Date(`${usd.date}T00:00:00.000Z`),
        metadata: {
          provider: 'frankfurter',
          fetchedAt: new Date().toISOString(),
          response: { usd: usd.raw, cop: cop.raw },
        },
      }),
    ),
  );

const openExchangeSnapshot = Effect.fnUntraced(
  function* (client: HttpClient.HttpClient) {
    const response = yield* client.get('https://open.er-api.com/v6/latest/EUR');
    const raw = yield* HttpClientResponse.schemaBodyJson(Schema.Json)(response);
    const payload = yield* Schema.decodeUnknownEffect(OpenExchangePayload)(raw);
    const eurToUsd = yield* Schema.decodeUnknownEffect(ProviderRate)(
      payload.rates.USD,
    );
    const eurToCop = yield* Schema.decodeUnknownEffect(ProviderRate)(
      payload.rates.COP,
    );
    return {
      eurToUsd,
      eurToCop,
      effectiveDate: new Date(payload.time_last_update_unix * 1000),
      metadata: {
        provider: 'open.er-api',
        fetchedAt: new Date().toISOString(),
        response: raw,
      },
    } satisfies RateSnapshot;
  },
  Effect.mapError((cause) => new RateProviderError({ cause })),
);

export const fetchRateSnapshot = (client: HttpClient.HttpClient) =>
  frankfurterSnapshot(client).pipe(
    Effect.catchTag('RateProviderError', () => openExchangeSnapshot(client)),
  );
