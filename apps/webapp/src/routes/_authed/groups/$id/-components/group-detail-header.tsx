import { Link } from '@tanstack/react-router';
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  MoreHorizontal,
  Plus,
  QrCode,
} from 'lucide-react';

import { formatMoney } from './group-detail.utils';

type GroupDetailHeaderProps = {
  groupId: string;
  groupName: string;
  description: string | null;
  imageUrl: string | null;
  totalsEntries: Array<[string, number]>;
  primaryTotal: [string, number] | undefined;
  balanceLabel: string;
  balanceTone: string;
  offlinePendingCount: number;
  onOpenQr: () => void;
  onOpenMore: () => void;
  onOpenReports: () => void;
};

export function GroupDetailHeader({
  groupId,
  groupName,
  description,
  imageUrl,
  totalsEntries,
  primaryTotal,
  balanceLabel,
  balanceTone,
  offlinePendingCount,
  onOpenQr,
  onOpenMore,
  onOpenReports,
}: GroupDetailHeaderProps) {
  return (
    <header className="px-4 pb-6 pt-6 text-white">
      <div className="mb-5 flex items-start gap-3">
        <button
          type="button"
          onClick={() => window.history.back()}
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
          <span className="inline-flex rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/75">
            {primaryTotal ? primaryTotal[0] : 'COP'}
          </span>
          <span className="text-xs text-white/45">Total del grupo</span>
        </div>

        <h2 className="mt-2 text-4xl font-bold tracking-tight text-white">
          {primaryTotal
            ? formatMoney(primaryTotal[0], Math.abs(primaryTotal[1]))
            : formatMoney('COP', 0)}
        </h2>

        <p className={`mt-2 text-sm font-medium ${balanceTone}`}>
          {balanceLabel}
        </p>

        {offlinePendingCount > 0 ? (
          <div className="mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-700">
            {offlinePendingCount === 1
              ? '1 gasto pendiente de sincronizar'
              : `${offlinePendingCount} gastos pendientes de sincronizar`}
          </div>
        ) : null}

        {totalsEntries.length > 1 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {totalsEntries.map(([currency, amount]) => (
              <span
                key={currency}
                className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-white/70"
              >
                {formatMoney(currency, Math.abs(amount))}
              </span>
            ))}
          </div>
        ) : null}
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
          onClick={onOpenMore}
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
