import { CheckIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { formatMoney } from '#/routes/_authed/groups/$id/-components/group-detail.utils';
import type { ExpenseForm } from '../-hooks/use-expense-form';
import { ParticipantAvatar } from './participant-avatar';

type ExpensePayersSectionProps = { form: ExpenseForm };

export function ExpensePayersSection({ form }: ExpensePayersSectionProps) {
  const {
    currency,
    groupMessages,
    members,
    paidByIds,
    payerSplitIsValid,
    payerSumForDisplay,
    payerValues,
    setPayerValues,
    togglePayer,
  } = form;

  return (
    <>
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm text-gray-600">
            {groupMessages.expense.paidBy}
          </p>
          <span className="text-xs text-gray-400">
            {paidByIds.length} seleccionada
            {paidByIds.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {members.map((member) => {
            const selected = paidByIds.includes(member.id);

            return (
              <button
                key={member.id}
                type="button"
                onClick={() => togglePayer(member.id)}
                className="flex min-w-[72px] flex-col items-center"
              >
                <div
                  className={`flex size-11 items-center justify-center overflow-hidden rounded-full border-2 ${
                    selected ? 'border-rose-500' : 'border-transparent'
                  }`}
                >
                  <ParticipantAvatar
                    name={member.name}
                    image={member.image}
                    sizeClassName="size-full"
                  />
                </div>
                <span
                  className={`mt-1 inline-flex size-4 items-center justify-center rounded-full border text-[10px] font-semibold ${
                    selected
                      ? 'border-rose-500 bg-rose-500 text-white'
                      : 'border-gray-300 bg-white text-transparent'
                  }`}
                >
                  {selected ? (
                    <HugeiconsIcon icon={CheckIcon} className="size-2.5" />
                  ) : (
                    '•'
                  )}
                </span>
                <span className="mt-1.5 max-w-[60px] truncate text-xs text-gray-600">
                  {member.isCurrentUser
                    ? groupMessages.expense.you
                    : member.name}
                </span>
              </button>
            );
          })}
        </div>

        {paidByIds.length > 1 ? (
          <div className="mt-4 rounded-[28px] border border-gray-200 px-3 py-2">
            <div className="space-y-1">
              {paidByIds.map((payerId) => {
                const payer = members.find((member) => member.id === payerId);
                if (!payer) return null;

                return (
                  <label
                    key={payerId}
                    className="flex items-center gap-3 px-1 py-1"
                  >
                    <ParticipantAvatar
                      name={payer.name}
                      image={payer.image}
                      sizeClassName="size-9 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <input
                        value={payerValues[payerId] ?? ''}
                        onChange={(event) =>
                          setPayerValues((current) => ({
                            ...current,
                            [payerId]: event.target.value,
                          }))
                        }
                        inputMode="decimal"
                        placeholder={groupMessages.expense.totalPaidPlaceholder}
                        className="h-11 w-full rounded-full border border-gray-200 bg-white px-4 text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400 focus:border-rose-500"
                      />
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-between px-1 text-xs">
              <span
                className={payerSplitIsValid ? 'text-gray-400' : 'text-red-500'}
              >
                {payerSplitIsValid
                  ? groupMessages.expense.payersTotalValid
                  : groupMessages.expense.payersTotalInvalid}
              </span>
              <span
                className={payerSplitIsValid ? 'text-gray-500' : 'text-red-500'}
              >
                {formatMoney(currency, payerSumForDisplay)}
              </span>
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}
