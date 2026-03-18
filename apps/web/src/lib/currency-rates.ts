import { Prisma } from '~/generated/prisma/client';
import { db } from '~/infrastructure/database/connection';

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
export const SUPPORTED_CURRENCIES = ['COP', 'USD', 'EUR'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

interface FrankfurterLatestResponse {
  amount?: number;
  base: 'EUR';
  date: string;
  rates: Record<string, number>;
}

interface OpenExchangeRateResponse {
  result: string;
  time_last_update_unix: number;
  base_code: 'EUR';
  rates: Record<string, number>;
}

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
    throw new Error(`El proveedor no devolvió una tasa válida para EUR -> ${quoteCurrency}`);
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
      } as unknown as Prisma.InputJsonValue,
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
      response: fallbackPayload as unknown as Prisma.InputJsonValue,
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

  await db.$transaction(
    rates.map((rate) =>
      db.currencyRate.create({
        data: {
          baseCurrency: rate.baseCurrency,
          quoteCurrency: rate.quoteCurrency,
          rate: rate.rate,
          effectiveDate,
          metadata: metadataPayload,
        },
      }),
    ),
  );
}
