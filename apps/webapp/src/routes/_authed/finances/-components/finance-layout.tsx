import type { ReactNode } from 'react';
import { m } from '#/paraglide/messages.js';
import { formatMonthLabel } from './finance-model';

export function ScreenShell({
  title,
  month,
  onBack,
  children,
}: {
  title: string;
  month: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#efefef] text-[#101113] md:px-4 md:py-4">
      <div className="mx-auto flex min-h-screen w-full max-w-[412px] flex-col bg-[#fafafa] px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-[calc(var(--safe-top)+1rem)] md:min-h-[calc(100dvh-2rem)] md:max-w-5xl md:rounded-[28px] md:px-5 md:pt-6">
        <header className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex size-11 items-center justify-center rounded-full border border-black/10 bg-white text-xl"
            aria-label={m['finances.back']()}
          >
            <span aria-hidden="true">‹</span>
          </button>
          <div className="min-w-0 text-center">
            <p className="text-xs font-medium text-black/45">
              {formatMonthLabel(month)}
            </p>
            <h1 className="truncate text-lg font-semibold">{title}</h1>
          </div>
          <div className="size-11" />
        </header>
        <div className="mt-7">{children}</div>
      </div>
    </main>
  );
}

export function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-[26px] border border-black/5 bg-white p-4">
      <p className="truncate text-sm text-black/45">{label}</p>
      <p className="mt-2 truncate text-xl font-semibold">{value}</p>
    </div>
  );
}

export function FinanceTab({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 shrink-0 rounded-full px-4 text-sm font-medium shadow-[0_1px_1px_rgba(0,0,0,0.05)] ${
        active
          ? 'bg-[#0d0809] text-white'
          : 'border border-[#e9e9e9] bg-white text-[#1e1e1e]'
      }`}
    >
      {children}
    </button>
  );
}
