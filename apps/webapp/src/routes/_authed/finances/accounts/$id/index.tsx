import { ArrowLeftIcon, Wallet02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { financesClient } from '#/api/finances';
import type { InferResponseType } from '#/api/types';
import { Button } from '#/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '#/components/ui/drawer';
import { formatCurrency, formatShortDate } from '#/lib/i18n';
import { m } from '#/paraglide/messages.js';
import {
  accountTypeOptions,
  currency,
  currentMonthKey,
  type FinanceAccountInput,
  type FinanceAccountUpdateInput,
  getAccountStatusLabel,
  getAccountTypeLabel,
  parseMoney,
  toInputDate,
  updateAccountEndpoint,
} from '../../-components/finance-model';

export const Route = createFileRoute('/_authed/finances/accounts/$id/')({
  validateSearch: (search: Record<string, unknown>) => ({
    month:
      typeof search.month === 'string' && /^\d{4}-\d{2}$/.test(search.month)
        ? search.month
        : currentMonthKey(),
  }),
  component: RouteComponent,
});

const accountEndpoint = financesClient.accounts[':id'].$get;
const accountMovementsEndpoint = financesClient.accounts[':id'].movements.$get;
type AccountMovementsResponse = InferResponseType<
  typeof accountMovementsEndpoint
>;
type AccountMovementsSuccess = Extract<
  AccountMovementsResponse,
  { data: unknown[] }
>;
type AccountMovement = AccountMovementsSuccess['data'][number];

function getMonthKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return currentMonthKey();

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[26px] border border-black/[0.04] bg-white p-4 shadow-[0_1px_2px_rgba(20,20,20,0.04)]">
      <p className="truncate text-xs font-medium uppercase text-black/35">
        {label}
      </p>
      <p className="mt-2 truncate text-lg font-semibold tracking-normal text-[#191919]">
        {value}
      </p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 border-black/5 border-b py-3 last:border-b-0">
      <p className="shrink-0 text-sm text-black/45">{label}</p>
      <p className="min-w-0 truncate text-right text-sm font-medium text-[#191919]">
        {value}
      </p>
    </div>
  );
}

