import {
  Add01Icon,
  CheckIcon,
  ChevronDownIcon,
  Delete02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { formatCurrency } from '#/lib/i18n';
import { m } from '#/paraglide/messages.js';
import type { QuickSplitForm } from '../-hooks/use-quick-split-form';
import { ParticipantAvatar } from './participant-avatar';
import { formatAmountInput, getSplitMethodLabel } from './quick-split-model';

export function QuickSplitShares({ form }: { form: QuickSplitForm }) {
  const {
    t,
    setShowSplitDrawer,
    people,
    splitMethod,
    sharedExpenseItems,
    setSharedExpenseItems,
    currency,
    equalShare,
    splitSum,
    participantComputedAmounts,
    participantValues,
    setParticipantValues,
  } = form;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-gray-600">{t.splitLabel}</p>
        <button
          type="button"
          onClick={() => setShowSplitDrawer(true)}
          className="inline-flex items-center gap-1 text-rose-500"
        >
          <span className="text-sm font-medium">
            {getSplitMethodLabel(splitMethod, t)}
          </span>
          <HugeiconsIcon icon={ChevronDownIcon} className="size-4" />
        </button>
      </div>

      {splitMethod !== 'equal' ? (
        <div className="rounded-2xl border border-gray-200 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setSharedExpenseItems((current) => [
                  ...current,
                  { name: '', amount: '' },
                ])
              }
              className="flex size-6 shrink-0 items-center justify-center rounded bg-rose-500"
              aria-label={m['groups.expense.addSharedExpenseAria']()}
            >
              <HugeiconsIcon icon={Add01Icon} className="size-4 text-white" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900">
                {m['groups.expense.sharedExpenseTitle']()}
              </p>
              <p className="text-xs text-gray-500">
                {m['groups.expense.sharedExpenseDescription']()}
              </p>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {sharedExpenseItems.map((item, index) => (
              <div
                key={`${index}-${item.name}`}
                className="grid grid-cols-[minmax(0,1fr)_7rem_2.5rem] items-center gap-2"
              >
                <input
                  value={item.name}
                  onChange={(event) =>
                    setSharedExpenseItems((current) =>
                      current.map((entry, itemIndex) =>
                        itemIndex === index
                          ? { ...entry, name: event.target.value }
                          : entry,
                      ),
                    )
                  }
                  placeholder={m['expenseLineItems.itemPlaceholder']()}
                  className="h-11 rounded-full border border-gray-200 px-4 text-sm outline-none"
                />
                <input
                  value={item.amount}
                  onChange={(event) =>
                    setSharedExpenseItems((current) =>
                      current.map((entry, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...entry,
                              amount: formatAmountInput(event.target.value),
                            }
                          : entry,
                      ),
                    )
                  }
                  inputMode="numeric"
                  placeholder="0"
                  className="h-11 rounded-full border border-gray-200 px-4 text-right text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    setSharedExpenseItems((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                  className="flex size-10 items-center justify-center rounded-full border border-gray-200 text-gray-500"
                  aria-label={m['common.delete']()}
                >
                  <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex w-full items-center gap-3">
        <div className="flex size-6 items-center justify-center rounded bg-rose-500">
          <HugeiconsIcon icon={Add01Icon} className="size-4 text-white" />
        </div>
        <span className="text-sm font-medium text-gray-900">{t.splitAll}</span>
        <span className="ml-auto text-sm text-gray-500">
          {splitMethod === 'equal'
            ? formatCurrency(currency, equalShare || 0)
            : splitMethod === 'percentage'
              ? `${splitSum.toFixed(2)}%`
              : formatCurrency(currency, splitSum || 0)}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {people.map((person) => {
          const selected = true;
          const computedAmount = participantComputedAmounts[person.id] ?? 0;

          return (
            <div
              key={person.id}
              className="flex items-center justify-between gap-4"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
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
                <ParticipantAvatar name={person.name} />
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-gray-900">
                    {person.name}
                    {person.isCurrentUser ? (
                      <span className="text-gray-500"> ({t.you})</span>
                    ) : null}
                  </span>
                  {splitMethod !== 'equal' && selected ? (
                    <span className="block text-xs text-gray-500">
                      {formatCurrency(currency, computedAmount)}
                    </span>
                  ) : null}
                </div>
              </div>

              {selected ? (
                splitMethod === 'equal' ? (
                  <span className="shrink-0 text-sm font-medium text-gray-900">
                    {formatCurrency(currency, equalShare || 0)}
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      value={participantValues[person.id] ?? ''}
                      onChange={(event) =>
                        setParticipantValues((current) => ({
                          ...current,
                          [person.id]: event.target.value,
                        }))
                      }
                      inputMode="decimal"
                      placeholder={splitMethod === 'percentage' ? '0' : '0.00'}
                      className="h-10 w-20 rounded-full border border-gray-200 px-3 text-right text-sm text-gray-900 outline-none"
                    />
                    <span className="text-xs text-gray-400">
                      {splitMethod === 'percentage' ? '%' : currency}
                    </span>
                  </div>
                )
              ) : (
                <span className="shrink-0 text-sm text-gray-400">0</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
