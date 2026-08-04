import {
  Add01Icon,
  ArrowLeftIcon,
  Delete02Icon,
  Edit02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { debtsClient } from '#/api/debts';
import type { InferRequestType, InferResponseType } from '#/api/types';
import { MobilePageLayout } from '#/components/mobile-page-layout';
import { Button } from '#/components/ui/button';
import { formatCurrency } from '#/lib/i18n';
import { m } from '#/paraglide/messages.js';
import { useUserSearchQuery } from '#/routes/_authed/groups/-hooks/use-user-search-query';

export const Route = createFileRoute('/_authed/debts/')({
  validateSearch: (search: Record<string, unknown>) => ({
    from: search.from === 'finances' ? ('finances' as const) : undefined,
  }),
  component: RouteComponent,
});

const listEndpoint = debtsClient.index.$get;
const createEndpoint = debtsClient.index.$post;
const detailEndpoint = debtsClient[':id'].$get;
const updateEndpoint = debtsClient[':id'].$patch;
const paymentEndpoint = debtsClient[':id'].payments.$post;
const deletePaymentEndpoint = debtsClient[':id'].payments[':paymentId'].$delete;
type Debt = InferResponseType<typeof listEndpoint>[number];
type DebtPayment = {
  id: string;
  amount: number;
  paidAt: string;
  note?: string | null;
};
type DebtDetail = Debt & {
  payments: DebtPayment[];
  expectedTotal: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string | null;
  status: 'active' | 'paid' | 'overdue';
};
type CreateDebt = InferRequestType<typeof createEndpoint>['json'];
type UpdateDebt = InferRequestType<typeof updateEndpoint>['json'];
type CreatePayment = InferRequestType<typeof paymentEndpoint>['json'];

function RouteComponent() {
  const navigate = useNavigate();
  const { from } = Route.useSearch();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [debtName, setDebtName] = useState('');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<'lent' | 'borrowed'>('lent');
  const [interest, setInterest] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [counterpartyId, setCounterpartyId] = useState<string | undefined>();
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const userSearch = useUserSearchQuery(name);

  const debtsQuery = useQuery({
    queryKey: ['debts'],
    queryFn: async () => {
      const response = await listEndpoint({ query: { status: 'all' } });
      if (!response.ok) throw new Error('debt_load_failed');
      return response.json();
    },
  });
  const detailQuery = useQuery({
    queryKey: ['debt', selectedDebtId],
    enabled: Boolean(selectedDebtId),
    queryFn: async () => {
      const response = await detailEndpoint({
        param: { id: selectedDebtId ?? '' },
      });
      if (!response.ok) throw new Error('debt_load_failed');
      return response.json();
    },
  });
  const createMutation = useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string | null;
      input: CreateDebt | UpdateDebt;
    }) => {
      const response = id
        ? await updateEndpoint({ param: { id }, json: input as UpdateDebt })
        : await createEndpoint({ json: input as CreateDebt });
      if (!response.ok) throw new Error('debt_create_failed');
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['debts'] }),
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
      ]);
      closeCreateForm();
    },
  });
  const paymentMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: CreatePayment }) => {
      const response = await paymentEndpoint({ param: { id }, json: input });
      if (!response.ok) throw new Error('debt_payment_failed');
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['debts'] }),
        queryClient.invalidateQueries({ queryKey: ['debt', selectedDebtId] }),
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
      ]);
      setPaymentAmount('');
      setPaymentNote('');
      setShowPaymentForm(false);
    },
  });
  const deletePaymentMutation = useMutation({
    mutationFn: async ({
      id,
      paymentId,
    }: {
      id: string;
      paymentId: string;
    }) => {
      const response = await deletePaymentEndpoint({
        param: { id, paymentId },
      });
      if (!response.ok) throw new Error('debt_payment_delete_failed');
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['debts'] }),
        queryClient.invalidateQueries({ queryKey: ['debt', selectedDebtId] }),
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
      ]);
    },
  });

  function closeCreateForm() {
    setShowForm(false);
    setDebtName('');
    setName('');
    setAmount('');
    setInterest('');
    setDueDate('');
    setDescription('');
    setEditingDebtId(null);
    setCounterpartyId(undefined);
  }
  function submit() {
    const principalAmount = Number(amount.replace(/[^\d.]/g, ''));
    if (
      !debtName.trim() ||
      !name.trim() ||
      !Number.isFinite(principalAmount) ||
      principalAmount <= 0
    )
      return;
    void createMutation.mutate({
      id: editingDebtId,
      input: {
        name: debtName.trim(),
        counterpartyName: name.trim(),
        ...(counterpartyId ? { counterpartyId } : {}),
        direction,
        principalAmount,
        currency: 'COP',
        interestType: interest ? 'percentage' : 'none',
        ...(interest ? { interestValue: Number(interest) } : {}),
        ...(dueDate ? { dueDate } : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
      },
    });
  }
  function submitPayment() {
    if (!selectedDebtId) return;
    const amountValue = Number(paymentAmount.replace(/[^\d.]/g, ''));
    if (!Number.isFinite(amountValue) || amountValue <= 0) return;
    void paymentMutation.mutate({
      id: selectedDebtId,
      input: {
        amount: amountValue,
        ...(paymentNote.trim() ? { note: paymentNote.trim() } : {}),
      },
    });
  }
  const detail = detailQuery.data as unknown as DebtDetail | undefined;
  const backTo = from === 'finances' ? '/finances' : '/';

  return (
    <MobilePageLayout
      title={m['debts.title']()}
      onBack={() => navigate({ to: backTo })}
    >
      <div className="flex flex-1 flex-col gap-4 pb-28">
        <Button
          type="button"
          onClick={() =>
            navigate({
              to: '/debts/new',
              search: { from },
            })
          }
          className="h-12 rounded-full"
        >
          <HugeiconsIcon icon={Add01Icon} className="mr-2 size-4" />
          {m['debts.create']()}
        </Button>
        {debtsQuery.isLoading ? (
          <p className="text-sm text-gray-500">{m['common.loading']()}</p>
        ) : null}
        {debtsQuery.data?.map((debt: Debt) => (
          <button
            key={debt.id}
            type="button"
            onClick={() =>
              navigate({
                to: '/debts/$id',
                params: { id: debt.id },
                search: { from },
              })
            }
            className="rounded-[24px] border border-gray-200 bg-white p-4 text-left shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold">{debt.name}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {debt.counterpartyName} ·{' '}
                  {debt.direction === 'lent'
                    ? m['debts.lent']()
                    : m['debts.borrowed']()}
                </p>
              </div>
              <p className="font-semibold">
                {formatCurrency(debt.currency, debt.remainingAmount)}
              </p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${Math.min(100, (debt.paidAmount / debt.expectedTotal) * 100)}%`,
                }}
              />
            </div>
          </button>
        ))}
      </div>

      {showForm ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/30">
          <div className="w-full rounded-t-[32px] bg-white p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
            <button
              type="button"
              onClick={closeCreateForm}
              aria-label={m['common.close']()}
            >
              <HugeiconsIcon icon={ArrowLeftIcon} />
            </button>
            <h2 className="mt-3 text-xl font-semibold">
              {editingDebtId ? m['debts.edit']() : m['debts.newTitle']()}
            </h2>
            <div className="mt-4 space-y-3">
              <input
                value={debtName}
                onChange={(e) => setDebtName(e.target.value)}
                placeholder={m['debts.namePlaceholder']()}
                className="h-12 w-full rounded-2xl border px-4"
              />
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setCounterpartyId(undefined);
                }}
                placeholder={m['debts.personPlaceholder']()}
                className="h-12 w-full rounded-2xl border px-4"
              />
              {userSearch.data?.data?.length && !counterpartyId ? (
                <div className="rounded-2xl border bg-white p-2 shadow-sm">
                  {userSearch.data.data.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setCounterpartyId(user.id);
                        setName(user.name);
                      }}
                      className="flex w-full items-center justify-between rounded-xl p-2 text-left hover:bg-gray-50"
                    >
                      <span className="font-medium">{user.name}</span>
                      <span className="text-xs text-gray-500">
                        {user.username ?? user.email}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder={m['debts.amountPlaceholder']()}
                className="h-12 w-full rounded-2xl border px-4"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDirection('lent')}
                  className={`rounded-2xl border p-3 ${direction === 'lent' ? 'border-primary bg-primary/5' : ''}`}
                >
                  {m['debts.lent']()}
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('borrowed')}
                  className={`rounded-2xl border p-3 ${direction === 'borrowed' ? 'border-primary bg-primary/5' : ''}`}
                >
                  {m['debts.borrowed']()}
                </button>
              </div>
              <input
                value={interest}
                onChange={(e) => setInterest(e.target.value)}
                inputMode="decimal"
                placeholder={m['debts.interestPlaceholder']()}
                className="h-12 w-full rounded-2xl border px-4"
              />
              <input
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                type="date"
                className="h-12 w-full rounded-2xl border px-4"
              />
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={m['debts.descriptionPlaceholder']()}
                className="h-12 w-full rounded-2xl border px-4"
              />
              <Button
                type="button"
                disabled={createMutation.isPending}
                onClick={submit}
                className="h-12 w-full rounded-full"
              >
                {m['debts.save']()}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {detail ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/30">
          <div className="max-h-[90dvh] w-full overflow-y-auto rounded-t-[32px] bg-white p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
            <button
              type="button"
              onClick={() => {
                setSelectedDebtId(null);
                setShowPaymentForm(false);
              }}
              aria-label={m['common.close']()}
            >
              <HugeiconsIcon icon={ArrowLeftIcon} />
            </button>
            <div className="mt-3 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold">{detail.name}</h2>
                <p className="text-sm text-gray-500">
                  {detail.counterpartyName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {detail.viewerRole === 'owner' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDebtId(detail.id);
                      setDebtName(detail.name);
                      setName(detail.counterpartyName);
                      setAmount(String(detail.principalAmount));
                      setDirection(detail.direction as 'lent' | 'borrowed');
                      setInterest(
                        detail.interestType === 'percentage'
                          ? String(detail.interestValue ?? '')
                          : '',
                      );
                      setDueDate(
                        detail.dueDate ? detail.dueDate.slice(0, 10) : '',
                      );
                      setDescription(detail.description ?? '');
                      setCounterpartyId(detail.counterpartyId ?? undefined);
                      setSelectedDebtId(null);
                      setShowForm(true);
                    }}
                    aria-label={m['debts.edit']()}
                  >
                    <HugeiconsIcon icon={Edit02Icon} className="size-4" />
                  </button>
                ) : null}
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium">
                  {m[
                    `debts.${detail.status}` as
                      | 'debts.active'
                      | 'debts.paid'
                      | 'debts.overdue'
                  ]()}
                </span>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-gray-50 p-3">
                <p className="text-xs text-gray-500">
                  {m['debts.expectedTotal']()}
                </p>
                <p className="mt-1 font-semibold">
                  {formatCurrency(detail.currency, detail.expectedTotal)}
                </p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-3">
                <p className="text-xs text-gray-500">
                  {m['debts.paidAmount']()}
                </p>
                <p className="mt-1 font-semibold">
                  {formatCurrency(detail.currency, detail.paidAmount)}
                </p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-3">
                <p className="text-xs text-gray-500">
                  {m['debts.remainingAmount']()}
                </p>
                <p className="mt-1 font-semibold">
                  {formatCurrency(detail.currency, detail.remainingAmount)}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              {detail.dueDate
                ? new Date(detail.dueDate).toLocaleDateString()
                : m['debts.noDueDate']()}
            </p>
            {detail.viewerRole === 'owner' ? (
              <Button
                type="button"
                onClick={() => setShowPaymentForm((value) => !value)}
                disabled={detail.remainingAmount <= 0}
                className="mt-4 h-12 w-full rounded-full"
              >
                {m['debts.registerPayment']()}
              </Button>
            ) : null}
            {detail.viewerRole === 'owner' && showPaymentForm ? (
              <div className="mt-3 space-y-3 rounded-2xl bg-gray-50 p-3">
                <input
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder={m['debts.paymentAmountPlaceholder']()}
                  className="h-12 w-full rounded-2xl border bg-white px-4"
                />
                <input
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder={m['debts.paymentNotePlaceholder']()}
                  className="h-12 w-full rounded-2xl border bg-white px-4"
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
            <h3 className="mt-6 font-semibold">{m['debts.payments']()}</h3>
            {detail.payments.length ? (
              <div className="mt-2 space-y-2">
                {detail.payments.map((payment: DebtPayment) => (
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
                        onClick={() =>
                          deletePaymentMutation.mutate({
                            id: detail.id,
                            paymentId: payment.id,
                          })
                        }
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
