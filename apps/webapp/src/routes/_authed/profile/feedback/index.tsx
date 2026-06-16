import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  AlertCircle,
  Check,
  ImagePlus,
  Lightbulb,
  Loader2,
  Trash2,
  X,
} from 'lucide-react';
import { type ChangeEvent, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { MobilePageLayout } from '#/components/mobile-page-layout';
import { Button } from '#/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog';
import { client } from '#/lib/hc';
import { compressImageFileToDataUrl } from '#/lib/image-compression';

type FeedbackType = 'BUG' | 'FEATURE_REQUEST';
type FeedbackStatus = 'OPEN' | 'IN_REVIEW' | 'PLANNED' | 'DONE' | 'REJECTED';

type FeedbackItem = {
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

type DraftImage = {
  id: string;
  fileName: string;
  previewUrl: string;
  dataUrl: string;
};

const feedbackTypeOptions: Array<{
  value: FeedbackType;
  label: string;
  subtitle: string;
  icon: typeof AlertCircle;
}> = [
  {
    value: 'BUG',
    label: 'Reportar error',
    subtitle: 'Algo no funciona como debería',
    icon: AlertCircle,
  },
  {
    value: 'FEATURE_REQUEST',
    label: 'Pedir funcionalidad',
    subtitle: 'Una mejora o algo nuevo',
    icon: Lightbulb,
  },
];

export const Route = createFileRoute('/_authed/profile/feedback/')({
  validateSearch: (search: Record<string, unknown>) => ({
    type:
      search.type === 'FEATURE_REQUEST' ? 'FEATURE_REQUEST' : ('BUG' as const),
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { type: initialType } = Route.useSearch();
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const [type, setType] = useState<FeedbackType>(
    initialType === 'FEATURE_REQUEST' ? 'FEATURE_REQUEST' : 'BUG',
  );
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
      const response = await client.api.feedback.$get({
        query: { limit: '20' },
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? 'No se pudo cargar el feedback');
      }

      return (await response.json()) as FeedbackListResponse;
    },
  });

  const createFeedbackMutation = useMutation({
    mutationFn: async () => {
      const response = await client.api.feedback.$post({
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
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? 'No se pudo enviar el feedback');
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
        type === 'BUG'
          ? 'Error reportado correctamente'
          : 'Solicitud enviada correctamente',
      );
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudo enviar el feedback',
      );
    },
  });

  const deleteFeedbackMutation = useMutation({
    mutationFn: async (feedbackId: string) => {
      const response = await client.api.feedback[':feedbackId'].$delete({
        param: { feedbackId },
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? 'No se pudo eliminar el reporte');
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user-feedback'] });
      setFeedbackToDelete(null);
      toast.success('Reporte eliminado');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudo eliminar el reporte',
      );
    },
  });

  const titleError =
    showValidation && title.trim().length === 0
      ? 'Agrega un título'
      : undefined;
  const descriptionError =
    showValidation && description.trim().length === 0
      ? type === 'BUG'
        ? 'Describe el error'
        : 'Describe la funcionalidad'
      : undefined;

  const canSubmit =
    !createFeedbackMutation.isPending &&
    title.trim().length > 0 &&
    description.trim().length > 0;

  const feedbackItems = feedbackQuery.data?.data ?? [];

  const groupedEmptyCopy = useMemo(() => {
    return type === 'BUG'
      ? 'Todavía no has reportado errores.'
      : 'Todavía no has pedido funcionalidades.';
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
      toast.error('No se pudieron procesar las imágenes');
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

  return (
    <MobilePageLayout
      title="Feedback"
      onBack={() => {
        void navigate({ to: '/profile' });
      }}
    >
      <div className="space-y-6 px-2 pb-8">
        <section className="space-y-3">
          <div>
            <p className="text-2xl font-semibold tracking-tight text-[#0f172a]">
              Cuéntanos qué pasó
            </p>
            <p className="mt-1 text-sm leading-6 text-[#64748b]">
              Reporta errores o pide funcionalidades nuevas. Puedes adjuntar
              imágenes si ayudan a explicar mejor.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {feedbackTypeOptions.map((option) => {
              const Icon = option.icon;
              const active = option.value === type;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setType(option.value)}
                  className={`flex items-start gap-3 rounded-3xl border px-4 py-4 text-left transition-colors ${
                    active
                      ? 'border-primary bg-primary/5'
                      : 'border-[#e2e8f0] bg-white'
                  }`}
                >
                  <div
                    className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${
                      active
                        ? 'bg-primary text-white'
                        : 'bg-[#f8fafc] text-[#475569]'
                    }`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[#0f172a]">
                        {option.label}
                      </p>
                      {active ? (
                        <span className="flex size-5 items-center justify-center rounded-full bg-primary text-white">
                          <Check className="size-3" />
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-[#64748b]">
                      {option.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-4 rounded-[28px] border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div>
            <label
              htmlFor="feedback-title"
              className="text-sm font-semibold text-[#0f172a]"
            >
              Título
            </label>
            <input
              id="feedback-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={
                type === 'BUG'
                  ? 'Ej: no carga el grupo sin conexión'
                  : 'Ej: filtro por categoría en reportes'
              }
              className={`mt-2 h-12 w-full rounded-2xl border bg-white px-4 text-sm outline-none transition-colors ${
                titleError
                  ? 'border-red-300'
                  : 'border-[#e2e8f0] focus:border-primary'
              }`}
            />
            {titleError ? (
              <p className="mt-2 text-xs font-medium text-red-600">
                {titleError}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="feedback-description"
              className="text-sm font-semibold text-[#0f172a]"
            >
              Descripción
            </label>
            <textarea
              id="feedback-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={
                type === 'BUG'
                  ? 'Explica qué hiciste, qué esperabas y qué pasó.'
                  : 'Explica qué necesitas y por qué te ayudaría.'
              }
              rows={6}
              className={`mt-2 w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none transition-colors ${
                descriptionError
                  ? 'border-red-300'
                  : 'border-[#e2e8f0] focus:border-primary'
              }`}
            />
            {descriptionError ? (
              <p className="mt-2 text-xs font-medium text-red-600">
                {descriptionError}
              </p>
            ) : null}
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[#0f172a]">Imágenes</p>
              <p className="text-xs text-[#64748b]">
                {draftImages.length}/5 adjuntas
              </p>
            </div>

            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleDraftImagesChange}
            />

            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={draftImages.length >= 5}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] text-sm font-medium text-[#475569] disabled:opacity-50"
            >
              <ImagePlus className="size-4" />
              Agregar imágenes
            </button>

            {draftImages.length > 0 ? (
              <div className="mt-3 grid grid-cols-3 gap-3">
                {draftImages.map((image) => (
                  <div
                    key={image.id}
                    className="relative overflow-hidden rounded-2xl border border-[#e2e8f0] bg-[#f8fafc]"
                  >
                    <img
                      src={image.previewUrl}
                      alt={image.fileName}
                      className="aspect-square w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveDraftImage(image.id)}
                      className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/70 text-white"
                      aria-label="Quitar imagen"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={createFeedbackMutation.isPending}
            className="h-12 w-full rounded-full text-sm font-semibold"
          >
            {createFeedbackMutation.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Enviando...
              </>
            ) : type === 'BUG' ? (
              'Enviar error'
            ) : (
              'Enviar funcionalidad'
            )}
          </Button>
        </section>

        <section className="space-y-3">
          <div>
            <p className="text-lg font-semibold text-[#0f172a]">Tus envíos</p>
            <p className="mt-1 text-sm text-[#64748b]">
              Revisa el estado de lo que ya reportaste.
            </p>
          </div>

          {feedbackQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-[24px] border border-[#e2e8f0] bg-white p-4"
                >
                  <div className="h-4 w-32 rounded-full bg-[#e2e8f0]" />
                  <div className="mt-3 h-3 w-full rounded-full bg-[#e2e8f0]" />
                  <div className="mt-2 h-3 w-2/3 rounded-full bg-[#e2e8f0]" />
                </div>
              ))}
            </div>
          ) : feedbackQuery.error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {feedbackQuery.error instanceof Error
                ? feedbackQuery.error.message
                : 'No se pudo cargar el feedback'}
            </div>
          ) : feedbackItems.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[#cbd5e1] bg-white px-4 py-5 text-sm text-[#64748b]">
              {groupedEmptyCopy}
            </div>
          ) : (
            <div className="space-y-3">
              {feedbackItems.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[24px] border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#0f172a]">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs text-[#64748b]">
                        {item.type === 'BUG'
                          ? 'Error reportado'
                          : 'Funcionalidad solicitada'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={item.status} />
                      <button
                        type="button"
                        onClick={() => setFeedbackToDelete(item)}
                        className="flex size-8 items-center justify-center rounded-full border border-[#e2e8f0] bg-white text-[#64748b]"
                        aria-label="Eliminar reporte"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-[#334155]">
                    {item.description}
                  </p>

                  {item.metadata.attachments?.length ? (
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                      {item.metadata.attachments.map((attachment) => (
                        <img
                          key={attachment.url}
                          src={attachment.url}
                          alt={item.title}
                          className="h-20 w-20 shrink-0 rounded-2xl object-cover"
                        />
                      ))}
                    </div>
                  ) : null}

                  <p className="mt-3 text-xs text-[#94a3b8]">
                    {formatDate(item.createdAt)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <Dialog
        open={Boolean(feedbackToDelete)}
        onOpenChange={(open) => {
          if (!open) setFeedbackToDelete(null);
        }}
      >
        <DialogContent className="max-w-[calc(100%-1rem)] rounded-[28px] p-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar reporte</DialogTitle>
            <DialogDescription>
              Se eliminará el reporte y sus imágenes adjuntas.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-12 flex-1 rounded-full"
              onClick={() => setFeedbackToDelete(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="h-12 flex-1 rounded-full bg-destructive text-white hover:bg-destructive/90"
              disabled={deleteFeedbackMutation.isPending || !feedbackToDelete}
              onClick={() => {
                if (!feedbackToDelete) return;
                void deleteFeedbackMutation.mutateAsync(feedbackToDelete.id);
              }}
            >
              {deleteFeedbackMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MobilePageLayout>
  );
}

function StatusBadge({ status }: { status: FeedbackStatus }) {
  const meta = getStatusMeta(status);

  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{
        backgroundColor: meta.background,
        color: meta.color,
      }}
    >
      {meta.label}
    </span>
  );
}

function getStatusMeta(status: FeedbackStatus) {
  switch (status) {
    case 'IN_REVIEW':
      return {
        label: 'En revisión',
        background: '#fef3c7',
        color: '#b45309',
      };
    case 'PLANNED':
      return {
        label: 'Planeado',
        background: '#dbeafe',
        color: '#1d4ed8',
      };
    case 'DONE':
      return {
        label: 'Hecho',
        background: '#dcfce7',
        color: '#15803d',
      };
    case 'REJECTED':
      return {
        label: 'Descartado',
        background: '#fee2e2',
        color: '#b91c1c',
      };
    default:
      return {
        label: 'Abierto',
        background: '#e2e8f0',
        color: '#475569',
      };
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
