import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Check, ChevronDown, PencilLine, Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { MobilePageLayout } from '#/components/mobile-page-layout';
import { Button } from '#/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '#/components/ui/drawer';
import { useAuth } from '#/contexts/auth/use-auth';
import { formatCurrency } from '#/lib/i18n';
import { cn } from '#/lib/utils';
import { useUserSearchQuery } from '#/routes/_authed/groups/-hooks/use-user-search-query';
import { useCreateQuickSplitExpenseMutation } from './-hooks/use-create-quick-split-expense';
import { useExpenseEntryData } from './-hooks/use-expense-entry-data';
import { useQuickSplitExpenseQuery } from './-hooks/use-quick-split-expense-query';
import { getQuickSplitMessages } from './-messages';

export const Route = createFileRoute('/_authed/expenses/quick-split')({
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    friendIds: string[];
    quickSplitId?: string;
    expenseId?: string;
  } => ({
    friendIds: Array.isArray(search.friendIds)
      ? search.friendIds.filter(
          (value): value is string => typeof value === 'string',
        )
      : [],
    quickSplitId:
      typeof search.quickSplitId === 'string' ? search.quickSplitId : undefined,
    expenseId:
      typeof search.expenseId === 'string' ? search.expenseId : undefined,
  }),
  component: RouteComponent,
});

type SelectedFriend = {
  id: string;
  name: string;
  email: string;
  userId?: string;
};

type SplitMethod = 'equal' | 'percentage' | 'exact';

const splitMethods: Array<{ value: SplitMethod; label: string }> = [
  { value: 'equal', label: 'Partes iguales' },
  { value: 'percentage', label: 'Porcentaje' },
  { value: 'exact', label: 'Partes desiguales' },
];

