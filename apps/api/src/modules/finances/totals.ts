import { groupExpenseShare } from './group-expenses';
import { addCurrencyTotal, money } from './money';
import { readExpenseTags } from './tags';

export const debtViewerDirection = (
  debt: { ownerId: string; direction: string },
  userId: string,
) => {
  const ownerDirection = debt.direction === 'borrowed' ? 'borrowed' : 'lent';
  if (debt.ownerId === userId) return ownerDirection;
  return ownerDirection === 'lent' ? 'borrowed' : 'lent';
};

export const debtTotals = (
  debts: readonly {
    ownerId: string;
    direction: string;
    currency: string;
    expectedTotal: number;
    payments: ReadonlyArray<{ amount: number }>;
  }[],
  userId: string,
) => {
  const owedByYou: Record<string, number> = {};
  const owedToYou: Record<string, number> = {};

  for (const debt of debts) {
    const paid = debt.payments.reduce(
      (total, payment) => total + payment.amount,
      0,
    );
    const remaining = money(Math.max(debt.expectedTotal - paid, 0));
    if (remaining <= 0) continue;

    addCurrencyTotal(
      debtViewerDirection(debt, userId) === 'borrowed' ? owedByYou : owedToYou,
      debt.currency,
      remaining,
    );
  }

  return { owedByYou, owedToYou };
};

export const goalTotals = (
  goals: readonly {
    currency: string;
    targetAmount: number;
    contributions: ReadonlyArray<{ amount: number }>;
  }[],
) => {
  const target: Record<string, number> = {};
  const saved: Record<string, number> = {};

  for (const goal of goals) {
    const savedAmount = money(
      goal.contributions.reduce(
        (total, contribution) => total + contribution.amount,
        0,
      ),
    );
    addCurrencyTotal(target, goal.currency, goal.targetAmount);
    addCurrencyTotal(saved, goal.currency, savedAmount);
  }

  return { target, saved };
};

export const accountTotals = (
  accounts: readonly {
    accountType: string;
    currency: string;
    currentBalance: number;
    availableBalance: number;
    lockedBalance: number;
    creditLimit: number | null;
    usedCredit: number;
    status: string;
    archivedAt: Date | null;
  }[],
) => {
  const totalByCurrency: Record<string, number> = {};
  const availableByCurrency: Record<string, number> = {};
  const lockedByCurrency: Record<string, number> = {};
  const creditLimitByCurrency: Record<string, number> = {};
  const creditUsedByCurrency: Record<string, number> = {};
  const creditAvailableByCurrency: Record<string, number> = {};

  for (const account of accounts) {
    if (account.archivedAt || account.status === 'CLOSED') continue;
    if (account.accountType === 'CREDIT_CARD') {
      addCurrencyTotal(
        creditLimitByCurrency,
        account.currency,
        account.creditLimit ?? 0,
      );
      addCurrencyTotal(
        creditUsedByCurrency,
        account.currency,
        account.usedCredit,
      );
      addCurrencyTotal(
        creditAvailableByCurrency,
        account.currency,
        account.availableBalance,
      );
      continue;
    }

    addCurrencyTotal(totalByCurrency, account.currency, account.currentBalance);
    addCurrencyTotal(
      availableByCurrency,
      account.currency,
      account.availableBalance,
    );
    addCurrencyTotal(lockedByCurrency, account.currency, account.lockedBalance);
  }

  return {
    totalByCurrency,
    availableByCurrency,
    lockedByCurrency,
    creditLimitByCurrency,
    creditUsedByCurrency,
    creditAvailableByCurrency,
  };
};

type CategoryRef = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
};

export const groupExpenseTotals = (
  groups: readonly {
    id: string;
    name: string;
    type: string;
    GroupMember: ReadonlyArray<{ id: string }>;
    Expense: ReadonlyArray<{
      id: string;
      amount: number;
      currency: string;
      date: Date;
      description: string;
      metadata: unknown;
      category: CategoryRef | null;
      payers: ReadonlyArray<{ memberId: string; amount: number }>;
      participants: ReadonlyArray<{ memberId: string; share: number }>;
    }>;
  }[],
) => {
  const totals: Record<string, number> = {};

  const movements = groups
    .flatMap((group) => {
      const memberId = group.GroupMember[0]?.id;
      if (!memberId) return [];

      return group.Expense.flatMap((expense) => {
        const share = groupExpenseShare(expense, group.type, memberId);
        if (!share) return [];

        addCurrencyTotal(totals, expense.currency, share.amount);
        return [
          {
            id: expense.id,
            groupId: group.id,
            groupName: group.name,
            groupType: group.type,
            description: expense.description,
            amount: expense.amount,
            userShare: share.userShare,
            currentUserBalance: share.currentUserBalance,
            currency: expense.currency,
            occurredAt: expense.date.toISOString(),
            category: expense.category,
            tags: readExpenseTags(expense.metadata),
          },
        ];
      });
    })
    .sort((left, right) => {
      const dateDelta =
        new Date(right.occurredAt).getTime() -
        new Date(left.occurredAt).getTime();
      return dateDelta === 0 ? right.id.localeCompare(left.id) : dateDelta;
    });

  return { totals, count: movements.length, movements };
};
