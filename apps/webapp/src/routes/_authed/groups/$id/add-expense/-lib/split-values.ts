import type { SplitMethod } from './expense-form.types';
import { formatEditableNumber, splitAmountEqually } from './expense-form.utils';

type SyncParticipantValuesInput = {
  splitMethod: SplitMethod;
  participantIds: string[];
  amount: string;
  normalizedSharedAmount: number;
  lineItemTotalsByMember: Record<string, number>;
};

export function syncParticipantValues(
  current: Record<string, string>,
  input: SyncParticipantValuesInput,
): Record<string, string> {
  if (input.splitMethod === 'equal') return current;

  const next: Record<string, string> = {};
  const selectedCount = input.participantIds.length;
  const baseAmount = Math.max(
    Number(input.amount || 0) - input.normalizedSharedAmount,
    0,
  );
  const defaultValue =
    input.splitMethod === 'percentage'
      ? selectedCount > 0
        ? 100 / selectedCount
        : 0
      : selectedCount > 0
        ? baseAmount / selectedCount
        : 0;

  for (const participantId of input.participantIds) {
    const itemizedTotal = input.lineItemTotalsByMember[participantId];
    next[participantId] =
      input.splitMethod === 'exact' && itemizedTotal !== undefined
        ? formatEditableNumber(itemizedTotal)
        : (current[participantId] ??
          (defaultValue > 0 ? formatEditableNumber(defaultValue) : ''));
  }

  return next;
}

type ComputePayerValuesInput = {
  current: Record<string, string>;
  isEditMode: boolean;
  restoredPayerValues: Record<string, string> | null;
  paidByIds: string[];
  normalizedAmount: number;
};

export function computePayerValues(
  input: ComputePayerValuesInput,
): Record<string, string> {
  if (
    input.isEditMode &&
    input.restoredPayerValues &&
    Object.keys(input.current).length === 0
  ) {
    return input.restoredPayerValues;
  }

  if (input.paidByIds.length <= 1) {
    return input.paidByIds[0]
      ? {
          [input.paidByIds[0]]: formatEditableNumber(input.normalizedAmount),
        }
      : {};
  }

  const next: Record<string, string> = {};
  const equalValues = splitAmountEqually(
    input.normalizedAmount,
    input.paidByIds.length,
  );

  input.paidByIds.forEach((payerId, index) => {
    next[payerId] = equalValues[index] ?? '';
  });

  return next;
}
