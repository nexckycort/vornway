import { ChevronRight } from 'lucide-react';
import type { GroupMemberExpenseItem } from '../../../-hooks/use-group-member-expenses-query';
import { CategoryIcon } from '../../-components/category-icon';
import {
  formatMoney,
  formatShortDate,
  getExpenseEmoji,
  getInitials,
} from '../../-components/group-detail.utils';
import {
  getMemberReportEmptyCopy,
  getMemberReportIntroCopy,
  getMemberReportListCopy,
  getMemberReportListTitle,
  getMemberReportSummaryCopy,
} from './-member-report.utils';

type MemberCardProps = {
  email: string | null;
  image: string | null;
  introCopy: string;
  isCurrentUser: boolean;
  name: string;
};

type SummarySectionProps = {
  grossPaidEntries: Array<[string, number]>;
  hasSummaryData: boolean;
  paidOnly: boolean;
  summaryEntries: Array<[string, number]>;
};

type ExpensesSectionProps = {
  categoryName?: string;
  emptyCopy: string;
  expenses: GroupMemberExpenseItem[];
  isFetchingNextPage: boolean;
  isLoading: boolean;
  memberId: string;
  onOpenExpense: (expenseId: string) => void;
  onTogglePaidOnly: () => void;
  paidOnly: boolean;
};

export function MemberReportHeaderCard(props: MemberCardProps) {
  return (
    <section className="rounded-[28px] border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-3">
        {props.image ? (
          <img
            src={props.image}
            alt={props.name}
            className="size-12 shrink-0 rounded-full border border-[#e5e7eb] object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#f3f4f6] text-sm font-semibold text-[#132238]">
            {getInitials(props.name)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-[#132238]">
            {props.name}
            {props.isCurrentUser ? (
              <span className="ml-1 text-xs text-[#94a3b8]">(tú)</span>
            ) : null}
          </p>
          <p className="truncate text-xs text-[#64748b]">
            {props.email ?? 'Sin cuenta vinculada'}
          </p>
        </div>
      </div>

      <p className="mt-4 rounded-2xl bg-[#f8fafc] px-3 py-3 text-xs text-[#64748b]">
        {props.introCopy}
      </p>
    </section>
  );
}

export function MemberReportSummarySection(props: SummarySectionProps) {
  return (
    <section className="mt-4 rounded-[28px] border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[#132238]">Consolidado</h2>
          <p className="mt-1 text-xs text-[#64748b]">
            {getMemberReportSummaryCopy(props.paidOnly)}
          </p>
        </div>
      </div>

      {props.hasSummaryData ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {props.summaryEntries.map(([currency, amount]) => (
            <div
              key={`share-${currency}`}
              className="rounded-2xl bg-[#f8fafc] px-4 py-3"
            >
              <p className="text-xs font-medium text-[#64748b]">
                {props.paidOnly
                  ? `Su parte en ${currency}`
                  : `Total en ${currency}`}
              </p>
              <p className="mt-1 text-lg font-semibold text-[#132238]">
                {formatMoney(currency, amount)}
              </p>
            </div>
          ))}
          {props.paidOnly
            ? props.grossPaidEntries.map(([currency, amount]) => (
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
  );
}

export function MemberReportExpensesSection(props: ExpensesSectionProps) {
  return (
    <section className="mt-4 rounded-[28px] border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[#132238]">
            {getMemberReportListTitle({
              categoryName: props.categoryName,
              paidOnly: props.paidOnly,
            })}
          </h2>
          <p className="mt-1 text-xs text-[#64748b]">
            {getMemberReportListCopy({
              categoryName: props.categoryName,
              paidOnly: props.paidOnly,
            })}
          </p>
        </div>
        <span className="text-xs text-[#94a3b8]">
          {props.expenses.length} gasto{props.expenses.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mb-4 flex">
        <button
          type="button"
          onClick={props.onTogglePaidOnly}
          className={[
            'inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
            props.paidOnly
              ? 'border-[#132238] bg-[#132238] text-white'
              : 'border-[#cbd5e1] bg-white text-[#475569]',
          ].join(' ')}
        >
          Solo los que pagó
        </button>
      </div>

      {props.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-[76px] animate-pulse rounded-2xl bg-[#f1f5f9]"
            />
          ))}
        </div>
      ) : null}

      {!props.isLoading && props.expenses.length === 0 ? (
        <div className="rounded-2xl bg-[#f8fafc] px-4 py-6 text-center">
          <p className="text-sm font-medium text-[#132238]">
            Sin gastos para este participante
          </p>
          <p className="mt-1 text-xs text-[#64748b]">{props.emptyCopy}</p>
        </div>
      ) : null}

      {props.expenses.length > 0 ? (
        <div className="space-y-3">
          {props.expenses.map((expense) => (
            <MemberExpenseRow
              key={expense.id}
              expense={expense}
              memberId={props.memberId}
              onOpen={() => props.onOpenExpense(expense.id)}
            />
          ))}
        </div>
      ) : null}

      {props.isFetchingNextPage ? (
        <p className="mt-2 text-center text-sm text-[#64748b]">Cargando más…</p>
      ) : null}
    </section>
  );
}

export function getMemberReportDerivedCopy(input: {
  categoryName?: string;
  endDate?: string;
  paidOnly: boolean;
  startDate?: string;
}) {
  return {
    emptyCopy: getMemberReportEmptyCopy(input),
    introCopy: getMemberReportIntroCopy(input),
  };
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
