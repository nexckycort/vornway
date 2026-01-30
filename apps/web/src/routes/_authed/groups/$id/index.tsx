/** biome-ignore-all lint/a11y/useButtonType: <explanation> */
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { ChevronLeft, MoreHorizontal, Plus, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { getGroup } from './-actions/get-group';

export const Route = createFileRoute('/_authed/groups/$id/')({
  component: RouteComponent,
});

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function TotalsDisplay({ totals }: { totals: Record<string, number> }) {
  const entries = Object.entries(totals);

  if (entries.length === 0) {
    return (
      <h2 className="text-4xl font-bold text-[#1a1a3e] text-center mb-1">$0</h2>
    );
  }

  return (
    <div className="text-center mb-1">
      {entries.map(([currency, amount], index) => (
        <h2
          key={currency}
          className={`font-bold text-[#1a1a3e] ${index === 0 ? 'text-4xl' : 'text-2xl text-gray-600'}`}
        >
          ${formatCurrency(amount)}{' '}
          <span className={index === 0 ? 'text-2xl font-semibold' : 'text-lg'}>
            {currency}
          </span>
        </h2>
      ))}
    </div>
  );
}

function RouteComponent() {
  const { id } = Route.useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'gastos' | 'cuentas'>('gastos');

  const { data, error, isLoading } = useQuery({
    queryKey: ['group', id],
    queryFn: async () => getGroup({ data: { groupId: id } }),
  });

  return (
    <div className="min-h-screen bg-[#f5f3fa]">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.navigate({ to: '/' })}
            className="w-10 h-10 flex items-center justify-center"
          >
            <ChevronLeft className="w-6 h-6 text-[#1a1a3e]" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-[#1a1a3e]">
              {data?.name || 'Cargando...'}
            </h1>
            <p className="text-sm text-gray-500">
              {data ? `${data.participantCount} Participantes` : 'Cargando...'}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div className="px-4 py-4">
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <p className="text-gray-500 text-center mb-1">Total gastado</p>
          <TotalsDisplay totals={data?.totals ?? {}} />
          <p className="text-gray-500 text-center mb-6">Sin deudas</p>

          {/* Action buttons */}
          <div className="flex justify-center gap-8">
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() =>
                  router.navigate({
                    to: '/groups/$id/add-expense',
                    params: { id },
                  })
                }
                className="w-14 h-14 bg-[#4040b0] rounded-2xl flex items-center justify-center"
              >
                <Plus className="w-6 h-6 text-white" />
              </button>
              <span className="text-sm text-[#1a1a3e]">Añadir gastos</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-[#1a1a3e]" />
              </button>
              <span className="text-sm text-[#1a1a3e]">Participantes</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
                <MoreHorizontal className="w-6 h-6 text-[#1a1a3e]" />
              </button>
              <span className="text-sm text-[#1a1a3e]">Ajustes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-2">
        <div className="flex bg-gray-100 rounded-2xl p-1">
          <button
            onClick={() => setActiveTab('gastos')}
            className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
              activeTab === 'gastos'
                ? 'bg-white text-[#4040b0] shadow-sm'
                : 'text-gray-500'
            }`}
          >
            Gastos
          </button>
          <button
            onClick={() => setActiveTab('cuentas')}
            className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
              activeTab === 'cuentas'
                ? 'bg-white text-[#4040b0] shadow-sm'
                : 'text-gray-500'
            }`}
          >
            Cuentas
          </button>
        </div>
      </div>

      {/* Empty State */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        {/* Icon */}
        <div className="relative mb-6">
          <div className="w-20 h-20 bg-[#a8a0e8] rounded-2xl transform rotate-6" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 bg-[#4040b0] rounded-2xl flex items-center justify-center -rotate-6">
              <Plus className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <h3 className="text-xl font-semibold text-[#1a1a3e] mb-2">
          No tienes gastos aún
        </h3>
        <p className="text-gray-500 text-center">
          Ingresa tus primeros gastos y comienza a dividirlos
        </p>
      </div>
    </div>
  );
}
