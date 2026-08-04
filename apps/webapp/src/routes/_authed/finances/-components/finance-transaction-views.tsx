import { MoreVerticalIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useState } from 'react';
import { Button } from '#/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu';
import { formatCurrency, formatShortDate } from '#/lib/i18n';
import { m } from '#/paraglide/messages.js';
import { ScreenShell, SummaryCard } from './finance-layout';
import {
  appendTagToInput,
  type EditableFinanceTransaction,
  type FinanceCategory,
  type FinanceSummaryAccount,
  type FinanceTag,
  isCategoryAllowedForTransaction,
} from './finance-model';

type TransactionAccount = {
  name: string;
  institution?: string | null;
  currency: string;
};

function getTransactionAccountLabel(
  transaction: EditableFinanceTransaction,
  transactionAccounts: FinanceSummaryAccount[],
) {
  const transactionWithAccount = transaction as EditableFinanceTransaction & {
    account?: TransactionAccount | null;
  };
  const account =
    transactionWithAccount.account ??
    transactionAccounts.find((item) => item.id === transaction.accountId);

  if (!account) return m['finances.noAccount']();

  return `${account.name} · ${account.institution ?? account.currency}`;
}

export function CreateTransactionView({
  month,
  transactionType,
  amount,
  categoryId,
  selectedAccountId,
  description,
  transactionDate,
  tagsInput,
  transactionCategories,
  transactionAccounts,
  tags,
  isSaving,
  onBack,
  onTransactionTypeChange,
  onAmountChange,
  onCategoryChange,
  onAccountChange,
  onDescriptionChange,
  onTransactionDateChange,
  onTagsInputChange,
  onSubmit,
}: {
  month: string;
  transactionType: 'income' | 'expense';
  amount: string;
  categoryId: string;
  selectedAccountId: string;
  description: string;
  transactionDate: string;
  tagsInput: string;
  transactionCategories: FinanceCategory[];
  transactionAccounts: FinanceSummaryAccount[];
  tags: FinanceTag[];
  isSaving: boolean;
  onBack: () => void;
  onTransactionTypeChange: (type: 'income' | 'expense') => void;
  onAmountChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onAccountChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onTransactionDateChange: (value: string) => void;
  onTagsInputChange: (value: string | ((current: string) => string)) => void;
  onSubmit: () => void;
}) {
  return (
    <ScreenShell
      title={m['finances.addTransaction']()}
      month={month}
      onBack={onBack}
    >
      <div className="grid gap-5">
        <div className="grid grid-cols-2 gap-2 rounded-full bg-white p-1">
          {(['expense', 'income'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onTransactionTypeChange(type)}
              className={`h-11 rounded-full text-sm font-medium ${
                transactionType === type
                  ? 'bg-[#101113] text-white'
                  : 'text-black/50'
              }`}
            >
              {type === 'expense'
                ? m['finances.expense']()
                : m['finances.income']()}
            </button>
          ))}
        </div>

        <input
          inputMode="decimal"
          value={amount}
          onChange={(event) => onAmountChange(event.target.value)}
          placeholder={m['finances.amountPlaceholder']()}
          className="h-20 rounded-[28px] border border-black/5 bg-white px-5 text-3xl font-semibold outline-none"
        />
        <select
          value={categoryId}
          onChange={(event) => onCategoryChange(event.target.value)}
          className="h-14 rounded-[22px] border border-black/5 bg-white px-4 text-base outline-none"
        >
          <option value="">{m['finances.noCategory']()}</option>
          {transactionCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          value={selectedAccountId}
          onChange={(event) => onAccountChange(event.target.value)}
          className="h-14 rounded-[22px] border border-black/5 bg-white px-4 text-base outline-none"
        >
          <option value="">
            {transactionType === 'income'
              ? m['finances.incomeAccountPlaceholder']()
              : m['finances.expenseAccountPlaceholder']()}
          </option>
          {transactionAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} · {account.institution ?? account.currency}
            </option>
          ))}
        </select>
        <input
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder={
            transactionType === 'income'
              ? m['finances.incomePlaceholder']()
              : m['finances.expensePlaceholder']()
          }
          className="h-14 rounded-[22px] border border-black/5 bg-white px-4 text-base outline-none"
        />
        <input
          type="date"
          value={transactionDate}
          onChange={(event) => onTransactionDateChange(event.target.value)}
          className="h-14 rounded-[22px] border border-black/5 bg-white px-4 text-base outline-none"
        />
        <input
          value={tagsInput}
          onChange={(event) => onTagsInputChange(event.target.value)}
          placeholder={m['finances.tagsPlaceholder']()}
          className="h-14 rounded-[22px] border border-black/5 bg-white px-4 text-base outline-none"
        />
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.slice(0, 10).map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() =>
                  onTagsInputChange((current) =>
                    appendTagToInput(current, tag.name),
                  )
                }
                className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-black/55"
              >
                #{tag.name}
              </button>
            ))}
          </div>
        ) : null}
        <Button
          type="button"
          onClick={onSubmit}
          disabled={isSaving}
          className="h-14 rounded-full"
        >
          {isSaving ? m['common.saving']() : m['finances.saveTransaction']()}
        </Button>
      </div>
    </ScreenShell>
  );
}

