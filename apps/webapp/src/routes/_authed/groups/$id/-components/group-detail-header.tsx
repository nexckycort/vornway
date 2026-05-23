import { Link, useRouter } from '@tanstack/react-router';
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  MoreHorizontal,
  Plus,
  QrCode,
} from 'lucide-react';

import { formatMoney } from './group-detail.utils';

const currencyMeta: Record<string, { flag: string; label: string }> = {
  COP: { flag: '🇨🇴', label: 'COP' },
  USD: { flag: '🇺🇸', label: 'USD' },
  EUR: { flag: '🇪🇺', label: 'EUR' },
  GBP: { flag: '🇬🇧', label: 'GBP' },
  MXN: { flag: '🇲🇽', label: 'MXN' },
  BRL: { flag: '🇧🇷', label: 'BRL' },
};

type GroupDetailHeaderProps = {
  groupId: string;
  groupName: string;
  description: string | null;
  imageUrl: string | null;
  totalsEntries: Array<[string, number]>;
  primaryTotal: [string, number] | undefined;
  creditEntries: Array<[string, number]>;
  debtEntries: Array<[string, number]>;
  onOpenQr: () => void;
  onOpenSettings: () => void;
  onOpenReports: () => void;
};

export function GroupDetailHeader({
  groupId,
  groupName,
  description,
  imageUrl,
  totalsEntries,
  primaryTotal,
  creditEntries,
  debtEntries,
  onOpenQr,
  onOpenSettings,
  onOpenReports,
}: GroupDetailHeaderProps) {
  const router = useRouter();
  const hasMultipleTotals = totalsEntries.length > 1;

  const goBack = () => {
    router.history.back();
  };

  const getCurrencyMeta = (currency: string) =>
    currencyMeta[currency] ?? { flag: '💱', label: currency };

  return (
    <header className="px-4 pb-6 pt-6 text-white">
      <div className="mb-5 flex items-start gap-3">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/15"
          aria-label="Atrás"
        >
          <ArrowLeft className="size-4" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={groupName}
                className="size-11 shrink-0 rounded-2xl object-cover"
                referrerPolicy="no-referrer"
              />
            ) : null}
            <h1 className="truncate text-xl font-semibold leading-7">
              {groupName}
            </h1>
          </div>
          <p className="truncate text-sm text-white/55">
            {description ? ` · ${description}` : ''}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenQr}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/15"
          aria-label="Código QR del grupo"
        >
          <QrCode className="size-6" />
        </button>
      </div>

      <section className="rounded-[28px] bg-[#1f1f1f] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.25)]">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/85">
            {hasMultipleTotals ? (
              <span>Gastos separados</span>
            ) : (
              <>
                <span>{getCurrencyMeta(primaryTotal?.[0] ?? 'COP').flag}</span>
                <span>{getCurrencyMeta(primaryTotal?.[0] ?? 'COP').label}</span>
              </>
            )}
          </span>
          <span className="text-xs text-white/45">
            {hasMultipleTotals ? 'Gastado por moneda' : 'Total del grupo'}
          </span>
        </div>

        {hasMultipleTotals ? (
          <div className="-mx-1 mt-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex snap-x snap-mandatory gap-3 px-1">
              {totalsEntries.map(([currency, amount]) => {
                const meta = getCurrencyMeta(currency);

                return (
                  <article
                    key={currency}
                    className="min-w-[calc(100%-1rem)] snap-start rounded-[22px] bg-white/[0.07] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/85">
                        <span>{meta.flag}</span>
                        <span>{meta.label}</span>
                      </span>
                      <span className="text-[11px] font-medium text-white/45">
                        Moneda usada
                      </span>
                    </div>
                    <h2 className="mt-3 whitespace-nowrap text-3xl font-bold tracking-tight text-white">
                      {formatMoney(currency, Math.abs(amount))}
                    </h2>
                    <p className="mt-1 text-xs font-medium text-white/50">
                      Gastado en {currency}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        ) : (
          <h2 className="mt-2 text-4xl font-bold tracking-tight text-white">
            {primaryTotal
              ? formatMoney(primaryTotal[0], Math.abs(primaryTotal[1]))
              : formatMoney('COP', 0)}
          </h2>
        )}

        <div className="mt-3 space-y-3">
          {creditEntries.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-emerald-200">Te deben</p>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {creditEntries.map(([currency, amount]) => (
                  <span
                    key={`credit-${currency}`}
                    className="inline-flex shrink-0 items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-medium text-emerald-200"
                  >
                    <span>{getCurrencyMeta(currency).flag}</span>
                    <span>{getCurrencyMeta(currency).label}</span>
                    <span className="text-emerald-100/60">·</span>
                    <span>{formatMoney(currency, Math.abs(amount))}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {debtEntries.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-rose-200">Debes</p>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {debtEntries.map(([currency, amount]) => (
                  <span
                    key={`debt-${currency}`}
                    className="inline-flex shrink-0 items-center gap-2 rounded-full bg-rose-500/15 px-3 py-1 text-[11px] font-medium text-rose-200"
                  >
                    <span>{getCurrencyMeta(currency).flag}</span>
                    <span>{getCurrencyMeta(currency).label}</span>
                    <span className="text-rose-100/60">·</span>
                    <span>{formatMoney(currency, Math.abs(amount))}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <div className="mt-4 grid grid-cols-4 gap-2">
        <Link
          to="/groups/$id/add-expense"
          params={{ id: groupId }}
          className="flex flex-col items-center gap-2"
        >
          <span className="flex size-14 items-center justify-center rounded-2xl bg-[#ff4d6a] text-white shadow-[0_8px_18px_rgba(255,77,106,0.35)]">
            <Plus className="size-6" />
          </span>
          <span className="text-center text-[11px] font-medium text-white/85">
            Crear gasto
          </span>
        </Link>

        <Link
          to="/groups/$id/settle"
          params={{ id: groupId }}
          className="flex flex-col items-center gap-2"
        >
          <span className="flex size-14 items-center justify-center rounded-2xl bg-white/10 text-white">
            <ArrowUpRight className="size-6" />
          </span>
          <span className="text-center text-[11px] font-medium text-white/85">
            Liquidar
          </span>
        </Link>

        <button
          type="button"
          onClick={onOpenReports}
          className="flex flex-col items-center gap-2"
        >
          <span className="flex size-14 items-center justify-center rounded-2xl bg-white/10 text-white">
            <BarChart3 className="size-6" />
          </span>
          <span className="text-center text-[11px] font-medium text-white/85">
            Reportes
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          className="flex flex-col items-center gap-2"
        >
          <span className="flex size-14 items-center justify-center rounded-2xl bg-white/10 text-white">
            <MoreHorizontal className="size-6" />
          </span>
          <span className="text-center text-[11px] font-medium text-white/85">
            Ajustes
          </span>
        </button>
      </div>
    </header>
  );
}
