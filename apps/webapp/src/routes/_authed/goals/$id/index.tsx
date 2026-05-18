import { MobilePageLayout } from '#/components/mobile-page-layout';
import { Button } from '#/components/ui/button';
import { useAddMemberMutation } from '#/routes/_authed/groups/-hooks/use-group-actions';
import { useUserSearchQuery } from '#/routes/_authed/groups/-hooks/use-user-search-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { UserPlus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { useGoalDetailQuery } from '../-hooks/use-goal-detail-query';

export const Route = createFileRoute('/_authed/goals/$id/')({
  component: RouteComponent,
});

function formatMoney(currency: string, amount: number): string {
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

function formatDate(value: string | Date): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function RouteComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const goalQuery = useGoalDetailQuery(id);
  const queryClient = useQueryClient();
  const addMemberMutation = useAddMemberMutation(goalQuery.data?.group.id ?? id);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [participantInput, setParticipantInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const goal = goalQuery.data;
  const searchQuery = useUserSearchQuery(debouncedSearch);
  const searchResults = searchQuery.data?.data ?? [];

  useEffect(() => {
    const node = inputRef.current;
    if (!node) return;

    const frame = window.requestAnimationFrame(() => node.focus());
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(participantInput.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [participantInput]);

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    void navigate({ to: '/goals', replace: true });
  };

  const addParticipant = async (participant: {
    name: string;
    linkedUserId?: string;
  }) => {
    if (!goal || addMemberMutation.isPending) return;

    const trimmedName = participant.name.trim();
    if (!trimmedName) return;

    setMessage(null);

    try {
      await addMemberMutation.mutateAsync({
        name: trimmedName,
        ...(participant.linkedUserId
          ? { linkedUserId: participant.linkedUserId }
          : {}),
      });
      await queryClient.invalidateQueries({ queryKey: ['goal-detail', id] });
      setParticipantInput('');
      setDebouncedSearch('');
      setMessage('Participante agregado');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo agregar el participante',
      );
    }
  };

  if (goalQuery.isLoading) {
    return (
      <MobilePageLayout title="Detalle de meta" onBack={handleBack}>
        <p className="text-sm text-[#64748b]">Cargando meta...</p>
      </MobilePageLayout>
    );
  }

  if (goalQuery.isError || !goal) {
    return (
      <MobilePageLayout title="Detalle de meta" onBack={handleBack}>
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {goalQuery.error instanceof Error
            ? goalQuery.error.message
            : 'No tienes acceso a esta meta'}
        </div>
      </MobilePageLayout>
    );
  }

  const currentUserIds = new Set(
    goal.members.map((member) => member.userId).filter(Boolean),
  );

  return (
    <MobilePageLayout title="Detalle de meta" onBack={handleBack}>
      <div className="flex flex-1 flex-col gap-5">
        <section className="rounded-2xl border border-[#e2e8f0] bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#64748b]">
            {goal.group.type}
          </p>
          <div className="mt-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold leading-8 text-[#0f172a]">
                {goal.title}
              </h1>
              <p className="mt-1 text-sm text-[#64748b]">{goal.group.name}</p>
            </div>
            <div className="rounded-full bg-[#f1f5f9] px-3 py-1 text-[11px] font-medium text-[#475569]">
              Meta
            </div>
          </div>

          {goal.description ? (
            <p className="mt-3 text-sm leading-5 text-[#475569]">
              {goal.description}
            </p>
          ) : null}

          <div className="mt-4 flex items-end justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#0f172a]">
                {formatMoney(goal.currency, goal.savedAmount)}
                <span className="font-normal text-[#64748b]">
                  {' '}
                  / {formatMoney(goal.currency, goal.targetAmount)}
                </span>
              </p>
              <div className="mt-2 h-2 rounded-full bg-[#eef2ff]">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${Math.max(4, goal.progress)}%` }}
                />
              </div>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-xs text-[#64748b]">Cierra</p>
              <p className="text-sm font-medium text-[#0f172a]">
                {formatDate(goal.endDate)}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#e2e8f0] bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[#334155]">Participantes</p>
              <p className="text-xs text-[#64748b]">
                Agrega personas al grupo de la meta.
              </p>
            </div>
            <span className="text-xs text-[#64748b]">
              {goal.participantCount} en total
            </span>
          </div>

          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={participantInput}
              onChange={(event) => setParticipantInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void addParticipant({ name: participantInput });
                }
              }}
              placeholder="Nombre o correo"
              className="h-12 min-w-0 flex-1 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-sm outline-none"
            />
            <Button
              type="button"
              size="icon"
              className="size-12 rounded-2xl"
              disabled={!participantInput.trim() || addMemberMutation.isPending}
              onClick={() => void addParticipant({ name: participantInput })}
              aria-label="Agregar participante"
            >
              <UserPlus className="size-5" />
            </Button>
          </div>

          {searchQuery.isFetching && debouncedSearch ? (
            <p className="mt-3 text-sm text-[#64748b]">Buscando coincidencias...</p>
          ) : null}

          {debouncedSearch &&
          !searchQuery.isFetching &&
          searchResults.length === 0 ? (
            <p className="mt-3 text-sm text-[#64748b]">
              No encontramos coincidencias. Puedes crearlo manualmente.
            </p>
          ) : null}

          {searchResults.length > 0 ? (
            <div className="mt-3 flex flex-col gap-2">
              {searchResults.map((candidate) => {
                const alreadyMember = currentUserIds.has(candidate.id);

                return (
                  <button
                    key={candidate.id}
                    type="button"
                    disabled={candidate.isCurrentUser || alreadyMember}
                    onClick={() => {
                      if (candidate.isCurrentUser || alreadyMember) return;

                      void addParticipant({
                        name: candidate.name,
                        linkedUserId: candidate.id,
                      });
                    }}
                    className={`rounded-2xl border px-4 py-3 text-left ${
                      candidate.isCurrentUser || alreadyMember
                        ? 'cursor-not-allowed border-[#e2e8f0] bg-[#f8fafc] opacity-70'
                        : 'border-[#e2e8f0] bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#132238]">
                          {candidate.name}
                        </p>
                        <p className="truncate text-xs text-[#64748b]">
                          {candidate.email}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 text-[11px] text-[#64748b]">
                        {candidate.isCurrentUser ? (
                          <span className="rounded-full bg-[#f8fafc] px-2 py-1">
                            Tú
                          </span>
                        ) : null}
                        {alreadyMember ? (
                          <span className="rounded-full bg-[#f8fafc] px-2 py-1">
                            Ya agregado
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}

          {goal.members.length > 0 ? (
            <div className="mt-4 flex flex-col gap-2">
              {goal.members.map((member) => (
                <article
                  key={member.id}
                  className="flex items-center gap-3 rounded-2xl border border-[#e2e8f0] bg-[#fafafa] p-4"
                >
                  {member.image ? (
                    <img
                      src={member.image}
                      alt={member.name}
                      className="size-10 shrink-0 rounded-full border border-[#e2e8f0] object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f0f0ff] font-semibold text-primary">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#132238]">
                      {member.name}
                      {member.isCurrentUser ? (
                        <span className="ml-1 text-xs text-[#94a3b8]">(tú)</span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-[#64748b]">
                      {member.email ?? 'Sin cuenta vinculada'}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        {message ? (
          <p className="rounded-2xl bg-[#f8fafc] px-4 py-3 text-sm text-[#64748b]">
            {message}
          </p>
        ) : null}
      </div>
    </MobilePageLayout>
  );
}
