import type { InternalError } from '@vornway/contracts/errors';
import {
  GroupExpenseNotFound,
  GroupMemberNotFound,
  GroupNotFound,
} from '@vornway/contracts/modules/groups/errors';
import type {
  ExpenseDetail,
  ExpenseListPage,
  MemberExpenseListPage,
} from '@vornway/contracts/modules/groups/expense-schemas';
import type { MemberExpensesQuery } from '@vornway/contracts/modules/groups/report-schemas';
import type { PageQuery } from '@vornway/contracts/schema';
import { Context, Effect, Layer } from 'effect';
import type { Prisma } from '#/generated/prisma/client';
import { Database } from '#/infrastructure/database/database';
import { pageArgs, toPage } from '#/infrastructure/database/pagination';
import { type MoneyRow, memberExpenseSql, sumByCurrency } from './expense-sql';
import {
  expenseDetailSelect,
  expenseListSelect,
  toExpenseDetail,
  toExpenseListItem,
  toMemberExpenseListItem,
} from './expense-views';
import { activeExpenses, required, visibleGroup } from './helpers';

const listOrder = [
  { date: 'desc' },
  { id: 'desc' },
] satisfies Prisma.ExpenseOrderByWithRelationInput[];

export class GroupExpenses extends Context.Service<
  GroupExpenses,
  {
    list(
      userId: string,
      groupId: string,
      query: PageQuery,
    ): Effect.Effect<
      typeof ExpenseListPage.Type,
      GroupNotFound | InternalError
    >;
    listForMember(
      userId: string,
      groupId: string,
      memberId: string,
      query: typeof MemberExpensesQuery.Type,
    ): Effect.Effect<
      typeof MemberExpenseListPage.Type,
      GroupNotFound | GroupMemberNotFound | InternalError
    >;
    get(
      userId: string,
      groupId: string,
      expenseId: string,
    ): Effect.Effect<
      typeof ExpenseDetail.Type,
      GroupNotFound | GroupExpenseNotFound | InternalError
    >;
  }
>()('vornway/groups/GroupExpenses') {
  static readonly layer = Layer.effect(
    GroupExpenses,
    Effect.gen(function* () {
      const database = yield* Database;

      const requireGroup = (userId: string, groupId: string) =>
        database
          .use((db) =>
            db.group.findFirst({
              where: visibleGroup(userId, groupId),
              select: {
                id: true,
                type: true,
                GroupMember: { select: { id: true, userId: true } },
              },
            }),
          )
          .pipe(required(() => new GroupNotFound()));

      const list = Effect.fn('GroupExpenses.list')(function* (
        userId: string,
        groupId: string,
        query: PageQuery,
      ) {
        const group = yield* requireGroup(userId, groupId);
        const currentMemberId =
          group.GroupMember.find((member) => member.userId === userId)?.id ??
          null;
        const where = activeExpenses(groupId);
        const { limit, args } = pageArgs(query);

        const [total, rows] = yield* Effect.all(
          [
            database.use((db) => db.expense.count({ where })),
            database.use((db) =>
              db.expense.findMany({
                where,
                ...args,
                orderBy: listOrder,
                select: expenseListSelect,
              }),
            ),
          ],
          { concurrency: 2 },
        );
        const page = toPage(rows, limit, total);
        return {
          data: page.data.map((row) =>
            toExpenseListItem(row, group.type, currentMemberId),
          ),
          pagination: page.pagination,
        };
      });

      const listForMember = Effect.fn('GroupExpenses.listForMember')(function* (
        userId: string,
        groupId: string,
        memberId: string,
        query: typeof MemberExpensesQuery.Type,
      ) {
        const group = yield* requireGroup(userId, groupId);
        if (!group.GroupMember.some((member) => member.id === memberId)) {
          return yield* new GroupMemberNotFound();
        }
        const currentMemberId =
          group.GroupMember.find((member) => member.userId === userId)?.id ??
          null;
        const where: Prisma.ExpenseWhereInput = {
          ...activeExpenses(groupId),
          AND: [
            {
              OR: [
                { paidById: memberId },
                { payers: { some: { memberId } } },
                ...(query.paidOnly
                  ? []
                  : [{ participants: { some: { memberId } } }]),
              ],
            },
          ],
          ...(query.categoryId
            ? { categoryId: query.categoryId }
            : query.uncategorized
              ? { categoryId: null }
              : {}),
          ...(query.startDate && query.endDate
            ? {
                date: {
                  gte: new Date(query.startDate),
                  lte: new Date(query.endDate),
                },
              }
            : {}),
        };
        const sql = memberExpenseSql({ groupId, memberId, ...query });
        const { limit, args } = pageArgs(query);

        const [total, rows, spentRows, grossPaidRows] = yield* Effect.all(
          [
            database.use((db) => db.expense.count({ where })),
            database.use((db) =>
              db.expense.findMany({
                where,
                ...args,
                orderBy: listOrder,
                select: expenseListSelect,
              }),
            ),
            database.use(
              (db) => db.$queryRaw<MoneyRow[]>`
                  select e.currency, sum(ep.share)::float as total
                  from expense_participant ep
                  join expense e on e.id = ep."expenseId"
                  where ep."memberId" = ${memberId}
                    and ${sql}
                  group by e.currency
                `,
            ),
            database.use(
              (db) => db.$queryRaw<MoneyRow[]>`
                  select paid.currency, sum(paid.total)::float as total
                  from (
                    select e.currency, p.amount as total
                    from expense_payer p
                    join expense e on e.id = p."expenseId"
                    where p."memberId" = ${memberId}
                      and ${sql}

                    union all

                    select e.currency, e.amount as total
                    from expense e
                    where e."paidById" = ${memberId}
                      and ${sql}
                      and not exists (
                        select 1
                        from expense_payer p
                        where p."expenseId" = e.id
                      )
                  ) paid
                  group by paid.currency
                `,
            ),
          ],
          { concurrency: 4 },
        );

        const page = toPage(rows, limit, total);
        return {
          data: page.data.map((row) =>
            toMemberExpenseListItem(row, group.type, currentMemberId),
          ),
          summary: {
            spentByCurrency: sumByCurrency(spentRows),
            grossPaidByCurrency: sumByCurrency(grossPaidRows),
          },
          pagination: page.pagination,
        };
      });

      const get = Effect.fn('GroupExpenses.get')(function* (
        userId: string,
        groupId: string,
        expenseId: string,
      ) {
        const group = yield* requireGroup(userId, groupId);
        const expense = yield* database
          .use((db) =>
            db.expense.findFirst({
              where: { id: expenseId, groupId: group.id },
              select: expenseDetailSelect,
            }),
          )
          .pipe(required(() => new GroupExpenseNotFound()));
        return toExpenseDetail(expense);
      });

      return GroupExpenses.of({ list, listForMember, get });
    }),
  );
}
