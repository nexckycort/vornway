import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '#/components/ui/button';
import { formatCurrency } from '#/lib/i18n';
import { m } from '#/paraglide/messages.js';
import { ScreenShell, SummaryCard } from '../-components/finance-layout';
import {
  accountsEndpoint,
  accountTypeOptions,
  closeAccountEndpoint,
  createAccountEndpoint,
  currency,
  currentMonthKey,
  deleteAccountEndpoint,
  type FinanceAccount,
  type FinanceAccountInput,
  type FinanceAccountUpdateInput,
  getAccountStatusLabel,
  getAccountTypeLabel,
  getBrowserTimeZone,
  getCurrencyValue,
  moneyLabel,
  parseMoney,
  summaryEndpoint,
  toInputDate,
  updateAccountEndpoint,
} from '../-components/finance-model';

export const Route = createFileRoute('/_authed/finances/accounts/')({
  validateSearch: (search: Record<string, unknown>) => ({
    month:
      typeof search.month === 'string' && /^\d{4}-\d{2}$/.test(search.month)
        ? search.month
        : currentMonthKey(),
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: Route.fullPath });
  const { month } = Route.useSearch();
  const timeZone = getBrowserTimeZone();
  const [editingAccountId, setEditingAccountId] = useState('');
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

  const summaryQuery = useQuery({
    queryKey: ['finances-summary', month, currency, timeZone],
    queryFn: async () => {
      const response = await summaryEndpoint({
        query: { month, currency, timeZone },
      });
      if (!response.ok) throw new Error(m['finances.loadError']());
      return response.json();
    },
  });
  const accountsQuery = useInfiniteQuery({
    queryKey: ['finances-accounts'],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const response = await accountsEndpoint({
        query: {
          limit: '20',
          ...(pageParam ? { cursor: pageParam } : {}),
        },
      });
      if (!response.ok) throw new Error(m['finances.loadError']());
      return response.json();
    },
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
  });

  const summary = summaryQuery.data;
  const accounts = useMemo(
    () => accountsQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [accountsQuery.data],
  );
  const accountTotal = getCurrencyValue(
    summary?.totals.accountTotalByCurrency ?? {},
    currency,
  );
  const accountAvailable = getCurrencyValue(
    summary?.totals.accountAvailableByCurrency ?? {},
    currency,
  );
  const accountLocked = getCurrencyValue(
    summary?.totals.accountLockedByCurrency ?? {},
    currency,
  );
  const accountCreditLimitTotal = getCurrencyValue(
    summary?.totals.accountCreditLimitByCurrency ?? {},
    currency,
  );
  const accountCreditUsed = getCurrencyValue(
    summary?.totals.accountCreditUsedByCurrency ?? {},
    currency,
  );
  const accountCreditAvailable = getCurrencyValue(
    summary?.totals.accountCreditAvailableByCurrency ?? {},
    currency,
  );

  const accountMutation = useMutation({
    mutationFn: async (input: FinanceAccountInput) => {
      const response = editingAccountId
        ? await updateAccountEndpoint({
            param: { id: editingAccountId },
            json: input satisfies FinanceAccountUpdateInput,
          })
        : await createAccountEndpoint({ json: input });
      if (!response.ok) throw new Error(m['finances.accountSaveFailed']());
      return response.json();
    },
    onSuccess: async () => {
      await invalidateAccountQueries();
      resetAccountForm();
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
  const closeAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await closeAccountEndpoint({ param: { id } });
      if (!response.ok) throw new Error(m['finances.accountCloseFailed']());
      return response.json();
    },
    onSuccess: async () => {
      await invalidateAccountQueries();
      resetAccountForm();
      toast.success(m['finances.accountClosed']());
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : m['finances.accountCloseFailed'](),
      );
    },
  });
  const deleteAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await deleteAccountEndpoint({ param: { id } });
      if (!response.ok) throw new Error(m['finances.accountDeleteFailed']());
      return response.json();
    },
    onSuccess: async () => {
      await invalidateAccountQueries();
      resetAccountForm();
      toast.success(m['finances.accountDeleted']());
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : m['finances.accountDeleteFailed'](),
      );
    },
  });

  function invalidateAccountQueries() {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ['finances-summary'] }),
      queryClient.invalidateQueries({ queryKey: ['finances-accounts'] }),
      queryClient.invalidateQueries({ queryKey: ['finances-account'] }),
      queryClient.invalidateQueries({
        queryKey: ['finances-account-movements'],
      }),
    ]);
  }

  function resetAccountForm() {
    setEditingAccountId('');
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

  function selectAccountToEdit(account: FinanceAccount) {
    setEditingAccountId(account.id);
    setAccountName(account.name);
    setAccountType(
      account.accountType.toLowerCase() as FinanceAccountInput['type'],
    );
    setAccountInstitution(account.institution ?? '');
    setAccountCurrency(account.currency);
    setAccountCurrentBalance(String(account.currentBalance));
    setAccountAvailableBalance(String(account.availableBalance));
    setAccountLockedBalance(String(account.lockedBalance));
    setAccountCreditLimit(
      account.creditLimit === null ? '' : String(account.creditLimit),
    );
    setAccountOpenedAt(toInputDate(account.openedAt));
    setAccountMaturesAt(toInputDate(account.maturesAt));
    setAccountInterestRate(
      account.interestRate === null ? '' : String(account.interestRate),
    );
    setAccountNotes(account.notes ?? '');
  }

  function submitAccount() {
    const name = accountName.trim();
    const currentBalance = parseMoney(accountCurrentBalance);
    const isCreditCard = accountType === 'credit_card';
    const creditLimit = parseMoney(accountCreditLimit);
    if (!name || !accountCurrency.trim()) {
      toast.error(m['finances.accountValidation']());
      return;
    }

    accountMutation.mutate({
      name,
      type: accountType,
      institution: accountInstitution.trim() || undefined,
      currency: accountCurrency.trim().toUpperCase(),
      currentBalance,
      availableBalance: accountAvailableBalance
        ? parseMoney(accountAvailableBalance)
        : isCreditCard
          ? Math.max(creditLimit - currentBalance, 0)
          : currentBalance,
      lockedBalance: isCreditCard
        ? 0
        : accountLockedBalance
          ? parseMoney(accountLockedBalance)
          : 0,
      ...(isCreditCard && creditLimit > 0 ? { creditLimit } : {}),
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
    <ScreenShell
      title={m['finances.accounts']()}
      month={month}
      onBack={() =>
        void navigate({
          to: '/finances',
          search: {
            view: 'dashboard',
            month,
            transactionId: undefined,
            accountId: undefined,
          },
        })
      }
    >
      <div className="grid min-w-0 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="min-w-0 rounded-[30px] bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">
              {editingAccountId
                ? m['finances.editAccount']()
                : m['finances.createAccount']()}
            </h2>
            {editingAccountId ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetAccountForm}
                className="rounded-full"
              >
                {m['common.cancel']()}
              </Button>
            ) : null}
          </div>
          <div className="mt-5 grid gap-3">
            <input
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              placeholder={m['finances.accountNamePlaceholder']()}
              className="h-13 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
            />
            <select
              value={accountType}
              onChange={(event) =>
                setAccountType(
                  event.target.value as FinanceAccountInput['type'],
                )
              }
              className="h-13 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
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
              className="h-13 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
            />
            <div className="grid min-w-0 gap-3 sm:grid-cols-[0.7fr_1fr]">
              <input
                value={accountCurrency}
                onChange={(event) => setAccountCurrency(event.target.value)}
                placeholder={m['finances.accountCurrencyPlaceholder']()}
                className="h-13 min-w-0 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm uppercase outline-none"
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
                className="h-13 min-w-0 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
              />
            </div>
            {accountType === 'credit_card' ? (
              <input
                inputMode="decimal"
                value={accountCreditLimit}
                onChange={(event) => setAccountCreditLimit(event.target.value)}
                placeholder={m['finances.accountCreditLimit']()}
                className="h-13 min-w-0 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
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
                className="h-13 min-w-0 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
              />
              {accountType === 'credit_card' ? null : (
                <input
                  inputMode="decimal"
                  value={accountLockedBalance}
                  onChange={(event) =>
                    setAccountLockedBalance(event.target.value)
                  }
                  placeholder={m['finances.accountLockedBalance']()}
                  className="h-13 min-w-0 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
                />
              )}
            </div>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <input
                type="date"
                value={accountOpenedAt}
                onChange={(event) => setAccountOpenedAt(event.target.value)}
                className="h-13 min-w-0 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
              />
              <input
                type="date"
                value={accountMaturesAt}
                onChange={(event) => setAccountMaturesAt(event.target.value)}
                className="h-13 min-w-0 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
              />
            </div>
            <input
              inputMode="decimal"
              value={accountInterestRate}
              onChange={(event) => setAccountInterestRate(event.target.value)}
              placeholder={m['finances.accountInterestRate']()}
              className="h-13 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
            />
            <textarea
              value={accountNotes}
              onChange={(event) => setAccountNotes(event.target.value)}
              placeholder={m['finances.accountNotesPlaceholder']()}
              className="min-h-24 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 py-3 text-sm outline-none"
            />
            <Button
              type="button"
              onClick={submitAccount}
              disabled={accountMutation.isPending}
              className="h-12 rounded-full"
            >
              {accountMutation.isPending
                ? m['common.saving']()
                : m['finances.saveAccount']()}
            </Button>
          </div>
        </section>

        <section className="grid min-w-0 gap-3">
          <div className="grid min-w-0 gap-2 sm:grid-cols-3">
            <SummaryCard
              label={m['finances.accountTotal']()}
              value={moneyLabel(accountTotal)}
            />
            <SummaryCard
              label={m['finances.accountAvailable']()}
              value={moneyLabel(accountAvailable)}
            />
            <SummaryCard
              label={m['finances.accountLocked']()}
              value={moneyLabel(accountLocked)}
            />
            <SummaryCard
              label={m['finances.accountCreditLimit']()}
              value={moneyLabel(accountCreditLimitTotal)}
            />
            <SummaryCard
              label={m['finances.accountUsedCredit']()}
              value={moneyLabel(accountCreditUsed)}
            />
            <SummaryCard
              label={m['finances.accountAvailableCredit']()}
              value={moneyLabel(accountCreditAvailable)}
            />
          </div>
          {summaryQuery.isPending || accountsQuery.isPending ? (
            <div className="rounded-[30px] bg-white p-5 text-sm text-black/45">
              {m['common.loading']()}
            </div>
          ) : accounts.length === 0 ? (
            <div className="rounded-[30px] bg-white p-5 text-sm text-black/45">
              {m['finances.emptyAccounts']()}
            </div>
          ) : (
            accounts.map((account) => (
              <article
                key={account.id}
                className="min-w-0 overflow-hidden rounded-[28px] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
              >
                <button
                  type="button"
                  onClick={() =>
                    void navigate({
                      to: '/finances/accounts/$id',
                      params: { id: account.id },
                      search: { month },
                    })
                  }
                  className="flex w-full min-w-0 items-start justify-between gap-3 text-left"
                >
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold">
                      {account.name}
                    </h3>
                    <p className="mt-1 truncate text-xs text-black/45">
                      {account.institution ||
                        getAccountTypeLabel(account.accountType)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                        {getAccountTypeLabel(account.accountType)}
                      </span>
                      <span className="rounded-full bg-[#f4f4f2] px-2.5 py-1 text-[11px] font-medium text-black/50">
                        {getAccountStatusLabel(account.status)}
                      </span>
                    </div>
                  </div>
                  <div className="min-w-0 shrink-0 text-right">
                    <p className="max-w-32 truncate text-lg font-semibold">
                      {formatCurrency(
                        account.currency,
                        account.accountType === 'CREDIT_CARD'
                          ? account.availableBalance
                          : account.currentBalance,
                        { maximumFractionDigits: 0 },
                      )}
                    </p>
                    <p className="max-w-32 truncate text-xs text-black/45">
                      {account.accountType === 'CREDIT_CARD'
                        ? `${m['finances.accountUsedCredit']()} ${formatCurrency(
                            account.currency,
                            account.usedCredit,
                            { maximumFractionDigits: 0 },
                          )}`
                        : `${m['finances.available']()} ${formatCurrency(
                            account.currency,
                            account.availableBalance,
                            { maximumFractionDigits: 0 },
                          )}`}
                    </p>
                    {account.accountType === 'CREDIT_CARD' ? (
                      <p className="max-w-32 truncate text-xs text-black/45">
                        {m['finances.accountCreditLimit']()}{' '}
                        {formatCurrency(
                          account.currency,
                          account.creditLimit ?? 0,
                          { maximumFractionDigits: 0 },
                        )}
                      </p>
                    ) : null}
                  </div>
                </button>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void navigate({
                        to: '/finances/accounts/$id',
                        params: { id: account.id },
                        search: { month },
                      })
                    }
                    className="rounded-full"
                  >
                    {m['finances.viewAccount']()}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => selectAccountToEdit(account)}
                    className="rounded-full"
                  >
                    {m['finances.editAccount']()}
                  </Button>
                </div>
                {editingAccountId === account.id &&
                account.status !== 'CLOSED' ? (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (confirm(m['finances.closeAccountConfirm']())) {
                          closeAccountMutation.mutate(account.id);
                        }
                      }}
                      disabled={closeAccountMutation.isPending}
                      className="h-10 rounded-full"
                    >
                      {m['finances.closeAccount']()}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => {
                        if (confirm(m['finances.deleteAccountConfirm']())) {
                          deleteAccountMutation.mutate(account.id);
                        }
                      }}
                      disabled={deleteAccountMutation.isPending}
                      className="h-10 rounded-full"
                    >
                      {m['finances.deleteAccount']()}
                    </Button>
                  </div>
                ) : null}
              </article>
            ))
          )}
          {accountsQuery.hasNextPage ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void accountsQuery.fetchNextPage()}
              disabled={accountsQuery.isFetchingNextPage}
              className="h-11 rounded-full"
            >
              {accountsQuery.isFetchingNextPage
                ? m['common.loading']()
                : m['finances.loadMoreAccounts']()}
            </Button>
          ) : null}
        </section>
      </div>
    </ScreenShell>
  );
}
