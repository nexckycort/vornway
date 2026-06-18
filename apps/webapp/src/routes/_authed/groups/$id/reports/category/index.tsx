import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DateRange } from 'react-day-picker';

import { MobilePageLayout } from '#/components/mobile-page-layout';
import { Button } from '#/components/ui/button';
import { Calendar } from '#/components/ui/calendar';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '#/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu';
import { useGroupFlowNavigation } from '#/lib/group-flow-navigation';
import { formatCurrency, formatLongDate } from '#/lib/i18n';
import {
  useGroupExpensesInfiniteQuery,
  useGroupReportsSharesQuery,
  useGroupReportsTotalsQuery,
  useGroupSummaryQuery,
} from '#/routes/_authed/groups/-hooks/use-group-detail-query';
import { useGroupMemberExpensesByMembersQuery } from '#/routes/_authed/groups/-hooks/use-group-member-expenses-query';
import { CategoryIcon } from '#/routes/_authed/groups/$id/-components/category-icon';
import {
  getExpenseEmoji,
  getInitials,
} from '#/routes/_authed/groups/$id/-components/group-detail.utils';
import { getGroupDetailMessages } from '#/routes/_authed/groups/$id/-messages';
import type { ExpenseItem } from '#/routes/_authed/groups/$id/-types/group-detail.types';

type ReportDateFilterMode = 'all' | 'day' | 'range';
type PendingDrawerMode = Exclude<ReportDateFilterMode, 'all'> | null;

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

