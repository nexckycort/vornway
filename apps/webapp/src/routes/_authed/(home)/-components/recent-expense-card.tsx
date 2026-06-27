import { Link } from '@tanstack/react-router';
import { Clock3, UsersRound } from 'lucide-react';
import type { HomeRecentExpense } from '#/routes/_authed/(home)/-hooks/use-home-recent-expenses-query';
import {
  formatDate,
  formatMoney,
} from '#/routes/_authed/groups/$id/-components/group-detail.utils';

type RecentExpenseCardProps = {
  item: HomeRecentExpense;
};

export function RecentExpenseCard({ item }: RecentExpenseCardProps) {
  return (
    <Link
      to="/expenses/friends/$quickSplitId/$expenseId"
      params={{ quickSplitId: item.quickSplitId, expenseId: item.id }}
      className="block rounded-[24px] border border-[#e5e7eb] bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition-transform active:translate-y-px"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#fff1f5] text-primary">
          <UsersRound className="size-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#111827]">
                {item.description}
              </p>
              <p className="mt-1 truncate text-xs text-[#6b7280]">
                {item.quickSplitName} · {item.paidBy.name}
              </p>
              <p className="mt-1 text-xs text-[#9ca3af]">
                {item.participantCount} personas
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold text-[#111827]">
                {formatMoney(item.currency, item.amount)}
              </p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-[#6b7280]">
                <Clock3 className="size-3.5" />
                {formatDate(item.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