function MovementRow({
  movement,
  onPress,
}: {
  movement: AccountMovement;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="flex w-full min-w-0 items-center gap-3 rounded-[26px] border border-black/[0.04] bg-white p-3 text-left shadow-[0_1px_2px_rgba(20,20,20,0.04)] transition active:scale-[0.99]"
    >
      <div
        className={`flex size-11 shrink-0 items-center justify-center rounded-full ${
          movement.type === 'INCOME'
            ? 'bg-[#dff5e8] text-[#047857]'
            : 'bg-[#fde8ec] text-[#be185d]'
        }`}
      >
        <HugeiconsIcon icon={Wallet02Icon} className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold leading-6 text-[#1e1e1e]">
          {movement.description}
        </p>
        <div className="mt-1 flex min-w-0 items-center gap-2">
          <span className="min-w-0 truncate rounded-full bg-[#f4f4f2] px-2 py-0.5 text-xs font-medium text-black/50">
            {movement.category?.name ?? m['finances.noCategory']()}
          </span>
          <span className="shrink-0 text-xs text-black/35">
            {formatShortDate(movement.occurredAt)}
          </span>
        </div>
      </div>
      <div className="min-w-0 shrink-0 text-right">
        <p
          className={`text-base font-semibold leading-6 ${
            movement.type === 'INCOME' ? 'text-[#047857]' : 'text-[#be185d]'
          }`}
        >
          {formatCurrency(movement.currency, movement.amount, {
            maximumFractionDigits: 0,
          })}
        </p>
        <p className="max-w-24 truncate text-xs leading-4 text-black/35">
          {movement.type === 'INCOME'
            ? m['finances.income']()
            : m['finances.expense']()}
        </p>
      </div>
    </button>
  );
}

function RouteComponent() {
  const queryClient = useQueryClient();
  const { id } = Route.useParams();
  const { month } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] =
    useState<FinanceAccountInput['type']>('bank');
  const [accountInstitution, setAccountInstitution] = useState('');
  const [accountCurrency, setAccountCurrency] = useState(currency);
  const [accountCurrentBalance, setAccountCurrentBalance] = useState('');
  const [accountAvailableBalance, setAccountAvailableBalance] = useState('');
  const [accountLockedBalance, setAccountLockedBalance] = useState('');
  const [accountCreditLimit, setAccountCreditLimit] = useState('');
  const [accountOpenedAt, setAccountOpenedAt] = useState('');
  const [accountMaturesAt, setAccountMaturesAt] = useState('');
  const [accountInterestRate, setAccountInterestRate] = useState('');
  const [accountNotes, setAccountNotes] = useState('');

  const accountQuery = useQuery({
    queryKey: ['finances-account', id],
    queryFn: async () => {
      const response = await accountEndpoint({ param: { id } });
      if (!response.ok) throw new Error(m['finances.loadError']());
      return response.json();
    },
  });
  const movementsQuery = useInfiniteQuery({
    queryKey: ['finances-account-movements', id],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const response = await accountMovementsEndpoint({
        param: { id },
        query: {
          limit: '20',
          ...(pageParam ? { cursor: pageParam } : {}),
        },
      });
      if (!response.ok) throw new Error(m['finances.loadError']());
      return response.json() as Promise<AccountMovementsSuccess>;
    },
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
  });
  const movements = useMemo(
    () => movementsQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [movementsQuery.data],
  );
  const account = accountQuery.data;
  const isCreditCard = account?.accountType === 'CREDIT_CARD';
  const creditLimit = account?.creditLimit ?? 0;
  const creditUsage =
    isCreditCard && creditLimit > 0
      ? Math.min(
          Math.max(((account?.usedCredit ?? 0) / creditLimit) * 100, 0),
          100,
        )
      : 0;

  const updateAccountMutation = useMutation({
    mutationFn: async (input: FinanceAccountUpdateInput) => {
      const response = await updateAccountEndpoint({
        param: { id },
        json: input,
      });
      if (!response.ok) throw new Error(m['finances.accountSaveFailed']());
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['finances-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['finances-accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['finances-account', id] }),
        queryClient.invalidateQueries({
          queryKey: ['finances-account-movements', id],
        }),
      ]);
      resetAccountForm();
      setIsEditDrawerOpen(false);
      toast.success(m['finances.accountSaved']());
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : m['finances.accountSaveFailed'](),
      );
    },
  });

  function resetAccountForm() {
    setAccountName('');
    setAccountType('bank');
    setAccountInstitution('');
    setAccountCurrency(currency);
    setAccountCurrentBalance('');
    setAccountAvailableBalance('');
    setAccountLockedBalance('');
    setAccountCreditLimit('');
    setAccountOpenedAt('');
    setAccountMaturesAt('');
    setAccountInterestRate('');
    setAccountNotes('');
  }

  function prepareAccountEdit(selectedAccount: NonNullable<typeof account>) {
    setAccountName(selectedAccount.name);
    setAccountType(
      selectedAccount.accountType.toLowerCase() as FinanceAccountInput['type'],
    );
    setAccountInstitution(selectedAccount.institution ?? '');
    setAccountCurrency(selectedAccount.currency);
    setAccountCurrentBalance(String(selectedAccount.currentBalance));
    setAccountAvailableBalance(String(selectedAccount.availableBalance));
    setAccountLockedBalance(String(selectedAccount.lockedBalance));
    setAccountCreditLimit(
      selectedAccount.creditLimit === null
        ? ''
        : String(selectedAccount.creditLimit),
    );
    setAccountOpenedAt(toInputDate(selectedAccount.openedAt));
    setAccountMaturesAt(toInputDate(selectedAccount.maturesAt));
    setAccountInterestRate(
      selectedAccount.interestRate === null
        ? ''
        : String(selectedAccount.interestRate),
    );
    setAccountNotes(selectedAccount.notes ?? '');
    setIsEditDrawerOpen(true);
  }

  function submitAccountUpdate() {
    const name = accountName.trim();
    const currentBalance = parseMoney(accountCurrentBalance);
    const isCreditCardInput = accountType === 'credit_card';
    const creditLimit = parseMoney(accountCreditLimit);

    if (!name || !accountCurrency.trim()) {
      toast.error(m['finances.accountValidation']());
      return;
    }

    updateAccountMutation.mutate({
      name,
      type: accountType,
      institution: accountInstitution.trim() || undefined,
      currency: accountCurrency.trim().toUpperCase(),
      currentBalance,
      availableBalance: accountAvailableBalance
        ? parseMoney(accountAvailableBalance)
        : isCreditCardInput
          ? Math.max(creditLimit - currentBalance, 0)
          : currentBalance,
      lockedBalance: isCreditCardInput
        ? 0
        : accountLockedBalance
          ? parseMoney(accountLockedBalance)
          : 0,
      ...(isCreditCardInput && creditLimit > 0 ? { creditLimit } : {}),
      openedAt: accountOpenedAt
        ? new Date(`${accountOpenedAt}T12:00:00`)
        : undefined,
      maturesAt: accountMaturesAt
        ? new Date(`${accountMaturesAt}T12:00:00`)
        : undefined,
      interestRate: accountInterestRate
        ? Number(accountInterestRate.replace(',', '.'))
        : undefined,
      notes: accountNotes.trim() || undefined,
    });
  }

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-[#1e1e1e]">
      <div className="mx-auto min-h-screen w-full max-w-[430px] overflow-x-hidden px-5 pb-28 pt-5">
        <header className="sticky top-0 z-10 -mx-5 flex items-center gap-3 bg-[#f7f7f4]/90 px-5 py-3 backdrop-blur">
          <button
            type="button"
            onClick={() =>
              void navigate({
                to: '/finances/accounts',
                search: { month },
              })
            }
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white"
            aria-label={m['finances.back']()}
          >
            <HugeiconsIcon icon={ArrowLeftIcon} className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium uppercase text-black/35">
              {m['finances.accountDetail']()}
            </p>
            <h1 className="truncate text-xl font-semibold leading-7">
              {account?.name ?? m['finances.accountDetail']()}
            </h1>
          </div>
        </header>

        {accountQuery.isPending ? (
          <div className="mt-5 rounded-[30px] bg-white p-5 text-sm text-black/45">
            {m['common.loading']()}
          </div>
        ) : !account ? (
          <div className="mt-5 rounded-[30px] bg-white p-5 text-sm text-black/45">
            {m['finances.accountNotFound']()}
          </div>
        ) : (
          <>
            <section className="mt-4 overflow-hidden rounded-[34px] bg-[#171717] p-6 text-white shadow-[0_24px_55px_-36px_rgba(0,0,0,0.65)]">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm text-white/55">
                    {account.institution ||
                      getAccountTypeLabel(account.accountType)}
                  </p>
                  <p className="mt-2 truncate text-xs font-medium uppercase text-white/35">
                    {getAccountTypeLabel(account.accountType)}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80">
                  {getAccountStatusLabel(account.status)}
                </span>
              </div>

              <div className="mt-8">
                <p className="truncate text-[42px] font-semibold leading-none tracking-normal">
                  {formatCurrency(
                    account.currency,
                    isCreditCard
                      ? account.availableBalance
                      : account.currentBalance,
                    { maximumFractionDigits: 0 },
                  )}
                </p>
                <p className="mt-2 text-sm text-white/50">
                  {isCreditCard
                    ? m['finances.accountAvailableCredit']()
                    : m['finances.accountCurrentBalance']()}
                </p>
              </div>

              {isCreditCard ? (
                <div className="mt-7">
                  <div className="flex items-center justify-between gap-3 text-xs text-white/45">
                    <span>{m['finances.accountUsedCredit']()}</span>
                    <span className="truncate">
                      {formatCurrency(account.currency, account.usedCredit, {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${creditUsage}%` }}
                    />
                  </div>
                </div>
              ) : null}

              <Button
                type="button"
                variant="outline"
                onClick={() => prepareAccountEdit(account)}
                className="mt-7 h-11 rounded-full border-white/15 bg-white/10 text-white hover:bg-white/15 hover:text-white"
              >
                {m['finances.editAccount']()}
              </Button>
            </section>

            <section className="mt-4 grid gap-3 sm:grid-cols-2">
              <SummaryTile
                label={
                  isCreditCard
                    ? m['finances.accountUsedCredit']()
                    : m['finances.accountAvailable']()
                }
                value={formatCurrency(
                  account.currency,
                  isCreditCard ? account.usedCredit : account.availableBalance,
                  { maximumFractionDigits: 0 },
                )}
              />
              <SummaryTile
                label={
                  isCreditCard
                    ? m['finances.accountCreditLimit']()
                    : m['finances.accountLocked']()
                }
                value={formatCurrency(
                  account.currency,
                  isCreditCard ? creditLimit : account.lockedBalance,
                  { maximumFractionDigits: 0 },
                )}
              />
            </section>

            <section className="mt-4 rounded-[28px] bg-white px-5 py-2 shadow-[0_1px_2px_rgba(20,20,20,0.04)]">
              <DetailRow
                label={m['finances.accountType']()}
                value={getAccountTypeLabel(account.accountType)}
              />
              <DetailRow
                label={m['finances.date']()}
                value={formatShortDate(account.createdAt)}
              />
              <DetailRow
                label={m['finances.accountCurrentBalance']()}
                value={formatCurrency(
                  account.currency,
                  account.currentBalance,
                  {
                    maximumFractionDigits: 0,
                  },
                )}
              />
            </section>

            {account.notes ? (
              <section className="mt-4 rounded-[28px] bg-white p-5 text-sm leading-6 text-black/60 shadow-[0_1px_2px_rgba(20,20,20,0.04)]">
                {account.notes}
              </section>
            ) : null}

            <section className="mt-7">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-[#1e1e1e]">
                  {m['finances.accountMovements']()}
                </h2>
              </div>
              <div className="mt-3 grid gap-3">
                {movementsQuery.isPending ? (
                  <div className="rounded-[26px] bg-white p-4 text-sm text-[#626262]">
                    {m['common.loading']()}
                  </div>
                ) : null}
                {!movementsQuery.isPending && movements.length === 0 ? (
                  <div className="rounded-[26px] bg-white p-4 text-sm text-[#626262]">
                    {m['finances.emptyTransactions']()}
                  </div>
                ) : null}
                {movements.map((movement) => (
                  <MovementRow
                    key={movement.id}
                    movement={movement}
                    onPress={() =>
                      void navigate({
                        to: '/finances/movements/$id',
                        params: { id: movement.id },
                        search: {
                          month: getMonthKey(movement.occurredAt),
                          accountId: id,
                        },
                      })
                    }
                  />
                ))}
              </div>
              {movementsQuery.hasNextPage ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void movementsQuery.fetchNextPage()}
                  disabled={movementsQuery.isFetchingNextPage}
                  className="mt-4 h-11 w-full rounded-full"
                >
                  {movementsQuery.isFetchingNextPage
                    ? m['common.loading']()
                    : m['finances.loadMoreMovements']()}
                </Button>
              ) : null}
            </section>
          </>
        )}
      </div>

      <Drawer
        open={isEditDrawerOpen}
        onOpenChange={(open) => {
          setIsEditDrawerOpen(open);
          if (!open) resetAccountForm();
        }}
      >
        <DrawerContent className="overflow-hidden bg-[#f7f7f4]">
          <DrawerHeader>
            <DrawerTitle>{m['finances.editAccount']()}</DrawerTitle>
          </DrawerHeader>

          <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto px-5 pb-4">
            <input
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              placeholder={m['finances.accountNamePlaceholder']()}
              className="h-13 rounded-[20px] border border-black/5 bg-white px-4 text-sm outline-none"
            />
            <select
              value={accountType}
              onChange={(event) =>
                setAccountType(
                  event.target.value as FinanceAccountInput['type'],
                )
              }
              className="h-13 rounded-[20px] border border-black/5 bg-white px-4 text-sm outline-none"
            >
              {accountTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {getAccountTypeLabel(type)}
                </option>
              ))}
            </select>
            <input
              value={accountInstitution}
              onChange={(event) => setAccountInstitution(event.target.value)}
              placeholder={m['finances.accountInstitutionPlaceholder']()}
              className="h-13 rounded-[20px] border border-black/5 bg-white px-4 text-sm outline-none"
            />
            <div className="grid min-w-0 gap-3 sm:grid-cols-[0.7fr_1fr]">
              <input
                value={accountCurrency}
                onChange={(event) => setAccountCurrency(event.target.value)}
                placeholder={m['finances.accountCurrencyPlaceholder']()}
                className="h-13 min-w-0 rounded-[20px] border border-black/5 bg-white px-4 text-sm uppercase outline-none"
              />
              <input
                inputMode="decimal"
                value={accountCurrentBalance}
                onChange={(event) =>
                  setAccountCurrentBalance(event.target.value)
                }
                placeholder={
                  accountType === 'credit_card'
                    ? m['finances.accountCurrentDebt']()
                    : m['finances.accountCurrentBalance']()
                }
                className="h-13 min-w-0 rounded-[20px] border border-black/5 bg-white px-4 text-sm outline-none"
              />
            </div>
            {accountType === 'credit_card' ? (
              <input
                inputMode="decimal"
                value={accountCreditLimit}
                onChange={(event) => setAccountCreditLimit(event.target.value)}
                placeholder={m['finances.accountCreditLimit']()}
                className="h-13 min-w-0 rounded-[20px] border border-black/5 bg-white px-4 text-sm outline-none"
              />
            ) : null}
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <input
                inputMode="decimal"
                value={accountAvailableBalance}
                onChange={(event) =>
                  setAccountAvailableBalance(event.target.value)
                }
                placeholder={
                  accountType === 'credit_card'
                    ? m['finances.accountAvailableCredit']()
                    : m['finances.accountAvailableBalance']()
                }
                className="h-13 min-w-0 rounded-[20px] border border-black/5 bg-white px-4 text-sm outline-none"
              />
              {accountType === 'credit_card' ? null : (
                <input
                  inputMode="decimal"
                  value={accountLockedBalance}
                  onChange={(event) =>
                    setAccountLockedBalance(event.target.value)
                  }
                  placeholder={m['finances.accountLockedBalance']()}
                  className="h-13 min-w-0 rounded-[20px] border border-black/5 bg-white px-4 text-sm outline-none"
                />
              )}
            </div>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <input
                type="date"
                value={accountOpenedAt}
                onChange={(event) => setAccountOpenedAt(event.target.value)}
                className="h-13 min-w-0 rounded-[20px] border border-black/5 bg-white px-4 text-sm outline-none"
              />
              <input
                type="date"
                value={accountMaturesAt}
                onChange={(event) => setAccountMaturesAt(event.target.value)}
                className="h-13 min-w-0 rounded-[20px] border border-black/5 bg-white px-4 text-sm outline-none"
              />
            </div>
            <input
              inputMode="decimal"
              value={accountInterestRate}
              onChange={(event) => setAccountInterestRate(event.target.value)}
              placeholder={m['finances.accountInterestRate']()}
              className="h-13 rounded-[20px] border border-black/5 bg-white px-4 text-sm outline-none"
            />
            <textarea
              value={accountNotes}
              onChange={(event) => setAccountNotes(event.target.value)}
              placeholder={m['finances.accountNotesPlaceholder']()}
              className="min-h-24 rounded-[20px] border border-black/5 bg-white px-4 py-3 text-sm outline-none"
            />
          </div>

          <DrawerFooter className="shrink-0 border-t border-black/5 bg-[#f7f7f4]/95 backdrop-blur">
            <Button
              type="button"
              onClick={submitAccountUpdate}
              disabled={updateAccountMutation.isPending}
              className="h-12 rounded-full"
            >
              {updateAccountMutation.isPending
                ? m['common.saving']()
                : m['finances.saveAccount']()}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </main>
  );
}
