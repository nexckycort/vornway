/** biome-ignore-all lint/a11y/useButtonType: <explanation> */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { CalendarDays, ChevronLeft, Plus, Target, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AppDrawer } from '~/components/app-drawer';
import { addGoalContribution } from './-actions/add-goal-contribution';
import { createGoal } from './-actions/create-goal';
import { getGoals } from './-actions/get-goals';

export const Route = createFileRoute('/_authed/groups/$id/goals/')({
  validateSearch: (search: Record<string, unknown>) =>
    search.create === true ? { create: true } : {},
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
  const { create } = Route.useSearch();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currency, setCurrency] = useState('COP');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [installmentCount, setInstallmentCount] = useState('12');

  const [memberId, setMemberId] = useState('');
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributedAt, setContributedAt] = useState('');
  const [contributionNotes, setContributionNotes] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['group-goals', id],
    queryFn: () => getGoals({ data: { groupId: id } }),
  });

  const createGoalMutation = useMutation({
    mutationFn: createGoal,
    onSuccess: (result) => {
      if (!result.success) return;
      queryClient.invalidateQueries({ queryKey: ['group-goals', id] });
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setTargetAmount('');
      setCurrency('COP');
      setStartDate('');
      setEndDate('');
      setInstallmentCount('12');
    },
  });

  const addContributionMutation = useMutation({
    mutationFn: addGoalContribution,
    onSuccess: (result) => {
      if (!result.success) return;
      queryClient.invalidateQueries({ queryKey: ['group-goals', id] });
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
      setShowContributionModal(false);
      setSelectedGoalId('');
      setMemberId('');
      setContributionAmount('');
      setContributedAt('');
      setContributionNotes('');
    },
  });

  const selectedGoal = useMemo(
    () => data?.goals.find((goal) => goal.id === selectedGoalId) ?? null,
    [data?.goals, selectedGoalId],
  );

  const installmentPreview = (() => {
    const parsedTarget = Number(targetAmount);
    const parsedCount = Number(installmentCount);
    if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) return null;
    if (!Number.isFinite(parsedCount) || parsedCount <= 0) return null;
    return parsedTarget / parsedCount;
  })();

  useEffect(() => {
    if (create) {
      setShowCreateModal(true);
    }
  }, [create]);

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
          onClick={() => router.navigate({ to: '/groups/$id', params: { id } })}
          className="px-6 py-3 bg-[#4040b0] text-white rounded-xl"
        >
          Volver al grupo
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f3fa] pb-8">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.history.back()}
            className="w-10 h-10 flex items-center justify-center"
          >
            <ChevronLeft className="w-6 h-6 text-[#1a1a3e]" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-[#1a1a3e]">Metas</h1>
            <p className="text-sm text-gray-500">{data.groupName}</p>
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
          Crear meta
        </button>
      </div>

      <div className="px-4 space-y-4">
        {data.goals.length === 0 ? (
          <div className="bg-white rounded-3xl p-6 text-center">
            <p className="text-[#1a1a3e] font-semibold mb-2">
              No hay metas creadas
            </p>
            <p className="text-gray-500 text-sm">
              Crea una meta para controlar aportes mensuales y progreso.
            </p>
          </div>
        ) : (
          data.goals.map((goal) => (
            <article key={goal.id} className="bg-white rounded-3xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-lg font-semibold text-[#1a1a3e]">
                    {goal.title}
                  </h2>
                  {goal.description ? (
                    <p className="text-sm text-gray-500 mt-1">{goal.description}</p>
                  ) : null}
                </div>
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
                  Últimos aportes
                </p>
                {goal.contributions.length === 0 ? (
                  <p className="text-sm text-gray-500">Sin aportes aún</p>
                ) : (
                  <div className="space-y-2">
                    {goal.contributions.slice(0, 5).map((contribution) => {
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
                              ${formatCurrency(contribution.amount)} {goal.currency}
                            </p>
                          </div>
                          <p className="text-xs text-gray-500">
                            {formatDate(contribution.contributedAt)} ·{' '}
                            {quotaEquivalent.toFixed(2)} cuotas
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </article>
          ))
        )}
      </div>

      {showCreateModal && (
        <AppDrawer
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          className="max-h-[88vh]"
        >
          <div className="overflow-y-auto">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>
            <div className="px-6 pb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#1a1a3e]">Nueva meta</h2>
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
                  placeholder="Nombre de la meta"
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
                    onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                    placeholder="Moneda"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Fecha inicio</p>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Fecha fin</p>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(event) => setEndDate(event.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Número de cuotas</p>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={installmentCount}
                    onChange={(event) => setInstallmentCount(event.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                  />
                </div>

                {installmentPreview ? (
                  <div className="rounded-xl bg-[#eef0ff] px-4 py-3 text-sm text-[#1a1a3e]">
                    Cuota mensual sugerida: $
                    <span className="font-semibold">
                      {formatCurrency(installmentPreview)}
                    </span>{' '}
                    {currency || 'COP'}
                  </div>
                ) : null}
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
                        startDate: startDate || new Date().toISOString().slice(0, 10),
                        endDate: endDate || new Date().toISOString().slice(0, 10),
                        installmentCount: Number(installmentCount),
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
                  {createGoalMutation.isPending ? 'Creando...' : 'Crear meta'}
                </button>
              </div>

              {createGoalMutation.data?.error ? (
                <p className="text-red-500 text-sm mt-3">
                  {createGoalMutation.data.error}
                </p>
              ) : null}
            </div>
          </div>
        </AppDrawer>
      )}

      {showContributionModal && selectedGoal && (
        <AppDrawer
          open={showContributionModal}
          onOpenChange={setShowContributionModal}
          className="max-h-[88vh]"
        >
          <div className="overflow-y-auto">
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
                  onChange={(event) => setContributionAmount(event.target.value)}
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
            </div>
          </div>
        </AppDrawer>
      )}
    </div>
  );
}
