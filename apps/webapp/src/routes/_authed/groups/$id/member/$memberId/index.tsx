import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';

import { MobilePageLayout } from '#/components/mobile-page-layout';
import { useGroupFlowNavigation } from '#/lib/group-flow-navigation';
import { useGroupSummaryQuery } from '#/routes/_authed/groups/-hooks/use-group-detail-query';
import {
  type GroupMemberExpenseItem,
  useGroupMemberExpensesInfiniteQuery,
} from '#/routes/_authed/groups/-hooks/use-group-member-expenses-query';
import { CategoryIcon } from '../../-components/category-icon';
import {
  formatMoney,
  formatShortDate,
  getExpenseEmoji,
  getInitials,
} from '../../-components/group-detail.utils';

export const Route = createFileRoute('/_authed/groups/$id/member/$memberId/')({
  validateSearch: (search: Record<string, unknown>) => ({
    categoryId:
      typeof search.categoryId === 'string' && search.categoryId.length > 0
        ? search.categoryId
        : undefined,
    categoryName:
      typeof search.categoryName === 'string' && search.categoryName.length > 0
        ? search.categoryName
        : undefined,
    uncategorized:
      search.uncategorized === true || search.uncategorized === 'true',
    paidOnly: search.paidOnly === true || search.paidOnly === 'true',
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
  const { id, memberId } = Route.useParams();
  const {
    categoryId,
    categoryName,
    uncategorized,
    paidOnly,
    startDate,
    endDate,
  } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { flowState } = useGroupFlowNavigation(id);
  const groupQuery = useGroupSummaryQuery(id);
  const expensesQuery = useGroupMemberExpensesInfiniteQuery(id, memberId, {
    categoryId,
    uncategorized,
    paidOnly,
    startDate,
    endDate,
  });
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const member = groupQuery.data?.members.find((item) => item.id === memberId);
  const expenses = useMemo(
    () => expensesQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [expensesQuery.data?.pages],
  );
  const spentByCurrency = useMemo(
    () => expensesQuery.data?.pages[0]?.summary.spentByCurrency ?? {},
    [expensesQuery.data?.pages],
  );
  const grossPaidByCurrency = useMemo(
    () => expensesQuery.data?.pages[0]?.summary.grossPaidByCurrency ?? {},
    [expensesQuery.data?.pages],
  );
  const summaryEntries = useMemo(
    () =>
      Object.entries(spentByCurrency).sort((left, right) => {
        if (left[0] === right[0]) return 0;
        return left[0].localeCompare(right[0]);
      }),
    [spentByCurrency],
  );
  const grossPaidEntries = useMemo(
    () =>
      Object.entries(grossPaidByCurrency).sort((left, right) => {
        if (left[0] === right[0]) return 0;
        return left[0].localeCompare(right[0]);
      }),
    [grossPaidByCurrency],
  );
  const hasSummaryData =
    summaryEntries.length > 0 || (paidOnly && grossPaidEntries.length > 0);
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
        paidOnly: !paidOnly,
      }),
      replace: true,
      state: flowState,
    });
  };

  return (
    <MobilePageLayout
      title={
        member
          ? categoryName
            ? `Gastos de ${member.name} en ${categoryName}`
            : `Gastos de ${member.name}`
          : 'Gastos del participante'
      }
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
            No encontramos este participante en el espacio.
          </div>
        ) : null}

        {member ? (
          <>
            <section className="rounded-[28px] border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <div className="flex items-center gap-3">
                {member.image ? (
                  <img
                    src={member.image}
                    alt={member.name}
                    className="size-12 shrink-0 rounded-full border border-[#e5e7eb] object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#f3f4f6] text-sm font-semibold text-[#132238]">
                    {getInitials(member.name)}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-[#132238]">
                    {member.name}
                    {member.isCurrentUser ? (
                      <span className="ml-1 text-xs text-[#94a3b8]">(tú)</span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-[#64748b]">
                    {member.email ?? 'Sin cuenta vinculada'}
                  </p>
                </div>
              </div>

              <p className="mt-4 rounded-2xl bg-[#f8fafc] px-3 py-3 text-xs text-[#64748b]">
                {paidOnly
                  ? categoryName
                    ? `Revisa solo los gastos de ${categoryName.toLowerCase()} que esta persona pagó.`
                    : startDate && endDate
                      ? 'Revisa solo los gastos que esta persona pagó en este rango.'
                      : 'Revisa solo los gastos que esta persona pagó.'
                  : categoryName
                    ? `Revisa solo los gastos de ${categoryName.toLowerCase()} donde esta persona pagó o participa.`
                    : startDate && endDate
                      ? 'Revisa solo los gastos de este rango donde esta persona pagó o participa.'
                      : 'Revisa solo los gastos donde esta persona pagó o participa.'}
              </p>
            </section>

            <section className="mt-4 rounded-[28px] border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-[#132238]">
                    Consolidado
                  </h2>
                  <p className="mt-1 text-xs text-[#64748b]">
                    {paidOnly
                      ? 'Total de su parte en gastos que pagó'
                      : 'Total que ha gastado en este filtro'}
                  </p>
                </div>
              </div>

              {hasSummaryData ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {summaryEntries.map(([currency, amount]) => (
                    <div
                      key={`share-${currency}`}
                      className="rounded-2xl bg-[#f8fafc] px-4 py-3"
                    >
                      <p className="text-xs font-medium text-[#64748b]">
                        {paidOnly
                          ? `Su parte en ${currency}`
                          : `Total en ${currency}`}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-[#132238]">
                        {formatMoney(currency, amount)}
                      </p>
                    </div>
                  ))}
                  {paidOnly
                    ? grossPaidEntries.map(([currency, amount]) => (
                        <div
                          key={`paid-${currency}`}
                          className="rounded-2xl bg-[#eef6ff] px-4 py-3"
                        >
                          <p className="text-xs font-medium text-[#64748b]">
                            Total pagado en {currency}
                          </p>
                          <p className="mt-1 text-lg font-semibold text-[#132238]">
                            {formatMoney(currency, amount)}
                          </p>
                        </div>
                      ))
                    : null}
                </div>
              ) : (
                <div className="rounded-2xl bg-[#f8fafc] px-4 py-4 text-sm text-[#64748b]">
                  Aún no hay total acumulado para este filtro.
                </div>
              )}
            </section>

            <section className="mt-4 rounded-[28px] border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-[#132238]">
                    {paidOnly
                      ? categoryName
                        ? `Gastos pagados en ${categoryName}`
                        : 'Gastos que pagó'
                      : categoryName
                        ? `Gastos en ${categoryName}`
                        : 'Gastos relacionados'}
                  </h2>
                  <p className="mt-1 text-xs text-[#64748b]">
                    {paidOnly
                      ? categoryName
                        ? 'Solo pagados por esta persona en esta categoría'
                        : startDate && endDate
                          ? 'Solo los que pagó en este rango de fecha'
                          : 'Solo los que pagó'
                      : categoryName
                        ? 'Solo de esta categoría'
                        : startDate && endDate
                          ? 'Solo de este rango de fecha'
                          : 'Donde pagó o participa'}
                  </p>
                </div>
                <span className="text-xs text-[#94a3b8]">
                  {expenses.length} gasto{expenses.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="mb-4 flex">
                <button
                  type="button"
                  onClick={handleTogglePaidOnly}
                  className={[
                    'inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                    paidOnly
                      ? 'border-[#132238] bg-[#132238] text-white'
                      : 'border-[#cbd5e1] bg-white text-[#475569]',
                  ].join(' ')}
                >
                  Solo los que pagó
                </button>
              </div>

              {expensesQuery.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-[76px] animate-pulse rounded-2xl bg-[#f1f5f9]"
                    />
                  ))}
                </div>
              ) : null}

              {!expensesQuery.isLoading && expenses.length === 0 ? (
                <div className="rounded-2xl bg-[#f8fafc] px-4 py-6 text-center">
                  <p className="text-sm font-medium text-[#132238]">
                    Sin gastos para este participante
                  </p>
                  <p className="mt-1 text-xs text-[#64748b]">
                    {paidOnly
                      ? categoryName
                        ? 'Cuando pague un gasto de esta categoría aparecerá aquí.'
                        : startDate && endDate
                          ? 'Cuando pague un gasto en este rango aparecerá aquí.'
                          : 'Cuando pague un gasto aparecerá aquí.'
                      : categoryName
                        ? 'Cuando esté involucrado en un gasto de esta categoría aparecerá aquí.'
                        : startDate && endDate
                          ? 'Cuando esté involucrado en un gasto de este rango aparecerá aquí.'
                          : 'Cuando esté involucrado en un gasto aparecerá aquí.'}
                  </p>
                </div>
              ) : null}

              {expenses.length > 0 ? (
                <div className="space-y-3">
                  {expenses.map((expense) => (
                    <MemberExpenseRow
                      key={expense.id}
                      expense={expense}
                      memberId={memberId}
                      onOpen={() => handleOpenExpense(expense.id)}
                    />
                  ))}
                </div>
              ) : null}

              {expenses.length > 0 ? (
                <div ref={loadMoreRef} className="h-8" />
              ) : null}

              {expensesQuery.isFetchingNextPage ? (
                <p className="mt-2 text-center text-sm text-[#64748b]">
                  Cargando más…
                </p>
              ) : null}
            </section>
          </>
        ) : null}
      </div>
    </MobilePageLayout>
  );
}

function MemberExpenseRow({
  expense,
  memberId,
  onOpen,
}: {
  expense: GroupMemberExpenseItem;
  memberId: string;
  onOpen: () => void;
}) {
  const paidAmount =
    expense.paidByMembers.find((payer) => payer.memberId === memberId)
      ?.amount ?? (expense.paidBy.id === memberId ? expense.amount : 0);
  const shareAmount =
    expense.participants?.find(
      (participant) => participant.memberId === memberId,
    )?.share ?? 0;
  const details = [
    paidAmount > 0 ? `Pagó ${formatMoney(expense.currency, paidAmount)}` : null,
    shareAmount > 0
      ? `Su parte ${formatMoney(expense.currency, shareAmount)}`
      : null,
  ].filter(Boolean);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="native-tap flex w-full items-center gap-3 rounded-2xl border border-[#e5e7eb] bg-white px-3 py-3 text-left transition-colors hover:bg-[#f8fafc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111]/15"
    >
      <div
        className="flex size-11 shrink-0 items-center justify-center rounded-2xl text-base"
        style={{
          backgroundColor: expense.category?.color
            ? `${expense.category.color}20`
            : '#f0fdfa',
          color: expense.category?.color ?? '#0f766e',
        }}
      >
        {expense.category ? (
          <CategoryIcon
            icon={expense.category.icon}
            color={expense.category.color}
            className="size-5"
          />
        ) : (
          <span>{getExpenseEmoji(expense)}</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-[#132238]">
            {expense.description}
          </p>
          {expense.isSettlement ? (
            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
              Liquidación
            </span>
          ) : null}
        </div>
        <p className="mt-1 truncate text-xs text-[#64748b]">
          {formatShortDate(expense.date)}
          {details.length > 0 ? ` · ${details.join(' · ')}` : ''}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-[#132238]">
          {formatMoney(expense.currency, expense.amount)}
        </p>
        <ChevronRight className="size-4 shrink-0 text-[#94a3b8]" />
      </div>
    </button>
  );
}
