import { Schema } from 'effect';
import { HttpApiEndpoint, HttpApiGroup } from 'effect/http-api';
import { literalsWithFallback } from '../../schema.ts';
import { SessionAuth } from '../auth/contract.ts';

export const CURRENCIES = ['EUR', 'USD', 'COP'] as const;
export const SupportedCurrency = literalsWithFallback(CURRENCIES, 'unknown');

export const CurrencyRate = Schema.Struct({
  id: Schema.String,
  baseCurrency: SupportedCurrency,
  quoteCurrency: SupportedCurrency,
  rate: Schema.Number,
  effectiveDate: Schema.Date,
  metadata: Schema.NullOr(Schema.Unknown),
  createdAt: Schema.Date,
});
export const CurrencyConverter = Schema.Struct({
  currencies: Schema.Array(SupportedCurrency),
  rates: Schema.Array(CurrencyRate),
  lastUpdatedAt: Schema.NullOr(Schema.Date),
  disclaimer: Schema.String,
});

export class ConverterApi extends HttpApiGroup.make('converter')
  .add(
    HttpApiEndpoint.get('rates', '/api/converter', {
      success: CurrencyConverter,
    }),
  )
  .middleware(SessionAuth) {}
