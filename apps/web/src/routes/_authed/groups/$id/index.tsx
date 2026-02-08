/** biome-ignore-all lint/a11y/useButtonType: <explanation> */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import {
  Check,
  ChevronLeft,
  Copy,
  Link,
  MoreHorizontal,
  Pencil,
  Plus,
  Share2,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { type MouseEvent, type TouchEvent, useState } from 'react';
import { deleteExpense } from './-actions/delete-expense';
import { getGroup } from './-actions/get-group';
import { removeMember } from './-actions/remove-member';

export const Route = createFileRoute('/_authed/groups/$id/')({
  component: RouteComponent,
});

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(date));
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date: Date;
  isDeleted: boolean;
  paidBy: {
    id: string;
    name: string;
  };
  participantCount: number;
}

function ExpenseItem({
  expense,
  onOpenExpense,
  onDeleteExpense,
}: {
  expense: Expense;
  onOpenExpense: (expenseId: string) => void;
  onDeleteExpense: (expenseId: string) => void;
}) {
  const SWIPE_WIDTH = 88;
  const SWIPE_THRESHOLD = 44;
  const FULL_SWIPE_THRESHOLD = 78;
  const [translateX, setTranslateX] = useState(0);
  const [startX, setStartX] = useState<number | null>(null);
  const [startY, setStartY] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [didSwipe, setDidSwipe] = useState(false);
  const isOpen = translateX <= -SWIPE_THRESHOLD;

  const handleTouchStart = (event: TouchEvent<HTMLButtonElement>) => {
    if (expense.isDeleted) return;
    const touch = event.touches[0];
    setStartX(touch.clientX);
    setStartY(touch.clientY);
    setIsDragging(true);
    setDidSwipe(false);
  };

  const handleTouchMove = (event: TouchEvent<HTMLButtonElement>) => {
    if (!isDragging || startX === null || startY === null || expense.isDeleted)
      return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;

    if (Math.abs(deltaY) > Math.abs(deltaX)) return;

    const nextTranslateX = Math.max(-SWIPE_WIDTH, Math.min(0, deltaX));
    if (Math.abs(nextTranslateX) > 6) {
      setDidSwipe(true);
    }
    setTranslateX(nextTranslateX);
  };

  const handleTouchEnd = () => {
    if (!isDragging || expense.isDeleted) return;
    const shouldTriggerDelete = translateX <= -FULL_SWIPE_THRESHOLD;
    const shouldOpenActions = translateX <= -SWIPE_THRESHOLD;

    if (shouldTriggerDelete) {
      setTranslateX(0);
      onDeleteExpense(expense.id);
    } else if (shouldOpenActions) {
      setTranslateX(-SWIPE_WIDTH);
    } else {
      setTranslateX(0);
    }

    setIsDragging(false);
    setStartX(null);
    setStartY(null);
  };

  const handleOpenExpense = () => {
    if (didSwipe) {
      setDidSwipe(false);
      return;
    }
    if (isOpen) {
      setTranslateX(0);
      return;
    }
    onOpenExpense(expense.id);
  };

  const handleDelete = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onDeleteExpense(expense.id);
    setTranslateX(0);
  };

  return (
    <div className="relative border-b border-gray-100 last:border-b-0 overflow-hidden">
      {!expense.isDeleted && (
        <div className="absolute inset-y-0 right-0 w-[88px] bg-red-500 flex items-center justify-center">
          <button
            type="button"
            onClick={handleDelete}
            className="h-full w-full flex flex-col items-center justify-center text-white"
          >
            <Trash2 className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Borrar</span>
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={handleOpenExpense}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="w-full flex items-center gap-4 py-4 text-left bg-white transition-transform duration-200"
        style={{ transform: `translateX(${translateX}px)` }}
      >
        <div className="w-12 h-12 bg-[#f0f0ff] rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-lg">💰</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[#1a1a3e] truncate">
            {expense.description}
          </p>
          <p className="text-sm text-gray-500">
            {formatDate(expense.date)}
            {expense.participantCount > 0 &&
              ` · ${expense.participantCount} participantes`}
          </p>
          <p className="text-sm text-gray-500">Pagó: {expense.paidBy.name}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p
            className={`font-semibold ${expense.isDeleted ? 'text-gray-400 line-through' : 'text-[#1a1a3e]'}`}
          >
            ${formatCurrency(expense.amount)}
          </p>
          <p className="text-xs text-gray-500">
            {expense.isDeleted ? 'Eliminado' : expense.currency}
          </p>
        </div>
      </button>
    </div>
  );
}

function TotalsDisplay({ totals }: { totals: Record<string, number> }) {
  const entries = Object.entries(totals);

  if (entries.length === 0) {
    return (
      <h2 className="text-4xl font-bold text-[#1a1a3e] text-center mb-1">$0</h2>
    );
  }

  return (
    <div className="text-center mb-1">
      {entries.map(([currency, amount], index) => (
        <h2
          key={currency}
          className={`font-bold text-[#1a1a3e] ${index === 0 ? 'text-4xl' : 'text-2xl text-gray-600'}`}
        >
          ${formatCurrency(amount)}{' '}
          <span className={index === 0 ? 'text-2xl font-semibold' : 'text-lg'}>
            {currency}
          </span>
        </h2>
      ))}
    </div>
  );
}

function RouteComponent() {
  const { id } = Route.useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'gastos' | 'cuentas'>('gastos');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [showDeleteExpenseModal, setShowDeleteExpenseModal] = useState(false);
  const [showDeleteGroupConfirm, setShowDeleteGroupConfirm] = useState(false);

  const { data, error, isLoading } = useQuery({
    queryKey: ['group', id],
    queryFn: async () => getGroup({ data: { groupId: id } }),
  });

  const removeMemberMutation = useMutation({
    mutationFn: removeMember,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['group', id] });
        setMemberToDelete(null);
      }
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: deleteExpense,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['group', id] });
        setShowDeleteExpenseModal(false);
        setExpenseToDelete(null);
      }
    },
  });

  const handleDeleteExpense = (expenseId: string) => {
    if (deleteExpenseMutation.isPending) return;

    const expense =
      data?.expenses.find((item) => item.id === expenseId) ?? null;
    if (!expense || expense.isDeleted) return;

    setExpenseToDelete(expense);
    setShowDeleteExpenseModal(true);
  };

  const handleConfirmDeleteExpense = () => {
    if (!expenseToDelete) return;
    deleteExpenseMutation.mutate({
      data: {
        groupId: id,
        expenseId: expenseToDelete.id,
      },
    });
  };

  const handleRemoveMember = () => {
    if (!memberToDelete) return;
    removeMemberMutation.mutate({
      data: {
        groupId: id,
        memberId: memberToDelete.id,
      },
    });
  };

  const inviteLink = data?.inviteCode
    ? `${window.location.origin}/join/${data.inviteCode}`
    : '';

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error copying link:', err);
    }
  };

  const handleCopyCode = async () => {
    if (!data?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(data.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error copying code:', err);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f3fa] flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  // Error state (no access or not found)
  if (error) {
    return (
      <div className="min-h-screen bg-[#f5f3fa] flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 text-center shadow-sm max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-[#1a1a3e] mb-2">
            Acceso denegado
          </h2>
          <p className="text-gray-500 mb-6">
            {error instanceof Error
              ? error.message
              : 'No tienes acceso a este grupo'}
          </p>
          <button
            onClick={() => router.navigate({ to: '/' })}
            className="w-full py-4 bg-[#4040b0] text-white font-medium rounded-2xl"
          >
            Ir al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f3fa]">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.navigate({ to: '/' })}
            className="w-10 h-10 flex items-center justify-center"
          >
            <ChevronLeft className="w-6 h-6 text-[#1a1a3e]" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-[#1a1a3e]">
              {data?.name || 'Cargando...'}
            </h1>
            <p className="text-sm text-gray-500">
              {data ? `${data.participantCount} Participantes` : 'Cargando...'}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div className="px-4 py-4">
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <p className="text-gray-500 text-center mb-1">Total gastado</p>
          <TotalsDisplay totals={data?.totals ?? {}} />
          <p className="text-gray-500 text-center mb-6">Sin deudas</p>

          {/* Action buttons */}
          <div className="flex justify-center gap-8">
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() =>
                  router.navigate({
                    to: '/groups/$id/add-expense',
                    params: { id },
                    search: {},
                  })
                }
                className="w-14 h-14 bg-[#4040b0] rounded-2xl flex items-center justify-center"
              >
                <Plus className="w-6 h-6 text-white" />
              </button>
              <span className="text-sm text-[#1a1a3e]">Añadir gastos</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() =>
                  router.navigate({
                    to: '/groups/$id/participants',
                    params: { id },
                  })
                }
                className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center"
              >
                <UserPlus className="w-6 h-6 text-[#1a1a3e]" />
              </button>
              <span className="text-sm text-[#1a1a3e]">Participantes</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => setShowSettingsModal(true)}
                className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center"
              >
                <MoreHorizontal className="w-6 h-6 text-[#1a1a3e]" />
              </button>
              <span className="text-sm text-[#1a1a3e]">Ajustes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-2">
        <div className="flex bg-gray-100 rounded-2xl p-1">
          <button
            onClick={() => setActiveTab('gastos')}
            className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
              activeTab === 'gastos'
                ? 'bg-white text-[#4040b0] shadow-sm'
                : 'text-gray-500'
            }`}
          >
            Gastos
          </button>
          <button
            onClick={() => setActiveTab('cuentas')}
            className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
              activeTab === 'cuentas'
                ? 'bg-white text-[#4040b0] shadow-sm'
                : 'text-gray-500'
            }`}
          >
            Cuentas
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'gastos' &&
        (data?.expenses && data.expenses.length > 0 ? (
          <div className="px-4 py-2">
            <div className="bg-white rounded-2xl px-4">
              {data.expenses.map((expense) => (
                <ExpenseItem
                  key={expense.id}
                  expense={expense}
                  onOpenExpense={(expenseId) =>
                    router.navigate({
                      to: '/groups/$id/expense/$expenseId',
                      params: { id, expenseId },
                    })
                  }
                  onDeleteExpense={handleDeleteExpense}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-20">
            {/* Icon */}
            <div className="relative mb-6">
              <div className="w-20 h-20 bg-[#a8a0e8] rounded-2xl transform rotate-6" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 bg-[#4040b0] rounded-2xl flex items-center justify-center -rotate-6">
                  <Plus className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-[#1a1a3e] mb-2">
              No tienes gastos aún
            </h3>
            <p className="text-gray-500 text-center">
              Ingresa tus primeros gastos y comienza a dividirlos
            </p>
          </div>
        ))}

      {activeTab === 'cuentas' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-20">
          <h3 className="text-xl font-semibold text-[#1a1a3e] mb-2">
            Próximamente
          </h3>
          <p className="text-gray-500 text-center">
            Aquí verás el balance de cuentas entre participantes
          </p>
        </div>
      )}

      {showDeleteExpenseModal && expenseToDelete && (
        <>
          <button
            type="button"
            className="fixed inset-0 bg-black/30 z-40 cursor-default"
            onClick={() => {
              setShowDeleteExpenseModal(false);
              setExpenseToDelete(null);
            }}
            aria-label="Cerrar modal"
          />

          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            <div className="px-6 pb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#1a1a3e]">
                  Eliminar gasto
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteExpenseModal(false);
                    setExpenseToDelete(null);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <p className="text-gray-600 mb-6">
                Se eliminará <strong>{expenseToDelete.description}</strong> por
                ${formatCurrency(expenseToDelete.amount)}{' '}
                {expenseToDelete.currency}.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteExpenseModal(false);
                    setExpenseToDelete(null);
                  }}
                  className="flex-1 py-3 text-[#1a1a3e] font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteExpense}
                  disabled={deleteExpenseMutation.isPending}
                  className="flex-1 py-3 bg-red-500 text-white font-medium rounded-xl disabled:opacity-60"
                >
                  {deleteExpenseMutation.isPending
                    ? 'Eliminando...'
                    : 'Eliminar'}
                </button>
              </div>

              {deleteExpenseMutation.data?.error && (
                <p className="text-red-500 text-sm mt-3">
                  {deleteExpenseMutation.data.error}
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal de invitación */}
      {showInviteModal && (
        <>
          <button
            type="button"
            className="fixed inset-0 bg-black/30 z-40 cursor-default"
            onClick={() => setShowInviteModal(false)}
            aria-label="Cerrar modal"
          />

          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            <div className="px-6 pb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#1a1a3e]">
                  Invitar al grupo
                </h2>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <p className="text-gray-500 mb-6">
                Comparte este enlace para que otros se unan a{' '}
                <strong>{data?.name}</strong>
              </p>

              {/* Enlace */}
              <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#e8e4f8] rounded-xl flex items-center justify-center flex-shrink-0">
                    <Link className="w-5 h-5 text-[#6060c0]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-500 mb-1">
                      Enlace de invitación
                    </p>
                    <p className="text-[#1a1a3e] font-medium truncate text-sm">
                      {inviteLink}
                    </p>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="w-10 h-10 bg-[#4040b0] rounded-xl flex items-center justify-center flex-shrink-0"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-white" />
                    ) : (
                      <Copy className="w-5 h-5 text-white" />
                    )}
                  </button>
                </div>
              </div>

              {/* Código */}
              <div className="bg-gray-50 rounded-2xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">
                      Código de invitación
                    </p>
                    <p className="text-2xl font-bold text-[#1a1a3e] tracking-wider">
                      {data?.inviteCode}
                    </p>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="px-4 py-2 bg-gray-200 rounded-xl text-[#1a1a3e] font-medium text-sm"
                  >
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowInviteModal(false)}
                className="w-full py-4 bg-[#4040b0] text-white font-medium rounded-2xl"
              >
                Cerrar
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal de ajustes */}
      {showSettingsModal && (
        <>
          <button
            type="button"
            className="fixed inset-0 bg-black/30 z-40 cursor-default"
            onClick={() => {
              setShowSettingsModal(false);
              setShowDeleteGroupConfirm(false);
            }}
            aria-label="Cerrar modal"
          />

          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            <div className="pb-8">
              {!showDeleteGroupConfirm ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSettingsModal(false);
                      // TODO: navigate to edit group
                    }}
                    className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <Pencil className="w-5 h-5 text-[#1a1a3e]" />
                    <span className="text-[#1a1a3e] font-medium">
                      Editar grupo
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowSettingsModal(false);
                      router.navigate({
                        to: '/groups/$id/participants',
                        params: { id },
                      });
                    }}
                    className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <UserPlus className="w-5 h-5 text-[#1a1a3e]" />
                    <span className="text-[#1a1a3e] font-medium">
                      Editar o agregar participantes
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowSettingsModal(false);
                      setShowInviteModal(true);
                    }}
                    className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <Share2 className="w-5 h-5 text-[#1a1a3e]" />
                    <span className="text-[#1a1a3e] font-medium">
                      Compartir enlace de invitación
                    </span>
                  </button>

                  <div className="mx-6 border-t border-gray-200" />

                  <button
                    type="button"
                    onClick={() => setShowDeleteGroupConfirm(true)}
                    className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-5 h-5 text-red-500" />
                    <span className="text-red-500 font-medium">
                      Eliminar grupo
                    </span>
                  </button>
                </>
              ) : (
                <div className="px-6">
                  <h2 className="text-xl font-bold text-[#1a1a3e] mb-2">
                    Eliminar grupo
                  </h2>
                  <p className="text-gray-600 mb-6">
                    ¿Estás seguro de que deseas eliminar{' '}
                    <strong>{data?.name}</strong>? Esta acción no se puede
                    deshacer.
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowDeleteGroupConfirm(false)}
                      className="flex-1 py-3 text-[#1a1a3e] font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // TODO: implement delete group
                        setShowSettingsModal(false);
                        setShowDeleteGroupConfirm(false);
                      }}
                      className="flex-1 py-3 bg-red-500 text-white font-medium rounded-xl"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
