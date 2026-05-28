/** biome-ignore-all lint/a11y/useButtonType: <explanation> */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import {
  BarChart3,
  Camera,
  Check,
  Copy,
  Eye,
  HandCoins,
  Images,
  LayoutGrid,
  Link,
  Loader2,
  type LucideIcon,
  MoreHorizontal,
  Pencil,
  Pin,
  Plus,
  Share2,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { type MouseEvent, type TouchEvent, useRef, useState } from 'react';
import { AppDrawer } from '~/components/app-drawer';
import { useViewStateRestoration } from '~/hooks/use-view-state-restoration';
import { PageHeader } from '~/components/page-header';
import {
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@workspace/ui/components/drawer';
import { formatMoney, formatMoneyAmount } from '~/lib/money';
import { deleteGroup } from '../../(home)/-actions/delete-group';
import { createImportedExpenses } from './add-expense/-actions/create-imported-expenses';
import { extractExpensesFromImage } from './add-expense/-actions/extract-expenses-from-image';
import { deleteExpense } from './-actions/delete-expense';
import { getGroup } from './-actions/get-group';
import { leaveGroup } from './-actions/leave-group';
import { toggleExpensePin } from './-actions/toggle-expense-pin';

export const Route = createFileRoute('/_authed/groups/$id/')({
  component: RouteComponent,
});

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(date));
}

interface Expense {
  id: string;
  category: {
    id: string;
    name: string;
  } | null;
  description: string;
  amount: number;
  currency: string;
  date: Date;
  isDeleted: boolean;
  isSettlement: boolean;
  isPersonal: boolean;
  isPinned: boolean;
  expenseType: 'standard' | 'composite';
  subExpenseCount: number;
  settlementToName: string | null;
  paidBy: {
    id: string;
    name: string;
  };
  participantCount: number;
  currentUserBalance: number | null;
}

interface MemberIdentity {
  id: string;
  name: string;
  email: string | null;
  role: string;
  userId: string | null;
  isCurrentUser: boolean;
}

interface GroupViewState {
  activeTab: 'gastos' | 'cuentas';
}

interface ImportedExpenseDraft {
  id: string;
  description: string;
  amount: string;
  currency: string;
  paidById: string;
  shouldSplit: boolean;
  participantIds: string[];
  notes: string | null;
}

