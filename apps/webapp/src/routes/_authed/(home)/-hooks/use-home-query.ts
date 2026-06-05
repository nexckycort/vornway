import { useQuery } from '@tanstack/react-query';
import { client } from '#/lib/hc';
import {
  getCachedHomeSummary,
  type HomeApiResponse,
  upsertCachedHomeSummary,
} from '#/lib/home-query-collection';
import { formatCurrency, formatShortDate } from '#/lib/i18n';
import { getHomeMessages } from '#/routes/_authed/(home)/-messages';

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
  imageUrl: string | null;
  avatars: Array<{
    name: string;
    image: string | null;
  }>;
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

function mapHomeData(apiData: HomeApiResponse): HomeQueryData {
  const t = getHomeMessages();
  const homeActions: HomeAction[] = [
    {
      id: 'currency-converter',
      icon: 'repeat',
      label: t.currencyConverter,
      variant: 'neutral',
    },
    {
      id: 'create-group',
      icon: 'compass',
      label: t.createNewGroup,
      variant: 'primary',
    },
  ];
  const trips: Trip[] = apiData.groups.map((group) => {
    const avatars =
      group.members.length <= 2
        ? group.members
        : ([group.members[0], group.members[group.members.length - 1]].filter(
            Boolean,
          ) as Array<{
            name: string;
            image: string | null;
          }>);
    const extraPeople = Math.max(0, group.members.length - avatars.length);

    const balances = group.participantBalances.map((item) => ({
      person: item.memberName,
      amount:
        item.direction === 'theyOweYou'
          ? `${t.theyOwe} ${formatCurrency(item.currency, item.amount)}`
          : `${t.youOwe} ${formatCurrency(item.currency, item.amount)}`,
    }));
    const visibleBalances = balances.slice(0, 2);
    const overflowCount = Math.max(0, balances.length - visibleBalances.length);

    const balanceTotalsByCurrency = new Map<string, number>();
    for (const item of group.participantBalances) {
      const signedAmount =
        item.direction === 'theyOweYou' ? item.amount : -item.amount;
      balanceTotalsByCurrency.set(
        item.currency,
        (balanceTotalsByCurrency.get(item.currency) ?? 0) + signedAmount,
      );
    }

    const balanceTotals = Array.from(balanceTotalsByCurrency.entries()).filter(
      ([, value]) => Math.abs(value) >= 0.01,
    );
    const firstTotal = balanceTotals[0];
    const balanceLabel = firstTotal
      ? firstTotal[1] > 0
        ? `${t.theyOwe} ${formatCurrency(firstTotal[0], Math.abs(firstTotal[1]))}`
        : `${t.youOwe} ${formatCurrency(firstTotal[0], Math.abs(firstTotal[1]))}`
      : t.noPendingBalances;

    if (balances.length === 0) {
      return {
        id: group.id,
        name: group.name,
        dates: t.createdAt(formatShortDate(group.createdAt)),
        imageUrl: group.imageUrl,
        avatars,
        extraPeople,
        emptyLabel: group.hasExpenses ? t.noPendingBalances : t.noExpenses,
      };
    }

    return {
      id: group.id,
      name: group.name,
      dates: t.createdAt(formatShortDate(group.createdAt)),
      imageUrl: group.imageUrl,
      avatars,
      extraPeople,
      balanceLabel,
      balanceItems: visibleBalances,
      ...(overflowCount > 0
        ? { balanceOverflowLabel: t.otherBalances(overflowCount) }
        : {}),
    };
  });

  const savingGoals: SavingGoal[] = apiData.goals.map((goal, index) => ({
    id: goal.id,
    name: goal.title,
    category: goal.group.name,
    saved: formatCurrency(goal.currency, goal.savedAmount),
    target: formatCurrency(goal.currency, goal.targetAmount),
    progress: goal.progress,
    icon: index % 2 === 0 ? 'compass' : 'shirt',
    tone: index % 2 === 0 ? 'pink' : 'yellow',
  }));

  return {
    welcomeText: t.welcome,
    actions: homeActions,
    trips,
    savingGoals,
  };
}

const emptyHomeData: HomeQueryData = {
  welcomeText: getHomeMessages().welcome,
  actions: [],
  trips: [],
  savingGoals: [],
};

export function useHomeQuery() {
  const t = getHomeMessages();

  return useQuery({
    queryKey: ['home-summary'],
    queryFn: async () => {
      const cachedHomeSummary = await getCachedHomeSummary();
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (cachedHomeSummary) {
          return mapHomeData(cachedHomeSummary);
        }

        throw new Error(t.loadError);
      }

      let response: Awaited<ReturnType<typeof homeEndpoint>>;
      try {
        response = await homeEndpoint();
      } catch {
        if (cachedHomeSummary) {
          return mapHomeData(cachedHomeSummary);
        }

        throw new Error(t.loadError);
      }

      if (!response.ok) {
        if (cachedHomeSummary) {
          return mapHomeData(cachedHomeSummary);
        }

        throw new Error(t.loadError);
      }
      const payload = (await response.json()) as HomeApiResponse;
      await upsertCachedHomeSummary(payload);
      return mapHomeData(payload);
    },
  });
}

export { emptyHomeData };