function toDayBoundaryIso(
  value: Date,
  boundary: 'start' | 'end',
): string | undefined {
  const year = value.getFullYear();
  const month = value.getMonth();
  const day = value.getDate();

  const date =
    boundary === 'start'
      ? new Date(year, month, day, 0, 0, 0, 0)
      : new Date(year, month, day, 23, 59, 59, 999);

  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function parseSearchDate(value: string | undefined) {
  if (!value) return undefined;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function isSameCalendarDay(left: Date | undefined, right: Date | undefined) {
  if (!left || !right) return false;

  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

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
  const groupExpensesQuery = useGroupExpensesInfiniteQuery(id);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<
    string[]
  >([]);
  const [hasInitializedParticipants, setHasInitializedParticipants] =
    useState(false);
  const [isParticipantsDrawerOpen, setIsParticipantsDrawerOpen] =
    useState(false);
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [isDayDrawerOpen, setIsDayDrawerOpen] = useState(false);
  const [isRangeDrawerOpen, setIsRangeDrawerOpen] = useState(false);
  const [pendingDrawerMode, setPendingDrawerMode] =
    useState<PendingDrawerMode>(null);
  const [rangeCalendarMonths, setRangeCalendarMonths] = useState(1);
  const [draftRange, setDraftRange] = useState<DateRange | undefined>();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const compactDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      }),
    [],
  );

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
  const selectedStartDate = useMemo(
    () => parseSearchDate(startDate),
    [startDate],
  );
  const selectedEndDate = useMemo(() => parseSearchDate(endDate), [endDate]);
  const dateFilterMode: ReportDateFilterMode =
    selectedStartDate && selectedEndDate
      ? isSameCalendarDay(selectedStartDate, selectedEndDate)
        ? 'day'
        : 'range'
      : 'all';
  const selectedDay = dateFilterMode === 'day' ? selectedStartDate : undefined;
  const selectedRange =
    dateFilterMode === 'range'
      ? {
          from: selectedStartDate,
          to: selectedEndDate,
        }
      : undefined;

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

  const selectedParticipants = useMemo(
    () =>
      participantShares.filter((member) =>
        selectedParticipantIds.includes(member.memberId),
      ),
    [participantShares, selectedParticipantIds],
  );

  useEffect(() => {
    if (hasInitializedParticipants || allParticipantIds.length === 0) return;

    setSelectedParticipantIds(allParticipantIds);
    setHasInitializedParticipants(true);
  }, [allParticipantIds, hasInitializedParticipants]);

  useEffect(() => {
    setSelectedParticipantIds((current) =>
      current.filter((memberId) =>
        participantShares.some((member) => member.memberId === memberId),
      ),
    );
  }, [participantShares]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 640px)');
    const syncMonths = () => {
      setRangeCalendarMonths(mediaQuery.matches ? 2 : 1);
    };

    syncMonths();
    mediaQuery.addEventListener('change', syncMonths);

    return () => {
      mediaQuery.removeEventListener('change', syncMonths);
    };
  }, []);

  useEffect(() => {
    if (isDateMenuOpen || pendingDrawerMode == null) return;

    if (pendingDrawerMode === 'day') {
      setIsDayDrawerOpen(true);
    } else {
      setDraftRange(selectedRange);
      setIsRangeDrawerOpen(true);
    }

    setPendingDrawerMode(null);
  }, [isDateMenuOpen, pendingDrawerMode, selectedRange]);

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
  const historyExpenseCount = useMemo(() => {
    if (!isParticipantFilterActive) {
      return category?.expenseCount ?? filteredExpenses.length;
    }

    if (selectedParticipantIds.length === 1) {
      return (
        selectedMemberExpensesQueries[0]?.data?.pagination.total ??
        filteredExpenses.length
      );
    }

    return filteredExpenses.length;
  }, [
    category?.expenseCount,
    filteredExpenses.length,
    isParticipantFilterActive,
    selectedMemberExpensesQueries,
    selectedParticipantIds.length,
  ]);

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
  const hasNextPageRef = useRef(groupExpensesQuery.hasNextPage);
  const isFetchingRef = useRef(groupExpensesQuery.isFetching);
  const fetchNextPageRef = useRef(groupExpensesQuery.fetchNextPage);
  hasNextPageRef.current = isParticipantFilterActive
    ? false
    : groupExpensesQuery.hasNextPage;
  isFetchingRef.current = isParticipantFilterActive
    ? false
    : groupExpensesQuery.isFetching;
  fetchNextPageRef.current = groupExpensesQuery.fetchNextPage;

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

  const participantFilterLabel = !isParticipantFilterActive
    ? t.reports.participants
    : selectedParticipants.length === 1
      ? (selectedParticipants[0]?.name ?? t.reports.participants)
      : `${selectedParticipants.length} ${t.reports.participants.toLowerCase()}`;
  const dateFilterLabel = useMemo(() => {
    if (dateFilterMode === 'day' && selectedDay) {
      return compactDateFormatter.format(selectedDay);
    }

    if (dateFilterMode === 'range' && selectedRange?.from) {
      const from = compactDateFormatter.format(selectedRange.from);
      if (!selectedRange.to) return `${from} - ...`;

      return `${from} - ${compactDateFormatter.format(selectedRange.to)}`;
    }

    return t.reports.dates;
  }, [
    compactDateFormatter,
    dateFilterMode,
    selectedDay,
    selectedRange,
    t.reports.dates,
  ]);

  const handleDateFilterModeChange = (value: ReportDateFilterMode) => {
    if (value === 'day') {
      setIsRangeDrawerOpen(false);
      setPendingDrawerMode('day');
      setIsDateMenuOpen(false);
      return;
    }

    if (value === 'range') {
      setIsDayDrawerOpen(false);
      setPendingDrawerMode('range');
      setIsDateMenuOpen(false);
      return;
    }

    setPendingDrawerMode(null);
    setIsDayDrawerOpen(false);
    setIsRangeDrawerOpen(false);
    setIsDateMenuOpen(false);
    void navigate({
      search: (current) => ({
        ...current,
        startDate: undefined,
        endDate: undefined,
      }),
      replace: true,
      state: flowState,
    });
  };

  const applyDayFilter = (value: Date | undefined) => {
    if (!value) return;

    setIsDayDrawerOpen(false);
    void navigate({
      search: (current) => ({
        ...current,
        startDate: toDayBoundaryIso(value, 'start'),
        endDate: toDayBoundaryIso(value, 'end'),
      }),
      replace: true,
      state: flowState,
    });
  };

  const applyRangeFilter = () => {
    setIsRangeDrawerOpen(false);
    void navigate({
      search: (current) => ({
        ...current,
        startDate: draftRange?.from
          ? toDayBoundaryIso(draftRange.from, 'start')
          : undefined,
        endDate: draftRange?.to
          ? toDayBoundaryIso(draftRange.to, 'end')
          : undefined,
      }),
      replace: true,
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
                {t.reports.categoryExpensesCount(historyExpenseCount)}
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

        <section className="flex min-w-0 gap-2 pb-1">
          <button
            type="button"
            onClick={() => setIsParticipantsDrawerOpen(true)}
            className="inline-flex min-w-0 flex-1 items-center gap-1 rounded-full border border-[#e2e8f0] bg-white px-3 py-2 text-sm font-medium text-[#4c4c4c] shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          >
            <span className="max-w-[144px] truncate">
              {participantFilterLabel}
            </span>
            <ChevronDown className="size-3.5 shrink-0 text-[#71717a]" />
          </button>

          <DropdownMenu open={isDateMenuOpen} onOpenChange={setIsDateMenuOpen}>
            <DropdownMenuTrigger className="inline-flex min-w-0 flex-1 items-center gap-1 rounded-full border border-[#e2e8f0] bg-white px-3 py-2 text-sm font-medium text-[#4c4c4c] shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none">
              <span className="truncate">{dateFilterLabel}</span>
              <ChevronDown className="size-3.5 shrink-0 text-[#71717a]" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuRadioGroup
                  value={dateFilterMode}
                  onValueChange={(value) =>
                    handleDateFilterModeChange(value as ReportDateFilterMode)
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
            <ChevronDown className="size-3.5 shrink-0 text-[#71717a]" />
          </span>
        </section>

        <section className="rounded-[28px] border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#132238]">
                {t.reports.participants}
              </h2>
              <p className="mt-1 text-xs text-[#64748b]">
                {t.reports.peopleCount(visibleParticipantShares.length)}
              </p>
            </div>
          </div>

          {visibleParticipantShares.length === 0 ? (
            <p className="rounded-2xl bg-[#f8fafc] px-4 py-4 text-sm text-[#64748b]">
              {t.reports.categoryNoParticipants}
            </p>
          ) : (
            <div className="space-y-3">
              {visibleParticipantShares.map((member) => {
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
              {t.reports.categoryExpensesCount(historyExpenseCount)}
            </p>
          </div>

          {activeHistoryLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[76px] animate-pulse rounded-2xl bg-[#f1f5f9]"
                />
              ))}
            </div>
          ) : null}

          {!activeHistoryLoading && filteredExpenses.length === 0 ? (
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
          ) : null}

          {!activeHistoryLoading ? (
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
          ) : null}

          <div ref={loadMoreRef} className="h-8" />

          {activeHistoryFetchingNextPage ? (
            <p className="mt-2 text-center text-sm text-[#64748b]">
              Cargando más…
            </p>
          ) : null}
        </section>
      </div>

      <Drawer
        open={isParticipantsDrawerOpen}
        onOpenChange={setIsParticipantsDrawerOpen}
      >
        <DrawerContent className="max-h-[80vh] gap-0 overflow-hidden p-0">
          <DrawerHeader className="pb-3 text-left">
            <DrawerTitle>{t.reports.participants}</DrawerTitle>
          </DrawerHeader>

          <div className="overflow-y-auto px-4 pb-6">
            {participantShares.map((member) => {
              const memberIdentity = groupQuery.data?.members.find(
                (item) => item.id === member.memberId,
              );

              return (
                <button
                  type="button"
                  key={member.memberId}
                  onClick={() => {
                    setSelectedParticipantIds((current) =>
                      isAllParticipantsSelected
                        ? allParticipantIds.filter(
                            (id) => id !== member.memberId,
                          )
                        : current.includes(member.memberId)
                          ? current.length === 1
                            ? current
                            : current.filter((id) => id !== member.memberId)
                          : [...current, member.memberId],
                    );
                  }}
                  className="flex w-full items-center gap-3 py-3 text-left"
                >
                  {memberIdentity?.image ? (
                    <img
                      src={memberIdentity.image}
                      alt={member.name}
                      className="size-[18px] shrink-0 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-[#ebebeb] text-[7.5px] font-medium text-[#1e1e1e]">
                      {getInitials(member.name)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-[#1e1e1e]">
                      {member.name}
                    </p>
                  </div>

                  <CheckboxMark
                    checked={
                      isAllParticipantsSelected ||
                      selectedParticipantIds.includes(member.memberId)
                    }
                  />
                </button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={isDayDrawerOpen} onOpenChange={setIsDayDrawerOpen}>
        <DrawerContent className="gap-4 p-0">
          <DrawerHeader>
            <DrawerTitle>{t.reports.selectDayTitle}</DrawerTitle>
            <DrawerDescription>
              {t.reports.selectDayDescription}
            </DrawerDescription>
          </DrawerHeader>
          <Calendar
            mode="single"
            selected={selectedDay}
            onSelect={applyDayFilter}
            captionLayout="dropdown"
            timeZone={timeZone}
            className="mx-auto mb-5 rounded-2xl border border-[#e2e8f0]"
          />
        </DrawerContent>
      </Drawer>

      <Drawer open={isRangeDrawerOpen} onOpenChange={setIsRangeDrawerOpen}>
        <DrawerContent className="max-h-[85vh] gap-0 overflow-hidden p-0">
          <DrawerHeader>
            <DrawerTitle>{t.reports.selectRangeTitle}</DrawerTitle>
            <DrawerDescription>
              {t.reports.selectRangeDescription}
            </DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
            <Calendar
              mode="range"
              selected={draftRange}
              onSelect={setDraftRange}
              captionLayout="dropdown"
              numberOfMonths={rangeCalendarMonths}
              timeZone={timeZone}
              className="mx-auto rounded-2xl border border-[#e2e8f0]"
            />
          </div>
          <DrawerFooter className="border-t border-[#e2e8f0] bg-background px-5 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            <Button
              type="button"
              className="h-12 w-full rounded-full"
              onClick={applyRangeFilter}
            >
              {t.reports.applyRange}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </MobilePageLayout>
  );
}

function CheckboxMark({ checked }: { checked: boolean }) {
  return (
    <span
      className={[
        'flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors',
        checked
          ? 'border-[#de034d] bg-[#de034d] text-white'
          : 'border-[#d4d4d8] bg-white text-transparent',
      ].join(' ')}
    >
      <Check className="size-3.5" strokeWidth={3} />
    </span>
  );
}
