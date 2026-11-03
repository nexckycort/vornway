import {
  Add01Icon,
  CheckIcon,
  ChevronDownIcon,
  Delete02Icon,
  MinusSignIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { formatMoney } from '#/routes/_authed/groups/$id/-components/group-detail.utils';
import type { ExpenseForm } from '../-hooks/use-expense-form';
import { splitMethods } from '../-lib/expense-form.types';
import { ParticipantAvatar } from './participant-avatar';

type ExpenseSplitSectionProps = { form: ExpenseForm };

export function ExpenseSplitSection({ form }: ExpenseSplitSectionProps) {
  const {
    addSharedExpenseItem,
    currency,
    equalShare,
    groupMessages,
    lineItems,
    lineItemsMessages,
    members,
    normalizedSharedAmount,
    participantComputedAmounts,
    participantIds,
    participantValues,
    removeSharedExpenseItem,
    selectedCount,
    setLineItemsDrawerMemberId,
    setParticipantValues,
    setShowSplitDrawer,
    sharedExpenseItems,
    sharedShare,
    showLineItemsError,
    showParticipantsError,
    showSharedExpenseItemsError,
    splitMethod,
    splitSum,
    toggleAllParticipants,
    toggleParticipant,
    updateSharedExpenseItem,
  } = form;

  return (
    <>
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm text-gray-600">
            {groupMessages.expense.splitWith}
          </p>
          <button
            type="button"
            onClick={() => setShowSplitDrawer(true)}
            className="inline-flex items-center gap-1 text-rose-500"
          >
            <span className="text-sm font-medium">
              {splitMethods.find((item) => item.value === splitMethod)?.label}
            </span>
            <HugeiconsIcon icon={ChevronDownIcon} className="size-4" />
          </button>
        </div>

        {showParticipantsError ? (
          <p className="mb-3 text-xs font-medium text-red-600">
            {groupMessages.expense.participantsRequired}
          </p>
        ) : null}

        <button
          type="button"
          onClick={toggleAllParticipants}
          className="mt-4 flex w-full items-center gap-3"
        >
          <div className="flex size-6 items-center justify-center rounded bg-rose-500">
            {selectedCount === members.length && members.length > 0 ? (
              <HugeiconsIcon
                icon={MinusSignIcon}
                className="size-4 text-white"
              />
            ) : (
              <HugeiconsIcon icon={Add01Icon} className="size-4 text-white" />
            )}
          </div>
          <span className="text-sm font-medium text-gray-900">
            {groupMessages.expense.all}
          </span>
          <span className="ml-auto text-sm text-gray-500">
            {splitMethod === 'equal'
              ? formatMoney(currency, equalShare || 0)
              : splitMethod === 'percentage'
                ? `${splitSum.toFixed(2)}% · +${formatMoney(currency, normalizedSharedAmount)}`
                : formatMoney(currency, splitSum + normalizedSharedAmount || 0)}
          </span>
        </button>

        {splitMethod !== 'equal' ? (
          <div className="mt-4 rounded-2xl border border-gray-200 px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={addSharedExpenseItem}
                className="flex size-6 shrink-0 items-center justify-center rounded bg-rose-500"
                aria-label={groupMessages.expense.addSharedExpenseAria}
              >
                <HugeiconsIcon icon={Add01Icon} className="size-4 text-white" />
              </button>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {groupMessages.expense.sharedExpenseTitle}
                </p>
                <p className="text-xs text-gray-500">
                  {groupMessages.expense.sharedExpenseDescription}
                </p>
              </div>
            </div>

            {sharedExpenseItems.length > 0 ? (
              <div className="mt-4 space-y-3">
                {sharedExpenseItems.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[minmax(0,1fr)_7rem_2.5rem] items-center gap-2"
                  >
                    <input
                      value={item.name}
                      onChange={(event) =>
                        updateSharedExpenseItem(item.id, {
                          name: event.target.value,
                        })
                      }
                      placeholder={
                        groupMessages.expense.sharedExpenseNamePlaceholder
                      }
                      className="h-11 rounded-full border border-gray-200 px-4 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                    />
                    <input
                      value={item.amount}
                      onChange={(event) =>
                        updateSharedExpenseItem(item.id, {
                          amount: event.target.value,
                        })
                      }
                      inputMode="decimal"
                      placeholder="0"
                      className="h-11 rounded-full border border-gray-200 px-4 text-right text-sm text-gray-900 outline-none placeholder:text-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => removeSharedExpenseItem(item.id)}
                      className="flex size-10 items-center justify-center rounded-full border border-gray-200 text-gray-500"
                      aria-label={groupMessages.expense.removeSharedExpenseAria}
                    >
                      <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {showSharedExpenseItemsError ? (
              <p className="mt-3 text-xs font-medium text-red-600">
                {groupMessages.expense.sharedExpenseItemsRequired}
              </p>
            ) : null}

            {normalizedSharedAmount > 0 && selectedCount > 0 ? (
              <p className="mt-2 text-xs text-gray-500">
                {groupMessages.expense.sharedAmountPerPerson(
                  formatMoney(currency, sharedShare),
                )}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          {members.map((member) => {
            const selected = participantIds.includes(member.id);
            const computedAmount = participantComputedAmounts[member.id] ?? 0;
            const memberLineItems = lineItems.filter(
              (item) => item.memberId === member.id,
            );

            return (
              <div key={member.id}>
                <div className="flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => toggleParticipant(member.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <div
                      className={`flex size-6 items-center justify-center rounded-full ${
                        selected ? 'bg-rose-500' : 'bg-gray-300'
                      }`}
                    >
                      {selected ? (
                        <HugeiconsIcon
                          icon={CheckIcon}
                          className="size-4 text-white"
                        />
                      ) : (
                        <HugeiconsIcon
                          icon={Add01Icon}
                          className="size-4 text-white"
                        />
                      )}
                    </div>
                    <ParticipantAvatar
                      name={member.name}
                      image={member.image}
                      sizeClassName="size-9 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-gray-900">
                        {member.name}
                        {member.isCurrentUser ? (
                          <span className="text-gray-500">
                            {' '}
                            {groupMessages.expense.you}
                          </span>
                        ) : null}
                      </span>
                      {splitMethod !== 'equal' && selected ? (
                        <span className="block text-xs text-gray-500">
                          {formatMoney(currency, computedAmount)}
                          {memberLineItems.length > 0
                            ? ` · ${lineItemsMessages.itemCount(memberLineItems.length)}`
                            : ''}
                        </span>
                      ) : null}
                    </div>
                  </button>

                  {selected ? (
                    splitMethod === 'equal' ? (
                      <span className="shrink-0 text-sm font-medium text-gray-900">
                        {formatMoney(currency, equalShare || 0)}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          value={participantValues[member.id] ?? ''}
                          onChange={(event) =>
                            setParticipantValues((current) => ({
                              ...current,
                              [member.id]: event.target.value,
                            }))
                          }
                          readOnly={
                            splitMethod === 'exact' &&
                            memberLineItems.length > 0
                          }
                          inputMode="decimal"
                          placeholder={
                            splitMethod === 'percentage' ? '0' : '0.00'
                          }
                          className={`h-10 w-20 rounded-full border border-gray-200 px-3 text-right text-sm text-gray-900 outline-none ${
                            memberLineItems.length > 0 ? 'bg-gray-50' : ''
                          }`}
                        />
                        <span className="text-xs text-gray-400">
                          {splitMethod === 'percentage' ? '%' : currency}
                        </span>
                        {splitMethod === 'exact' ? (
                          <button
                            type="button"
                            onClick={() =>
                              setLineItemsDrawerMemberId(member.id)
                            }
                            aria-label={lineItemsMessages.drawerTitle(
                              member.name,
                            )}
                            className="flex size-9 items-center justify-center rounded-full border border-gray-200 text-rose-500 transition-colors hover:bg-rose-50"
                          >
                            <HugeiconsIcon
                              icon={Add01Icon}
                              className="size-4"
                            />
                          </button>
                        ) : null}
                      </div>
                    )
                  ) : (
                    <span className="shrink-0 text-sm text-gray-400">0</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {showLineItemsError ? (
          <p className="mt-3 text-xs font-medium text-red-600">
            {lineItemsMessages.validation}
          </p>
        ) : null}
      </section>
    </>
  );
}
