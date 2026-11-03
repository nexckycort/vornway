import type { InternalError } from '@vornway/contracts/errors';
import { GroupNotFound } from '@vornway/contracts/modules/groups/errors';
import type {
  CategoryCountQuery,
  ReportsBalances,
  ReportsCategoryCount,
  ReportsQuery,
  ReportsShares,
  ReportsTotals,
} from '@vornway/contracts/modules/groups/report-schemas';
import { Context, Effect, Layer } from 'effect';
import type { Prisma } from '#/generated/prisma/client';
import { Database } from '#/infrastructure/database/database';
import { reportExpenses, required, visibleGroup } from './helpers';
import {
  type ReportMoneyRow,
  type ReportShareRow,
  reportExpenseSql,
} from './report-sql';
import {
  buildBalancesReport,
  buildSharesReport,
  buildTotalsReport,
} from './report-views';

type Report<Fields> = Effect.Effect<Fields, GroupNotFound | InternalError>;

export class GroupReports extends Context.Service<
  GroupReports,
  {
    totals(
      userId: string,
      groupId: string,
      query: typeof ReportsQuery.Type,
    ): Report<typeof ReportsTotals.Type>;
    categoryCount(
      userId: string,
      groupId: string,
      query: typeof CategoryCountQuery.Type,
    ): Report<typeof ReportsCategoryCount.Type>;
    balances(
      userId: string,
      groupId: string,
      query: typeof ReportsQuery.Type,
    ): Report<typeof ReportsBalances.Type>;
    shares(
      userId: string,
      groupId: string,
      query: typeof ReportsQuery.Type,
    ): Report<typeof ReportsShares.Type>;
  }
