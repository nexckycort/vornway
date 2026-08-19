import { ChevronLeftIcon, ChevronRightIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  createFileRoute,
  Outlet,
  useLocation,
  useNavigate,
} from '@tanstack/react-router';
import { m } from '#/paraglide/messages.js';
import { FinanceTab } from './-components/finance-layout';
import { currentMonthKey, formatMonthLabel } from './-components/finance-model';

export const Route = createFileRoute('/_authed/finances')({
  component: RouteComponent,
});

function RouteComponent() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const month =
    typeof location.search.month === 'string'
      ? location.search.month
      : currentMonthKey();

  function shiftMonth(offset: number) {
    const [year, monthNumber] = month.split('-').map(Number);
    const date = new Date(
      year || new Date().getFullYear(),
      (monthNumber || 1) - 1 + offset,
      1,
    );
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  function setMonth(nextMonth: string) {
    void navigate({
      to: pathname.startsWith('/finances/accounts')
        ? '/finances/accounts'
        : pathname.startsWith('/finances/categories')
          ? '/finances/categories'
          : '/finances',
      search: pathname.startsWith('/finances/accounts')
        ? { month: nextMonth }
        : pathname.startsWith('/finances/categories')
          ? { month: nextMonth }
          : {
              view: 'dashboard',
              month: nextMonth,
              transactionId: undefined,
              accountId: undefined,
            },
    });
  }

  return (
    <div className="min-h-screen bg-[#efefef]">
      <header className="mx-auto flex w-full max-w-[412px] items-center justify-between gap-3 bg-[#fafafa] px-4 pt-[calc(var(--safe-top)+1rem)] md:max-w-5xl md:px-5 md:pt-6">
        <h1 className="truncate text-2xl font-semibold leading-8">
          {m['finances.title']()}
        </h1>
        <div className="flex h-9 shrink-0 items-center gap-1 rounded-full border border-[#e2e8f0] bg-white px-2 shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
          <button
            type="button"
            aria-label={m['finances.previousMonth']()}
            onClick={() => setMonth(shiftMonth(-1))}
            className="flex size-6 items-center justify-center rounded-full text-[#1e1e1e] hover:bg-[#f1f5f9]"
          >
            <HugeiconsIcon icon={ChevronLeftIcon} className="size-4" />
          </button>
          <label className="relative flex h-full min-w-20 items-center justify-center px-1">
            <span className="text-xs font-semibold capitalize text-[#334155]">
              {formatMonthLabel(month)}
            </span>
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label={m['finances.month']()}
            />
          </label>
          <button
            type="button"
            aria-label={m['finances.nextMonth']()}
            onClick={() => setMonth(shiftMonth(1))}
            className="flex size-6 items-center justify-center rounded-full text-[#1e1e1e] hover:bg-[#f1f5f9]"
          >
            <HugeiconsIcon icon={ChevronRightIcon} className="size-4" />
          </button>
        </div>
      </header>
      <nav
        className="mx-auto flex w-full max-w-[412px] gap-2 overflow-x-auto bg-[#fafafa] px-4 pb-0 pt-7 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:max-w-5xl md:px-5"
        aria-label={m['finances.title']()}
      >
        <FinanceTab
          active={pathname === '/finances' || pathname === '/finances/'}
          onClick={() =>
            void navigate({
              to: '/finances',
              search: {
                view: 'dashboard',
                month: currentMonthKey(),
                transactionId: undefined,
                accountId: undefined,
              },
            })
          }
        >
          {m['finances.movements']()}
        </FinanceTab>
        <FinanceTab
          active={pathname.startsWith('/finances/accounts')}
          onClick={() =>
            void navigate({
              to: '/finances/accounts',
              search: { month: currentMonthKey() },
            })
          }
        >
          {m['finances.accounts']()}
        </FinanceTab>
        <FinanceTab onClick={() => void navigate({ to: '/goals' })}>
          {m['finances.goals']()}
        </FinanceTab>
        <FinanceTab
          onClick={() =>
            void navigate({
              to: '/debts',
              search: { from: 'finances' },
            })
          }
        >
          {m['finances.debts']()}
        </FinanceTab>
        <FinanceTab
          active={pathname.startsWith('/finances/categories')}
          onClick={() =>
            void navigate({
              to: '/finances/categories',
              search: { month: currentMonthKey() },
            })
          }
        >
          {m['finances.categories']()}
        </FinanceTab>
      </nav>
      <Outlet />
    </div>
  );
}
