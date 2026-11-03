import { useMemo, useState } from 'react';
import {
  type ExpenseRecord,
  getRestoredPayerValues,
} from '../-lib/initial-values';
import { computePayerValues } from '../-lib/split-values';
import { useSyncedState } from './use-synced-state';

type UseExpensePayersOptions = {
  expense: ExpenseRecord | undefined;
  isEditMode: boolean;
  normalizedAmount: number;
  initialPaidByIds: string[];
};

export function useExpensePayers({
  expense,
  isEditMode,
  normalizedAmount,
  initialPaidByIds,
}: UseExpensePayersOptions) {
  const [paidByIds, setPaidByIds] = useState(initialPaidByIds);
  const restoredPayerValues = useMemo(
    () => (expense ? getRestoredPayerValues(expense) : null),
    [expense],
  );
  const [payerValues, setPayerValues] = useSyncedState(
    [isEditMode, normalizedAmount, paidByIds, restoredPayerValues],
    () =>
      computePayerValues({
        current: {},
        isEditMode,
        restoredPayerValues,
        paidByIds,
        normalizedAmount,
      }),
    (current) =>
      computePayerValues({
        current,
        isEditMode,
        restoredPayerValues,
        paidByIds,
        normalizedAmount,
      }),
  );

  const payerSum = useMemo(() => {
    return paidByIds.reduce((sum, memberId) => {
      const value = Number(payerValues[memberId] ?? '0');
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
  }, [paidByIds, payerValues]);

  const payerValuesAreEqual =
    paidByIds.length > 1 &&
    paidByIds.every(
      (memberId) => payerValues[memberId] === payerValues[paidByIds[0] ?? ''],
    );
  const payerRoundingAdjustment = normalizedAmount - payerSum;
  const payerSplitIsValid =
    paidByIds.length <= 1 ||
    ((Math.abs(payerSum - normalizedAmount) < 0.01 ||
      (payerValuesAreEqual && Math.abs(payerRoundingAdjustment) <= 0.01)) &&
      paidByIds.every((memberId) => Number(payerValues[memberId] ?? 0) > 0));
  const payerSumForDisplay =
    payerSplitIsValid && payerValuesAreEqual ? normalizedAmount : payerSum;

  const togglePayer = (memberId: string) => {
    setPaidByIds((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    );
  };

  return {
    paidByIds,
    payerRoundingAdjustment,
    payerSplitIsValid,
    payerSum,
    payerSumForDisplay,
    payerValues,
    payerValuesAreEqual,
    restoredPayerValues,
    setPaidByIds,
    setPayerValues,
    togglePayer,
  };
}
