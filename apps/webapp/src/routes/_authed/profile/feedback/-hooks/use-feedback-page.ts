import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ChangeEvent, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { feedbackClient } from '#/api/feedback';
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

export type FeedbackItem = {
  id: string;
  userId: string;
  type: FeedbackType;
  title: string;
  description: string;
  status: FeedbackStatus;
  priority: string | null;
  metadata: {
    attachments?: Array<{
      url: string;
    }>;
  };
  createdAt: string;
  updatedAt: string;
};

type FeedbackListResponse = {
  data: FeedbackItem[];
  pagination: {
    limit: number;
    total: number;
    nextCursor: string | null;
  };
};

export type DraftImage = {
  id: string;
  fileName: string;
  previewUrl: string;
  dataUrl: string;
};

type ErrorPayload = {
  error?: string;
  message?: string;
};

async function readErrorMessage(response: Response, fallback: string) {
  const payload = (await response
    .json()
    .catch(() => null)) as ErrorPayload | null;

  return payload?.message ?? payload?.error ?? fallback;
}

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
    queryFn: async () => {
      const response = await feedbackClient.index.$get({
        query: { limit: '20' },
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, m['system.loadFeedbackFailed']()),
        );
      }

      return (await response.json()) as FeedbackListResponse;
    },
  });

  const createFeedbackMutation = useMutation({
    mutationFn: async () => {
      const response = await feedbackClient.index.$post({
        json: {
          type,
          title: title.trim(),
          description: description.trim(),
          images: draftImages.map((image) => ({
            dataUrl: image.dataUrl,
          })),
        },
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, m['system.sendFeedbackFailed']()),
        );
      }

      return (await response.json()) as FeedbackItem;
    },
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
      const response = await feedbackClient[':feedbackId'].$delete({
        param: { feedbackId },
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, m['system.deleteFeedbackFailed']()),
        );
      }
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
  }, [type]);

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
