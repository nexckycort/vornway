import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import {
  ChevronLeft,
  HandCoins,
  Pencil,
  Pizza,
  ReceiptText,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { AppDrawer } from '~/components/app-drawer';

import type { CompositeExpenseItem } from '~/lib/expense-metadata';

import { deleteExpense } from '../../-actions/delete-expense';
import { getExpense } from '../../-actions/get-expense';

export const Route = createFileRoute('/_authed/groups/$id/expense/$expenseId/')(
  {
    component: RouteComponent,
  },
);

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const time = new Date(date).getTime();
  const diffMs = now - time;

  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return 'Hace un momento';
  if (minutes < 60) {
    return `Hace ${minutes} minuto${minutes === 1 ? '' : 's'}`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Hace ${hours} hora${hours === 1 ? '' : 's'}`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `Hace ${days} día${days === 1 ? '' : 's'}`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `Hace ${months} mes${months === 1 ? '' : 'es'}`;
  }

  const years = Math.floor(days / 365);
  return `Hace ${years} año${years === 1 ? '' : 's'}`;
}

function formatAbsoluteDate(date: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

function RouteComponent() {
  const { id: groupId, expenseId } = Route.useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['expense', groupId, expenseId],
    queryFn: () => getExpense({ data: { groupId, expenseId } }),
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: deleteExpense,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['group', groupId] });
        queryClient.invalidateQueries({
          queryKey: ['expense', groupId, expenseId],
        });
        setShowDeleteModal(false);
        router.history.back();
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
        <p className="text-gray-500 mb-6">
          {error instanceof Error
            ? error.message
            : 'No se pudo cargar el gasto'}
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
          className="px-6 py-3 bg-[#4040b0] text-white rounded-xl"
        >
          Volver al grupo
        </button>
      </div>
    );
  }

  const splitParticipants = data.participants.filter(
    (participant) => participant.memberId !== data.paidBy.memberId,
  );
  const compositeItems = data.compositeItems;

  return (
    <div className="min-h-screen bg-[#f5f3fa] pb-32">
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.history.back()}
            className="w-10 h-10 flex items-center justify-center"
          >
            <ChevronLeft className="w-6 h-6 text-[#1a1a3e]" />
          </button>
          <h1 className="text-xl font-semibold text-[#1a1a3e]">
            {data.isSettlement ? 'Detalle de liquidación' : 'Detalle de gastos'}
          </h1>
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="bg-white rounded-3xl p-6 shadow-sm text-center">
          <div className="w-14 h-14 bg-[#f0f4ff] rounded-2xl flex items-center justify-center mx-auto mb-2">
            {data.isSettlement ? (
              <HandCoins className="w-7 h-7 text-[#2f8f5b]" />
            ) : (
              <Pizza className="w-7 h-7 text-[#5b7090]" />
            )}
          </div>
          <p className="text-gray-500 mb-1">{data.description}</p>
          <div className="flex flex-col items-center gap-1 mb-4 sm:flex-row sm:justify-center sm:gap-2">
            <p className="text-4xl sm:text-5xl font-bold text-[#2b2d33] leading-none">
              ${formatCurrency(data.amount)}
            </p>
            <p className="text-2xl sm:text-4xl font-semibold text-[#4a4a4a] leading-none">
              {data.currency}
            </p>
          </div>
          {data.isDeleted ? (
            <p className="text-sm text-red-500 mb-2">
              {data.isSettlement
                ? 'Esta liquidación fue eliminada (se conserva por historial)'
                : 'Este gasto fue eliminado (se conserva por historial)'}
            </p>
          ) : null}
          {!data.isSettlement && data.expenseType === 'composite' ? (
            <p className="mb-2 text-sm text-blue-600">
              Bolsa de gastos con {compositeItems.length} movimiento
              {compositeItems.length === 1 ? '' : 's'}
            </p>
          ) : null}
          <p className="text-gray-500">{formatRelativeTime(data.date)}</p>
        </div>
      </div>

      <div className="px-4 space-y-5">
        {!data.isSettlement && data.expenseType === 'composite' ? (
          <section>
            <h3 className="text-2xl font-semibold text-[#474747] mb-3">
              Subgastos
            </h3>
            <div className="space-y-3">
              {compositeItems.length === 0 ? (
                <div className="bg-white rounded-2xl px-4 py-4 border border-gray-100">
                  <p className="text-gray-500">Sin subgastos registrados</p>
                </div>
              ) : (
                compositeItems.map((item: CompositeExpenseItem) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl px-4 py-3 border border-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-[#eef3ff] rounded-xl flex items-center justify-center flex-shrink-0">
                        <ReceiptText className="w-5 h-5 text-[#4040b0]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#1a1a3e] truncate">
                          {item.description}
                        </p>
                        <p className="text-[#7a7a7a] text-sm">
                          {formatAbsoluteDate(item.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#3a3a3a] text-lg">
                          ${formatCurrency(item.amount)} {data.currency}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        ) : null}

        <section>
          <h3 className="text-2xl font-semibold text-[#474747] mb-3">
            {data.isSettlement ? 'Liquidado por' : 'Pagado por'}
          </h3>
          <div className="bg-white rounded-2xl px-4 py-3 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-[#eef3f8] rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-[#3f647f] font-bold text-lg">
                  {data.paidBy.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#1a1a3e] truncate">
                  {data.paidBy.name}
                  {data.paidBy.isCurrentUser ? ' (Tu)' : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-[#3a3a3a] text-lg">
                  ${formatCurrency(data.amount)} {data.currency}
                </p>
                <p className="text-[#7a7a7a] text-sm">
                  {data.isSettlement ? 'Pago aplicado' : 'Sin deudas'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-2xl font-semibold text-[#474747] mb-3">
            {data.isSettlement ? 'A favor de' : 'Se divide con'}
          </h3>
          <div className="space-y-3">
            {splitParticipants.length === 0 ? (
              <div className="bg-white rounded-2xl px-4 py-4 border border-gray-100">
                <p className="text-gray-500">
                  {data.isSettlement
                    ? 'Sin receptor de liquidación'
                    : 'Gasto personal'}
                </p>
              </div>
            ) : (
              splitParticipants.map((participant) => (
                <div
                  key={participant.memberId}
                  className="bg-white rounded-2xl px-4 py-3 border border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-[#eef3f8] rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-[#3f647f] font-bold text-lg">
                        {participant.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#1a1a3e] truncate">
                        {participant.name}
                        {participant.isCurrentUser ? ' (Tu)' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-500 text-lg">
                        ${formatCurrency(participant.share)} {data.currency}
                      </p>
                      <p className="text-[#7a7a7a] text-sm">
                        {data.isSettlement
                          ? 'Monto recibido'
                          : participant.isCurrentUser
                            ? 'Debes'
                            : 'Deben'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-5 flex items-center gap-4 z-30">
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          disabled={data.isDeleted}
          className="flex-1 py-4 text-[#4a4a4a] font-semibold"
        >
          Eliminar
        </button>
        <button
          type="button"
          onClick={() =>
            router.navigate({
              to: '/groups/$id/add-expense',
              params: { id: groupId },
              search: { expenseId },
            })
          }
          disabled={data.isDeleted}
          className="flex-1 py-4 bg-[#4733d8] text-white font-semibold rounded-2xl flex items-center justify-center gap-2"
        >
          <Pencil className="w-5 h-5" />
          {data.isSettlement ? 'Editar liquidación' : 'Editar gasto'}
        </button>
      </div>

      <AppDrawer open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <div className="max-h-[84vh] overflow-y-auto">
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>

          <div className="px-6 pb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#1a1a3e]">
                {data.isSettlement ? 'Eliminar liquidación' : 'Eliminar gasto'}
              </h2>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <p className="text-gray-600 mb-6">
              {data.isSettlement
                ? 'Se eliminará la liquidación'
                : 'Se eliminará'}{' '}
              <strong>{data.description}</strong> por $
              {formatCurrency(data.amount)} {data.currency}.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 text-[#1a1a3e] font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() =>
                  deleteExpenseMutation.mutate({
                    data: {
                      groupId,
                      expenseId,
                    },
                  })
                }
                disabled={deleteExpenseMutation.isPending}
                className="flex-1 py-3 bg-red-500 text-white font-medium rounded-xl disabled:opacity-60"
              >
                {deleteExpenseMutation.isPending ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>

            {deleteExpenseMutation.data?.error && (
              <p className="text-red-500 text-sm mt-3">
                {deleteExpenseMutation.data.error}
              </p>
            )}
          </div>
        </div>
      </AppDrawer>
    </div>
  );
}
