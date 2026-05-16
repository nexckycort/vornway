import { ArrowLeft, PlusCircle, UserPlus, X } from 'lucide-react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';

import { Button } from '#/components/ui/button';
import { useCreateGroupMutation } from '#/routes/_authed/groups/-hooks/use-create-group';

export const Route = createFileRoute('/_authed/groups/new/participants')({
  validateSearch: (search: Record<string, unknown>) => ({
    name: typeof search.name === 'string' ? search.name : '',
    type: typeof search.type === 'string' ? search.type : '',
    description: typeof search.description === 'string' ? search.description : '',
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { name, type, description } = Route.useSearch();
  const createGroupMutation = useCreateGroupMutation();

  const [participantInput, setParticipantInput] = useState('');
  const [participants, setParticipants] = useState<Array<{ name: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const isSubmitting = createGroupMutation.isPending;
  const isValidGroupData = name.trim().length > 0 && type.trim().length > 0;

  const canAddParticipant = participantInput.trim().length > 0;
  const participantsCountLabel = useMemo(() => {
    if (participants.length === 0) return 'Sin participantes extra';
    if (participants.length === 1) return '1 participante agregado';
    return `${participants.length} participantes agregados`;
  }, [participants.length]);

  const goBack = async () => {
    await navigate({
      to: '/groups/new',
      search: {
        name,
        type,
        description,
      },
    });
  };

  const addParticipant = () => {
    const normalizedName = participantInput.trim();
    if (!normalizedName) return;

    const alreadyExists = participants.some(
      (participant) =>
        participant.name.toLocaleLowerCase('es-CO') ===
        normalizedName.toLocaleLowerCase('es-CO'),
    );
    if (alreadyExists) {
      setParticipantInput('');
      return;
    }

    setParticipants((previous) => [...previous, { name: normalizedName }]);
    setParticipantInput('');
  };

  const removeParticipant = (index: number) => {
    setParticipants((previous) => previous.filter((_, current) => current !== index));
  };

  const handleCreate = async () => {
    if (!isValidGroupData || isSubmitting) return;

    setError(null);

    try {
      await createGroupMutation.mutateAsync({
        name,
        type,
        description,
        participants,
      });
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
      <main className="min-h-screen bg-[#efefef] text-foreground">
        <div className="mx-auto flex min-h-screen w-full max-w-[412px] flex-col bg-[#fafafa] px-4 pb-10 pt-8">
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
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#efefef] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[412px] flex-col bg-[#fafafa] px-4 pb-0 pt-8">
        <header className="mb-6">
          <button
            type="button"
            onClick={goBack}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[#334155]"
          >
            <ArrowLeft className="size-4" />
            Atrás
          </button>
          <h1 className="text-2xl font-semibold leading-8 text-[#0f172a]">
            Agregar participantes
          </h1>
          <p className="mt-1 text-sm text-[#64748b]">
            Opcional. Puedes crearlo solo para ti y agregar personas luego.
          </p>
        </header>

        <div className="flex flex-1 flex-col">
          <div className="mb-2 rounded-2xl border border-[#e2e8f0] bg-white p-4">
            <p className="truncate text-base font-semibold text-[#0f172a]">{name}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-[#64748b]">{type}</p>
          </div>

          <label
            htmlFor="participant-name"
            className="mt-4 block text-sm font-medium text-[#334155]"
          >
            Nombre del participante
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="participant-name"
              value={participantInput}
              onChange={(event) => setParticipantInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addParticipant();
                }
              }}
              placeholder="Ej: Ana Pérez"
              className="h-12 flex-1 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-sm outline-none transition-colors focus:border-primary"
              maxLength={120}
            />
            <Button
              type="button"
              size="icon"
              className="size-12 rounded-2xl"
              onClick={addParticipant}
              disabled={!canAddParticipant}
              aria-label="Agregar participante"
            >
              <UserPlus className="size-5" />
            </Button>
          </div>

          <p className="mt-3 text-xs text-[#64748b]">{participantsCountLabel}</p>

          <div className="mt-4 flex flex-col gap-2">
            {participants.map((participant, index) => (
              <div
                key={`${participant.name}-${index}`}
                className="flex items-center justify-between rounded-2xl border border-[#e2e8f0] bg-white px-4 py-3"
              >
                <span className="text-sm text-[#0f172a]">{participant.name}</span>
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
          </div>

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
      </div>
    </main>
  );
}
