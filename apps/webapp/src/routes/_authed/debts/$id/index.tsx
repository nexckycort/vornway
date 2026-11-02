import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { ApiPayload } from '@vornway/api-client';
import { type ReactNode, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { api, failWithMessage } from '#/api/client';
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

export const Route = createFileRoute('/_authed/debts/$id/')({
  validateSearch: (search: Record<string, unknown>) => ({
    from: search.from === 'finances' ? ('finances' as const) : undefined,
  }),
  component: RouteComponent,
});

type PaymentInput = ApiPayload<'debts', 'payment'>;
type AmountInput = ApiPayload<'debts', 'addAmount'>;
type UpdateAmountInput = ApiPayload<'debts', 'updateAmount'>;
type UpdatePaymentInput = ApiPayload<'debts', 'updatePayment'>;
type UpdateDebtInput = ApiPayload<'debts', 'update'>;
type Activity =
  | {
      kind: 'loan';
      id: string;
      amount: number;
      date: Date;
      note?: string | null;
      account?: { id: string; name: string } | null;
    }
  | {
      kind: 'payment';
      id: string;
      amount: number;
      date: Date;
      note?: string | null;
      account?: { id: string; name: string } | null;
    };

type SheetMode =
  | 'payment'
  | 'loan'
  | 'edit-payment'
  | 'edit-loan'
  | 'edit-debt'
  | null;

const today = () => new Date().toISOString().slice(0, 10);
const debtInputClass =
  'h-11 w-full rounded-2xl border border-black/10 bg-white px-3 text-base text-[#171717] outline-none focus:border-primary focus:ring-2 focus:ring-primary/15';
const debtTextareaClass =
  'w-full rounded-2xl border border-black/10 bg-white px-3 py-3 text-base text-[#171717] outline-none focus:border-primary focus:ring-2 focus:ring-primary/15';
const dateLabel = (date: Date) =>
  new Date(date).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

function RouteComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = Route.useParams();
  const { from } = Route.useSearch();
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null,
  );
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [note, setNote] = useState('');
  const [accountId, setAccountId] = useState('');
  const [debtName, setDebtName] = useState('');
  const [counterpartyName, setCounterpartyName] = useState('');
  const [counterpartyId, setCounterpartyId] = useState<string>();
  const [debtDescription, setDebtDescription] = useState('');
  const [debtDueDate, setDebtDueDate] = useState('');
  const counterpartySearch = useUserSearchQuery(counterpartyName);

  const detailQuery = useQuery({
    queryKey: ['debt', id],
    queryFn: () =>
      failWithMessage(
        api.debts.get.request({ params: { id } }),
        'debt_load_failed',
      ),
  });
  const financesSummaryQuery = useQuery({
    queryKey: ['finances-summary', 'debt-payment-accounts', 'COP'],
    queryFn: () =>
      failWithMessage(
        api.finances.summary.request({ query: { currency: 'COP' } }),
        'finance_summary_load_failed',
      ),
  });
  const detail = detailQuery.data;
  const paymentAccounts =
    financesSummaryQuery.data?.accounts.filter(
      (account) =>
        account.status !== 'CLOSED' &&
        account.currency === (detail?.currency ?? 'COP'),
    ) ?? [];

  const activities = useMemo<Activity[]>(
    () =>
      detail
        ? [
            ...detail.amounts.map((item) => ({
              kind: 'loan' as const,
              id: item.id,
              amount: item.amount,
              date: item.loanDate,
              account: item.account,
            })),
            ...detail.payments.map((item) => ({
              kind: 'payment' as const,
              id: item.id,
              amount: item.amount,
              date: item.paidAt,
              note: item.note,
              account: item.account,
            })),
          ].sort((left, right) => +new Date(right.date) - +new Date(left.date))
        : [],
    [detail],
  );

  const invalidate = async () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['debt', id] }),
      queryClient.invalidateQueries({ queryKey: ['debts'] }),
      queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
      queryClient.invalidateQueries({ queryKey: ['finances-summary'] }),
      queryClient.invalidateQueries({ queryKey: ['finances-movements'] }),
      queryClient.invalidateQueries({ queryKey: ['finances-accounts'] }),
      queryClient.invalidateQueries({ queryKey: ['finances-account'] }),
    ]);

  const paymentMutation = useMutation({
    mutationFn: (payload: PaymentInput) =>
      failWithMessage(
        api.debts.payment.request({ params: { id }, payload }),
        'debt_payment_failed',
      ),
    onSuccess: async () => {
      await invalidate();
      closeSheet();
      toast.success(m['debts.paymentSaved']());
    },
  });
  const amountMutation = useMutation({
    mutationFn: (payload: AmountInput) =>
      failWithMessage(
        api.debts.addAmount.request({ params: { id }, payload }),
        'debt_amount_failed',
      ),
    onSuccess: async () => {
      await invalidate();
      closeSheet();
      toast.success(m['debts.amountSaved']());
    },
  });
  const updateAmountMutation = useMutation({
    mutationFn: (input: { amountId: string; json: UpdateAmountInput }) =>
      failWithMessage(
        api.debts.updateAmount.request({
          params: { id, amountId: input.amountId },
          payload: input.json,
        }),
        'debt_amount_update_failed',
      ),
    onSuccess: async () => {
      await invalidate();
      closeSheet();
      toast.success(m['debts.movementUpdated']());
    },
  });
  const updatePaymentMutation = useMutation({
    mutationFn: (input: { paymentId: string; json: UpdatePaymentInput }) =>
      failWithMessage(
        api.debts.updatePayment.request({
          params: { id, paymentId: input.paymentId },
          payload: input.json,
        }),
        'debt_payment_update_failed',
      ),
    onSuccess: async () => {
      await invalidate();
      closeSheet();
      toast.success(m['debts.movementUpdated']());
    },
  });
  const deleteAmountMutation = useMutation({
    mutationFn: (amountId: string) =>
      failWithMessage(
        api.debts.deleteAmount.request({ params: { id, amountId } }),
        'debt_amount_delete_failed',
      ),
    onSuccess: async () => {
      await invalidate();
      closeSheet();
      toast.success(m['debts.movementDeleted']());
    },
  });
  const deletePaymentMutation = useMutation({
    mutationFn: (paymentId: string) =>
      failWithMessage(
        api.debts.deletePayment.request({ params: { id, paymentId } }),
        'debt_payment_delete_failed',
      ),
    onSuccess: async () => {
      await invalidate();
      closeSheet();
      toast.success(m['debts.movementDeleted']());
    },
  });
  const updateDebtMutation = useMutation({
    mutationFn: (payload: UpdateDebtInput) =>
      failWithMessage(
        api.debts.update.request({ params: { id }, payload }),
        'debt_update_failed',
      ),
    onSuccess: async () => {
      await invalidate();
      closeSheet();
      toast.success(m['debts.updated']());
    },
  });
  const deleteDebtMutation = useMutation({
    mutationFn: () =>
      failWithMessage(
        api.debts.delete.request({ params: { id } }),
        'debt_delete_failed',
      ),
    onSuccess: async () => {
      await invalidate();
      await navigate({ to: '/debts', search: { from }, replace: true });
    },
  });

  function closeSheet() {
    setSheetMode(null);
    setSelectedActivity(null);
  }
  function openForm(mode: Exclude<SheetMode, null>, activity?: Activity) {
    setSelectedActivity(activity ?? null);
    setSheetMode(mode);
    if (mode === 'payment' || mode === 'loan') {
      setAmount('');
      setDate(today());
      setNote('');
      setAccountId('');
    } else if (activity) {
      setAmount(String(activity.amount));
      setDate(activity.date.toISOString().slice(0, 10));
      setNote(activity.note ?? '');
      setAccountId(activity.account?.id ?? '');
    }
  }
  function submitForm() {
    const value = Number(amount.replace(/[^\d.]/g, ''));
    if (!value || value <= 0 || !date) return;
    if (sheetMode === 'payment') {
      paymentMutation.mutate({
        amount: value,
        paidAt: new Date(date),
        ...(accountId ? { accountId } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
    } else if (sheetMode === 'loan') {
      amountMutation.mutate({
        amount: value,
        loanDate: new Date(date),
        ...(accountId ? { accountId } : {}),
      });
    } else if (sheetMode === 'edit-loan' && selectedActivity) {
      updateAmountMutation.mutate({
        amountId: selectedActivity.id,
        json: {
          amount: value,
          loanDate: new Date(date),
          ...(accountId ? { accountId } : {}),
        },
      });
    } else if (sheetMode === 'edit-payment' && selectedActivity) {
      updatePaymentMutation.mutate({
        paymentId: selectedActivity.id,
        json: {
          amount: value,
          paidAt: new Date(date),
          accountId: accountId || null,
          note: note.trim(),
        },
      });
    }
  }

  if (detailQuery.isLoading || !detail) {
    return (
      <DebtPage>
        <div className="px-5 py-8 text-sm text-gray-500">
          {m['common.loading']()}
        </div>
      </DebtPage>
    );
  }

  const progress =
    detail.expectedTotal > 0
      ? Math.min(100, (detail.paidAmount / detail.expectedTotal) * 100)
      : 0;
  const groupedActivities = activities.reduce<Record<string, Activity[]>>(
    (groups, activity) => {
      const key = new Date(activity.date).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      if (!groups[key]) groups[key] = [];
      groups[key].push(activity);
      return groups;
    },
    {},
  );

  return (
    <DebtPage>
      <header className="flex items-center justify-between border-b border-black/5 px-4 pb-4 pt-[calc(var(--safe-top)+1rem)]">
        <Button
          variant="outline"
          className="size-11"
          onClick={() => navigate({ to: '/debts', search: { from } })}
          aria-label={m['common.back']()}
        >
          ←
        </Button>
        <h1 className="text-base font-semibold">{m['debts.detailTitle']()}</h1>
        <Button
          variant="ghost"
          className="size-11 text-xl"
          onClick={() => setMenuOpen(true)}
          aria-label={m['debts.moreActions']()}
        >
          ⋯
        </Button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(var(--safe-bottom)+1.5rem)]">
        <section className="pt-7">
          <p className="text-sm text-black/50">{detail.counterpartyName}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            {detail.name}
          </h2>
          <div className="mt-7">
            <p className="text-4xl font-semibold tracking-tight">
              {formatCurrency(detail.currency, detail.remainingAmount)}
            </p>
            <p className="mt-1 text-sm text-black/50">
              {detail.status === 'paid'
                ? m['debts.paid']()
                : m['debts.remainingAmount']()}
            </p>
          </div>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-black/8">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-black/50">
            <span>
              {formatCurrency(detail.currency, detail.paidAmount)}{' '}
              {m['debts.paidAmount']().toLowerCase()}
            </span>
            <span>
              {Math.round(progress)}% {m['debts.paid']().toLowerCase()}
            </span>
          </div>
          <p className="mt-4 text-xs text-black/45">
            {detail.dueDate
              ? `${m['debts.dueDate']()} · ${dateLabel(detail.dueDate)}`
              : m['debts.noDueDate']()}
          </p>
        </section>

        {detail.status !== 'paid' ? (
          <div className="mt-7 grid grid-cols-[1.2fr_1fr] gap-2">
            <Button
              className="h-12 rounded-2xl"
              onClick={() => openForm('payment')}
            >
              {m['debts.registerPayment']()}
            </Button>
            <Button
              variant="outline"
              className="h-12 rounded-2xl"
              onClick={() => openForm('loan')}
            >
              + {m['debts.addAmount']()}
            </Button>
          </div>
        ) : (
          <div className="mt-7 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            ✓ {m['debts.paid']()}
          </div>
        )}

        <section className="mt-9">
          <div className="flex items-end justify-between">
            <div>
              <h3 className="text-lg font-semibold">{m['debts.activity']()}</h3>
              <p className="mt-1 text-xs text-black/45">
                {activities.length} {m['debts.movements']()}
              </p>
            </div>
          </div>
          <div className="mt-4">
            {Object.keys(groupedActivities).length === 0 ? (
              <p className="py-8 text-sm text-black/45">
                {m['debts.noActivity']()}
              </p>
            ) : (
              Object.entries(groupedActivities).map(([day, items]) => (
                <div
                  key={day}
                  className="border-b border-black/5 py-3 first:pt-0"
                >
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-black/40">
                    {day}
                  </p>
                  <div className="divide-y divide-black/5">
                    {items.map((activity) => (
                      <ActivityRow
                        key={`${activity.kind}:${activity.id}`}
                        activity={activity}
                        currency={detail.currency}
                        onClick={() => setSelectedActivity(activity)}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <Drawer open={menuOpen} onOpenChange={setMenuOpen}>
        <DrawerContent className="bg-[#fafaf8]">
          <DrawerHeader>
            <DrawerTitle>{detail.name}</DrawerTitle>
          </DrawerHeader>
          <div className="grid gap-2 px-5 pb-5">
            <Button
              variant="outline"
              className="h-12 justify-start rounded-2xl"
              onClick={() => {
                setMenuOpen(false);
                setDebtName(detail.name);
                setCounterpartyName(detail.counterpartyName);
                setCounterpartyId(detail.counterpartyId ?? undefined);
                setDebtDescription(detail.description ?? '');
                setDebtDueDate(
                  detail.dueDate?.toISOString().slice(0, 10) ?? '',
                );
                window.setTimeout(() => setSheetMode('edit-debt'), 180);
              }}
            >
              {m['debts.edit']()}
            </Button>
            {detail.status !== 'paid' ? (
              <Button
                variant="outline"
                className="h-12 justify-start rounded-2xl"
                disabled={paymentMutation.isPending}
                onClick={() => {
                  if (!window.confirm(m['debts.markPaid']())) return;
                  setMenuOpen(false);
                  paymentMutation.mutate({
                    amount: detail.remainingAmount,
                    paidAt: new Date(),
                  });
                }}
              >
                {m['debts.markPaid']()}
              </Button>
            ) : null}
            <Button
              variant="outline"
              className="h-12 justify-start rounded-2xl text-red-600"
              onClick={() => {
                if (window.confirm(m['debts.deleteConfirm']()))
                  deleteDebtMutation.mutate();
              }}
            >
              {m['debts.delete']()}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={Boolean(selectedActivity) && !sheetMode}
        onOpenChange={(open) => !open && setSelectedActivity(null)}
      >
        <DrawerContent className="bg-[#fafaf8]">
          <DrawerHeader>
            <DrawerTitle>
              {selectedActivity?.kind === 'payment'
                ? m['debts.paymentReceived']()
                : m['debts.loanMovement']()}
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-5 pb-5">
            <p className="text-3xl font-semibold">
              {selectedActivity
                ? formatCurrency(detail.currency, selectedActivity.amount)
                : ''}
            </p>
            <p className="mt-2 text-sm text-black/50">
              {selectedActivity ? dateLabel(selectedActivity.date) : ''}
              {selectedActivity?.kind === 'payment' && selectedActivity.account
                ? ` · ${selectedActivity.account.name}`
                : ''}
            </p>
            {selectedActivity?.note ? (
              <p className="mt-4 rounded-2xl bg-white p-3 text-sm text-black/60">
                {selectedActivity.note}
              </p>
            ) : null}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button
                className="h-11 rounded-2xl"
                onClick={() => {
                  const activity = selectedActivity;
                  if (!activity) return;
                  setSelectedActivity(null);
                  window.setTimeout(
                    () =>
                      openForm(
                        activity.kind === 'payment'
                          ? 'edit-payment'
                          : 'edit-loan',
                        activity,
                      ),
                    180,
                  );
                }}
              >
                {m['debts.edit']()}
              </Button>
              {selectedActivity ? (
                <Button
                  variant="outline"
                  className="h-11 rounded-2xl text-red-600"
                  onClick={() => {
                    if (
                      !selectedActivity ||
                      !window.confirm(m['debts.deleteMovementConfirm']())
                    )
                      return;
                    if (selectedActivity.kind === 'payment')
                      deletePaymentMutation.mutate(selectedActivity.id);
                    else deleteAmountMutation.mutate(selectedActivity.id);
                  }}
                >
                  {m['debts.delete']()}
                </Button>
              ) : null}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={Boolean(
          sheetMode &&
          [
            'payment',
            'loan',
            'edit-payment',
            'edit-loan',
            'edit-debt',
          ].includes(sheetMode),
        )}
        onOpenChange={(open) => !open && closeSheet()}
      >
        <DrawerContent className="bg-[#fafaf8]" scrollable>
          <DrawerHeader>
            <DrawerTitle>
              {sheetMode === 'payment'
                ? m['debts.registerPayment']()
                : sheetMode === 'loan'
                  ? m['debts.addAmountTitle']()
                  : sheetMode === 'edit-debt'
                    ? m['debts.edit']()
                    : m['debts.editMovement']()}
            </DrawerTitle>
          </DrawerHeader>
          {sheetMode === 'edit-debt' ? (
            <div className="grid gap-4 px-5 pb-4">
              <Field label={m['debts.namePlaceholder']()}>
                <input
                  value={debtName}
                  onChange={(event) => setDebtName(event.target.value)}
                  className={debtInputClass}
                />
              </Field>
              <Field label={m['debts.personPlaceholder']()}>
                <div className="relative">
                  <input
                    value={counterpartyName}
                    onChange={(event) => {
                      setCounterpartyName(event.target.value);
                      setCounterpartyId(undefined);
                    }}
                    className={debtInputClass}
                  />
                  {counterpartySearch.data?.data?.length && !counterpartyId ? (
                    <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-10 rounded-2xl border border-black/10 bg-white p-2 shadow-xl">
                      {counterpartySearch.data.data.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            setCounterpartyId(user.id);
                            setCounterpartyName(user.name);
                          }}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left hover:bg-gray-50"
                        >
                          <span className="font-medium">{user.name}</span>
                          <span className="max-w-[55%] truncate text-xs text-gray-500">
                            {user.username ?? user.email}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </Field>
              <Field label={m['debts.dueDate']()}>
                <input
                  type="date"
                  value={debtDueDate}
                  onChange={(event) => setDebtDueDate(event.target.value)}
                  className={debtInputClass}
                />
              </Field>
              <Field label={m['debts.descriptionPlaceholder']()}>
                <textarea
                  value={debtDescription}
                  onChange={(event) => setDebtDescription(event.target.value)}
                  className={`${debtTextareaClass} min-h-24`}
                />
              </Field>
            </div>
          ) : (
            <div className="grid gap-4 px-5 pb-4">
              <Field label={m['debts.amountPlaceholder']()}>
                <input
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className={`${debtInputClass} text-xl`}
                />
              </Field>
              <Field label={m['debts.amountDate']()}>
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className={debtInputClass}
                />
              </Field>
              {sheetMode === 'payment' ||
              sheetMode === 'loan' ||
              sheetMode === 'edit-loan' ? (
                <Field label={m['finances.account']()}>
                  <select
                    value={accountId}
                    onChange={(event) => setAccountId(event.target.value)}
                    className={debtInputClass}
                  >
                    <option value="">{m['finances.noAccount']()}</option>
                    {paymentAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              {sheetMode !== 'loan' ? (
                <Field label={m['debts.paymentNotePlaceholder']()}>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder={m['debts.descriptionPlaceholder']()}
                    className={`${debtTextareaClass} min-h-20`}
                  />
                </Field>
              ) : null}
              <div className="flex gap-2">
                {[50000, 100000, 200000].map((shortcut) => (
                  <button
                    key={shortcut}
                    type="button"
                    onClick={() => setAmount(String(shortcut))}
                    className="h-9 flex-1 rounded-xl bg-white text-xs font-medium text-primary"
                  >
                    +{formatCurrency(detail.currency, shortcut)}
                  </button>
                ))}
              </div>
            </div>
          )}
          <DrawerFooter>
            <Button
              className="h-12 rounded-2xl"
              disabled={
                paymentMutation.isPending ||
                amountMutation.isPending ||
                updateAmountMutation.isPending ||
                updatePaymentMutation.isPending ||
                updateDebtMutation.isPending
              }
              onClick={() => {
                if (sheetMode === 'edit-debt')
                  updateDebtMutation.mutate({
                    counterpartyName: counterpartyName.trim(),
                    counterpartyId: counterpartyId ?? null,
                    direction:
                      detail.direction === 'lent' ? 'lent' : 'borrowed',
                    currency: detail.currency,
                    name: debtName.trim(),
                    description: debtDescription.trim() || undefined,
                    dueDate: debtDueDate ? new Date(debtDueDate) : null,
                  });
                else submitForm();
              }}
            >
              {sheetMode === 'payment'
                ? m['debts.registerPayment']()
                : sheetMode === 'loan'
                  ? m['debts.saveAmount']()
                  : sheetMode === 'edit-debt'
                    ? m['common.saveChanges']()
                    : m['debts.saveAmountChanges']()}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </DebtPage>
  );
}

function DebtPage({ children }: { children: ReactNode }) {
  return (
    <main className="h-dvh bg-[#fafaf8] text-[#171717] md:h-[calc(100dvh-2.5rem)]">
      <div className="mx-auto flex h-full w-full max-w-[560px] flex-col bg-[#fafaf8]">
        {children}
      </div>
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

function ActivityRow({
  activity,
  currency,
  onClick,
}: {
  activity: Activity;
  currency: string;
  onClick: () => void;
}) {
  const isPayment = activity.kind === 'payment';
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-14 w-full items-center gap-3 py-3 text-left transition-colors active:bg-black/[0.03]"
    >
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-full text-base ${isPayment ? 'bg-emerald-50 text-emerald-700' : 'bg-primary/8 text-primary'}`}
      >
        {isPayment ? '↓' : '↑'}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">
          {isPayment ? 'Abono recibido' : 'Dinero prestado'}
        </span>
        <span className="mt-0.5 block truncate text-xs text-black/45">
          {activity.account?.name ?? activity.note ?? ''}
        </span>
      </span>
      <span
        className={`shrink-0 text-sm font-semibold ${isPayment ? 'text-emerald-700' : 'text-black'}`}
      >
        {isPayment ? '+' : ''}
        {formatCurrency(currency, activity.amount)}
      </span>
    </button>
  );
}
