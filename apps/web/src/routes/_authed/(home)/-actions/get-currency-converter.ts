/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';
import { Prisma } from '~/generated/prisma/client';

import { db } from '~/infrastructure/database/connection';
import {
  ensureCurrencyRatesFresh,
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from '~/lib/currency-rates';
import { useAppSession } from '~/utils/session';

interface CurrencyRateItem {
  id: string;
  baseCurrency: SupportedCurrency;
  quoteCurrency: SupportedCurrency;
  rate: number;
  effectiveDate: Date;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
}

interface CurrencyConverterResponse {
  currencies: SupportedCurrency[];
  rates: CurrencyRateItem[];
  lastUpdatedAt: Date | null;
  disclaimer: string;
}

export const getCurrencyConverter = createServerFn({ method: 'GET' }).handler(
  async (): Promise<CurrencyConverterResponse> => {
    const session = await useAppSession();
    const userId = session.data.userId;

    if (!userId) {
      throw new Error('No autenticado');
    }

    await ensureCurrencyRatesFresh();

    const rateRecords = await db.currencyRate.findMany({
      where: {
        baseCurrency: { in: [...SUPPORTED_CURRENCIES] },
        quoteCurrency: { in: [...SUPPORTED_CURRENCIES] },
      },
      orderBy: [
        { createdAt: 'desc' },
        { effectiveDate: 'desc' },
      ],
    });

    const latestByPair = new Map<string, CurrencyRateItem>();

    for (const rate of rateRecords) {
      const key = `${rate.baseCurrency}-${rate.quoteCurrency}`;
      if (!latestByPair.has(key)) {
        latestByPair.set(key, {
          id: rate.id,
          baseCurrency: rate.baseCurrency as SupportedCurrency,
          quoteCurrency: rate.quoteCurrency as SupportedCurrency,
          rate: rate.rate,
          effectiveDate: rate.effectiveDate,
          metadata: rate.metadata,
          createdAt: rate.createdAt,
        });
      }
    }

    const rates = Array.from(latestByPair.values()).sort((a, b) =>
      `${a.baseCurrency}-${a.quoteCurrency}`.localeCompare(
        `${b.baseCurrency}-${b.quoteCurrency}`,
      ),
    );

    const lastUpdatedAt =
      rates.length > 0
        ? rates.reduce((latest, current) =>
            current.effectiveDate > latest ? current.effectiveDate : latest,
            rates[0].effectiveDate,
          )
        : null;

    return {
      currencies: [...SUPPORTED_CURRENCIES],
      rates,
      lastUpdatedAt,
      disclaimer:
        'Estas tasas se actualizan una vez al día y son un aproximado, no un valor en tiempo real.',
    };
  },
);
