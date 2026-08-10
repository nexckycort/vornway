import { Add01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { debtsClient } from '#/api/debts';
import type { InferRequestType, InferResponseType } from '#/api/types';
import { Button } from '#/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '#/components/ui/drawer';
import { formatCurrency } from '#/lib/i18n';
import { m } from '#/paraglide/messages.js';
import { useUserSearchQuery } from '#/routes/_authed/groups/-hooks/use-user-search-query';

export const Route = createFileRoute('/_authed/debts/')({
  validateSearch: (search: Record<string, unknown>) => ({
    from: search.from === 'finances' ? ('finances' as const) : undefined,
  }),
  component: DebtsRoute,
});

const listEndpoint = debtsClient.index.$get;
const createEndpoint = debtsClient.index.$post;
type Debt = InferResponseType<typeof listEndpoint>[number];
type CreateDebt = InferRequestType<typeof createEndpoint>['json'];
type Filter = 'all' | 'active' | 'paid';

const today = () => new Date().toISOString().slice(0, 10);
const debtInputClass =
  'h-11 w-full rounded-2xl border border-black/10 bg-white px-3 text-base text-[#171717] outline-none focus:border-primary focus:ring-2 focus:ring-primary/15';

function DebtsRoute() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { from } = Route.useSearch();
  const [filter, setFilter] = useState<Filter>('active');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [name, setName] = useState('');
  const [person, setPerson] = useState('');
  const [counterpartyId, setCounterpartyId] = useState<string>();
  const [amount, setAmount] = useState('');
  const [loanDate, setLoanDate] = useState(today);
  const [direction, setDirection] = useState<'lent' | 'borrowed'>('lent');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const userSearch = useUserSearchQuery(person);

  const debtsQuery = useQuery({
    queryKey: ['debts', 'all'],
    queryFn: async () => {
      const response = await listEndpoint({ query: { status: 'all' } });
      if (!response.ok) throw new Error('debt_load_failed');
      return response.json();
    },
  });
  const createMutation = useMutation({
    mutationFn: async (input: CreateDebt) => {
      const response = await createEndpoint({ json: input });
      if (!response.ok) throw new Error('debt_create_failed');
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['debts'] }),
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
      ]);
      closeDrawer();
      toast.success(m['debts.created']());
    },
  });

  const debts = (debtsQuery.data ?? []) as Debt[];
  const visibleDebts = debts.filter((debt) =>
    filter === 'all'
      ? true
      : filter === 'paid'
        ? debt.status === 'paid'
        : debt.status !== 'paid',
  );
  const receivable = debts
    .filter((debt) => debt.direction === 'lent' && debt.status !== 'paid')
    .reduce((total, debt) => total + debt.remainingAmount, 0);
  const activeCount = debts.filter((debt) => debt.status !== 'paid').length;

  function closeDrawer() {
    setDrawerOpen(false);
    setName('');
    setPerson('');
    setCounterpartyId(undefined);
    setAmount('');
    setLoanDate(today());
    setDirection('lent');
    setDueDate('');
    setNote('');
  }
  function submit() {
    const parsedAmount = Number(amount.replace(/[^\d.]/g, ''));
    if (
      !name.trim() ||
      !person.trim() ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0
    )
      return;
    createMutation.mutate({
      name: name.trim(),
      counterpartyName: person.trim(),
      ...(counterpartyId ? { counterpartyId } : {}),
      direction,
      principalAmount: parsedAmount,
      amounts: [
        {
          amount: parsedAmount,
          loanDate,
        },
      ],
      interestType: 'none',
      currency: 'COP',
      ...(dueDate ? { dueDate } : {}),
      ...(note.trim() ? { description: note.trim() } : {}),
    });
  }

  return (
    <main className="h-dvh bg-[#fafaf8] text-[#171717] md:h-[calc(100dvh-2.5rem)]">
      <div className="mx-auto flex h-full w-full max-w-[560px] flex-col bg-[#fafaf8]">
        <header className="flex items-center justify-between px-4 pb-4 pt-[calc(var(--safe-top)+1rem)]">
          <Button
            variant="outline"
            className="size-11"
            onClick={() =>
              navigate({ to: from === 'finances' ? '/finances' : '/' })
            }
            aria-label={m['common.back']()}
          >
            ←
          </Button>
          <h1 className="text-lg font-semibold">{m['debts.title']()}</h1>
          <Button
            className="size-11 rounded-full"
            onClick={() => setDrawerOpen(true)}
            aria-label={m['debts.create']()}
          >
            <HugeiconsIcon icon={Add01Icon} className="size-5" />
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(var(--safe-bottom)+1.5rem)]">
          <section className="rounded-3xl bg-white px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <p className="text-xs font-medium uppercase tracking-wide text-black/45">
              {m['debts.receivable']()}
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">
              {formatCurrency('COP', receivable, { maximumFractionDigits: 0 })}
            </p>
            <p className="mt-1 text-sm text-black/50">
              {activeCount} {m['debts.activeDebts']()}
            </p>
          </section>
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {(['active', 'all', 'paid'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`h-9 shrink-0 rounded-full px-4 text-sm font-medium ${filter === item ? 'bg-[#171717] text-white' : 'bg-white text-black/55'}`}
              >
                {m[
                  `debts.filter${item[0].toUpperCase()}${item.slice(1)}` as
                    | 'debts.filterActive'
                    | 'debts.filterAll'
                    | 'debts.filterPaid'
                ]()}
              </button>
            ))}
          </div>
          <section className="mt-4">
            {debtsQuery.isLoading ? (
              <p className="py-8 text-sm text-black/45">
                {m['common.loading']()}
              </p>
            ) : null}
            {!debtsQuery.isLoading && visibleDebts.length === 0 ? (
              <div className="rounded-3xl bg-white px-5 py-10 text-center text-sm text-black/45">
                {m['debts.empty']()}
              </div>
            ) : null}
            <div className="grid gap-2">
              {visibleDebts.map((debt) => (
                <DebtListItem
                  key={debt.id}
                  debt={debt}
                  onClick={() =>
                    navigate({
                      to: '/debts/$id',
                      params: { id: debt.id },
                      search: { from },
                    })
                  }
                />
              ))}
            </div>
          </section>
        </div>
      </div>

      <Drawer
        open={drawerOpen}
        onOpenChange={(open) => (open ? setDrawerOpen(true) : closeDrawer())}
      >
        <DrawerContent className="bg-[#fafaf8]" scrollable>
          <DrawerHeader>
            <DrawerTitle>{m['debts.newTitle']()}</DrawerTitle>
          </DrawerHeader>
          <div className="grid gap-4 px-5 pb-4">
            <Field label={m['debts.namePlaceholder']()}>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={debtInputClass}
              />
            </Field>
            <Field label={m['debts.personPlaceholder']()}>
              <div className="relative">
                <input
                  value={person}
                  onChange={(event) => {
                    setPerson(event.target.value);
                    setCounterpartyId(undefined);
                  }}
                  className={debtInputClass}
                />
                {userSearch.data?.data?.length && !counterpartyId ? (
                  <div className="absolute inset-x-0 top-full z-10 mt-2 rounded-2xl border bg-white p-2 shadow-xl">
                    {userSearch.data.data.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          setCounterpartyId(user.id);
                          setPerson(user.name);
                        }}
                        className="block w-full rounded-xl px-3 py-3 text-left text-sm hover:bg-black/[0.03]"
                      >
                        {user.name}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={direction === 'lent' ? 'default' : 'outline'}
                className="h-11 rounded-2xl"
                onClick={() => setDirection('lent')}
              >
                {m['debts.lent']()}
              </Button>
              <Button
                variant={direction === 'borrowed' ? 'default' : 'outline'}
                className="h-11 rounded-2xl"
                onClick={() => setDirection('borrowed')}
              >
                {m['debts.borrowed']()}
              </Button>
            </div>
            <Field label={m['debts.amountPlaceholder']()}>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="input text-xl"
              />
            </Field>
            <Field label={m['debts.amountDate']()}>
              <input
                type="date"
                value={loanDate}
                onChange={(event) => setLoanDate(event.target.value)}
                className="input"
              />
            </Field>
            <Field label={m['debts.dueDate']()}>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="input"
              />
            </Field>
            <Field label={m['debts.descriptionPlaceholder']()}>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="input min-h-20 py-3"
              />
            </Field>
          </div>
          <DrawerFooter>
            <Button
              className="h-12 rounded-2xl"
              disabled={createMutation.isPending}
              onClick={submit}
            >
              {m['debts.create']()}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5 text-sm font-medium text-black/65">
      <span>{label}</span>
      {children}
    </div>
  );
}

