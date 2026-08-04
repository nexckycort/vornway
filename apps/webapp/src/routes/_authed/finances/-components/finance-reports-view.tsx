import type { ReactNode } from 'react';
import { formatCurrency } from '#/lib/i18n';
import { m } from '#/paraglide/messages.js';
import { ScreenShell } from './finance-layout';
import {
  categorySpend,
  currency,
  type FinanceSummary,
  getAccountTypeLabel,
  getCurrencyValue,
  moneyLabel,
} from './finance-model';

type FinanceReportsViewProps = {
  month: string;
  summary: FinanceSummary;
  income: number;
  totalExpense: number;
  personalExpense: number;
  groupExpense: number;
  balance: number;
  owedByYou: number;
  owedToYou: number;
  goalSaved: number;
  goalTarget: number;
  accountAvailable: number;
  accountLocked: number;
  onBack: () => void;
};

function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function progressWidth(value: number) {
  return `${Math.min(Math.max(value, 0), 100)}%`;
}

function ReportSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[30px] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-5 grid gap-4">{children}</div>
    </section>
  );
}

function Insight({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl bg-[#f7f7f4] px-4 py-3 text-sm leading-5 text-black/60">
      {children}
    </p>
  );
}

function MetricValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-xs text-black/45">{label}</p>
      <p className="mt-1 truncate text-xl font-semibold">{value}</p>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  amount,
  tone = 'dark',
}: {
  label: string;
  value: number;
  amount: string;
  tone?: 'dark' | 'primary' | 'green';
}) {
  const color =
    tone === 'primary'
      ? 'bg-primary'
      : tone === 'green'
        ? 'bg-[#0f766e]'
        : 'bg-[#101113]';

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="truncate font-medium">{label}</span>
        <span className="shrink-0 text-black/45">{amount}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/5">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: progressWidth(value) }}
        />
      </div>
    </div>
  );
}

