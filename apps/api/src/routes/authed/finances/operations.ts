import { db, type Tx } from '#/infrastructure/database/connection';
import type {
  CreateFinanceAccountInput,
  CreateFinanceCategoryInput,
  CreateFinanceTransactionInput,
  FinanceAccountListQueryInput,
  FinanceAccountMovementListQueryInput,
  FinanceMovementListQueryInput,
  FinancesSummaryQueryInput,
  UpdateFinanceAccountInput,
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
const movementCursorSeparator = '|';

type MovementCursor = {
  occurredAt: Date;
  source: 'transaction' | 'group-expense';
  id: string;
};

type FinanceMovement =
  | {
      source: 'transaction';
      id: string;
      description: string;
      amount: number;
      currency: string;
      occurredAt: string;
      type: 'INCOME' | 'EXPENSE';
      accountId: string | null;
      categoryId: string | null;
      category: {
        id: string;
        name: string;
        icon: string | null;
        color: string | null;
      } | null;
      tags: Array<{ id: string; name: string }>;
    }
  | {
      source: 'group-expense';
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
    };

function serializeFinanceAccount<
  T extends {
    openedAt: Date | null;
    maturesAt: Date | null;
    closedAt: Date | null;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  },
>(account: T) {
  const serialized = {
    ...account,
    openedAt: account.openedAt?.toISOString() ?? null,
    maturesAt: account.maturesAt?.toISOString() ?? null,
    closedAt: account.closedAt?.toISOString() ?? null,
    archivedAt: account.archivedAt?.toISOString() ?? null,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };

  return serialized as Omit<
    T,
    | 'openedAt'
    | 'maturesAt'
    | 'closedAt'
    | 'archivedAt'
    | 'createdAt'
    | 'updatedAt'
  > & {
    openedAt: string | null;
    maturesAt: string | null;
    closedAt: string | null;
    archivedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
}

function toFinanceTransactionType(type: 'income' | 'expense' | 'both') {
  return type === 'income' ? 'INCOME' : type === 'expense' ? 'EXPENSE' : 'BOTH';
}

function toFinanceAccountType(type: CreateFinanceAccountInput['type']) {
  const accountTypes = {
    cash: 'CASH',
    bank: 'BANK',
    savings: 'SAVINGS',
    credit_card: 'CREDIT_CARD',
    term_deposit: 'TERM_DEPOSIT',
    wallet: 'WALLET',
    other: 'OTHER',
  } as const;

  return accountTypes[type];
}

function toFinanceAccountStatus(
  status: NonNullable<UpdateFinanceAccountInput['status']>,
) {
  const statuses = {
    active: 'ACTIVE',
    closed: 'CLOSED',
    matured: 'MATURED',
  } as const;

  return statuses[status];
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

function encodeMovementCursor(movement: FinanceMovement) {
  return [
    new Date(movement.occurredAt).getTime(),
    movement.source,
    movement.id,
  ].join(movementCursorSeparator);
}

function decodeMovementCursor(cursor?: string): MovementCursor | null {
  if (!cursor) return null;

  const [timestampValue, source, id] = cursor.split(movementCursorSeparator);
  const timestamp = Number(timestampValue);
  if (
    !Number.isFinite(timestamp) ||
    (source !== 'transaction' && source !== 'group-expense') ||
    !id
  ) {
    return null;
  }

  return { occurredAt: new Date(timestamp), source, id };
}

function getMovementSortKey(movement: FinanceMovement | MovementCursor) {
  return `${movement.source}:${movement.id}`;
}

function compareMovements(
  left: FinanceMovement | MovementCursor,
  right: FinanceMovement | MovementCursor,
) {
  const leftTime =
    left.occurredAt instanceof Date
      ? left.occurredAt.getTime()
      : new Date(left.occurredAt).getTime();
  const rightTime =
    right.occurredAt instanceof Date
      ? right.occurredAt.getTime()
      : new Date(right.occurredAt).getTime();
  const dateDelta = rightTime - leftTime;
  if (dateDelta !== 0) return dateDelta;
  return getMovementSortKey(right).localeCompare(getMovementSortKey(left));
}

function isMovementAfterCursor(
  movement: FinanceMovement,
  cursor: MovementCursor | null,
) {
  if (!cursor) return true;
  return compareMovements(cursor, movement) < 0;
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

function getCreditAvailable(creditLimit: number | null, usedCredit: number) {
  if (creditLimit === null) return 0;
  return money(Math.max(creditLimit - usedCredit, 0));
}

async function applyAccountTransactionEffect(
  tx: Tx,
  input: {
    accountId: string | null | undefined;
    type: 'INCOME' | 'EXPENSE' | 'BOTH';
    amount: number;
  },
  direction: 1 | -1,
) {
  if (!input.accountId) return;
  if (input.type !== 'INCOME' && input.type !== 'EXPENSE') return;

  const account = await tx.financeAccount.findUnique({
    where: { id: input.accountId },
    select: {
      accountType: true,
      currentBalance: true,
      availableBalance: true,
      usedCredit: true,
      creditLimit: true,
    },
  });
  if (!account) return;

  if (account.accountType === 'CREDIT_CARD') {
    const debtDelta =
      direction * (input.type === 'EXPENSE' ? input.amount : -input.amount);
    const usedCredit = money(Math.max(account.usedCredit + debtDelta, 0));
    const currentBalance = money(
      Math.max(account.currentBalance + debtDelta, 0),
    );
    const availableBalance =
      account.creditLimit === null
        ? money(Math.max(account.availableBalance - debtDelta, 0))
        : getCreditAvailable(account.creditLimit, usedCredit);

    await tx.financeAccount.update({
      where: { id: input.accountId },
      data: { usedCredit, currentBalance, availableBalance },
    });
    return;
  }

  const balanceDelta =
    direction * (input.type === 'INCOME' ? input.amount : -input.amount);
  await tx.financeAccount.update({
    where: { id: input.accountId },
    data: {
      currentBalance: money(account.currentBalance + balanceDelta),
      availableBalance: money(account.availableBalance + balanceDelta),
    },
  });
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
        currentBalance: 0,
        availableBalance: 0,
        lockedBalance: 0,
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

function getAccountTotals(
  accounts: Array<{
    accountType: string;
    currency: string;
    currentBalance: number;
    availableBalance: number;
    lockedBalance: number;
    creditLimit: number | null;
    usedCredit: number;
    status: string;
    archivedAt: Date | null;
  }>,
) {
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
}

export const financeOperations = {
  async listAccounts(userId: string, input: FinanceAccountListQueryInput) {
    const limit = Math.min(input.limit, 50);
    const where = { ownerId: userId, archivedAt: null };

    const [total, rows] = await Promise.all([
      db.financeAccount.count({ where }),
      db.financeAccount.findMany({
        where,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        take: limit + 1,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    ]);

    const hasNextPage = rows.length > limit;
    const data = hasNextPage ? rows.slice(0, limit) : rows;

    return {
      data: data.map(serializeFinanceAccount),
      pagination: {
        limit,
        total,
        nextCursor: hasNextPage ? (data.at(-1)?.id ?? null) : null,
      },
    };
  },

  async getAccount(userId: string, accountId: string) {
    const account = await db.financeAccount.findFirst({
      where: { id: accountId, ownerId: userId, archivedAt: null },
    });
    return account ? serializeFinanceAccount(account) : null;
  },

  async listAccountMovements(
    userId: string,
    accountId: string,
    input: FinanceAccountMovementListQueryInput,
  ) {
    const account = await db.financeAccount.findFirst({
      where: { id: accountId, ownerId: userId, archivedAt: null },
      select: { id: true },
    });
    if (!account) return null;

    const limit = Math.min(input.limit, 50);
    const where = { ownerId: userId, accountId };
    const [total, rows] = await Promise.all([
      db.financeTransaction.count({ where }),
      db.financeTransaction.findMany({
        where,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        take: limit + 1,
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        include: {
          category: true,
          tags: { include: { tag: true } },
        },
      }),
    ]);
    const hasNextPage = rows.length > limit;
    const data = hasNextPage ? rows.slice(0, limit) : rows;

    return {
      data: data.map((transaction) => ({
        source: 'transaction' as const,
        id: transaction.id,
        description: transaction.description,
        amount: transaction.amount,
        currency: transaction.currency,
        occurredAt: transaction.occurredAt.toISOString(),
        type:
          transaction.type === 'INCOME'
            ? ('INCOME' as const)
            : ('EXPENSE' as const),
        accountId: transaction.accountId,
        categoryId: transaction.categoryId,
        category: transaction.category,
        tags: transaction.tags.map((transactionTag) => transactionTag.tag),
      })),
      pagination: {
        limit,
        total,
        nextCursor: hasNextPage ? (data.at(-1)?.id ?? null) : null,
      },
    };
  },

  async createAccount(userId: string, input: CreateFinanceAccountInput) {
    const accountType = toFinanceAccountType(input.type);
    const currentBalance = money(input.currentBalance);
    const creditLimit =
      input.creditLimit !== undefined ? money(input.creditLimit) : null;
    if (accountType === 'CREDIT_CARD' && creditLimit === null) {
      throw new Error('Credit card limit is required');
    }
    const usedCredit =
      accountType === 'CREDIT_CARD' ? money(Math.max(currentBalance, 0)) : 0;
    const availableBalance =
      accountType === 'CREDIT_CARD'
        ? money(
            input.availableBalance ??
              getCreditAvailable(creditLimit, usedCredit),
          )
        : money(input.availableBalance ?? currentBalance);
    const lockedBalance = money(input.lockedBalance ?? 0);

    return db.financeAccount.create({
      data: {
        ownerId: userId,
        name: input.name.trim(),
        accountType,
        institution: input.institution?.trim() || null,
        currency: input.currency,
        openingBalance: currentBalance,
        currentBalance,
        availableBalance,
        lockedBalance,
        creditLimit,
        usedCredit,
        openedAt: input.openedAt ?? null,
        maturesAt: input.maturesAt ?? null,
        interestRate: input.interestRate ?? null,
        notes: input.notes?.trim() || null,
      },
    });
  },

  async updateAccount(
    userId: string,
    accountId: string,
    input: UpdateFinanceAccountInput,
  ) {
    const account = await db.financeAccount.findFirst({
      where: { id: accountId, ownerId: userId, archivedAt: null },
      select: {
        id: true,
        accountType: true,
        currentBalance: true,
        availableBalance: true,
        usedCredit: true,
        creditLimit: true,
      },
    });
    if (!account) return null;
    const nextAccountType = input.type
      ? toFinanceAccountType(input.type)
      : account.accountType;
    const nextCurrentBalance =
      input.currentBalance !== undefined
        ? money(input.currentBalance)
        : account.currentBalance;
    const nextCreditLimit =
      input.creditLimit !== undefined
        ? money(input.creditLimit)
        : account.creditLimit;
    if (nextAccountType === 'CREDIT_CARD' && nextCreditLimit === null) {
      throw new Error('Credit card limit is required');
    }
    const nextUsedCredit =
      nextAccountType === 'CREDIT_CARD'
        ? money(Math.max(nextCurrentBalance, 0))
        : 0;
    const nextAvailableBalance =
      input.availableBalance !== undefined
        ? money(input.availableBalance)
        : nextAccountType === 'CREDIT_CARD' &&
            (input.currentBalance !== undefined ||
              input.creditLimit !== undefined ||
              input.type !== undefined)
          ? getCreditAvailable(nextCreditLimit, nextUsedCredit)
          : undefined;

    return db.financeAccount.update({
      where: { id: accountId },
      data: {
        ...(input.name ? { name: input.name.trim() } : {}),
        ...(input.type
          ? { accountType: toFinanceAccountType(input.type) }
          : {}),
        ...(input.institution !== undefined
          ? { institution: input.institution.trim() || null }
          : {}),
        ...(input.currency ? { currency: input.currency } : {}),
        ...(input.currentBalance !== undefined
          ? { currentBalance: nextCurrentBalance }
          : {}),
        ...(nextAvailableBalance !== undefined
          ? { availableBalance: nextAvailableBalance }
          : {}),
        ...(input.lockedBalance !== undefined
          ? { lockedBalance: money(input.lockedBalance) }
          : {}),
        ...(input.type !== undefined ||
        input.creditLimit !== undefined ||
        nextAccountType === 'CREDIT_CARD'
          ? {
              creditLimit:
                nextAccountType === 'CREDIT_CARD' ? nextCreditLimit : null,
              usedCredit: nextUsedCredit,
            }
          : {}),
        ...(input.openedAt !== undefined ? { openedAt: input.openedAt } : {}),
        ...(input.maturesAt !== undefined
          ? { maturesAt: input.maturesAt }
          : {}),
        ...(input.interestRate !== undefined
          ? { interestRate: input.interestRate }
          : {}),
        ...(input.notes !== undefined
          ? { notes: input.notes.trim() || null }
          : {}),
        ...(input.status
          ? {
              status: toFinanceAccountStatus(input.status),
              closedAt: input.status === 'closed' ? new Date() : null,
            }
          : {}),
      },
    });
  },

  async closeAccount(userId: string, accountId: string) {
    const account = await db.financeAccount.findFirst({
      where: { id: accountId, ownerId: userId, archivedAt: null },
      select: { id: true },
    });
    if (!account) return null;

    return db.financeAccount.update({
      where: { id: accountId },
      data: { status: 'CLOSED', closedAt: new Date() },
    });
  },

  async deleteAccount(userId: string, accountId: string) {
    const account = await db.financeAccount.findFirst({
      where: { id: accountId, ownerId: userId, archivedAt: null },
      select: { id: true },
    });
    if (!account) return null;

    return db.financeAccount.update({
      where: { id: accountId },
      data: { archivedAt: new Date() },
    });
  },

  async listMovements(userId: string, input: FinanceMovementListQueryInput) {
    await ensureDefaults(userId, input.currency);
    const range = monthRange(input.month, input.timeZone);
    const limit = Math.min(input.limit, 50);
    const cursor = decodeMovementCursor(input.cursor);
    const cursorDateFilter = cursor ? { lte: cursor.occurredAt } : undefined;
    const activeExpenseFilter = {
      status: 'ACTIVE' as const,
      deletedAt: null,
      date: {
        gte: range.start,
        lt: range.end,
        ...(cursorDateFilter ? cursorDateFilter : {}),
      },
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
      group: {
        Goal: { none: {} },
        OR: [{ ownerId: userId }, { GroupMember: { some: { userId } } }],
      },
      AND: [
        {
          OR: [
            { participants: { some: { member: { userId } } } },
            {
              group: {
                type: 'personal',
                GroupMember: { some: { userId } },
              },
              participants: { none: {} },
            },
          ],
        },
      ],
    };

    const transactionWhere = {
      ownerId: userId,
      occurredAt: {
        gte: range.start,
        lt: range.end,
        ...(cursorDateFilter ? cursorDateFilter : {}),
      },
    };

    const [transactionTotal, groupExpenseTotal, transactions, expenses] =
      await Promise.all([
        db.financeTransaction.count({
          where: {
            ownerId: userId,
            occurredAt: { gte: range.start, lt: range.end },
          },
        }),
        db.expense.count({
          where: {
            ...activeExpenseFilter,
            date: { gte: range.start, lt: range.end },
          },
        }),
        db.financeTransaction.findMany({
          where: transactionWhere,
          take: limit + 1,
          orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
          include: {
            category: true,
            tags: { include: { tag: true } },
          },
        }),
        db.expense.findMany({
          where: activeExpenseFilter,
          take: limit + 1,
          orderBy: [{ date: 'desc' }, { id: 'desc' }],
          select: {
            id: true,
            amount: true,
            currency: true,
            date: true,
            description: true,
            category: {
              select: { id: true, name: true, icon: true, color: true },
            },
            group: {
              select: {
                id: true,
                name: true,
                type: true,
                GroupMember: { where: { userId }, select: { id: true } },
              },
            },
            payers: { select: { memberId: true, amount: true } },
            participants: { select: { memberId: true, share: true } },
          },
        }),
      ]);

    const transactionMovements: FinanceMovement[] = transactions.map(
      (transaction) => ({
        source: 'transaction',
        id: transaction.id,
        description: transaction.description,
        amount: transaction.amount,
        currency: transaction.currency,
        occurredAt: transaction.occurredAt.toISOString(),
        type: transaction.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
        accountId: transaction.accountId,
        categoryId: transaction.categoryId,
        category: transaction.category,
        tags: transaction.tags.map((transactionTag) => transactionTag.tag),
      }),
    );

    const groupExpenseMovements: FinanceMovement[] = expenses.flatMap(
      (expense) => {
        const currentMemberId = expense.group.GroupMember[0]?.id;
        if (!currentMemberId) return [];

        const currentShare = expense.participants.find(
          (participant) => participant.memberId === currentMemberId,
        )?.share;
        const currentPaid =
          expense.payers.find((payer) => payer.memberId === currentMemberId)
            ?.amount ?? 0;
        const userShare =
          typeof currentShare === 'number'
            ? currentShare
            : expense.group.type === 'personal' &&
                expense.participants.length === 0
              ? expense.amount
              : 0;

        if (userShare <= 0) return [];

        return [
          {
            source: 'group-expense' as const,
            id: expense.id,
            groupId: expense.group.id,
            groupName: expense.group.name,
            groupType: expense.group.type,
            description: expense.description,
            amount: expense.amount,
            userShare: money(userShare),
            currentUserBalance:
              expense.group.type === 'personal' &&
              expense.participants.length === 0
                ? null
                : money(currentPaid - userShare),
            currency: expense.currency,
            occurredAt: expense.date.toISOString(),
            category: expense.category,
          },
        ];
      },
    );

    const movements = [...transactionMovements, ...groupExpenseMovements]
      .filter((movement) => isMovementAfterCursor(movement, cursor))
      .sort(compareMovements);
    const data = movements.slice(0, limit);
    const hasNextPage = movements.length > limit;
    const lastMovement = data.at(-1);

    return {
      data,
      pagination: {
        limit,
        total: transactionTotal + groupExpenseTotal,
        nextCursor:
          hasNextPage && lastMovement
            ? encodeMovementCursor(lastMovement)
            : null,
      },
    };
  },

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
    const accountTotals = getAccountTotals(accounts);
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
        accountTotalByCurrency: accountTotals.totalByCurrency,
        accountAvailableByCurrency: accountTotals.availableByCurrency,
        accountLockedByCurrency: accountTotals.lockedByCurrency,
        accountCreditLimitByCurrency: accountTotals.creditLimitByCurrency,
        accountCreditUsedByCurrency: accountTotals.creditUsedByCurrency,
        accountCreditAvailableByCurrency:
          accountTotals.creditAvailableByCurrency,
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
        where: {
          id: input.accountId,
          ownerId: userId,
          archivedAt: null,
          status: { not: 'CLOSED' },
        },
        select: { id: true },
      });
      if (!account) throw new Error('Invalid finance account');
    }

    return db.$transaction(async (tx) => {
      const transaction = await tx.financeTransaction.create({
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
      await applyAccountTransactionEffect(tx, transaction, 1);
      return transaction;
    });
  },

  async updateTransaction(
    userId: string,
    transactionId: string,
    input: UpdateFinanceTransactionInput,
  ) {
    const transaction = await db.financeTransaction.findFirst({
      where: { id: transactionId, ownerId: userId },
      select: {
        id: true,
        accountId: true,
        type: true,
        amount: true,
      },
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

    if (input.accountId) {
      const account = await db.financeAccount.findFirst({
        where: {
          id: input.accountId,
          ownerId: userId,
          archivedAt: null,
          status: { not: 'CLOSED' },
        },
        select: { id: true },
      });
      if (!account) throw new Error('Invalid finance account');
    }

    return db.$transaction(async (tx) => {
      if (tags) {
        await tx.financeTransactionTag.deleteMany({
          where: { transactionId },
        });
      }

      await applyAccountTransactionEffect(tx, transaction, -1);

      const updatedTransaction = await tx.financeTransaction.update({
        where: { id: transactionId },
        data: {
          ...(input.description
            ? { description: input.description.trim() }
            : {}),
          ...(input.amount !== undefined
            ? { amount: money(input.amount) }
            : {}),
          ...(input.occurredAt !== undefined
            ? { occurredAt: input.occurredAt }
            : {}),
          ...(input.categoryId !== undefined
            ? { categoryId: input.categoryId }
            : {}),
          ...(input.accountId !== undefined
            ? { accountId: input.accountId }
            : {}),
          ...(tags ? { tags: { create: tagCreates(userId, tags) } } : {}),
        },
        include: {
          category: true,
          account: true,
          tags: { include: { tag: true } },
        },
      });
      await applyAccountTransactionEffect(tx, updatedTransaction, 1);
      return updatedTransaction;
    });
  },

  async deleteTransaction(userId: string, transactionId: string) {
    const transaction = await db.financeTransaction.findFirst({
      where: { id: transactionId, ownerId: userId },
      select: { id: true, accountId: true, type: true, amount: true },
    });
    if (!transaction) return null;

    await db.$transaction(async (tx) => {
      await tx.financeTransaction.delete({ where: { id: transactionId } });
      await applyAccountTransactionEffect(tx, transaction, -1);
    });
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
