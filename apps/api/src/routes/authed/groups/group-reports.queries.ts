import { Prisma } from '#/generated/prisma/client';
import { db } from '#/infrastructure/database/connection';
import { groupErrors } from './groups.errors';
import {
  buildGroupAccessWhere,
  buildReportExpenseWhere,
  getDateEnd,
  getDateStart,
  normalizeAmount,
} from './helpers';
import type {
  GroupReportsBalancesInput,
  GroupReportsBalancesResult,
  GroupReportsCategoryCountInput,
  GroupReportsCategoryCountResult,
  GroupReportsSharesInput,
  GroupReportsSharesResult,
  GroupReportsTotalsInput,
  GroupReportsTotalsResult,
} from './types';

type ReportMoneyRow = {
  memberId: string;
  currency: string;
  total: number | string | null;
};

type ReportShareRow = ReportMoneyRow & {
  categoryKey: string;
};

function reportDateSql(input: {
  range: 'all' | 'custom';
  startDate?: string;
  endDate?: string;
}) {
  if (
    input.range === 'custom' &&
    typeof input.startDate === 'string' &&
    typeof input.endDate === 'string'
  ) {
    return Prisma.sql`and e.date >= ${getDateStart(input.startDate)} and e.date <= ${getDateEnd(input.endDate)}`;
  }

  return Prisma.empty;
}

function reportExpenseSql(input: {
  groupId: string;
  range: 'all' | 'custom';
  startDate?: string;
  endDate?: string;
}) {
  return Prisma.sql`
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
    and exists (
      select 1
      from expense_participant ep_exists
      where ep_exists."expenseId" = e.id
    )
    ${reportDateSql(input)}
  `;
}