export function FinanceReportsView({
  month,
  summary,
  income,
  totalExpense,
  personalExpense,
  groupExpense,
  balance,
  owedByYou,
  owedToYou,
  goalSaved,
  goalTarget,
  accountAvailable,
  accountLocked,
  onBack,
}: FinanceReportsViewProps) {
  const categoryTotals = summary.categoryExpenseTotals.filter(
    (item) => item.currency === currency,
  );
  const tagTotals = summary.tagExpenseTotals.filter(
    (item) => item.currency === currency,
  );
  const activeAccounts = summary.accounts.filter(
    (account) => account.currency === currency && account.status !== 'CLOSED',
  );
  const topAccounts = activeAccounts
    .slice()
    .sort((left, right) => {
      const leftValue =
        left.accountType === 'CREDIT_CARD'
          ? left.availableBalance
          : left.currentBalance;
      const rightValue =
        right.accountType === 'CREDIT_CARD'
          ? right.availableBalance
          : right.currentBalance;
      return rightValue - leftValue;
    })
    .slice(0, 3);
  const budgetRows = summary.budgets
    .map((budget) => {
      const spent = categorySpend(summary, budget.categoryId);
      return {
        id: budget.id,
        name: budget.category.name,
        spent,
        amount: budget.amount,
        progress: percent(spent, budget.amount),
      };
    })
    .sort((left, right) => right.progress - left.progress);
  const overBudgetCount = budgetRows.filter(
    (budget) => budget.spent > budget.amount,
  ).length;
  const creditLimit = getCurrencyValue(
    summary.totals.accountCreditLimitByCurrency,
    currency,
  );
  const creditUsed = getCurrencyValue(
    summary.totals.accountCreditUsedByCurrency,
    currency,
  );
  const creditAvailable = getCurrencyValue(
    summary.totals.accountCreditAvailableByCurrency,
    currency,
  );
  const creditUsage = percent(creditUsed, creditLimit);
  const topCategory = categoryTotals[0];
  const topTag = tagTotals[0];
  const uncategorizedAmount =
    categoryTotals.find((item) => item.categoryId === null)?.amount ?? 0;
  const netDebt = owedToYou - owedByYou;
  const focusAreas = [
    balance < 0 ? m['finances.reportsNegativeBalanceFocus']() : null,
    uncategorizedAmount > 0
      ? m['finances.reportsUncategorizedFocus']({
          amount: moneyLabel(uncategorizedAmount),
        })
      : null,
    overBudgetCount > 0
      ? m['finances.reportsBudgetOverFocus']({ count: overBudgetCount })
      : null,
    creditUsage >= 70
      ? m['finances.reportsCreditFocus']({ percent: creditUsage })
      : null,
  ].filter((item) => item !== null);

  return (
    <ScreenShell title={m['finances.reports']()} month={month} onBack={onBack}>
      <div className="grid gap-5">
        <section className="rounded-[32px] bg-[#0d0809] p-5 text-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
          <p className="text-sm text-white/60">
            {m['finances.reportsIntro']()}
          </p>
          <h2 className="mt-2 text-3xl font-semibold leading-9">
            {moneyLabel(balance)}
          </h2>
          <p className="mt-3 text-sm leading-5 text-white/65">
            {m['finances.reportsIntroCopy']()}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="min-w-0 rounded-2xl bg-white/10 p-3">
              <p className="text-xs text-white/55">{m['finances.income']()}</p>
              <p className="mt-1 truncate text-lg font-medium">
                {moneyLabel(income)}
              </p>
            </div>
            <div className="min-w-0 rounded-2xl bg-white/10 p-3">
              <p className="text-xs text-white/55">
                {m['finances.expenses']()}
              </p>
              <p className="mt-1 truncate text-lg font-medium">
                {moneyLabel(totalExpense)}
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-5 md:grid-cols-2">
          <ReportSection title={m['finances.reportsCashFlow']()}>
            <Insight>
              {m['finances.reportsIncomeExpenseInsight']({
                income: moneyLabel(income),
                expenses: moneyLabel(totalExpense),
                balance: moneyLabel(balance),
              })}
            </Insight>
            <Insight>
              {income > 0
                ? m['finances.reportsExpenseRatioInsight']({
                    percent: percent(totalExpense, income),
                  })
                : m['finances.reportsNoIncomeInsight']()}
            </Insight>
            <div className="grid grid-cols-2 gap-3">
              <MetricValue
                label={m['finances.reportsRegisteredMovements']()}
                value={String(summary.counts.transactions)}
              />
              <MetricValue
                label={m['finances.sharedGroupExpense']()}
                value={String(summary.counts.groupExpenses)}
              />
            </div>
          </ReportSection>

          <ReportSection title={m['finances.reportsSpendingMix']()}>
            <Insight>
              {m['finances.reportsSpendingMixInsight']({
                personal: moneyLabel(personalExpense),
                group: moneyLabel(groupExpense),
              })}
            </Insight>
            <ProgressRow
              label={m['finances.personalExpenses']()}
              value={percent(personalExpense, totalExpense)}
              amount={moneyLabel(personalExpense)}
              tone="primary"
            />
            <ProgressRow
              label={m['finances.groupExpenses']()}
              value={percent(groupExpense, totalExpense)}
              amount={moneyLabel(groupExpense)}
            />
            <Insight>
              {topCategory
                ? m['finances.reportsTopCategoryInsight']({
                    category: topCategory.categoryName,
                    percent: percent(topCategory.amount, totalExpense),
                  })
                : m['finances.reportsNoCategoryInsight']()}
            </Insight>
          </ReportSection>

          <ReportSection title={m['finances.reportsAccountsHealth']()}>
            <Insight>
              {m['finances.reportsAccountsInsight']({
                count: activeAccounts.length,
                available: moneyLabel(accountAvailable),
                locked: moneyLabel(accountLocked),
              })}
            </Insight>
            <Insight>
              {creditLimit > 0
                ? m['finances.reportsCreditInsight']({
                    used: moneyLabel(creditUsed),
                    limit: moneyLabel(creditLimit),
                    available: moneyLabel(creditAvailable),
                  })
                : m['finances.reportsNoCreditInsight']()}
            </Insight>
            {topAccounts.length > 0 ? (
              <div>
                <p className="mb-3 text-sm font-semibold">
                  {m['finances.reportsTopAccounts']()}
                </p>
                <div className="grid gap-3">
                  {topAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex min-w-0 items-center justify-between gap-3 rounded-2xl bg-[#f7f7f4] px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {account.name}
                        </p>
                        <p className="truncate text-xs text-black/45">
                          {account.institution ||
                            getAccountTypeLabel(account.accountType)}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold">
                        {formatCurrency(
                          account.currency,
                          account.accountType === 'CREDIT_CARD'
                            ? account.availableBalance
                            : account.currentBalance,
                          { maximumFractionDigits: 0 },
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </ReportSection>

          <ReportSection title={m['finances.reportsTagSignals']()}>
            <Insight>
              {topTag
                ? m['finances.reportsTopTagInsight']({
                    tag: topTag.tagName,
                    amount: moneyLabel(topTag.amount),
                  })
                : m['finances.reportsNoTagsInsight']()}
            </Insight>
            {tagTotals.slice(0, 5).map((tag) => (
              <ProgressRow
                key={`${tag.tagId}:${tag.currency}`}
                label={`#${tag.tagName}`}
                value={percent(tag.amount, totalExpense)}
                amount={moneyLabel(tag.amount)}
                tone="green"
              />
            ))}
          </ReportSection>

          <ReportSection title={m['finances.reportsBudgetPulse']()}>
            <Insight>
              {budgetRows.length > 0
                ? m['finances.reportsBudgetInsight']({
                    count: budgetRows.length,
                    overCount: overBudgetCount,
                  })
                : m['finances.reportsNoBudgetsInsight']()}
            </Insight>
            {budgetRows.length > 0 ? (
              <div>
                <p className="mb-3 text-sm font-semibold">
                  {m['finances.reportsTopBudgets']()}
                </p>
                <div className="grid gap-4">
                  {budgetRows.slice(0, 4).map((budget) => (
                    <ProgressRow
                      key={budget.id}
                      label={budget.name}
                      value={budget.progress}
                      amount={`${moneyLabel(budget.spent)} / ${moneyLabel(
                        budget.amount,
                      )}`}
                      tone={budget.spent > budget.amount ? 'primary' : 'dark'}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </ReportSection>

          <ReportSection title={m['finances.reportsDebtGoalSnapshot']()}>
            <Insight>
              {m['finances.reportsDebtInsight']({
                amount: moneyLabel(netDebt),
              })}
            </Insight>
            <Insight>
              {m['finances.reportsGoalsInsight']({
                saved: moneyLabel(goalSaved),
                target: moneyLabel(goalTarget),
              })}
            </Insight>
            <div className="grid grid-cols-2 gap-3">
              <MetricValue
                label={m['finances.pendingToReceive']()}
                value={moneyLabel(owedToYou)}
              />
              <MetricValue
                label={m['finances.pendingToPay']()}
                value={moneyLabel(owedByYou)}
              />
            </div>
          </ReportSection>
        </div>

        <ReportSection title={m['finances.reportsFocusAreas']()}>
          {focusAreas.length > 0 ? (
            focusAreas.map((item) => (
              <Insight key={String(item)}>{item}</Insight>
            ))
          ) : (
            <Insight>{m['finances.reportsNoFocusAreas']()}</Insight>
          )}
        </ReportSection>
      </div>
    </ScreenShell>
  );
}
