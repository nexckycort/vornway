import { db } from '#/infrastructure/database/connection';
import type {
  CreateFinanceCategoryInput,
  CreateFinanceTransactionInput,
  FinancesSummaryQueryInput,
  UpdateFinanceCategoryInput,
  UpdateFinanceTransactionInput,
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
const fallbackTimeZone = 'UTC';
const tagPattern = /^[a-z0-9][a-z0-9-]{0,39}$/;

function toFinanceTransactionType(type: 'income' | 'expense' | 'both') {
  return type === 'income' ? 'INCOME' : type === 'expense' ? 'EXPENSE' : 'BOTH';
}

function getValidTimeZone(timeZone?: string) {
  if (!timeZone) return fallbackTimeZone;

  try {
    Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return fallbackTimeZone;
  }
}

function getTimeZoneDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    calendar: 'iso8601',
    numberingSystem: 'latn',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: values.year ?? date.getUTCFullYear(),
    month: values.month ?? date.getUTCMonth() + 1,
    day: values.day ?? date.getUTCDate(),
    hour: values.hour ?? 0,
    minute: values.minute ?? 0,
    second: values.second ?? 0,
  };
}

function zonedMonthBoundaryToUtc(
  timeZone: string,
  year: number,
  monthIndex: number,
) {
  const targetWallTime = Date.UTC(year, monthIndex, 1, 0, 0, 0);
  let utcTimestamp = targetWallTime;

  for (let index = 0; index < 4; index += 1) {
    const parts = getTimeZoneDateParts(new Date(utcTimestamp), timeZone);
    const actualWallTime = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const delta = targetWallTime - actualWallTime;
    if (delta === 0) break;
    utcTimestamp += delta;
  }

  return new Date(utcTimestamp);
}

function monthRange(month?: string, timeZone?: string) {
  const now = new Date();
  const validTimeZone = getValidTimeZone(timeZone);
  const nowParts = getTimeZoneDateParts(now, validTimeZone);
  const source =
    month && /^\d{4}-\d{2}$/.test(month)
      ? month
      : `${nowParts.year}-${String(nowParts.month).padStart(2, '0')}`;
  const [yearValue, monthValue] = source.split('-').map(Number);
  const year = yearValue ?? nowParts.year;
  const monthIndex = (monthValue ?? 1) - 1;
  const start = zonedMonthBoundaryToUtc(validTimeZone, year, monthIndex);
  const end = zonedMonthBoundaryToUtc(validTimeZone, year, monthIndex + 1);
  const budgetMonth = new Date(Date.UTC(year, monthIndex, 1));
  return { key: source, start, end, budgetMonth };
}

function addCurrencyTotal(
  totals: Record<string, number>,
  currency: string,
  amount: number,
) {
  totals[currency] = money((totals[currency] ?? 0) + amount);
}

