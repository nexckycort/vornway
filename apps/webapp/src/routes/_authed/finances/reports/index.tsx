import { useQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { m } from '#/paraglide/messages.js';
import {
  currency,
  currentMonthKey,
  getBrowserTimeZone,
  getCurrencyValue,
  summaryEndpoint,
} from '../-components/finance-model';
import { FinanceReportsView } from '../-components/finance-reports-view';

export const Route = createFileRoute('/_authed/finances/reports/')({
  validateSearch: (search: Record<string, unknown>) => ({
    month:
      typeof search.month === 'string' && /^\d{4}-\d{2}$/.test(search.month)
        ? search.month
        : currentMonthKey(),
  }),
  component: ReportsRoute,
});

function ReportsRoute() {
  const navigate = useNavigate({ from: Route.fullPath });
  const { month } = Route.useSearch();
  const timeZone = getBrowserTimeZone();
  const summaryQuery = useQuery({
    queryKey: ['finances-summary', month, currency, timeZone],
    queryFn: async () => {
      const response = await summaryEndpoint({
        query: { month, currency, timeZone },
      });
      if (!response.ok) throw new Error(m['finances.loadError']());
      return response.json();
    },
  });

  if (summaryQuery.isLoading) {
    return (
      <main className="min-h-screen bg-[#f7f7f4] px-5 pt-8 text-[#101113]">
        <div className="mx-auto max-w-[560px] rounded-[30px] bg-white p-6 text-sm text-black/50">
          {m['common.loading']()}
        </div>
      </main>
    );
  }

  if (summaryQuery.isError || !summaryQuery.data) {
    return (
      <main className="min-h-screen bg-[#f7f7f4] px-5 pt-8 text-[#101113]">
        <div className="mx-auto max-w-[560px] rounded-[30px] bg-white p-6 text-sm text-red-700">
          {m['finances.loadError']()}
        </div>
      </main>
    );
  }

  const summary = summaryQuery.data;
  const value = (values: Record<string, number>) =>
    getCurrencyValue(values, currency);

  return (
    <FinanceReportsView
      month={month}
      summary={summary}
      income={value(summary.totals.incomeByCurrency)}
      totalExpense={value(summary.totals.totalExpenseByCurrency)}
      personalExpense={value(summary.totals.personalExpenseByCurrency)}
      groupExpense={value(summary.totals.groupExpenseByCurrency)}
      balance={value(summary.totals.balanceByCurrency)}
      owedByYou={value(summary.totals.owedByYouByCurrency)}
      owedToYou={value(summary.totals.owedToYouByCurrency)}
      goalSaved={value(summary.totals.goalSavedByCurrency)}
      goalTarget={value(summary.totals.goalTargetByCurrency)}
      accountAvailable={value(summary.totals.accountAvailableByCurrency)}
      accountLocked={value(summary.totals.accountLockedByCurrency)}
      onBack={() =>
        void navigate({
          to: '/finances',
          search: {
            view: 'dashboard',
            month,
            transactionId: undefined,
            accountId: undefined,
          },
        })
      }
    />
  );
}
