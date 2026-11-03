import { createFileRoute } from '@tanstack/react-router';
import { MobilePageLayout } from '#/components/mobile-page-layout';
import { QuickSplitAmountHeader } from './-components/quick-split-amount-header';
import { QuickSplitDetails } from './-components/quick-split-details';
import { QuickSplitDrawers } from './-components/quick-split-drawers';
import { QuickSplitFriendResults } from './-components/quick-split-friend-results';
import { QuickSplitParticipants } from './-components/quick-split-participants';
import { QuickSplitExpenseSkeleton } from './-components/quick-split-skeleton';
import { QuickSplitSubmitBar } from './-components/quick-split-submit-bar';
import { useQuickSplitForm } from './-hooks/use-quick-split-form';

export const Route = createFileRoute('/_authed/expenses/quick-split')({
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    friendIds: string[];
    from: 'home' | 'friends';
    quickSplitId?: string;
    expenseId?: string;
  } => ({
    friendIds: Array.isArray(search.friendIds)
      ? search.friendIds.filter(
          (value): value is string => typeof value === 'string',
        )
      : [],
    from: search.from === 'friends' ? ('friends' as const) : ('home' as const),
    quickSplitId:
      typeof search.quickSplitId === 'string' ? search.quickSplitId : undefined,
    expenseId:
      typeof search.expenseId === 'string' ? search.expenseId : undefined,
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const form = useQuickSplitForm(Route.useSearch());
  const { t, isEditMode, handleBack, isLoading, isLoadingError, expenseQuery } =
    form;
  const title = isEditMode ? 'Editar gasto' : t.title;

  if (isLoading) {
    return (
      <MobilePageLayout title={title} onBack={handleBack}>
        <QuickSplitExpenseSkeleton />
      </MobilePageLayout>
    );
  }

  if (isLoadingError) {
    return (
      <MobilePageLayout title={title} onBack={handleBack}>
        <div className="flex flex-1 flex-col justify-center bg-white px-2">
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {expenseQuery.error instanceof Error
              ? expenseQuery.error.message
              : t.updateError}
          </div>
          <button
            type="button"
            onClick={handleBack}
            className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            Volver
          </button>
        </div>
      </MobilePageLayout>
    );
  }

  return (
    <MobilePageLayout title={title} onBack={handleBack}>
      <QuickSplitAmountHeader form={form} />

      <div className="space-y-5 px-2 pb-24">
        <QuickSplitDetails form={form} />
        <QuickSplitFriendResults form={form} />
        <QuickSplitParticipants form={form} />
      </div>

      <QuickSplitSubmitBar form={form} />
      <QuickSplitDrawers form={form} />
    </MobilePageLayout>
  );
}
