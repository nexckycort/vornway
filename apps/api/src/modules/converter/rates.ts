import { CURRENCIES } from '@vornway/contracts/modules/converter/contract';
import { Schema } from 'effect';
import type { Prisma } from '#/generated/prisma/client';

const isCurrency = Schema.is(Schema.Literals(CURRENCIES));

type StoredRate = {
  readonly id: string;
  readonly baseCurrency: string;
  readonly quoteCurrency: string;
  readonly rate: number;
  readonly effectiveDate: Date;
  readonly metadata: Prisma.JsonValue | null;
  readonly createdAt: Date;
};

export const pairRates = (eurToUsd: number, eurToCop: number) =>
  [
    { baseCurrency: 'EUR', quoteCurrency: 'USD', rate: eurToUsd },
    { baseCurrency: 'EUR', quoteCurrency: 'COP', rate: eurToCop },
    { baseCurrency: 'USD', quoteCurrency: 'EUR', rate: 1 / eurToUsd },
    { baseCurrency: 'COP', quoteCurrency: 'EUR', rate: 1 / eurToCop },
    { baseCurrency: 'USD', quoteCurrency: 'COP', rate: eurToCop / eurToUsd },
    { baseCurrency: 'COP', quoteCurrency: 'USD', rate: eurToUsd / eurToCop },
  ] as const;

export const latestRates = (rows: readonly StoredRate[]) => {
  const seen = new Set<string>();

  return rows
    .flatMap((row) =>
      isCurrency(row.baseCurrency) && isCurrency(row.quoteCurrency)
        ? [
            {
              id: row.id,
              baseCurrency: row.baseCurrency,
              quoteCurrency: row.quoteCurrency,
              rate: row.rate,
              effectiveDate: row.effectiveDate,
              metadata: row.metadata,
              createdAt: row.createdAt,
            },
          ]
        : [],
    )
    .filter((row) => {
      const key = `${row.baseCurrency}-${row.quoteCurrency}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) =>
      `${a.baseCurrency}-${a.quoteCurrency}`.localeCompare(
        `${b.baseCurrency}-${b.quoteCurrency}`,
      ),
    );
};

export const lastEffectiveDate = (
  rates: readonly { readonly effectiveDate: Date }[],
) =>
  rates.reduce<Date | null>(
    (latest, current) =>
      latest && latest >= current.effectiveDate
        ? latest
        : current.effectiveDate,
    null,
  );
