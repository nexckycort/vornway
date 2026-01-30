/** biome-ignore-all lint/a11y/useButtonType: <explanation> */
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { Check, ChevronLeft, Copy, Link, MoreHorizontal, Plus, UserPlus, X } from 'lucide-react';
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

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(date));
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date: Date;
  paidBy: {
    id: string;
    name: string;
  };
  participantCount: number;
}

function ExpenseItem({ expense }: { expense: Expense }) {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-gray-100 last:border-b-0">
      <div className="w-12 h-12 bg-[#f0f0ff] rounded-xl flex items-center justify-center flex-shrink-0">
        <span className="text-lg">💰</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-[#1a1a3e] truncate">{expense.description}</p>
        <p className="text-sm text-gray-500">
          {expense.paidBy.name} pagó · {formatDate(expense.date)}
          {expense.participantCount > 0 && ` · ${expense.participantCount} participantes`}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="font-semibold text-[#1a1a3e]">
          ${formatCurrency(expense.amount)}
        </p>
        <p className="text-xs text-gray-500">{expense.currency}</p>
      </div>
    </div>
  );
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
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data } = useQuery({
    queryKey: ['group', id],
    queryFn: async () => getGroup({ data: { groupId: id } }),
  });

  const inviteLink = data?.inviteCode
    ? `${window.location.origin}/join/${data.inviteCode}`
    : '';

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error copying link:', err);
    }
  };

  const handleCopyCode = async () => {
    if (!data?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(data.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error copying code:', err);
    }
  };

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
              <button
                onClick={() => setShowInviteModal(true)}
                className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center"
              >
                <UserPlus className="w-6 h-6 text-[#1a1a3e]" />
              </button>
              <span className="text-sm text-[#1a1a3e]">Invitar</span>
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

      {/* Content */}
      {activeTab === 'gastos' &&
        (data?.expenses && data.expenses.length > 0 ? (
          <div className="px-4 py-2">
            <div className="bg-white rounded-2xl px-4">
              {data.expenses.map((expense) => (
                <ExpenseItem key={expense.id} expense={expense} />
              ))}
            </div>
          </div>
        ) : (
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
        ))}

      {activeTab === 'cuentas' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-20">
          <h3 className="text-xl font-semibold text-[#1a1a3e] mb-2">
            Próximamente
          </h3>
          <p className="text-gray-500 text-center">
            Aquí verás el balance de cuentas entre participantes
          </p>
        </div>
      )}

      {/* Modal de invitación */}
      {showInviteModal && (
        <>
          <button
            type="button"
            className="fixed inset-0 bg-black/30 z-40 cursor-default"
            onClick={() => setShowInviteModal(false)}
            aria-label="Cerrar modal"
          />

          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            <div className="px-6 pb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#1a1a3e]">
                  Invitar al grupo
                </h2>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <p className="text-gray-500 mb-6">
                Comparte este enlace para que otros se unan a <strong>{data?.name}</strong>
              </p>

              {/* Enlace */}
              <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#e8e4f8] rounded-xl flex items-center justify-center flex-shrink-0">
                    <Link className="w-5 h-5 text-[#6060c0]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-500 mb-1">Enlace de invitación</p>
                    <p className="text-[#1a1a3e] font-medium truncate text-sm">
                      {inviteLink}
                    </p>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="w-10 h-10 bg-[#4040b0] rounded-xl flex items-center justify-center flex-shrink-0"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-white" />
                    ) : (
                      <Copy className="w-5 h-5 text-white" />
                    )}
                  </button>
                </div>
              </div>

              {/* Código */}
              <div className="bg-gray-50 rounded-2xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">Código de invitación</p>
                    <p className="text-2xl font-bold text-[#1a1a3e] tracking-wider">
                      {data?.inviteCode}
                    </p>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="px-4 py-2 bg-gray-200 rounded-xl text-[#1a1a3e] font-medium text-sm"
                  >
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowInviteModal(false)}
                className="w-full py-4 bg-[#4040b0] text-white font-medium rounded-2xl"
              >
                Cerrar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
