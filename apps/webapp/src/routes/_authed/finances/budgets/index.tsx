import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '#/components/ui/button';
import { m } from '#/paraglide/messages.js';
import { ScreenShell, SummaryCard } from '../-components/finance-layout';
import {
  categorySpend,
  currency,
  currentMonthKey,
  type FinanceBudgetInput,
  type FinanceCategory,
  getBrowserTimeZone,
  moneyLabel,
  parseMoney,
  summaryEndpoint,
  upsertBudgetEndpoint,
} from '../-components/finance-model';

export const Route = createFileRoute('/_authed/finances/budgets/')({
  validateSearch: (search: Record<string, unknown>) => ({
    month:
      typeof search.month === 'string' && /^\d{4}-\d{2}$/.test(search.month)
        ? search.month
        : currentMonthKey(),
  }),
  component: BudgetsRoute,
});

function BudgetsRoute() {
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: Route.fullPath });
  const { month } = Route.useSearch();
  const timeZone = getBrowserTimeZone();
  const [budgetCategoryId, setBudgetCategoryId] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');

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

  const budgetMutation = useMutation({
    mutationFn: async (input: FinanceBudgetInput) => {
      const response = await upsertBudgetEndpoint({ json: input });
      if (!response.ok) throw new Error(m['finances.budgetSaveFailed']());
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['finances-summary'] });
      setBudgetAmount('');
      toast.success(m['finances.budgetSaved']());
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : m['finances.budgetSaveFailed'](),
      );
    },
  });

  function submitBudget() {
    const parsedAmount = parseMoney(budgetAmount);
    if (!budgetCategoryId || parsedAmount < 0) {
      toast.error(m['finances.budgetValidation']());
      return;
    }

    budgetMutation.mutate({
      categoryId: budgetCategoryId,
      month,
      amount: parsedAmount,
      currency,
    });
  }

  const summary = summaryQuery.data;
  const categories = summary?.categories ?? [];

  return (
    <ScreenShell
      title={m['finances.budgets']()}
      month={month}
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
    >
      {summaryQuery.isLoading ? (
        <div className="rounded-[30px] bg-white p-5 text-sm text-black/45">
          {m['common.loading']()}
        </div>
      ) : summaryQuery.isError || !summary ? (
        <div className="rounded-[30px] bg-white p-5 text-sm text-red-700">
          {m['finances.loadError']()}
        </div>
      ) : (
        <>
          <section className="grid gap-4">
            {summary.budgets.length === 0 ? (
              <div className="rounded-[30px] bg-white p-5 text-sm text-black/45">
                {m['finances.emptyBudgets']()}
              </div>
            ) : (
              summary.budgets.map((budget) => {
                const spent = categorySpend(summary, budget.categoryId);
                const available = Math.max(budget.amount - spent, 0);
                const progress =
                  budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

                return (
                  <article
                    key={budget.id}
                    className="rounded-[30px] bg-white p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-semibold">
                          {budget.category.name}
                        </h2>
                        <p className="mt-1 text-sm text-black/45">
                          {m['finances.available']()}: {moneyLabel(available)}
                        </p>
                      </div>
                      <p className="text-sm font-semibold">
                        {Math.round(Math.min(progress, 999))}%
                      </p>
                    </div>
                    <div className="mt-5 h-2 overflow-hidden rounded-full bg-black/5">
                      <div
                        className="h-full rounded-full bg-[#101113]"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <SummaryCard
                        label={m['finances.spent']()}
                        value={moneyLabel(spent)}
                      />
                      <SummaryCard
                        label={m['finances.limit']()}
                        value={moneyLabel(budget.amount)}
                      />
                    </div>
                  </article>
                );
              })
            )}
          </section>

          <section className="mt-6 rounded-[30px] bg-white p-5">
            <h2 className="text-lg font-semibold">
              {m['finances.createBudget']()}
            </h2>
            <div className="mt-5 grid gap-3">
              <select
                value={budgetCategoryId}
                onChange={(event) => setBudgetCategoryId(event.target.value)}
                className="h-13 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
              >
                <option value="">{m['finances.selectCategory']()}</option>
                {categories
                  .filter(isBudgetCategory)
                  .map((category: FinanceCategory) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </select>
              <input
                inputMode="decimal"
                value={budgetAmount}
                onChange={(event) => setBudgetAmount(event.target.value)}
                placeholder={m['finances.budgetPlaceholder']()}
                className="h-13 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
              />
              <Button
                type="button"
                onClick={submitBudget}
                disabled={budgetMutation.isPending}
                className="h-12 rounded-full"
              >
                {budgetMutation.isPending
                  ? m['common.saving']()
                  : m['finances.saveBudget']()}
              </Button>
            </div>
          </section>
        </>
      )}
    </ScreenShell>
  );
}

function isBudgetCategory(category: FinanceCategory) {
  return (
    category.transactionType === 'EXPENSE' ||
    category.transactionType === 'BOTH'
  );
}
