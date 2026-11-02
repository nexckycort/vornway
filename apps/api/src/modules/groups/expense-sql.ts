import { Prisma } from '#/generated/prisma/client';
import { normalizeAmount } from './helpers';

type MemberExpenseFilter = {
  groupId: string;
  memberId: string;
  paidOnly?: boolean;
  categoryId?: string;
  uncategorized?: boolean;
  startDate?: string;
  endDate?: string;
};

export type MoneyRow = { currency: string; total: number | string | null };

const paidByMember = (memberId: string) => Prisma.sql`
  e."paidById" = ${memberId}
  or exists (
    select 1
    from expense_payer p_scope
    where p_scope."expenseId" = e.id
      and p_scope."memberId" = ${memberId}
  )
`;

const involvingMember = (memberId: string) => Prisma.sql`
  ${paidByMember(memberId)}
  or exists (
    select 1
    from expense_participant ep_scope
    where ep_scope."expenseId" = e.id
      and ep_scope."memberId" = ${memberId}
  )
`;

export const memberExpenseSql = (input: MemberExpenseFilter) => Prisma.sql`
  e."groupId" = ${input.groupId}
  and e.status = 'ACTIVE'
  and e."deletedAt" is null
  and (
    e.notes is null
    or e.notes not like '%[DELETED]%'
  )
  and (${input.paidOnly ? paidByMember(input.memberId) : involvingMember(input.memberId)})
  ${
    input.categoryId
      ? Prisma.sql`and e."categoryId" = ${input.categoryId}`
      : input.uncategorized
        ? Prisma.sql`and e."categoryId" is null`
        : Prisma.empty
  }
  ${
    input.startDate && input.endDate
      ? Prisma.sql`and e.date >= ${new Date(input.startDate)} and e.date <= ${new Date(input.endDate)}`
      : Prisma.empty
  }
`;

export const sumByCurrency = (rows: readonly MoneyRow[]) =>
  rows.reduce<Record<string, number>>((totals, row) => {
    const amount = Number(row.total ?? 0);
    if (amount <= 0) return totals;
    totals[row.currency] = normalizeAmount(
      (totals[row.currency] ?? 0) + amount,
    );
    return totals;
  }, {});
