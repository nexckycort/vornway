import { ArrowLeftIcon, Wallet02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';
import { financesClient } from '#/api/finances';
import type { InferResponseType } from '#/api/types';
import { Button } from '#/components/ui/button';
import { formatCurrency, formatShortDate } from '#/lib/i18n';
import { m } from '#/paraglide/messages.js';

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

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getAccountTypeLabel(type: string) {
  const normalized = type.toLowerCase();
  if (normalized === 'bank') return m['finances.accountTypeBank']();
  if (normalized === 'savings') return m['finances.accountTypeSavings']();
  if (normalized === 'term_deposit') {
    return m['finances.accountTypeTermDeposit']();
  }
  if (normalized === 'cash') return m['finances.accountTypeCash']();
  if (normalized === 'wallet') return m['finances.accountTypeWallet']();
  if (normalized === 'credit_card') {
    return m['finances.accountTypeCreditCard']();
  }
  return m['finances.accountTypeOther']();
}

function getAccountStatusLabel(status: string) {
  if (status === 'CLOSED') return m['finances.accountStatusClosed']();
  if (status === 'MATURED') return m['finances.accountStatusMatured']();
  return m['finances.accountStatusActive']();
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[24px] border border-black/5 bg-white p-4">
      <p className="truncate text-sm text-black/45">{label}</p>
      <p className="mt-2 truncate text-lg font-semibold">{value}</p>
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
      className="flex w-full min-w-0 items-start gap-3 rounded-2xl border border-[#e9e9e9] bg-white p-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e9e9e9] text-[#1e1e1e]">
        <HugeiconsIcon icon={Wallet02Icon} className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold leading-6 text-[#1e1e1e]">
          {movement.description}
        </p>
        <p className="truncate text-xs leading-4 text-[#626262]">
          {movement.category?.name ?? m['finances.noCategory']()}
        </p>
        <p className="mt-1 truncate text-xs leading-4 text-[#626262]">
          {formatShortDate(movement.occurredAt)}
        </p>
      </div>
      <div className="min-w-0 shrink-0 text-right">
        <p className="text-base font-medium leading-6 text-[#1e1e1e]">
          {formatCurrency(movement.currency, movement.amount, {
            maximumFractionDigits: 0,
          })}
        </p>
        <p
          className={`max-w-24 truncate text-xs leading-4 ${
            movement.type === 'INCOME' ? 'text-[#047857]' : 'text-[#b91c1c]'
          }`}
        >
          {movement.type === 'INCOME'
            ? m['finances.income']()
            : m['finances.expense']()}
        </p>
      </div>
    </button>
  );
}

function RouteComponent() {
  const { id } = Route.useParams();
  const { month } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

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

  return (
    <main className="min-h-screen bg-[#f3f3f3] text-[#1e1e1e]">
      <div className="mx-auto min-h-screen w-full max-w-[412px] overflow-x-hidden px-4 pb-28 pt-6">
        <header className="flex items-center gap-3">
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
          <h1 className="min-w-0 truncate text-2xl font-semibold leading-8">
            {account?.name ?? m['finances.accountDetail']()}
          </h1>
        </header>

        {accountQuery.isPending ? (
          <div className="mt-6 rounded-[30px] bg-white p-5 text-sm text-black/45">
            {m['common.loading']()}
          </div>
        ) : !account ? (
          <div className="mt-6 rounded-[30px] bg-white p-5 text-sm text-black/45">
            {m['finances.accountNotFound']()}
          </div>
        ) : (
          <>
            <section className="mt-6 rounded-[34px] bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm text-black/45">
                    {account.institution ||
                      getAccountTypeLabel(account.accountType)}
                  </p>
                  <p className="mt-3 truncate text-4xl font-semibold leading-none">
                    {formatCurrency(
                      account.currency,
                      isCreditCard
                        ? account.availableBalance
                        : account.currentBalance,
                      { maximumFractionDigits: 0 },
                    )}
                  </p>
                  <p className="mt-2 text-sm text-black/45">
                    {isCreditCard
                      ? m['finances.accountAvailableCredit']()
                      : m['finances.accountCurrentBalance']()}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                  {getAccountStatusLabel(account.status)}
                </span>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <SummaryTile
                  label={
                    isCreditCard
                      ? m['finances.accountUsedCredit']()
                      : m['finances.accountAvailable']()
                  }
                  value={formatCurrency(
                    account.currency,
                    isCreditCard
                      ? account.usedCredit
                      : account.availableBalance,
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
                    isCreditCard
                      ? (account.creditLimit ?? 0)
                      : account.lockedBalance,
                    { maximumFractionDigits: 0 },
                  )}
                />
                <SummaryTile
                  label={m['finances.accountType']()}
                  value={getAccountTypeLabel(account.accountType)}
                />
                <SummaryTile
                  label={m['finances.date']()}
                  value={formatShortDate(account.createdAt)}
                />
              </div>

              {account.notes ? (
                <p className="mt-5 rounded-[24px] bg-[#f7f7f4] p-4 text-sm text-black/60">
                  {account.notes}
                </p>
              ) : null}
            </section>

            <section className="mt-5">
              <h2 className="text-sm font-semibold text-[#1e1e1e]">
                {m['finances.accountMovements']()}
              </h2>
              <div className="mt-3 grid gap-4">
                {movementsQuery.isPending ? (
                  <div className="rounded-2xl bg-white p-4 text-sm text-[#626262]">
                    {m['common.loading']()}
                  </div>
                ) : null}
                {!movementsQuery.isPending && movements.length === 0 ? (
                  <div className="rounded-2xl bg-white p-4 text-sm text-[#626262]">
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
    </main>
  );
}
