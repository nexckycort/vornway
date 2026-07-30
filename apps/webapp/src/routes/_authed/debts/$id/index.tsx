import { Delete02Icon, Edit02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { debtsClient } from '#/api/debts';
import type { InferRequestType } from '#/api/types';
import { MobilePageLayout } from '#/components/mobile-page-layout';
import { Button } from '#/components/ui/button';
import { formatCurrency } from '#/lib/i18n';
import { m } from '#/paraglide/messages.js';

export const Route = createFileRoute('/_authed/debts/$id/')({
  component: RouteComponent,
});
const detailEndpoint = debtsClient[':id'].$get;
const paymentEndpoint = debtsClient[':id'].payments.$post;
const deletePaymentEndpoint = debtsClient[':id'].payments[':paymentId'].$delete;
const deleteDebtEndpoint = debtsClient[':id'].$delete;
type Detail = {
  id: string;
  counterpartyName: string;
  counterpartyId?: string | null;
  direction: 'lent' | 'borrowed';
  principalAmount: number;
  expectedTotal: number;
  paidAmount: number;
  remainingAmount: number;
  currency: string;
  dueDate: string | null;
  status: 'active' | 'paid' | 'overdue';
  payments: Array<{
    id: string;
    amount: number;
    paidAt: string;
    note?: string | null;
  }>;
  viewerRole: 'owner' | 'counterparty';
};
type PaymentInput = InferRequestType<typeof paymentEndpoint>['json'];

function RouteComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = Route.useParams();
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const detailQuery = useQuery({
    queryKey: ['debt', id],
    queryFn: async () => {
      const response = await detailEndpoint({ param: { id } });
      if (!response.ok) throw new Error('debt_load_failed');
      return (await response.json()) as unknown as Detail;
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
      ]);
      setPaymentAmount('');
      setPaymentNote('');
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
      await queryClient.invalidateQueries({ queryKey: ['debt', id] });
      await queryClient.invalidateQueries({ queryKey: ['debts'] });
    },
  });
  const deleteDebtMutation = useMutation({
    mutationFn: async () => {
      const response = await deleteDebtEndpoint({ param: { id } });
      if (!response.ok) throw new Error('debt_delete_failed');
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['debts'] });
      await navigate({ to: '/debts', replace: true });
    },
  });
  const detail = detailQuery.data;
  const submitPayment = () => {
    const amount = Number(paymentAmount.replace(/[^\d.]/g, ''));
    if (!detail || !Number.isFinite(amount) || amount <= 0) return;
    void paymentMutation.mutate({
      amount,
      ...(paymentNote.trim() ? { note: paymentNote.trim() } : {}),
    });
  };

  return (
    <MobilePageLayout
      title={m['debts.detailTitle']()}
      onBack={() => navigate({ to: '/debts' })}
    >
      {detailQuery.isLoading ? (
        <p className="text-sm text-gray-500">{m['common.loading']()}</p>
      ) : null}
      {detail ? (
        <div className="mx-auto flex w-full max-w-lg flex-col gap-5 pb-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-semibold">
                {m['debts.detailTitle']()}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {detail.counterpartyName}
              </p>
            </div>
            {detail.viewerRole === 'owner' ? (
              <div className="flex gap-2">
                <button
                  type="button"
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
                {detail.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-2xl border p-3"
                  >
                    <div>
                      <p className="font-medium">
                        {formatCurrency(detail.currency, payment.amount)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(payment.paidAt).toLocaleDateString()}
                        {payment.note ? ` · ${payment.note}` : ''}
                      </p>
                    </div>
                    {detail.viewerRole === 'owner' ? (
                      <button
                        type="button"
                        onClick={() => deletePaymentMutation.mutate(payment.id)}
                        aria-label={m['common.delete']()}
                      >
                        <HugeiconsIcon
                          icon={Delete02Icon}
                          className="size-4 text-gray-500"
                        />
                      </button>
                    ) : null}
                  </div>
                ))}
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
