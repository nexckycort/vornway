import { Api } from '@vornway/contracts/api';
import { CurrentUser } from '@vornway/contracts/modules/auth/contract';
import { Effect, Layer } from 'effect';
import { HttpApiBuilder, HttpApiSchema } from 'effect/http-api';
import { GroupCategories } from './categories';
import { GroupExpenseWrites } from './expense-writes';
import { GroupExpenses } from './expenses';
import { GroupMembers } from './members';
import { GroupReports } from './reports';
import { Groups } from './service';

export const GroupsHandlers = HttpApiBuilder.group(Api, 'groups', (handlers) =>
  Effect.gen(function* () {
    const groups = yield* Groups;
    const categories = yield* GroupCategories;
    const reports = yield* GroupReports;
    const expenses = yield* GroupExpenses;
    const writes = yield* GroupExpenseWrites;
    const members = yield* GroupMembers;

    return handlers
      .handle('create', ({ payload }) =>
        Effect.flatMap(CurrentUser, (user) => groups.create(user, payload)),
      )
      .handle('list', ({ query }) =>
        Effect.flatMap(CurrentUser, (user) => groups.list(user.id, query)),
      )
      .handle('get', ({ params }) =>
        Effect.flatMap(CurrentUser, (user) => groups.get(user.id, params.id)),
      )
      .handle('exportCsv', ({ params }) =>
        Effect.flatMap(CurrentUser, (user) =>
          groups.exportCsv(user.id, params.id),
        ).pipe(
          Effect.map((csv) =>
            HttpApiSchema.withHeaders({
              body: csv.content,
              headers: {
                'content-disposition': `attachment; filename="${csv.fileName}"`,
                'cache-control': 'no-store',
              },
            }),
          ),
        ),
      )
      .handle('remove', ({ params }) =>
        Effect.flatMap(CurrentUser, (user) =>
          groups.remove(user.id, params.id),
        ),
      )
      .handle('transferOwner', ({ params, payload }) =>
        Effect.flatMap(CurrentUser, (user) =>
          groups.transferOwner(user.id, params.id, payload.memberId),
        ),
      )
      .handle('update', ({ params, payload }) =>
        Effect.flatMap(CurrentUser, (user) =>
          groups.update(user.id, params.id, payload),
        ),
      )
      .handle('updateSettings', ({ params, payload }) =>
        Effect.flatMap(CurrentUser, (user) =>
          groups.updateSettings(user.id, params.id, payload),
        ),
      )
      .handle('updateImage', ({ params, payload }) =>
        Effect.flatMap(CurrentUser, (user) =>
          groups.updateImage(user.id, params.id, payload),
        ),
      )
      .handle('createCategory', ({ params, payload }) =>
        Effect.flatMap(CurrentUser, (user) =>
          categories.create(user.id, params.id, payload),
        ),
      )
      .handle('updateCategory', ({ params, payload }) =>
        Effect.flatMap(CurrentUser, (user) =>
          categories.update(user.id, params.id, params.categoryId, payload),
        ),
      )
      .handle('removeCategory', ({ params }) =>
        Effect.flatMap(CurrentUser, (user) =>
          categories.remove(user.id, params.id, params.categoryId),
        ),
      )
      .handle('moveCategoryExpenses', ({ params, payload }) =>
        Effect.flatMap(CurrentUser, (user) =>
          categories.moveExpenses(
            user.id,
            params.id,
            params.categoryId,
            payload,
          ),
        ),
      )
      .handle('reportTotals', ({ params, query }) =>
        Effect.flatMap(CurrentUser, (user) =>
          reports.totals(user.id, params.id, query),
        ),
      )
      .handle('reportCategoryCount', ({ params, query }) =>
        Effect.flatMap(CurrentUser, (user) =>
          reports.categoryCount(user.id, params.id, query),
        ),
      )
      .handle('reportBalances', ({ params, query }) =>
        Effect.flatMap(CurrentUser, (user) =>
          reports.balances(user.id, params.id, query),
        ),
      )
      .handle('reportShares', ({ params, query }) =>
        Effect.flatMap(CurrentUser, (user) =>
          reports.shares(user.id, params.id, query),
        ),
      )
      .handle('listExpenses', ({ params, query }) =>
        Effect.flatMap(CurrentUser, (user) =>
          expenses.list(user.id, params.id, query),
        ),
      )
      .handle('listMemberExpenses', ({ params, query }) =>
        Effect.flatMap(CurrentUser, (user) =>
          expenses.listForMember(user.id, params.id, params.memberId, query),
        ),
      )
      .handle('getExpense', ({ params }) =>
        Effect.flatMap(CurrentUser, (user) =>
          expenses.get(user.id, params.id, params.expenseId),
        ),
      )
      .handle('createExpense', ({ params, payload }) =>
        Effect.flatMap(CurrentUser, (user) =>
          writes.create(user.id, params.id, payload),
        ),
      )
      .handle('updateExpense', ({ params, payload }) =>
        Effect.flatMap(CurrentUser, (user) =>
          writes.update(user.id, params.id, params.expenseId, payload),
        ),
      )
      .handle('removeExpense', ({ params }) =>
        Effect.flatMap(CurrentUser, (user) =>
          writes.remove(user.id, params.id, params.expenseId),
        ),
      )
      .handle('settleDebt', ({ params, payload }) =>
        Effect.flatMap(CurrentUser, (user) =>
          writes.settle(user.id, params.id, payload),
        ),
      )
      .handle('searchMembers', ({ params, query }) =>
        Effect.flatMap(CurrentUser, (user) =>
          members.search(user.id, params.id, query.query),
        ),
      )
      .handle('addMember', ({ params, payload }) =>
        Effect.flatMap(CurrentUser, (user) =>
          members.add(user.id, params.id, payload),
        ),
      )
      .handle('unlinkMember', ({ params }) =>
        Effect.flatMap(CurrentUser, (user) =>
          members.unlink(user.id, params.id, params.memberId),
        ),
      )
      .handle('removeMember', ({ params }) =>
        Effect.flatMap(CurrentUser, (user) =>
          members.remove(user.id, params.id, params.memberId),
        ),
      );
  }),
).pipe(
  Layer.provide([
    Groups.layer,
    GroupCategories.layer,
    GroupReports.layer,
    GroupExpenses.layer,
    GroupExpenseWrites.layer,
    GroupMembers.layer,
  ]),
);
