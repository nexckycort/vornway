import { client, type InferResponseType } from '#/lib/hc';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronsUpDown,
  RefreshCw,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

const converterEndpoint = client.api.converter.$get;
type ConverterApiResponse = Extract<
  InferResponseType<typeof converterEndpoint>,
  { currencies: unknown }
>;
type SupportedCurrency = ConverterApiResponse['currencies'][number];

const CURRENCY_META: Record<string, { flag: string; name: string }> = {
  COP: { flag: '🇨🇴', name: 'Peso colombiano' },
  USD: { flag: '🇺🇸', name: 'Dólar estadounidense' },
  EUR: { flag: '🇪🇺', name: 'Euro' },
  GBP: { flag: '🇬🇧', name: 'Libra esterlina' },
  MXN: { flag: '🇲🇽', name: 'Peso mexicano' },
  BRL: { flag: '🇧🇷', name: 'Real brasileño' },
};

export const Route = createFileRoute('/_authed/converter')({
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();
  const [amountInput, setAmountInput] = useState('1');
  const [fromCurrency, setFromCurrency] = useState<SupportedCurrency>('EUR');
  const [toCurrency, setToCurrency] = useState<SupportedCurrency>('COP');

  const converterQuery = useQuery({
    queryKey: ['currency-converter'],
    queryFn: async () => {
      const response = await converterEndpoint();

      if (!response.ok) {
        throw new Error('No se pudo cargar el convertidor');
      }

      return (await response.json()) as ConverterApiResponse;
    },
  });

  const rateMap = useMemo(() => {
    const map = new Map<
      string,
      { rate: number; effectiveDate: string; createdAt: string }
    >();

    for (const rate of converterQuery.data?.rates ?? []) {
      map.set(`${rate.baseCurrency}-${rate.quoteCurrency}`, {
        rate: rate.rate,
        effectiveDate: rate.effectiveDate,
        createdAt: rate.createdAt,
      });
    }

    return map;
  }, [converterQuery.data?.rates]);

  const parsedAmount = Number(amountInput.replace(',', '.'));
  const amount = Number.isFinite(parsedAmount) ? parsedAmount : 0;
  const selectedRate = rateMap.get(`${fromCurrency}-${toCurrency}`) ?? null;
  const convertedAmount =
    fromCurrency === toCurrency
      ? amount
      : selectedRate
        ? amount * selectedRate.rate
        : null;

  if (converterQuery.isLoading) {
    return (
      <main className="min-h-screen bg-[#f4f6fb]">
        <div className="mx-auto flex min-h-screen w-full max-w-[412px] md:max-w-5xl items-center justify-center px-4">
          <p className="text-sm text-[#64748b]">Cargando convertidor...</p>
        </div>
      </main>
    );
  }

  if (converterQuery.isError || !converterQuery.data) {
    return (
      <main className="min-h-screen bg-[#f4f6fb]">
        <div className="mx-auto flex min-h-screen w-full max-w-[412px] md:max-w-5xl flex-col justify-center px-4">
          <div className="rounded-[28px] border border-[#e2e8f0] bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-[#0f172a]">
              No se pudo cargar el convertidor
            </p>
            <p className="mt-2 text-sm text-[#64748b]">
              {converterQuery.error instanceof Error
                ? converterQuery.error.message
                : 'Intenta de nuevo en unos segundos.'}
            </p>
            <button
              type="button"
              onClick={() => router.history.back()}
              className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
            >
              Volver
            </button>
          </div>
        </div>
      </main>
    );
  }

  const { currencies, disclaimer, lastUpdatedAt } = converterQuery.data;
  const formattedLastUpdatedAt = lastUpdatedAt
    ? new Intl.DateTimeFormat('es-CO', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(lastUpdatedAt))
    : null;

  return (
    <main className="min-h-screen bg-[#f5f7fb]">
      <div className="mx-auto flex min-h-screen w-full max-w-[412px] md:max-w-5xl flex-col px-4 pb-6 pt-5">
        <header className="mb-4">
          <button
            type="button"
            onClick={() => router.history.back()}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#1f2937]"
          >
            <ChevronLeft className="size-5" />
            Atrás
          </button>

          <div className="mt-4 rounded-[28px] border border-[#e2e8f0] bg-white px-4 py-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-[#fff1f5] text-primary">
                <ArrowLeftRight className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">
                  Convertidor
                </p>
                <h1 className="text-2xl font-semibold leading-tight text-[#0f172a]">
                  Monedas
                </h1>
                <p className="mt-1 text-sm text-[#64748b]">
                  Convierte entre monedas con tasas de referencia actualizadas.
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="rounded-[30px] border border-[#e2e8f0] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[#0f172a]">Conversión</p>
              <p className="text-xs text-[#64748b]">
                {formattedLastUpdatedAt
                  ? `Última actualización ${formattedLastUpdatedAt}`
                  : 'Sin actualizaciones recientes'}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#f8fafc] px-3 py-1 text-xs font-medium text-[#475569]">
              <RefreshCw className="size-3.5" />
              Aproximado
            </span>
          </div>

          <div className="mt-4 rounded-[24px] border border-[#e2e8f0] bg-[#f8fafc] p-4">
            <label
              htmlFor="converter-amount"
              className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]"
            >
              Monto
            </label>
            <input
              id="converter-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
              className="w-full border-0 bg-transparent text-3xl font-semibold text-[#0f172a] outline-none placeholder:text-[#94a3b8]"
              placeholder="0"
            />
          </div>

          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-end gap-3">
            <div className="rounded-[22px] border border-[#e2e8f0] bg-[#f8fafc] px-3 py-3">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">
                Desde
              </label>
              <div className="relative">
                <select
                  value={fromCurrency}
                  onChange={(event) =>
                    setFromCurrency(event.target.value as SupportedCurrency)
                  }
                  className="w-full appearance-none border-0 bg-transparent pr-7 text-lg font-semibold text-[#0f172a] outline-none"
                >
                  {currencies.map((currency) => (
                    <option key={`from-${currency}`} value={currency}>
                      {`${CURRENCY_META[currency]?.flag ?? '💱'} ${currency}`}
                    </option>
                  ))}
                </select>
                <ChevronsUpDown className="pointer-events-none absolute right-0 top-1/2 size-4 -translate-y-1/2 text-[#64748b]" />
              </div>
              <p className="mt-1 truncate text-xs text-[#64748b]">
                {CURRENCY_META[fromCurrency]?.name ?? 'Moneda origen'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setFromCurrency(toCurrency);
                setToCurrency(fromCurrency);
              }}
              className="mb-1 inline-flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm"
            >
              <ArrowLeftRight className="size-4" />
            </button>

            <div className="rounded-[22px] border border-[#e2e8f0] bg-[#f8fafc] px-3 py-3">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">
                Hacia
              </label>
              <div className="relative">
                <select
                  value={toCurrency}
                  onChange={(event) =>
                    setToCurrency(event.target.value as SupportedCurrency)
                  }
                  className="w-full appearance-none border-0 bg-transparent pr-7 text-lg font-semibold text-[#0f172a] outline-none"
                >
                  {currencies.map((currency) => (
                    <option key={`to-${currency}`} value={currency}>
                      {`${CURRENCY_META[currency]?.flag ?? '💱'} ${currency}`}
                    </option>
                  ))}
                </select>
                <ChevronsUpDown className="pointer-events-none absolute right-0 top-1/2 size-4 -translate-y-1/2 text-[#64748b]" />
              </div>
              <p className="mt-1 truncate text-xs text-[#64748b]">
                {CURRENCY_META[toCurrency]?.name ?? 'Moneda destino'}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-[24px] bg-[#0f172a] px-4 py-5 text-white">
            <p className="text-xs uppercase tracking-[0.18em] text-white/60">
              Resultado
            </p>
            <p className="mt-2 text-3xl font-semibold leading-tight">
              {convertedAmount !== null
                ? formatMoney(convertedAmount, toCurrency)
                : 'Sin tasa disponible'}
            </p>
            <p className="mt-2 text-sm text-white/70">
              {fromCurrency === toCurrency
                ? 'Misma moneda, no se aplica conversión.'
                : selectedRate
                  ? `1 ${fromCurrency} = ${formatMoney(selectedRate.rate, toCurrency)}`
                  : `No hay una tasa registrada para ${fromCurrency} -> ${toCurrency}.`}
            </p>
          </div>
        </section>

        <p className="mt-4 px-1 text-sm leading-6 text-[#64748b]">
          {disclaimer}
        </p>
      </div>
    </main>
  );
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}
