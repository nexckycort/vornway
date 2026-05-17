import type { InferResponseType } from '#/lib/hc';
import { client } from '#/lib/hc';
import { useQuery } from '@tanstack/react-query';

export type HomeIconName =
  | 'bell'
  | 'compass'
  | 'home'
  | 'piggy-bank'
  | 'plus'
  | 'repeat'
  | 'shirt'
  | 'user';

export type HomeAction = {
  id: string;
  icon: HomeIconName;
  label: string;
  variant: 'neutral' | 'primary';
};

export type Trip = {
  id: string;
  name: string;
  dates: string;
  avatars: string[];
  extraPeople: number;
} & (
  | {
      balanceLabel: string;
      balanceItems: { person: string; amount: string }[];
      balanceOverflowLabel?: string;
      emptyLabel?: never;
    }
  | {
      emptyLabel: string;
      balanceLabel?: never;
      balanceItems?: never;
    }
);

export type SavingGoal = {
  id: string;
  name: string;
  category: string;
  saved: string;
  target: string;
  progress: number;
  icon: HomeIconName;
  tone: 'pink' | 'yellow';
};

export type HomeQueryData = {
  welcomeText: string;
  actions: HomeAction[];
  trips: Trip[];
  savingGoals: SavingGoal[];
};

const homeEndpoint = client.api.home.$get;
type HomeApiResponse = InferResponseType<typeof homeEndpoint>;

const homeActions: HomeAction[] = [
  {
    id: 'currency-converter',
    icon: 'repeat',
    label: 'Convertidor de moneda',
    variant: 'neutral',
  },
  {
    id: 'create-group',
    icon: 'compass',
    label: 'Crear nuevo grupo',
    variant: 'primary',
  },
];

function mapHomeData(apiData: HomeApiResponse): HomeQueryData {
  const trips: Trip[] = apiData.groups.map((group) => {
    const names =
      group.members.length > 0
        ? group.members.map((member) => member.name)
        : [
            ...(group.currentUser ? [group.currentUser.name] : []),
            ...group.participantBalances.map((item) => item.memberName),
          ];
    const uniqueNames = Array.from(new Set(names));
    const avatars = uniqueNames.slice(0, 2).map(toInitials);
    const extraPeople = Math.max(0, uniqueNames.length - avatars.length);

    const balances = group.participantBalances.map((item) => ({
      person: item.memberName,
      amount:
        item.direction === 'theyOweYou'
          ? `Te debe ${formatAmount(item.currency, item.amount)}`
          : `Debes ${formatAmount(item.currency, item.amount)}`,
    }));
    const visibleBalances = balances.slice(0, 2);
    const overflowCount = Math.max(0, balances.length - visibleBalances.length);

    const totals = Object.entries(group.totalsByCurrency).filter(
      ([, value]) => Math.abs(value) >= 0.01,
    );
    const firstTotal = totals[0];
    const balanceLabel = firstTotal
      ? firstTotal[1] > 0
        ? `Te deben ${formatAmount(firstTotal[0], Math.abs(firstTotal[1]))}`
        : `Debes ${formatAmount(firstTotal[0], Math.abs(firstTotal[1]))}`
      : 'Sin saldos pendientes';

    if (balances.length === 0) {
      return {
        id: group.id,
        name: group.name,
        dates: `Creado ${formatShortDate(group.createdAt)}`,
        avatars,
        extraPeople,
        emptyLabel: group.hasExpenses ? 'Sin saldos pendientes' : 'Sin gastos',
      };
    }

    return {
      id: group.id,
      name: group.name,
      dates: `Creado ${formatShortDate(group.createdAt)}`,
      avatars,
      extraPeople,
      balanceLabel,
      balanceItems: visibleBalances,
      ...(overflowCount > 0
        ? { balanceOverflowLabel: `y ${overflowCount} otros saldos` }
        : {}),
    };
  });

  const savingGoals: SavingGoal[] = apiData.goals.map((goal, index) => ({
    id: goal.id,
    name: goal.title,
    category: goal.group.name,
    saved: formatAmount(goal.currency, goal.savedAmount),
    target: formatAmount(goal.currency, goal.targetAmount),
    progress: goal.progress,
    icon: index % 2 === 0 ? 'compass' : 'shirt',
    tone: index % 2 === 0 ? 'pink' : 'yellow',
  }));

  return {
    welcomeText: 'Bienvenido a Vornway',
    actions: homeActions,
    trips,
    savingGoals,
  };
}

const emptyHomeData: HomeQueryData = {
  welcomeText: 'Bienvenido a Vornway',
  actions: homeActions,
  trips: [],
  savingGoals: [],
};

function formatAmount(currency: string, amount: number): string {
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

function toInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export function useHomeQuery() {
  return useQuery({
    queryKey: ['home-summary'],
    queryFn: async () => {
      const response = await homeEndpoint();
      if (!response.ok) {
        throw new Error('No se pudo cargar el home');
      }
      const payload = (await response.json()) as HomeApiResponse;
      return mapHomeData(payload);
    },
  });
}

export { emptyHomeData };
