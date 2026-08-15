import { useCallback, useEffect, useState } from 'react';
import { homeClient } from '@/api/home';
import { notificationsClient } from '@/api/notifications';
import { quickSplitsClient } from '@/api/quick-splits';
import { authClient } from '@/lib/auth-client';
import type { HomeData } from '../home.types';

type HomeResponse = {
  groups: Array<{
    id: string;
    name: string;
    imageUrl: string | null;
    members: Array<{ id: string; name: string; image: string | null }>;
    participantBalances: Array<{
      amount: number;
      currency: string;
      memberName: string;
      label: string;
    }>;
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
    description: string;
    quickSplitName: string;
    amount: number;
    currency: string;
    participantCount: number;
    paidBy: { name: string };
    currentUserBalance: number;
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
      members: group.members,
      balances: group.participantBalances
        .slice(0, 2)
        .map((balance) =>
          balance.amount === 0
            ? `${balance.memberName}: al día`
            : `${balance.label}: ${money(balance.amount, balance.currency)}`,
        ),
    })),
    expenses: expenses.data.map((expense) => ({
      id: expense.id,
      description: expense.description,
      quickSplitName: expense.quickSplitName,
      amount: money(expense.amount, expense.currency),
      paidBy: expense.paidBy.name,
      participantCount: expense.participantCount,
      balance:
        expense.currentUserBalance >= 0
          ? `Te deben ${money(expense.currentUserBalance, expense.currency)}`
          : `Debes ${money(expense.currentUserBalance, expense.currency)}`,
    })),
    goals: home.goals.map((goal, index) => ({
      id: goal.id,
      title: goal.title,
      groupName: goal.group.name,
      saved: money(goal.savedAmount, goal.currency),
      target: money(goal.targetAmount, goal.currency),
      progress: Math.max(0, Math.min(1, goal.progress)),
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
  const [data, setData] = useState<HomeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);

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

      setData(
        mapHome(
          await homeResponse.json(),
          await expensesResponse.json(),
          await notificationsResponse.json(),
        ),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'Error inesperado',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Do not race the first RPC request against Better Auth's session restore.
    // On web this also lets the browser attach its auth cookie first.
    if (isSessionPending || !session) return;
    void reload();
  }, [isSessionPending, reload, session]);

  return { data, error, isLoading, reload };
}
