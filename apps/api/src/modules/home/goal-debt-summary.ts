import type {
  HomeDebtSummary,
  HomeGoalSummary,
} from '@vornway/contracts/modules/home/contract';
import { normalizeAmount } from './amounts';

type GoalRow = {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly currency: string;
  readonly targetAmount: number;
  readonly endDate: Date;
  readonly createdAt: Date;
  readonly group: { readonly id: string; readonly name: string };
  readonly contributions: readonly { readonly amount: number }[];
};

export const summarizeGoal = (goal: GoalRow): typeof HomeGoalSummary.Type => {
  const savedAmount = normalizeAmount(
    goal.contributions.reduce(
      (total, contribution) => total + contribution.amount,
      0,
    ),
  );
  const progress =
    goal.targetAmount > 0
      ? Math.min(100, normalizeAmount((savedAmount / goal.targetAmount) * 100))
      : 0;

  return {
    id: goal.id,
    title: goal.title,
    description: goal.description,
    currency: goal.currency,
    targetAmount: goal.targetAmount,
    savedAmount,
    progress,
    endDate: goal.endDate,
    createdAt: goal.createdAt,
    group: goal.group,
  };
};

type DebtRow = {
  readonly id: string;
  readonly name: string;
  readonly ownerId: string;
  readonly counterpartyName: string;
  readonly direction: string;
  readonly currency: string;
  readonly expectedTotal: number;
  readonly dueDate: Date | null;
  readonly updatedAt: Date;
  readonly payments: readonly { readonly amount: number }[];
};

export const summarizeDebt = (
  debt: DebtRow,
  userId: string,
  now: Date,
): typeof HomeDebtSummary.Type => {
  const paidAmount = normalizeAmount(
    debt.payments.reduce((total, payment) => total + payment.amount, 0),
  );
  const remainingAmount = normalizeAmount(
    Math.max(debt.expectedTotal - paidAmount, 0),
  );
  const status =
    remainingAmount <= 0
      ? 'paid'
      : debt.dueDate && debt.dueDate < now
        ? 'overdue'
        : 'active';

  const ownerDirection = debt.direction === 'borrowed' ? 'borrowed' : 'lent';
  const direction =
    debt.ownerId === userId
      ? ownerDirection
      : ownerDirection === 'lent'
        ? 'borrowed'
        : 'lent';

  return {
    id: debt.id,
    name: debt.name,
    counterpartyName: debt.counterpartyName,
    direction,
    currency: debt.currency,
    expectedTotal: debt.expectedTotal,
    paidAmount,
    remainingAmount,
    status,
    updatedAt: debt.updatedAt,
  };
};
