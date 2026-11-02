import {
  GroupExpenseDeleted,
  GroupExpenseLineItemsInvalid,
  GroupExpenseNotFound,
} from '@vornway/contracts/modules/groups/errors';
import type { Prisma } from '#/generated/prisma/client';
import { applyAccountTransactionEffect } from '#/modules/finances/account-balance';
import type { ExpenseInput, ExpensePlan } from './expense-plan';
import { normalizeAmount, readTotals } from './helpers';

type Tx = Prisma.TransactionClient;
type LineItem = NonNullable<ExpenseInput['lineItems']>[number];
type Abort<E> = (reason: E) => never;

const saveCompositeItems = async (
  tx: Tx,
  expenseId: string,
  lineItems: readonly LineItem[],
) => {
  if (lineItems.length === 0) return true;
  const participants = await tx.expenseParticipant.findMany({
    where: { expenseId },
    select: { id: true, memberId: true },
  });
  const idByMember = new Map(
    participants.map((participant) => [participant.memberId, participant.id]),
  );
  const items = lineItems.flatMap((item) => {
    const expenseParticipantId = idByMember.get(item.memberId);
    return expenseParticipantId
      ? [
          {
            expenseParticipantId,
            description: item.description.trim(),
            amount: normalizeAmount(item.amount),
          },
        ]
      : [];
  });
  if (items.length !== lineItems.length) return false;
  await tx.compositeExpenseItem.createMany({ data: items });
  return true;
};

const adjustTotals = async (
  tx: Tx,
  groupId: string,
  change: (totals: Record<string, number>) => Record<string, number>,
) => {
  const group = await tx.group.findUnique({
    where: { id: groupId },
    select: { totals: true },
  });
  await tx.group.update({
    where: { id: groupId },
    data: { totals: change(readTotals(group?.totals)) },
  });
};

const activityDetails = (payload: ExpenseInput, plan: ExpensePlan) => ({
  amount: payload.amount,
  currency: payload.currency,
  paidByIds: plan.payerIds,
  participants: plan.participantIds.length,
  splitMethod: plan.splitMethod,
  advancedDetails: Boolean(plan.advancedDetails),
});

const payerRows = (plan: ExpensePlan) =>
  plan.payerIds.map((memberId) => ({
    memberId,
    amount: plan.payerShares[memberId] ?? 0,
  }));

const participantRows = (plan: ExpensePlan) =>
  plan.participantIds.map((memberId) => ({
    memberId,
    share: plan.participantShares[memberId] ?? 0,
  }));

export const insertExpense = async (
  tx: Tx,
  abort: Abort<GroupExpenseLineItemsInvalid>,
  input: {
    userId: string;
    groupId: string;
    expenseId: string | undefined;
    actorName: string;
    payload: ExpenseInput;
    plan: ExpensePlan;
  },
) => {
  const { payload, plan, groupId } = input;
  const expense = await tx.expense.create({
    data: {
      ...(input.expenseId ? { id: input.expenseId } : {}),
      groupId,
      paidById: plan.primaryPayerId,
      accountId: plan.accountId,
      ...(payload.categoryId ? { categoryId: payload.categoryId } : {}),
      description: payload.description,
      amount: payload.amount,
      currency: payload.currency,
      metadata: plan.metadata,
      payers: { create: payerRows(plan) },
      ...(plan.participantIds.length > 0
        ? { participants: { create: participantRows(plan) } }
        : {}),
    },
    select: { id: true },
  });
  await applyAccountTransactionEffect(
    tx,
    { accountId: plan.accountId, type: 'EXPENSE', amount: payload.amount },
    1,
  );
  if (
    payload.lineItems?.length &&
    !(await saveCompositeItems(tx, expense.id, payload.lineItems))
  ) {
    return abort(new GroupExpenseLineItemsInvalid());
  }
  await adjustTotals(tx, groupId, (totals) => ({
    ...totals,
    [payload.currency]: normalizeAmount(
      (totals[payload.currency] ?? 0) + payload.amount,
    ),
  }));
  await tx.activityLog.create({
    data: {
      groupId,
      actorUserId: input.userId,
      actorName: input.actorName,
      action: 'expense.created',
      targetName: payload.description,
      details: { expenseId: expense.id, ...activityDetails(payload, plan) },
    },
  });
  return expense;
};

