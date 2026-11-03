import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api, failWithMessage } from '#/api/client';
import { useUsernameRequirement } from '#/contexts/username-requirement/use-username-requirement';
import { useGroupFlowNavigation } from '#/lib/group-flow-navigation';
import { enqueueExpenseOffline } from '#/lib/offline-expense-query-collection';
import { m } from '#/paraglide/messages.js';
import { getGroupDetailMessages } from '#/routes/_authed/groups/$id/-messages';
import type { ExpenseAdvancedDetails } from '#/routes/_authed/groups/$id/-types/group-detail.types';
import {
  useCreateCategoryMutation,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
} from '#/routes/_authed/groups/-hooks/use-group-actions';
import {
  advancedDetailsTypeOptions,
  currencyMeta,
} from '../-lib/expense-form.types';
import {
  normalizeAdvancedDetails,
  parseTagsInput,
  resolveAdvancedDetailsMap,
} from '../-lib/expense-form.utils';
import {
  type ExpenseGroup,
  type ExpenseRecord,
  getInitialExpenseValues,
} from '../-lib/initial-values';
import { getExpenseLineItemsMessages } from '../-line-items-messages';
import { useExpenseAttachment } from './use-expense-attachment';
import { useExpenseCategoryCreation } from './use-expense-category-creation';
import { useExpensePayers } from './use-expense-payers';
import { useExpenseSplit } from './use-expense-split';

type UseExpenseFormOptions = {
  id: string;
  group: ExpenseGroup;
  expense: ExpenseRecord | undefined;
  expenseId: string | undefined;
};

export type ExpenseForm = ReturnType<typeof useExpenseForm>;

