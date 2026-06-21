import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { MobilePageLayout } from '#/components/mobile-page-layout';
import { DeleteFeedbackDialog } from './-components/delete-feedback-dialog';
import { FeedbackForm } from './-components/feedback-form';
import { FeedbackList } from './-components/feedback-list';
import { FeedbackTypeSelector } from './-components/feedback-type-selector';
import { type FeedbackType, useFeedbackPage } from './-hooks/use-feedback-page';

export const Route = createFileRoute('/_authed/profile/feedback/')({
  validateSearch: (search: Record<string, unknown>) => ({
    type:
      search.type === 'FEATURE_REQUEST' ? 'FEATURE_REQUEST' : ('BUG' as const),
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { type: initialType } = Route.useSearch();
  const feedbackPage = useFeedbackPage(initialType as FeedbackType);

  return (
    <MobilePageLayout
      title="Feedback"
      onBack={() => {
        void navigate({ to: '/profile' });
      }}
    >
      <div className="space-y-6 px-2 pb-8">
        <FeedbackTypeSelector
          value={feedbackPage.type}
          onChange={feedbackPage.setType}
        />

        <FeedbackForm
          type={feedbackPage.type}
          title={feedbackPage.title}
          description={feedbackPage.description}
          draftImages={feedbackPage.draftImages}
          imageInputRef={feedbackPage.imageInputRef}
          titleError={feedbackPage.titleError}
          descriptionError={feedbackPage.descriptionError}
          isSubmitting={feedbackPage.createFeedbackMutation.isPending}
          onTitleChange={feedbackPage.setTitle}
          onDescriptionChange={feedbackPage.setDescription}
          onDraftImagesChange={feedbackPage.handleDraftImagesChange}
          onRemoveDraftImage={feedbackPage.handleRemoveDraftImage}
          onSubmit={feedbackPage.handleSubmit}
        />

        <FeedbackList
          items={feedbackPage.feedbackItems}
          isLoading={feedbackPage.feedbackQuery.isLoading}
          error={feedbackPage.feedbackQuery.error}
          emptyCopy={feedbackPage.groupedEmptyCopy}
          onRequestDelete={feedbackPage.setFeedbackToDelete}
        />
      </div>

      <DeleteFeedbackDialog
        feedback={feedbackPage.feedbackToDelete}
        isDeleting={feedbackPage.deleteFeedbackMutation.isPending}
        onClose={() => feedbackPage.setFeedbackToDelete(null)}
        onConfirm={feedbackPage.handleConfirmDelete}
      />
    </MobilePageLayout>
  );
}
