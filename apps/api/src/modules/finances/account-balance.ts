import type { Prisma } from '#/generated/prisma/client';
import { money } from './money';

export const creditAvailable = (
  creditLimit: number | null,
  usedCredit: number,
) => {
  if (creditLimit === null) return 0;
  return money(Math.max(creditLimit - usedCredit, 0));
};

export const applyAccountTransactionEffect = async (
  tx: Prisma.TransactionClient,
  input: {
    accountId: string | null | undefined;
    type: 'INCOME' | 'EXPENSE' | 'BOTH';
    amount: number;
  },
  direction: 1 | -1,
) => {
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
        : creditAvailable(account.creditLimit, usedCredit);

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
};
