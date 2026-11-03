import { useQuery } from '@tanstack/react-query';
import { type ApiSuccess, apiErrorMessage } from '@vornway/api-client';
import { api } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { cacheHomeData, readCachedHomeData } from '@/lib/home-cache';
import type { HomeData } from '../home.types';

type HomeResponse = ApiSuccess<'home', 'summary'>;
type ExpensesResponse = ApiSuccess<'quickSplits', 'listExpenses'>;
type NotificationsResponse = ApiSuccess<'notifications', 'list'>;

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

const date = (value: Date | string) =>
  new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));

function mapHome(
  home: HomeResponse,
  expenses: ExpensesResponse,
  notifications: NotificationsResponse,
): HomeData {
  return {
    trips: home.groups.map((group) => ({
      id: group.id,
      name: group.name,
      imageUrl: group.imageUrl,
      isPersonal: group.type === 'personal',
      dates: `Creado ${date(group.createdAt)}`,
      members: group.members,
      balanceLabel: (() => {
        const firstTotal = Object.entries(group.totalsByCurrency).find(
          ([, amount]) => Math.abs(amount) >= 0.01,
        );
        if (!firstTotal) return undefined;
        return firstTotal[1] > 0
          ? `Te deben ${money(firstTotal[1], firstTotal[0])}`
          : `Debes ${money(firstTotal[1], firstTotal[0])}`;
      })(),
      balanceItems: group.participantBalances.slice(0, 2).map((balance) => ({
        person: balance.memberName,
        amount:
          balance.direction === 'theyOweYou'
            ? `Te deben ${money(balance.amount, balance.currency)}`
            : `Debes ${money(balance.amount, balance.currency)}`,
      })),
      balanceOverflowLabel:
        group.participantBalances.length > 2
          ? `Otras ${group.participantBalances.length - 2} personas`
          : undefined,
      emptyLabel:
        group.participantBalances.length === 0
          ? group.hasExpenses
            ? 'Sin saldos pendientes'
            : 'Sin gastos'
          : undefined,
    })),
    expenses: expenses.data.map((expense) => ({
      id: expense.id,
      quickSplitId: expense.quickSplitId,
      description: expense.description,
      quickSplitName: expense.quickSplitName,
      amount: money(expense.amount, expense.currency),
      paidBy: expense.paidBy.name,
      participantCount: expense.participantCount,
      balance:
        expense.currentUserBalance > 0
          ? `Te deben ${money(expense.currentUserBalance, expense.currency)}`
          : expense.currentUserBalance < 0
            ? `Debes ${money(expense.currentUserBalance, expense.currency)}`
            : 'Sin saldos pendientes',
      createdAtLabel: date(expense.createdAt),
    })),
    goals: home.goals.map((goal, index) => ({
      id: goal.id,
      title: goal.title,
      groupName: goal.group.name,
      saved: money(goal.savedAmount, goal.currency),
      target: money(goal.targetAmount, goal.currency),
      progress: Math.max(0, Math.min(100, goal.progress)),
      tone: index % 2 === 0 ? 'pink' : 'yellow',
    })),
    debts: home.recentDebts.map((debt) => ({
      id: debt.id,
      counterpartyName: debt.counterpartyName,
      directionLabel: debt.direction === 'lent' ? 'Te deben' : 'Debes',
      remaining: money(debt.remainingAmount, debt.currency),
      statusLabel:
        debt.status === 'paid'
          ? 'Pagada'
          : debt.status === 'overdue'
            ? 'Vencida'
            : 'Activa',
      updatedAtLabel: date(debt.updatedAt),
    })),
    unreadNotifications: notifications.unreadCount,
  };
}

export function useHomeData() {
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const query = useQuery({
    queryKey: ['home-summary'],
    enabled: !isSessionPending && Boolean(session),
    queryFn: async () => {
      try {
        const [home, expenses, notifications] = await Promise.all([
          api.home.summary.request(),
          api.quickSplits.listExpenses.request({ query: { limit: 3 } }),
          api.notifications.list.request({ query: { limit: 1 } }),
        ]);
        const data = mapHome(home, expenses, notifications);
        try {
          await cacheHomeData(data);
        } catch {
          // Cache persistence must never make a successful network load fail.
        }
        return data;
      } catch (error) {
        const cached = await readCachedHomeData();
        if (cached) return cached;
        throw error;
      }
    },
  });

  return {
    data: query.data ?? null,
    error: query.error
      ? apiErrorMessage(query.error, 'No se pudo cargar el home')
      : null,
    isLoading: query.isLoading || isSessionPending,
    reload: query.refetch,
  };
}
