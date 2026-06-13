import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useRef } from 'react';

import { MobilePageLayout } from '#/components/mobile-page-layout';
import { useGroupFlowNavigation } from '#/lib/group-flow-navigation';
import { useGroupSummaryQuery } from '#/routes/_authed/groups/-hooks/use-group-detail-query';
import { useGroupMemberExpensesInfiniteQuery } from '#/routes/_authed/groups/-hooks/use-group-member-expenses-query';
import {
  getMemberReportTitle,
  parseMemberReportSearch,
  sortCurrencyEntries,
} from './-member-report.utils';
import {
  getMemberReportDerivedCopy,
  MemberReportExpensesSection,
  MemberReportHeaderCard,
  MemberReportSummarySection,
} from './-member-report-content';

export const Route = createFileRoute('/_authed/groups/$id/member/$memberId/')({
  validateSearch: parseMemberReportSearch,
  component: RouteComponent,
});

function RouteComponent() {
  const { id, memberId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { flowState } = useGroupFlowNavigation(id);
  const groupQuery = useGroupSummaryQuery(id);
  const expensesQuery = useGroupMemberExpensesInfiniteQuery(id, memberId, {
    categoryId: search.categoryId,
    uncategorized: search.uncategorized,
    paidOnly: search.paidOnly,
    startDate: search.startDate,
    endDate: search.endDate,
  });
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const member = groupQuery.data?.members.find((item) => item.id === memberId);
  const expenses = useMemo(
    () => expensesQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [expensesQuery.data?.pages],
  );
  const summaryEntries = useMemo(
    () =>
      sortCurrencyEntries(
        expensesQuery.data?.pages[0]?.summary.spentByCurrency ?? {},
      ),
    [expensesQuery.data?.pages],
  );
  const grossPaidEntries = useMemo(
    () =>
      sortCurrencyEntries(
        expensesQuery.data?.pages[0]?.summary.grossPaidByCurrency ?? {},
      ),
    [expensesQuery.data?.pages],
  );
  const hasSummaryData =
    summaryEntries.length > 0 ||
    (search.paidOnly && grossPaidEntries.length > 0);
  const { emptyCopy, introCopy } = getMemberReportDerivedCopy({
    categoryName: search.categoryName,
    paidOnly: search.paidOnly,
    startDate: search.startDate,
    endDate: search.endDate,
  });

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

  const handleTogglePaidOnly = () => {
    void navigate({
      search: (current) => ({
        ...current,
        paidOnly: !search.paidOnly,
      }),
      replace: true,
      state: flowState,
    });
  };

  return (
    <MobilePageLayout
      title={getMemberReportTitle({
        memberName: member?.name,
        categoryName: search.categoryName,
      })}
      onBack={handleBack}
    >
      <div className="flex flex-1 flex-col pb-8">
        {groupQuery.isLoading ? (
          <div className="rounded-[28px] border border-[#e2e8f0] bg-white p-4">
            <p className="text-sm text-[#64748b]">Cargando participante…</p>
          </div>
        ) : null}

        {!groupQuery.isLoading && !member ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            No encontramos este participante en el grupo.
          </div>
        ) : null}

        {member ? (
          <>
            <MemberReportHeaderCard
              email={member.email}
              image={member.image}
              introCopy={introCopy}
              isCurrentUser={member.isCurrentUser}
              name={member.name}
            />

            <MemberReportSummarySection
              grossPaidEntries={grossPaidEntries}
              hasSummaryData={hasSummaryData}
              paidOnly={search.paidOnly}
              summaryEntries={summaryEntries}
            />

            <MemberReportExpensesSection
              categoryName={search.categoryName}
              emptyCopy={emptyCopy}
              expenses={expenses}
              isFetchingNextPage={expensesQuery.isFetchingNextPage}
              isLoading={expensesQuery.isLoading}
              memberId={memberId}
              onOpenExpense={handleOpenExpense}
              onTogglePaidOnly={handleTogglePaidOnly}
              paidOnly={search.paidOnly}
            />

            {expenses.length > 0 ? (
              <div ref={loadMoreRef} className="h-8" />
            ) : null}
          </>
        ) : null}
      </div>
    </MobilePageLayout>
  );
}
