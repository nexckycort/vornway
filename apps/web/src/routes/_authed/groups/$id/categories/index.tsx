import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { ChevronLeft, FolderPlus, ReceiptText } from 'lucide-react';
import { useState } from 'react';

import { formatMoney } from '~/lib/money';

import { createExpenseCategory } from '../-actions/create-expense-category';
import { getCategoryBreakdown } from '../-actions/get-category-breakdown';

export const Route = createFileRoute('/_authed/groups/$id/categories/')({
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
  const { id: groupId } = Route.useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [categoryName, setCategoryName] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['category-breakdown', groupId],
    queryFn: () => getCategoryBreakdown({ data: { groupId } }),
  });

  const createCategoryMutation = useMutation({
    mutationFn: createExpenseCategory,
    onSuccess: (result) => {
      if (result.success) {
        setCategoryName('');
        queryClient.invalidateQueries({ queryKey: ['category-breakdown', groupId] });
        queryClient.invalidateQueries({ queryKey: ['group-categories', groupId] });
      }
    },
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
            : 'No se pudieron cargar las categorías'}
        </p>
        <button
          type="button"
          onClick={() => router.history.back()}
          className="rounded-xl bg-[#4040b0] px-6 py-3 text-white"
        >
          Volver
        </button>
      </div>
    );
  }

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
          <div>
            <h1 className="text-xl font-semibold text-[#1a1a3e]">
              Gastos por categoría
            </h1>
            <p className="text-sm text-gray-500">{data.groupName}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-[#4040b0]" />
            <h2 className="font-semibold text-[#1a1a3e]">Nueva categoría</h2>
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
              placeholder="Ej. Transporte, Comida, Hospedaje"
              className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-[#1a1a3e] placeholder:text-gray-400"
            />
            <button
              type="button"
              onClick={() =>
                createCategoryMutation.mutate({
                  data: {
                    groupId,
                    name: categoryName,
                  },
                })
              }
              disabled={!categoryName.trim() || createCategoryMutation.isPending}
              className="rounded-xl bg-[#4040b0] px-4 py-3 font-medium text-white disabled:bg-gray-200 disabled:text-gray-400"
            >
              Crear
            </button>
          </div>

          {createCategoryMutation.data?.error ? (
            <p className="mt-3 text-sm text-red-500">
              {createCategoryMutation.data.error}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-5 px-4">
        {data.categories.map((category) => (
          <section key={category.id ?? 'uncategorized'}>
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[#1a1a3e]">
                  {category.name}
                </h2>
                <p className="text-sm text-gray-500">
                  {category.expenseCount} gasto
                  {category.expenseCount === 1 ? '' : 's'}
                </p>
              </div>
              <div className="text-right">
                {Object.entries(category.totals).map(([currency, amount]) => (
                  <p key={currency} className="font-semibold text-[#1a1a3e]">
                    {formatMoney(amount, currency)}
                  </p>
                ))}
              </div>
            </div>

            {category.expenses.length === 0 ? (
              <div className="rounded-2xl bg-white p-4 text-sm text-gray-500">
                Sin gastos en esta categoría
              </div>
            ) : (
              <div className="space-y-3">
                {category.expenses.map((expense) => (
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
                        className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                          expense.expenseType === 'composite'
                            ? 'bg-blue-100'
                            : 'bg-[#f0f0ff]'
                        }`}
                      >
                        <span className="text-lg">
                          {expense.expenseType === 'composite' ? '🧾' : '💰'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-[#1a1a3e]">
                          {expense.description}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {formatDate(expense.date)} · Pagó {expense.paidByName}
                        </p>
                        {expense.expenseType === 'composite' ? (
                          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                            <ReceiptText className="h-3 w-3" />
                            {expense.subExpenseCount} subgasto
                            {expense.subExpenseCount === 1 ? '' : 's'}
                          </div>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-[#1a1a3e]">
                          {formatMoney(expense.amount, expense.currency)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
