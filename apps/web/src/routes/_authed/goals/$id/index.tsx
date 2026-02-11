/** biome-ignore-all lint/a11y/useButtonType: <explanation> */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  Copy,
  Link,
  Plus,
  Share2,
  Target,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { addGoalContribution } from '../../groups/$id/goals/-actions/add-goal-contribution';
import { createGoal } from '../../groups/$id/goals/-actions/create-goal';
import { deleteGoal } from '../../groups/$id/goals/-actions/delete-goal';
import { getGoals } from '../../groups/$id/goals/-actions/get-goals';
import { removeGoalMember } from '../../groups/$id/goals/-actions/remove-goal-member';
import { updateGoalMemberRole } from '../../groups/$id/goals/-actions/update-goal-member-role';

export const Route = createFileRoute('/_authed/goals/$id/')({
  component: RouteComponent,
});

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

function RouteComponent() {
  const { id } = Route.useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [showDeleteGoalModal, setShowDeleteGoalModal] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currency, setCurrency] = useState('COP');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [installmentCount, setInstallmentCount] = useState('12');
  const [installmentAmount, setInstallmentAmount] = useState('');

  const [memberId, setMemberId] = useState('');
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributedAt, setContributedAt] = useState('');
  const [contributionNotes, setContributionNotes] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['goal-space', id],
    queryFn: () => getGoals({ data: { groupId: id } }),
  });

  const createGoalMutation = useMutation({
    mutationFn: createGoal,
    onSuccess: (result) => {
      if (!result.success) return;
      queryClient.invalidateQueries({ queryKey: ['goal-space', id] });
      queryClient.invalidateQueries({ queryKey: ['user-goals'] });
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setTargetAmount('');
      setCurrency('COP');
      setStartDate('');
      setEndDate('');
      setInstallmentCount('12');
      setInstallmentAmount('');
    },
  });

  const addContributionMutation = useMutation({
    mutationFn: addGoalContribution,
    onSuccess: (result) => {
      if (!result.success) return;
      queryClient.invalidateQueries({ queryKey: ['goal-space', id] });
      queryClient.invalidateQueries({ queryKey: ['user-goals'] });
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
      setShowContributionModal(false);
      setSelectedGoalId('');
      setMemberId('');
      setContributionAmount('');
      setContributedAt('');
      setContributionNotes('');
    },
  });
  const deleteGoalMutation = useMutation({
    mutationFn: deleteGoal,
    onSuccess: (result) => {
      if (!result.success) return;
      queryClient.invalidateQueries({ queryKey: ['goal-space', id] });
      queryClient.invalidateQueries({ queryKey: ['user-goals'] });
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
      setShowDeleteGoalModal(false);
      setSelectedGoalId('');
    },
  });
  const updateGoalMemberRoleMutation = useMutation({
    mutationFn: updateGoalMemberRole,
    onSuccess: (result) => {
      if (!result.success) return;
      queryClient.invalidateQueries({ queryKey: ['goal-space', id] });
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
    },
  });
  const removeGoalMemberMutation = useMutation({
    mutationFn: removeGoalMember,
    onSuccess: (result) => {
      if (!result.success) return;
      queryClient.invalidateQueries({ queryKey: ['goal-space', id] });
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
    },
  });

  const selectedGoal = useMemo(
    () => data?.goals.find((goal) => goal.id === selectedGoalId) ?? null,
    [data?.goals, selectedGoalId],
  );
  const inviteLink = data?.inviteCode
    ? `${window.location.origin}/join/${data.inviteCode}`
    : '';
  const isCurrentUserAdmin = data?.isCurrentUserAdmin ?? false;

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      console.error('Error copying invite link:', error);
    }
  };

  const handleCopyCode = async () => {
    if (!data?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(data.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      console.error('Error copying invite code:', error);
    }
  };

  const handleToggleAdminRole = (
    memberId: string,
    nextRole: 'admin' | 'member',
  ) => {
    if (updateGoalMemberRoleMutation.isPending) return;
    updateGoalMemberRoleMutation.mutate({
      data: {
        groupId: id,
        memberId,
        role: nextRole,
      },
    });
  };

  const handleRemoveParticipant = (memberId: string, memberName: string) => {
    if (removeGoalMemberMutation.isPending) return;
    const shouldRemove = window.confirm(
      `¿Eliminar a ${memberName} de la meta? Esta acción no se puede deshacer.`,
    );
    if (!shouldRemove) return;

    removeGoalMemberMutation.mutate({
      data: {
        groupId: id,
        memberId,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f3fa] flex items-center justify-center">
        <p className="text-gray-500">Cargando metas...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#f5f3fa] flex flex-col items-center justify-center p-6">
        <p className="text-gray-500 mb-6">
          {error instanceof Error ? error.message : 'No se pudo cargar'}
        </p>
        <button
          type="button"
          onClick={() => router.navigate({ to: '/goals' })}
          className="px-6 py-3 bg-[#4040b0] text-white rounded-xl"
        >
          Volver a metas
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f3fa] pb-8">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.navigate({ to: '/' })}
              className="w-10 h-10 flex items-center justify-center"
            >
              <ChevronLeft className="w-6 h-6 text-[#1a1a3e]" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-[#1a1a3e]">Meta</h1>
              <p className="text-sm text-gray-500">{data.groupName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowParticipantsModal(true)}
              className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center"
              aria-label="Participantes"
            >
              <Users className="w-5 h-5 text-[#1a1a3e]" />
            </button>
            <button
              type="button"
              onClick={() => setShowInviteModal(true)}
              className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center"
              aria-label="Compartir meta"
            >
              <Share2 className="w-5 h-5 text-[#1a1a3e]" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 pb-3">
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="w-full py-3.5 rounded-2xl bg-[#4040b0] text-white font-medium flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Añadir objetivo
        </button>
        {!isCurrentUserAdmin ? (
          <p className="text-xs text-gray-500 mt-2">
            Solo los admin pueden registrar aportes y administrar participantes.
          </p>
        ) : null}
      </div>

      <div className="px-4 space-y-4">
        {data.goals.length === 0 ? (
          <div className="bg-white rounded-3xl p-6 text-center">
            <p className="text-[#1a1a3e] font-semibold mb-2">
              No hay objetivos creados
            </p>
            <p className="text-gray-500 text-sm">
              Crea el primer objetivo de esta meta.
            </p>
          </div>
        ) : (
          data.goals.map((goal) => {
            const contributionsByMember = data.members.map((member) => {
              const memberTotal = goal.contributions.reduce(
                (sum, contribution) => {
                  if (contribution.member.id !== member.id) return sum;
                  return sum + contribution.amount;
                },
                0,
              );
              const quotaEquivalent =
                goal.installmentAmount > 0
                  ? memberTotal / goal.installmentAmount
                  : 0;

              return {
                memberId: member.id,
                memberName: member.name,
                totalAmount: memberTotal,
                totalQuotas: quotaEquivalent,
              };
            });

            return (
              <article
                key={goal.id}
                className="bg-white rounded-3xl p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h2 className="text-lg font-semibold text-[#1a1a3e]">
                      {goal.title}
                    </h2>
                    {goal.description ? (
                      <p className="text-sm text-gray-500 mt-1">
                        {goal.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {isCurrentUserAdmin ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGoalId(goal.id);
                          setMemberId('');
                          setContributionAmount('');
                          setContributedAt('');
                          setContributionNotes('');
                          setShowContributionModal(true);
                        }}
                        className="px-3 py-2 rounded-xl bg-[#eef0ff] text-[#4040b0] text-sm font-medium"
                      >
                        Aportar
                      </button>
                    ) : null}
                    {goal.canDelete && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGoalId(goal.id);
                          setShowDeleteGoalModal(true);
                        }}
                        className="px-3 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-medium"
                      >
                        <span className="inline-flex items-center gap-1">
                          <Trash2 className="w-4 h-4" />
                          Borrar
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="rounded-2xl bg-gray-50 p-3">
                    <p className="text-xs text-gray-500 mb-1">Meta</p>
                    <p className="font-semibold text-[#1a1a3e]">
                      ${formatCurrency(goal.targetAmount)} {goal.currency}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-3">
                    <p className="text-xs text-gray-500 mb-1">Recaudado</p>
                    <p className="font-semibold text-[#1a1a3e]">
                      ${formatCurrency(goal.totalContributed)} {goal.currency}
                    </p>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <p className="text-gray-500">Progreso</p>
                    <p className="font-medium text-[#1a1a3e]">
                      {goal.progressPct.toFixed(1)}%
                    </p>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full bg-[#4040b0]"
                      style={{ width: `${goal.progressPct}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-2xl bg-[#f7f7fb] p-3 mb-3 text-sm">
                  <div className="flex items-center gap-2 text-[#1a1a3e] mb-1">
                    <CalendarDays className="w-4 h-4" />
                    <p>
                      {formatDate(goal.startDate)} - {formatDate(goal.endDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[#1a1a3e]">
                    <Target className="w-4 h-4" />
                    <p>
                      {goal.installmentCount} cuotas mensuales de $
                      {formatCurrency(goal.installmentAmount)} {goal.currency}
                    </p>
                  </div>
                  <p className="text-gray-500 mt-2">
                    Esperado a hoy: ${formatCurrency(goal.expectedByNow)}{' '}
                    {goal.currency}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-[#1a1a3e] mb-2">
                    Aportes por persona
                  </p>
                  <div className="space-y-2 mb-4">
                    {contributionsByMember.map((memberContribution) => (
                      <div
                        key={memberContribution.memberId}
                        className="rounded-xl border border-gray-100 px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-[#1a1a3e]">
                            {memberContribution.memberName}
                          </p>
                          <p className="text-sm font-semibold text-[#1a1a3e]">
                            ${formatCurrency(memberContribution.totalAmount)}{' '}
                            {goal.currency}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500">
                          {memberContribution.totalQuotas.toFixed(2)} cuotas
                        </p>
                      </div>
                    ))}
                  </div>

                  <p className="text-sm font-medium text-[#1a1a3e] mb-2">
                    Todos los aportes
                  </p>
                  {goal.contributions.length === 0 ? (
                    <p className="text-sm text-gray-500">Sin aportes aún</p>
                  ) : (
                    <div className="space-y-2">
                      {goal.contributions.map((contribution) => {
                        const quotaEquivalent =
                          goal.installmentAmount > 0
                            ? contribution.amount / goal.installmentAmount
                            : 0;

                        return (
                          <div
                            key={contribution.id}
                            className="rounded-xl border border-gray-100 px-3 py-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm text-[#1a1a3e]">
                                <span className="font-medium">
                                  {contribution.member.name}
                                </span>{' '}
                                aportó
                              </p>
                              <p className="text-sm font-semibold text-[#1a1a3e]">
                                ${formatCurrency(contribution.amount)}{' '}
                                {goal.currency}
                              </p>
                            </div>
                            <p className="text-xs text-gray-500">
                              {formatDate(contribution.contributedAt)} ·{' '}
                              {quotaEquivalent.toFixed(2)} cuotas
                            </p>
                            {contribution.notes ? (
                              <p className="text-xs text-gray-500 mt-1">
                                {contribution.notes}
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>

      {showCreateModal && (
        <>
          <button
            type="button"
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setShowCreateModal(false)}
            aria-label="Cerrar modal"
          />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 max-h-[88vh] overflow-y-auto">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>
            <div className="px-6 pb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#1a1a3e]">
                  Nuevo objetivo
                </h2>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Nombre del objetivo"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                />
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Descripción (opcional)"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl min-h-[88px]"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={targetAmount}
                    onChange={(event) => setTargetAmount(event.target.value)}
                    placeholder="Monto meta"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                  />
                  <input
                    type="text"
                    value={currency}
                    onChange={(event) =>
                      setCurrency(event.target.value.toUpperCase())
                    }
                    placeholder="Moneda"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                  />
                </div>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={installmentCount}
                  onChange={(event) => setInstallmentCount(event.target.value)}
                  placeholder="Número de cuotas"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                />
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={installmentAmount}
                  onChange={(event) => setInstallmentAmount(event.target.value)}
                  placeholder="Monto cuota mensual (opcional)"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                />
              </div>
              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 text-[#1a1a3e] font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() =>
                    createGoalMutation.mutate({
                      data: {
                        groupId: id,
                        title,
                        description,
                        targetAmount: Number(targetAmount),
                        currency,
                        startDate:
                          startDate || new Date().toISOString().slice(0, 10),
                        endDate:
                          endDate || new Date().toISOString().slice(0, 10),
                        installmentCount: Number(installmentCount),
                        installmentAmount:
                          installmentAmount.trim() === ''
                            ? undefined
                            : Number(installmentAmount),
                      },
                    })
                  }
                  disabled={
                    createGoalMutation.isPending ||
                    !title.trim() ||
                    Number(targetAmount) <= 0 ||
                    !currency.trim() ||
                    Number(installmentCount) <= 0 ||
                    !startDate ||
                    !endDate
                  }
                  className="flex-1 py-3 bg-[#4040b0] text-white font-medium rounded-xl disabled:opacity-60"
                >
                  {createGoalMutation.isPending
                    ? 'Creando...'
                    : 'Crear objetivo'}
                </button>
              </div>
              {createGoalMutation.data?.error ? (
                <p className="text-red-500 text-sm mt-3">
                  {createGoalMutation.data.error}
                </p>
              ) : null}
            </div>
          </div>
        </>
      )}

      {showContributionModal && selectedGoal && (
        <>
          <button
            type="button"
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setShowContributionModal(false)}
            aria-label="Cerrar modal"
          />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 max-h-[88vh] overflow-y-auto">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>
            <div className="px-6 pb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#1a1a3e]">
                  Registrar aporte
                </h2>
                <button
                  type="button"
                  onClick={() => setShowContributionModal(false)}
                  className="w-8 h-8 flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-3">{selectedGoal.title}</p>
              <div className="space-y-3">
                <select
                  value={memberId}
                  onChange={(event) => setMemberId(event.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                >
                  <option value="">Selecciona quién aportó</option>
                  {data.members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                      {member.isCurrentUser ? ' (Tú)' : ''}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={contributionAmount}
                  onChange={(event) =>
                    setContributionAmount(event.target.value)
                  }
                  placeholder={`Monto (${selectedGoal.currency})`}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                />
                <input
                  type="date"
                  value={contributedAt}
                  onChange={(event) => setContributedAt(event.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                />
                <textarea
                  value={contributionNotes}
                  onChange={(event) => setContributionNotes(event.target.value)}
                  placeholder="Nota (opcional)"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl min-h-[88px]"
                />
              </div>
              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => setShowContributionModal(false)}
                  className="flex-1 py-3 text-[#1a1a3e] font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() =>
                    addContributionMutation.mutate({
                      data: {
                        groupId: id,
                        goalId: selectedGoal.id,
                        memberId,
                        amount: Number(contributionAmount),
                        contributedAt: contributedAt || undefined,
                        notes: contributionNotes,
                      },
                    })
                  }
                  disabled={
                    addContributionMutation.isPending ||
                    !isCurrentUserAdmin ||
                    !memberId ||
                    Number(contributionAmount) <= 0
                  }
                  className="flex-1 py-3 bg-[#4040b0] text-white font-medium rounded-xl disabled:opacity-60"
                >
                  {addContributionMutation.isPending
                    ? 'Guardando...'
                    : 'Guardar aporte'}
                </button>
              </div>
              {addContributionMutation.data?.error ? (
                <p className="text-red-500 text-sm mt-3">
                  {addContributionMutation.data.error}
                </p>
              ) : null}
              {!isCurrentUserAdmin ? (
                <p className="text-red-500 text-sm mt-3">
                  Solo un admin puede registrar aportes.
                </p>
              ) : null}
            </div>
          </div>
        </>
      )}

      {showDeleteGoalModal && selectedGoal && (
        <>
          <button
            type="button"
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setShowDeleteGoalModal(false)}
            aria-label="Cerrar modal"
          />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 max-h-[88vh] overflow-y-auto">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>
            <div className="px-6 pb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#1a1a3e]">
                  Eliminar objetivo
                </h2>
                <button
                  type="button"
                  onClick={() => setShowDeleteGoalModal(false)}
                  className="w-8 h-8 flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <p className="text-gray-600 mb-6">
                Se eliminará el objetivo <strong>{selectedGoal.title}</strong>.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteGoalModal(false)}
                  className="flex-1 py-3 text-[#1a1a3e] font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() =>
                    deleteGoalMutation.mutate({
                      data: {
                        groupId: id,
                        goalId: selectedGoal.id,
                      },
                    })
                  }
                  disabled={deleteGoalMutation.isPending}
                  className="flex-1 py-3 bg-red-500 text-white font-medium rounded-xl disabled:opacity-60"
                >
                  {deleteGoalMutation.isPending ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
              {deleteGoalMutation.data?.error ? (
                <p className="text-red-500 text-sm mt-3">
                  {deleteGoalMutation.data.error}
                </p>
              ) : null}
            </div>
          </div>
        </>
      )}

      {showParticipantsModal && (
        <>
          <button
            type="button"
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setShowParticipantsModal(false)}
            aria-label="Cerrar modal"
          />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 max-h-[88vh] overflow-y-auto">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>
            <div className="px-6 pb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#1a1a3e]">
                  Participantes
                </h2>
                <button
                  type="button"
                  onClick={() => setShowParticipantsModal(false)}
                  className="w-8 h-8 flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-3">
                {data.members.map((member) => (
                  <div
                    key={member.id}
                    className="rounded-xl border border-gray-100 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#1a1a3e]">
                          {member.name}
                          {member.isCurrentUser ? ' (Tú)' : ''}
                        </p>
                        <p className="text-xs text-gray-500">
                          Rol: {member.role === 'admin' ? 'Admin' : 'Miembro'}
                        </p>
                      </div>

                      {isCurrentUserAdmin && !member.isCurrentUser ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleAdminRole(
                                member.id,
                                member.role === 'admin' ? 'member' : 'admin',
                              )
                            }
                            disabled={updateGoalMemberRoleMutation.isPending}
                            className="px-3 py-2 rounded-lg bg-[#eef0ff] text-[#4040b0] text-xs font-medium disabled:opacity-60"
                          >
                            {member.role === 'admin'
                              ? 'Quitar admin'
                              : 'Hacer admin'}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveParticipant(member.id, member.name)
                            }
                            disabled={removeGoalMemberMutation.isPending}
                            className="px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs font-medium disabled:opacity-60"
                          >
                            Eliminar
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              {updateGoalMemberRoleMutation.data?.error ? (
                <p className="text-red-500 text-sm mt-3">
                  {updateGoalMemberRoleMutation.data.error}
                </p>
              ) : null}
              {removeGoalMemberMutation.data?.error ? (
                <p className="text-red-500 text-sm mt-3">
                  {removeGoalMemberMutation.data.error}
                </p>
              ) : null}
              {!isCurrentUserAdmin ? (
                <p className="text-gray-500 text-sm mt-3">
                  Solo un admin puede cambiar roles o eliminar participantes.
                </p>
              ) : null}
            </div>
          </div>
        </>
      )}

      {showInviteModal && (
        <>
          <button
            type="button"
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setShowInviteModal(false)}
            aria-label="Cerrar modal"
          />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>
            <div className="px-6 pb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#1a1a3e]">
                  Compartir meta
                </h2>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="mb-5">
                <p className="text-sm text-gray-500 mb-2">
                  Enlace de invitación
                </p>
                <div className="flex gap-2">
                  <div className="flex-1 px-3 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-600 truncate">
                    {inviteLink}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3 py-3 rounded-xl border border-gray-300"
                  >
                    <Link className="w-4 h-4 text-gray-700" />
                  </button>
                </div>
              </div>

              <div className="mb-5">
                <p className="text-sm text-gray-500 mb-2">Código</p>
                <div className="flex gap-2">
                  <div className="flex-1 px-3 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-700 font-mono">
                    {data?.inviteCode}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-3 py-3 rounded-xl border border-gray-300"
                  >
                    <Copy className="w-4 h-4 text-gray-700" />
                  </button>
                </div>
              </div>

              {copied ? (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  Copiado al portapapeles
                </p>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
