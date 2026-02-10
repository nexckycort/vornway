import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getGroup } from '../-actions/get-group';
import { settleDebt } from '../-actions/settle-debt';

export const Route = createFileRoute('/_authed/groups/$id/settle/')({
  component: RouteComponent,
});

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

interface FlexibleDebtOption {
  key: string;
  fromMemberId: string;
  toMemberId: string;
  toName: string;
  currency: string;
  maxAmount: number;
}

function RouteComponent() {
  const { id } = Route.useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [flexOptionKey, setFlexOptionKey] = useState('');
  const [flexAmount, setFlexAmount] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['group', id],
    queryFn: () => getGroup({ data: { groupId: id } }),
  });

  const settleDebtMutation = useMutation({
    mutationFn: settleDebt,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['group', id] });
      }
    },
  });

  const flexibleOptions = useMemo<FlexibleDebtOption[]>(() => {
    if (!data?.memberBalances || data.memberBalances.length === 0) return [];

    const currentMember = data.memberBalances.find(
      (member) => member.isCurrentUser,
    );

    if (!currentMember) return [];

    const options: FlexibleDebtOption[] = [];
    const currencies = Object.keys(currentMember.balances);

    for (const currency of currencies) {
      const currentBalance = currentMember.balances[currency] ?? 0;
      if (currentBalance >= -1) continue;

      let remaining = Math.abs(currentBalance);
      const creditors = data.memberBalances
        .filter((member) => member.memberId !== currentMember.memberId)
        .map((member) => ({
          memberId: member.memberId,
          name: member.name,
          amount: member.balances[currency] ?? 0,
        }))
        .filter((member) => member.amount > 0)
        .sort((a, b) => b.amount - a.amount);

      for (const creditor of creditors) {
        if (remaining <= 0) break;

        const amount = Math.min(remaining, creditor.amount);
        if (amount < 1) continue;

        options.push({
          key: `${creditor.memberId}-${currency}`,
          fromMemberId: currentMember.memberId,
          toMemberId: creditor.memberId,
          toName: creditor.name,
          currency,
          maxAmount: amount,
        });

        remaining -= amount;
      }
    }

    return options;
  }, [data]);

  useEffect(() => {
    if (flexibleOptions.length === 0) {
      setFlexOptionKey('');
      return;
    }

    if (!flexOptionKey) {
      setFlexOptionKey(flexibleOptions[0].key);
      return;
    }

    const exists = flexibleOptions.some(
      (option) => option.key === flexOptionKey,
    );

    if (!exists) {
      setFlexOptionKey(flexibleOptions[0].key);
    }
  }, [flexibleOptions, flexOptionKey]);

  const selectedFlexOption =
    flexibleOptions.find((option) => option.key === flexOptionKey) ?? null;

  const handleFlexibleSettle = (amount: number) => {
    if (!selectedFlexOption || settleDebtMutation.isPending || amount <= 0) {
      return;
    }

    settleDebtMutation.mutate({
      data: {
        groupId: id,
        fromMemberId: selectedFlexOption.fromMemberId,
        toMemberId: selectedFlexOption.toMemberId,
        amount,
        currency: selectedFlexOption.currency,
        method: 'flex',
      },
    });

    setFlexAmount('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f3fa] flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
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
            <h1 className="text-xl font-semibold text-[#1a1a3e]">
              Liquidar deudas
            </h1>
            <p className="text-sm text-gray-500">{data.name}</p>
          </div>
        </div>
      </div>

      <div className="px-4">
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          {flexibleOptions.length === 0 ? (
            <div className="text-center">
              <p className="text-[#1a1a3e] font-semibold mb-2">
                No tienes deudas para abonar
              </p>
              <p className="text-gray-500 text-sm">
                Cuando debas un monto a alguien, podrás abonar total o parcial
                aquí.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-2">¿A quién abonar?</p>
              <select
                value={flexOptionKey}
                onChange={(event) => setFlexOptionKey(event.target.value)}
                className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-[#1a1a3e] mb-3 focus:outline-none focus:border-[#6060c0]"
              >
                {flexibleOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.toName} · {option.currency} · Máx $
                    {formatCurrency(option.maxAmount)}
                  </option>
                ))}
              </select>

              {selectedFlexOption && (
                <div className="bg-gray-50 rounded-xl p-3 mb-4">
                  <p className="text-sm text-gray-500">Deuda actual</p>
                  <p className="font-semibold text-[#1a1a3e]">
                    ${formatCurrency(selectedFlexOption.maxAmount)}{' '}
                    {selectedFlexOption.currency}
                  </p>
                </div>
              )}

              <p className="text-sm text-gray-500 mb-2">Monto a abonar</p>
              <input
                type="number"
                min="1"
                step="1"
                value={flexAmount}
                onChange={(event) => setFlexAmount(event.target.value)}
                placeholder="Ej: 25000"
                className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-[#1a1a3e] mb-4 focus:outline-none focus:border-[#6060c0]"
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedFlexOption) return;
                    handleFlexibleSettle(selectedFlexOption.maxAmount);
                  }}
                  disabled={!selectedFlexOption || settleDebtMutation.isPending}
                  className="flex-1 py-3 border border-[#4040b0] text-[#4040b0] font-medium rounded-xl disabled:opacity-60"
                >
                  Abonar total
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const parsedAmount = Number(flexAmount);
                    if (!selectedFlexOption) return;
                    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
                      return;
                    }
                    const amount = Math.min(
                      parsedAmount,
                      selectedFlexOption.maxAmount,
                    );
                    handleFlexibleSettle(amount);
                  }}
                  disabled={
                    !selectedFlexOption ||
                    settleDebtMutation.isPending ||
                    !flexAmount ||
                    Number(flexAmount) <= 0
                  }
                  className="flex-1 py-3 bg-[#4040b0] text-white font-medium rounded-xl disabled:opacity-60"
                >
                  Abonar monto
                </button>
              </div>

              {settleDebtMutation.data?.error && (
                <p className="text-red-500 text-sm mt-4 text-center">
                  {settleDebtMutation.data.error}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