export function useExpenseForm({
  id,
  group,
  expense,
  expenseId,
}: UseExpenseFormOptions) {
  const { ensureUsername } = useUsernameRequirement();
  const isEditMode = Boolean(expenseId);
  const { navigateToGroupRoot } = useGroupFlowNavigation(id);
  const lineItemsMessages = getExpenseLineItemsMessages();
  const groupMessages = getGroupDetailMessages();
  const createCategoryMutation = useCreateCategoryMutation(id);
  const createExpenseMutation = useCreateExpenseMutation(id);
  const updateExpenseMutation = useUpdateExpenseMutation(id, expenseId ?? '');
  const [initial] = useState(() =>
    getInitialExpenseValues({ group, expense, isEditMode }),
  );
  const members = group.members;
  const categories = group.categories;
  const isPersonalSpace = group.type === 'personal';

  const [description, setDescription] = useState(initial.description);
  const [amount, setAmount] = useState(initial.amount);
  const [currency, setCurrency] = useState(initial.currency);
  const financesSummaryQuery = useQuery({
    queryKey: ['finances-summary', 'personal-expense-accounts', currency],
    enabled: isPersonalSpace,
    queryFn: () =>
      failWithMessage(
        api.finances.summary.request({ query: { currency } }),
        m['finances.loadError'](),
      ),
  });
  const [categoryId, setCategoryId] = useState<string | null>(
    initial.categoryId,
  );
  const [selectedAccountId, setSelectedAccountId] = useState(
    initial.selectedAccountId,
  );
  const [tagsInput, setTagsInput] = useState(initial.tagsInput);
  const [showCurrencyDrawer, setShowCurrencyDrawer] = useState(false);
  const [showAdvancedDetailsDrawer, setShowAdvancedDetailsDrawer] =
    useState(false);
  const [advancedDetails, setAdvancedDetails] =
    useState<ExpenseAdvancedDetails>(initial.advancedDetails);
  const [error, setError] = useState<string | null>(null);
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false);
  const [isAmountAnimating, setIsAmountAnimating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const amountInputRef = useRef<HTMLInputElement | null>(null);
  const descriptionInputRef = useRef<HTMLInputElement | null>(null);
  const submitLockRef = useRef(false);
  const didMountAmountRef = useRef(false);

  const parsedAmount = Number(amount);
  const normalizedAmount = Number.isFinite(parsedAmount) ? parsedAmount : 0;

  const split = useExpenseSplit({ amount, normalizedAmount, members, initial });
  const payers = useExpensePayers({
    expense,
    isEditMode,
    normalizedAmount,
    initialPaidByIds: initial.paidByIds,
  });
  const categoryCreation = useExpenseCategoryCreation({
    createCategoryMutation,
    setCategoryId,
    setError,
    groupMessages,
  });
  const attachment = useExpenseAttachment({ expense, groupMessages });
  const {
    lineItems,
    lineItemsAreValid,
    normalizedLineItems,
    normalizedSharedAmount,
    normalizedSharedExpenseItems,
    participantComputedAmounts,
    participantIds,
    participantValues,
    selectedCount,
    sharedExpenseItems,
    sharedExpenseItemsAreValid,
    splitIsValid,
    splitMethod,
  } = split;
  const {
    paidByIds,
    payerRoundingAdjustment,
    payerSplitIsValid,
    payerValues,
    payerValuesAreEqual,
  } = payers;
  const { attachmentDataUrl, attachmentFileNameRef } = attachment;

  const currentCurrency = currencyMeta[currency] ?? currencyMeta.COP;
  const paymentAccounts = useMemo(
    () =>
      financesSummaryQuery.data?.accounts.filter(
        (account) =>
          account.status !== 'CLOSED' && account.currency === currency,
      ) ?? [],
    [currency, financesSummaryQuery.data?.accounts],
  );
  const selectedAccount = useMemo(
    () =>
      paymentAccounts.find((account) => account.id === selectedAccountId) ??
      null,
    [paymentAccounts, selectedAccountId],
  );
  const selectedCategory = categories.find((item) => item.id === categoryId);
  const advancedDetailsEnabled = group.advancedExpenseDetailsEnabled ?? false;
  const normalizedAdvancedDetails = normalizeAdvancedDetails(advancedDetails);
  const selectedAdvancedDetailsType =
    advancedDetailsTypeOptions.find(
      (option) => option.value === advancedDetails.type,
    ) ?? advancedDetailsTypeOptions[advancedDetailsTypeOptions.length - 1];

  if (
    selectedAccountId &&
    !paymentAccounts.some((account) => account.id === selectedAccountId)
  ) {
    setSelectedAccountId('');
  }

  useEffect(() => {
    const node = amountInputRef.current;
    if (!node) return;

    const frame = window.requestAnimationFrame(() => {
      node.focus();
      node.select();
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    void amount;
    void currency;

    if (!didMountAmountRef.current) {
      didMountAmountRef.current = true;
      return;
    }

    setIsAmountAnimating(true);
    const frame = window.requestAnimationFrame(() => {
      setIsAmountAnimating(false);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [amount, currency]);

  const canSubmit =
    description.trim().length > 0 &&
    normalizedAmount > 0 &&
    paidByIds.length > 0 &&
    selectedCount > 0 &&
    lineItemsAreValid &&
    sharedExpenseItemsAreValid &&
    splitIsValid &&
    payerSplitIsValid;
  const showDescriptionError =
    hasTriedSubmit && description.trim().length === 0;
  const showParticipantsError = hasTriedSubmit && selectedCount === 0;
  const showSharedExpenseItemsError =
    hasTriedSubmit &&
    sharedExpenseItems.length > 0 &&
    !sharedExpenseItemsAreValid;
  const showLineItemsError =
    hasTriedSubmit && lineItems.length > 0 && !lineItemsAreValid;

  const isPending = isEditMode
    ? updateExpenseMutation.isPending
    : createExpenseMutation.isPending;
  const isSubmitLocked = isPending || isSubmitting;

  const setCurrencyAndClose = (nextCurrency: string) => {
    setCurrency(nextCurrency);
    setShowCurrencyDrawer(false);
  };

  const handleSubmit = async () => {
    if (submitLockRef.current) return;

    setHasTriedSubmit(true);

    if (!canSubmit) {
      if (description.trim().length === 0) {
        descriptionInputRef.current?.focus();
      }
      return;
    }

    if (!isEditMode && !(await ensureUsername())) return;

    submitLockRef.current = true;
    setIsSubmitting(true);
    setError(null);

    try {
      const payerAmounts = paidByIds.map((memberId) => ({
        memberId,
        amount: Number(payerValues[memberId] ?? '0'),
      }));
      if (payerValuesAreEqual && Math.abs(payerRoundingAdjustment) <= 0.01) {
        const lastPayer = payerAmounts[payerAmounts.length - 1];
        if (lastPayer) lastPayer.amount += payerRoundingAdjustment;
      }

      const exactShares =
        selectedCount === 0 || splitMethod === 'equal'
          ? undefined
          : Object.fromEntries(
              participantIds.map((memberId) => [
                memberId,
                normalizedSharedAmount > 0
                  ? (participantComputedAmounts[memberId] ?? 0)
                  : Number(participantValues[memberId] ?? '0'),
              ]),
            );
      const payloadSplitMethod =
        selectedCount > 0 &&
        normalizedSharedAmount > 0 &&
        splitMethod !== 'equal'
          ? 'exact'
          : splitMethod;
      const sharedSplit =
        sharedExpenseItems.length > 0 &&
        normalizedSharedAmount > 0 &&
        splitMethod !== 'equal'
          ? {
              amount: normalizedSharedAmount,
              splitMethod,
              splitValues: Object.fromEntries(
                participantIds.map((memberId) => [
                  memberId,
                  Number(participantValues[memberId] ?? '0'),
                ]),
              ),
              items: normalizedSharedExpenseItems
                .filter(
                  (item) =>
                    item.name.trim().length > 0 && item.normalizedAmount > 0,
                )
                .map((item) => ({
                  name: item.name.trim(),
                  amount: item.normalizedAmount,
                })),
            }
          : undefined;

      const advancedDetailsPayload =
        advancedDetailsEnabled && normalizedAdvancedDetails
          ? await resolveAdvancedDetailsMap(normalizedAdvancedDetails)
          : null;

      const payload = {
        payers: paidByIds.length > 1 ? payerAmounts : undefined,
        description: description.trim(),
        amount: normalizedAmount,
        currency,
        ...(isPersonalSpace ? { accountId: selectedAccountId || null } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(isPersonalSpace ? { tags: parseTagsInput(tagsInput) } : {}),
        paidByIds,
        participantIds: isPersonalSpace ? [] : participantIds,
        splitMethod: payloadSplitMethod,
        exactShares,
        lineItems:
          splitMethod === 'exact'
            ? normalizedLineItems.map((item) => ({
                memberId: item.memberId,
                description: item.description.trim(),
                amount: item.normalizedAmount,
              }))
            : [],
        sharedSplit,
        ...(advancedDetailsEnabled && attachmentDataUrl
          ? {
              attachmentImage: {
                dataUrl: attachmentDataUrl,
                ...(attachmentFileNameRef.current
                  ? { fileName: attachmentFileNameRef.current }
                  : {}),
              },
            }
          : {}),
        ...(advancedDetailsEnabled && normalizedAdvancedDetails
          ? {
              advancedDetails:
                advancedDetailsPayload ?? normalizedAdvancedDetails,
            }
          : {}),
      };

      if (isEditMode && expenseId) {
        await updateExpenseMutation.mutateAsync(payload);
      } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
        enqueueExpenseOffline(id, payload);
      } else {
        await createExpenseMutation.mutateAsync(payload);
      }

      void navigateToGroupRoot(true);
    } catch (submitError) {
      submitLockRef.current = false;
      setIsSubmitting(false);
      setError(
        submitError instanceof Error
          ? submitError.message
          : isEditMode
            ? groupMessages.expense.updateExpenseFailed
            : groupMessages.expense.createExpenseFailed,
      );
    }
  };

  return {
    ...split,
    ...payers,
    ...categoryCreation,
    ...attachment,
    createCategoryMutation,
    advancedDetails,
    advancedDetailsEnabled,
    amount,
    amountInputRef,
    canSubmit,
    categories,
    categoryId,
    currency,
    currentCurrency,
    description,
    descriptionInputRef,
    didMountAmountRef,
    error,
    financesSummaryQuery,
    groupMessages,
    handleSubmit,
    hasTriedSubmit,
    isAmountAnimating,
    isEditMode,
    isPending,
    isPersonalSpace,
    isSubmitLocked,
    isSubmitting,
    lineItemsMessages,
    members,
    navigateToGroupRoot,
    normalizedAdvancedDetails,
    normalizedAmount,
    parsedAmount,
    paymentAccounts,
    selectedAccount,
    selectedAccountId,
    selectedAdvancedDetailsType,
    selectedCategory,
    setAdvancedDetails,
    setAmount,
    setCategoryId,
    setCurrency,
    setCurrencyAndClose,
    setDescription,
    setError,
    setHasTriedSubmit,
    setIsAmountAnimating,
    setIsSubmitting,
    setSelectedAccountId,
    setShowAdvancedDetailsDrawer,
    setShowCurrencyDrawer,
    setTagsInput,
    showAdvancedDetailsDrawer,
    showCurrencyDrawer,
    showDescriptionError,
    showLineItemsError,
    showParticipantsError,
    showSharedExpenseItemsError,
    submitLockRef,
    tagsInput,
  };
}
