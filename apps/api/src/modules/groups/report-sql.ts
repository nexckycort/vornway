import { Prisma } from '#/generated/prisma/client';
import { parseDate } from './helpers';

export type ReportRange = {
  range: 'all' | 'custom';
  startDate?: string;
  endDate?: string;
};

export type ReportMoneyRow = {
  memberId: string;
  currency: string;
  total: number | string | null;
};

export type ReportShareRow = ReportMoneyRow & { categoryKey: string };

export const reportExpenseSql = (
  input: ReportRange & {
    groupId: string;
    includeParticipantlessExpenses?: boolean;
  },
) => Prisma.sql`
  e."groupId" = ${input.groupId}
  and e.status = 'ACTIVE'
  and e."deletedAt" is null
  and (
    e.notes is null
    or (
      e.notes not like '%[DELETED]%'
      and e.notes not like '%[SETTLEMENT:%'
    )
  )
  ${
    input.includeParticipantlessExpenses
      ? Prisma.empty
      : Prisma.sql`
          and exists (
            select 1
            from expense_participant ep_exists
            where ep_exists."expenseId" = e.id
          )
        `
  }
  ${
    input.range === 'custom' && input.startDate && input.endDate
      ? Prisma.sql`and e.date >= ${parseDate(input.startDate)} and e.date <= ${parseDate(input.endDate)}`
      : Prisma.empty
  }
`;
