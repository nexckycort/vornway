import type { Prisma } from '#/generated/prisma/client';
import { db } from '#/infrastructure/database/connection';
import { applyAccountTransactionEffect } from '../finances/operations';
import type {
  CreateDebtInput,
  CreatePaymentInput,
  UpdateDebtInput,
  UpdatePaymentInput,
} from './schema';

const money = (value: number) => Number(value.toFixed(2));

type DebtWithPayments = Prisma.DebtGetPayload<{
  include: { amounts: true; payments: { include: { account: true } } };
}>;

function debtPaymentTransactionType(direction: string) {
  return direction === 'borrowed' ? 'EXPENSE' : 'INCOME';
}

function serialize(debt: DebtWithPayments, viewerId?: string) {
  const paid = money(
    debt.payments.reduce((sum: number, payment) => sum + payment.amount, 0),
  );
  const remaining = money(Math.max(debt.expectedTotal - paid, 0));
  const status =
    remaining <= 0
      ? 'paid'
      : debt.dueDate && new Date(debt.dueDate) < new Date()
        ? 'overdue'
        : 'active';
  return {
    ...debt,
    viewerRole:
      viewerId && debt.ownerId === viewerId ? 'owner' : 'counterparty',
    paidAmount: paid,
    remainingAmount: remaining,
    status,
    dueDate: debt.dueDate?.toISOString() ?? null,
    createdAt: debt.createdAt.toISOString(),
    payments: debt.payments.map((payment) => ({
      ...payment,
      account: payment.account
        ? {
            id: payment.account.id,
            name: payment.account.name,
            institution: payment.account.institution,
            currency: payment.account.currency,
          }
        : null,
      paidAt: payment.paidAt.toISOString(),
      createdAt: payment.createdAt.toISOString(),
    })),
    amounts: debt.amounts.map((amount) => ({
      id: amount.id,
      amount: amount.amount,
      loanDate: amount.loanDate.toISOString(),
      createdAt: amount.createdAt.toISOString(),
    })),
  };
}

const visibleTo = (userId: string) => ({
  OR: [{ ownerId: userId }, { counterpartyId: userId }],
});

