import { normalizeAmount } from './helpers';

type BalanceExpense = {
  amount: number;
  currency: string;
  paidById: string;
  payers: readonly { memberId: string; amount: number }[];
  participants: readonly { memberId: string; share: number }[];
};

type PairBalance = {
  memberId: string;
  currency: string;
  amount: number;
};

export const payerEntries = (expense: BalanceExpense) =>
  expense.payers.length > 0
    ? expense.payers
    : [{ memberId: expense.paidById, amount: expense.amount }];

export const pairwiseBalances = (
  expenses: readonly BalanceExpense[],
  memberId: string,
) => {
  const credits = new Map<string, PairBalance>();
  const debts = new Map<string, PairBalance>();
  const add = (
    balances: Map<string, PairBalance>,
    counterpartId: string,
    currency: string,
    amount: number,
  ) => {
    if (amount <= 0) return;
    const key = `${counterpartId}:${currency}`;
    balances.set(key, {
      memberId: counterpartId,
      currency,
      amount: normalizeAmount((balances.get(key)?.amount ?? 0) + amount),
    });
  };

  for (const expense of expenses) {
    if (expense.participants.length === 0) continue;
    const payers = payerEntries(expense);
    const totalPaid = payers.reduce((total, payer) => total + payer.amount, 0);
    const portion = (share: number, paid: number) =>
      normalizeAmount(totalPaid > 0 ? (share * paid) / totalPaid : 0);

    const paidByMe = payers.find((payer) => payer.memberId === memberId);
    if (paidByMe) {
      for (const participant of expense.participants) {
        if (participant.memberId === memberId) continue;
        add(
          credits,
          participant.memberId,
          expense.currency,
          portion(participant.share, paidByMe.amount),
        );
      }
    }

    const myShare = expense.participants.find(
      (participant) => participant.memberId === memberId,
    );
    if (!myShare) continue;
    for (const payer of payers) {
      if (payer.memberId === memberId) continue;
      add(
        debts,
        payer.memberId,
        expense.currency,
        portion(myShare.share, payer.amount),
      );
    }
  }

  return [...new Set([...credits.keys(), ...debts.keys()])].flatMap((key) => {
    const credit = credits.get(key);
    const debt = debts.get(key);
    const base = credit ?? debt;
    if (!base) return [];
    const net = normalizeAmount((credit?.amount ?? 0) - (debt?.amount ?? 0));
    return Math.abs(net) < 0.01
      ? []
      : [{ memberId: base.memberId, currency: base.currency, net }];
  });
};
