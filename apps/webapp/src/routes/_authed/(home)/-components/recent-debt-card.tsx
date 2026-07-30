import { Wallet02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Link } from '@tanstack/react-router';
import type { RecentDebt } from '#/routes/_authed/(home)/-hooks/use-home-query';

type RecentDebtCardProps = {
  debt: RecentDebt;
};

export function RecentDebtCard({ debt }: RecentDebtCardProps) {
  return (
    <Link
      to="/debts/$id"
      params={{ id: debt.id }}
      preload="intent"
      className="block rounded-[24px] border border-[#f4f4f4] bg-white px-5 py-4 shadow-[0_20px_40px_rgba(0,0,0,0.04)] transition-transform active:translate-y-px"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#eef6ff] text-[#0f6fde]">
          <HugeiconsIcon
            icon={Wallet02Icon}
            className="size-5"
            aria-hidden="true"
          />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold leading-6">
                {debt.name}
              </h3>
              <p className="text-xs leading-4 text-[#4c4c4c]">
                {debt.counterpartyName} · {debt.directionLabel}
              </p>
            </div>
            <p className="shrink-0 text-right text-base font-semibold leading-6">
              {debt.remaining}
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 text-xs leading-4">
            <span className="rounded-full bg-[#f4f4f5] px-2.5 py-1 font-medium text-[#52525b]">
              {debt.statusLabel}
            </span>
            <span className="text-[#797979]">{debt.updatedAtLabel}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
