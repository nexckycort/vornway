import { MobilePageLayout } from '#/components/mobile-page-layout';
import { Button } from '#/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '#/components/ui/drawer';
import { useAddMemberMutation } from '#/routes/_authed/groups/-hooks/use-group-actions';
import { useUserSearchQuery } from '#/routes/_authed/groups/-hooks/use-user-search-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, UserPlus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useAddGoalContributionMutation } from '../-hooks/use-add-goal-contribution';
import { useDeleteGoalContributionMutation } from '../-hooks/use-delete-goal-contribution';
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
  const queryClient = useQueryClient();
  const goalQuery = useGoalDetailQuery(id);
  const goal = goalQuery.data;
  const addMemberMutation = useAddMemberMutation(goal?.group.id ?? id);
  const addContributionMutation = useAddGoalContributionMutation(id);
  const deleteContributionMutation = useDeleteGoalContributionMutation(id);
  const participantInputRef = useRef<HTMLInputElement | null>(null);

  const [participantInput, setParticipantInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [showContributionDrawer, setShowContributionDrawer] = useState(false);
  const [showDeleteContributionDrawer, setShowDeleteContributionDrawer] =
    useState(false);
  const [contributionToDelete, setContributionToDelete] = useState<{
    id: string;
    memberName: string;
    amount: number;
    currency: string;
  } | null>(null);
  const [contributionMemberId, setContributionMemberId] = useState('');
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributionDate, setContributionDate] = useState('');
  const [contributionNotes, setContributionNotes] = useState('');

  const searchQuery = useUserSearchQuery(debouncedSearch);
  const searchResults = searchQuery.data?.data ?? [];
  const isAdmin = goal?.myMembership?.role === 'admin';
  const currentMember = goal?.members.find((member) => member.isCurrentUser) ?? null;
  const currentUserIds = useMemo(
    () => new Set(goal?.members.map((member) => member.userId).filter(Boolean)),
    [goal?.members],
  );

  useEffect(() => {
    const node = participantInputRef.current;
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

  useEffect(() => {
    if (!goal) return;
    if (contributionMemberId && goal.members.some((member) => member.id === contributionMemberId)) {
      return;
    }

    setContributionMemberId(currentMember?.id ?? goal.members[0]?.id ?? '');
  }, [contributionMemberId, currentMember?.id, goal]);

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

  const openAddContributionDrawer = () => {
    if (!goal || !isAdmin) return;
    setContributionAmount('');
    setContributionDate('');
    setContributionNotes('');
    setContributionMemberId(currentMember?.id ?? goal.members[0]?.id ?? '');
    setShowContributionDrawer(true);
  };

  const saveContribution = async () => {
    if (
      !goal ||
      !isAdmin ||
      addContributionMutation.isPending ||
      !contributionMemberId
    ) {
      return;
    }

    const amount = Number(contributionAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;

    try {
      await addContributionMutation.mutateAsync({
        memberId: contributionMemberId,
        amount,
        ...(contributionDate ? { contributedAt: new Date(contributionDate) } : {}),
        ...(contributionNotes.trim() ? { notes: contributionNotes.trim() } : {}),
      });
      setShowContributionDrawer(false);
      setMessage('Aporte agregado');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'No se pudo registrar el aporte',
      );
    }
  };

  const openDeleteContribution = (contribution: {
    id: string;
    memberName: string;
    amount: number;
    currency: string;
  }) => {
    if (!isAdmin) return;
    setContributionToDelete(contribution);
    setShowDeleteContributionDrawer(true);
  };

  const confirmDeleteContribution = async () => {
    if (!contributionToDelete || deleteContributionMutation.isPending) return;

    try {
      await deleteContributionMutation.mutateAsync(contributionToDelete.id);
      setShowDeleteContributionDrawer(false);
      setContributionToDelete(null);
      setMessage('Aporte eliminado');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'No se pudo eliminar el aporte',
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

  const contributionsByMember = goal.members.map((member) => {
    const memberContributions = goal.contributions.filter(
      (contribution) => contribution.member.id === member.id,
    );
    const totalAmount = memberContributions.reduce(
      (sum, contribution) => sum + contribution.amount,
      0,
    );

    return {
      member,
      totalAmount,
      count: memberContributions.length,
    };
  });

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

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[#f8fafc] p-3">
              <p className="text-xs text-[#64748b]">Inicio</p>
              <p className="mt-1 text-sm font-medium text-[#0f172a]">
                {formatDate(goal.startDate)}
              </p>
            </div>
            <div className="rounded-2xl bg-[#f8fafc] p-3">
              <p className="text-xs text-[#64748b]">Cuotas</p>
              <p className="mt-1 text-sm font-medium text-[#0f172a]">
                {goal.installmentCount} x {formatMoney(goal.currency, goal.installmentAmount)}
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
              ref={participantInputRef}
              value={participantInput}
              onChange={(event) => {
                const value = event.target.value;
                setParticipantInput(value);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void addParticipant({
                    name: participantInput,
                  });
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
              onClick={() =>
                void addParticipant({
                  name: participantInput,
                })
              }
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

        <section className="rounded-2xl border border-[#e2e8f0] bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[#334155]">
                Aportes por persona
              </p>
              <p className="text-xs text-[#64748b]">
                Control rápido del avance por participante.
              </p>
            </div>
            {isAdmin ? (
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full px-4"
                onClick={openAddContributionDrawer}
              >
                <Plus className="size-4" />
                Aportar
              </Button>
            ) : null}
          </div>

          <div className="grid gap-2">
            {contributionsByMember.map((item) => (
              <div
                key={item.member.id}
                className="rounded-2xl border border-[#e2e8f0] bg-[#fafafa] px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#132238]">
                      {item.member.name}
                      {item.member.isCurrentUser ? (
                        <span className="ml-1 text-xs text-[#94a3b8]">(tú)</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-[#64748b]">
                      {item.count} aporte{item.count === 1 ? '' : 's'}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-[#0f172a]">
                    {formatMoney(goal.currency, item.totalAmount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[#e2e8f0] bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[#334155]">Historial</p>
              <p className="text-xs text-[#64748b]">
                Aportes registrados para esta meta.
              </p>
            </div>
            <span className="text-xs text-[#64748b]">
              {goal.contributions.length} movimientos
            </span>
          </div>

          {goal.contributions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#e2e8f0] bg-[#fafafa] px-4 py-6 text-center text-sm text-[#64748b]">
              Aún no hay aportes.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {goal.contributions.map((contribution) => (
                <article
                  key={contribution.id}
                  className="rounded-2xl border border-[#e2e8f0] bg-white px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#132238]">
                        {contribution.member.name}
                      </p>
                      <p className="text-xs text-[#64748b]">
                        {formatDate(contribution.contributedAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[#0f172a]">
                        {formatMoney(goal.currency, contribution.amount)}
                      </p>
                      {isAdmin ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-9 rounded-full text-red-600"
                          onClick={() =>
                            openDeleteContribution({
                              id: contribution.id,
                              memberName: contribution.member.name,
                              amount: contribution.amount,
                              currency: goal.currency,
                            })
                          }
                          aria-label="Eliminar aporte"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {contribution.notes ? (
                    <p className="mt-2 text-sm text-[#475569]">
                      {contribution.notes}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>

        {message ? (
          <p className="rounded-2xl bg-[#f8fafc] px-4 py-3 text-sm text-[#64748b]">
            {message}
          </p>
        ) : null}
      </div>

      <Drawer
        open={showContributionDrawer}
        onOpenChange={setShowContributionDrawer}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Agregar aporte</DrawerTitle>
            <DrawerDescription>{goal.title}</DrawerDescription>
          </DrawerHeader>

          <div className="space-y-4 px-4 pb-4">
            <div>
              <p className="mb-2 text-sm font-medium text-[#334155]">
                Quién aportó
              </p>
              <div className="grid gap-2">
                {goal.members.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setContributionMemberId(member.id)}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left ${
                      contributionMemberId === member.id
                        ? 'border-primary bg-primary/5'
                        : 'border-[#e2e8f0] bg-white'
                    }`}
                  >
                    {member.image ? (
                      <img
                        src={member.image}
                        alt={member.name}
                        className="size-9 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex size-9 items-center justify-center rounded-full bg-[#f0f0ff] font-semibold text-primary">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#132238]">
                        {member.name}
                      </p>
                      <p className="truncate text-xs text-[#64748b]">
                        {member.email ?? 'Sin cuenta vinculada'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-[#334155]">Monto</span>
                <input
                  value={contributionAmount}
                  onChange={(event) => setContributionAmount(event.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                  className="h-12 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-sm outline-none"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-[#334155]">Fecha</span>
                <input
                  type="date"
                  value={contributionDate}
                  onChange={(event) => setContributionDate(event.target.value)}
                  className="h-12 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-sm outline-none"
                />
              </label>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[#334155]">
                Notas opcionales
              </span>
              <textarea
                value={contributionNotes}
                onChange={(event) => setContributionNotes(event.target.value)}
                rows={3}
                placeholder="Aporte en efectivo, transferencia, etc."
                className="rounded-2xl border border-[#e2e8f0] bg-white px-4 py-3 text-sm outline-none"
              />
            </label>
          </div>

          <DrawerFooter>
            <Button
              type="button"
              className="h-12 rounded-full"
              disabled={
                !contributionMemberId ||
                !contributionAmount.trim() ||
                addContributionMutation.isPending
              }
              onClick={() => void saveContribution()}
            >
              {addContributionMutation.isPending ? 'Guardando...' : 'Guardar aporte'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-full"
              onClick={() => setShowContributionDrawer(false)}
            >
              Cancelar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={showDeleteContributionDrawer}
        onOpenChange={setShowDeleteContributionDrawer}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Eliminar aporte</DrawerTitle>
            <DrawerDescription>
              {contributionToDelete
                ? `${contributionToDelete.memberName} · ${formatMoney(
                    contributionToDelete.currency,
                    contributionToDelete.amount,
                  )}`
                : 'Confirma si deseas eliminar este aporte'}
            </DrawerDescription>
          </DrawerHeader>

          <DrawerFooter>
            <Button
              type="button"
              variant="destructive"
              className="h-12 rounded-full"
              disabled={deleteContributionMutation.isPending}
              onClick={() => void confirmDeleteContribution()}
            >
              {deleteContributionMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-full"
              onClick={() => setShowDeleteContributionDrawer(false)}
            >
              Cancelar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </MobilePageLayout>
  );
}
