import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';

import { MobilePageLayout } from '#/components/mobile-page-layout';
import { useGroupFlowNavigation } from '#/lib/group-flow-navigation';
import { formatCurrency, formatLongDate } from '#/lib/i18n';
import {
  useGroupExpensesInfiniteQuery,
  useGroupReportsSharesQuery,
  useGroupReportsTotalsQuery,
  useGroupSummaryQuery,
} from '#/routes/_authed/groups/-hooks/use-group-detail-query';
import { CategoryIcon } from '#/routes/_authed/groups/$id/-components/category-icon';
import {
  getExpenseEmoji,
  getInitials,
} from '#/routes/_authed/groups/$id/-components/group-detail.utils';
import { getGroupDetailMessages } from '#/routes/_authed/groups/$id/-messages';
import type { ExpenseItem } from '#/routes/_authed/groups/$id/-types/group-detail.types';

export const Route = createFileRoute('/_authed/groups/$id/reports/category/')({
  validateSearch: (search: Record<string, unknown>) => ({
    categoryKey:
      typeof search.categoryKey === 'string' && search.categoryKey.length > 0
        ? search.categoryKey
        : undefined,
    categoryId:
      typeof search.categoryId === 'string' && search.categoryId.length > 0
        ? search.categoryId
        : undefined,
    categoryName:
      typeof search.categoryName === 'string' && search.categoryName.length > 0
        ? search.categoryName
        : undefined,
    categoryIcon:
      typeof search.categoryIcon === 'string' && search.categoryIcon.length > 0
        ? search.categoryIcon
        : undefined,
    categoryColor:
      typeof search.categoryColor === 'string' &&
      search.categoryColor.length > 0
        ? search.categoryColor
        : undefined,
    uncategorized:
      search.uncategorized === true || search.uncategorized === 'true',
    currency:
      typeof search.currency === 'string' && search.currency.length > 0
        ? search.currency
        : 'COP',
    startDate:
      typeof search.startDate === 'string' && search.startDate.length > 0
        ? search.startDate
        : undefined,
    endDate:
      typeof search.endDate === 'string' && search.endDate.length > 0
        ? search.endDate
        : undefined,
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const {
    categoryKey,
    categoryId,
    categoryName,
    categoryIcon,
    categoryColor,
    uncategorized,
    currency,
    startDate,
    endDate,
  } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { flowState } = useGroupFlowNavigation(id);
  const t = getGroupDetailMessages();
  const groupQuery = useGroupSummaryQuery(id);
  const totalsQuery = useGroupReportsTotalsQuery(
    id,
    {
      range: startDate || endDate ? 'custom' : 'all',
      startDate,
      endDate,
    },
    true,
  );
  const sharesQuery = useGroupReportsSharesQuery(
    id,
    {
      range: startDate || endDate ? 'custom' : 'all',
      startDate,
      endDate,
    },
    true,
  );
  const expensesQuery = useGroupExpensesInfiniteQuery(id);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const category = useMemo(() => {
    if (!categoryKey) return null;

    return (
      totalsQuery.data?.categoriesByCurrency[currency]?.find(
        (entry) => entry.key === categoryKey,
      ) ?? null
    );
  }, [categoryKey, currency, totalsQuery.data?.categoriesByCurrency]);

  const categoryTotal = category?.amount ?? 0;
  const groupTotal = totalsQuery.data?.totalsByCurrency[currency] ?? 0;
  const progressPercentage =
    groupTotal > 0 ? Math.min(100, (categoryTotal / groupTotal) * 100) : 0;
  const resolvedCategoryName =
    category?.name ??
    categoryName ??
    (uncategorized ? t.reports.withoutCategory : t.reports.categoryDetailTitle);
  const resolvedCategoryIcon = category?.icon ?? categoryIcon ?? null;
  const resolvedCategoryColor = category?.fill ?? categoryColor ?? '#14b8a6';

  const participantShares = useMemo(
    () =>
      (sharesQuery.data?.memberShares ?? [])
        .map((member) => ({
          ...member,
          visibleShare:
            categoryKey == null
              ? 0
              : (member.categorySharesByCurrency[currency]?.[categoryKey] ?? 0),
        }))
        .filter((member) => Math.abs(member.visibleShare) > 0)
        .sort((left, right) => {
          if (left.isCurrentUser !== right.isCurrentUser) {
            return left.isCurrentUser ? -1 : 1;
          }

          return right.visibleShare - left.visibleShare;
        }),
    [categoryKey, currency, sharesQuery.data?.memberShares],
  );

  const filteredExpenses = useMemo(() => {
    const expenses =
      expensesQuery.data?.pages.flatMap((page) => page.data) ?? [];

    return expenses.filter((expense) => {
      if (expense.currency !== currency) return false;
      if (startDate && new Date(expense.date) < new Date(startDate))
        return false;
      if (endDate && new Date(expense.date) > new Date(endDate)) return false;

      if (uncategorized) {
        return expense.category == null;
      }

      if (!categoryId) return expense.category?.name === categoryName;
      return expense.category?.id === categoryId;
    });
  }, [
    categoryId,
    categoryName,
    currency,
    endDate,
    expensesQuery.data?.pages,
    startDate,
    uncategorized,
  ]);

  const groupedExpenses = useMemo(() => {
    const groups = new Map<string, ExpenseItem[]>();

    for (const expense of filteredExpenses) {
      const label = formatLongDate(expense.date);
      const current = groups.get(label) ?? [];
      current.push(expense);
      groups.set(label, current);
    }

    return Array.from(groups.entries()).map(([label, items]) => ({
      label,
      items,
    }));
  }, [filteredExpenses]);

  const hasNextPageRef = useRef(expensesQuery.hasNextPage);
  const isFetchingRef = useRef(expensesQuery.isFetching);
  const fetchNextPageRef = useRef(expensesQuery.fetchNextPage);
  hasNextPageRef.current = expensesQuery.hasNextPage;
  isFetchingRef.current = expensesQuery.isFetching;
  fetchNextPageRef.current = expensesQuery.fetchNextPage;

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        if (!hasNextPageRef.current || isFetchingRef.current) return;
        void fetchNextPageRef.current();
      },
      {
        root: null,
        rootMargin: '240px 0px',
        threshold: 0,
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const handleBack = () => {
    void navigate({
      to: '/groups/$id/reports',
      params: { id },
      search: { tab: 'totales' },
      state: flowState,
    });
  };

  const handleOpenExpense = (expenseId: string) => {
    void navigate({
      to: '/groups/$id/expense/$expenseId',
      params: { id, expenseId },
      state: flowState,
    });
  };

  return (
    <MobilePageLayout title={t.reports.categoryDetailTitle} onBack={handleBack}>
      <div className="flex flex-1 flex-col gap-4 pb-8">
        {!categoryKey ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {t.reports.categoryMissing}
          </div>
        ) : null}

        <section className="rounded-[28px] bg-[#111111] p-5 text-white shadow-[0_18px_44px_rgba(15,23,42,0.18)]">
          <div className="flex items-start gap-3">
            <div
              className="flex size-12 shrink-0 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${resolvedCategoryColor}24` }}
            >
              <CategoryIcon
                icon={resolvedCategoryIcon}
                color={resolvedCategoryColor}
                fallback={<span className="text-xl">🏷️</span>}
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold">
                {resolvedCategoryName}
              </p>
              <p className="mt-1 text-sm text-white/65">
                {t.reports.categoryExpensesCount(
                  category?.expenseCount ?? filteredExpenses.length,
                )}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-3xl font-semibold tracking-tight">
              {formatCurrency(currency, categoryTotal)}
            </p>
            <p className="mt-2 text-sm text-white/65">
              {t.reports.categoryShareOfGroup(
                `${progressPercentage.toFixed(progressPercentage >= 10 ? 0 : 1)}%`,
              )}
            </p>
          </div>

          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/12">
            <div
              className="h-full rounded-full"
              style={{
                width: `${progressPercentage}%`,
                backgroundColor: resolvedCategoryColor,
              }}
            />
          </div>
        </section>

        <section className="flex flex-wrap gap-2">
          <span className="inline-flex rounded-full border border-[#e2e8f0] bg-white px-3 py-2 text-xs font-medium text-[#334155]">
            {currency}
          </span>
          {startDate || endDate ? (
            <span className="inline-flex rounded-full border border-[#e2e8f0] bg-white px-3 py-2 text-xs font-medium text-[#334155]">
              {startDate && endDate
                ? `${formatLongDate(startDate)} - ${formatLongDate(endDate)}`
                : formatLongDate(startDate ?? endDate ?? '')}
            </span>
          ) : (
            <span className="inline-flex rounded-full border border-[#e2e8f0] bg-white px-3 py-2 text-xs font-medium text-[#334155]">
              {t.reports.rangeAll}
            </span>
          )}
        </section>

        <section className="rounded-[28px] border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#132238]">
                {t.reports.participants}
              </h2>
              <p className="mt-1 text-xs text-[#64748b]">
                {t.reports.peopleCount(participantShares.length)}
              </p>
            </div>
          </div>

          {participantShares.length === 0 ? (
            <p className="rounded-2xl bg-[#f8fafc] px-4 py-4 text-sm text-[#64748b]">
              {t.reports.categoryNoParticipants}
            </p>
          ) : (
            <div className="space-y-3">
              {participantShares.map((member) => {
                const memberIdentity = groupQuery.data?.members.find(
                  (item) => item.id === member.memberId,
                );

                return (
                  <div
                    key={member.memberId}
                    className="flex items-center gap-3 rounded-2xl bg-[#f8fafc] px-3 py-3"
                  >
                    {memberIdentity?.image ? (
                      <img
                        src={memberIdentity.image}
                        alt={member.name}
                        className="size-10 shrink-0 rounded-full border border-[#e5e7eb] object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f3f4f6] text-sm font-semibold text-[#132238]">
                        {getInitials(member.name)}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#132238]">
                        {member.name}
                        {member.isCurrentUser ? (
                          <span className="ml-1 text-xs text-[#94a3b8]">
                            ({t.reports.you})
                          </span>
                        ) : null}
                      </p>
                      <p className="truncate text-xs text-[#64748b]">
                        {memberIdentity?.email ?? t.reports.unlinked}
                      </p>
                    </div>

                    <p className="text-sm font-semibold text-[#132238]">
                      {formatCurrency(currency, member.visibleShare)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-[#132238]">
              {t.reports.categoryHistory}
            </h2>
            <p className="mt-1 text-xs text-[#64748b]">
              {t.reports.categoryExpensesCount(filteredExpenses.length)}
            </p>
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#e2e8f0] bg-[#fafafa] px-5 py-12 text-center">
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-[#f3f4f6] text-xl">
                💸
              </div>
              <p className="text-sm font-medium text-[#132238]">
                {t.reports.categoryNoExpensesTitle}
              </p>
              <p className="mt-1 text-sm text-[#64748b]">
                {t.reports.categoryNoExpensesCopy}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {groupedExpenses.map((group) => (
                <div key={group.label}>
                  <p className="mb-2 text-sm font-medium text-[#555555]">
                    {group.label}
                  </p>
                  <div className="space-y-3">
                    {group.items.map((expense) => (
                      <button
                        type="button"
                        key={expense.id}
                        onClick={() => handleOpenExpense(expense.id)}
                        className="native-tap flex w-full items-center gap-3 rounded-[24px] border border-[#e5e7eb] bg-white px-4 py-3 text-left shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition-colors hover:bg-[#fafafa]"
                      >
                        <div
                          className="flex size-12 shrink-0 items-center justify-center rounded-full"
                          style={{
                            backgroundColor: `${resolvedCategoryColor}1f`,
                            color: resolvedCategoryColor,
                          }}
                        >
                          <CategoryIcon
                            icon={expense.category?.icon}
                            color={
                              expense.category?.color ?? resolvedCategoryColor
                            }
                            fallback={
                              <span className="text-xl">
                                {getExpenseEmoji(expense)}
                              </span>
                            }
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-[#132238]">
                                {expense.description}
                              </p>
                              <p className="mt-1 truncate text-xs text-[#64748b]">
                                {expense.paidBy.name}
                              </p>
                            </div>

                            <div className="shrink-0 text-right">
                              <p className="text-sm font-semibold text-[#132238]">
                                {formatCurrency(
                                  expense.currency,
                                  expense.amount,
                                )}
                              </p>
                              <div className="mt-1 inline-flex items-center gap-1 text-xs text-[#94a3b8]">
                                <span>{formatLongDate(expense.date)}</span>
                                <ChevronRight className="size-3.5" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div ref={loadMoreRef} className="h-8" />
        </section>
      </div>
    </MobilePageLayout>
  );
}
