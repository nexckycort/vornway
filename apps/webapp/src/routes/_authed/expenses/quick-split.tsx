import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ChevronDown, ChevronLeft, PencilLine, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
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
import { getQuickSplitMessages } from './-messages';

export const Route = createFileRoute('/_authed/expenses/quick-split')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { friendIds: string[] } => ({
    friendIds: Array.isArray(search.friendIds)
      ? search.friendIds.filter(
          (value): value is string => typeof value === 'string',
        )
      : [],
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
  const { friendIds } = Route.useSearch();
  const navigate = useNavigate();
  const t = getQuickSplitMessages();
  const { user } = useAuth();
  const { recentFriends } = useExpenseEntryData();
  const createExpenseMutation = useCreateQuickSplitExpenseMutation();
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
        name: description.trim(),
        description: description.trim(),
        participantUserIds: selectedFriends.map((friend) => friend.id),
        amount,
        currency,
        paidByUserId,
        expenseParticipantUserIds: splitWithUserIds,
      });

      toast.success(t.createSuccess);
      await navigate({ to: '/' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.createError);
    }
  };

  return (
    <main className="min-h-dvh bg-white font-sans text-[#111827]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[412px] flex-col overflow-hidden rounded-[30px] bg-white">
        <header className="border-b border-[#f3f4f6] px-4 pb-3 pt-2">
          <div className="relative flex items-start justify-center">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="absolute left-0 top-1 rounded-full border-[#ebebeb] bg-white shadow-[0_1px_1px_rgba(0,0,0,0.05)]"
              onClick={() => navigate({ to: '/expenses/new' })}
            >
              <span className="sr-only">Volver</span>
              <ChevronLeft className="size-4" />
            </Button>

            <div className="min-w-0 py-7 text-center">
              <p className="text-xs font-normal leading-4 text-[#4c4c4c]">
                {t.step}
              </p>
              <h1 className="mt-0.5 text-sm font-semibold leading-5 text-[#1e1e1e]">
                {t.title}
              </h1>
            </div>
          </div>

          <div className="-mx-4 mt-1 h-2 overflow-hidden bg-[#ebebeb]">
            <div className="h-full w-3/4 rounded-r-full bg-[linear-gradient(90deg,#ffc8da_0%,#fd407f_39.32%,#d000bf_100%)]" />
          </div>
        </header>

        <div className="bg-[#fafafa] px-4 py-8">
          <section>
            <div className="flex items-start justify-between gap-4">
              <button
                type="button"
                onClick={() => setShowCurrencyDrawer(true)}
                className="flex items-center gap-2 text-[36px] font-medium leading-10 tracking-[-0.03em] text-[#1e1e1e]"
              >
                <span>{currency}</span>
                <ChevronDown className="mt-1 size-[18px] text-[#1e1e1e]" />
              </button>

              <input
                inputMode="numeric"
                value={amountInput}
                onChange={(event) =>
                  setAmountInput(formatAmountInput(event.target.value))
                }
                placeholder="$0"
                className="min-w-0 flex-1 bg-transparent text-right text-[36px] font-normal leading-10 tracking-[-0.03em] text-[#1e1e1e] outline-none placeholder:text-[#cbd5e1]"
              />
            </div>

            <div className="mt-2 flex items-center gap-1.5 text-xs text-[#797979]">
              <span className="text-[12px]">{selectedCurrency.flag}</span>
              <span>{selectedCurrency.name}</span>
            </div>
          </section>

          <section className="mt-8 overflow-hidden rounded-[24px] border border-[#ebebeb] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <div className="px-4 pt-4">
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

            <div className="mt-4 h-px bg-[#f1f5f9]" />

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
          </section>

          <div className="px-4">
            {debouncedFriendInput &&
            !searchQuery.isFetching &&
            availableSearchResults.length === 0 ? (
              <p className="mt-3 text-sm text-[#64748b]">
                {t.friendsSearchEmpty}
              </p>
            ) : null}

            {availableSearchResults.length > 0 ? (
              <section className="mt-3 flex flex-col gap-2">
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
        </div>

        <div className="flex-1 overflow-y-auto bg-white px-4 pb-8 pt-5">
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
                  onClick={() => handleRemoveFriend(friend.id)}
                  className="inline-flex items-center gap-2 rounded-full border border-[#fecdd3] bg-[#fff5f6] px-3 py-2 text-sm font-medium text-[#9f1239]"
                >
                  <span>{friend.name}</span>
                  <X className="size-3.5" />
                </button>
              ))}
            </div>
          )}

          {people.length > 1 ? (
            <>
              <section className="mt-6">
                <h2 className="text-base font-medium leading-6 text-[#1e1e1e]">
                  {t.payerLabel}
                </h2>
                <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                  {people.map((person) => {
                    const isSelected = paidByUserId === person.id;

                    return (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() => setPaidByUserId(person.id)}
                        className={cn(
                          'flex min-w-[60px] max-w-[80px] flex-col items-center gap-0.5 text-center',
                          !isSelected && 'opacity-50',
                        )}
                      >
                        <span
                          className={cn(
                            'flex size-8 items-center justify-center rounded-full text-xs font-medium transition-colors',
                            isSelected
                              ? 'border-2 border-[#ff658a] bg-white text-[#111827]'
                              : 'bg-[#ebebeb] text-[#111827]',
                          )}
                        >
                          {toInitials(person.name)}
                        </span>
                        <span className="line-clamp-2 w-full text-xs leading-4 text-[#1e1e1e]">
                          {person.isCurrentUser
                            ? `${person.name} (Tú)`
                            : person.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="mt-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-medium leading-6 text-[#1e1e1e]">
                    {t.splitLabel}
                  </h2>
                  <button
                    type="button"
                    onClick={() =>
                      setSplitWithUserIds(people.map((person) => person.id))
                    }
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary"
                  >
                    <span>Partes iguales</span>
                    <ChevronDown className="size-4" />
                  </button>
                </div>

                <div className="mt-3 flex flex-col gap-4">
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
                        <span className="flex size-8 items-center justify-center rounded-full bg-[#ebebeb] text-xs font-medium text-[#111827]">
                          {toInitials(person.name)}
                        </span>
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
        </div>

        <div className="border-t border-[#ebebeb] bg-white px-4 py-3">
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            className="h-10 w-full rounded-[20px] text-base font-medium shadow-[0_8px_20px_rgba(222,3,77,0.1)]"
          >
            {createExpenseMutation.isPending ? t.submitPending : t.submit}
          </Button>
        </div>
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
    </main>
  );
}