function DebtListItem({ debt, onClick }: { debt: Debt; onClick: () => void }) {
  const progress =
    debt.expectedTotal > 0
      ? Math.min(100, (debt.paidAmount / debt.expectedTotal) * 100)
      : 0;
  const lastLoan = debt.amounts
    ?.slice()
    .sort((a, b) => +new Date(b.loanDate) - +new Date(a.loanDate))[0];
  const lastPayment = debt.payments
    ?.slice()
    .sort((a, b) => +new Date(b.paidAt) - +new Date(a.paidAt))[0];
  const last =
    lastPayment &&
    (!lastLoan || +new Date(lastPayment.paidAt) > +new Date(lastLoan.loanDate))
      ? { date: lastPayment.paidAt, amount: lastPayment.amount, label: 'Abono' }
      : lastLoan
        ? {
            date: lastLoan.loanDate,
            amount: lastLoan.amount,
            label: 'Préstamo',
          }
        : null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl bg-white px-4 py-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-transform active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">
            {debt.counterpartyName}
          </p>
          <p className="mt-0.5 truncate text-xs text-black/45">{debt.name}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-semibold">
            {formatCurrency(debt.currency, debt.remainingAmount, {
              maximumFractionDigits: 0,
            })}
          </p>
          <Status status={debt.status} />
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/6">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-black/45">
        <span>
          {Math.round(progress)}% {m['debts.paid']().toLowerCase()}
        </span>
        <span className="truncate">
          {last
            ? `${last.label} · ${formatCurrency(debt.currency, last.amount, { maximumFractionDigits: 0 })} · ${new Date(last.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`
            : m['debts.noActivity']()}
        </span>
      </div>
    </button>
  );
}

function Status({ status }: { status: Debt['status'] }) {
  return (
    <span
      className={`mt-1 block text-[10px] font-medium ${status === 'paid' ? 'text-emerald-700' : status === 'overdue' ? 'text-amber-700' : 'text-black/40'}`}
    >
      {m[
        `debts.${status}` as 'debts.active' | 'debts.paid' | 'debts.overdue'
      ]()}
    </span>
  );
}