const currencyOptions = [
  { code: 'COP', name: 'Peso colombiano', flag: '🇨🇴' },
  { code: 'USD', name: 'Dólar estadounidense', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
] as const;

function readCurrencyCode(
  value: string,
): (typeof currencyOptions)[number]['code'] | null {
  if (value === 'COP' || value === 'USD' || value === 'EUR') {
    return value;
  }

  return null;
}

function toInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

function formatAmountInput(value: string): string {
  const normalized = value.replace(/[^\d]/g, '');
  if (!normalized) return '';

  return new Intl.NumberFormat('es-CO').format(Number(normalized));
}

function parseAmountInput(value: string): number {
  const normalized = value.replace(/[^\d]/g, '');
  return normalized ? Number(normalized) : 0;
}

function formatEditableNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function areIdsEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function RouteComponent() {
  const { friendIds, quickSplitId, expenseId } = Route.useSearch();
  const navigate = useNavigate();
  const t = getQuickSplitMessages();
  const { user } = useAuth();
  const { recentFriends } = useExpenseEntryData();
  const createExpenseMutation = useCreateQuickSplitExpenseMutation();
  const expenseQuery = useQuickSplitExpenseQuery(quickSplitId, expenseId);
  const isEditMode = Boolean(quickSplitId && expenseId);
  const currentUserId = user?.id ?? '';
  const currentUserName = user?.name?.trim() || 'Tú';
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
  const [friendInput, setFriendInput] = useState('');
  const [debouncedFriendInput, setDebouncedFriendInput] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<SelectedFriend[]>([]);
  const [paidByParticipantId, setPaidByParticipantId] = useState('');
  const [participantIds, setParticipantIds] = useState<string[]>([]);
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

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedFriendInput(friendInput.trim());
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [friendInput]);

  useEffect(() => {
    if (!paidByParticipantId && currentUserParticipantId) {
      setPaidByParticipantId(currentUserParticipantId);
    }
  }, [currentUserParticipantId, paidByParticipantId]);

  useEffect(() => {
    if (!isEditMode || !expenseQuery.data) {
      return;
    }

    setDescription(expenseQuery.data.description);
    setAmountInput(formatAmountInput(String(expenseQuery.data.amount)));
    setCurrency(readCurrencyCode(expenseQuery.data.currency) ?? 'COP');
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
    setParticipantIds(
      expenseQuery.data.participants.map((participant) => participant.id),
    );
    setSplitMethod(expenseQuery.data.splitMethod);
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
  }, [currentUserId, expenseQuery.data, isEditMode]);

  useEffect(() => {
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
            userId: undefined,
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
  }, [friendIds, recentFriends]);

  useEffect(() => {
    const allIds = people.map((person) => person.id);

    setParticipantIds((current) => {
      const filtered = current.filter((userId) => allIds.includes(userId));
      const next =
        filtered.length === 0
          ? allIds
          : Array.from(new Set([...filtered, ...allIds]));

      return areIdsEqual(current, next) ? current : next;
    });
  }, [people]);

  useEffect(() => {
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
  }, [amount, participantIds, splitMethod]);

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
              Number(participantValues[participantUserId] ?? 0) > 0,
          )
        : Math.abs(splitSum - amount) < 0.01 &&
          participantIds.every(
            (participantUserId) =>
              Number(participantValues[participantUserId] ?? 0) > 0,
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
    setParticipantIds((current) =>
      current.filter((participantUserId) => participantUserId !== friendId),
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

  const toggleParticipant = (participantId: string) => {
    setParticipantIds((current) =>
      current.includes(participantId)
        ? current.length <= 2
          ? current
          : current.filter((id) => id !== participantId)
        : [...current, participantId],
    );
  };

  const toggleAllParticipants = () => {
    setParticipantIds((current) =>
      current.length === people.length
        ? [currentUserParticipantId]
        : people.map((person) => person.id),
    );
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
          ? 'La suma de porcentajes debe ser 100.'
          : 'La suma de montos debe coincidir con el total.',
      );
      return;
    }

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
        expenseParticipantIds: participantIds,
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
      });

      toast.success(isEditMode ? t.updateSuccess : t.createSuccess);
      await navigate(
        isEditMode
          ? {
              to: '/expenses/friends/$quickSplitId/$expenseId',
              params: {
                quickSplitId: quickSplitId!,
                expenseId: expenseId!,
              },
            }
          : { to: '/' },
      );
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
          }
        : { to: '/expenses/new' },
    );
  };

  if (isLoading) {
    return (
      <MobilePageLayout
        title={isEditMode ? 'Editar gasto' : t.title}
        onBack={handleBack}
      >
        <QuickSplitExpenseSkeleton />
      </MobilePageLayout>
    );
  }

  if (isLoadingError) {
    return (
      <MobilePageLayout
        title={isEditMode ? 'Editar gasto' : t.title}
        onBack={handleBack}
      >
        <div className="flex flex-1 flex-col justify-center bg-white px-2">
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {expenseQuery.error instanceof Error
              ? expenseQuery.error.message
              : t.updateError}
          </div>
          <button
            type="button"
            onClick={handleBack}
            className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            Volver
          </button>
        </div>
      </MobilePageLayout>
    );
  }

  return (
    <MobilePageLayout
      title={isEditMode ? 'Editar gasto' : t.title}
      onBack={handleBack}
    >
      <div className="px-2 pb-6">
        {!isEditMode ? (
          <p className="mb-3 text-center text-xs font-normal leading-4 text-[#4c4c4c]">
            {t.step}
          </p>
        ) : null}

        <div className="flex items-baseline justify-between gap-4">
          <button
            type="button"
            onClick={() => setShowCurrencyDrawer(true)}
            className="flex items-center gap-1 text-left"
          >
            <span className="text-4xl font-light text-gray-900">
              {selectedCurrency.code}
            </span>
            <ChevronDown className="size-5 text-gray-600" />
          </button>

          <label className="min-w-0 flex-1 text-right">
            <span className="sr-only">{t.amountLabel}</span>
            <input
              inputMode="numeric"
              value={amountInput}
              onChange={(event) =>
                setAmountInput(formatAmountInput(event.target.value))
              }
              placeholder="0"
              className="w-full bg-transparent text-right text-[36px] font-light leading-10 tracking-[-0.03em] text-[#1e1e1e] outline-none placeholder:text-[#cbd5e1]"
            />
          </label>
        </div>

        <div className="mt-1 flex items-center gap-1.5">
          <span className="text-base">{selectedCurrency.flag}</span>
          <span className="text-sm text-gray-500">{selectedCurrency.name}</span>
        </div>
      </div>

      <div className="space-y-5 px-2 pb-24">
        <section className="overflow-hidden rounded-[24px] border border-[#ebebeb] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <div className="px-4 py-4">
            <div className="flex h-11 items-center gap-2 rounded-[24px] border border-[#ebebeb] bg-[#fafafa] px-4">
              <PencilLine className="size-4 text-[#626262]" />
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t.descriptionPlaceholder}
                className="w-full bg-transparent text-base font-normal text-[#1e1e1e] outline-none placeholder:text-[#94a3b8]"
                maxLength={200}
              />
            </div>
          </div>

          {!isEditMode ? (
            <>
              <div className="h-px bg-[#f1f5f9]" />

              <div className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-[#fff8ed] text-[#ff7a00]">
                    <Search className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-normal leading-4 text-[#626262]">
                      {t.friendsLabel}
                    </p>
                    <input
                      value={friendInput}
                      onChange={(event) => setFriendInput(event.target.value)}
                      placeholder={t.friendsPlaceholder}
                      className="mt-0.5 h-5 w-full bg-transparent text-sm font-semibold text-[#1e1e1e] outline-none placeholder:font-normal placeholder:text-[#94a3b8]"
                    />
                  </div>
                  <Search className="size-4 text-[#b0b0b0]" />
                </div>
              </div>
            </>
          ) : null}
        </section>

        {!isEditMode ? (
          <div className="px-2">
            {debouncedFriendInput &&
            !searchQuery.isFetching &&
            availableSearchResults.length === 0 ? (
              <p className="mt-1 text-sm text-[#64748b]">
                {t.friendsSearchEmpty}
              </p>
            ) : null}

            {availableSearchResults.length > 0 ? (
              <section className="mt-2 flex flex-col gap-2">
                {availableSearchResults.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() =>
                      handleAddFriend({
                        id: candidate.id,
                        name: candidate.name,
                        email: candidate.email,
                        userId: candidate.id,
                      })
                    }
                    className="rounded-[24px] border border-[#e5e7eb] bg-white px-4 py-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                  >
                    <p className="truncate text-sm font-semibold text-[#111827]">
                      {candidate.name}
                    </p>
                    <p className="mt-1 truncate text-xs text-[#64748b]">
                      {candidate.email}
                    </p>
                  </button>
                ))}
              </section>
            ) : null}
          </div>
        ) : null}

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
              <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm text-gray-600">Pagado por</p>
                  <span className="text-xs text-gray-400">1 seleccionada</span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {people.map((person) => {
                    const isSelected = paidByParticipantId === person.id;

                    return (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() => setPaidByParticipantId(person.id)}
                        className="flex min-w-[72px] flex-col items-center"
                      >
                        <div
                          className={`flex size-11 items-center justify-center overflow-hidden rounded-full border-2 ${
                            isSelected
                              ? 'border-rose-500'
                              : 'border-transparent'
                          }`}
                        >
                          <ParticipantAvatar name={person.name} />
                        </div>
                        <span
                          className={`mt-1 inline-flex size-4 items-center justify-center rounded-full border text-[10px] font-semibold ${
                            isSelected
                              ? 'border-rose-500 bg-rose-500 text-white'
                              : 'border-gray-300 bg-white text-transparent'
                          }`}
                        >
                          {isSelected ? <Check className="size-2.5" /> : '•'}
                        </span>
                        <span className="mt-1.5 max-w-[60px] truncate text-xs text-gray-600">
                          {person.isCurrentUser ? 'Tú' : person.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm text-gray-600">Se divide con</p>
                  <button
                    type="button"
                    onClick={() => setShowSplitDrawer(true)}
                    className="inline-flex items-center gap-1 text-rose-500"
                  >
                    <span className="text-sm font-medium">
                      {
                        splitMethods.find((item) => item.value === splitMethod)
                          ?.label
                      }
                    </span>
                    <ChevronDown className="size-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={toggleAllParticipants}
                  className="mt-4 flex w-full items-center gap-3"
                >
                  <div className="flex size-6 items-center justify-center rounded bg-rose-500">
                    <Plus className="size-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    Todos
                  </span>
                  <span className="ml-auto text-sm text-gray-500">
                    {splitMethod === 'equal'
                      ? formatCurrency(currency, equalShare || 0)
                      : splitMethod === 'percentage'
                        ? `${splitSum.toFixed(2)}%`
                        : formatCurrency(currency, splitSum || 0)}
                  </span>
                </button>

                <div className="mt-4 space-y-3">
                  {people.map((person) => {
                    const selected = participantIds.includes(person.id);
                    const computedAmount =
                      participantComputedAmounts[person.id] ?? 0;

                    return (
                      <div
                        key={person.id}
                        className="flex items-center justify-between gap-4"
                      >
                        <button
                          type="button"
                          onClick={() => toggleParticipant(person.id)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <div
                            className={`flex size-6 items-center justify-center rounded-full ${
                              selected ? 'bg-rose-500' : 'bg-gray-300'
                            }`}
                          >
                            {selected ? (
                              <Check className="size-4 text-white" />
                            ) : (
                              <Plus className="size-4 text-white" />
                            )}
                          </div>
                          <ParticipantAvatar name={person.name} />
                          <div className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-gray-900">
                              {person.name}
                              {person.isCurrentUser ? (
                                <span className="text-gray-500"> (Tú)</span>
                              ) : null}
                            </span>
                            {splitMethod !== 'equal' && selected ? (
                              <span className="block text-xs text-gray-500">
                                {formatCurrency(currency, computedAmount)}
                              </span>
                            ) : null}
                          </div>
                        </button>

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
                                placeholder={
                                  splitMethod === 'percentage' ? '0' : '0.00'
                                }
                                className="h-10 w-20 rounded-full border border-gray-200 px-3 text-right text-sm text-gray-900 outline-none"
                              />
                              <span className="text-xs text-gray-400">
                                {splitMethod === 'percentage' ? '%' : currency}
                              </span>
                            </div>
                          )
                        ) : (
                          <span className="shrink-0 text-sm text-gray-400">
                            0
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          ) : null}

          {!splitIsValid && selectedCount > 1 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {splitMethod === 'percentage'
                ? 'La suma de porcentajes debe ser 100.'
                : 'La suma de montos individuales debe coincidir con el total.'}
            </div>
          ) : null}

          <p className="text-xs text-gray-500">
            {selectedCount <= 1
              ? 'Selecciona al menos dos personas para dividir este gasto'
              : splitMethod === 'percentage'
                ? `${selectedCount} participantes · ${splitSum.toFixed(2)}% sobre ${formatCurrency(currency, amount)}`
                : `${selectedCount} participantes · ${formatCurrency(currency, splitMethod === 'equal' ? amount : splitSum)} de ${formatCurrency(currency, amount)}`}
          </p>

          {expenseQuery.data?.quickSplitName && isEditMode ? (
            <p className="text-xs text-gray-500">
              Editando dentro de {expenseQuery.data.quickSplitName}
            </p>
          ) : null}
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-200 bg-white px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
        <Button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!canSubmit}
          className="h-14 w-full rounded-full bg-rose-500 text-base font-medium text-white hover:bg-rose-500/90"
        >
          {createExpenseMutation.isPending
            ? isEditMode
              ? t.savePending
              : t.submitPending
            : isEditMode
              ? t.save
              : t.submit}
        </Button>
      </div>

      <Drawer open={showCurrencyDrawer} onOpenChange={setShowCurrencyDrawer}>
        <DrawerContent className="mx-auto w-full max-w-[412px] rounded-t-[32px] px-4 pb-6">
          <DrawerHeader className="px-1 pt-2 text-left">
            <DrawerTitle>{t.currencyPickerTitle}</DrawerTitle>
            <DrawerDescription>{t.currencyPickerDescription}</DrawerDescription>
          </DrawerHeader>

          <div className="mt-4 flex flex-col gap-2">
            {currencyOptions.map((option) => (
              <button
                key={option.code}
                type="button"
                onClick={() => {
                  setCurrency(option.code);
                  setShowCurrencyDrawer(false);
                }}
                className={cn(
                  'flex items-center justify-between rounded-[24px] border px-4 py-4 text-left',
                  option.code === currency
                    ? 'border-primary bg-[#fff5f6]'
                    : 'border-[#e5e7eb] bg-white',
                )}
              >
                <div>
                  <p className="text-sm font-semibold text-[#111827]">
                    {option.flag} {option.code}
                  </p>
                  <p className="mt-1 text-xs text-[#64748b]">{option.name}</p>
                </div>
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={showSplitDrawer} onOpenChange={setShowSplitDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Método de división</DrawerTitle>
            <DrawerDescription>
              Elige cómo se repartirá este gasto.
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-2 px-5 pb-5">
            {splitMethods.map((method) => {
              const active = splitMethod === method.value;
              return (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setMethod(method.value)}
                  className={`flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left transition ${
                    active ? 'bg-rose-50' : 'bg-white'
                  }`}
                >
                  <div>
                    <p className="text-base font-semibold text-[#132238]">
                      {method.label}
                    </p>
                    <p className="text-sm text-[#64748b]">
                      {method.value === 'equal'
                        ? 'Todos pagan lo mismo de este gasto.'
                        : method.value === 'percentage'
                          ? 'Cada persona paga un porcentaje del total.'
                          : 'Cada persona paga un monto distinto.'}
                    </p>
                  </div>
                  {active ? <Check className="size-5 text-rose-500" /> : null}
                </button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </MobilePageLayout>
  );
}

function ParticipantAvatar({ name }: { name: string }) {
  return (
    <span className="flex size-9 items-center justify-center rounded-full bg-[#ebebeb] text-xs font-medium text-[#111827]">
      {toInitials(name)}
    </span>
  );
}

function QuickSplitExpenseSkeleton() {
  return (
    <>
      <div className="space-y-3 px-2 pb-6">
        <div className="flex items-baseline justify-between gap-4">
          <div className="h-10 w-24 rounded-xl bg-[#e5e7eb]" />
          <div className="h-10 w-40 rounded-xl bg-[#e5e7eb]" />
        </div>
        <div className="h-4 w-40 rounded-full bg-[#e5e7eb]" />
      </div>

      <div className="space-y-5 px-2 pb-24">
        <div className="rounded-[24px] border border-[#ebebeb] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <div className="h-11 rounded-[24px] bg-[#f3f4f6]" />
        </div>
        <div className="rounded-[24px] border border-[#ebebeb] bg-white px-4 py-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <div className="space-y-4">
            <div className="h-11 rounded-xl bg-[#f3f4f6]" />
            <div className="h-4 w-24 rounded-full bg-[#e5e7eb]" />
            <div className="flex gap-3">
              <div className="size-11 rounded-full bg-[#e5e7eb]" />
              <div className="size-11 rounded-full bg-[#e5e7eb]" />
              <div className="size-11 rounded-full bg-[#e5e7eb]" />
            </div>
            <div className="h-4 w-24 rounded-full bg-[#e5e7eb]" />
            <div className="space-y-3">
              <div className="h-11 rounded-xl bg-[#f3f4f6]" />
              <div className="h-11 rounded-xl bg-[#f3f4f6]" />
              <div className="h-11 rounded-xl bg-[#f3f4f6]" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
