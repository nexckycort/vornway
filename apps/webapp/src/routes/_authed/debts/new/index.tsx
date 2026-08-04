import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { debtsClient } from '#/api/debts';
import type { InferRequestType } from '#/api/types';
import { MobilePageLayout } from '#/components/mobile-page-layout';
import { Button } from '#/components/ui/button';
import { m } from '#/paraglide/messages.js';
import { useUserSearchQuery } from '#/routes/_authed/groups/-hooks/use-user-search-query';

export const Route = createFileRoute('/_authed/debts/new/')({
  validateSearch: (search: Record<string, unknown>) => ({
    from: search.from === 'finances' ? ('finances' as const) : undefined,
  }),
  component: RouteComponent,
});

const createEndpoint = debtsClient.index.$post;
type CreateDebt = InferRequestType<typeof createEndpoint>['json'];

function RouteComponent() {
  const navigate = useNavigate();
  const { from } = Route.useSearch();
  const queryClient = useQueryClient();
  const [debtName, setDebtName] = useState('');
  const [name, setName] = useState('');
  const [counterpartyId, setCounterpartyId] = useState<string>();
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<'lent' | 'borrowed'>('lent');
  const [interest, setInterest] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const searchQuery = useUserSearchQuery(name);
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
      await navigate({ to: '/debts', search: { from }, replace: true });
    },
  });

  const submit = () => {
    const principalAmount = Number(amount.replace(/[^\d.]/g, ''));
    if (
      !debtName.trim() ||
      !name.trim() ||
      !Number.isFinite(principalAmount) ||
      principalAmount <= 0
    )
      return;
    void createMutation.mutate({
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
    });
  };

  return (
    <MobilePageLayout
      title={m['debts.newTitle']()}
      onBack={() => navigate({ to: '/debts', search: { from } })}
      footer={
        <Button
          type="button"
          disabled={createMutation.isPending}
          onClick={submit}
          className="h-12 w-full rounded-full"
        >
          {m['debts.save']()}
        </Button>
      }
    >
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 pb-4">
        <div>
          <p className="text-2xl font-semibold text-gray-900">
            {m['debts.newTitle']()}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {m['debts.namePlaceholder']()}
          </p>
        </div>
        <input
          value={debtName}
          onChange={(event) => setDebtName(event.target.value)}
          placeholder={m['debts.namePlaceholder']()}
          className="h-14 w-full rounded-2xl border border-gray-200 bg-white px-4 text-base outline-none focus:border-primary"
        />
        <div className="relative">
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setCounterpartyId(undefined);
            }}
            placeholder={m['debts.personPlaceholder']()}
            className="h-14 w-full rounded-2xl border border-gray-200 bg-white px-4 text-base outline-none focus:border-primary"
          />
          {searchQuery.data?.data?.length && !counterpartyId ? (
            <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-10 rounded-2xl border border-gray-100 bg-white p-2 shadow-xl">
              {searchQuery.data.data.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => {
                    setCounterpartyId(user.id);
                    setName(user.name);
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
        <input
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          inputMode="decimal"
          placeholder={m['debts.amountPlaceholder']()}
          className="h-14 w-full rounded-2xl border border-gray-200 px-4 text-base outline-none focus:border-primary"
        />
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setDirection('lent')}
            className={`min-h-14 rounded-2xl border px-3 text-sm ${direction === 'lent' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
          >
            {m['debts.lent']()}
          </button>
          <button
            type="button"
            onClick={() => setDirection('borrowed')}
            className={`min-h-14 rounded-2xl border px-3 text-sm ${direction === 'borrowed' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
          >
            {m['debts.borrowed']()}
          </button>
        </div>
        <input
          value={interest}
          onChange={(event) => setInterest(event.target.value)}
          inputMode="decimal"
          placeholder={m['debts.interestPlaceholder']()}
          className="h-14 w-full rounded-2xl border border-gray-200 px-4 text-base outline-none focus:border-primary"
        />
        <input
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
          type="date"
          className="h-14 w-full rounded-2xl border border-gray-200 px-4 text-base outline-none focus:border-primary"
        />
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={m['debts.descriptionPlaceholder']()}
          rows={3}
          className="w-full resize-none rounded-2xl border border-gray-200 px-4 py-3 text-base outline-none focus:border-primary"
        />
      </div>
    </MobilePageLayout>
  );
}
