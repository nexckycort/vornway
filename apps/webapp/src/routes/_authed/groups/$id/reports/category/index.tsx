import { ChevronDownIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { MobilePageLayout } from '#/components/mobile-page-layout';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu';
import { useLoadMore } from '#/hooks/use-load-more';
import { useGroupFlowNavigation } from '#/lib/group-flow-navigation';
import { formatLongDate } from '#/lib/i18n';
import { getGroupDetailMessages } from '#/routes/_authed/groups/$id/-messages';
import type { ExpenseItem } from '#/routes/_authed/groups/$id/-types/group-detail.types';
import {
  useGroupExpensesInfiniteQuery,
  useGroupReportsCategoryCountQuery,
  useGroupReportsSharesQuery,
  useGroupReportsTotalsQuery,
  useGroupSummaryQuery,
} from '#/routes/_authed/groups/-hooks/use-group-detail-query';
import { useGroupMemberExpensesByMembersQuery } from '#/routes/_authed/groups/-hooks/use-group-member-expenses-query';
import { useCategoryDateFilter } from '../-hooks/use-category-date-filter';
import type { ReportDateFilterMode } from '../-lib/date-filter';
import { CategoryDateDrawers } from './-components/category-date-drawers';
import { CategoryDetailSkeleton } from './-components/category-detail-skeleton';
import { CategoryExpenseHistory } from './-components/category-expense-history';
import { CategoryParticipantsDrawer } from './-components/category-participants-drawer';
import { CategoryParticipantsSection } from './-components/category-participants-section';
import { CategorySummaryCard } from './-components/category-summary-card';

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
    expenseCount:
      typeof search.expenseCount === 'number'
        ? search.expenseCount
        : typeof search.expenseCount === 'string' &&
            search.expenseCount.trim().length > 0
          ? Number(search.expenseCount)
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
    expenseCount,
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
  const groupExpensesQuery = useGroupExpensesInfiniteQuery(id);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<
    string[]
  >([]);
  const [hasInitializedParticipants, setHasInitializedParticipants] =
    useState(false);
  const [isParticipantsDrawerOpen, setIsParticipantsDrawerOpen] =
    useState(false);
  const dateFilter = useCategoryDateFilter({
    startDate,
    endDate,
    t,
    applyDates: (nextStartDate, nextEndDate) => {
      void navigate({
        search: (current) => ({
          ...current,
          startDate: nextStartDate,
          endDate: nextEndDate,
        }),
        replace: true,
        state: flowState,
      });
    },
  });

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
  const allParticipantIds = useMemo(
    () => participantShares.map((member) => member.memberId),
    [participantShares],
  );
  const isAllParticipantsSelected =
    allParticipantIds.length > 0 &&
    selectedParticipantIds.length === allParticipantIds.length;
  const isParticipantFilterActive =
    selectedParticipantIds.length > 0 &&
    selectedParticipantIds.length < allParticipantIds.length;
  const selectedMemberExpensesQueries = useGroupMemberExpensesByMembersQuery(
    id,
    selectedParticipantIds,
    {
      categoryId: categoryId ?? undefined,
      uncategorized,
      paidOnly: false,
      startDate,
      endDate,
      enabled: isParticipantFilterActive,
    },
  );
  const categoryCountQuery = useGroupReportsCategoryCountQuery(
    id,
    {
      range: startDate || endDate ? 'custom' : 'all',
      startDate,
      endDate,
      categoryId: categoryId ?? undefined,
      uncategorized,
      currency,
      participantIds: isParticipantFilterActive
        ? selectedParticipantIds
        : undefined,
    },
    Boolean(categoryId || uncategorized),
  );

  const selectedParticipants = useMemo(
    () =>
      participantShares.filter((member) =>
        selectedParticipantIds.includes(member.memberId),
      ),
    [participantShares, selectedParticipantIds],
  );

  if (!hasInitializedParticipants && allParticipantIds.length > 0) {
    setSelectedParticipantIds(allParticipantIds);
    setHasInitializedParticipants(true);
  }

  const knownSelectedParticipantIds = selectedParticipantIds.filter(
    (memberId) =>
      participantShares.some((member) => member.memberId === memberId),
  );
  if (knownSelectedParticipantIds.length !== selectedParticipantIds.length) {
    setSelectedParticipantIds(knownSelectedParticipantIds);
  }

  const baseFilteredExpenses = useMemo(() => {
    const expenses =
      groupExpensesQuery.data?.pages.flatMap((page) => page.data) ?? [];

    return expenses.filter((expense) => {
      if (expense.currency !== currency) return false;
      if (startDate && new Date(expense.date) < new Date(startDate)) {
        return false;
      }
      if (endDate && new Date(expense.date) > new Date(endDate)) return false;

      if (uncategorized) return expense.category == null;
      if (!categoryId) return expense.category?.name === categoryName;
      return expense.category?.id === categoryId;
    });
  }, [
    categoryId,
    categoryName,
    currency,
    endDate,
    groupExpensesQuery.data?.pages,
    startDate,
    uncategorized,
  ]);

  const selectedParticipantExpenses = useMemo(() => {
    if (!isParticipantFilterActive) return [];

    const expenseMap = new Map<string, ExpenseItem>();

    for (const query of selectedMemberExpensesQueries) {
      for (const expense of query.data?.data ?? []) {
        if (expense.currency !== currency) continue;
        expenseMap.set(expense.id, expense as ExpenseItem);
      }
    }

    return Array.from(expenseMap.values()).sort((left, right) => {
      const leftDate = new Date(left.date).getTime();
      const rightDate = new Date(right.date).getTime();
      return rightDate - leftDate;
    });
  }, [currency, isParticipantFilterActive, selectedMemberExpensesQueries]);

  const filteredExpenses = isParticipantFilterActive
    ? selectedParticipantExpenses
    : baseFilteredExpenses;
  const historyExpenseCount =
    categoryCountQuery.data?.expenseCount ?? expenseCount ?? 0;

  const visibleParticipantShares = isParticipantFilterActive
    ? selectedParticipants
    : participantShares;

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

  const activeHistoryLoading = isParticipantFilterActive
    ? selectedMemberExpensesQueries.some(
        (query) => query.isLoading || (query.isFetching && !query.data),
      )
    : groupExpensesQuery.isLoading;
  const activeHistoryFetchingNextPage = isParticipantFilterActive
    ? false
    : groupExpensesQuery.isFetchingNextPage;
  const loadMoreRef = useLoadMore({
    hasNextPage: isParticipantFilterActive
      ? false
      : groupExpensesQuery.hasNextPage,
    isFetching: isParticipantFilterActive
      ? false
      : groupExpensesQuery.isFetching,
    fetchNextPage: groupExpensesQuery.fetchNextPage,
  });

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

  const participantFilterLabel = !isParticipantFilterActive
    ? t.reports.participants
    : selectedParticipants.length === 1
      ? (selectedParticipants[0]?.name ?? t.reports.participants)
      : `${selectedParticipants.length} ${t.reports.participants.toLowerCase()}`;

  const toggleParticipant = (memberId: string) => {
    setSelectedParticipantIds((current) =>
      isAllParticipantsSelected
        ? allParticipantIds.filter((id) => id !== memberId)
        : current.includes(memberId)
          ? current.length === 1
            ? current
            : current.filter((id) => id !== memberId)
          : [...current, memberId],
    );
  };

  const isInitialLoading =
    groupQuery.isLoading || totalsQuery.isLoading || sharesQuery.isLoading;

  if (isInitialLoading) {
    return <CategoryDetailSkeleton />;
  }

  return (
    <MobilePageLayout title={t.reports.categoryDetailTitle} onBack={handleBack}>
      <div className="flex flex-1 flex-col gap-4 pb-8">
        {!categoryKey ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {t.reports.categoryMissing}
          </div>
        ) : null}

        <CategorySummaryCard
          t={t}
          name={resolvedCategoryName}
          icon={resolvedCategoryIcon}
          color={resolvedCategoryColor}
          currency={currency}
          total={categoryTotal}
          expenseCount={historyExpenseCount}
          progressPercentage={progressPercentage}
        />

        <section className="flex min-w-0 gap-2 pb-1">
          <button
            type="button"
            onClick={() => setIsParticipantsDrawerOpen(true)}
            className="inline-flex min-w-0 flex-1 items-center gap-1 rounded-full border border-[#e2e8f0] bg-white px-3 py-2 text-sm font-medium text-[#4c4c4c] shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          >
            <span className="max-w-[144px] truncate">
              {participantFilterLabel}
            </span>
            <HugeiconsIcon
              icon={ChevronDownIcon}
              className="size-3.5 shrink-0 text-[#71717a]"
            />
          </button>

          <DropdownMenu
            open={dateFilter.isDateMenuOpen}
            onOpenChange={dateFilter.setIsDateMenuOpen}
          >
            <DropdownMenuTrigger className="inline-flex min-w-0 flex-1 items-center gap-1 rounded-full border border-[#e2e8f0] bg-white px-3 py-2 text-sm font-medium text-[#4c4c4c] shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none">
              <span className="truncate">{dateFilter.dateFilterLabel}</span>
              <HugeiconsIcon
                icon={ChevronDownIcon}
                className="size-3.5 shrink-0 text-[#71717a]"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuRadioGroup
                  value={dateFilter.dateFilterMode}
                  onValueChange={(value) =>
                    dateFilter.handleDateFilterModeChange(
                      value as ReportDateFilterMode,
                    )
                  }
                >
                  <DropdownMenuRadioItem value="all">
                    {t.reports.allTime}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="day">
                    {t.reports.day}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="range">
                    {t.reports.range}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#e2e8f0] bg-white px-3 py-2 text-sm font-medium text-[#4c4c4c] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <span className="text-sm leading-none">🇨🇴</span>
            <span>{currency}</span>
            <HugeiconsIcon
              icon={ChevronDownIcon}
              className="size-3.5 shrink-0 text-[#71717a]"
            />
          </span>
        </section>

        <CategoryParticipantsSection
          t={t}
          members={groupQuery.data?.members}
          shares={visibleParticipantShares}
          currency={currency}
        />

        <CategoryExpenseHistory
          t={t}
          isLoading={activeHistoryLoading}
          isFetchingNextPage={activeHistoryFetchingNextPage}
          expenseCount={historyExpenseCount}
          filteredExpenses={filteredExpenses}
          groupedExpenses={groupedExpenses}
          categoryColor={resolvedCategoryColor}
          loadMoreRef={loadMoreRef}
          onOpenExpense={handleOpenExpense}
        />
      </div>

      <CategoryParticipantsDrawer
        t={t}
        open={isParticipantsDrawerOpen}
        onOpenChange={setIsParticipantsDrawerOpen}
        members={groupQuery.data?.members}
        participantShares={participantShares}
        selectedParticipantIds={selectedParticipantIds}
        isAllParticipantsSelected={isAllParticipantsSelected}
        onToggleParticipant={toggleParticipant}
      />

      <CategoryDateDrawers
        t={t}
        timeZone={dateFilter.timeZone}
        selectedDay={dateFilter.selectedDay}
        isDayDrawerOpen={dateFilter.isDayDrawerOpen}
        onDayDrawerOpenChange={dateFilter.setIsDayDrawerOpen}
        onSelectDay={dateFilter.applyDayFilter}
        isRangeDrawerOpen={dateFilter.isRangeDrawerOpen}
        onRangeDrawerOpenChange={dateFilter.setIsRangeDrawerOpen}
        draftRange={dateFilter.draftRange}
        onDraftRangeChange={dateFilter.setDraftRange}
        rangeCalendarMonths={dateFilter.rangeCalendarMonths}
        onApplyRange={dateFilter.applyRangeFilter}
      />
    </MobilePageLayout>
  );
}
