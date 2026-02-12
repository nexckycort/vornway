import { useQuery } from '@tanstack/react-query';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { GradientLayout } from '~/components/gradient-layout';
import { getGroup } from '../-actions/get-group';

export const Route = createFileRoute('/_authed/groups/$id/totals/')({
  component: RouteComponent,
});

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function RouteComponent() {
  const { id } = Route.useParams();
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ['group', id],
    queryFn: () => getGroup({ data: { groupId: id } }),
  });

  if (isLoading) {
    return (
      <GradientLayout className="native-enter flex items-center justify-center pb-8">
        <p className="text-gray-500">Cargando...</p>
      </GradientLayout>
    );
  }

  if (error || !data) {
    return (
      <GradientLayout className="native-enter flex flex-col items-center justify-center p-6 pb-8">
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
      </GradientLayout>
    );
  }

  const totalsByMember = new Map<string, Record<string, number>>();
  for (const member of data.members) {
    totalsByMember.set(member.id, {});
  }

  for (const expense of data.expenses) {
    if (expense.isDeleted) continue;
    const memberTotals = totalsByMember.get(expense.paidBy.id);
    if (!memberTotals) continue;
    memberTotals[expense.currency] =
      (memberTotals[expense.currency] ?? 0) + expense.amount;
  }

  const currentMember = data.members.find((member) => member.isCurrentUser);
  const currentMemberBalances = data.memberBalances.find(
    (member) => member.isCurrentUser,
  );
  const currentRawSpent = currentMember
    ? (totalsByMember.get(currentMember.id) ?? {})
    : {};
  const currentBalances = currentMemberBalances?.balances ?? {};

  const myTotalsByCurrency: Array<{
    currency: string;
    rawSpent: number;
    owedToMe: number;
    netSpent: number;
  }> = Array.from(
    new Set([...Object.keys(currentRawSpent), ...Object.keys(currentBalances)]),
  )
    .map((currency) => {
      const rawSpent = currentRawSpent[currency] ?? 0;
      const owedToMe = Math.max(0, currentBalances[currency] ?? 0);
      const netSpent = rawSpent - owedToMe;
      return { currency, rawSpent, owedToMe, netSpent };
    })
    .filter(
      (item) => item.rawSpent > 0 || item.owedToMe > 0 || item.netSpent > 0,
    );

  const balancesByMember = new Map(
    data.memberBalances.map((member) => [member.memberId, member.balances]),
  );

  return (
    <GradientLayout className="native-enter pb-8">
      <div className="px-4 pt-5 pb-3">
        <div className="native-surface-muted flex items-center gap-3 px-3 py-2.5">
          <button
            type="button"
            onClick={() => router.history.back()}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80"
          >
            <ChevronLeft className="w-6 h-6 text-[#1a1a3e]" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-[#1a1a3e]">Totales</h1>
            <p className="text-sm text-gray-500">{data.name}</p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4">
        <section className="bg-white rounded-3xl p-5 shadow-sm">
          <p className="text-sm text-gray-500 mb-2">Total gastado del grupo</p>
          <div className="space-y-1">
            {Object.keys(data.totals).length === 0 ? (
              <p className="text-2xl font-bold text-[#1a1a3e]">$0</p>
            ) : (
              Object.entries(data.totals).map(([currency, amount]) => (
                <p key={currency} className="text-2xl font-bold text-[#1a1a3e]">
                  ${formatCurrency(amount)}{' '}
                  <span className="text-lg font-semibold">{currency}</span>
                </p>
              ))
            )}
          </div>
        </section>

        <section className="bg-white rounded-3xl p-5 shadow-sm">
          <p className="text-sm text-gray-500 mb-3">Tu resumen</p>
          {myTotalsByCurrency.length === 0 ? (
            <div className="native-empty p-4">
              <p className="text-[#1a1a3e] font-semibold">Sin movimientos</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myTotalsByCurrency.map((item) => (
                <div key={item.currency} className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-sm text-gray-500 mb-1">{item.currency}</p>
                  <p className="text-sm text-[#1a1a3e]">
                    Total pagado por ti: $
                    <span className="font-semibold">
                      {formatCurrency(item.rawSpent)}
                    </span>
                  </p>
                  <p className="text-sm text-[#1a1a3e]">
                    Lo que te deben: $
                    <span className="font-semibold text-green-600">
                      {formatCurrency(item.owedToMe)}
                    </span>
                  </p>
                  <p className="text-sm text-[#1a1a3e]">
                    Tu total neto: $
                    <span className="font-semibold">
                      {formatCurrency(item.netSpent)}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-3xl p-5 shadow-sm">
          <p className="text-sm text-gray-500 mb-3">
            Total real gastado por persona
          </p>
          <div className="space-y-3">
            {data.members.map((member) => {
              const rawTotals = totalsByMember.get(member.id) ?? {};
              const memberBalances = balancesByMember.get(member.id) ?? {};
              const currencies = new Set([
                ...Object.keys(rawTotals),
                ...Object.keys(memberBalances),
              ]);

              const memberTotals = Array.from(currencies)
                .map((currency) => {
                  const rawSpent = rawTotals[currency] ?? 0;
                  const balance = memberBalances[currency] ?? 0;
                  const realSpent = Math.max(0, rawSpent - balance);
                  return { currency, realSpent };
                })
                .filter((item) => item.realSpent > 0);

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 p-4"
                >
                  <p className="font-medium text-[#1a1a3e]">
                    {member.name}
                    {member.isCurrentUser ? ' (Tú)' : ''}
                  </p>
                  <div className="text-right">
                    {memberTotals.length === 0 ? (
                      <p className="font-semibold text-gray-400">$0</p>
                    ) : (
                      memberTotals.map((item) => (
                        <p
                          key={item.currency}
                          className="font-semibold text-[#1a1a3e]"
                        >
                          ${formatCurrency(item.realSpent)} {item.currency}
                        </p>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </GradientLayout>
  );
}