export const debtOperations = {
  async list(userId: string, input: { status: string; search?: string }) {
    const debts = await db.debt.findMany({
      where: {
        ...visibleTo(userId),
        ...(input.search
          ? {
              OR: [
                { name: { contains: input.search, mode: 'insensitive' } },
                {
                  counterpartyName: {
                    contains: input.search,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
      },
      include: { amounts: true, payments: { include: { account: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return debts
      .map((debt) => serialize(debt, userId))
      .filter((debt) => input.status === 'all' || debt.status === input.status);
  },
  async get(userId: string, id: string) {
    const debt = await db.debt.findFirst({
      where: { id, ...visibleTo(userId) },
      include: {
        amounts: true,
        payments: {
          orderBy: { paidAt: 'desc' },
          include: { account: true },
        },
      },
    });
    return debt ? serialize(debt, userId) : null;
  },
  async create(userId: string, input: CreateDebtInput) {
    if (input.counterpartyId === userId)
      throw new Error('A debt cannot be assigned to yourself');
    if (input.counterpartyId) {
      const counterparty = await db.user.findUnique({
        where: { id: input.counterpartyId },
        select: { id: true },
      });
      if (!counterparty) throw new Error('Counterparty not found');
    }
    const amounts = input.amounts ?? [
      { amount: input.principalAmount, loanDate: new Date() },
    ];
    const principalAmount = money(
      amounts.reduce((total, item) => total + item.amount, 0),
    );
    const interest =
      input.interestType === 'percentage'
        ? principalAmount * ((input.interestValue ?? 0) / 100)
        : input.interestType === 'fixed'
          ? (input.interestValue ?? 0)
          : 0;
    const expectedTotal = money(principalAmount + interest);
    const debt = await db.debt.create({
      data: {
        ownerId: userId,
        name: input.name,
        counterpartyName: input.counterpartyName,
        counterpartyId: input.counterpartyId,
        direction: input.direction,
        principalAmount,
        interestType: input.interestType,
        interestValue: input.interestValue,
        expectedTotal,
        amounts: { create: amounts },
        currency: input.currency.toUpperCase(),
        dueDate: input.dueDate,
        description: input.description,
      },
      include: { amounts: true, payments: { include: { account: true } } },
    });
    return serialize(debt, userId);
  },
  async update(userId: string, id: string, input: UpdateDebtInput) {
    const existing = await db.debt.findFirst({
      where: { id, ownerId: userId },
      include: { amounts: true, payments: { include: { account: true } } },
    });
    if (!existing) return null;
    if (input.counterpartyId === userId)
      throw new Error('A debt cannot be assigned to yourself');
    if (input.counterpartyId) {
      const counterparty = await db.user.findUnique({
        where: { id: input.counterpartyId },
        select: { id: true },
      });
      if (!counterparty) throw new Error('Counterparty not found');
    }
    const amounts =
      input.amounts ??
      existing.amounts.map((item) => ({
        amount: item.amount,
        loanDate: item.loanDate,
      }));
    const principal = money(
      amounts.reduce((total, item) => total + item.amount, 0),
    );
    const type = input.interestType ?? existing.interestType;
    const value = input.interestValue ?? existing.interestValue ?? 0;
    const interest =
      type === 'percentage'
        ? principal * (value / 100)
        : type === 'fixed'
          ? value
          : 0;
    const debt = await db.debt.update({
      where: { id },
      data: {
        name: input.name,
        counterpartyName: input.counterpartyName,
        counterpartyId: input.counterpartyId,
        direction: input.direction,
        principalAmount: principal,
        ...(input.amounts
          ? {
              amounts: {
                deleteMany: {},
                create: amounts,
              },
            }
          : {}),
        currency: input.currency?.toUpperCase(),
        interestType: input.interestType,
        interestValue: input.interestValue,
        dueDate: input.dueDate,
        description: input.description,
        expectedTotal: money(principal + interest),
      },
      include: { amounts: true, payments: { include: { account: true } } },
    });
    return serialize(debt, userId);
  },
  async delete(userId: string, id: string) {
    const debt = await db.debt.findFirst({
      where: { id, ownerId: userId },
      include: { payments: true },
    });
    if (!debt) return false;
    await db.$transaction(async (tx) => {
      for (const payment of debt.payments) {
        await applyAccountTransactionEffect(
          tx,
          {
            accountId: payment.accountId,
            type: debtPaymentTransactionType(debt.direction),
            amount: payment.amount,
          },
          -1,
        );
      }
      await tx.debt.delete({ where: { id } });
    });
    return true;
  },
  async payment(userId: string, id: string, input: CreatePaymentInput) {
    const debt = await db.debt.findFirst({
      where: { id, ownerId: userId },
      include: { payments: true },
    });
    if (!debt) return null;
    const remaining =
      debt.expectedTotal -
      debt.payments.reduce((sum, payment) => sum + payment.amount, 0);
    if (input.amount > remaining + 0.01)
      throw new Error('Payment exceeds remaining balance');
    if (input.accountId) {
      const account = await db.financeAccount.findFirst({
        where: {
          id: input.accountId,
          ownerId: userId,
          currency: debt.currency,
          archivedAt: null,
          status: { not: 'CLOSED' },
        },
        select: { id: true },
      });
      if (!account) throw new Error('Invalid finance account');
    }
    await db.$transaction(async (tx) => {
      const payment = await tx.debtPayment.create({
        data: {
          debtId: id,
          accountId: input.accountId,
          amount: input.amount,
          paidAt: input.paidAt,
          note: input.note,
        },
      });
      await tx.debt.update({
        where: { id },
        data: { updatedAt: new Date() },
      });
      await applyAccountTransactionEffect(
        tx,
        {
          accountId: payment.accountId,
          type: debtPaymentTransactionType(debt.direction),
          amount: payment.amount,
        },
        1,
      );
    });
    return debtOperations.get(userId, id);
  },
  async updatePayment(
    userId: string,
    debtId: string,
    paymentId: string,
    input: UpdatePaymentInput,
  ) {
    const payment = await db.debtPayment.findFirst({
      where: { id: paymentId, debt: { id: debtId, ownerId: userId } },
      include: { debt: { include: { payments: true } } },
    });
    if (!payment) return null;

    const nextAmount = input.amount ?? payment.amount;
    if (input.amount !== undefined) {
      const paidWithoutPayment = payment.debt.payments
        .filter((item) => item.id !== payment.id)
        .reduce((sum, item) => sum + item.amount, 0);
      const remainingWithoutPayment =
        payment.debt.expectedTotal - paidWithoutPayment;
      if (nextAmount > remainingWithoutPayment + 0.01) {
        throw new Error('Payment exceeds remaining balance');
      }
    }

    if (input.accountId) {
      const account = await db.financeAccount.findFirst({
        where: {
          id: input.accountId,
          ownerId: userId,
          currency: payment.debt.currency,
          archivedAt: null,
          status: { not: 'CLOSED' },
        },
        select: { id: true },
      });
      if (!account) throw new Error('Invalid finance account');
    }

    await db.$transaction(async (tx) => {
      await applyAccountTransactionEffect(
        tx,
        {
          accountId: payment.accountId,
          type: debtPaymentTransactionType(payment.debt.direction),
          amount: payment.amount,
        },
        -1,
      );
      await tx.debtPayment.update({
        where: { id: paymentId },
        data: {
          ...(input.amount !== undefined ? { amount: input.amount } : {}),
          ...(input.accountId !== undefined
            ? { accountId: input.accountId }
            : {}),
          ...(input.paidAt !== undefined ? { paidAt: input.paidAt } : {}),
          ...(input.note !== undefined ? { note: input.note } : {}),
        },
      });
      await applyAccountTransactionEffect(
        tx,
        {
          accountId:
            input.accountId !== undefined ? input.accountId : payment.accountId,
          type: debtPaymentTransactionType(payment.debt.direction),
          amount: nextAmount,
        },
        1,
      );
      await tx.debt.update({
        where: { id: debtId },
        data: { updatedAt: new Date() },
      });
    });
    return debtOperations.get(userId, debtId);
  },
  async deletePayment(userId: string, debtId: string, paymentId: string) {
    const payment = await db.debtPayment.findFirst({
      where: { id: paymentId, debt: { id: debtId, ownerId: userId } },
      include: { debt: true },
    });
    if (!payment) return null;
    await db.$transaction(async (tx) => {
      await applyAccountTransactionEffect(
        tx,
        {
          accountId: payment.accountId,
          type: debtPaymentTransactionType(payment.debt.direction),
          amount: payment.amount,
        },
        -1,
      );
      await tx.debtPayment.delete({ where: { id: paymentId } });
      await tx.debt.update({
        where: { id: debtId },
        data: { updatedAt: new Date() },
      });
    });
    return debtOperations.get(userId, debtId);
  },
};
