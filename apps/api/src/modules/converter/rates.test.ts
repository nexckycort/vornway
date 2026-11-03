import { describe, expect, test } from 'bun:test';
import { DateTime } from 'effect';
import { lastEffectiveDate, latestRates, pairRates } from './rates';

const at = (value: string) => DateTime.toDateUtc(DateTime.makeUnsafe(value));

const row = (
  pair: [string, string],
  rate: number,
  createdAt: string,
  effectiveDate = createdAt,
) => ({
  id: `${pair.join('-')}-${createdAt}`,
  baseCurrency: pair[0],
  quoteCurrency: pair[1],
  rate,
  effectiveDate: at(effectiveDate),
  metadata: null,
  createdAt: at(createdAt),
});

describe('pairRates', () => {
  test('derives the inverse and cross rates from the EUR quotes', () => {
    const rates = pairRates(2, 4000);

    expect(rates).toHaveLength(6);
    expect(rates).toContainEqual({
      baseCurrency: 'EUR',
      quoteCurrency: 'USD',
      rate: 2,
    });
    expect(rates).toContainEqual({
      baseCurrency: 'USD',
      quoteCurrency: 'EUR',
      rate: 0.5,
    });
    expect(rates).toContainEqual({
      baseCurrency: 'USD',
      quoteCurrency: 'COP',
      rate: 2000,
    });
    expect(rates).toContainEqual({
      baseCurrency: 'COP',
      quoteCurrency: 'USD',
      rate: 0.0005,
    });
  });
});

describe('latestRates', () => {
  test('keeps the newest row per pair, drops unsupported currencies and sorts by pair', () => {
    const rates = latestRates([
      row(['USD', 'EUR'], 0.9, '2026-11-02T00:00:00.000Z'),
      row(['EUR', 'USD'], 1.2, '2026-11-02T00:00:00.000Z'),
      row(['EUR', 'USD'], 1.1, '2026-11-01T00:00:00.000Z'),
      row(['EUR', 'GBP'], 0.8, '2026-11-02T00:00:00.000Z'),
    ]);

    expect(
      rates.map((rate) => `${rate.baseCurrency}-${rate.quoteCurrency}`),
    ).toEqual(['EUR-USD', 'USD-EUR']);
    expect(rates[0]?.rate).toBe(1.2);
  });
});

describe('lastEffectiveDate', () => {
  test('is the most recent effective date, or null without rates', () => {
    const rates = latestRates([
      row(
        ['EUR', 'USD'],
        1.2,
        '2026-11-02T00:00:00.000Z',
        '2026-11-01T00:00:00.000Z',
      ),
      row(
        ['USD', 'EUR'],
        0.8,
        '2026-11-02T00:00:00.000Z',
        '2026-11-02T00:00:00.000Z',
      ),
    ]);

    expect(lastEffectiveDate(rates)).toEqual(at('2026-11-02T00:00:00.000Z'));
    expect(lastEffectiveDate([])).toBeNull();
  });
});
