import { UserGroupIcon, Wallet02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { type RefObject, useState } from 'react';
import { formatCurrency, formatShortDate } from '#/lib/i18n';
import { m } from '#/paraglide/messages.js';
import type {
  FinanceCategory,
  FinanceDebtPaymentMovement,
  FinanceGroupExpenseMovement,
  FinanceMovement,
  FinanceMovementTransaction,
} from './finance-model';
import { categoryColors, moneyLabel } from './finance-model';

export function FigmaCategoriesSlide({
  categories,
  totals,
  onOpen,
}: {
  categories: FinanceCategory[];
  totals: Record<string, number>;
  onOpen: () => void;
}) {
  const visibleCategories = categories
    .map((category) => ({
      ...category,
      amount: totals[category.id] ?? 0,
    }))
    .filter((category) => category.amount > 0)
    .slice(0, 8);

  return (
    <section className="mt-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-[#1e1e1e]">
          {m['finances.categories']()}
        </h2>
        <button
          type="button"
          onClick={onOpen}
          className="text-xs font-medium text-primary"
        >
          {m['finances.viewAll']()}
        </button>
      </div>
      {visibleCategories.length === 0 ? (
        <div className="mt-3 rounded-2xl bg-white p-4 text-sm text-[#626262] shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          {m['finances.emptyCategories']()}
        </div>
      ) : (
        <div className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {visibleCategories.map((category, index) => (
            <button
              key={category.id}
              type="button"
              onClick={onOpen}
              className="w-[148px] shrink-0 rounded-[24px] border border-[#e9e9e9] bg-white p-4 text-left shadow-[0_4px_14px_rgba(15,23,42,0.04)]"
            >
              <span
                className="flex size-9 items-center justify-center rounded-full text-sm font-semibold text-white"
                style={{
                  backgroundColor:
                    category.color ??
                    categoryColors[index % categoryColors.length],
                }}
              >
                {category.name.slice(0, 1).toUpperCase()}
              </span>
              <p className="mt-3 truncate text-sm font-semibold text-[#1e1e1e]">
                {category.name}
              </p>
              <p className="mt-1 truncate text-base font-medium text-[#1e1e1e]">
                {moneyLabel(category.amount)}
              </p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export function FigmaSummaryCard({
  income,
  totalExpense,
  balance,
  onAdd,
}: {
  income: number;
  totalExpense: number;
  balance: number;
  onAdd: () => void;
}) {
  return (
    <section className="rounded-[28px] border border-[#261b1e] bg-[#0d0809] p-5 text-white shadow-[0_14px_28px_rgba(15,23,42,0.16)]">
      <div>
        <p className="text-xs text-white/65">{m['finances.monthBalance']()}</p>
        <p className="mt-2 truncate text-[36px] font-semibold leading-10 tracking-normal">
          {moneyLabel(balance)}
        </p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="min-w-0 rounded-2xl bg-[#2b2224] px-3 py-3">
          <p className="text-xs text-white/75">{m['finances.income']()}</p>
          <p className="mt-1 truncate text-xl font-medium">
            {moneyLabel(income)}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl bg-[#2b2224] px-3 py-3">
          <p className="text-xs text-white/75">{m['finances.expenses']()}</p>
          <p className="mt-1 truncate text-xl font-medium">
            {moneyLabel(totalExpense)}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-4 text-base font-medium text-primary-foreground shadow-[0_8px_18px_rgba(222,3,77,0.2)]"
      >
        <span className="text-xl leading-none">+</span>
        {m['finances.addTransaction']()}
      </button>
    </section>
  );
}

export function FigmaSummaryTile({
  label,
  value,
  tone = 'primary',
}: {
  label: string;
  value: string;
  tone?: 'primary' | 'blue';
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-white px-3 py-2 shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
      <div
        className={`flex size-8 items-center justify-center rounded-full text-xs ${
          tone === 'blue'
            ? 'bg-[#eef2ff] text-[#4f46e5]'
            : 'bg-primary text-primary-foreground'
        }`}
      >
        <HugeiconsIcon
          icon={tone === 'blue' ? UserGroupIcon : Wallet02Icon}
          className="size-4"
        />
      </div>
      <p className="mt-4 truncate text-xs text-[#1e1e1e]">{label}</p>
      <p className="mt-1 truncate text-xl font-medium leading-7 text-[#1e1e1e]">
        {value}
      </p>
    </div>
  );
}

function MovementTitle({
  title,
  badge,
  badgeTone = 'neutral',
}: {
  title: string;
  badge: string;
  badgeTone?: 'neutral' | 'primary' | 'blue';
}) {
  const badgeClassName =
    badgeTone === 'primary'
      ? 'border-primary/10 bg-primary/5 text-primary'
      : badgeTone === 'blue'
        ? 'border-[#dfe4ff] bg-[#f5f7ff] text-[#4f46e5]'
        : 'border-[#e9e9e9] bg-white text-[#626262]';

  return (
    <div className="flex min-w-0 items-center gap-2">
      <p className="min-w-0 truncate text-sm font-semibold leading-5 text-[#1e1e1e]">
        {title}
      </p>
      <span
        className={`max-w-32 shrink-0 truncate rounded-full border px-2.5 py-0.5 text-[10px] font-medium leading-4 ${badgeClassName}`}
      >
        {badge}
      </span>
    </div>
  );
}

export function FigmaHistory({
  movements,
  loadMoreRef,
  isLoading,
  isFetchingNextPage,
  onOpenTransaction,
  onOpenGroupExpense,
  onOpenDebtPayment,
}: {
  movements: FinanceMovement[];
  loadMoreRef: RefObject<HTMLDivElement | null>;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  onOpenTransaction: (transaction: FinanceMovementTransaction) => void;
  onOpenGroupExpense: (movement: FinanceGroupExpenseMovement) => void;
  onOpenDebtPayment: (movement: FinanceDebtPaymentMovement) => void;
}) {
  const [filter, setFilter] = useState<
    'all' | 'income' | 'expense' | 'group' | 'debt'
  >('all');
  const filteredMovements = movements.filter((movement) => {
    if (filter === 'all') return true;
    if (filter === 'group') return movement.source === 'group-expense';
    if (filter === 'debt') return movement.source === 'debt-payment';
    return (
      movement.source === 'transaction' &&
      (filter === 'income'
        ? movement.type === 'INCOME'
        : movement.type === 'EXPENSE')
    );
  });

  return (
    <section className="mt-4">
      <h2 className="text-sm font-semibold text-[#1e1e1e]">
        {m['finances.history']()}
      </h2>
      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(
          [
            ['all', m['finances.historyAll']()],
            ['income', m['finances.historyIncome']()],
            ['expense', m['finances.historyExpenses']()],
            ['group', m['finances.historyGroupExpenses']()],
            ['debt', m['finances.historyDebtPayments']()],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-[#e5e7eb] bg-white text-[#626262]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-3 grid gap-4">
        {isLoading ? (
          <div className="rounded-2xl bg-white p-4 text-sm text-[#626262] shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            {m['common.loading']()}
          </div>
        ) : null}
        {!isLoading && filteredMovements.length === 0 ? (
          <div className="rounded-2xl bg-white p-4 text-sm text-[#626262] shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            {m['finances.emptyTransactions']()}
          </div>
        ) : null}
        {filteredMovements.map((movement) => {
          if (movement.source === 'transaction') {
            return (
              <button
                key={`transaction:${movement.id}`}
                type="button"
                onClick={() => onOpenTransaction(movement)}
                className="flex w-full min-w-0 items-center gap-4 rounded-[24px] border border-[#e9e9e9] bg-white p-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#ededed] text-[#1e1e1e]">
                  <HugeiconsIcon icon={Wallet02Icon} className="size-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <MovementTitle
                    title={movement.description}
                    badge={
                      movement.category?.name ?? m['finances.noCategory']()
                    }
                  />
                  <p className="truncate text-[11px] leading-4 text-[#8a8a8a]">
                    {movement.accountName ?? m['finances.noAccount']()}
                  </p>
                  <p className="truncate text-xs leading-4 text-[#626262]">
                    {formatShortDate(movement.occurredAt)}
                  </p>
                </div>
                <div className="min-w-0 shrink-0 text-right">
                  <p className="text-base font-medium leading-6 text-[#1e1e1e]">
                    {formatCurrency(movement.currency, movement.amount, {
                      maximumFractionDigits: 0,
                    })}
                  </p>
                  <p
                    className={`max-w-24 truncate text-xs leading-4 ${
                      movement.type === 'INCOME'
                        ? 'text-[#047857]'
                        : 'text-[#b91c1c]'
                    }`}
                  >
                    {movement.type === 'INCOME'
                      ? m['finances.income']()
                      : m['finances.expense']()}
                  </p>
                </div>
              </button>
            );
          }

          if (movement.source === 'debt-payment') {
            return (
              <button
                key={`debt-payment:${movement.id}`}
                type="button"
                onClick={() => onOpenDebtPayment(movement)}
                className="flex w-full min-w-0 items-center gap-4 rounded-[24px] border border-[#e9e9e9] bg-white p-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#fce7f3] text-primary">
                  <HugeiconsIcon icon={Wallet02Icon} className="size-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <MovementTitle
                    title={movement.description}
                    badge={m['finances.debtPayment']()}
                    badgeTone="primary"
                  />
                  <p className="mt-1 truncate text-xs leading-4 text-[#626262]">
                    {formatShortDate(movement.occurredAt)}
                  </p>
                </div>
                <div className="min-w-0 shrink-0 text-right">
                  <p className="text-base font-medium leading-6 text-[#1e1e1e]">
                    {formatCurrency(movement.currency, movement.amount, {
                      maximumFractionDigits: 0,
                    })}
                  </p>
                  <p
                    className={`max-w-24 truncate text-xs leading-4 ${
                      movement.type === 'INCOME'
                        ? 'text-[#047857]'
                        : 'text-[#b91c1c]'
                    }`}
                  >
                    {movement.type === 'INCOME'
                      ? m['finances.debtPaymentReceived']()
                      : m['finances.debtPaymentSent']()}
                  </p>
                </div>
              </button>
            );
          }

          const balance = movement.currentUserBalance;
          const hasBalance =
            typeof balance === 'number' && Math.abs(balance) >= 0.01;
          const amountLabel =
            hasBalance && balance > 0
              ? m['finances.owedToYou']()
              : hasBalance && balance < 0
                ? m['finances.youOwe']()
                : m['finances.yourShare']();
          const amountValue =
            hasBalance && balance ? Math.abs(balance) : movement.userShare;

          return (
            <button
              key={`group-expense:${movement.id}`}
              type="button"
              onClick={() => onOpenGroupExpense(movement)}
              className="flex w-full min-w-0 items-center gap-4 rounded-[24px] border border-[#e9e9e9] bg-white p-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
            >
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#eef2ff] text-[#4f46e5]">
                <HugeiconsIcon icon={UserGroupIcon} className="size-6" />
              </div>
              <div className="min-w-0 flex-1">
                <MovementTitle
                  title={movement.description}
                  badge={movement.groupName}
                  badgeTone="blue"
                />
                <p className="mt-1 truncate text-xs leading-4 text-[#626262]">
                  {formatShortDate(movement.occurredAt)}
                </p>
              </div>
              <div className="min-w-0 shrink-0 text-right">
                <p className="text-base font-medium leading-6 text-[#1e1e1e]">
                  {formatCurrency(movement.currency, amountValue, {
                    maximumFractionDigits: 0,
                  })}
                </p>
                <p
                  className={`max-w-24 truncate text-xs leading-4 ${
                    hasBalance && balance > 0
                      ? 'text-[#047857]'
                      : 'text-[#b91c1c]'
                  }`}
                >
                  {amountLabel}
                </p>
              </div>
            </button>
          );
        })}
      </div>
      <div ref={loadMoreRef} className="h-8" />
      {isFetchingNextPage ? (
        <p className="text-center text-sm text-[#626262]">
          {m['common.loading']()}
        </p>
      ) : null}
    </section>
  );
}
