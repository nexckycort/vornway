import { MobilePageLayout } from '#/components/mobile-page-layout';
import { Button } from '#/components/ui/button';
import { useUserSearchQuery } from '#/routes/_authed/groups/-hooks/use-user-search-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { UserPlus, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

import { useCreateGoalMutation } from '../-hooks/use-create-goal';

export const Route = createFileRoute('/_authed/goals/new/')({
  component: RouteComponent,
});

type DraftParticipant = {
  name: string;
  userId?: string;
  email?: string | null;
  image?: string | null;
};

function normalizeText(value: string) {
  return value.trim().toLocaleLowerCase('es-CO');
}

function RouteComponent() {
  const navigate = useNavigate();
  const createGoalMutation = useCreateGoalMutation();
  const nameRef = useRef<HTMLInputElement | null>(null);
  const participantRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('COP');
  const [targetAmount, setTargetAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [installmentCount, setInstallmentCount] = useState('12');
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [participantInput, setParticipantInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [participants, setParticipants] = useState<DraftParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);

  const searchQuery = useUserSearchQuery(debouncedSearch);
  const searchResults = searchQuery.data?.data ?? [];

  useEffect(() => {
    const node = nameRef.current;
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

  const canSubmit =
    name.trim().length > 0 &&
    Number(targetAmount) > 0 &&
    startDate.length > 0 &&
    endDate.length > 0 &&
    Number(installmentCount) > 0;

  const canAddParticipant = participantInput.trim().length > 0;

  const participantsCountLabel = useMemo(() => {
    if (participants.length === 0) return 'Sin participantes extra';
    if (participants.length === 1) return '1 participante agregado';
    return `${participants.length} participantes agregados`;
  }, [participants.length]);

  const addParticipant = (participant: DraftParticipant) => {
    const trimmedName = participant.name.trim();
    if (!trimmedName) return;

    const alreadyExists = participants.some((current) => {
      if (participant.userId && current.userId) {
        return current.userId === participant.userId;
      }

      return normalizeText(current.name) === normalizeText(trimmedName);
    });

    if (alreadyExists) {
      setParticipantInput('');
      setDebouncedSearch('');
      return;
    }

    setParticipants((previous) => [
      ...previous,
      {
        name: trimmedName,
        ...(participant.userId ? { userId: participant.userId } : {}),
        ...(participant.email ? { email: participant.email } : {}),
        ...(participant.image ? { image: participant.image } : {}),
      },
    ]);
    setParticipantInput('');
    setDebouncedSearch('');
    participantRef.current?.focus();
  };

  const removeParticipant = (index: number) => {
    setParticipants((previous) => previous.filter((_, current) => current !== index));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || createGoalMutation.isPending) return;

    setError(null);

    try {
      const result = await createGoalMutation.mutateAsync({
        name,
        description,
        currency,
        targetAmount,
        startDate,
        endDate,
        installmentCount,
        installmentAmount,
        participants,
      });

      if (!result?.id) {
        throw new Error('No se pudo crear la meta');
      }

      await navigate({
        to: '/goals/$id',
        params: { id: result.id },
        replace: true,
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo crear la meta',
      );
    }
  };

  return (
    <MobilePageLayout
      title="Crear meta"
      onBack={() => navigate({ to: '/goals', replace: true })}
    >
      <form
        onSubmit={handleSubmit}
        className="flex h-full flex-1 flex-col gap-5 pb-6"
      >
        <div className="space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#64748b]">
              Metas de ahorro
            </p>
            <h1 className="mt-2 text-2xl font-semibold leading-8 text-[#0f172a]">
              Crear meta
            </h1>
            <p className="mt-1 text-sm text-[#64748b]">
              Puedes crearla solo para ti o agregar participantes ahora.
            </p>
          </div>

          <input
            ref={nameRef}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nombre de la meta"
            className="h-12 w-full rounded-2xl border border-[#e2e8f0] bg-white px-4 text-sm outline-none"
          />

          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Descripción opcional"
            rows={3}
            className="w-full rounded-2xl border border-[#e2e8f0] bg-white px-4 py-3 text-sm outline-none"
          />

          <div className="grid grid-cols-2 gap-3">
            <input
              value={targetAmount}
              onChange={(event) => setTargetAmount(event.target.value)}
              inputMode="numeric"
              placeholder="Monto objetivo"
              className="h-12 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-sm outline-none"
            />
            <input
              value={currency}
              onChange={(event) => setCurrency(event.target.value.toUpperCase())}
              placeholder="COP"
              className="h-12 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-sm outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="h-12 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-sm outline-none"
            />
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="h-12 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-sm outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              value={installmentCount}
              onChange={(event) => setInstallmentCount(event.target.value)}
              inputMode="numeric"
              placeholder="Cuotas"
              className="h-12 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-sm outline-none"
            />
            <input
              value={installmentAmount}
              onChange={(event) => setInstallmentAmount(event.target.value)}
              inputMode="numeric"
              placeholder="Cuota opcional"
              className="h-12 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-sm outline-none"
            />
          </div>
        </div>

        <section className="rounded-2xl border border-[#e2e8f0] bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[#334155]">
                Participantes
              </p>
              <p className="text-xs text-[#64748b]">
                Busca por nombre o correo. Si no existe, puedes crearlo manualmente.
              </p>
            </div>
            <span className="text-xs text-[#64748b]">{participantsCountLabel}</span>
          </div>

          <div className="flex gap-2">
            <input
              ref={participantRef}
              value={participantInput}
              onChange={(event) => setParticipantInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addParticipant({ name: participantInput });
                }
              }}
              placeholder="Nombre o correo"
              className="h-12 min-w-0 flex-1 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-sm outline-none"
            />
            <Button
              type="button"
              size="icon"
              className="size-12 rounded-2xl"
              onClick={() => addParticipant({ name: participantInput })}
              disabled={!canAddParticipant}
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
              {searchResults.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  disabled={candidate.isCurrentUser}
                  onClick={() => {
                    if (candidate.isCurrentUser) return;

                    addParticipant({
                      name: candidate.name,
                      userId: candidate.id,
                      email: candidate.email,
                    });
                  }}
                  className={`rounded-2xl border px-4 py-3 text-left ${
                    candidate.isCurrentUser
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
                    {candidate.isCurrentUser ? (
                      <span className="rounded-full bg-[#f8fafc] px-2 py-1 text-[11px] text-[#64748b]">
                        Tú
                      </span>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          ) : null}

          {participants.length > 0 ? (
            <div className="mt-4 flex flex-col gap-2">
              {participants.map((participant, index) => (
                <div
                  key={`${participant.userId ?? participant.name}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[#e2e8f0] bg-[#fafafa] px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#132238]">
                      {participant.name}
                    </p>
                    <p className="truncate text-xs text-[#64748b]">
                      {participant.email ?? 'Participante manual'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 rounded-full"
                    onClick={() => removeParticipant(index)}
                    aria-label={`Eliminar ${participant.name}`}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-auto border-t border-[#e2e8f0] bg-[#fafafa] px-0 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-4">
          <div className="px-0">
            <Button
              type="submit"
              disabled={!canSubmit || createGoalMutation.isPending}
              className="h-14 w-full rounded-full bg-primary text-base font-medium text-white"
            >
              {createGoalMutation.isPending ? 'Creando...' : 'Crear meta'}
            </Button>
          </div>
        </div>
      </form>
    </MobilePageLayout>
  );
}
