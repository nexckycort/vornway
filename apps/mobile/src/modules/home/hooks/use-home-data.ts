import { useQuery } from '@tanstack/react-query';
import { homeClient } from '@/api/home';
import { notificationsClient } from '@/api/notifications';
import { quickSplitsClient } from '@/api/quick-splits';
import { authClient } from '@/lib/auth-client';
import { cacheHomeData, readCachedHomeData } from '@/lib/home-cache';
import type { HomeData } from '../home.types';

type HomeResponse = {
  groups: Array<{
    id: string;
    name: string;
    createdAt: string;
    type?: string;
    imageUrl: string | null;
    hasExpenses: boolean;
    members: Array<{ id: string; name: string; image: string | null }>;
    participantBalances: Array<{
      memberId: string;
      amount: number;
      currency: string;
      memberName: string;
      direction: 'theyOweYou' | 'youOweThem';
      label: string;
    }>;
    totalsByCurrency: Record<string, number>;
  }>;
  goals: Array<{
    id: string;
    title: string;
    currency: string;
    targetAmount: number;
    savedAmount: number;
    progress: number;
    group: { name: string };
  }>;
  recentDebts: Array<{
    id: string;
    counterpartyName: string;
    direction: 'lent' | 'borrowed';
    currency: string;
    remainingAmount: number;
    status: 'active' | 'paid' | 'overdue';
    updatedAt: string;
  }>;
};
type ExpensesResponse = {
  data: Array<{
    id: string;
    quickSplitId: string;
    description: string;
    quickSplitName: string;
    amount: number;
    currency: string;
    participantCount: number;
    paidBy: { name: string };
    currentUserBalance: number;
    createdAt: string;
  }>;
};
type NotificationsResponse = { unreadCount: number };

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

const date = (value: string) =>
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
        const [homeResponse, expensesResponse, notificationsResponse] =
          await Promise.all([
            homeClient.index.$get(),
            quickSplitsClient.expenses.$get({ query: { limit: '3' } }),
            notificationsClient.index.$get({ query: { limit: '1' } }),
          ]);

        if (
          !homeResponse.ok ||
          !expensesResponse.ok ||
          !notificationsResponse.ok
        ) {
          throw new Error('No se pudo cargar el home');
        }
        const data = mapHome(
          await homeResponse.json(),
          await expensesResponse.json(),
          await notificationsResponse.json(),
        );
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
    error: query.error instanceof Error ? query.error.message : null,
    isLoading: query.isLoading || isSessionPending,
    reload: query.refetch,
  };
}
