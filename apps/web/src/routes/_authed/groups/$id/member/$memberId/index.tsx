import { useQuery } from '@tanstack/react-query';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { ChevronLeft, Pin, ReceiptText } from 'lucide-react';

import { formatMoney } from '~/lib/money';

import { getMemberExpenses } from './-actions/get-member-expenses';

export const Route = createFileRoute('/_authed/groups/$id/member/$memberId/')({
  component: RouteComponent,
});

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

function RouteComponent() {
  const { id: groupId, memberId } = Route.useParams();
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ['group-member-expenses', groupId, memberId],
    queryFn: () => getMemberExpenses({ data: { groupId, memberId } }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f3fa] flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#f5f3fa] flex flex-col items-center justify-center p-6">
        <p className="mb-6 text-gray-500">
          {error instanceof Error
            ? error.message
            : 'No se pudo cargar el detalle'}
        </p>
        <button
          type="button"
          onClick={() =>
            router.navigate({
              to: '/groups/$id',
              params: { id: groupId },
              replace: true,
            })
          }
          className="rounded-xl bg-[#4040b0] px-6 py-3 text-white"
        >
          Volver al grupo
        </button>
      </div>
    );
  }

  const balanceEntries = Object.entries(data.balances).filter(
    ([, amount]) => Math.abs(amount) >= 1,
  );

  return (
    <div className="min-h-screen bg-[#f5f3fa] pb-10">
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.history.back()}
            className="flex h-10 w-10 items-center justify-center"
          >
            <ChevronLeft className="h-6 w-6 text-[#1a1a3e]" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold text-[#1a1a3e]">
              {data.member.name}
              {data.member.isCurrentUser ? ' (Tú)' : ''}
            </h1>
            <p className="text-sm text-gray-500">{data.groupName}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            Balance de esta persona
          </p>
          {balanceEntries.length === 0 ? (
            <p className="text-lg font-semibold text-[#1a1a3e]">Sin saldo</p>
          ) : (
            <div className="space-y-1">
              {balanceEntries.map(([currency, amount]) => (
                <p
                  key={currency}
                  className={`text-lg font-semibold ${
                    amount > 0 ? 'text-green-600' : 'text-red-500'
                  }`}
                >
                  {amount > 0 ? '+' : ''}
                  {formatMoney(amount, currency)}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-4">
        <h2 className="mb-3 text-lg font-semibold text-[#1a1a3e]">
          Gastos donde participa
        </h2>

        {data.expenses.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center text-gray-500">
            No hay gastos para este participante
          </div>
        ) : (
          <div className="space-y-3">
            {data.expenses.map((expense) => (
              <button
                key={expense.id}
                type="button"
                onClick={() =>
                  router.navigate({
                    to: '/groups/$id/expense/$expenseId',
                    params: { id: groupId, expenseId: expense.id },
                  })
                }
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-4 text-left"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${
                      expense.isSettlement
                        ? 'bg-emerald-100'
                        : expense.expenseType === 'composite'
                          ? 'bg-blue-100'
                          : 'bg-[#f0f0ff]'
                    }`}
                  >
                    <span className="text-lg">
                      {expense.isSettlement
                        ? '🤝'
                        : expense.expenseType === 'composite'
                          ? '🧾'
                          : '💰'}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {expense.isPinned ? (
                        <Pin className="h-3.5 w-3.5 fill-current text-amber-500" />
                      ) : null}
                      <p className="truncate font-medium text-[#1a1a3e]">
                        {expense.description}
                      </p>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {expense.expenseType === 'composite' &&
                      !expense.isSettlement ? (
                        <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                          {expense.subExpenseCount} subgasto
                          {expense.subExpenseCount === 1 ? '' : 's'}
                        </span>
                      ) : null}
                      {expense.isSettlement ? (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          Liquidación
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-2 text-sm text-gray-500">
                      {formatDate(expense.date)}
                      {expense.participantCount > 0 &&
                        ` · ${expense.participantCount} participantes`}
                    </p>
                    <p className="text-sm text-gray-500">
                      Pagó: {expense.paidBy.name}
                    </p>
                    <p className="mt-1 text-sm font-medium text-[#1a1a3e]">
                      {expense.isTargetPayer
                        ? 'Esta persona pagó este gasto'
                        : expense.targetShare !== null
                          ? `Participa con ${formatMoney(expense.targetShare, expense.currency)}`
                          : 'Participa en este gasto'}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-[#1a1a3e]">
                      {formatMoney(expense.amount, expense.currency)}
                    </p>
                    {expense.expenseType === 'composite' ? (
                      <ReceiptText className="ml-auto mt-2 h-4 w-4 text-blue-500" />
                    ) : null}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
