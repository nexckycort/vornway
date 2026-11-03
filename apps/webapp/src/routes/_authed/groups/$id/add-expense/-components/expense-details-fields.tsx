import {
  Add01Icon,
  ChevronDownIcon,
  MapPinIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { m } from '#/paraglide/messages.js';
import { CategoryIcon } from '#/routes/_authed/groups/$id/-components/category-icon';
import type { ExpenseForm } from '../-hooks/use-expense-form';

type ExpenseDetailsFieldsProps = { form: ExpenseForm };

export function ExpenseDetailsFields({ form }: ExpenseDetailsFieldsProps) {
  const {
    advancedDetailsEnabled,
    description,
    descriptionInputRef,
    groupMessages,
    isPersonalSpace,
    normalizedAdvancedDetails,
    paymentAccounts,
    selectedAccount,
    selectedAccountId,
    selectedAdvancedDetailsType,
    selectedCategory,
    setDescription,
    setSelectedAccountId,
    setShowAdvancedDetailsDrawer,
    setShowCategoryDrawer,
    setTagsInput,
    showDescriptionError,
    tagsInput,
  } = form;

  return (
    <>
      <label
        className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 ${
          showDescriptionError ? 'border-red-300' : 'border-gray-200'
        }`}
      >
        <input
          ref={descriptionInputRef}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={groupMessages.expense.descriptionPlaceholder}
          aria-invalid={showDescriptionError}
          className={`w-full bg-transparent outline-none placeholder:text-gray-400 ${
            showDescriptionError ? 'text-red-700' : 'text-gray-700'
          }`}
        />
      </label>

      {showDescriptionError ? (
        <p className="-mt-3 px-4 text-xs font-medium text-red-600">
          {groupMessages.expense.descriptionRequired}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => setShowCategoryDrawer(true)}
        className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-4 py-3.5 text-left"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundColor: `${selectedCategory?.color ?? '#f43f5e'}18`,
              color: selectedCategory?.color ?? '#f43f5e',
            }}
          >
            <CategoryIcon
              icon={selectedCategory?.icon}
              color={selectedCategory?.color}
              fallback={<HugeiconsIcon icon={Add01Icon} className="size-4" />}
            />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-gray-500">
              {groupMessages.expense.category}
            </p>
            <p className="text-sm font-medium text-gray-900">
              {selectedCategory?.name ?? groupMessages.expense.withoutCategory}
            </p>
          </div>
        </div>
        <HugeiconsIcon
          icon={ChevronDownIcon}
          className="size-4 text-gray-400"
        />
      </button>

      {isPersonalSpace ? (
        <label className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3.5">
          <div className="min-w-0">
            <p className="text-xs text-gray-500">{m['finances.account']()}</p>
            <p className="truncate text-sm font-medium text-gray-900">
              {selectedAccount
                ? `${selectedAccount.name} · ${
                    selectedAccount.institution ?? selectedAccount.currency
                  }`
                : m['finances.noAccount']()}
            </p>
          </div>
          <select
            value={selectedAccountId}
            onChange={(event) => setSelectedAccountId(event.target.value)}
            className="max-w-[48%] rounded-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none"
            aria-label={m['finances.account']()}
          >
            <option value="">{m['finances.noAccount']()}</option>
            {paymentAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} · {account.institution ?? account.currency}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {isPersonalSpace ? (
        <label className="flex flex-col gap-2 rounded-xl border border-gray-200 px-4 py-3.5">
          <span className="text-xs text-gray-500">
            {groupMessages.expense.tags}
          </span>
          <input
            value={tagsInput}
            onChange={(event) => setTagsInput(event.target.value)}
            placeholder={groupMessages.expense.tagsPlaceholder}
            className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
          />
        </label>
      ) : null}

      {advancedDetailsEnabled ? (
        <button
          type="button"
          onClick={() => setShowAdvancedDetailsDrawer(true)}
          className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-4 py-3.5 text-left"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-500">
              <HugeiconsIcon icon={MapPinIcon} className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">
                {groupMessages.expense.placeDetails}
              </p>
              <p className="truncate text-sm font-medium text-gray-900">
                {normalizedAdvancedDetails?.placeName ??
                  selectedAdvancedDetailsType.label}
              </p>
            </div>
          </div>
          <HugeiconsIcon
            icon={ChevronDownIcon}
            className="size-4 text-gray-400"
          />
        </button>
      ) : null}
    </>
  );
}
