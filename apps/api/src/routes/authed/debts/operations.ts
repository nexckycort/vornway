import type { Prisma } from '#/generated/prisma/client';
import { db } from '#/infrastructure/database/connection';
import type {
  CreateDebtInput,
  CreatePaymentInput,
  UpdateDebtInput,
} from './schema';

const money = (value: number) => Number(value.toFixed(2));

type DebtWithPayments = Prisma.DebtGetPayload<{ include: { payments: true } }>;

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
      paidAt: payment.paidAt.toISOString(),
      createdAt: payment.createdAt.toISOString(),
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
      include: { payments: true },
      orderBy: { createdAt: 'desc' },
    });
    return debts
      .map((debt) => serialize(debt, userId))
      .filter((debt) => input.status === 'all' || debt.status === input.status);
  },
  async get(userId: string, id: string) {
    const debt = await db.debt.findFirst({
      where: { id, ...visibleTo(userId) },
      include: { payments: { orderBy: { paidAt: 'desc' } } },
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
    const interest =
      input.interestType === 'percentage'
        ? input.principalAmount * ((input.interestValue ?? 0) / 100)
        : input.interestType === 'fixed'
          ? (input.interestValue ?? 0)
          : 0;
    const expectedTotal = money(input.principalAmount + interest);
    const debt = await db.debt.create({
      data: {
        ownerId: userId,
        name: input.name,
        counterpartyName: input.counterpartyName,
        counterpartyId: input.counterpartyId,
        direction: input.direction,
        principalAmount: input.principalAmount,
        interestType: input.interestType,
        interestValue: input.interestValue,
        expectedTotal,
        currency: input.currency.toUpperCase(),
        dueDate: input.dueDate,
        description: input.description,
      },
      include: { payments: true },
    });
    return serialize(debt, userId);
  },
  async update(userId: string, id: string, input: UpdateDebtInput) {
    const existing = await db.debt.findFirst({
      where: { id, ownerId: userId },
      include: { payments: true },
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
    const principal = input.principalAmount ?? existing.principalAmount;
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
        ...input,
        currency: input.currency?.toUpperCase(),
        expectedTotal: money(principal + interest),
      },
      include: { payments: true },
    });
    return serialize(debt, userId);
  },
  async delete(userId: string, id: string) {
    const debt = await db.debt.findFirst({
      where: { id, ownerId: userId },
      select: { id: true },
    });
    if (!debt) return false;
    await db.debt.delete({ where: { id } });
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
    await db.$transaction([
      db.debtPayment.create({
        data: {
          debtId: id,
          amount: input.amount,
          paidAt: input.paidAt,
          note: input.note,
        },
      }),
      db.debt.update({
        where: { id },
        data: { updatedAt: new Date() },
      }),
    ]);
    return debtOperations.get(userId, id);
  },
  async deletePayment(userId: string, debtId: string, paymentId: string) {
    const payment = await db.debtPayment.findFirst({
      where: { id: paymentId, debt: { id: debtId, ownerId: userId } },
    });
    if (!payment) return null;
    await db.$transaction([
      db.debtPayment.delete({ where: { id: paymentId } }),
      db.debt.update({
        where: { id: debtId },
        data: { updatedAt: new Date() },
      }),
    ]);
    return debtOperations.get(userId, debtId);
  },
};
