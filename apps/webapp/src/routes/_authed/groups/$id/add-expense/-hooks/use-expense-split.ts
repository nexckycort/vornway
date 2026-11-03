import { useMemo, useState } from 'react';
import type { GroupSummary } from '#/routes/_authed/groups/$id/-types/group-detail.types';
import type {
  ExpenseLineItem,
  SharedExpenseItem,
  SplitMethod,
} from '../-lib/expense-form.types';
import {
  createExpenseLineItem,
  createSharedExpenseItem,
} from '../-lib/expense-form.utils';
import type { InitialExpenseValues } from '../-lib/initial-values';
import { syncParticipantValues } from '../-lib/split-values';
import { useSyncedState } from './use-synced-state';

type UseExpenseSplitOptions = {
  amount: string;
  normalizedAmount: number;
  members: GroupSummary['members'];
  initial: InitialExpenseValues;
};

export function useExpenseSplit({
  amount,
  normalizedAmount,
  members,
  initial,
}: UseExpenseSplitOptions) {
  const [lineItems, setLineItems] = useState<ExpenseLineItem[]>(
    initial.lineItems,
  );
  const [lineItemsDrawerMemberId, setLineItemsDrawerMemberId] = useState<
    string | null
  >(null);
  const [sharedExpenseItems, setSharedExpenseItems] = useState<
    SharedExpenseItem[]
  >(initial.sharedExpenseItems);
  const [participantIds, setParticipantIds] = useState(initial.participantIds);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>(
    initial.splitMethod,
  );
  const [showSplitDrawer, setShowSplitDrawer] = useState(false);

  const normalizedSharedExpenseItems = useMemo(
    () =>
      sharedExpenseItems.map((item) => ({
        ...item,
        normalizedAmount: Number(item.amount || 0),
      })),
    [sharedExpenseItems],
  );
  const normalizedSharedAmount = normalizedSharedExpenseItems.reduce(
    (sum, item) =>
      Number.isFinite(item.normalizedAmount) && item.normalizedAmount > 0
        ? sum + item.normalizedAmount
        : sum,
    0,
  );
  const normalizedLineItems = useMemo(
    () =>
      lineItems.map((item) => ({
        ...item,
        normalizedAmount: Number(item.amount || 0),
      })),
    [lineItems],
  );
  const lineItemTotalsByMember = useMemo(() => {
    const totals: Record<string, number> = {};

    for (const item of normalizedLineItems) {
      if (!Number.isFinite(item.normalizedAmount)) continue;
      totals[item.memberId] =
        (totals[item.memberId] ?? 0) + item.normalizedAmount;
    }

    return totals;
  }, [normalizedLineItems]);
  const lineItemsDrawerMember = members.find(
    (member) => member.id === lineItemsDrawerMemberId,
  );
  const drawerLineItems = lineItems.filter(
    (item) => item.memberId === lineItemsDrawerMemberId,
  );

  const participantValuesSyncInput = {
    amount,
    lineItemTotalsByMember,
    normalizedSharedAmount,
    participantIds,
    splitMethod,
  };
  const [participantValues, setParticipantValues] = useSyncedState(
    [
      amount,
      lineItemTotalsByMember,
      normalizedSharedAmount,
      participantIds,
      splitMethod,
    ],
    () =>
      syncParticipantValues(
        initial.participantValues,
        participantValuesSyncInput,
      ),
    (current) => syncParticipantValues(current, participantValuesSyncInput),
  );

  const selectedCount = participantIds.length;
  const sharedAmountExceedsTotal =
    selectedCount > 0 && normalizedSharedAmount > normalizedAmount;
  const baseAmount = Math.max(normalizedAmount - normalizedSharedAmount, 0);
  const equalShare = selectedCount > 0 ? normalizedAmount / selectedCount : 0;
  const sharedShare =
    selectedCount > 0 ? normalizedSharedAmount / selectedCount : 0;

  const participantComputedAmounts = useMemo(() => {
    const result: Record<string, number> = {};

    for (const memberId of participantIds) {
      const rawValue = Number(participantValues[memberId] ?? '0');

      if (splitMethod === 'percentage') {
        result[memberId] = baseAmount * (rawValue / 100) + sharedShare;
        continue;
      }

      if (splitMethod === 'exact') {
        result[memberId] = rawValue + sharedShare;
        continue;
      }

      result[memberId] = equalShare;
    }

    return result;
  }, [
    baseAmount,
    equalShare,
    sharedShare,
    participantIds,
    participantValues,
    splitMethod,
  ]);

  const splitSum = useMemo(() => {
    return participantIds.reduce((sum, memberId) => {
      const value = Number(participantValues[memberId] ?? '0');
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
  }, [participantIds, participantValues]);

  const splitIsValid =
    selectedCount > 0 &&
    !sharedAmountExceedsTotal &&
    (splitMethod === 'equal'
      ? true
      : splitMethod === 'percentage'
        ? Math.abs(splitSum - 100) < 0.01 &&
          participantIds.every(
            (memberId) => Number(participantValues[memberId] ?? 0) > 0,
          )
        : Math.abs(splitSum + normalizedSharedAmount - normalizedAmount) <
            0.01 &&
          participantIds.every(
            (memberId) => Number(participantValues[memberId] ?? 0) > 0,
          ));

  const sharedExpenseItemsAreValid = normalizedSharedExpenseItems.every(
    (item) => item.name.trim().length > 0 && item.normalizedAmount > 0,
  );
  const lineItemsAreValid = normalizedLineItems.every(
    (item) =>
      participantIds.includes(item.memberId) &&
      item.description.trim().length > 0 &&
      item.normalizedAmount > 0,
  );

  const toggleParticipant = (memberId: string) => {
    if (participantIds.includes(memberId)) {
      setLineItems((current) =>
        current.filter((item) => item.memberId !== memberId),
      );
      if (lineItemsDrawerMemberId === memberId) {
        setLineItemsDrawerMemberId(null);
      }
    }
    setParticipantIds((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    );
  };

  const toggleAllParticipants = () => {
    if (participantIds.length === members.length) {
      setLineItems([]);
    }
    setParticipantIds((current) =>
      current.length === members.length
        ? []
        : members.map((member) => member.id),
    );
  };

  const setMethod = (nextMethod: SplitMethod) => {
    setSplitMethod(nextMethod);
    if (nextMethod === 'equal') {
      setParticipantValues({});
      setSharedExpenseItems([]);
    }
    if (nextMethod !== 'exact') {
      setLineItems([]);
      setLineItemsDrawerMemberId(null);
    }
    setShowSplitDrawer(false);
  };

  const addSharedExpenseItem = () => {
    setSharedExpenseItems((current) => [...current, createSharedExpenseItem()]);
  };

  const addLineItem = (memberId: string) => {
    setLineItems((current) => [...current, createExpenseLineItem(memberId)]);
  };

  const updateLineItem = (
    itemId: string,
    patch: Partial<Pick<ExpenseLineItem, 'description' | 'amount'>>,
  ) => {
    setLineItems((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, ...patch } : item,
      ),
    );
  };

  const removeLineItem = (itemId: string) => {
    setLineItems((current) => current.filter((item) => item.id !== itemId));
  };

  const updateSharedExpenseItem = (
    itemId: string,
    patch: Partial<Pick<SharedExpenseItem, 'name' | 'amount'>>,
  ) => {
    setSharedExpenseItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    );
  };

  const removeSharedExpenseItem = (itemId: string) => {
    setSharedExpenseItems((current) =>
      current.filter((item) => item.id !== itemId),
    );
  };

  return {
    addLineItem,
    addSharedExpenseItem,
    baseAmount,
    drawerLineItems,
    equalShare,
    lineItemTotalsByMember,
    lineItems,
    lineItemsAreValid,
    lineItemsDrawerMember,
    lineItemsDrawerMemberId,
    normalizedLineItems,
    normalizedSharedAmount,
    normalizedSharedExpenseItems,
    participantComputedAmounts,
    participantIds,
    participantValues,
    removeLineItem,
    removeSharedExpenseItem,
    selectedCount,
    setLineItems,
    setLineItemsDrawerMemberId,
    setMethod,
    setParticipantIds,
    setParticipantValues,
    setSharedExpenseItems,
    setShowSplitDrawer,
    setSplitMethod,
    sharedAmountExceedsTotal,
    sharedExpenseItems,
    sharedExpenseItemsAreValid,
    sharedShare,
    showSplitDrawer,
    splitIsValid,
    splitMethod,
    splitSum,
    toggleAllParticipants,
    toggleParticipant,
    updateLineItem,
    updateSharedExpenseItem,
  };
}
