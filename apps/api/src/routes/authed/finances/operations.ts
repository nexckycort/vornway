import { db } from '#/infrastructure/database/connection';
import type {
  CreateFinanceCategoryInput,
  CreateFinanceTransactionInput,
  FinancesSummaryQueryInput,
  UpdateFinanceCategoryInput,
  UpsertFinanceBudgetInput,
} from './schema';

const defaultExpenseCategories = [
  { name: 'Arriendo', icon: 'home', color: '#2563eb' },
  { name: 'Comida', icon: 'utensils', color: '#16a34a' },
  { name: 'Salidas', icon: 'sparkles', color: '#db2777' },
  { name: 'Transporte', icon: 'car', color: '#f59e0b' },
  { name: 'Servicios', icon: 'bolt', color: '#7c3aed' },
  { name: 'Salud', icon: 'heart', color: '#dc2626' },
  { name: 'Otros', icon: 'dots', color: '#64748b' },
] as const;

const defaultIncomeCategories = [
  { name: 'Salario', icon: 'wallet', color: '#059669' },
  { name: 'Ingresos extra', icon: 'plus', color: '#0f766e' },
] as const;

const money = (value: number) => Number(value.toFixed(2));

function toFinanceTransactionType(type: 'income' | 'expense' | 'both') {
  return type === 'income' ? 'INCOME' : type === 'expense' ? 'EXPENSE' : 'BOTH';
}

