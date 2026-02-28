/** biome-ignore-all lint/a11y/useButtonType: <explanation> */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import {
  BarChart3,
  Check,
  Copy,
  HandCoins,
  Link,
  type LucideIcon,
  MoreHorizontal,
  Pencil,
  Plus,
  Share2,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { type MouseEvent, type TouchEvent, useState } from 'react';
import { AppDrawer } from '~/components/app-drawer';
import { PageHeader } from '~/components/page-header';
import { deleteGroup } from '../../(home)/-actions/delete-group';
import { deleteExpense } from './-actions/delete-expense';
import { getGroup } from './-actions/get-group';
import { leaveGroup } from './-actions/leave-group';

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
  isSettlement: boolean;
  settlementToName: string | null;
  paidBy: {
    id: string;
    name: string;
  };
  participantCount: number;
  currentUserBalance: number | null;
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
  const showDeleteAction = !expense.isDeleted && translateX < -2;

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
    <div
      className={`relative mb-2 overflow-hidden rounded-2xl border px-3 last:mb-0 ${
        expense.isSettlement ? 'border-emerald-200' : 'border-gray-200'
      }`}
    >
      {showDeleteAction && (
        <div className="absolute inset-y-0 right-0 w-[88px] bg-red-500 flex items-center justify-center z-0">
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
        className={`native-tap relative z-10 w-full flex items-center gap-4 py-2 text-left transition-transform duration-200 ${
          expense.isSettlement ? 'bg-emerald-50' : 'bg-white'
        }`}
        style={{ transform: `translateX(${translateX}px)` }}
      >
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            expense.isSettlement ? 'bg-emerald-100' : 'bg-[#f0f0ff]'
          }`}
        >
          <span className="text-lg">{expense.isSettlement ? '🤝' : '💰'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[#1a1a3e] truncate flex items-center gap-2">
            {expense.description}
            {expense.isSettlement ? (
              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                Liquidación
              </span>
            ) : null}
          </p>
          <p className="text-sm text-gray-500">
            {formatDate(expense.date)}
            {expense.participantCount > 0 &&
              ` · ${expense.participantCount} participantes`}
          </p>
          <p
            className={`text-sm ${
              expense.isSettlement ? 'text-emerald-700' : 'text-gray-500'
            }`}
          >
            {expense.isSettlement
              ? `${expense.paidBy.name} pagó a ${expense.settlementToName ?? 'otro miembro'}`
              : `Pagó: ${expense.paidBy.name}`}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p
            className={`font-semibold ${expense.isDeleted ? 'text-gray-400 line-through' : 'text-[#1a1a3e]'}`}
          >
            ${formatCurrency(expense.amount)}
          </p>
          {!expense.isDeleted &&
          !expense.isSettlement &&
          expense.currentUserBalance !== null ? (
            <p
              className={`text-xs font-medium ${
                expense.currentUserBalance > 0
                  ? 'text-green-600'
                  : expense.currentUserBalance < 0
                    ? 'text-red-500'
                    : 'text-gray-400'
              }`}
            >
              {expense.currentUserBalance > 0
                ? `Te deben $${formatCurrency(expense.currentUserBalance)}`
                : expense.currentUserBalance < 0
                  ? `Debes $${formatCurrency(Math.abs(expense.currentUserBalance))}`
                  : 'Estás al día'}
            </p>
          ) : (
            <p className="text-xs text-gray-500">
              {expense.isDeleted
                ? 'Eliminado'
                : expense.isSettlement
                  ? 'Liquidación'
                  : expense.currency}
            </p>
          )}
        </div>
      </button>
    </div>
  );
}

function TotalsDisplay({ totals }: { totals: Record<string, number> }) {
  const entries = Object.entries(totals);

  if (entries.length === 0) {
    return (
      <div className="mx-auto mb-2 max-w-xs rounded-2xl bg-[#f6f7ff] px-3 py-2 text-center">
        <h2 className="text-2xl font-semibold leading-tight text-[#1a1a3e]">
          $0
        </h2>
      </div>
    );
  }

  return (
    <div className="mx-auto mb-2 max-w-xs rounded-2xl bg-[#f6f7ff] px-3 py-2 text-center">
      {entries.map(([currency, amount], index) => (
        <h2
          key={currency}
          className={`leading-tight ${index === 0 ? 'text-2xl font-semibold text-[#1a1a3e]' : 'mt-1 text-base font-medium text-gray-600'}`}
        >
          ${formatCurrency(amount)}{' '}
          <span
            className={
              index === 0
                ? 'text-base font-semibold text-[#3a3a66]'
                : 'text-sm font-medium text-gray-500'
            }
          >
            {currency}
          </span>
        </h2>
      ))}
    </div>
  );
}

function UserBalanceSummary({
  directDebts,
  directCredits,
}: {
  directDebts?: Array<{
    toMemberId: string;
    toName: string;
    currency: string;
    amount: number;
  }>;
  directCredits?: Array<{
    fromMemberId: string;
    fromName: string;
    currency: string;
    amount: number;
  }>;
}) {
  const debtByCurrency: Record<string, number> = {};
  for (const debt of directDebts ?? []) {
    if (debt.amount <= 0) continue;
    debtByCurrency[debt.currency] =
      (debtByCurrency[debt.currency] ?? 0) + debt.amount;
  }

  const creditByCurrency: Record<string, number> = {};
  for (const credit of directCredits ?? []) {
    if (credit.amount <= 0) continue;
    creditByCurrency[credit.currency] =
      (creditByCurrency[credit.currency] ?? 0) + credit.amount;
  }

  const debtEntries = Object.entries(debtByCurrency).filter(
    ([, amount]) => amount >= 1,
  );
  const creditEntries = Object.entries(creditByCurrency).filter(
    ([, amount]) => amount >= 1,
  );

  if (debtEntries.length === 0 && creditEntries.length === 0) {
    return <p className="text-gray-500 text-center mb-6">Sin deudas</p>;
  }

  return (
    <div className="text-center mb-6 space-y-1">
      {debtEntries.map(([currency, amount]) => (
        <p key={`debt-${currency}`} className="font-medium text-red-500">
          Debes ${formatCurrency(amount)} {currency}
        </p>
      ))}
      {creditEntries.map(([currency, amount]) => (
        <p key={`credit-${currency}`} className="font-medium text-green-600">
          Te deben ${formatCurrency(amount)} {currency}
        </p>
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
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [showDeleteExpenseModal, setShowDeleteExpenseModal] = useState(false);
  const [showDeleteGroupConfirm, setShowDeleteGroupConfirm] = useState(false);
  const [showLeaveGroupConfirm, setShowLeaveGroupConfirm] = useState(false);
  const [deleteGroupNameInput, setDeleteGroupNameInput] = useState('');
  const [copiedGroupName, setCopiedGroupName] = useState(false);

  const { data, error, isLoading } = useQuery({
    queryKey: ['group', id],
    queryFn: async () => getGroup({ data: { groupId: id } }),
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

  const deleteGroupMutation = useMutation({
    mutationFn: deleteGroup,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['user-groups'] });
        queryClient.invalidateQueries({ queryKey: ['group', id] });
        setShowSettingsModal(false);
        setShowDeleteGroupConfirm(false);
        setDeleteGroupNameInput('');
        setCopiedGroupName(false);
        router.navigate({ to: '/' });
      }
    },
  });

  const leaveGroupMutation = useMutation({
    mutationFn: leaveGroup,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['user-groups'] });
        queryClient.invalidateQueries({ queryKey: ['group', id] });
        setShowSettingsModal(false);
        setShowLeaveGroupConfirm(false);
        router.navigate({ to: '/' });
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

  const handleCopyGroupName = async () => {
    if (!data?.name) return;
    try {
      await navigator.clipboard.writeText(data.name);
      setCopiedGroupName(true);
      setTimeout(() => setCopiedGroupName(false), 1500);
    } catch (error) {
      console.error('Error copying group name:', error);
    }
  };

  const quickActions: Array<{
    label: string;
    icon: LucideIcon;
    onClick: () => void;
    isPrimary?: boolean;
  }> = [
    {
      label: 'Crear gasto',
      icon: Plus,
      onClick: () =>
        router.navigate({
          to: '/groups/$id/add-expense',
          params: { id },
          search: {},
        }),
      isPrimary: true,
    },
    {
      label: 'Liquidar',
      icon: HandCoins,
      onClick: () =>
        router.navigate({
          to: '/groups/$id/settle',
          params: { id },
        }),
    },
    {
      label: 'Participantes',
      icon: UserPlus,
      onClick: () =>
        router.navigate({
          to: '/groups/$id/participants',
          params: { id },
        }),
    },
    {
      label: 'Más',
      icon: MoreHorizontal,
      onClick: () => setShowSettingsModal(true),
    },
  ];

  // Loading state
  if (isLoading) {
    return (
      <div className="native-app-shell min-h-dvh bg-[#f3f4fa]">
        <div className="native-screen native-enter mx-auto flex min-h-dvh w-full max-w-md items-center justify-center pb-8">
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
    );
  }

  // Error state (no access or not found)
  if (error) {
    return (
      <div className="native-app-shell min-h-dvh bg-[#f3f4fa]">
        <div className="native-screen native-enter mx-auto flex min-h-dvh w-full max-w-md items-center justify-center px-6 pb-8">
          <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/90 p-8 text-center shadow-sm backdrop-blur-sm">
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
      </div>
    );
  }

  return (
    <PageHeader
      title={data?.name || 'Cargando...'}
      subtitle={data ? `${data.participantCount} Participantes` : 'Cargando...'}
      goBack
      onBack={() => router.navigate({ to: '/', replace: true })}
    >
      <div className="relative z-10 bg-[#f2f4ff] pb-3 rounded-b-2xl">
        <div className="px-4 py-2 lg:px-6 lg:pt-3">
          <div className="bg-white rounded-3xl p-4 pb-1 shadow-sm">
            <div className="mb-2 flex items-start justify-end">
              <button
                type="button"
                onClick={() => setShowInviteModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-[#1a1a3e]"
              >
                <Share2 className="h-4 w-4" />
                Compartir
              </button>
            </div>
            <p className="mb-2 text-center text-xs font-medium tracking-wide text-gray-500 uppercase">
              Total gastado
            </p>
            <TotalsDisplay totals={data?.totals ?? {}} />
            <UserBalanceSummary
              directDebts={data?.directDebts}
              directCredits={data?.directCredits}
            />
          </div>
        </div>

        <div className="px-2 py-2 lg:px-4">
          <div className="grid grid-cols-4 gap-2 lg:gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <div
                  key={action.label}
                  className="flex flex-col items-center gap-2"
                >
                  <button
                    onClick={action.onClick}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center lg:h-16 lg:w-16 ${
                      action.isPrimary ? 'bg-[#4040b0]' : 'bg-white'
                    }`}
                  >
                    <Icon
                      className={`w-6 h-6 ${
                        action.isPrimary ? 'text-white' : 'text-[#1a1a3e]'
                      }`}
                    />
                  </button>
                  <span className="text-xs font-normal text-[#1a1a3e] text-center lg:text-sm">
                    {action.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="-mt-2 bg-white">
        {/* Tabs */}
        <div className="px-4 py-2 lg:px-6">
          <div className="flex rounded-2xl p-1 lg:max-w-sm">
            <button
              onClick={() => setActiveTab('gastos')}
              className={`flex-1 py-3 rounded-xl text-sm transition-colors ${
                activeTab === 'gastos'
                  ? 'bg-[#ECEFFF] font-bold text-blue-700 shadow-sm'
                  : 'text-gray-500 font-normal'
              }`}
            >
              Gastos
            </button>
            <button
              onClick={() => setActiveTab('cuentas')}
              className={`flex-1 py-3 rounded-xl text-sm transition-colors ${
                activeTab === 'cuentas'
                  ? 'bg-[#ECEFFF] font-bold text-blue-700 shadow-sm'
                  : 'text-gray-500 font-normal'
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
              <div className="bg-white rounded-2xl">
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
            <div className="native-empty flex-1 flex flex-col items-center justify-center px-6 py-20">
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
          <div className="px-4 py-2">
            {data?.memberBalances && data.memberBalances.length > 0 ? (
              <div className="bg-white rounded-2xl py-2">
                {data.memberBalances.map((member) => {
                  const entries = Object.entries(member.balances).filter(
                    ([, amount]) => Math.abs(amount) >= 1,
                  );

                  return (
                    <div
                      key={member.memberId}
                      className="mb-2 flex items-center gap-4 rounded-2xl border border-gray-200 px-3 py-2 last:mb-0"
                    >
                      <div className="w-12 h-12 bg-[#f0f0ff] rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-semibold text-[#4040b0]">
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#1a1a3e] truncate">
                          {member.name}
                          {member.isCurrentUser && (
                            <span className="text-xs text-gray-400 ml-1">
                              (tú)
                            </span>
                          )}
                        </p>
                        {entries.length === 0 ? (
                          <p className="text-sm text-gray-400">
                            Sin movimientos
                          </p>
                        ) : (
                          entries.map(([currency, amount]) => (
                            <p
                              key={currency}
                              className={`text-sm ${
                                amount > 0
                                  ? 'text-green-600'
                                  : amount < 0
                                    ? 'text-red-500'
                                    : 'text-gray-400'
                              }`}
                            >
                              {amount > 0
                                ? `Le deben $${formatCurrency(amount)} ${currency}`
                                : amount < 0
                                  ? `Debe $${formatCurrency(Math.abs(amount))} ${currency}`
                                  : 'Está al día'}
                            </p>
                          ))
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        {entries.map(([currency, amount]) => (
                          <p
                            key={currency}
                            className={`font-semibold ${
                              amount > 0
                                ? 'text-green-600'
                                : amount < 0
                                  ? 'text-red-500'
                                  : 'text-gray-400'
                            }`}
                          >
                            {amount > 0 ? '+' : ''}${formatCurrency(amount)}{' '}
                            <span className="text-xs font-normal">
                              {currency}
                            </span>
                          </p>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="native-empty flex-1 flex flex-col items-center justify-center px-6 py-20">
                <h3 className="text-xl font-semibold text-[#1a1a3e] mb-2">
                  Sin cuentas aún
                </h3>
                <p className="text-gray-500 text-center">
                  Agrega gastos para ver el balance de cada participante
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <AppDrawer
        open={showDeleteExpenseModal && Boolean(expenseToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setShowDeleteExpenseModal(false);
            setExpenseToDelete(null);
            return;
          }
          setShowDeleteExpenseModal(true);
        }}
      >
        {expenseToDelete ? (
          <div className="max-h-[84vh] overflow-y-auto">
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
        ) : null}
      </AppDrawer>

      {/* Modal de invitación */}
      <AppDrawer open={showInviteModal} onOpenChange={setShowInviteModal}>
        <div className="max-h-[84vh] overflow-y-auto">
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
      </AppDrawer>

      {/* Modal de ajustes */}
      <AppDrawer
        open={showSettingsModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowSettingsModal(false);
            setShowDeleteGroupConfirm(false);
            setShowLeaveGroupConfirm(false);
            setDeleteGroupNameInput('');
            setCopiedGroupName(false);
            return;
          }
          setShowSettingsModal(true);
        }}
      >
        <div className="max-h-[84vh] overflow-y-auto">
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>

          <div className="pb-8">
            {!showDeleteGroupConfirm && !showLeaveGroupConfirm ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setShowSettingsModal(false);
                    router.navigate({
                      to: '/groups/$id/edit',
                      params: { id },
                    });
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
                    router.navigate({
                      to: '/groups/$id/totals',
                      params: { id },
                    });
                  }}
                  className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <BarChart3 className="w-5 h-5 text-[#1a1a3e]" />
                  <span className="text-[#1a1a3e] font-medium">Totales</span>
                </button>

                <div className="mx-6 border-t border-gray-200" />

                {data?.isOwner ? (
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
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowLeaveGroupConfirm(true)}
                    className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-red-50 transition-colors"
                  >
                    <X className="w-5 h-5 text-red-500" />
                    <span className="text-red-500 font-medium">
                      Abandonar grupo
                    </span>
                  </button>
                )}
              </>
            ) : showDeleteGroupConfirm ? (
              <div className="px-6">
                <h2 className="text-xl font-bold text-[#1a1a3e] mb-2">
                  Eliminar grupo
                </h2>
                <p className="text-gray-600 mb-6">
                  Para confirmar, escribe exactamente el nombre del grupo.
                </p>
                <div className="bg-gray-50 rounded-xl p-3 mb-4 border border-gray-100">
                  <p className="text-sm text-gray-500">Nombre del grupo</p>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-[#1a1a3e] break-all">
                      {data?.name}
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyGroupName}
                      className="px-3 py-1.5 text-sm rounded-lg bg-white border border-gray-200 text-[#1a1a3e] whitespace-nowrap"
                    >
                      {copiedGroupName ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={deleteGroupNameInput}
                  onChange={(event) =>
                    setDeleteGroupNameInput(event.target.value)
                  }
                  placeholder="Escribe el nombre del grupo"
                  className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-[#1a1a3e] placeholder:text-gray-400 focus:outline-none focus:border-[#6060c0] mb-4"
                />
                {deleteGroupMutation.data?.error && (
                  <p className="text-red-500 text-sm mb-4">
                    {deleteGroupMutation.data.error}
                  </p>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteGroupConfirm(false);
                      setDeleteGroupNameInput('');
                      setCopiedGroupName(false);
                    }}
                    className="flex-1 py-3 text-[#1a1a3e] font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!data?.name || deleteGroupMutation.isPending) return;
                      deleteGroupMutation.mutate({
                        data: {
                          groupId: id,
                          groupNameConfirm: deleteGroupNameInput.trim(),
                        },
                      });
                    }}
                    disabled={
                      deleteGroupMutation.isPending ||
                      !data?.name ||
                      deleteGroupNameInput.trim() !== data.name
                    }
                    className="flex-1 py-3 bg-red-500 text-white font-medium rounded-xl disabled:opacity-60"
                  >
                    {deleteGroupMutation.isPending
                      ? 'Eliminando...'
                      : 'Eliminar'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-6">
                <h2 className="text-xl font-bold text-[#1a1a3e] mb-2">
                  Abandonar grupo
                </h2>
                <p className="text-gray-600 mb-6">
                  ¿Seguro que quieres abandonar <strong>{data?.name}</strong>?
                  Podrás volver a unirte con invitación.
                </p>
                {leaveGroupMutation.data?.error && (
                  <p className="text-red-500 text-sm mb-4">
                    {leaveGroupMutation.data.error}
                  </p>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowLeaveGroupConfirm(false)}
                    className="flex-1 py-3 text-[#1a1a3e] font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (leaveGroupMutation.isPending) return;
                      leaveGroupMutation.mutate({
                        data: {
                          groupId: id,
                        },
                      });
                    }}
                    disabled={leaveGroupMutation.isPending}
                    className="flex-1 py-3 bg-red-500 text-white font-medium rounded-xl disabled:opacity-60"
                  >
                    {leaveGroupMutation.isPending
                      ? 'Abandonando...'
                      : 'Abandonar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </AppDrawer>
    </PageHeader>
  );
}
