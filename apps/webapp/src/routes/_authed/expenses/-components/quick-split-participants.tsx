import { formatCurrency } from '#/lib/i18n';
import { cn } from '#/lib/utils';
import type { QuickSplitForm } from '../-hooks/use-quick-split-form';
import { QuickSplitPayerPicker } from './quick-split-payer-picker';
import { QuickSplitShares } from './quick-split-shares';

export function QuickSplitParticipants({ form }: { form: QuickSplitForm }) {
  const {
    t,
    isEditMode,
    expenseQuery,
    selectedFriends,
    handleRemoveFriend,
    people,
    splitMethod,
    currency,
    splitSum,
    splitIsValid,
    selectedCount,
    amount,
  } = form;

  return (
    <section className="space-y-5 rounded-[24px] border border-[#ebebeb] bg-white px-4 py-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      {selectedFriends.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-[#e2e8f0] px-4 py-5 text-sm text-[#64748b]">
          {t.friendsEmpty}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {selectedFriends.map((friend) => (
            <button
              key={friend.id}
              type="button"
              onClick={() => !isEditMode && handleRemoveFriend(friend.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium',
                isEditMode
                  ? 'border border-[#ebebeb] bg-[#f8fafc] text-[#475569]'
                  : 'border border-[#fecdd3] bg-[#fff5f6] text-[#9f1239]',
              )}
            >
              <span>{friend.name}</span>
              {!isEditMode ? (
                <span className="text-xs font-semibold">×</span>
              ) : null}
            </button>
          ))}
        </div>
      )}

      {people.length > 1 ? (
        <>
          <QuickSplitPayerPicker form={form} />
          <QuickSplitShares form={form} />
        </>
      ) : null}

      {!splitIsValid && selectedCount > 1 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {splitMethod === 'percentage' ? t.invalidPercentage : t.invalidExact}
        </div>
      ) : null}

      <p className="text-xs text-gray-500">
        {selectedCount <= 1
          ? t.splitMinHint
          : splitMethod === 'percentage'
            ? t.splitPercentageHint(
                selectedCount,
                splitSum.toFixed(2),
                formatCurrency(currency, amount),
              )
            : t.splitAmountHint(
                selectedCount,
                formatCurrency(
                  currency,
                  splitMethod === 'equal' ? amount : splitSum,
                ),
                formatCurrency(currency, amount),
              )}
      </p>

      {expenseQuery.data?.quickSplitName && isEditMode ? (
        <p className="text-xs text-gray-500">
          {t.editingIn(expenseQuery.data.quickSplitName)}
        </p>
      ) : null}
    </section>
  );
}