export function createGroupReportsOperations() {
  return {
    getGroupReportsTotals: async ({
      userId,
      groupId,
      range,
      startDate,
      endDate,
    }: GroupReportsTotalsInput): Promise<GroupReportsTotalsResult> => {
      const group = await db.group.findFirst({
        where: {
          ...buildGroupAccessWhere(userId, groupId),
          type: {
            not: 'meta',
          },
        },
        select: {
          id: true,
        },
      });

      if (!group) {
        throw groupErrors.notFound();
      }

      const currentMember = await db.groupMember.findFirst({
        where: {
          groupId: group.id,
          userId,
        },
        select: {
          id: true,
        },
      });

      const reportExpenseWhere = {
        ...buildReportExpenseWhere({
          groupId: group.id,
          range,
          startDate,
          endDate,
        }),
        participants: {
          some: {},
        },
        AND: [
          {
            OR: [
              { notes: null },
              {
                notes: {
                  not: {
                    contains: '[SETTLEMENT:',
                  },
                },
              },
            ],
          },
        ],
      };

      const [expenseTotals, categoryTotals, currentMemberShares] =
        await Promise.all([
          db.expense.groupBy({
            where: reportExpenseWhere,
            by: ['currency'],
            _sum: {
              amount: true,
            },
            _count: {
              _all: true,
            },
          }),
          db.expense.groupBy({
            where: reportExpenseWhere,
            by: ['currency', 'categoryId'],
            _sum: {
              amount: true,
            },
          }),
          currentMember
            ? db.$queryRaw<ReportMoneyRow[]>`
                select ep."memberId" as "memberId", e.currency, sum(ep.share)::float as total
                from expense_participant ep
                join expense e on e.id = ep."expenseId"
                where ep."memberId" = ${currentMember.id}
                  and ${reportExpenseSql({ groupId: group.id, range, startDate, endDate })}
                group by ep."memberId", e.currency
              `
            : Promise.resolve([]),
        ]);

      const categoryIds = categoryTotals
        .map((row) => row.categoryId)
        .filter((value): value is string => Boolean(value));
      const categories =
        categoryIds.length > 0
          ? await db.expenseCategory.findMany({
              where: {
                id: {
                  in: categoryIds,
                },
              },
              select: {
                id: true,
                name: true,
                icon: true,
                color: true,
              },
            })
          : [];
      const categoryById = new Map(
        categories.map((category) => [category.id, category]),
      );

      const currencyTotals = new Map(
        expenseTotals.map((row) => [
          row.currency,
          normalizeAmount(row._sum.amount ?? 0),
        ]),
      );
      const currencyExpenseCounts = new Map(
        expenseTotals.map((row) => [row.currency, row._count._all]),
      );
      const currentUserSpentByCurrency = new Map<string, number>();

      for (const row of currentMemberShares) {
        const currency = row.currency;
        currentUserSpentByCurrency.set(
          currency,
          normalizeAmount(
            (currentUserSpentByCurrency.get(currency) ?? 0) +
              Number(row.total ?? 0),
          ),
        );
      }

      const currencyCategories = new Map<
        string,
        Map<
          string,
          {
            id: string | null;
            name: string;
            icon: string | null;
            color: string | null;
            amount: number;
          }
        >
      >();

      for (const row of categoryTotals) {
        const category = row.categoryId
          ? categoryById.get(row.categoryId)
          : null;
        const categoryName = category?.name?.trim() || 'Sin categoría';
        const categoryKey = row.categoryId ?? categoryName;
        const categoryMap =
          currencyCategories.get(row.currency) ??
          new Map<
            string,
            {
              id: string | null;
              name: string;
              icon: string | null;
              color: string | null;
              amount: number;
            }
          >();
        categoryMap.set(categoryKey, {
          id: row.categoryId,
          name: categoryName,
          icon: category?.icon ?? null,
          color: category?.color ?? null,
          amount: normalizeAmount(row._sum.amount ?? 0),
        });
        currencyCategories.set(row.currency, categoryMap);
      }

      const palette = [
        '#ff7fa3',
        '#f6c15b',
        '#8dd3ff',
        '#7ddfa8',
        '#c4a6ff',
        '#ffae63',
      ];

      return {
        range,
        startDate,
        endDate,
        totalsByCurrency: Object.fromEntries(currencyTotals.entries()),
        expenseCountByCurrency: Object.fromEntries(
          currencyExpenseCounts.entries(),
        ),
        currentUserSpentByCurrency: Object.fromEntries(
          currentUserSpentByCurrency.entries(),
        ),
        categoriesByCurrency: Object.fromEntries(
          Array.from(currencyCategories.entries()).map(([currencyKey, map]) => [
            currencyKey,
            Array.from(map.values())
              .map((category, index) => ({
                key:
                  category.id ??
                  `${category.name}:${category.icon ?? ''}:${category.color ?? ''}`,
                id: category.id,
                name: category.name,
                icon: category.icon,
                amount: category.amount,
                fill:
                  category.color ??
                  palette[index % palette.length] ??
                  '#94a3b8',
              }))
              .sort((left, right) => right.amount - left.amount),
          ]),
        ),
      };
    },
    getGroupReportsCategoryCount: async ({
      userId,
      groupId,
      range,
      startDate,
      endDate,
      categoryId,
      uncategorized,
      currency,
      participantIds,
    }: GroupReportsCategoryCountInput): Promise<GroupReportsCategoryCountResult> => {
      const group = await db.group.findFirst({
        where: {
          ...buildGroupAccessWhere(userId, groupId),
          type: {
            not: 'meta',
          },
        },
        select: {
          id: true,
        },
      });

      if (!group) {
        throw groupErrors.notFound();
      }

      const normalizedParticipantIds = Array.from(
        new Set((participantIds ?? []).filter(Boolean)),
      );

      const expenseCount = await db.expense.count({
        where: {
          ...buildReportExpenseWhere({
            groupId: group.id,
            range,
            startDate,
            endDate,
          }),
          currency,
          participants: {
            some: {},
          },
          ...(categoryId
            ? { categoryId }
            : uncategorized
              ? { categoryId: null }
              : {}),
          AND: [
            ...(normalizedParticipantIds.length > 0
              ? [
                  {
                    OR: [
                      {
                        paidById: {
                          in: normalizedParticipantIds,
                        },
                      },
                      {
                        payers: {
                          some: {
                            memberId: {
                              in: normalizedParticipantIds,
                            },
                          },
                        },
                      },
                      {
                        participants: {
                          some: {
                            memberId: {
                              in: normalizedParticipantIds,
                            },
                          },
                        },
                      },
                    ],
                  },
                ]
              : []),
            {
              OR: [
                { notes: null },
                {
                  notes: {
                    not: {
                      contains: '[SETTLEMENT:',
                    },
                  },
                },
              ],
            },
          ],
        },
      });

      return {
        range,
        startDate,
        endDate,
        expenseCount,
      };
    },
    getGroupReportsBalances: async ({
      userId,
      groupId,
      range,
      startDate,
      endDate,
    }: GroupReportsBalancesInput): Promise<GroupReportsBalancesResult> => {
      const group = await db.group.findFirst({
        where: {
          ...buildGroupAccessWhere(userId, groupId),
          type: {
            not: 'meta',
          },
        },
        select: {
          id: true,
          GroupMember: {
            select: {
              id: true,
              name: true,
              userId: true,
            },
          },
        },
      });

      if (!group) {
        throw groupErrors.notFound();
      }

      const [paidRows, owedRows] = await Promise.all([
        db.$queryRaw<ReportMoneyRow[]>`
          select paid."memberId" as "memberId", paid.currency, sum(paid.total)::float as total
          from (
            select p."memberId", e.currency, p.amount as total
            from expense_payer p
            join expense e on e.id = p."expenseId"
            where ${reportExpenseSql({ groupId: group.id, range, startDate, endDate })}

            union all

            select e."paidById" as "memberId", e.currency, e.amount as total
            from expense e
            where ${reportExpenseSql({ groupId: group.id, range, startDate, endDate })}
              and not exists (
                select 1
                from expense_payer p
                where p."expenseId" = e.id
              )
          ) paid
          group by paid."memberId", paid.currency
        `,
        db.$queryRaw<ReportMoneyRow[]>`
          select ep."memberId" as "memberId", e.currency, sum(ep.share)::float as total
          from expense_participant ep
          join expense e on e.id = ep."expenseId"
          where ${reportExpenseSql({ groupId: group.id, range, startDate, endDate })}
          group by ep."memberId", e.currency
        `,
      ]);

      const balancesByMember = new Map<string, Record<string, number>>();
      for (const member of group.GroupMember) {
        balancesByMember.set(member.id, {});
      }

      for (const row of paidRows) {
        const memberBalances = balancesByMember.get(row.memberId);
        if (!memberBalances) continue;
        memberBalances[row.currency] = normalizeAmount(
          (memberBalances[row.currency] ?? 0) + Number(row.total ?? 0),
        );
      }

      for (const row of owedRows) {
        const memberBalances = balancesByMember.get(row.memberId);
        if (!memberBalances) continue;
        memberBalances[row.currency] = normalizeAmount(
          (memberBalances[row.currency] ?? 0) - Number(row.total ?? 0),
        );
      }

      return {
        range,
        startDate,
        endDate,
        memberBalances: group.GroupMember.map((member) => ({
          memberId: member.id,
          name: member.name,
          isCurrentUser: member.userId === userId,
          balances: balancesByMember.get(member.id) ?? {},
        })),
      };
    },
    getGroupReportsShares: async ({
      userId,
      groupId,
      range,
      startDate,
      endDate,
    }: GroupReportsSharesInput): Promise<GroupReportsSharesResult> => {
      const group = await db.group.findFirst({
        where: {
          ...buildGroupAccessWhere(userId, groupId),
          type: {
            not: 'meta',
          },
        },
        select: {
          id: true,
          GroupMember: {
            select: {
              id: true,
              name: true,
              userId: true,
            },
          },
        },
      });

      if (!group) {
        throw groupErrors.notFound();
      }

      const shareRows = await db.$queryRaw<ReportShareRow[]>`
        select
          ep."memberId" as "memberId",
          e.currency,
          case
            when e."categoryId" is not null then e."categoryId"
            else 'Sin categoría::'
          end as "categoryKey",
          sum(ep.share)::float as total
        from expense_participant ep
        join expense e on e.id = ep."expenseId"
        where ${reportExpenseSql({ groupId: group.id, range, startDate, endDate })}
        group by ep."memberId", e.currency, e."categoryId"
      `;

      const sharesByMember = new Map<string, Record<string, number>>();
      const categorySharesByMember = new Map<
        string,
        Record<string, Record<string, number>>
      >();
      for (const member of group.GroupMember) {
        sharesByMember.set(member.id, {});
        categorySharesByMember.set(member.id, {});
      }

      for (const row of shareRows) {
        const memberShares = sharesByMember.get(row.memberId);
        if (!memberShares) continue;

        const total = Number(row.total ?? 0);
        memberShares[row.currency] = normalizeAmount(
          (memberShares[row.currency] ?? 0) + total,
        );

        const memberCategoryShares = categorySharesByMember.get(row.memberId);
        if (!memberCategoryShares) continue;

        const currencyCategoryShares = memberCategoryShares[row.currency] ?? {};
        currencyCategoryShares[row.categoryKey] = normalizeAmount(
          (currencyCategoryShares[row.categoryKey] ?? 0) + total,
        );
        memberCategoryShares[row.currency] = currencyCategoryShares;
      }

      return {
        range,
        startDate,
        endDate,
        memberShares: group.GroupMember.map((member) => ({
          memberId: member.id,
          name: member.name,
          isCurrentUser: member.userId === userId,
          shares: sharesByMember.get(member.id) ?? {},
          categorySharesByCurrency: categorySharesByMember.get(member.id) ?? {},
        })),
      };
    },
  };
}
