import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Copy, PlusCircle, Share2, UserPlus, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MobilePageLayout } from '#/components/mobile-page-layout';
import { Button } from '#/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '#/components/ui/drawer';
import { useNetworkState } from '#/hooks/use-network-state';
import { getGroupFlowEntryState } from '#/lib/group-flow-navigation';
import {
  enqueueGroupOffline,
  syncPendingGroupsQueue,
} from '#/lib/offline-group-query-collection';
import {
  buildCreateGroupPayload,
  type CreateGroupFormValues,
  useCreateGroupMutation,
} from '#/routes/_authed/groups/-hooks/use-create-group';
import { useUserSearchQuery } from '#/routes/_authed/groups/-hooks/use-user-search-query';
import {
  clearGroupDraft,
  type GroupCreateDraft,
  loadGroupDraft,
} from '#/routes/_authed/groups/new/-lib/group-create-draft';

export const Route = createFileRoute('/_authed/groups/new/participants')({
  validateSearch: (search: Record<string, unknown>) => ({
    name: typeof search.name === 'string' ? search.name : '',
    type: typeof search.type === 'string' ? search.type : '',
    description:
      typeof search.description === 'string' ? search.description : '',
    draftId: typeof search.draftId === 'string' ? search.draftId : '',
  }),
  component: RouteComponent,
});

type DraftParticipant = {
  id: string;
  name: string;
  userId?: string;
  username?: string | null;
  email?: string;
};

function createDraftParticipant(
  participant: Omit<DraftParticipant, 'id'>,
): DraftParticipant {
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,
    ...participant,
  };
}

function normalizeText(value: string) {
  return value.trim().toLocaleLowerCase('es-CO');
}

