import { Schema } from 'effect';
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from 'effect/http-api';
import { PageQuery } from '../../schema.ts';
import { SessionAuth } from '../auth/contract.ts';
import {
  GroupAccessDenied,
  GroupCategoryHasExpenses,
  GroupCategoryNameConflict,
  GroupCategoryNameRequired,
  GroupCategoryNotFound,
  GroupCategoryTargetNotFound,
  GroupCategoryTargetSame,
  GroupExpenseCategoryInvalid,
  GroupExpenseDeleted,
  GroupExpenseIdConflict,
  GroupExpenseLineItemsInvalid,
  GroupExpenseNotFound,
  GroupExpenseParticipantsInvalid,
  GroupExpensePayerInvalid,
  GroupMemberAlreadyUnlinked,
  GroupMemberHasExpenses,
  GroupMemberNotFound,
  GroupMemberRemoveForbidden,
  GroupMemberUnlinkForbidden,
  GroupNotFound,
  GroupOwnerRemoveForbidden,
  GroupOwnerTransferForbidden,
  GroupOwnerTransferTargetRequired,
  GroupOwnerTransferTargetSame,
  GroupOwnerUnlinkForbidden,
  GroupSettlementParticipantsInvalid,
} from './errors.ts';
import {
  ExpenseDetail,
  ExpenseListPage,
  ExpensePayload,
  ExpenseRef,
  MemberExpenseListPage,
  SettlementPayload,
} from './expense-schemas.ts';
import {
  CategoryCountQuery,
  MemberExpensesQuery,
  ReportsBalances,
  ReportsCategoryCount,
  ReportsQuery,
  ReportsShares,
  ReportsTotals,
} from './report-schemas.ts';
import {
  AddMemberPayload,
  CategoryParams,
  CreateCategoryPayload,
  CreatedGroup,
  CreateGroupPayload,
  DeletedCategory,
  DeletedGroup,
  ExpenseParams,
  GroupCategory,
  GroupImage,
  GroupListPage,
  GroupMemberParams,
  GroupMemberRef,
  GroupParams,
  GroupSummary,
  ImageUpload,
  ListGroupsQuery,
  MemberSearchResults,
  MoveCategoryExpensesPayload,
  MovedCategoryExpenses,
  SearchMembersQuery,
  TransferOwnerPayload,
  TransferredOwner,
  UpdateCategoryPayload,
  UpdatedGroup,
  UpdatedGroupSettings,
  UpdateGroupPayload,
  UpdateGroupSettingsPayload,
} from './schemas.ts';

const BASE = '/api/groups';
const GroupCsv = HttpApiSchema.WithHeaders(
  Schema.String.pipe(
    HttpApiSchema.asText({ contentType: 'text/csv; charset=utf-8' }),
  ),
  { 'content-disposition': Schema.String, 'cache-control': Schema.String },
);
const created = HttpApiSchema.status(201);
// Expense writes always answered 400 in the Hono routes, even for a missing expense.
const ExpenseNotFoundOnWrite = GroupExpenseNotFound.pipe(
  HttpApiSchema.status(400),
);

