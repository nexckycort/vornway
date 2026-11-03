import { createFileRoute } from '@tanstack/react-router';
import { MobilePageLayout } from '#/components/mobile-page-layout';
import { useGroupFlowNavigation } from '#/lib/group-flow-navigation';
import { getGroupDetailMessages } from '#/routes/_authed/groups/$id/-messages';
import {
  useGroupExpenseQuery,
  useGroupSummaryQuery,
} from '#/routes/_authed/groups/-hooks/use-group-detail-query';
import { AddExpenseForm } from './-components/add-expense-form';
import { AddExpenseSkeleton } from './-components/add-expense-skeleton';

export const Route = createFileRoute('/_authed/groups/$id/add-expense/')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { expenseId?: string } => ({
    expenseId:
      typeof search.expenseId === 'string' && search.expenseId.length > 0
        ? search.expenseId
        : undefined,
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const { expenseId } = Route.useSearch();
  const isEditMode = Boolean(expenseId);
  const { navigateToGroupRoot } = useGroupFlowNavigation(id);
  const groupMessages = getGroupDetailMessages();
  const groupQuery = useGroupSummaryQuery(id);
  const expenseQuery = useGroupExpenseQuery(id, expenseId);
  const expense = expenseQuery.data;
  const isLoading =
    groupQuery.isLoading || (isEditMode && expenseQuery.isLoading);
  const isLoadingError =
    groupQuery.isError || (isEditMode && expenseQuery.isError);

  if (isLoading) {
    return (
      <AddExpenseSkeleton
        title={
          isEditMode
            ? groupMessages.expense.editExpenseTitle
            : groupMessages.expense.newExpenseTitle
        }
        onBack={() => navigateToGroupRoot(true)}
      />
    );
  }

  if (isLoadingError || !groupQuery.data) {
    const message =
      groupQuery.error instanceof Error
        ? groupQuery.error.message
        : isEditMode && expenseQuery.error instanceof Error
          ? expenseQuery.error.message
          : groupMessages.settings.loadError;

    return (
      <MobilePageLayout
        title={
          isEditMode
            ? groupMessages.expense.editExpenseTitle
            : groupMessages.expense.newExpenseTitle
        }
        onBack={() => navigateToGroupRoot(true)}
      >
        <div className="flex flex-1 flex-col justify-center bg-white px-4">
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {message}
          </div>
          <button
            type="button"
            onClick={() => navigateToGroupRoot(true)}
            className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            {groupMessages.expense.backToSpace}
          </button>
        </div>
      </MobilePageLayout>
    );
  }

  return (
    <AddExpenseForm
      key={expense?.id ?? 'new'}
      id={id}
      group={groupQuery.data}
      expense={expense}
      expenseId={expenseId}
    />
  );
}