function createImportedExpenseId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `group-import-expense-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readImageAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== 'string') {
        reject(new Error('No se pudo leer la imagen'));
        return;
      }

      const base64 = result.split(',')[1];

      if (!base64) {
        reject(new Error('No se pudo convertir la imagen'));
        return;
      }

      resolve(base64);
    };

    reader.onerror = () => {
      reject(new Error('No se pudo leer la imagen seleccionada'));
    };

    reader.readAsDataURL(file);
  });
}

function ExpenseItem({
  expense,
  onOpenExpense,
  onDeleteExpense,
  onOpenOptions,
}: {
  expense: Expense;
  onOpenExpense: (expenseId: string) => void;
  onDeleteExpense: (expenseId: string) => void;
  onOpenOptions: (expense: Expense) => void;
}) {
  const SWIPE_WIDTH = 88;
  const SWIPE_THRESHOLD = 44;
  const FULL_SWIPE_THRESHOLD = 78;
  const LONG_PRESS_MS = 450;
  const [translateX, setTranslateX] = useState(0);
  const [startX, setStartX] = useState<number | null>(null);
  const [startY, setStartY] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [didSwipe, setDidSwipe] = useState(false);
  const [didLongPress, setDidLongPress] = useState(false);
  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isOpen = translateX <= -SWIPE_THRESHOLD;
  const showDeleteAction = !expense.isDeleted && translateX < -2;

  const clearLongPressTimeout = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const startLongPressTimeout = () => {
    clearLongPressTimeout();
    longPressTimeoutRef.current = setTimeout(() => {
      setDidLongPress(true);
      setDidSwipe(true);
      setTranslateX(0);
      onOpenOptions(expense);
    }, LONG_PRESS_MS);
  };

  const handleTouchStart = (event: TouchEvent<HTMLButtonElement>) => {
    if (expense.isDeleted) return;
    const touch = event.touches[0];
    setStartX(touch.clientX);
    setStartY(touch.clientY);
    setIsDragging(true);
    setDidSwipe(false);
    setDidLongPress(false);
    startLongPressTimeout();
  };

  const handleTouchMove = (event: TouchEvent<HTMLButtonElement>) => {
    if (!isDragging || startX === null || startY === null || expense.isDeleted)
      return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;

    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      clearLongPressTimeout();
      return;
    }

    const nextTranslateX = Math.max(-SWIPE_WIDTH, Math.min(0, deltaX));
    if (Math.abs(nextTranslateX) > 6) {
      setDidSwipe(true);
      clearLongPressTimeout();
    }
    setTranslateX(nextTranslateX);
  };

  const handleTouchEnd = () => {
    clearLongPressTimeout();
    if (!isDragging || expense.isDeleted) return;
    if (didLongPress) {
      setIsDragging(false);
      setStartX(null);
      setStartY(null);
      setDidLongPress(false);
      return;
    }
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

  const handleMouseDown = () => {
    if (expense.isDeleted) return;
    setDidLongPress(false);
    startLongPressTimeout();
  };

  const handleMouseUp = () => {
    clearLongPressTimeout();
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
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={(event) => {
          event.preventDefault();
          onOpenOptions(expense);
        }}
        className={`native-tap relative z-10 w-full flex items-center gap-4 py-2 text-left transition-transform duration-200 ${
          expense.isSettlement ? 'bg-emerald-50' : 'bg-white'
        }`}
        style={{ transform: `translateX(${translateX}px)` }}
      >
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
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
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {expense.isPinned ? (
              <Pin className="h-3.5 w-3.5 fill-current text-amber-500" />
            ) : null}
            <p className="min-w-0 truncate font-medium text-[#1a1a3e]">
              {expense.description}
            </p>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {expense.isSettlement ? (
              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                Liquidación
              </span>
            ) : expense.expenseType === 'composite' ? (
              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">
                {expense.subExpenseCount} subgasto
                {expense.subExpenseCount === 1 ? '' : 's'}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-gray-500">
            {formatDate(expense.date)}
            {expense.category ? ` · ${expense.category.name}` : ''}
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
            {formatMoney(expense.amount, expense.currency)}
          </p>
          {!expense.isDeleted &&
          !expense.isSettlement &&
          expense.participantCount > 0 &&
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
                ? `Te deben ${formatMoney(expense.currentUserBalance, expense.currency)}`
                : expense.currentUserBalance < 0
                  ? `Debes ${formatMoney(Math.abs(expense.currentUserBalance), expense.currency)}`
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
          {formatMoneyAmount(0)}
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
          {formatMoney(amount, currency)}
        </h2>
      ))}
    </div>
  );
}

function UserBalanceSummary({
  balanceEntries,
}: {
  balanceEntries?: Array<[string, number]>;
}) {
  const netEntries = (balanceEntries ?? []).filter(
    ([, amount]) => Math.abs(amount) >= 1,
  );

  if (netEntries.length === 0) {
    return <p className="text-gray-500 text-center mb-6">Sin deudas</p>;
  }

  return (
    <div className="text-center mb-6 space-y-1">
      {netEntries.map(([currency, amount]) => (
        <p
          key={currency}
          className={`font-medium ${
            amount > 0 ? 'text-green-600' : 'text-red-500'
          }`}
        >
          {amount > 0
            ? `Te deben ${formatMoney(amount, currency)}`
            : `Debes ${formatMoney(Math.abs(amount), currency)}`}
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
  const [expenseForOptions, setExpenseForOptions] = useState<Expense | null>(
    null,
  );
  const [showDeleteExpenseModal, setShowDeleteExpenseModal] = useState(false);
  const [showExpenseOptionsModal, setShowExpenseOptionsModal] = useState(false);
  const [showDeleteGroupConfirm, setShowDeleteGroupConfirm] = useState(false);
  const [showLeaveGroupConfirm, setShowLeaveGroupConfirm] = useState(false);
  const [deleteGroupNameInput, setDeleteGroupNameInput] = useState('');
  const [copiedGroupName, setCopiedGroupName] = useState(false);
  const importImageInputRef = useRef<HTMLInputElement | null>(null);
  const [showImportDrawer, setShowImportDrawer] = useState(false);
  const [importedExpenses, setImportedExpenses] = useState<
    ImportedExpenseDraft[]
  >([]);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const scrollRestoreKey = `group-view-state:${id}`;
  const { data, error, isLoading } = useQuery({
    queryKey: ['group', id],
    queryFn: async () => getGroup({ data: { groupId: id } }),
  });
  const currentMemberBalanceEntries = Object.entries(
    data?.memberBalances.find((member) => member.isCurrentUser)?.balances ?? {},
  );
  const { saveViewState } = useViewStateRestoration<GroupViewState>(
    scrollRestoreKey,
    {
      enabled: !isLoading,
      onRestore: (viewState) => {
        setActiveTab(viewState.activeTab);
      },
    },
  );

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
  const toggleExpensePinMutation = useMutation({
    mutationFn: toggleExpensePin,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['group', id] });
        setShowExpenseOptionsModal(false);
        setExpenseForOptions(null);
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
  const extractExpensesFromImageMutation = useMutation({
    mutationFn: extractExpensesFromImage,
    onSuccess: (result) => {
      if (!result.success || !result.expenses?.length) {
        setImportError(result.error ?? 'No se pudieron detectar gastos');
        setImportFeedback(null);
        setImportedExpenses([]);
        setShowImportDrawer(false);
        return;
      }

      const defaultPaidById =
        data?.members.find((member) => member.isCurrentUser)?.id ??
        data?.members[0]?.id ??
        '';
      const defaultParticipantIds = data?.members.map((member) => member.id) ?? [];

      setImportedExpenses(
        result.expenses.map((expense) => ({
          id: createImportedExpenseId(),
          description: expense.description,
          amount: expense.amount.toString(),
          currency: expense.currency,
          paidById: defaultPaidById,
          shouldSplit: defaultParticipantIds.length > 0,
          participantIds: defaultParticipantIds,
          notes: expense.notes,
        })),
      );
      setImportError(null);
      setImportFeedback(
        result.notes ??
          `Detecté ${result.expenses.length} gasto${result.expenses.length === 1 ? '' : 's'}. Revísalos antes de crear.`,
      );
      setShowImportDrawer(true);
    },
    onError: (error) => {
      setImportFeedback(null);
      setImportError(
        error instanceof Error
          ? error.message
          : 'No se pudo analizar la captura de gastos',
      );
    },
  });
  const createImportedExpensesMutation = useMutation({
    mutationFn: createImportedExpenses,
    onSuccess: (result) => {
      if (!result.success) {
        setImportError(result.error ?? 'No se pudieron crear los gastos');
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['group', id] });
      setShowImportDrawer(false);
      setImportedExpenses([]);
      setImportFeedback(null);
      setImportError(null);
    },
    onError: (error) => {
      setImportError(
        error instanceof Error
          ? error.message
          : 'No se pudieron crear los gastos importados',
      );
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

  const handleOpenExpenseOptions = (expense: Expense) => {
    setExpenseForOptions(expense);
    setShowExpenseOptionsModal(true);
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

  const handleSelectImportImage = () => {
    importImageInputRef.current?.click();
  };

  const handleImportImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setImportFeedback(null);
      setImportError('Selecciona una imagen válida');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setImportFeedback(null);
      setImportError('La imagen es muy pesada. Usa una foto de hasta 8 MB.');
      return;
    }

    try {
      setImportError(null);
      setImportFeedback(null);
      const imageBase64 = await readImageAsBase64(file);

      extractExpensesFromImageMutation.mutate({
        data: {
          groupId: id,
          imageBase64,
          mimeType: file.type,
          fileName: file.name,
        },
      });
    } catch (error) {
      setImportFeedback(null);
      setImportError(
        error instanceof Error ? error.message : 'No se pudo leer la imagen',
      );
    }
  };

  const updateImportedExpense = (
    expenseId: string,
    updater: (current: ImportedExpenseDraft) => ImportedExpenseDraft,
  ) => {
    setImportedExpenses((current) =>
      current.map((expense) =>
        expense.id === expenseId ? updater(expense) : expense,
      ),
    );
  };

  const removeImportedExpense = (expenseId: string) => {
    setImportedExpenses((current) =>
      current.filter((expense) => expense.id !== expenseId),
    );
  };

  const toggleImportedParticipant = (expenseId: string, participantId: string) => {
    updateImportedExpense(expenseId, (expense) => ({
      ...expense,
      participantIds: expense.participantIds.includes(participantId)
        ? expense.participantIds.filter((id) => id !== participantId)
        : [...expense.participantIds, participantId],
    }));
  };

  const canImportExpenses =
    importedExpenses.length > 0 &&
    importedExpenses.every((expense) => {
      const parsedAmount = parseFloat(expense.amount);
      return (
        expense.description.trim().length > 0 &&
        Number.isFinite(parsedAmount) &&
        parsedAmount > 0 &&
        expense.paidById.length > 0 &&
        (!expense.shouldSplit || expense.participantIds.length > 0)
      );
    });

  const handleImportSubmit = () => {
    const payload = importedExpenses.map((expense) => ({
      description: expense.description.trim(),
      amount: parseFloat(expense.amount),
      currency: expense.currency,
      paidById: expense.paidById,
      participantIds: expense.shouldSplit ? expense.participantIds : [],
    }));

    createImportedExpensesMutation.mutate({
      data: {
        groupId: id,
        expenses: payload,
      },
    });
  };

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
        <input
          ref={importImageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImportImageChange}
        />
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
            <UserBalanceSummary balanceEntries={currentMemberBalanceEntries} />
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

        <div className="px-4 pt-1 lg:px-6">
          <button
            type="button"
            onClick={handleSelectImportImage}
            disabled={extractExpensesFromImageMutation.isPending}
            className="flex w-full items-center gap-3 rounded-2xl border border-[#d7e3ff] bg-white px-4 py-3 text-left shadow-sm disabled:opacity-60"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef3ff]">
              {extractExpensesFromImageMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin text-[#4040b0]" />
              ) : (
                <Images className="h-5 w-5 text-[#4040b0]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-[#1a1a3e]">
                Importar varios gastos desde una captura
              </p>
              <p className="text-sm text-gray-500">
                Súbela aquí y revisa gasto por gasto antes de agregarlos
              </p>
            </div>
            <Camera className="h-5 w-5 text-[#4040b0]" />
          </button>
          {importError && !showImportDrawer ? (
            <p className="mt-2 text-sm text-red-500">{importError}</p>
          ) : null}
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
                    onOpenOptions={handleOpenExpenseOptions}
                    onOpenExpense={(expenseId) => {
                      saveViewState({ activeTab });
                      router.navigate({
                        to: '/groups/$id/expense/$expenseId',
                        params: { id, expenseId },
                      });
                    }}
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
                    <button
                      key={member.memberId}
                      type="button"
                      onClick={() => {
                        saveViewState({ activeTab });
                        router.navigate({
                          to: '/groups/$id/member/$memberId',
                          params: { id, memberId: member.memberId },
                        });
                      }}
                      className="mb-2 flex w-full items-center gap-4 rounded-2xl border border-gray-200 px-3 py-2 text-left last:mb-0"
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
                        <p className="truncate text-xs text-gray-400">
                          {(data?.members as MemberIdentity[] | undefined)?.find(
                            (groupMember) => groupMember.id === member.memberId,
                          )?.email ?? 'Sin cuenta vinculada'}
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
                                ? `Le deben ${formatMoney(amount, currency)}`
                                : amount < 0
                                  ? `Debe ${formatMoney(Math.abs(amount), currency)}`
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
                            {amount > 0 ? '+' : ''}
                            {formatMoney(amount, currency)}
                          </p>
                        ))}
                      </div>
                    </button>
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
        open={showImportDrawer}
        onOpenChange={(open) => {
          setShowImportDrawer(open);
          if (!open && !createImportedExpensesMutation.isPending) {
            setImportedExpenses([]);
            setImportFeedback(null);
          }
        }}
        className="data-[vaul-drawer-direction=bottom]:max-h-[92vh]"
      >
        <DrawerHeader>
          <DrawerTitle className="text-left text-[#132238]">
            Revisar gastos importados
          </DrawerTitle>
          <DrawerDescription className="text-left">
            Edita cada gasto detectado y decide cómo se divide antes de crearlo.
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-5 pb-4">
          <div className="mb-4 flex items-center justify-between rounded-2xl bg-[#f5f7fb] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[#132238]">
                {importedExpenses.length} gasto
                {importedExpenses.length === 1 ? '' : 's'} detectado
                {importedExpenses.length === 1 ? '' : 's'}
              </p>
              <p className="text-xs text-[#68768a]">
                Puedes corregir descripción, monto, pagador y participantes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowImportDrawer(false);
                setImportedExpenses([]);
                setImportFeedback(null);
              }}
              className="rounded-full bg-white p-2 text-[#68768a]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {importFeedback ? (
            <p className="mb-4 rounded-2xl border border-[#d7e3ff] bg-[#f5f8ff] px-4 py-3 text-sm text-[#385183]">
              {importFeedback}
            </p>
          ) : null}

          <div className="max-h-[58vh] space-y-4 overflow-y-auto pb-2">
            {importedExpenses.map((expense, index) => (
              <div
                key={expense.id}
                className="rounded-[24px] border border-white/70 bg-white px-4 py-4 shadow-sm"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#6b7a90]">
                      Gasto {index + 1}
                    </p>
                    {expense.notes ? (
                      <p className="mt-1 text-xs text-[#68768a]">
                        {expense.notes}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeImportedExpense(expense.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <input
                    type="text"
                    value={expense.description}
                    onChange={(event) =>
                      updateImportedExpense(expense.id, (current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Descripción"
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-[#132238] placeholder:text-gray-400"
                  />

                  <div className="grid grid-cols-[1fr_110px] gap-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={expense.amount}
                      onChange={(event) =>
                        updateImportedExpense(expense.id, (current) => ({
                          ...current,
                          amount: event.target.value,
                        }))
                      }
                      placeholder="Monto"
                      className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-[#132238] placeholder:text-gray-400"
                    />
                    <input
                      type="text"
                      value={expense.currency}
                      onChange={(event) =>
                        updateImportedExpense(expense.id, (current) => ({
                          ...current,
                          currency: event.target.value.toUpperCase(),
                        }))
                      }
                      className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-[#132238]"
                    />
                  </div>

                  <select
                    value={expense.paidById}
                    onChange={(event) =>
                      updateImportedExpense(expense.id, (current) => ({
                        ...current,
                        paidById: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[#132238]"
                  >
                    {(data?.members ?? []).map((member) => (
                      <option key={member.id} value={member.id}>
                        Pagó {member.name}
                      </option>
                    ))}
                  </select>

                  <div className="rounded-2xl bg-[#f7f8fb] px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-[#132238]">
                          ¿Dividir este gasto?
                        </p>
                        <p className="text-xs text-[#68768a]">
                          {expense.shouldSplit
                            ? `${expense.participantIds.length} participante${expense.participantIds.length === 1 ? '' : 's'}`
                            : 'Quedará como gasto personal'}
                        </p>
                      </div>
                      <div className="flex rounded-full bg-white p-1">
                        <button
                          type="button"
                          onClick={() =>
                            updateImportedExpense(expense.id, (current) => ({
                              ...current,
                              shouldSplit: true,
                              participantIds:
                                current.participantIds.length > 0
                                  ? current.participantIds
                                  : (data?.members ?? []).map((member) => member.id),
                            }))
                          }
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            expense.shouldSplit
                              ? 'bg-[#132238] text-white'
                              : 'text-[#68768a]'
                          }`}
                        >
                          Sí
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateImportedExpense(expense.id, (current) => ({
                              ...current,
                              shouldSplit: false,
                              participantIds: [],
                            }))
                          }
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            !expense.shouldSplit
                              ? 'bg-[#132238] text-white'
                              : 'text-[#68768a]'
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>

                    {expense.shouldSplit ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            updateImportedExpense(expense.id, (current) => ({
                              ...current,
                              participantIds:
                                current.participantIds.length ===
                                (data?.members.length ?? 0)
                                  ? []
                                  : (data?.members ?? []).map((member) => member.id),
                            }))
                          }
                          className="mt-3 rounded-full bg-white px-3 py-1 text-xs font-medium text-[#132238]"
                        >
                          {expense.participantIds.length ===
                          (data?.members.length ?? 0)
                            ? 'Quitar todos'
                            : 'Seleccionar todos'}
                        </button>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(data?.members ?? []).map((member) => {
                            const isSelected = expense.participantIds.includes(
                              member.id,
                            );

                            return (
                              <button
                                key={member.id}
                                type="button"
                                onClick={() =>
                                  toggleImportedParticipant(expense.id, member.id)
                                }
                                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                                  isSelected
                                    ? 'bg-[#132238] text-white'
                                    : 'bg-white text-[#132238]'
                                }`}
                              >
                                {member.name}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {importError ? (
            <p className="mt-4 text-sm text-red-500">{importError}</p>
          ) : null}
        </div>

        <DrawerFooter className="border-t border-black/5 bg-white/90 px-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={handleImportSubmit}
            disabled={!canImportExpenses || createImportedExpensesMutation.isPending}
            className="w-full rounded-2xl bg-[#132238] px-4 py-3 font-medium text-white disabled:bg-gray-200 disabled:text-gray-400"
          >
            {createImportedExpensesMutation.isPending
              ? 'Importando...'
              : `Crear ${importedExpenses.length} gasto${importedExpenses.length === 1 ? '' : 's'}`}
          </button>
        </DrawerFooter>
      </AppDrawer>

      <AppDrawer
        open={showExpenseOptionsModal && Boolean(expenseForOptions)}
        onOpenChange={(open) => {
          if (!open) {
            setShowExpenseOptionsModal(false);
            setExpenseForOptions(null);
            return;
          }
          setShowExpenseOptionsModal(true);
        }}
      >
        {expenseForOptions ? (
          <div className="max-h-[84vh] overflow-y-auto">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            <div className="px-6 pb-8">
              <div className="mb-6">
                <p className="text-sm text-gray-500">Opciones del gasto</p>
                <h2 className="text-xl font-bold text-[#1a1a3e]">
                  {expenseForOptions.description}
                </h2>
                <p className="text-sm text-gray-500">
                  {formatMoney(expenseForOptions.amount, expenseForOptions.currency)}
                </p>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowExpenseOptionsModal(false);
                    saveViewState({ activeTab });
                    router.navigate({
                      to: '/groups/$id/expense/$expenseId',
                      params: { id, expenseId: expenseForOptions.id },
                    });
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left hover:bg-gray-50"
                >
                  <Eye className="h-5 w-5 text-[#1a1a3e]" />
                  <span className="font-medium text-[#1a1a3e]">Abrir</span>
                </button>

                {!expenseForOptions.isSettlement && (
                  <button
                    type="button"
                    onClick={() =>
                      toggleExpensePinMutation.mutate({
                        data: {
                          groupId: id,
                          expenseId: expenseForOptions.id,
                        },
                      })
                    }
                    disabled={
                      expenseForOptions.isDeleted ||
                      toggleExpensePinMutation.isPending
                    }
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left hover:bg-gray-50 disabled:opacity-60"
                  >
                    <Pin
                      className={`h-5 w-5 ${
                        expenseForOptions.isPinned
                          ? 'fill-current text-amber-500'
                          : 'text-[#1a1a3e]'
                      }`}
                    />
                    <span className="font-medium text-[#1a1a3e]">
                      {expenseForOptions.isPinned ? 'Desfijar' : 'Fijar'}
                    </span>
                  </button>
                )}

                {!expenseForOptions.isDeleted && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowExpenseOptionsModal(false);
                      handleDeleteExpense(expenseForOptions.id);
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left hover:bg-red-50"
                  >
                    <Trash2 className="h-5 w-5 text-red-500" />
                    <span className="font-medium text-red-500">Eliminar</span>
                  </button>
                )}
              </div>

              {toggleExpensePinMutation.data?.error ? (
                <p className="mt-3 text-sm text-red-500">
                  {toggleExpensePinMutation.data.error}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </AppDrawer>

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
                {' '}
                {formatMoney(expenseToDelete.amount, expenseToDelete.currency)}.
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
                      to: '/groups/$id/categories',
                      params: { id },
                    });
                  }}
                  className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <LayoutGrid className="w-5 h-5 text-[#1a1a3e]" />
                  <span className="text-[#1a1a3e] font-medium">
                    Categorías
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