>()('@vornway/api/modules/groups/reports/GroupReports') {
  static readonly layer = Layer.effect(
    GroupReports,
    Effect.gen(function* () {
      const database = yield* Database;

      const requireGroup = <S extends Prisma.GroupSelect>(
        userId: string,
        groupId: string,
        select: S,
      ) =>
        database
          .use((db) =>
            db.group.findFirst({
              where: visibleGroup(userId, groupId),
              select,
            }),
          )
          .pipe(required(() => new GroupNotFound()));

      const range = (query: typeof ReportsQuery.Type) => ({
        range: query.range ?? 'all',
        ...(query.startDate ? { startDate: query.startDate } : {}),
        ...(query.endDate ? { endDate: query.endDate } : {}),
      });

      const totals = Effect.fn('GroupReports.totals')(function* (
        userId: string,
        groupId: string,
        query: typeof ReportsQuery.Type,
      ) {
        const period = range(query);
        const group = yield* requireGroup(userId, groupId, {
          id: true,
          type: true,
        });
        const personal = group.type === 'personal';
        const currentMember = yield* database.use((db) =>
          db.groupMember.findFirst({
            where: { groupId, userId },
            select: { id: true },
          }),
        );
        const where: Prisma.ExpenseWhereInput = {
          ...reportExpenses({ groupId, ...period }),
          ...(personal ? {} : { participants: { some: {} } }),
          AND: [
            {
              OR: [
                { notes: null },
                { notes: { not: { contains: '[SETTLEMENT:' } } },
              ],
            },
          ],
        };

        const [
          expenseTotals,
          categoryTotals,
          currentMemberShares,
          tagExpenses,
        ] = yield* Effect.all(
          [
            database.use((db) =>
              db.expense.groupBy({
                where,
                by: ['currency'],
                _sum: { amount: true },
                _count: { _all: true },
              }),
            ),
            database.use((db) =>
              db.expense.groupBy({
                where,
                by: ['currency', 'categoryId'],
                _sum: { amount: true },
              }),
            ),
            currentMember
              ? database.use(
                  (db) => db.$queryRaw<ReportMoneyRow[]>`
                      select ep."memberId" as "memberId", e.currency, sum(ep.share)::float as total
                      from expense_participant ep
                      join expense e on e.id = ep."expenseId"
                      where ep."memberId" = ${currentMember.id}
                        and ${reportExpenseSql({ groupId, ...period, includeParticipantlessExpenses: personal })}
                      group by ep."memberId", e.currency
                    `,
                )
              : Effect.succeed<ReportMoneyRow[]>([]),
            personal
              ? database.use((db) =>
                  db.expense.findMany({
                    where,
                    select: { amount: true, currency: true, metadata: true },
                  }),
                )
              : Effect.succeed([]),
          ],
          { concurrency: 4 },
        );

        const categoryIds = categoryTotals.flatMap((row) =>
          row.categoryId ? [row.categoryId] : [],
        );
        const categories =
          categoryIds.length > 0
            ? yield* database.use((db) =>
                db.expenseCategory.findMany({
                  where: { id: { in: categoryIds } },
                  select: { id: true, name: true, icon: true, color: true },
                }),
              )
            : [];

        return {
          ...period,
          ...buildTotalsReport({
            totals: expenseTotals,
            categoryTotals,
            categories,
            currentMemberShares,
            tagExpenses,
            personal,
          }),
        };
      });

      const categoryCount = Effect.fn('GroupReports.categoryCount')(function* (
        userId: string,
        groupId: string,
        query: typeof CategoryCountQuery.Type,
      ) {
        const period = range(query);
        const group = yield* requireGroup(userId, groupId, {
          id: true,
          type: true,
        });
        const participantIds = [
          ...new Set(
            (query.participantIds ?? '')
              .split(',')
              .map((value) => value.trim())
              .filter(Boolean),
          ),
        ];
        const expenseCount = yield* database.use((db) =>
          db.expense.count({
            where: {
              ...reportExpenses({ groupId, ...period }),
              currency: query.currency,
              ...(group.type === 'personal'
                ? {}
                : { participants: { some: {} } }),
              ...(query.categoryId
                ? { categoryId: query.categoryId }
                : query.uncategorized
                  ? { categoryId: null }
                  : {}),
              AND: [
                ...(participantIds.length > 0
                  ? [
                      {
                        OR: [
                          { paidById: { in: participantIds } },
                          {
                            payers: {
                              some: { memberId: { in: participantIds } },
                            },
                          },
                          {
                            participants: {
                              some: { memberId: { in: participantIds } },
                            },
                          },
                        ],
                      },
                    ]
                  : []),
                {
                  OR: [
                    { notes: null },
                    { notes: { not: { contains: '[SETTLEMENT:' } } },
                  ],
                },
              ],
            },
          }),
        );
        return { ...period, expenseCount };
      });

      const membersOf = (userId: string, groupId: string) =>
        requireGroup(userId, groupId, {
          id: true,
          GroupMember: { select: { id: true, name: true, userId: true } },
        });

      const balances = Effect.fn('GroupReports.balances')(function* (
        userId: string,
        groupId: string,
        query: typeof ReportsQuery.Type,
      ) {
        const period = range(query);
        const group = yield* membersOf(userId, groupId);
        const sql = reportExpenseSql({ groupId, ...period });
        const [paidRows, owedRows] = yield* Effect.all(
          [
            database.use(
              (db) => db.$queryRaw<ReportMoneyRow[]>`
                select paid."memberId" as "memberId", paid.currency, sum(paid.total)::float as total
                from (
                  select p."memberId", e.currency, p.amount as total
                  from expense_payer p
                  join expense e on e.id = p."expenseId"
                  where ${sql}

                  union all

                  select e."paidById" as "memberId", e.currency, e.amount as total
                  from expense e
                  where ${sql}
                    and not exists (
                      select 1
                      from expense_payer p
                      where p."expenseId" = e.id
                    )
                ) paid
                group by paid."memberId", paid.currency
              `,
            ),
            database.use(
              (db) => db.$queryRaw<ReportMoneyRow[]>`
                select ep."memberId" as "memberId", e.currency, sum(ep.share)::float as total
                from expense_participant ep
                join expense e on e.id = ep."expenseId"
                where ${sql}
                group by ep."memberId", e.currency
              `,
            ),
          ],
          { concurrency: 2 },
        );
        return {
          ...period,
          ...buildBalancesReport(group.GroupMember, paidRows, owedRows, userId),
        };
      });

      const shares = Effect.fn('GroupReports.shares')(function* (
        userId: string,
        groupId: string,
        query: typeof ReportsQuery.Type,
      ) {
        const period = range(query);
        const group = yield* membersOf(userId, groupId);
        const rows = yield* database.use(
          (db) => db.$queryRaw<ReportShareRow[]>`
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
            where ${reportExpenseSql({ groupId, ...period })}
            group by ep."memberId", e.currency, e."categoryId"
          `,
        );
        return {
          ...period,
          ...buildSharesReport(group.GroupMember, rows, userId),
        };
      });

      return GroupReports.of({ totals, categoryCount, balances, shares });
    }),
  );
}
