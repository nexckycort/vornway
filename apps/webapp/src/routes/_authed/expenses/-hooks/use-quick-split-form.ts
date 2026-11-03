import { useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '#/contexts/auth/use-auth';
import { useUsernameRequirement } from '#/contexts/username-requirement/use-username-requirement';
import { useWhenChanged } from '#/hooks/use-when-changed';
import { m } from '#/paraglide/messages.js';
import { useUserSearchQuery } from '#/routes/_authed/groups/-hooks/use-user-search-query';
import {
  currencyOptions,
  formatAmountInput,
  formatEditableNumber,
  parseAmountInput,
  type QuickSplitSearch,
  readCurrencyCode,
  type SelectedFriend,
  type SplitMethod,
} from '../-components/quick-split-model';
import { getQuickSplitMessages } from '../-messages';
import { useCreateQuickSplitExpenseMutation } from './use-create-quick-split-expense';
import { useExpenseEntryData } from './use-expense-entry-data';
import { useQuickSplitExpenseQuery } from './use-quick-split-expense-query';

export type QuickSplitForm = ReturnType<typeof useQuickSplitForm>;

export function useQuickSplitForm(search: QuickSplitSearch) {
  const { ensureUsername } = useUsernameRequirement();
  const { friendIds, from, quickSplitId, expenseId } = search;
  const navigate = useNavigate();
  const t = getQuickSplitMessages();
  const { user } = useAuth();
  const { recentFriends } = useExpenseEntryData();
  const createExpenseMutation = useCreateQuickSplitExpenseMutation();
  const expenseQuery = useQuickSplitExpenseQuery(quickSplitId, expenseId);
  const isEditMode = Boolean(quickSplitId && expenseId);
  const currentUserId = user?.id ?? '';
  const currentUserName = user?.name?.trim() || m['common.user.you']();
  const currentUserParticipantId =
    expenseQuery.data?.participants.find(
      (participant) => participant.userId === currentUserId,
    )?.id ?? currentUserId;
  const [currency, setCurrency] =
    useState<(typeof currencyOptions)[number]['code']>('COP');
  const [showCurrencyDrawer, setShowCurrencyDrawer] = useState(false);
  const [showSplitDrawer, setShowSplitDrawer] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [sharedExpenseItems, setSharedExpenseItems] = useState<
    { name: string; amount: string }[]
  >([]);
  const [friendInput, setFriendInput] = useState('');
  const [debouncedFriendInput, setDebouncedFriendInput] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<SelectedFriend[]>([]);
  const [paidByChoice, setPaidByParticipantId] = useState('');
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');
  const [participantValues, setParticipantValues] = useState<
    Record<string, string>
  >({});

  const amount = parseAmountInput(amountInput);
  const selectedCurrency =
    currencyOptions.find((option) => option.code === currency) ??
    currencyOptions[0];

  const searchQuery = useUserSearchQuery(debouncedFriendInput);
  const searchResults = searchQuery.data?.data ?? [];

  const people = useMemo(
    () => [
      {
        id: currentUserParticipantId,
        name: currentUserName,
        email: user?.email ?? '',
        isCurrentUser: true,
      },
      ...selectedFriends.map((friend) => ({
        ...friend,
        isCurrentUser: false,
      })),
    ],
    [currentUserName, currentUserParticipantId, selectedFriends, user?.email],
  );
  const paidByParticipantId = paidByChoice || currentUserParticipantId;
  const participantIds = useMemo(
    () => people.map((person) => person.id),
    [people],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedFriendInput(friendInput.trim());
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [friendInput]);

  useWhenChanged([currentUserId, expenseQuery.data, isEditMode], () => {
    if (!isEditMode || !expenseQuery.data) {
      return;
    }

    setDescription(expenseQuery.data.description);
    setAmountInput(formatAmountInput(String(expenseQuery.data.amount)));
    setCurrency(readCurrencyCode(expenseQuery.data.currency) ?? 'COP');
    setCategory(expenseQuery.data.metadata?.category ?? '');
    setSharedExpenseItems(
      (expenseQuery.data.metadata?.items ?? []).map((item) => ({
        name: item.name,
        amount: formatAmountInput(String(item.amount)),
      })),
    );
    setPaidByParticipantId(expenseQuery.data.paidBy.id);
    setSelectedFriends(
      expenseQuery.data.participants
        .filter((participant) => participant.userId !== currentUserId)
        .map((participant) => ({
          id: participant.id,
          name: participant.name,
          email: '',
          userId: participant.userId ?? undefined,
        })),
    );
    setSplitMethod(
      expenseQuery.data.splitMethod === 'unknown'
        ? 'equal'
        : expenseQuery.data.splitMethod,
    );
    setParticipantValues(
      Object.fromEntries(
        expenseQuery.data.participants.map((participant) => [
          participant.id,
          expenseQuery.data.splitMethod === 'percentage'
            ? formatEditableNumber(
                (participant.share / expenseQuery.data.amount) * 100,
              )
            : expenseQuery.data.splitMethod === 'exact'
              ? formatEditableNumber(participant.share)
              : '',
        ]),
      ),
    );
  });

  useWhenChanged([friendIds, recentFriends], () => {
    if (friendIds.length === 0 || recentFriends.length === 0) {
      return;
    }

    setSelectedFriends((current) => {
      const seededFriends = friendIds.flatMap((friendId) => {
        const friend = recentFriends.find(
          (candidate) => candidate.id === friendId,
        );
        if (!friend) return [];

        return [
          {
            id: friend.id,
            name: friend.name,
            email: '',
            userId: friend.userId ?? undefined,
          },
        ];
      });

      if (seededFriends.length === 0) {
        return current;
      }

      const next = [...current];
      for (const seededFriend of seededFriends) {
        if (!next.some((friend) => friend.id === seededFriend.id)) {
          next.push(seededFriend);
        }
      }
      return next;
    });
  });

  useWhenChanged([amount, participantIds, splitMethod], () => {
    if (splitMethod === 'equal') {
      return;
    }

    setParticipantValues((current) => {
      const next: Record<string, string> = {};
      const selectedCount = participantIds.length;
      const defaultValue =
        splitMethod === 'percentage'
          ? selectedCount > 0
            ? 100 / selectedCount
            : 0
          : selectedCount > 0
            ? amount / selectedCount
            : 0;

      for (const participantUserId of participantIds) {
        next[participantUserId] =
          current[participantUserId] ??
          (defaultValue > 0 ? formatEditableNumber(defaultValue) : '');
      }

      return next;
    });
  });

  useEffect(() => {
    if (!searchQuery.isError || searchQuery.errorUpdatedAt === 0) {
      return;
    }

    toast.error(t.loadUsersError);
  }, [searchQuery.errorUpdatedAt, searchQuery.isError, t.loadUsersError]);

  const availableSearchResults = searchResults.filter((candidate) => {
    if (candidate.isCurrentUser) return false;
    return !selectedFriends.some((friend) => friend.id === candidate.id);
  });

  const selectedCount = participantIds.length;
  const equalShare = selectedCount > 0 ? amount / selectedCount : 0;
  const participantComputedAmounts = useMemo(() => {
    const result: Record<string, number> = {};

    for (const participantUserId of participantIds) {
      const rawValue = Number(participantValues[participantUserId] ?? '0');

      if (splitMethod === 'percentage') {
        result[participantUserId] = amount * (rawValue / 100);
        continue;
      }

      if (splitMethod === 'exact') {
        result[participantUserId] = rawValue;
        continue;
      }

      result[participantUserId] = equalShare;
    }

    return result;
  }, [amount, equalShare, participantIds, participantValues, splitMethod]);

  const splitSum = useMemo(() => {
    return participantIds.reduce((sum, participantUserId) => {
      const value = Number(participantValues[participantUserId] ?? '0');
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
  }, [participantIds, participantValues]);

  const splitIsValid =
    selectedCount > 1 &&
    (splitMethod === 'equal'
      ? true
      : splitMethod === 'percentage'
        ? Math.abs(splitSum - 100) < 0.01 &&
          participantIds.every(
            (participantUserId) =>
              Number(participantValues[participantUserId] ?? 0) >= 0,
          )
        : Math.abs(splitSum - amount) < 0.01 &&
          participantIds.every(
            (participantUserId) =>
              Number(participantValues[participantUserId] ?? 0) >= 0,
          ));

  const canSubmit =
    description.trim().length > 0 &&
    amount > 0 &&
    selectedFriends.length > 0 &&
    selectedCount > 1 &&
    paidByParticipantId.length > 0 &&
    splitIsValid &&
    !createExpenseMutation.isPending;

  const isLoading = isEditMode && expenseQuery.isLoading;
  const isLoadingError = isEditMode && expenseQuery.isError;

  const handleAddFriend = (friend: SelectedFriend) => {
    setSelectedFriends((current) =>
      current.some((currentFriend) => currentFriend.id === friend.id)
        ? current
        : [...current, friend],
    );
    setFriendInput('');
    setDebouncedFriendInput('');
  };

  const handleRemoveFriend = (friendId: string) => {
    setSelectedFriends((current) =>
      current.filter((friend) => friend.id !== friendId),
    );
    setParticipantValues((current) => {
      const next = { ...current };
      delete next[friendId];
      return next;
    });

    if (paidByParticipantId === friendId) {
      setPaidByParticipantId(currentUserParticipantId);
    }
  };

  const setMethod = (nextMethod: SplitMethod) => {
    setSplitMethod(nextMethod);
    if (nextMethod === 'equal') {
      setParticipantValues({});
    }
    setShowSplitDrawer(false);
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error(t.validationDescription);
      return;
    }

    if (amount <= 0) {
      toast.error(t.validationAmount);
      return;
    }

    if (selectedFriends.length === 0) {
      toast.error(t.validationFriends);
      return;
    }

    if (selectedCount < 2) {
      toast.error(t.validationSplit);
      return;
    }

    if (!splitIsValid) {
      toast.error(
        splitMethod === 'percentage'
          ? t.invalidPercentage
          : t.invalidAmountTotal,
      );
      return;
    }

    if (!isEditMode && !(await ensureUsername())) return;

    try {
      await createExpenseMutation.mutateAsync({
        currentUserId,
        quickSplitId,
        expenseId,
        name:
          (isEditMode ? expenseQuery.data?.quickSplitName : undefined) ??
          description.trim(),
        description: description.trim(),
        participants: selectedFriends.map((friend) => ({
          clientId: friend.id,
          name: friend.name,
          ...(friend.userId ? { userId: friend.userId } : {}),
        })),
        amount,
        currency,
        paidByParticipantId,
        splitMethod,
        ...(splitMethod === 'percentage'
          ? {
              percentageShares: Object.fromEntries(
                participantIds.map((participantUserId) => [
                  participantUserId,
                  Number(participantValues[participantUserId] ?? '0'),
                ]),
              ),
            }
          : {}),
        ...(splitMethod === 'exact'
          ? {
              exactShares: Object.fromEntries(
                participantIds.map((participantUserId) => [
                  participantUserId,
                  Number(participantValues[participantUserId] ?? '0'),
                ]),
              ),
            }
          : {}),
        metadata: {
          ...(category.trim() ? { category: category.trim() } : {}),
          ...(splitMethod !== 'equal' && sharedExpenseItems.length > 0
            ? {
                items: sharedExpenseItems
                  .map((item) => ({
                    name: item.name.trim(),
                    amount: parseAmountInput(item.amount),
                  }))
                  .filter((item) => item.name && item.amount > 0),
              }
            : {}),
        },
      });

      toast.success(isEditMode ? t.updateSuccess : t.createSuccess);
      if (isEditMode && quickSplitId && expenseId) {
        await navigate({
          to: '/expenses/friends/$quickSplitId/$expenseId',
          params: { quickSplitId, expenseId },
          search: { from },
        });
      } else {
        await navigate({ to: from === 'friends' ? '/expenses/friends' : '/' });
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : isEditMode
            ? t.updateError
            : t.createError,
      );
    }
  };

  const handleBack = () => {
    void navigate(
      isEditMode && quickSplitId && expenseId
        ? {
            to: '/expenses/friends/$quickSplitId/$expenseId',
            params: { quickSplitId, expenseId },
            search: { from },
          }
        : { to: '/expenses/new', search: { from } },
    );
  };

  return {
    t,
    isEditMode,
    expenseQuery,
    handleBack,
    isLoading,
    isLoadingError,
    showCurrencyDrawer,
    setShowCurrencyDrawer,
    showSplitDrawer,
    setShowSplitDrawer,
    selectedCurrency,
    amountInput,
    setAmountInput,
    description,
    setDescription,
    friendInput,
    setFriendInput,
    category,
    setCategory,
    debouncedFriendInput,
    searchQuery,
    availableSearchResults,
    handleAddFriend,
    selectedFriends,
    handleRemoveFriend,
    people,
    paidByParticipantId,
    setPaidByParticipantId,
    splitMethod,
    setMethod,
    sharedExpenseItems,
    setSharedExpenseItems,
    currency,
    setCurrency,
    equalShare,
    splitSum,
    participantComputedAmounts,
    participantValues,
    setParticipantValues,
    splitIsValid,
    selectedCount,
    amount,
    handleSubmit,
    canSubmit,
    createExpenseMutation,
  };
}
