import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ChevronDown, PencilLine, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { MobilePageLayout } from '#/components/mobile-page-layout';
import { Button } from '#/components/ui/button';
import { Checkbox } from '#/components/ui/checkbox';
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
};

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
  const [currency, setCurrency] =
    useState<(typeof currencyOptions)[number]['code']>('COP');
  const [showCurrencyDrawer, setShowCurrencyDrawer] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [description, setDescription] = useState('');
  const [friendInput, setFriendInput] = useState('');
  const [debouncedFriendInput, setDebouncedFriendInput] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<SelectedFriend[]>([]);
  const [paidByUserId, setPaidByUserId] = useState('');
  const [splitWithUserIds, setSplitWithUserIds] = useState<string[]>([]);

  const amount = parseAmountInput(amountInput);
  const selectedCurrency =
    currencyOptions.find((option) => option.code === currency) ??
    currencyOptions[0];

  const searchQuery = useUserSearchQuery(debouncedFriendInput);
  const searchResults = searchQuery.data?.data ?? [];
  const canSubmit =
    description.trim().length > 0 &&
    amount > 0 &&
    selectedFriends.length > 0 &&
    splitWithUserIds.length >= 2 &&
    !createExpenseMutation.isPending;

  const people = useMemo(
    () => [
      {
        id: currentUserId,
        name: currentUserName,
        email: user?.email ?? '',
        isCurrentUser: true,
      },
      ...selectedFriends.map((friend) => ({
        ...friend,
        isCurrentUser: false,
      })),
    ],
    [currentUserId, currentUserName, selectedFriends, user?.email],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedFriendInput(friendInput.trim());
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [friendInput]);

  useEffect(() => {
    if (!paidByUserId && currentUserId) {
      setPaidByUserId(currentUserId);
    }
  }, [currentUserId, paidByUserId]);

  useEffect(() => {
    if (!isEditMode || !expenseQuery.data) {
      return;
    }

    setDescription(expenseQuery.data.description);
    setAmountInput(formatAmountInput(String(expenseQuery.data.amount)));
    setCurrency(readCurrencyCode(expenseQuery.data.currency) ?? 'COP');
    setPaidByUserId(expenseQuery.data.paidBy.id);
    setSelectedFriends(
      expenseQuery.data.participants
        .filter((participant) => participant.userId !== currentUserId)
        .map((participant) => ({
          id: participant.userId,
          name: participant.name,
          email: '',
        })),
    );
    setSplitWithUserIds(
      expenseQuery.data.participants.map((participant) => participant.userId),
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
    setSplitWithUserIds((current) => {
      const next = current.filter((userId) => allIds.includes(userId));
      const merged =
        next.length === allIds.length
          ? next
          : Array.from(new Set([...next, ...allIds]));

      return areIdsEqual(current, merged) ? current : merged;
    });
  }, [people]);

  useEffect(() => {
    if (!searchQuery.isError || searchQuery.errorUpdatedAt === 0) {
      return;
    }

    toast.error(t.loadUsersError);
  }, [searchQuery.errorUpdatedAt, searchQuery.isError, t.loadUsersError]);

  const splitAmount =
    splitWithUserIds.length > 0 ? amount / splitWithUserIds.length : 0;
  const assignedTotal = formatCurrency(
    currency,
    splitAmount * splitWithUserIds.length,
  );
  const totalAmount = formatCurrency(currency, amount);

  const availableSearchResults = searchResults.filter((candidate) => {
    if (candidate.isCurrentUser) return false;
    return !selectedFriends.some((friend) => friend.id === candidate.id);
  });

  const isLoading = isEditMode && expenseQuery.isLoading;
  const isLoadingError = isEditMode && expenseQuery.isError;

  const toggleSplitUser = (userId: string, checked: boolean) => {
    setSplitWithUserIds((current) => {
      if (checked) {
        return Array.from(new Set([...current, userId]));
      }

      if (current.length <= 2) {
        return current;
      }

      return current.filter((currentUserId) => currentUserId !== userId);
    });
  };

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

    if (paidByUserId === friendId) {
      setPaidByUserId(currentUserId);
    }
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

    if (splitWithUserIds.length < 2) {
      toast.error(t.validationSplit);
      return;
    }

    try {
      await createExpenseMutation.mutateAsync({
        quickSplitId,
        expenseId,
        name:
          (isEditMode ? expenseQuery.data?.quickSplitName : undefined) ??
          description.trim(),
        description: description.trim(),
        participantUserIds: selectedFriends.map((friend) => friend.id),
        amount,
        currency,
        paidByUserId,
        expenseParticipantUserIds: splitWithUserIds,
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
          <section>
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
          </section>

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
                  {!isEditMode ? <X className="size-3.5" /> : null}
                </button>
              ))}
            </div>
          )}

          {people.length > 1 ? (
            <>
              <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm text-gray-600">{t.payerLabel}</p>
                </div>

                <div className="flex gap-3 overflow-x-auto pb-1">
                  {people.map((person) => {
                    const isSelected = paidByUserId === person.id;

                    return (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() => setPaidByUserId(person.id)}
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
                          {isSelected ? '•' : '•'}
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
                  <p className="text-sm text-gray-600">{t.splitLabel}</p>
                  <button
                    type="button"
                    onClick={() =>
                      setSplitWithUserIds(people.map((person) => person.id))
                    }
                    className="inline-flex items-center gap-1 text-rose-500"
                  >
                    <span className="text-sm font-medium">Partes iguales</span>
                    <ChevronDown className="size-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center gap-4">
                    <Checkbox
                      checked={splitWithUserIds.length === people.length}
                      onCheckedChange={() =>
                        setSplitWithUserIds(people.map((person) => person.id))
                      }
                    />
                    <span className="text-sm font-normal text-[#1e1e1e]">
                      {t.splitAll}
                    </span>
                  </label>

                  {people.map((person) => {
                    const checked = splitWithUserIds.includes(person.id);

                    return (
                      <label
                        key={person.id}
                        className="flex items-center gap-3"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(nextChecked) =>
                            toggleSplitUser(person.id, Boolean(nextChecked))
                          }
                        />
                        <ParticipantAvatar name={person.name} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-normal text-[#1e1e1e]">
                            {person.isCurrentUser
                              ? `${person.name} (Tú)`
                              : person.name}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-[#1e1e1e]">
                          {checked
                            ? formatCurrency(currency, splitAmount)
                            : formatCurrency(currency, 0)}
                        </span>
                      </label>
                    );
                  })}
                </div>

                <p className="mt-4 text-sm font-medium text-[#626262]">
                  {t.splitTotal(assignedTotal, totalAmount)}
                </p>
              </section>
            </>
          ) : null}
        </section>

        {expenseQuery.data?.quickSplitName && isEditMode ? (
          <p className="px-2 text-xs text-gray-500">
            Editando dentro de {expenseQuery.data.quickSplitName}
          </p>
        ) : null}
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
