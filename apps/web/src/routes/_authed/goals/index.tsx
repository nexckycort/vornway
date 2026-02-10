import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { ChevronRight, Plus, Target } from 'lucide-react';
import { getUserGoals } from './-actions/get-user-goals';

export const Route = createFileRoute('/_authed/goals/')({
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
  const navigate = Route.useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ['user-goals'],
    queryFn: () => getUserGoals(),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f3fa] flex items-center justify-center">
        <p className="text-gray-500">Cargando metas...</p>
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="min-h-screen bg-[#f5f3fa] flex items-center justify-center p-6">
        <p className="text-red-500">No se pudieron cargar las metas.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f3fa] pb-8">
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a3e]">Metas</h1>
          <p className="text-sm text-gray-500">Tus objetivos de ahorro</p>
        </div>
        <button
          type="button"
          onClick={() => navigate({ to: '/goals/new' })}
          className="w-11 h-11 rounded-xl bg-[#4040b0] text-white flex items-center justify-center"
          aria-label="Crear meta"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="px-4 space-y-3">
        {data.goals.length === 0 ? (
          <div className="bg-white rounded-3xl p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#eef0ff] mx-auto mb-3 flex items-center justify-center">
              <Target className="w-7 h-7 text-[#4040b0]" />
            </div>
            <p className="font-semibold text-[#1a1a3e] mb-1">
              Aún no tienes metas
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Crea una meta y empieza a registrar aportes.
            </p>
            <button
              type="button"
              onClick={() => navigate({ to: '/goals/new' })}
              className="px-4 py-2.5 rounded-xl bg-[#4040b0] text-white font-medium"
            >
              Crear meta
            </button>
          </div>
        ) : (
          data.goals.map((goal) => (
            <button
              key={goal.id}
              type="button"
              onClick={() =>
                navigate({
                  to: '/goals/$id',
                  params: { id: goal.id },
                })
              }
              className="w-full bg-white rounded-3xl p-4 text-left"
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="font-semibold text-[#1a1a3e]">{goal.name}</p>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 mb-2">
                ${formatCurrency(goal.totalContributed)} / $
                {formatCurrency(goal.targetAmount)} {goal.currency}
              </p>
              <div className="w-full h-2.5 rounded-full bg-gray-100 mb-2 overflow-hidden">
                <div
                  className="h-full bg-[#4040b0]"
                  style={{ width: `${goal.progressPct}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">
                Cierra: {formatDate(goal.endDate)}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