export const rewriteExpense = async (
  tx: Tx,
  abort: Abort<
    GroupExpenseNotFound | GroupExpenseDeleted | GroupExpenseLineItemsInvalid
  >,
  input: {
    userId: string;
    groupId: string;
    expenseId: string;
    actorName: string;
    payload: ExpenseInput;
    plan: ExpensePlan;
  },
) => {
  const { payload, plan, groupId } = input;
  const existing = await tx.expense.findFirst({
    where: { id: input.expenseId, groupId },
    select: {
      id: true,
      amount: true,
      accountId: true,
      attachment: true,
      currency: true,
      notes: true,
      status: true,
      deletedAt: true,
      participants: {
        select: {
          memberId: true,
          compositeItems: { select: { description: true, amount: true } },
        },
      },
    },
  });
  if (!existing) return abort(new GroupExpenseNotFound());
  if (
    existing.status === 'DELETED' ||
    existing.deletedAt ||
    existing.notes?.includes('[DELETED]')
  ) {
    return abort(new GroupExpenseDeleted());
  }

  await applyAccountTransactionEffect(
    tx,
    { accountId: existing.accountId, type: 'EXPENSE', amount: existing.amount },
    -1,
  );
  await tx.expense.update({
    where: { id: existing.id },
    data: {
      description: payload.description,
      amount: payload.amount,
      currency: payload.currency,
      accountId: plan.accountId,
      categoryId: payload.categoryId ?? null,
      paidById: plan.primaryPayerId,
      metadata: plan.metadata,
      payers: { deleteMany: {}, create: payerRows(plan) },
    },
  });
  await applyAccountTransactionEffect(
    tx,
    { accountId: plan.accountId, type: 'EXPENSE', amount: payload.amount },
    1,
  );
  await tx.expenseParticipant.deleteMany({ where: { expenseId: existing.id } });
  if (plan.participantIds.length > 0) {
    await tx.expenseParticipant.createMany({
      data: participantRows(plan).map((row) => ({
        ...row,
        expenseId: existing.id,
      })),
    });
  }

  const lineItems =
    payload.lineItems ??
    existing.participants.flatMap((participant) =>
      participant.compositeItems.map((item) => ({
        memberId: participant.memberId,
        description: item.description,
        amount: item.amount,
      })),
    );
  if (!(await saveCompositeItems(tx, existing.id, lineItems))) {
    return abort(new GroupExpenseLineItemsInvalid());
  }

  await adjustTotals(tx, groupId, (totals) => {
    const next = { ...totals };
    next[existing.currency] = normalizeAmount(
      Math.max(0, (next[existing.currency] ?? 0) - existing.amount),
    );
    if (next[existing.currency] === 0) delete next[existing.currency];
    next[payload.currency] = normalizeAmount(
      (next[payload.currency] ?? 0) + payload.amount,
    );
    return next;
  });
  await tx.activityLog.create({
    data: {
      groupId,
      actorUserId: input.userId,
      actorName: input.actorName,
      action: 'expense.updated',
      targetName: payload.description,
      details: { expenseId: existing.id, ...activityDetails(payload, plan) },
    },
  });
  return { id: existing.id, previousAttachment: existing.attachment };
};

export const markExpenseDeleted = async (
  tx: Tx,
  input: {
    userId: string;
    groupId: string;
    actorName: string;
    expense: {
      id: string;
      amount: number;
      accountId: string | null;
      currency: string;
      description: string;
      notes: string | null;
    };
  },
) => {
  const { expense, groupId } = input;
  const deletedAt = new Date();
  await tx.expense.update({
    where: { id: expense.id },
    data: {
      status: 'DELETED',
      deletedAt,
      deletedById: input.userId,
      notes: expense.notes
        ? `${expense.notes} [DELETED:${deletedAt.toISOString()}]`
        : `[DELETED:${deletedAt.toISOString()}]`,
    },
  });
  await applyAccountTransactionEffect(
    tx,
    { accountId: expense.accountId, type: 'EXPENSE', amount: expense.amount },
    -1,
  );
  await adjustTotals(tx, groupId, (totals) => ({
    ...totals,
    [expense.currency]: normalizeAmount(
      Math.max(0, (totals[expense.currency] ?? 0) - expense.amount),
    ),
  }));
  await tx.activityLog.create({
    data: {
      groupId,
      actorUserId: input.userId,
      actorName: input.actorName,
      action: 'expense.deleted',
      targetName: expense.description,
      details: {
        expenseId: expense.id,
        amount: expense.amount,
        currency: expense.currency,
      },
    },
  });
};