function monthRange(month?: string) {
  const now = new Date();
  const source =
    month && /^\d{4}-\d{2}$/.test(month)
      ? month
      : `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const [yearValue, monthValue] = source.split('-').map(Number);
  const start = new Date(
    Date.UTC(yearValue ?? now.getUTCFullYear(), (monthValue ?? 1) - 1, 1),
  );
  const end = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1),
  );
  return { key: source, start, end };
}

function addCurrencyTotal(
  totals: Record<string, number>,
  currency: string,
  amount: number,
) {
  totals[currency] = money((totals[currency] ?? 0) + amount);
}

async function ensureDefaults(userId: string, currency: string) {
  const [accountCount, categoryCount] = await Promise.all([
    db.financeAccount.count({ where: { ownerId: userId } }),
    db.financeCategory.count({ where: { ownerId: userId } }),
  ]);

  if (accountCount === 0) {
    await db.financeAccount.create({
      data: {
        ownerId: userId,
        name: 'Efectivo',
        accountType: 'CASH',
        currency,
      },
    });
  }

  if (categoryCount === 0) {
    await db.financeCategory.createMany({
      data: [
        ...defaultIncomeCategories.map((category) => ({
          ownerId: userId,
          transactionType: 'INCOME' as const,
          isDefault: true,
          ...category,
        })),
        ...defaultExpenseCategories.map((category) => ({
          ownerId: userId,
          transactionType: 'EXPENSE' as const,
          isDefault: true,
          ...category,
        })),
      ],
      skipDuplicates: true,
    });
  }
}

async function getGroupExpenseTotals(userId: string, start: Date, end: Date) {
  const groups = await db.group.findMany({
    where: {
      Goal: { none: {} },
      OR: [{ ownerId: userId }, { GroupMember: { some: { userId } } }],
    },
    select: {
      id: true,
      type: true,
      GroupMember: { where: { userId }, select: { id: true } },
      Expense: {
        where: {
          status: 'ACTIVE',
          deletedAt: null,
          date: { gte: start, lt: end },
          OR: [
            { notes: null },
            {
              notes: {
                not: {
                  contains: '[DELETED]',
                },
              },
            },
          ],
        },
        select: {
          amount: true,
          currency: true,
          participants: { select: { memberId: true, share: true } },
        },
      },
    },
  });

  const totals: Record<string, number> = {};
  let count = 0;

  for (const group of groups) {
    const currentMemberId = group.GroupMember[0]?.id;
    if (!currentMemberId) continue;

    for (const expense of group.Expense) {
      const currentShare = expense.participants.find(
        (participant) => participant.memberId === currentMemberId,
      )?.share;
      const amount =
        typeof currentShare === 'number'
          ? currentShare
          : group.type === 'personal' && expense.participants.length === 0
            ? expense.amount
            : 0;

      if (amount <= 0) continue;
      addCurrencyTotal(totals, expense.currency, amount);
      count += 1;
    }
  }

  return { totals, count };
}

async function getDebtTotals(userId: string) {
  const debts = await db.debt.findMany({
    where: { OR: [{ ownerId: userId }, { counterpartyId: userId }] },
    select: {
      ownerId: true,
      direction: true,
      currency: true,
      expectedTotal: true,
      payments: { select: { amount: true } },
    },
  });

  const owedByYou: Record<string, number> = {};
  const owedToYou: Record<string, number> = {};

  for (const debt of debts) {
    const paid = debt.payments.reduce(
      (total, payment) => total + payment.amount,
      0,
    );
    const remaining = money(Math.max(debt.expectedTotal - paid, 0));
    if (remaining <= 0) continue;

    const ownerDirection = debt.direction === 'borrowed' ? 'borrowed' : 'lent';
    const viewerDirection =
      debt.ownerId === userId
        ? ownerDirection
        : ownerDirection === 'lent'
          ? 'borrowed'
          : 'lent';

    addCurrencyTotal(
      viewerDirection === 'borrowed' ? owedByYou : owedToYou,
      debt.currency,
      remaining,
    );
  }

  return { owedByYou, owedToYou };
}

async function getGoalTotals(userId: string) {
  const goals = await db.goal.findMany({
    where: {
      deletedAt: null,
      completedAt: null,
      group: {
        OR: [{ ownerId: userId }, { GroupMember: { some: { userId } } }],
      },
    },
    select: {
      currency: true,
      targetAmount: true,
      contributions: { select: { amount: true } },
    },
  });

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
}

export const financeOperations = {
  async summary(userId: string, input: FinancesSummaryQueryInput) {
    await ensureDefaults(userId, input.currency);
    const range = monthRange(input.month);

    const [
      transactions,
      categories,
      accounts,
      budgets,
      groupExpenseTotals,
      debtTotals,
      goalTotals,
    ] = await Promise.all([
      db.financeTransaction.findMany({
        where: {
          ownerId: userId,
          occurredAt: { gte: range.start, lt: range.end },
        },
        include: { category: true, account: true },
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      }),
      db.financeCategory.findMany({
        where: { ownerId: userId, archivedAt: null },
        orderBy: [{ transactionType: 'asc' }, { name: 'asc' }],
      }),
      db.financeAccount.findMany({
        where: { ownerId: userId, archivedAt: null },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
      db.financeBudget.findMany({
        where: { ownerId: userId, month: range.start },
        include: { category: true },
      }),
      getGroupExpenseTotals(userId, range.start, range.end),
      getDebtTotals(userId),
      getGoalTotals(userId),
    ]);

    const incomeByCurrency: Record<string, number> = {};
    const personalExpenseByCurrency: Record<string, number> = {};
    const categoryExpenseTotals = new Map<
      string,
      {
        categoryId: string | null;
        categoryName: string;
        currency: string;
        amount: number;
      }
    >();

    for (const transaction of transactions) {
      if (transaction.type === 'INCOME') {
        addCurrencyTotal(
          incomeByCurrency,
          transaction.currency,
          transaction.amount,
        );
        continue;
      }

      addCurrencyTotal(
        personalExpenseByCurrency,
        transaction.currency,
        transaction.amount,
      );
      const key = `${transaction.categoryId ?? 'none'}:${transaction.currency}`;
      const current = categoryExpenseTotals.get(key);
      categoryExpenseTotals.set(key, {
        categoryId: transaction.categoryId,
        categoryName: transaction.category?.name ?? 'Sin categoria',
        currency: transaction.currency,
        amount: money((current?.amount ?? 0) + transaction.amount),
      });
    }

    const totalExpenseByCurrency = { ...personalExpenseByCurrency };
    for (const [currency, amount] of Object.entries(
      groupExpenseTotals.totals,
    )) {
      addCurrencyTotal(totalExpenseByCurrency, currency, amount);
    }

    const balanceByCurrency: Record<string, number> = {};
    const currencies = new Set([
      ...Object.keys(incomeByCurrency),
      ...Object.keys(totalExpenseByCurrency),
    ]);
    for (const currency of currencies) {
      balanceByCurrency[currency] = money(
        (incomeByCurrency[currency] ?? 0) -
          (totalExpenseByCurrency[currency] ?? 0),
      );
    }

    return {
      month: range.key,
      currency: input.currency,
      totals: {
        incomeByCurrency,
        personalExpenseByCurrency,
        groupExpenseByCurrency: groupExpenseTotals.totals,
        totalExpenseByCurrency,
        balanceByCurrency,
        owedByYouByCurrency: debtTotals.owedByYou,
        owedToYouByCurrency: debtTotals.owedToYou,
        goalTargetByCurrency: goalTotals.target,
        goalSavedByCurrency: goalTotals.saved,
      },
      counts: {
        transactions: transactions.length,
        groupExpenses: groupExpenseTotals.count,
      },
      categories,
      accounts,
      budgets: budgets.map((budget) => ({
        ...budget,
        month: budget.month.toISOString(),
      })),
      categoryExpenseTotals: Array.from(categoryExpenseTotals.values()).sort(
        (a, b) => b.amount - a.amount,
      ),
      recentTransactions: transactions.slice(0, 12).map((transaction) => ({
        ...transaction,
        occurredAt: transaction.occurredAt.toISOString(),
        createdAt: transaction.createdAt.toISOString(),
        updatedAt: transaction.updatedAt.toISOString(),
      })),
    };
  },

  async createTransaction(
    userId: string,
    input: CreateFinanceTransactionInput,
  ) {
    await ensureDefaults(userId, input.currency);
    const type = input.type === 'income' ? 'INCOME' : 'EXPENSE';

    if (input.categoryId) {
      const category = await db.financeCategory.findFirst({
        where: {
          id: input.categoryId,
          ownerId: userId,
          OR: [{ transactionType: type }, { transactionType: 'BOTH' }],
        },
        select: { id: true },
      });
      if (!category) throw new Error('Invalid finance category');
    }

    if (input.accountId) {
      const account = await db.financeAccount.findFirst({
        where: { id: input.accountId, ownerId: userId },
        select: { id: true },
      });
      if (!account) throw new Error('Invalid finance account');
    }

    return db.financeTransaction.create({
      data: {
        ownerId: userId,
        accountId: input.accountId,
        categoryId: input.categoryId,
        type,
        amount: money(input.amount),
        currency: input.currency,
        description: input.description,
        occurredAt: input.occurredAt ?? new Date(),
        notes: input.notes,
      },
      include: { category: true, account: true },
    });
  },

  async createCategory(userId: string, input: CreateFinanceCategoryInput) {
    await ensureDefaults(userId, 'COP');
    const transactionType = toFinanceTransactionType(input.type);
    const name = input.name.trim();
    const existingCategory = await db.financeCategory.findFirst({
      where: {
        ownerId: userId,
        name: { equals: name, mode: 'insensitive' },
        archivedAt: null,
      },
    });

    if (existingCategory) {
      if (
        existingCategory.transactionType !== 'BOTH' &&
        existingCategory.transactionType !== transactionType
      ) {
        return db.financeCategory.update({
          where: { id: existingCategory.id },
          data: { transactionType: 'BOTH' },
        });
      }

      return existingCategory;
    }

    return db.financeCategory.create({
      data: {
        ownerId: userId,
        name,
        transactionType,
        icon: input.icon ?? (input.type === 'income' ? 'plus' : 'tag'),
        color:
          input.color ??
          (input.type === 'income'
            ? '#059669'
            : input.type === 'expense'
              ? '#334155'
              : '#4f46e5'),
      },
    });
  },

  async updateCategory(
    userId: string,
    categoryId: string,
    input: UpdateFinanceCategoryInput,
  ) {
    const category = await db.financeCategory.findFirst({
      where: { id: categoryId, ownerId: userId, archivedAt: null },
    });
    if (!category) return null;

    const name = input.name?.trim();
    if (name) {
      const duplicateCategory = await db.financeCategory.findFirst({
        where: {
          ownerId: userId,
          archivedAt: null,
          name: { equals: name, mode: 'insensitive' },
          id: { not: categoryId },
        },
        select: { id: true },
      });

      if (duplicateCategory) {
        throw new Error('A finance category with this name already exists');
      }
    }

    return db.financeCategory.update({
      where: { id: categoryId },
      data: {
        ...(name ? { name } : {}),
        ...(input.type
          ? { transactionType: toFinanceTransactionType(input.type) }
          : {}),
        ...(input.icon !== undefined ? { icon: input.icon } : {}),
        ...(input.color !== undefined ? { color: input.color } : {}),
      },
    });
  },

  async upsertBudget(userId: string, input: UpsertFinanceBudgetInput) {
    await ensureDefaults(userId, input.currency);
    const category = await db.financeCategory.findFirst({
      where: {
        id: input.categoryId,
        ownerId: userId,
        OR: [{ transactionType: 'EXPENSE' }, { transactionType: 'BOTH' }],
      },
      select: { id: true },
    });
    if (!category) throw new Error('Invalid finance category');

    const { start } = monthRange(input.month);
    return db.financeBudget.upsert({
      where: {
        ownerId_categoryId_month_currency: {
          ownerId: userId,
          categoryId: input.categoryId,
          month: start,
          currency: input.currency,
        },
      },
      create: {
        ownerId: userId,
        categoryId: input.categoryId,
        month: start,
        amount: money(input.amount),
        currency: input.currency,
      },
      update: {
        amount: money(input.amount),
      },
      include: { category: true },
    });
  },
};
