import { UserGroupIcon, Wallet02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { RefObject } from 'react';
import { formatCurrency, formatShortDate } from '#/lib/i18n';
import { m } from '#/paraglide/messages.js';
import type {
  FinanceDebtPaymentMovement,
  FinanceGroupExpenseMovement,
  FinanceMovement,
  FinanceMovementTransaction,
} from './finance-model';
import { moneyLabel } from './finance-model';

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
    <section className="rounded-[24px] border border-[#e9e9e9] bg-[#0d0809] p-4 text-white">
      <div>
        <p className="text-xs text-white/65">{m['finances.monthBalance']()}</p>
        <p className="mt-1 truncate text-[36px] font-semibold leading-10 tracking-normal">
          {moneyLabel(balance)}
        </p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="min-w-0 rounded-lg bg-[#2b2224] px-3 py-2">
          <p className="text-xs text-white/75">{m['finances.income']()}</p>
          <p className="mt-1 truncate text-xl font-medium">
            {moneyLabel(income)}
          </p>
        </div>
        <div className="min-w-0 rounded-lg bg-[#2b2224] px-3 py-2">
          <p className="text-xs text-white/75">{m['finances.expenses']()}</p>
          <p className="mt-1 truncate text-xl font-medium">
            {moneyLabel(totalExpense)}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-4 text-base font-medium text-primary-foreground shadow-[0_8px_10px_rgba(222,3,77,0.1)]"
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
  return (
    <section className="mt-4">
      <h2 className="text-sm font-semibold text-[#1e1e1e]">
        {m['finances.history']()}
      </h2>
      <div className="mt-3 grid gap-4">
        {isLoading ? (
          <div className="rounded-2xl bg-white p-4 text-sm text-[#626262] shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            {m['common.loading']()}
          </div>
        ) : null}
        {!isLoading && movements.length === 0 ? (
          <div className="rounded-2xl bg-white p-4 text-sm text-[#626262] shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            {m['finances.emptyTransactions']()}
          </div>
        ) : null}
        {movements.map((movement) => {
          if (movement.source === 'transaction') {
            return (
              <button
                key={`transaction:${movement.id}`}
                type="button"
                onClick={() => onOpenTransaction(movement)}
                className="flex w-full min-w-0 items-start gap-3 rounded-2xl border border-[#e9e9e9] bg-white p-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e9e9e9] text-[#1e1e1e]">
                  <HugeiconsIcon icon={Wallet02Icon} className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold leading-6 text-[#1e1e1e]">
                    {movement.description}
                  </p>
                  <p className="truncate text-xs leading-4 text-[#626262]">
                    {movement.category?.name ?? m['finances.noCategory']()}
                  </p>
                  <p className="mt-1 truncate text-xs leading-4 text-[#626262]">
                    {formatShortDate(movement.occurredAt)}
                  </p>
                  <span className="mt-2 inline-flex max-w-full rounded-full bg-[#f4f4f2] px-2.5 py-1 text-[11px] font-medium leading-none text-[#626262]">
                    {m['finances.personalMovement']()}
                  </span>
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
                className="flex w-full min-w-0 items-start gap-3 rounded-2xl border border-[#e9e9e9] bg-white p-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#fce7f3] text-primary">
                  <HugeiconsIcon icon={Wallet02Icon} className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold leading-6 text-[#1e1e1e]">
                    {movement.description}
                  </p>
                  <p className="truncate text-xs leading-4 text-[#626262]">
                    {movement.counterpartyName}
                  </p>
                  <p className="mt-1 truncate text-xs leading-4 text-[#626262]">
                    {formatShortDate(movement.occurredAt)}
                  </p>
                  <span className="mt-2 inline-flex max-w-full rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium leading-none text-primary">
                    {m['finances.debtPayment']()}
                  </span>
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
              className="flex w-full min-w-0 items-start gap-3 rounded-2xl border border-[#e9e9e9] bg-white p-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#eef2ff] text-[#4f46e5]">
                <HugeiconsIcon icon={UserGroupIcon} className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold leading-6 text-[#1e1e1e]">
                  {movement.description}
                </p>
                <p className="truncate text-xs leading-4 text-[#626262]">
                  {movement.category?.name ?? movement.groupName}
                </p>
                <p className="mt-1 truncate text-xs leading-4 text-[#626262]">
                  {formatShortDate(movement.occurredAt)}
                </p>
                <span className="mt-2 inline-flex max-w-full rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium leading-none text-primary">
                  {movement.groupName}
                </span>
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
