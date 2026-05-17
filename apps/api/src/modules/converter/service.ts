import { Prisma } from '~/generated/prisma/client';
import { db } from '~/infrastructure/database/connection';

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
export const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'COP'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

type FrankfurterLatestResponse = {
  amount?: number;
  base: 'EUR';
  date: string;
  rates: Record<string, number>;
};

type OpenExchangeRateResponse = {
  result: string;
  time_last_update_unix: number;
  base_code: 'EUR';
  rates: Record<string, number>;
};

type CurrencyRateItem = {
  id: string;
  baseCurrency: SupportedCurrency;
  quoteCurrency: SupportedCurrency;
  rate: number;
  effectiveDate: Date;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
};

export type CurrencyConverterResponse = {
  currencies: SupportedCurrency[];
  rates: CurrencyRateItem[];
  lastUpdatedAt: Date | null;
  disclaimer: string;
};

async function fetchFrankfurterRate(
  quoteCurrency: 'USD' | 'COP',
): Promise<FrankfurterLatestResponse> {
  const response = await fetch(
    `https://api.frankfurter.dev/v1/latest?base=EUR&symbols=${quoteCurrency}`,
  );

  if (!response.ok) {
    throw new Error('No se pudo actualizar la tasa desde el proveedor externo');
  }

  return (await response.json()) as FrankfurterLatestResponse;
}

async function fetchOpenExchangeRates(): Promise<OpenExchangeRateResponse> {
  const response = await fetch('https://open.er-api.com/v6/latest/EUR');

  if (!response.ok) {
    throw new Error('No se pudo actualizar la tasa desde el proveedor externo');
  }

  return (await response.json()) as OpenExchangeRateResponse;
}

function readProviderRate(
  payload: FrankfurterLatestResponse,
  quoteCurrency: 'USD' | 'COP',
): number {
  const value = payload.rates[quoteCurrency];

  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(
      `El proveedor no devolvió una tasa válida para EUR -> ${quoteCurrency}`,
    );
  }

  return value;
}

export async function ensureCurrencyRatesFresh() {
  const latestStoredRate = await db.currencyRate.findFirst({
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      createdAt: true,
    },
  });

  if (
    latestStoredRate &&
    Date.now() - latestStoredRate.createdAt.getTime() < SIX_HOURS_MS
  ) {
    return;
  }

  let eurToUsd: number;
  let eurToCop: number;
  let effectiveDate: Date;
  let metadataPayload: Prisma.InputJsonValue;

  try {
    const usdPayload = await fetchFrankfurterRate('USD');
    const copPayload = await fetchFrankfurterRate('COP');
    eurToUsd = readProviderRate(usdPayload, 'USD');
    eurToCop = readProviderRate(copPayload, 'COP');
    effectiveDate = new Date(`${usdPayload.date}T00:00:00.000Z`);
    metadataPayload = {
      provider: 'frankfurter',
      fetchedAt: new Date().toISOString(),
      response: {
        usd: usdPayload,
        cop: copPayload,
      },
    } as Prisma.InputJsonValue;
  } catch {
    const fallbackPayload = await fetchOpenExchangeRates();
    const usdRate = fallbackPayload.rates.USD;
    const copRate = fallbackPayload.rates.COP;

    if (
      fallbackPayload.result !== 'success' ||
      typeof usdRate !== 'number' ||
      !Number.isFinite(usdRate) ||
      usdRate <= 0 ||
      typeof copRate !== 'number' ||
      !Number.isFinite(copRate) ||
      copRate <= 0
    ) {
      throw new Error('No se pudo actualizar la tasa desde el proveedor externo');
    }

    eurToUsd = usdRate;
    eurToCop = copRate;
    effectiveDate = new Date(fallbackPayload.time_last_update_unix * 1000);
    metadataPayload = {
      provider: 'open.er-api',
      fetchedAt: new Date().toISOString(),
      response: fallbackPayload,
    } as Prisma.InputJsonValue;
  }

  const usdToEur = 1 / eurToUsd;
  const copToEur = 1 / eurToCop;
  const usdToCop = eurToCop / eurToUsd;
  const copToUsd = eurToUsd / eurToCop;

  const rates = [
    { baseCurrency: 'EUR', quoteCurrency: 'USD', rate: eurToUsd },
    { baseCurrency: 'EUR', quoteCurrency: 'COP', rate: eurToCop },
    { baseCurrency: 'USD', quoteCurrency: 'EUR', rate: usdToEur },
    { baseCurrency: 'COP', quoteCurrency: 'EUR', rate: copToEur },
    { baseCurrency: 'USD', quoteCurrency: 'COP', rate: usdToCop },
    { baseCurrency: 'COP', quoteCurrency: 'USD', rate: copToUsd },
  ] as const;

  await db.currencyRate.createMany({
    data: rates.map((rate) => ({
      baseCurrency: rate.baseCurrency,
      quoteCurrency: rate.quoteCurrency,
      rate: rate.rate,
      effectiveDate,
      metadata: metadataPayload,
    })),
  });
}

export async function getCurrencyConverter(): Promise<CurrencyConverterResponse> {
  await ensureCurrencyRatesFresh();

  const rateRecords = await db.currencyRate.findMany({
    where: {
      baseCurrency: { in: [...SUPPORTED_CURRENCIES] },
      quoteCurrency: { in: [...SUPPORTED_CURRENCIES] },
    },
    orderBy: [{ createdAt: 'desc' }, { effectiveDate: 'desc' }],
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
      ? rates.reduce(
          (latest, current) =>
            current.effectiveDate > latest ? current.effectiveDate : latest,
          rates[0].effectiveDate,
        )
      : null;

  return {
    currencies: [...SUPPORTED_CURRENCIES],
    rates,
    lastUpdatedAt,
    disclaimer:
      'Estas tasas se actualizan cada 6 horas y son un aproximado, no un valor en tiempo real.',
  };
}
