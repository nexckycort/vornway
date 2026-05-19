import { MobilePageLayout } from '#/components/mobile-page-layout';
import { Button } from '#/components/ui/button';
import { useCreateGroupMutation } from '#/routes/_authed/groups/-hooks/use-create-group';
import { useUserSearchQuery } from '#/routes/_authed/groups/-hooks/use-user-search-query';
import {
  clearGroupDraft,
  type GroupCreateDraft,
  loadGroupDraft,
} from '#/routes/_authed/groups/new/-lib/group-create-draft';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { PlusCircle, UserPlus, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

export const Route = createFileRoute('/_authed/groups/new/participants')({
  validateSearch: (search: Record<string, unknown>) => ({
    name: typeof search.name === 'string' ? search.name : '',
    type: typeof search.type === 'string' ? search.type : '',
    description: typeof search.description === 'string' ? search.description : '',
    draftId: typeof search.draftId === 'string' ? search.draftId : '',
  }),
  component: RouteComponent,
});

type DraftParticipant = {
  name: string;
  userId?: string;
  email?: string;
};

function normalizeText(value: string) {
  return value.trim().toLocaleLowerCase('es-CO');
}

function RouteComponent() {
  const navigate = useNavigate();
  const { name, type, description, draftId } = Route.useSearch();
  const createGroupMutation = useCreateGroupMutation();

  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<GroupCreateDraft | null>(null);
  const [participantInput, setParticipantInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [participants, setParticipants] = useState<DraftParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isSubmitting = createGroupMutation.isPending;
  const isValidGroupData = name.trim().length > 0 && type.trim().length > 0;

  const searchQuery = useUserSearchQuery(debouncedSearch);
  const searchResults = searchQuery.data?.data ?? [];

  const canAddParticipant = participantInput.trim().length > 0;

  const participantsCountLabel = useMemo(() => {
    if (participants.length === 0) return 'Sin participantes extra';
    if (participants.length === 1) return '1 participante agregado';
    return `${participants.length} participantes agregados`;
  }, [participants.length]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!draftId) {
      setDraft(null);
      return;
    }

    setDraft(loadGroupDraft(draftId));
  }, [draftId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(participantInput.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [participantInput]);

  const goBack = async () => {
    await navigate({
      to: '/groups/new',
      search: {
        name,
        type,
        description,
        draftId: draftId || '',
      },
      replace: true,
    });
  };

  const addParticipant = (participant: DraftParticipant) => {
    const normalizedName = participant.name.trim();
    if (!normalizedName) return;

    const alreadyExists = participants.some((current) => {
      if (participant.userId && current.userId) {
        return current.userId === participant.userId;
      }

      return normalizeText(current.name) === normalizeText(normalizedName);
    });

    if (alreadyExists) {
      setParticipantInput('');
      setDebouncedSearch('');
      return;
    }

    setParticipants((previous) => [
      ...previous,
      {
        name: normalizedName,
        ...(participant.userId ? { userId: participant.userId } : {}),
        ...(participant.email ? { email: participant.email } : {}),
      },
    ]);
    setParticipantInput('');
    setDebouncedSearch('');
  };

  const addManualParticipant = () => {
    addParticipant({ name: participantInput });
  };

  const removeParticipant = (index: number) => {
    setParticipants((previous) => previous.filter((_, current) => current !== index));
  };

  const handleCreate = async () => {
    if (!isValidGroupData || isSubmitting) return;

    setError(null);

    try {
      await createGroupMutation.mutateAsync({
        name: draft?.name ?? name,
        type: draft?.type ?? type,
        description: draft?.description ?? description,
        ...(draft?.image
          ? {
              image: {
                dataUrl: draft.image.dataUrl,
                ...(draft.image.fileName
                  ? { fileName: draft.image.fileName }
                  : {}),
              },
            }
          : {}),
        participants: participants.map((participant) => ({
          name: participant.name,
          ...(participant.userId ? { userId: participant.userId } : {}),
        })),
      });
      if (draftId) {
        clearGroupDraft(draftId);
      }
      await navigate({ to: '/groups', replace: true });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo crear el grupo',
      );
    }
  };

  if (!isValidGroupData) {
    return (
      <MobilePageLayout title="Agregar participantes" onBack={goBack}>
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Falta información del grupo. Vuelve al paso anterior.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4 h-11 rounded-2xl"
          onClick={goBack}
        >
          Volver
        </Button>
      </MobilePageLayout>
    );
  }

  return (
    <MobilePageLayout title="Agregar participantes" onBack={goBack}>
      <div className="flex min-h-full flex-col">
        <section className="mb-3 rounded-2xl border border-[#e2e8f0] bg-white p-4">
          <div className="flex items-center gap-3">
            {draft?.image?.dataUrl ? (
              <img
                src={draft.image.dataUrl}
                alt={draft.name}
                className="size-12 rounded-2xl object-cover"
              />
            ) : null}
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-[#0f172a]">
                {draft?.name ?? name}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wide text-[#64748b]">
                {draft?.type ?? type}
              </p>
            </div>
          </div>
        </section>

        <label
          htmlFor="participant-name"
          className="mt-2 block text-sm font-medium text-[#334155]"
        >
          Nombre o correo
        </label>
        <div className="mt-2 flex gap-2">
          <input
            ref={inputRef}
            id="participant-name"
            value={participantInput}
            onChange={(event) => setParticipantInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addManualParticipant();
              }
            }}
            placeholder="Ej: Ana Pérez o ana@correo.com"
            className="h-12 flex-1 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-sm outline-none transition-colors focus:border-primary"
            maxLength={120}
          />
          <Button
            type="button"
            size="icon"
            className="size-12 rounded-2xl"
            onClick={addManualParticipant}
            disabled={!canAddParticipant}
            aria-label="Agregar participante"
          >
            <UserPlus className="size-5" />
          </Button>
        </div>

        <p className="mt-3 text-xs text-[#64748b]">
          Si coincide con un usuario registrado, lo verás debajo con su correo.
          Si no, puedes crearlo solo con el nombre.
        </p>

        {searchQuery.isFetching && debouncedSearch ? (
          <p className="mt-3 text-sm text-[#64748b]">Buscando coincidencias...</p>
        ) : null}

        {debouncedSearch && !searchQuery.isFetching && searchResults.length === 0 ? (
          <p className="mt-3 text-sm text-[#64748b]">
            No encontramos coincidencias. Puedes crearlo manualmente.
          </p>
        ) : null}

        {searchResults.length > 0 ? (
          <section className="mt-3 flex flex-col gap-2">
            {searchResults.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                disabled={candidate.isCurrentUser}
                onClick={() => {
                  if (candidate.isCurrentUser) {
                    return;
                  }

                  addParticipant({
                    name: candidate.name,
                    userId: candidate.id,
                    email: candidate.email,
                  });
                }}
                className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                  candidate.isCurrentUser
                    ? 'cursor-not-allowed border-[#e2e8f0] bg-[#f8fafc] opacity-70'
                    : 'border-[#e2e8f0] bg-white hover:border-primary/40 hover:bg-primary/5'
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
                  <div className="flex shrink-0 flex-col items-end gap-1 text-[11px] text-[#64748b]">
                    {candidate.isCurrentUser ? (
                      <span className="rounded-full bg-[#f8fafc] px-2 py-1">
                        Tú
                      </span>
                    ) : (
                      <span className="rounded-full bg-[#f8fafc] px-2 py-1">
                        Vincular
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </section>
        ) : null}

        <p className="mt-3 text-xs text-[#64748b]">{participantsCountLabel}</p>

        <section className="mt-4 flex flex-col gap-2">
          {participants.map((participant, index) => (
            <div
              key={`${participant.userId ?? participant.name}-${index}`}
              className="flex items-center justify-between rounded-2xl border border-[#e2e8f0] bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#0f172a]">
                  {participant.name}
                </p>
                {participant.email ? (
                  <p className="truncate text-xs text-[#64748b]">
                    {participant.email}
                  </p>
                ) : (
                  <p className="text-xs text-[#64748b]">
                    Se creará manualmente
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeParticipant(index)}
                className="inline-flex size-8 items-center justify-center rounded-full text-[#64748b]"
                aria-label={`Eliminar a ${participant.name}`}
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </section>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="-mx-4 mt-auto border-t border-[#e2e8f0] bg-[#fafafa] px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-full"
              onClick={handleCreate}
              disabled={isSubmitting}
            >
              Omitir
            </Button>
            <Button
              type="button"
              className="h-11 rounded-full"
              onClick={handleCreate}
              disabled={isSubmitting}
            >
              <PlusCircle data-icon="inline-start" />
              {isSubmitting ? 'Creando...' : 'Crear grupo'}
            </Button>
          </div>
        </div>
      </div>
    </MobilePageLayout>
  );
}
