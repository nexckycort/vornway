import { Delete02Icon, Edit02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { debtsClient } from '#/api/debts';
import { financesClient } from '#/api/finances';
import type { InferRequestType } from '#/api/types';
import { MobilePageLayout } from '#/components/mobile-page-layout';
import { Button } from '#/components/ui/button';
import { formatCurrency } from '#/lib/i18n';
import { m } from '#/paraglide/messages.js';

export const Route = createFileRoute('/_authed/debts/$id/')({
  validateSearch: (search: Record<string, unknown>) => ({
    from: search.from === 'finances' ? ('finances' as const) : undefined,
  }),
  component: RouteComponent,
});
const detailEndpoint = debtsClient[':id'].$get;
const updateEndpoint = debtsClient[':id'].$patch;
const amountEndpoint = debtsClient[':id'].amounts.$post;
const updateAmountEndpoint = debtsClient[':id'].amounts[':amountId'].$patch;
const paymentEndpoint = debtsClient[':id'].payments.$post;
const updatePaymentEndpoint = debtsClient[':id'].payments[':paymentId'].$patch;
const deletePaymentEndpoint = debtsClient[':id'].payments[':paymentId'].$delete;
const deleteDebtEndpoint = debtsClient[':id'].$delete;
const financesSummaryEndpoint = financesClient.summary.$get;
type Detail = {
  id: string;
  name: string;
  counterpartyName: string;
  counterpartyId?: string | null;
  direction: 'lent' | 'borrowed';
  principalAmount: number;
  amounts: Array<{
    id: string;
    amount: number;
    loanDate: string;
    createdAt: string;
  }>;
  expectedTotal: number;
  paidAmount: number;
  remainingAmount: number;
  currency: string;
  dueDate: string | null;
  status: 'active' | 'paid' | 'overdue';
  payments: Array<{
    id: string;
    accountId?: string | null;
    amount: number;
    paidAt: string;
    note?: string | null;
    account?: {
      id: string;
      name: string;
      institution?: string | null;
      currency: string;
    } | null;
  }>;
  viewerRole: 'owner' | 'counterparty';
};
type UpdateInput = InferRequestType<typeof updateEndpoint>['json'];
type AmountInput = InferRequestType<typeof amountEndpoint>['json'];
type UpdateAmountInput = InferRequestType<typeof updateAmountEndpoint>['json'];
type PaymentInput = InferRequestType<typeof paymentEndpoint>['json'];
type UpdatePaymentInput = InferRequestType<
  typeof updatePaymentEndpoint
>['json'];

function RouteComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = Route.useParams();
  const { from } = Route.useSearch();
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [amountDateInput, setAmountDateInput] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [editingAmountId, setEditingAmountId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [editingPaymentId, setEditingPaymentId] = useState('');
  const [editingPaymentAccountId, setEditingPaymentAccountId] = useState('');
  const detailQuery = useQuery({
    queryKey: ['debt', id],
    queryFn: async () => {
      const response = await detailEndpoint({ param: { id } });
      if (!response.ok) throw new Error('debt_load_failed');
      return (await response.json()) as unknown as Detail;
    },
  });
  const financesSummaryQuery = useQuery({
    queryKey: ['finances-summary', 'debt-payment-accounts', 'COP'],
    queryFn: async () => {
      const response = await financesSummaryEndpoint({
        query: { currency: 'COP' },
      });
      if (!response.ok) throw new Error('finance_summary_load_failed');
      return response.json();
    },
  });
  const paymentMutation = useMutation({
    mutationFn: async (input: PaymentInput) => {
      const response = await paymentEndpoint({ param: { id }, json: input });
      if (!response.ok) throw new Error('debt_payment_failed');
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['debt', id] }),
        queryClient.invalidateQueries({ queryKey: ['debts'] }),
        queryClient.invalidateQueries({ queryKey: ['finances-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['finances-movements'] }),
        queryClient.invalidateQueries({ queryKey: ['finances-accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['finances-account'] }),
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
      ]);
      setPaymentAmount('');
      setPaymentNote('');
      setPaymentAccountId('');
    },
  });
  const amountMutation = useMutation({
    mutationFn: async (input: AmountInput) => {
      const response = await amountEndpoint({ param: { id }, json: input });
      if (!response.ok) throw new Error('debt_amount_failed');
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['debt', id] }),
        queryClient.invalidateQueries({ queryKey: ['debts'] }),
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
      ]);
      setAmountInput('');
      setAmountDateInput(new Date().toISOString().slice(0, 10));
    },
  });
  const updateAmountMutation = useMutation({
    mutationFn: async ({
      amountId,
      input,
    }: {
      amountId: string;
      input: UpdateAmountInput;
    }) => {
      const response = await updateAmountEndpoint({
        param: { id, amountId },
        json: input,
      });
      if (!response.ok) throw new Error('debt_amount_update_failed');
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['debt', id] }),
        queryClient.invalidateQueries({ queryKey: ['debts'] }),
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
      ]);
      setEditingAmountId('');
    },
  });
  const updateMutation = useMutation({
    mutationFn: async (input: UpdateInput) => {
      const response = await updateEndpoint({ param: { id }, json: input });
      if (!response.ok) throw new Error('debt_update_failed');
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['debt', id] }),
        queryClient.invalidateQueries({ queryKey: ['debts'] }),
        queryClient.invalidateQueries({ queryKey: ['finances-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['finances-movements'] }),
        queryClient.invalidateQueries({ queryKey: ['finances-accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['finances-account'] }),
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
      ]);
      setIsEditingName(false);
    },
  });
  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const response = await deletePaymentEndpoint({
        param: { id, paymentId },
      });
      if (!response.ok) throw new Error('debt_payment_delete_failed');
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['debt', id] }),
        queryClient.invalidateQueries({ queryKey: ['debts'] }),
        queryClient.invalidateQueries({ queryKey: ['finances-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['finances-movements'] }),
        queryClient.invalidateQueries({ queryKey: ['finances-accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['finances-account'] }),
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
      ]);
    },
  });
  const updatePaymentMutation = useMutation({
    mutationFn: async ({
      paymentId,
      input,
    }: {
      paymentId: string;
      input: UpdatePaymentInput;
    }) => {
      const response = await updatePaymentEndpoint({
        param: { id, paymentId },
        json: input,
      });
      if (!response.ok) throw new Error('debt_payment_update_failed');
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['debt', id] }),
        queryClient.invalidateQueries({ queryKey: ['debts'] }),
        queryClient.invalidateQueries({ queryKey: ['finances-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['finances-movements'] }),
        queryClient.invalidateQueries({ queryKey: ['finances-accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['finances-account'] }),
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
      ]);
      setEditingPaymentId('');
      setEditingPaymentAccountId('');
    },
  });
  const deleteDebtMutation = useMutation({
    mutationFn: async () => {
      const response = await deleteDebtEndpoint({ param: { id } });
      if (!response.ok) throw new Error('debt_delete_failed');
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['debts'] }),
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
      ]);
      await navigate({ to: '/debts', search: { from }, replace: true });
    },
  });
  const detail = detailQuery.data;
  const submitName = () => {
    const nextName = nameInput.trim();
    if (!detail || nextName.length === 0 || nextName === detail.name) {
      setIsEditingName(false);
      return;
    }
    void updateMutation.mutate({ name: nextName });
  };
  const submitPayment = () => {
    const amount = Number(paymentAmount.replace(/[^\d.]/g, ''));
    if (!detail || !Number.isFinite(amount) || amount <= 0) return;
    void paymentMutation.mutate({
      amount,
      ...(paymentAccountId ? { accountId: paymentAccountId } : {}),
      ...(paymentNote.trim() ? { note: paymentNote.trim() } : {}),
    });
  };
  const submitAmount = () => {
    const amount = Number(amountInput.replace(/[^\d.]/g, ''));
    if (!detail || !Number.isFinite(amount) || amount <= 0 || !amountDateInput)
      return;
    void amountMutation.mutate({ amount, loanDate: amountDateInput });
  };
  const paymentAccounts =
    financesSummaryQuery.data?.accounts.filter(
      (account) =>
        account.status !== 'CLOSED' &&
        account.currency === (detail?.currency ?? 'COP'),
    ) ?? [];

  function submitPaymentAccountUpdate() {
    if (!editingPaymentId) return;
    void updatePaymentMutation.mutate({
      paymentId: editingPaymentId,
      input: { accountId: editingPaymentAccountId || null },
    });
  }

  return (
    <MobilePageLayout
      title={m['debts.detailTitle']()}
      onBack={() => navigate({ to: '/debts', search: { from } })}
    >
      {detailQuery.isLoading ? (
        <p className="text-sm text-gray-500">{m['common.loading']()}</p>
      ) : null}
      {detail ? (
        <div className="mx-auto flex w-full max-w-lg flex-col gap-5 pb-5">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              {isEditingName ? (
                <div className="flex flex-col gap-2">
                  <input
                    value={nameInput}
                    onChange={(event) => setNameInput(event.target.value)}
                    placeholder={m['debts.namePlaceholder']()}
                    className="h-12 w-full rounded-2xl border px-4 text-base outline-none focus:border-primary"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      disabled={updateMutation.isPending}
                      onClick={submitName}
                      className="h-10 flex-1 rounded-full"
                    >
                      {m['debts.save']()}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={updateMutation.isPending}
                      onClick={() => setIsEditingName(false)}
                      className="h-10 flex-1 rounded-full"
                    >
                      {m['common.cancel']()}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-semibold">{detail.name}</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {detail.counterpartyName}
                  </p>
                </>
              )}
            </div>
            {detail.viewerRole === 'owner' ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNameInput(detail.name);
                    setIsEditingName(true);
                  }}
                  aria-label={m['debts.edit']()}
                  className="rounded-full border p-2"
                >
                  <HugeiconsIcon icon={Edit02Icon} className="size-5" />
                </button>
                <button
                  type="button"
                  aria-label={m['debts.delete']()}
                  disabled={deleteDebtMutation.isPending}
                  onClick={() => {
                    if (window.confirm(m['debts.deleteConfirm']())) {
                      deleteDebtMutation.mutate();
                    }
                  }}
                  className="rounded-full border border-red-200 p-2 text-red-600"
                >
                  <HugeiconsIcon icon={Delete02Icon} className="size-5" />
                </button>
              </div>
            ) : null}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ['expectedTotal', detail.expectedTotal],
              ['paidAmount', detail.paidAmount],
              ['remainingAmount', detail.remainingAmount],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl bg-gray-50 p-3">
                <p className="text-xs text-gray-500">
                  {m[
                    `debts.${label}` as
                      | 'debts.expectedTotal'
                      | 'debts.paidAmount'
                      | 'debts.remainingAmount'
                  ]()}
                </p>
                <p className="mt-1 font-semibold">
                  {formatCurrency(detail.currency, Number(value))}
                </p>
              </div>
            ))}
          </div>
          <div>
            <div className="mb-2 flex justify-between text-xs text-gray-500">
              <span>
                {detail.direction === 'lent'
                  ? m['debts.lent']()
                  : m['debts.borrowed']()}
              </span>
              <span>
                {m[
                  `debts.${detail.status}` as
                    | 'debts.active'
                    | 'debts.paid'
                    | 'debts.overdue'
                ]()}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${Math.min(100, (detail.paidAmount / detail.expectedTotal) * 100)}%`,
                }}
              />
            </div>
          </div>
          <p className="text-sm text-gray-500">
            {detail.dueDate
              ? new Date(detail.dueDate).toLocaleDateString()
              : m['debts.noDueDate']()}
          </p>
          {detail.viewerRole === 'owner' ? (
            <div className="space-y-3 rounded-3xl border border-gray-100 p-4">
              <h3 className="font-semibold">{m['debts.addAmountTitle']()}</h3>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input
                  value={amountInput}
                  onChange={(event) => setAmountInput(event.target.value)}
                  inputMode="decimal"
                  placeholder={m['debts.amountPlaceholder']()}
                  className="h-12 min-w-0 rounded-2xl border px-4"
                />
                <input
                  type="date"
                  value={amountDateInput}
                  onChange={(event) => setAmountDateInput(event.target.value)}
                  aria-label={m['debts.amountDate']()}
                  className="h-12 w-36 rounded-2xl border px-3 text-sm"
                />
              </div>
              <Button
                type="button"
                disabled={amountMutation.isPending}
                onClick={submitAmount}
                className="h-12 w-full rounded-full"
              >
                {m['debts.saveAmount']()}
              </Button>
            </div>
          ) : null}
          <div>
            <h3 className="font-semibold">{m['debts.amountHistory']()}</h3>
            <div className="mt-3 space-y-2">
              {detail.amounts.map((amount) => (
                <div key={amount.id} className="rounded-2xl border p-3">
                  {editingAmountId === amount.id ? (
                    <div className="grid gap-2">
                      <div className="grid grid-cols-[1fr_auto] gap-2">
                        <input
                          value={amountInput}
                          onChange={(event) =>
                            setAmountInput(event.target.value)
                          }
                          inputMode="decimal"
                          className="h-11 min-w-0 rounded-2xl border px-3"
                        />
                        <input
                          type="date"
                          value={amountDateInput}
                          onChange={(event) =>
                            setAmountDateInput(event.target.value)
                          }
                          aria-label={m['debts.amountDate']()}
                          className="h-11 w-36 rounded-2xl border px-3 text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          disabled={updateAmountMutation.isPending}
                          onClick={() => {
                            const nextAmount = Number(
                              amountInput.replace(/[^\d.]/g, ''),
                            );
                            if (
                              !Number.isFinite(nextAmount) ||
                              nextAmount <= 0 ||
                              !amountDateInput
                            )
                              return;
                            updateAmountMutation.mutate({
                              amountId: amount.id,
                              input: {
                                amount: nextAmount,
                                loanDate: amountDateInput,
                              },
                            });
                          }}
                          className="h-10 rounded-full"
                        >
                          {m['debts.saveAmountChanges']()}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setEditingAmountId('')}
                          className="h-10 rounded-full"
                        >
                          {m['common.cancel']()}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {formatCurrency(detail.currency, amount.amount)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(amount.loanDate).toLocaleDateString()}
                        </p>
                      </div>
                      {detail.viewerRole === 'owner' ? (
                        <button
                          type="button"
                          aria-label={m['debts.editAmount']()}
                          onClick={() => {
                            setEditingAmountId(amount.id);
                            setAmountInput(String(amount.amount));
                            setAmountDateInput(amount.loanDate.slice(0, 10));
                          }}
                          className="rounded-full p-2 text-gray-500"
                        >
                          <HugeiconsIcon icon={Edit02Icon} className="size-4" />
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          {detail.viewerRole === 'owner' && detail.remainingAmount > 0 ? (
            <div className="space-y-3 rounded-3xl border border-gray-100 p-4">
              <h3 className="font-semibold">{m['debts.registerPayment']()}</h3>
              <input
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
                inputMode="decimal"
                placeholder={m['debts.paymentAmountPlaceholder']()}
                className="h-12 w-full rounded-2xl border px-4"
              />
              <input
                value={paymentNote}
                onChange={(event) => setPaymentNote(event.target.value)}
                placeholder={m['debts.paymentNotePlaceholder']()}
                className="h-12 w-full rounded-2xl border px-4"
              />
              <select
                value={paymentAccountId}
                onChange={(event) => setPaymentAccountId(event.target.value)}
                className="h-12 w-full rounded-2xl border px-4"
              >
                <option value="">{m['finances.noAccount']()}</option>
                {paymentAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} · {account.institution ?? account.currency}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                disabled={paymentMutation.isPending}
                onClick={submitPayment}
                className="h-12 w-full rounded-full"
              >
                {m['debts.savePayment']()}
              </Button>
            </div>
          ) : null}
          <div>
            <h3 className="font-semibold">{m['debts.payments']()}</h3>
            {detail.payments.length ? (
              <div className="mt-3 space-y-2">
                {detail.payments.map((payment) => {
                  const isEditingPayment = editingPaymentId === payment.id;
                  return (
                    <div key={payment.id} className="rounded-2xl border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium">
                            {formatCurrency(detail.currency, payment.amount)}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {new Date(payment.paidAt).toLocaleDateString()}
                            {payment.note ? ` · ${payment.note}` : ''}
                            {payment.account
                              ? ` · ${payment.account.name}`
                              : ''}
                          </p>
                        </div>
                        {detail.viewerRole === 'owner' ? (
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPaymentId(payment.id);
                                setEditingPaymentAccountId(
                                  payment.accountId ?? '',
                                );
                              }}
                              aria-label={m['debts.editPaymentAccount']()}
                            >
                              <HugeiconsIcon
                                icon={Edit02Icon}
                                className="size-4 text-gray-500"
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                deletePaymentMutation.mutate(payment.id)
                              }
                              aria-label={m['common.delete']()}
                            >
                              <HugeiconsIcon
                                icon={Delete02Icon}
                                className="size-4 text-gray-500"
                              />
                            </button>
                          </div>
                        ) : null}
                      </div>
                      {isEditingPayment ? (
                        <div className="mt-3 grid gap-2">
                          <select
                            value={editingPaymentAccountId}
                            onChange={(event) =>
                              setEditingPaymentAccountId(event.target.value)
                            }
                            className="h-11 w-full rounded-2xl border px-3 text-sm"
                          >
                            <option value="">
                              {m['finances.noAccount']()}
                            </option>
                            {paymentAccounts.map((account) => (
                              <option key={account.id} value={account.id}>
                                {account.name} ·{' '}
                                {account.institution ?? account.currency}
                              </option>
                            ))}
                          </select>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              type="button"
                              disabled={updatePaymentMutation.isPending}
                              onClick={submitPaymentAccountUpdate}
                              className="h-10 rounded-full"
                            >
                              {m['common.saveChanges']()}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              disabled={updatePaymentMutation.isPending}
                              onClick={() => {
                                setEditingPaymentId('');
                                setEditingPaymentAccountId('');
                              }}
                              className="h-10 rounded-full"
                            >
                              {m['common.cancel']()}
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-500">
                {m['debts.noPayments']()}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </MobilePageLayout>
  );
}
