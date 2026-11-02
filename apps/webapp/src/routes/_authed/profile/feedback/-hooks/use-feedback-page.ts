import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiSuccess } from '@vornway/api-client';
import { Option, Schema } from 'effect';
import { type ChangeEvent, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { api, withErrorMessage } from '#/api/client';
import { compressImageFileToDataUrl } from '#/lib/image-compression';
import { m } from '#/paraglide/messages.js';
import { getProfileMessages } from '#/routes/_authed/profile/-messages';

export type FeedbackType = 'BUG' | 'FEATURE_REQUEST';
export type FeedbackStatus =
  | 'OPEN'
  | 'IN_REVIEW'
  | 'PLANNED'
  | 'DONE'
  | 'REJECTED';

export type FeedbackItem = ApiSuccess<'feedback', 'list'>['data'][number];

const FeedbackAttachments = Schema.Array(Schema.Struct({ url: Schema.String }));

export const feedbackAttachments = (metadata: FeedbackItem['metadata']) =>
  Option.getOrElse(
    Schema.decodeUnknownOption(FeedbackAttachments)(metadata.attachments),
    () => [],
  );

export type DraftImage = {
  id: string;
  fileName: string;
  previewUrl: string;
  dataUrl: string;
};

export function useFeedbackPage(initialType: FeedbackType) {
  const t = getProfileMessages();
  const queryClient = useQueryClient();
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const [type, setType] = useState<FeedbackType>(initialType);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [draftImages, setDraftImages] = useState<DraftImage[]>([]);
  const [showValidation, setShowValidation] = useState(false);
  const [feedbackToDelete, setFeedbackToDelete] = useState<FeedbackItem | null>(
    null,
  );

  const feedbackQuery = useQuery({
    queryKey: ['user-feedback'],
    queryFn: () =>
      withErrorMessage(
        api.feedback.list.request({ query: { limit: 20 } }),
        m['system.loadFeedbackFailed'](),
      ),
  });

  const createFeedbackMutation = useMutation({
    mutationFn: () =>
      withErrorMessage(
        api.feedback.create.request({
          payload: {
            type,
            title: title.trim(),
            description: description.trim(),
            images: draftImages.map((image) => ({
              dataUrl: image.dataUrl,
            })),
          },
        }),
        m['system.sendFeedbackFailed'](),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user-feedback'] });
      setTitle('');
      setDescription('');
      setDraftImages([]);
      setShowValidation(false);
      toast.success(
        type === 'BUG' ? t.feedback.bugSubmitted : t.feedback.featureSubmitted,
      );
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : m['system.sendFeedbackFailed'](),
      );
    },
  });

  const deleteFeedbackMutation = useMutation({
    mutationFn: async (feedbackId: string) => {
      await withErrorMessage(
        api.feedback.delete.request({ params: { feedbackId } }),
        m['system.deleteFeedbackFailed'](),
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user-feedback'] });
      setFeedbackToDelete(null);
      toast.success(t.feedback.deleted);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : m['system.deleteFeedbackFailed'](),
      );
    },
  });

  const titleError =
    showValidation && title.trim().length === 0
      ? t.feedback.titleRequired
      : undefined;
  const descriptionError =
    showValidation && description.trim().length === 0
      ? type === 'BUG'
        ? t.feedback.bugDescriptionRequired
        : t.feedback.featureDescriptionRequired
      : undefined;
  const canSubmit =
    !createFeedbackMutation.isPending &&
    title.trim().length > 0 &&
    description.trim().length > 0;

  const feedbackItems = feedbackQuery.data?.data ?? [];
  const groupedEmptyCopy = useMemo(() => {
    return type === 'BUG' ? t.feedback.emptyBugs : t.feedback.emptyFeatures;
  }, [type, t.feedback.emptyBugs, t.feedback.emptyFeatures]);

  async function handleDraftImagesChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    try {
      const remainingSlots = Math.max(0, 5 - draftImages.length);
      const filesToProcess = files.slice(0, remainingSlots);

      const nextImages = await Promise.all(
        filesToProcess.map(async (file, index) => {
          const dataUrl = await compressImageFileToDataUrl(file);
          return {
            id: `${file.name}-${Date.now()}-${index}`,
            fileName: file.name,
            previewUrl: dataUrl,
            dataUrl,
          } satisfies DraftImage;
        }),
      );

      setDraftImages((current) => [...current, ...nextImages]);
    } catch {
      toast.error(m['system.processFeedbackImagesFailed']());
    } finally {
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  }

  function handleRemoveDraftImage(imageId: string) {
    setDraftImages((current) =>
      current.filter((image) => image.id !== imageId),
    );
  }

  function handleSubmit() {
    setShowValidation(true);
    if (!canSubmit) return;
    void createFeedbackMutation.mutateAsync();
  }

  function handleConfirmDelete() {
    if (!feedbackToDelete) return;
    void deleteFeedbackMutation.mutateAsync(feedbackToDelete.id);
  }

  return {
    type,
    setType,
    title,
    setTitle,
    description,
    setDescription,
    draftImages,
    imageInputRef,
    feedbackItems,
    feedbackQuery,
    feedbackToDelete,
    setFeedbackToDelete,
    groupedEmptyCopy,
    titleError,
    descriptionError,
    createFeedbackMutation,
    deleteFeedbackMutation,
    handleDraftImagesChange,
    handleRemoveDraftImage,
    handleSubmit,
    handleConfirmDelete,
  };
}