function RouteComponent() {
  const navigate = useNavigate();
  const { name, type, description, draftId } = Route.useSearch();
  const createGroupMutation = useCreateGroupMutation();
  const network = useNetworkState();

  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<GroupCreateDraft | null>(null);
  const [participantInput, setParticipantInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [participants, setParticipants] = useState<DraftParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessDrawer, setShowSuccessDrawer] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [isSavingOffline, setIsSavingOffline] = useState(false);
  const [createdGroup, setCreatedGroup] = useState<{
    id: string;
    name: string;
    inviteCode: string;
  } | null>(null);

  const isSubmitting = createGroupMutation.isPending || isSavingOffline;
  const isValidGroupData = name.trim().length > 0 && type.trim().length > 0;

  const searchQuery = useUserSearchQuery(debouncedSearch);
  const searchResults = searchQuery.data?.data ?? [];

  const canAddParticipant = participantInput.trim().length > 0;

  const participantsCountLabel = useMemo(() => {
    if (participants.length === 0) return 'Sin participantes extra';
    if (participants.length === 1) return '1 participante agregado';
    return `${participants.length} participantes agregados`;
  }, [participants.length]);

  const createdInviteLink = useMemo(() => {
    if (!createdGroup) return '';
    return `https://join.vornway.com/${createdGroup.inviteCode}`;
  }, [createdGroup]);

  useEffect(() => {
    if (!isLinkCopied) return undefined;

    const timeout = window.setTimeout(() => {
      setIsLinkCopied(false);
    }, 1400);

    return () => window.clearTimeout(timeout);
  }, [isLinkCopied]);

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

  const addParticipant = (participant: Omit<DraftParticipant, 'id'>) => {
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
      createDraftParticipant({
        name: normalizedName,
        ...(participant.userId ? { userId: participant.userId } : {}),
        ...(participant.username ? { username: participant.username } : {}),
        ...(participant.email ? { email: participant.email } : {}),
      }),
    ]);
    setParticipantInput('');
    setDebouncedSearch('');
  };

  const addManualParticipant = () => {
    addParticipant({ name: participantInput });
  };

  const removeParticipant = (id: string) => {
    setParticipants((previous) =>
      previous.filter((current) => current.id !== id),
    );
  };

  const handleCreate = async () => {
    if (!isValidGroupData || isSubmitting) return;

    setError(null);

    const groupValues: CreateGroupFormValues = {
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
    };

    if (!network.online) {
      setIsSavingOffline(true);
      try {
        const queuedGroup = enqueueGroupOffline(
          buildCreateGroupPayload(groupValues),
        );
        if (draftId) {
          clearGroupDraft(draftId);
        }
        void syncPendingGroupsQueue();
        await navigate({
          to: '/groups/$id',
          params: { id: queuedGroup.id },
          replace: true,
          state: getGroupFlowEntryState('/groups'),
        });
      } catch (offlineError) {
        setError(
          offlineError instanceof Error
            ? offlineError.message
            : 'No se pudo guardar el espacio sin conexión',
        );
        setIsSavingOffline(false);
      }
      return;
    }

    try {
      const result = await createGroupMutation.mutateAsync(groupValues);
      if (draftId) {
        clearGroupDraft(draftId);
      }
      if ('queued' in result && result.queued) {
        await navigate({
          to: '/groups/$id',
          params: { id: result.id },
          replace: true,
          state: getGroupFlowEntryState('/groups'),
        });
        return;
      }
      setCreatedGroup({
        id: result.id,
        name: result.name,
        inviteCode: result.inviteCode,
      });
      setShowSuccessDrawer(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo crear el espacio',
      );
    }
  };

  if (!isValidGroupData) {
    return (
      <MobilePageLayout title="Agregar participantes" onBack={goBack}>
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Falta información del espacio. Vuelve al paso anterior.
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
      <div className="flex min-h-full min-w-0 flex-col">
        <section className="mb-3 rounded-2xl border border-[#e2e8f0] bg-white p-4">
          <div className="flex items-center gap-3">
            {draft?.image?.dataUrl ? (
              <img
                src={draft.image.dataUrl}
                alt={draft.name}
                className="size-12 rounded-2xl object-cover"
              />
            ) : null}
            <div className="min-w-0 flex-1">
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
          Nombre o usuario
        </label>
        <div className="mt-2 flex min-w-0 gap-2">
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
            placeholder="Ej: Ana Pérez o ana.perez"
            className="h-12 min-w-0 flex-1 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-sm outline-none transition-colors focus:border-primary"
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
          Si coincide con un usuario registrado, lo verás debajo con su nombre
          de usuario. Si no, puedes crearlo solo con el nombre.
        </p>

        {searchQuery.isFetching && debouncedSearch ? (
          <p className="mt-3 text-sm text-[#64748b]">Buscando coincidencias…</p>
        ) : null}

        {debouncedSearch &&
        !searchQuery.isFetching &&
        searchResults.length === 0 ? (
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

                  addParticipant(
                    createDraftParticipant({
                      name: candidate.name,
                      userId: candidate.id,
                      username: candidate.username,
                      email: candidate.email,
                    }),
                  );
                }}
                className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                  candidate.isCurrentUser
                    ? 'cursor-not-allowed border-[#e2e8f0] bg-[#f8fafc] opacity-70'
                    : 'border-[#e2e8f0] bg-white hover:border-primary/40 hover:bg-primary/5'
                }`}
              >
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#132238]">
                      {candidate.name}
                    </p>
                    <p className="truncate text-xs text-[#64748b]">
                      {candidate.username
                        ? `@${candidate.username}`
                        : candidate.email}
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
          {participants.map((participant) => (
            <div
              key={participant.id}
              className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-[#e2e8f0] bg-white px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#0f172a]">
                  {participant.name}
                </p>
                {participant.email ? (
                  <p className="truncate text-xs text-[#64748b]">
                    {participant.username
                      ? `@${participant.username}`
                      : participant.email}
                  </p>
                ) : (
                  <p className="text-xs text-[#64748b]">
                    Se creará manualmente
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeParticipant(participant.id)}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[#64748b]"
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
          <div className="grid min-w-0 grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-11 min-w-0 rounded-full px-3"
              onClick={handleCreate}
              disabled={isSubmitting}
            >
              Omitir
            </Button>
            <Button
              type="button"
              className="h-11 min-w-0 rounded-full px-3"
              onClick={handleCreate}
              disabled={isSubmitting}
            >
              <PlusCircle data-icon="inline-start" />
              {isSubmitting ? 'Creando…' : 'Crear espacio'}
            </Button>
          </div>
        </div>
      </div>

      <Drawer
        open={showSuccessDrawer}
        onOpenChange={(open) => {
          setShowSuccessDrawer(open);
          if (!open) {
            setIsLinkCopied(false);
          }
          if (!open) {
            void navigate({ to: '/groups', replace: true });
          }
        }}
      >
        <DrawerContent className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden rounded-t-[32px] pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          <DrawerHeader className="px-4 pt-3">
            <DrawerTitle className="text-[1.75rem] leading-[1.05] tracking-tight">
              ¡{createdGroup?.name ?? 'Espacio'} creado!
            </DrawerTitle>
            <DrawerDescription className="text-sm leading-6">
              Ya puedes compartir el enlace e invitar a más personas.
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex flex-1 flex-col gap-4 overflow-hidden px-4 pb-4">
            <div className="flex justify-center pt-1">
              <div className="relative h-20 w-28">
                <div className="absolute right-1 top-1 size-[3.75rem] rounded-[24px] bg-primary" />
                <div className="absolute left-2 top-2 size-[4rem] overflow-hidden rounded-[22px] border-[3px] border-white bg-[#f8fafc] shadow-[0_14px_28px_rgba(15,23,42,0.14)]">
                  {draft?.image?.dataUrl ? (
                    <img
                      src={draft.image.dataUrl}
                      alt={createdGroup?.name ?? 'Espacio creado'}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#fff4f7] text-primary">
                      <UserPlus className="size-6" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <p className="text-[1rem] font-semibold text-[#0f172a]">
                Comparte el enlace del espacio
              </p>

              <div className="mt-2 flex items-center gap-3">
                <input
                  readOnly
                  value={createdInviteLink}
                  className="h-11 min-w-0 flex-1 rounded-full border border-[#e2e8f0] bg-[#fafafa] px-4 text-sm text-[#334155] outline-none"
                />

                <Button
                  type="button"
                  variant="outline"
                  className={`h-11 shrink-0 rounded-full px-4 transition-all ${
                    isLinkCopied
                      ? 'scale-105 border-primary bg-primary/10 text-primary'
                      : ''
                  }`}
                  onClick={async () => {
                    await navigator.clipboard.writeText(createdInviteLink);
                    setIsLinkCopied(true);
                  }}
                >
                  <Copy
                    className={`size-4 transition-transform ${
                      isLinkCopied ? 'scale-110' : ''
                    }`}
                  />
                </Button>
              </div>

              <Button
                type="button"
                variant="ghost"
                className="mt-2 h-11 w-full rounded-full border border-[#e2e8f0] text-[#334155]"
                onClick={async () => {
                  if (navigator.share) {
                    await navigator.share({
                      title: createdGroup?.name ?? 'Espacio',
                      text: `Únete a ${createdGroup?.name ?? 'mi espacio'}`,
                      url: createdInviteLink,
                    });
                    return;
                  }

                  await navigator.clipboard.writeText(createdInviteLink);
                }}
              >
                <Share2 className="mr-2 size-4" />
                Compartir enlace
              </Button>
            </div>

            <div className="rounded-[24px] bg-white p-4">
              <p className="text-base font-semibold text-[#0f172a]">
                ¿Qué puedes hacer ahora?
              </p>
              <ul className="mt-2 space-y-1.5 text-sm leading-6 text-[#334155]">
                <li>
                  <span className="font-semibold text-[#0f172a]">Invita</span> a
                  más personas cuando quieras
                </li>
                <li>
                  Comienza a{' '}
                  <span className="font-semibold text-[#0f172a]">
                    registrar gastos
                  </span>{' '}
                  compartidos
                </li>
                <li>
                  <span className="font-semibold text-[#0f172a]">
                    Revisa los balances
                  </span>{' '}
                  en tiempo real
                </li>
              </ul>
            </div>

            <Button
              type="button"
              className="h-12 w-full rounded-full bg-primary text-base font-medium text-white"
              onClick={() => {
                setShowSuccessDrawer(false);
                if (!createdGroup) return;
                void navigate({
                  to: '/groups/$id',
                  params: { id: createdGroup.id },
                  replace: true,
                  state: getGroupFlowEntryState('/groups'),
                });
              }}
              disabled={!createdGroup}
            >
              Ir al espacio
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </MobilePageLayout>
  );
}
