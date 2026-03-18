import { useQuery } from '@tanstack/react-query';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { ArrowLeftRight, ChevronLeft, Repeat2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { formatMoney } from '~/lib/money';

import { getCurrencyConverter } from '../(home)/-actions/get-currency-converter';

export const Route = createFileRoute('/_authed/converter/')({
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();
  const [amountInput, setAmountInput] = useState('1');
  const [fromCurrency, setFromCurrency] = useState<'EUR' | 'USD' | 'COP'>('EUR');
  const [toCurrency, setToCurrency] = useState<'EUR' | 'USD' | 'COP'>('COP');

  const { data, isLoading, error } = useQuery({
    queryKey: ['currency-converter'],
    queryFn: () => getCurrencyConverter(),
  });

  const rateMap = useMemo(() => {
    const map = new Map<string, { rate: number; effectiveDate: Date }>();

    for (const rate of data?.rates ?? []) {
      map.set(`${rate.baseCurrency}-${rate.quoteCurrency}`, {
        rate: rate.rate,
        effectiveDate: new Date(rate.effectiveDate),
      });
    }

    return map;
  }, [data?.rates]);

  const parsedAmount = Number(amountInput.replace(',', '.'));
  const amount = Number.isFinite(parsedAmount) ? parsedAmount : 0;
  const selectedRate = rateMap.get(`${fromCurrency}-${toCurrency}`) ?? null;
  const convertedAmount =
    fromCurrency === toCurrency
      ? amount
      : selectedRate
        ? amount * selectedRate.rate
        : null;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f6fb]">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f5f6fb] p-6">
        <p className="mb-6 text-center text-gray-500">
          {error instanceof Error
            ? error.message
            : 'No se pudo cargar el conversor'}
        </p>
        <button
          type="button"
          onClick={() => router.history.back()}
          className="rounded-2xl bg-[#1f4ed8] px-6 py-3 text-white"
        >
          Volver
        </button>
      </div>
    );
  }

  const currencyOptions = data.currencies;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#edf4ff_0%,#f6f2e9_42%,#f5f6fb_100%)] pb-10">
      <div className="mx-auto w-full max-w-md px-4 pt-4">
        <div className="rounded-[28px] border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur-md">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => router.history.back()}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eef3ff]"
            >
              <ChevronLeft className="h-6 w-6 text-[#1a1a3e]" />
            </button>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#6b7a90]">
                Herramienta rápida
              </p>
              <h1 className="truncate text-2xl font-semibold text-[#132238]">
                Conversor de monedas
              </h1>
              <p className="text-sm text-[#68768a]">
                EUR, USD y COP con tasas diarias aproximadas
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-[30px] border border-white/70 bg-[#132238] p-4 text-white shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            <p className="text-sm font-medium text-white/80">Conversión</p>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl bg-white/8 p-3">
              <label className="mb-2 block text-xs uppercase tracking-wide text-white/60">
                Monto
              </label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amountInput}
                onChange={(event) => setAmountInput(event.target.value)}
                className="w-full bg-transparent text-3xl font-semibold text-white outline-none placeholder:text-white/30"
                placeholder="0"
              />
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
              <div className="rounded-2xl bg-white px-3 py-3 text-[#132238]">
                <label className="mb-2 block text-xs uppercase tracking-wide text-[#6b7a90]">
                  Desde
                </label>
                <select
                  value={fromCurrency}
                  onChange={(event) =>
                    setFromCurrency(event.target.value as 'EUR' | 'USD' | 'COP')
                  }
                  className="w-full bg-transparent text-lg font-semibold outline-none"
                >
                  {currencyOptions.map((currency) => (
                    <option key={`from-${currency}`} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  setFromCurrency(toCurrency);
                  setToCurrency(fromCurrency);
                }}
                className="mb-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#132238]"
              >
                <Repeat2 className="h-5 w-5" />
              </button>

              <div className="rounded-2xl bg-white px-3 py-3 text-[#132238]">
                <label className="mb-2 block text-xs uppercase tracking-wide text-[#6b7a90]">
                  Hacia
                </label>
                <select
                  value={toCurrency}
                  onChange={(event) =>
                    setToCurrency(event.target.value as 'EUR' | 'USD' | 'COP')
                  }
                  className="w-full bg-transparent text-lg font-semibold outline-none"
                >
                  {currencyOptions.map((currency) => (
                    <option key={`to-${currency}`} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-2xl bg-white px-4 py-4 text-[#132238]">
              <p className="text-xs uppercase tracking-wide text-[#6b7a90]">
                Resultado
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {convertedAmount !== null
                  ? formatMoney(convertedAmount, toCurrency)
                  : 'Sin tasa disponible'}
              </p>
              <p className="mt-2 text-sm text-[#68768a]">
                {fromCurrency === toCurrency
                  ? 'Misma moneda, no se aplica conversión.'
                  : selectedRate
                    ? `1 ${fromCurrency} = ${formatMoney(selectedRate.rate, toCurrency)}`
                    : `No hay una tasa registrada para ${fromCurrency} -> ${toCurrency}.`}
              </p>
            </div>
          </div>
        </div>

        <p className="mt-4 px-1 text-sm text-[#68768a]">{data.disclaimer}</p>
      </div>
    </div>
  );
}
