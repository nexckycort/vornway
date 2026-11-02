import { money } from './money';

export const groupExpenseShare = (
  expense: {
    amount: number;
    participants: readonly { memberId: string; share: number }[];
    payers: readonly { memberId: string; amount: number }[];
  },
  groupType: string,
  memberId: string,
) => {
  const share = expense.participants.find(
    (participant) => participant.memberId === memberId,
  )?.share;
  const paid =
    expense.payers.find((payer) => payer.memberId === memberId)?.amount ?? 0;
  const unsplitPersonal =
    groupType === 'personal' && expense.participants.length === 0;
  const amount =
    typeof share === 'number' ? share : unsplitPersonal ? expense.amount : 0;

  if (amount <= 0) return null;
  return {
    amount,
    userShare: money(amount),
    currentUserBalance: unsplitPersonal ? null : money(paid - amount),
  };
};
