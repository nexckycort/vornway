import type { Prisma } from '#/generated/prisma/client';
import { money } from '#/modules/finances/money';

export const debtInclude = {
  amounts: { include: { account: true } },
  payments: { include: { account: true } },
} as const;

export const visibleTo = (userId: string) => ({
  OR: [{ ownerId: userId }, { counterpartyId: userId }],
});

export const paymentTransactionType = (direction: string) =>
  direction === 'borrowed' ? 'EXPENSE' : 'INCOME';

export const loanTransactionType = (direction: string) =>
  direction === 'borrowed' ? 'INCOME' : 'EXPENSE';

export const expectedTotalFor = (
  principalAmount: number,
  interestType: string,
  interestValue: number | null | undefined,
) => {
  const interest =
    interestType === 'percentage'
      ? principalAmount * ((interestValue ?? 0) / 100)
      : interestType === 'fixed'
        ? (interestValue ?? 0)
        : 0;
  return money(principalAmount + interest);
};

export const sumAmounts = (items: ReadonlyArray<{ amount: number }>) =>
  money(items.reduce((total, item) => total + item.amount, 0));

type DebtWithRelations = Prisma.DebtGetPayload<{ include: typeof debtInclude }>;

type AccountView = DebtWithRelations['payments'][number]['account'];

export const toDebtView = (debt: DebtWithRelations, viewerId: string) => {
  const paidAmount = sumAmounts(debt.payments);
  const remainingAmount = money(Math.max(debt.expectedTotal - paidAmount, 0));
  const status =
    remainingAmount <= 0
      ? 'paid'
      : debt.dueDate && debt.dueDate < new Date()
        ? 'overdue'
        : 'active';
  return {
    ...debt,
    viewerRole: debt.ownerId === viewerId ? 'owner' : 'counterparty',
    paidAmount,
    remainingAmount,
    status,
    payments: debt.payments.map((payment) => ({
      ...payment,
      account: accountView(payment.account),
    })),
    amounts: debt.amounts.map((amount) => ({
      id: amount.id,
      account: accountView(amount.account),
      amount: amount.amount,
      loanDate: amount.loanDate,
      createdAt: amount.createdAt,
    })),
  } as const;
};

const accountView = (account: AccountView) =>
  account && {
    id: account.id,
    name: account.name,
    institution: account.institution,
    currency: account.currency,
  };
