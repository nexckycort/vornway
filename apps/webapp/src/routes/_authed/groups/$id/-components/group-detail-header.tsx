import { Link } from '@tanstack/react-router';
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Info,
  MoreHorizontal,
  Plus,
  QrCode,
} from 'lucide-react';
import type { keepGroupFlowState } from '#/lib/group-flow-navigation';
import { getGroupDetailMessages } from '../-messages';

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
  balanceEntries: Array<[string, number]>;
  onOpenQr: () => void;
  onBack: () => void;
  onOpenSettings: () => void;
  onOpenReports: () => void;
  flowState: ReturnType<typeof keepGroupFlowState>;
  isRefreshing?: boolean;
};

export function GroupDetailHeader({
  groupId,
  groupName,
  description,
  imageUrl,
  totalsEntries,
  primaryTotal,
  balanceEntries,
  onOpenQr,
  onBack,
  onOpenSettings,
  onOpenReports,
  flowState,
  isRefreshing = false,
}: GroupDetailHeaderProps) {
  const t = getGroupDetailMessages();
  const getCurrencyMeta = (currency: string) =>
    currencyMeta[currency] ?? { flag: '💱', label: currency };

  const balanceCurrencies = Array.from(
    new Set([
      ...totalsEntries.map(([currency]) => currency),
      ...balanceEntries.map(([currency]) => currency),
      primaryTotal?.[0] ?? 'COP',
    ]),
  );

  const getEntryAmount = (entries: Array<[string, number]>, currency: string) =>
    entries.find(([entryCurrency]) => entryCurrency === currency)?.[1] ?? 0;

  const hasMultipleCurrencies = balanceCurrencies.length > 1;

  return (
    <header className="relative px-4 pb-4 pt-5 text-white">
      {isRefreshing ? (
        <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-white/20">
          <span className="block h-full w-1/3 animate-[sync-progress_1.1s_ease-in-out_infinite] bg-primary" />
          <span className="sr-only">{t.header.syncingData}</span>
        </div>
      ) : null}
      <div className="mb-3 flex items-start gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/15"
          aria-label={t.common.back}
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
          aria-label={t.header.qrAria}
        >
          <QrCode className="size-6" />
        </button>
      </div>

      <section className="-mx-1 overflow-hidden">
        <div
          className={
            hasMultipleCurrencies
              ? 'overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
              : 'pb-2'
          }
        >
          <div
            className={
              hasMultipleCurrencies
                ? 'flex snap-x snap-mandatory gap-3 px-1'
                : 'px-1'
            }
          >
            {balanceCurrencies.map((currency) => {
              const meta = getCurrencyMeta(currency);
              const totalAmount = getEntryAmount(totalsEntries, currency);
              const balanceAmount = getEntryAmount(balanceEntries, currency);
              const hasBalance = Math.abs(balanceAmount) > 0.01;

              return (
                <article
                  key={currency}
                  className={`min-w-[calc(100%-2rem)] snap-start rounded-[24px] bg-[#2c2226] px-5 py-4 shadow-[0_18px_35px_rgba(0,0,0,0.18)] ${
                    hasBalance
                      ? ''
                      : hasMultipleCurrencies
                        ? 'flex min-h-[158px] flex-col justify-center'
                        : 'flex min-h-[126px] flex-col justify-center'
                  } ${hasMultipleCurrencies ? '' : 'w-full min-w-0'}`}
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-white/85">
                    <span className="text-base leading-none">{meta.flag}</span>
                    <span>{meta.label}</span>
                  </div>

                  <p
                    className={`text-xs font-light text-white/80 ${
                      hasBalance ? 'mt-3' : 'mt-3'
                    }`}
                  >
                    {t.header.totalSpent}
                  </p>
                  <h2 className="mt-2 whitespace-nowrap text-2xl font-semibold tracking-tight text-white">
                    {formatMoney(currency, Math.abs(totalAmount))}
                  </h2>

                  {hasBalance ? (
                    <div className="mt-4 flex items-center justify-between gap-4">
                      {balanceAmount > 0 ? (
                        <p className="min-w-0 text-xs font-light text-white/85">
                          {t.header.theyOweYou}{' '}
                          <span className="font-semibold text-emerald-400">
                            {formatMoney(currency, Math.abs(balanceAmount))}
                          </span>
                        </p>
                      ) : null}
                      {balanceAmount < 0 ? (
                        <p className="min-w-0 text-right text-xs font-light text-white/85">
                          {t.header.youOwe}{' '}
                          <span className="font-semibold text-[#ff4d6a]">
                            {formatMoney(currency, Math.abs(balanceAmount))}
                          </span>
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>

        {hasMultipleCurrencies ? (
          <p className="mt-1 mb-2 flex items-center gap-2 px-1 text-[10px] font-light text-white/85">
            <span>{t.header.multiCurrencyHint}</span>
            <Info className="size-4 shrink-0 text-white" />
          </p>
        ) : null}
      </section>

      <div className="mt-2.5 grid grid-cols-4 gap-2">
        <Link
          to="/groups/$id/add-expense"
          params={{ id: groupId }}
          state={flowState}
          className="flex min-w-0 flex-col items-center gap-1"
        >
          <span className="flex h-9 w-full items-center justify-center rounded-xl bg-[#ff4d6a] text-white shadow-[0_8px_18px_rgba(255,77,106,0.35)]">
            <Plus className="size-5" />
          </span>
          <span className="max-w-full truncate text-center text-[11px] font-medium text-white/85">
            {t.actions.createExpense}
          </span>
        </Link>

        <Link
          to="/groups/$id/settle"
          params={{ id: groupId }}
          search={{ settlementExpenseId: undefined }}
          state={flowState}
          className="flex min-w-0 flex-col items-center gap-1"
        >
          <span className="flex h-9 w-full items-center justify-center rounded-xl bg-white/10 text-white">
            <ArrowUpRight className="size-5" />
          </span>
          <span className="max-w-full truncate text-center text-[11px] font-medium text-white/85">
            {t.actions.settle}
          </span>
        </Link>

        <button
          type="button"
          onClick={onOpenReports}
          className="flex min-w-0 flex-col items-center gap-1"
        >
          <span className="flex h-9 w-full items-center justify-center rounded-xl bg-white/10 text-white">
            <BarChart3 className="size-5" />
          </span>
          <span className="max-w-full truncate text-center text-[11px] font-medium text-white/85">
            {t.actions.reports}
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          className="flex min-w-0 flex-col items-center gap-1"
        >
          <span className="flex h-9 w-full items-center justify-center rounded-xl bg-white/10 text-white">
            <MoreHorizontal className="size-5" />
          </span>
          <span className="max-w-full truncate text-center text-[11px] font-medium text-white/85">
            {t.actions.settings}
          </span>
        </button>
      </div>
    </header>
  );
}