export function TransactionDetailView({
  month,
  transaction,
  categories,
  transactionAccounts,
  editingTransactionName,
  editingTransactionAmount,
  editingTransactionDate,
  editingTransactionCategoryId,
  editingTransactionAccountId,
  editingTransactionTagsInput,
  isUpdating,
  onBack,
  onShare,
  onDelete,
  onPrepareEdit,
  onEditingNameChange,
  onEditingAmountChange,
  onEditingDateChange,
  onEditingCategoryChange,
  onEditingAccountChange,
  onEditingTagsInputChange,
  onSubmitUpdate,
}: {
  month: string;
  transaction: EditableFinanceTransaction | undefined;
  categories: FinanceCategory[];
  transactionAccounts: FinanceSummaryAccount[];
  editingTransactionName: string;
  editingTransactionAmount: string;
  editingTransactionDate: string;
  editingTransactionCategoryId: string;
  editingTransactionAccountId: string;
  editingTransactionTagsInput: string;
  isUpdating: boolean;
  onBack: () => void;
  onShare: (transaction: EditableFinanceTransaction) => void;
  onDelete: (id: string) => void;
  onPrepareEdit: (transaction: EditableFinanceTransaction) => void;
  onEditingNameChange: (value: string) => void;
  onEditingAmountChange: (value: string) => void;
  onEditingDateChange: (value: string) => void;
  onEditingCategoryChange: (value: string) => void;
  onEditingAccountChange: (value: string) => void;
  onEditingTagsInputChange: (value: string) => void;
  onSubmitUpdate: (transaction: EditableFinanceTransaction) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (!transaction) {
    return (
      <ScreenShell
        title={m['finances.movement']()}
        month={month}
        onBack={onBack}
      >
        <div className="rounded-[30px] bg-white p-5 text-sm text-black/45">
          {m['finances.movementNotFound']()}
        </div>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title={m['finances.movement']()} month={month} onBack={onBack}>
      <section className="rounded-[34px] bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm text-black/45">
              {isEditing
                ? m['finances.editMovement']()
                : (transaction.category?.name ?? m['finances.noCategory']())}
            </p>
            {isEditing ? (
              <input
                inputMode="decimal"
                value={editingTransactionAmount}
                onChange={(event) => onEditingAmountChange(event.target.value)}
                placeholder={m['finances.amountPlaceholder']()}
                className="mt-3 h-16 w-full min-w-0 rounded-[24px] border border-black/5 bg-[#f7f7f4] px-4 text-3xl font-semibold leading-none outline-none"
              />
            ) : (
              <p className="mt-3 truncate text-4xl font-semibold leading-none">
                {transaction.type === 'INCOME' ? '+' : '-'}
                {formatCurrency(transaction.currency, transaction.amount, {
                  maximumFractionDigits: 0,
                })}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex size-11 items-center justify-center rounded-full border border-black/10 bg-white outline-none">
              <HugeiconsIcon icon={MoreVerticalIcon} className="size-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onShare(transaction)}>
                {m['finances.share']()}
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  if (confirm(m['finances.deleteMovementConfirm']())) {
                    onDelete(transaction.id);
                  }
                }}
              >
                {m['common.delete']()}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isEditing ? (
          <div className="mt-6 grid gap-3">
            <input
              value={editingTransactionName}
              onChange={(event) => onEditingNameChange(event.target.value)}
              placeholder={m['finances.expensePlaceholder']()}
              className="h-13 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
            />
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <select
                value={editingTransactionCategoryId}
                onChange={(event) =>
                  onEditingCategoryChange(event.target.value)
                }
                className="h-13 min-w-0 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
              >
                <option value="">{m['finances.noCategory']()}</option>
                {categories
                  .filter((category) =>
                    isCategoryAllowedForTransaction(category, transaction),
                  )
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </select>
              <input
                type="date"
                value={editingTransactionDate}
                onChange={(event) => onEditingDateChange(event.target.value)}
                className="h-13 min-w-0 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
                aria-label={m['finances.date']()}
              />
            </div>
            <select
              value={editingTransactionAccountId}
              onChange={(event) => onEditingAccountChange(event.target.value)}
              className="h-13 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
            >
              <option value="">{m['finances.noAccount']()}</option>
              {transactionAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} · {account.institution ?? account.currency}
                </option>
              ))}
            </select>
            <input
              value={editingTransactionTagsInput}
              onChange={(event) => onEditingTagsInputChange(event.target.value)}
              placeholder={m['finances.tagsPlaceholder']()}
              className="h-13 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
            />
            <div className="mt-2 grid grid-cols-[auto_1fr] gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onPrepareEdit(transaction);
                  setIsEditing(false);
                }}
                className="h-12 rounded-full px-5"
              >
                {m['common.cancel']()}
              </Button>
              <Button
                type="button"
                onClick={() => onSubmitUpdate(transaction)}
                disabled={isUpdating}
                className="h-12 rounded-full"
              >
                {isUpdating
                  ? m['common.saving']()
                  : m['finances.saveMovementChanges']()}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-7 grid gap-4 text-sm">
              <SummaryCard
                label={m['finances.description']()}
                value={transaction.description}
              />
              <SummaryCard
                label={m['finances.date']()}
                value={formatShortDate(transaction.occurredAt)}
              />
              <SummaryCard
                label={m['finances.account']()}
                value={getTransactionAccountLabel(
                  transaction,
                  transactionAccounts,
                )}
              />
              <div className="rounded-[26px] border border-black/5 bg-white p-4">
                <p className="text-sm text-black/45">{m['finances.tags']()}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {transaction.tags.length === 0 ? (
                    <span className="text-sm text-black/45">
                      {m['finances.emptyTags']()}
                    </span>
                  ) : (
                    transaction.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="rounded-full bg-[#f7f7f4] px-3 py-1.5 text-xs font-medium"
                      >
                        #{tag.name}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => {
                onPrepareEdit(transaction);
                setIsEditing(true);
              }}
              className="mt-6 h-12 w-full rounded-full"
            >
              {m['finances.editMovement']()}
            </Button>
          </>
        )}
      </section>
    </ScreenShell>
  );
}
