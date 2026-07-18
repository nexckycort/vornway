import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  CircleDashed,
  Clock3,
  FolderKanban,
  SearchCheck,
} from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { adminClient } from '#/api/admin';
import { Button } from '#/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog';
import { useAuth } from '#/contexts/auth/use-auth';

type FeedbackStatus = 'OPEN' | 'IN_REVIEW' | 'PLANNED' | 'DONE' | 'REJECTED';

type AdminFeedbackItem = {
  id: string;
  userId: string;
  type: 'BUG' | 'FEATURE_REQUEST';
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
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
};

type AdminFeedbackResponse = {
  data: AdminFeedbackItem[];
  pagination: {
    limit: number;
    total: number;
    nextCursor: string | null;
  };
};

const ALLOWED_EMAIL = 'junior110120@gmail.com';
const statusOptions: FeedbackStatus[] = [
  'OPEN',
  'IN_REVIEW',
  'PLANNED',
  'DONE',
  'REJECTED',
];

export const Route = createFileRoute('/_authed/profile/stats/feedback/')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const email = auth.user?.email?.trim().toLowerCase() ?? '';
  const isAllowed = email === ALLOWED_EMAIL;
  const [selectedFeedback, setSelectedFeedback] =
    useState<AdminFeedbackItem | null>(null);
  const [draftPriority, setDraftPriority] = useState('');

  const feedbackQuery = useQuery({
    queryKey: ['admin-feedback'],
    enabled: isAllowed,
    queryFn: async () => {
      const response = await adminClient.feedback.$get({
        query: { limit: '50' },
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? 'No se pudo cargar el feedback');
      }

      return (await response.json()) as AdminFeedbackResponse;
    },
  });

  const updateFeedbackMutation = useMutation({
    mutationFn: async (input: {
      feedbackId: string;
      status?: FeedbackStatus;
      priority?: string | null;
    }) => {
      const response = await adminClient.feedback[':feedbackId'].$patch({
        param: { feedbackId: input.feedbackId },
        json: {
          ...(input.status ? { status: input.status } : {}),
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
        },
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? 'No se pudo actualizar el feedback');
      }

      return (await response.json()) as AdminFeedbackItem;
    },
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ['admin-feedback'] });
      setSelectedFeedback(updated);
      setDraftPriority(updated.priority ?? '');
      toast.success('Feedback actualizado');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar el feedback',
      );
    },
  });

  const feedbackItems = feedbackQuery.data?.data ?? [];
  const counters = useMemo(() => {
    return {
      total: feedbackItems.length,
      open: feedbackItems.filter((item) => item.status === 'OPEN').length,
      inReview: feedbackItems.filter((item) => item.status === 'IN_REVIEW')
        .length,
      planned: feedbackItems.filter((item) => item.status === 'PLANNED').length,
    };
  }, [feedbackItems]);

  if (!isAllowed) {
    return (
      <main className="min-h-screen bg-[#fafafa] px-4 pt-6 text-foreground">
        <div className="mx-auto flex min-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col justify-center">
          <div className="rounded-[28px] border border-[#e2e8f0] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <h1 className="text-2xl font-semibold text-[#0f172a]">Feedback</h1>
            <p className="mt-2 text-sm leading-6 text-[#64748b]">
              No tienes acceso a esta vista.
            </p>
            <Button
              type="button"
              className="mt-5 h-12 w-full rounded-full"
              onClick={() => navigate({ to: '/profile' })}
            >
              <ArrowLeft className="mr-2 size-4" />
              Volver al perfil
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fafafa] px-4 pt-6 text-foreground">
      <div className="mx-auto flex min-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col pb-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[#94a3b8]">
              Admin
            </p>
            <h1 className="mt-2 text-3xl font-semibold leading-9 text-[#0f172a]">
              Feedback
            </h1>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="rounded-full bg-white"
            onClick={() => navigate({ to: '/profile/stats' })}
            aria-label="Volver"
          >
            <ArrowLeft className="size-4" />
          </Button>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-3">
          <MiniStatCard
            icon={<FolderKanban className="size-4" />}
            label="Total"
            value={String(counters.total)}
          />
          <MiniStatCard
            icon={<CircleDashed className="size-4" />}
            label="Abiertos"
            value={String(counters.open)}
          />
          <MiniStatCard
            icon={<SearchCheck className="size-4" />}
            label="Revisión"
            value={String(counters.inReview)}
          />
          <MiniStatCard
            icon={<Clock3 className="size-4" />}
            label="Planeados"
            value={String(counters.planned)}
          />
        </section>

        <section className="mt-5 space-y-3">
          {feedbackQuery.isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-[24px] border border-[#e2e8f0] bg-white p-4"
              >
                <div className="h-4 w-36 rounded-full bg-[#e2e8f0]" />
                <div className="mt-3 h-3 w-full rounded-full bg-[#e2e8f0]" />
                <div className="mt-2 h-3 w-2/3 rounded-full bg-[#e2e8f0]" />
              </div>
            ))
          ) : feedbackQuery.error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {feedbackQuery.error instanceof Error
                ? feedbackQuery.error.message
                : 'No se pudo cargar el feedback'}
            </div>
          ) : feedbackItems.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[#cbd5e1] bg-white px-4 py-5 text-sm text-[#64748b]">
              No hay feedback todavía.
            </div>
          ) : (
            feedbackItems.map((item) => (
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
                      {item.user.name} · {item.user.email}
                    </p>
                  </div>
                  <AdminStatusBadge status={item.status} />
                </div>

                <p className="mt-3 text-sm leading-6 text-[#334155]">
                  {item.description}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#f8fafc] px-2.5 py-1 text-[11px] font-semibold text-[#475569]">
                    {item.type === 'BUG' ? 'Bug' : 'Feature'}
                  </span>
                  {item.priority ? (
                    <span className="rounded-full bg-[#fff7ed] px-2.5 py-1 text-[11px] font-semibold text-[#c2410c]">
                      {item.priority}
                    </span>
                  ) : null}
                </div>

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

                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-xs text-[#94a3b8]">
                    {formatDate(item.createdAt)}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-full px-4"
                    onClick={() => {
                      setSelectedFeedback(item);
                      setDraftPriority(item.priority ?? '');
                    }}
                  >
                    Gestionar
                  </Button>
                </div>
              </article>
            ))
          )}
        </section>

        <Dialog
          open={Boolean(selectedFeedback)}
          onOpenChange={(open) => {
            if (!open) setSelectedFeedback(null);
          }}
        >
          <DialogContent className="max-w-[calc(100%-1rem)] rounded-[28px] p-4 sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Gestionar feedback</DialogTitle>
              <DialogDescription>
                Cambia el estado o la prioridad del reporte.
              </DialogDescription>
            </DialogHeader>

            {selectedFeedback ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
                  <p className="text-sm font-semibold text-[#0f172a]">
                    {selectedFeedback.title}
                  </p>
                  <p className="mt-1 text-xs text-[#64748b]">
                    {selectedFeedback.user.name}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-[#0f172a]">Estado</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {statusOptions.map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() =>
                          void updateFeedbackMutation.mutateAsync({
                            feedbackId: selectedFeedback.id,
                            status,
                          })
                        }
                        disabled={updateFeedbackMutation.isPending}
                        className={`rounded-full px-3 py-2 text-xs font-semibold ${
                          selectedFeedback.status === status
                            ? 'bg-primary text-white'
                            : 'border border-[#e2e8f0] bg-white text-[#475569]'
                        }`}
                      >
                        {getAdminStatusMeta(status).label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="feedback-priority"
                    className="text-sm font-semibold text-[#0f172a]"
                  >
                    Prioridad
                  </label>
                  <input
                    id="feedback-priority"
                    value={draftPriority}
                    onChange={(event) => setDraftPriority(event.target.value)}
                    placeholder="Ej: alta, media, baja"
                    className="mt-2 h-12 w-full rounded-2xl border border-[#e2e8f0] bg-white px-4 text-sm outline-none focus:border-primary"
                  />
                  <div className="mt-3 flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 flex-1 rounded-full"
                      onClick={() => {
                        setDraftPriority(selectedFeedback.priority ?? '');
                      }}
                    >
                      Restaurar
                    </Button>
                    <Button
                      type="button"
                      className="h-11 flex-1 rounded-full"
                      disabled={updateFeedbackMutation.isPending}
                      onClick={() =>
                        void updateFeedbackMutation.mutateAsync({
                          feedbackId: selectedFeedback.id,
                          priority: draftPriority.trim() || null,
                        })
                      }
                    >
                      {updateFeedbackMutation.isPending
                        ? 'Guardando...'
                        : 'Guardar'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}

function MiniStatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex size-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[#94a3b8]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-[#0f172a]">{value}</p>
    </div>
  );
}

function AdminStatusBadge({ status }: { status: FeedbackStatus }) {
  const meta = getAdminStatusMeta(status);

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

function getAdminStatusMeta(status: FeedbackStatus) {
  switch (status) {
    case 'IN_REVIEW':
      return { label: 'En revisión', background: '#fef3c7', color: '#b45309' };
    case 'PLANNED':
      return { label: 'Planeado', background: '#dbeafe', color: '#1d4ed8' };
    case 'DONE':
      return { label: 'Hecho', background: '#dcfce7', color: '#15803d' };
    case 'REJECTED':
      return { label: 'Descartado', background: '#fee2e2', color: '#b91c1c' };
    default:
      return { label: 'Abierto', background: '#e2e8f0', color: '#475569' };
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