function normalizeTags(tags: string[] | undefined) {
  if (!tags) return [];

  const normalized = tags
    .map((tag) =>
      tag
        .trim()
        .toLowerCase()
        .replace(/^#+/, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, ''),
    )
    .filter((tag) => tagPattern.test(tag));

  return Array.from(new Set(normalized)).slice(0, 10);
}

function tagCreates(ownerId: string, tags: string[]) {
  return tags.map((name) => ({
    tag: {
      connectOrCreate: {
        where: {
          ownerId_name: {
            ownerId,
            name,
          },
        },
        create: {
          ownerId,
          name,
        },
      },
    },
  }));
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
      name: true,
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
          id: true,
          amount: true,
          currency: true,
          date: true,
          description: true,
          category: {
            select: { id: true, name: true, icon: true, color: true },
          },
          payers: { select: { memberId: true, amount: true } },
          participants: { select: { memberId: true, share: true } },
        },
      },
    },
  });

  const totals: Record<string, number> = {};
  const movements: Array<{
    id: string;
    groupId: string;
    groupName: string;
    groupType: string;
    description: string;
    amount: number;
    userShare: number;
    currentUserBalance: number | null;
    currency: string;
    occurredAt: string;
    category: {
      id: string;
      name: string;
      icon: string | null;
      color: string | null;
    } | null;
  }> = [];
  let count = 0;

  for (const group of groups) {
    const currentMemberId = group.GroupMember[0]?.id;
    if (!currentMemberId) continue;

    for (const expense of group.Expense) {
      const currentShare = expense.participants.find(
        (participant) => participant.memberId === currentMemberId,
      )?.share;
      const currentPaid =
        expense.payers.find((payer) => payer.memberId === currentMemberId)
          ?.amount ?? 0;
      const amount =
        typeof currentShare === 'number'
          ? currentShare
          : group.type === 'personal' && expense.participants.length === 0
            ? expense.amount
            : 0;

      if (amount <= 0) continue;
      addCurrencyTotal(totals, expense.currency, amount);
      movements.push({
        id: expense.id,
        groupId: group.id,
        groupName: group.name,
        groupType: group.type,
        description: expense.description,
        amount: expense.amount,
        userShare: money(amount),
        currentUserBalance:
          group.type === 'personal' && expense.participants.length === 0
            ? null
            : money(currentPaid - amount),
        currency: expense.currency,
        occurredAt: expense.date.toISOString(),
        category: expense.category,
      });
      count += 1;
    }
  }

  movements.sort((left, right) => {
    const dateDelta =
      new Date(right.occurredAt).getTime() -
      new Date(left.occurredAt).getTime();
    return dateDelta === 0 ? right.id.localeCompare(left.id) : dateDelta;
  });

  return { totals, count, movements };
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
    const range = monthRange(input.month, input.timeZone);

    const [
      transactions,
      categories,
      accounts,
      tags,
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
        include: {
          category: true,
          account: true,
          tags: { include: { tag: true } },
        },
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
      db.financeTag.findMany({
        where: { ownerId: userId },
        orderBy: [{ name: 'asc' }],
      }),
      db.financeBudget.findMany({
        where: { ownerId: userId, month: range.budgetMonth },
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
    const tagExpenseTotals = new Map<
      string,
      {
        tagId: string;
        tagName: string;
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

      for (const transactionTag of transaction.tags) {
        const tagKey = `${transactionTag.tagId}:${transaction.currency}`;
        const currentTagTotal = tagExpenseTotals.get(tagKey);
        tagExpenseTotals.set(tagKey, {
          tagId: transactionTag.tagId,
          tagName: transactionTag.tag.name,
          currency: transaction.currency,
          amount: money((currentTagTotal?.amount ?? 0) + transaction.amount),
        });
      }
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
      tags,
      budgets: budgets.map((budget) => ({
        ...budget,
        month: budget.month.toISOString(),
      })),
      categoryExpenseTotals: Array.from(categoryExpenseTotals.values()).sort(
        (a, b) => b.amount - a.amount,
      ),
      tagExpenseTotals: Array.from(tagExpenseTotals.values()).sort(
        (a, b) => b.amount - a.amount,
      ),
      recentTransactions: transactions.slice(0, 12).map((transaction) => ({
        ...transaction,
        tags: transaction.tags.map((transactionTag) => transactionTag.tag),
        occurredAt: transaction.occurredAt.toISOString(),
        createdAt: transaction.createdAt.toISOString(),
        updatedAt: transaction.updatedAt.toISOString(),
      })),
      recentGroupExpenseMovements: groupExpenseTotals.movements.slice(0, 12),
    };
  },

  async createTransaction(
    userId: string,
    input: CreateFinanceTransactionInput,
  ) {
    await ensureDefaults(userId, input.currency);
    const type = input.type === 'income' ? 'INCOME' : 'EXPENSE';
    const tags = normalizeTags(input.tags);

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
        ...(tags.length > 0
          ? { tags: { create: tagCreates(userId, tags) } }
          : {}),
      },
      include: {
        category: true,
        account: true,
        tags: { include: { tag: true } },
      },
    });
  },

  async updateTransaction(
    userId: string,
    transactionId: string,
    input: UpdateFinanceTransactionInput,
  ) {
    const transaction = await db.financeTransaction.findFirst({
      where: { id: transactionId, ownerId: userId },
      select: { id: true, type: true },
    });
    if (!transaction) return null;
    const tags =
      input.tags === undefined ? undefined : normalizeTags(input.tags);

    if (input.categoryId) {
      const category = await db.financeCategory.findFirst({
        where: {
          id: input.categoryId,
          ownerId: userId,
          OR: [
            { transactionType: transaction.type },
            { transactionType: 'BOTH' },
          ],
        },
        select: { id: true },
      });
      if (!category) throw new Error('Invalid finance category');
    }

    return db.$transaction(async (tx) => {
      if (tags) {
        await tx.financeTransactionTag.deleteMany({
          where: { transactionId },
        });
      }

      return tx.financeTransaction.update({
        where: { id: transactionId },
        data: {
          ...(input.description
            ? { description: input.description.trim() }
            : {}),
          ...(input.categoryId !== undefined
            ? { categoryId: input.categoryId }
            : {}),
          ...(tags ? { tags: { create: tagCreates(userId, tags) } } : {}),
        },
        include: {
          category: true,
          account: true,
          tags: { include: { tag: true } },
        },
      });
    });
  },

  async deleteTransaction(userId: string, transactionId: string) {
    const transaction = await db.financeTransaction.findFirst({
      where: { id: transactionId, ownerId: userId },
      select: { id: true },
    });
    if (!transaction) return null;

    await db.financeTransaction.delete({ where: { id: transactionId } });
    return transaction;
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

  async deleteCategory(userId: string, categoryId: string) {
    const category = await db.financeCategory.findFirst({
      where: { id: categoryId, ownerId: userId, archivedAt: null },
      select: { id: true },
    });
    if (!category) return null;

    return db.financeCategory.update({
      where: { id: categoryId },
      data: { archivedAt: new Date() },
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

    const { budgetMonth } = monthRange(input.month);
    return db.financeBudget.upsert({
      where: {
        ownerId_categoryId_month_currency: {
          ownerId: userId,
          categoryId: input.categoryId,
          month: budgetMonth,
          currency: input.currency,
        },
      },
      create: {
        ownerId: userId,
        categoryId: input.categoryId,
        month: budgetMonth,
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