export class GroupsApi extends HttpApiGroup.make('groups')
  .add(
    HttpApiEndpoint.post('create', BASE, {
      payload: CreateGroupPayload,
      success: CreatedGroup.pipe(created),
    }),
    HttpApiEndpoint.get('list', BASE, {
      query: ListGroupsQuery,
      success: GroupListPage,
    }),
    HttpApiEndpoint.get('get', `${BASE}/:id`, {
      params: GroupParams,
      success: GroupSummary,
      error: GroupNotFound,
    }),
    HttpApiEndpoint.get('exportCsv', `${BASE}/:id/export`, {
      params: GroupParams,
      success: GroupCsv,
      error: GroupNotFound,
    }),
    HttpApiEndpoint.delete('remove', `${BASE}/:id`, {
      params: GroupParams,
      success: DeletedGroup,
      error: GroupNotFound,
    }),
    HttpApiEndpoint.patch('transferOwner', `${BASE}/:id/owner`, {
      params: GroupParams,
      payload: TransferOwnerPayload,
      success: TransferredOwner,
      error: [
        GroupAccessDenied,
        GroupOwnerTransferForbidden,
        GroupMemberNotFound,
        GroupOwnerTransferTargetRequired,
        GroupOwnerTransferTargetSame,
      ],
    }),
    HttpApiEndpoint.patch('update', `${BASE}/:id`, {
      params: GroupParams,
      payload: UpdateGroupPayload,
      success: UpdatedGroup,
      error: GroupNotFound,
    }),
    HttpApiEndpoint.patch('updateSettings', `${BASE}/:id/settings`, {
      params: GroupParams,
      payload: UpdateGroupSettingsPayload,
      success: UpdatedGroupSettings,
      error: GroupNotFound,
    }),
    HttpApiEndpoint.patch('updateImage', `${BASE}/:id/image`, {
      params: GroupParams,
      payload: ImageUpload,
      success: GroupImage,
      error: GroupNotFound,
    }),
  )
  .add(
    HttpApiEndpoint.post('createCategory', `${BASE}/:id/categories`, {
      params: GroupParams,
      payload: CreateCategoryPayload,
      success: GroupCategory.pipe(created),
      error: [GroupNotFound, GroupCategoryNameRequired],
    }),
    HttpApiEndpoint.patch(
      'updateCategory',
      `${BASE}/:id/categories/:categoryId`,
      {
        params: CategoryParams,
        payload: UpdateCategoryPayload,
        success: GroupCategory,
        error: [
          GroupNotFound,
          GroupCategoryNotFound,
          GroupCategoryNameRequired,
          GroupCategoryNameConflict,
        ],
      },
    ),
    HttpApiEndpoint.delete(
      'removeCategory',
      `${BASE}/:id/categories/:categoryId`,
      {
        params: CategoryParams,
        success: DeletedCategory,
        error: [GroupNotFound, GroupCategoryNotFound, GroupCategoryHasExpenses],
      },
    ),
    HttpApiEndpoint.post(
      'moveCategoryExpenses',
      `${BASE}/:id/categories/:categoryId/move-expenses`,
      {
        params: CategoryParams,
        payload: MoveCategoryExpensesPayload,
        success: MovedCategoryExpenses,
        error: [
          GroupNotFound,
          GroupCategoryNotFound,
          GroupCategoryTargetSame,
          GroupCategoryTargetNotFound,
        ],
      },
    ),
  )
  .add(
    HttpApiEndpoint.get('reportTotals', `${BASE}/:id/reports/totals`, {
      params: GroupParams,
      query: ReportsQuery,
      success: ReportsTotals,
      error: GroupNotFound,
    }),
    HttpApiEndpoint.get(
      'reportCategoryCount',
      `${BASE}/:id/reports/category-count`,
      {
        params: GroupParams,
        query: CategoryCountQuery,
        success: ReportsCategoryCount,
        error: GroupNotFound,
      },
    ),
    HttpApiEndpoint.get('reportBalances', `${BASE}/:id/reports/balances`, {
      params: GroupParams,
      query: ReportsQuery,
      success: ReportsBalances,
      error: GroupNotFound,
    }),
    HttpApiEndpoint.get('reportShares', `${BASE}/:id/reports/shares`, {
      params: GroupParams,
      query: ReportsQuery,
      success: ReportsShares,
      error: GroupNotFound,
    }),
  )
  .add(
    HttpApiEndpoint.get('listExpenses', `${BASE}/:id/expenses`, {
      params: GroupParams,
      query: PageQuery,
      success: ExpenseListPage,
      error: GroupNotFound,
    }),
    HttpApiEndpoint.get(
      'listMemberExpenses',
      `${BASE}/:id/members/:memberId/expenses`,
      {
        params: GroupMemberParams,
        query: MemberExpensesQuery,
        success: MemberExpenseListPage,
        error: [GroupNotFound, GroupMemberNotFound],
      },
    ),
    HttpApiEndpoint.get('getExpense', `${BASE}/:id/expenses/:expenseId`, {
      params: ExpenseParams,
      success: ExpenseDetail,
      error: [GroupNotFound, GroupExpenseNotFound],
    }),
    HttpApiEndpoint.post('createExpense', `${BASE}/:id/expenses`, {
      params: GroupParams,
      payload: ExpensePayload,
      success: ExpenseRef.pipe(created),
      error: [
        GroupAccessDenied,
        GroupExpenseIdConflict,
        GroupExpensePayerInvalid,
        GroupExpenseCategoryInvalid,
        GroupExpenseParticipantsInvalid,
        GroupExpenseLineItemsInvalid,
      ],
    }),
    HttpApiEndpoint.put('updateExpense', `${BASE}/:id/expenses/:expenseId`, {
      params: ExpenseParams,
      payload: ExpensePayload,
      success: ExpenseRef,
      error: [
        GroupAccessDenied,
        GroupExpensePayerInvalid,
        GroupExpenseCategoryInvalid,
        GroupExpenseParticipantsInvalid,
        ExpenseNotFoundOnWrite,
        GroupExpenseDeleted,
        GroupExpenseLineItemsInvalid,
      ],
    }),
    HttpApiEndpoint.delete('removeExpense', `${BASE}/:id/expenses/:expenseId`, {
      params: ExpenseParams,
      success: ExpenseRef,
      error: [GroupAccessDenied, ExpenseNotFoundOnWrite],
    }),
    HttpApiEndpoint.post('settleDebt', `${BASE}/:id/settlements`, {
      params: GroupParams,
      payload: SettlementPayload,
      success: ExpenseRef.pipe(created),
      error: [GroupAccessDenied, GroupSettlementParticipantsInvalid],
    }),
  )
  .add(
    HttpApiEndpoint.get('searchMembers', `${BASE}/:id/members/search`, {
      params: GroupParams,
      query: SearchMembersQuery,
      success: MemberSearchResults,
      error: GroupAccessDenied,
    }),
    HttpApiEndpoint.post('addMember', `${BASE}/:id/members`, {
      params: GroupParams,
      payload: AddMemberPayload,
      success: GroupMemberRef.pipe(created),
      error: GroupAccessDenied,
    }),
    HttpApiEndpoint.delete(
      'unlinkMember',
      `${BASE}/:id/members/:memberId/account-link`,
      {
        params: GroupMemberParams,
        success: GroupMemberRef,
        error: [
          GroupAccessDenied,
          GroupMemberNotFound,
          GroupMemberUnlinkForbidden,
          GroupMemberAlreadyUnlinked,
          GroupOwnerUnlinkForbidden,
        ],
      },
    ),
    HttpApiEndpoint.delete('removeMember', `${BASE}/:id/members/:memberId`, {
      params: GroupMemberParams,
      success: GroupMemberRef,
      error: [
        GroupAccessDenied,
        GroupMemberRemoveForbidden,
        GroupMemberNotFound,
        GroupOwnerRemoveForbidden,
        GroupMemberHasExpenses,
      ],
    }),
  )
  .middleware(SessionAuth) {}
