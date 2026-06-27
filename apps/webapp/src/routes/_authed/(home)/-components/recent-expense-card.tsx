import { Link, useLocation } from '@tanstack/react-router';
import { Clock3 } from 'lucide-react';
import {
  getGroupFlowEntryState,
  getLocationHref,
} from '#/lib/group-flow-navigation';
import type { HomeRecentExpense } from '#/routes/_authed/(home)/-hooks/use-home-recent-expenses-query';
import { getHomeMessages } from '#/routes/_authed/(home)/-messages';
import { CategoryIcon } from '#/routes/_authed/groups/$id/-components/category-icon';
import {
  formatDate,
  formatMoney,
  getExpenseEmoji,
} from '#/routes/_authed/groups/$id/-components/group-detail.utils';

type RecentExpenseCardProps = {
  item: HomeRecentExpense;
};

export function RecentExpenseCard({ item }: RecentExpenseCardProps) {
  const location = useLocation();
  const t = getHomeMessages();
  const returnTo = getLocationHref(location);
  const content = (
    <>
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: `${item.expense.category?.color ?? '#0f766e'}16`,
            color: item.expense.category?.color ?? '#0f766e',
          }}
        >
          <CategoryIcon
            icon={item.expense.category?.icon}
            color={item.expense.category?.color}
            fallback={
              <span className="text-lg leading-none">
                {getExpenseEmoji(item.expense)}
              </span>
            }
          />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#111827]">
                {item.expense.description}
              </p>
              <p className="mt-1 truncate text-xs text-[#6b7280]">
                {item.groupName} · {item.expense.paidBy.name}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold text-[#111827]">
                {formatMoney(item.expense.currency, item.expense.amount)}
              </p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-[#6b7280]">
                <Clock3 className="size-3.5" />
                {formatDate(item.expense.date)}
              </p>
            </div>
          </div>

          {item.syncStatus === 'pending' ? (
            <p className="mt-2 text-xs font-medium text-amber-600">
              {t.pendingSync}
            </p>
          ) : null}
        </div>
      </div>
    </>
  );

  if (item.syncStatus === 'pending') {
    return (
      <div className="rounded-[24px] border border-amber-100 bg-amber-50 px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
        {content}
      </div>
    );
  }

  return (
    <Link
      to="/groups/$id/expense/$expenseId"
      params={{ id: item.groupId, expenseId: item.expense.id }}
      state={getGroupFlowEntryState(returnTo)}
      className="block rounded-[24px] border border-[#e5e7eb] bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition-transform active:translate-y-px"
    >
      {content}
    </Link>
  );
}
