import { MobilePageLayout } from '#/components/mobile-page-layout';
import { Button } from '#/components/ui/button';
import { useSettleDebtMutation } from '#/routes/_authed/groups/-hooks/use-group-actions';
import { useGroupSummaryQuery } from '#/routes/_authed/groups/-hooks/use-group-detail-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';

export const Route = createFileRoute('/_authed/groups/$id/settle')({
  component: RouteComponent,
});

function formatAmount(currency: string, amount: number): string {
  return `${currency} ${amount.toLocaleString('es-CO')}`;
}

function RouteComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const groupQuery = useGroupSummaryQuery(id);
  const settleMutation = useSettleDebtMutation(id);

  const [selectedKey, setSelectedKey] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(
    () =>
      (groupQuery.data?.settlementDebts ?? []).map((debt) => ({
        key: `${debt.fromMemberId}:${debt.toMemberId}:${debt.currency}`,
        ...debt,
      })),
    [groupQuery.data?.settlementDebts],
  );

  useEffect(() => {
    if (!selectedKey && options[0]) {
      setSelectedKey(options[0].key);
    }
  }, [options, selectedKey]);

  const selected = options.find((option) => option.key === selectedKey) ?? null;
  const parsedAmount = Number(amount);
  const canSubmit =
    Boolean(selected) && Number.isFinite(parsedAmount) && parsedAmount > 0;

  const submit = async (value: number) => {
    if (!selected || settleMutation.isPending || value <= 0) return;
    setError(null);

    try {
      await settleMutation.mutateAsync({
        fromMemberId: selected.fromMemberId,
        toMemberId: selected.toMemberId,
        amount: Math.min(value, selected.amount),
        currency: selected.currency,
      });
      await navigate({ to: '/groups/$id', params: { id }, replace: true });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo liquidar la deuda',
      );
    }
  };

  return (
    <MobilePageLayout
      title="Liquidar deudas"
      onBack={() =>
        navigate({ to: '/groups/$id', params: { id }, replace: true })
      }
    >
      <div className="flex flex-1 flex-col gap-5">
        {options.length === 0 ? (
          <div className="rounded-2xl border border-[#e2e8f0] bg-white px-5 py-8 text-center">
            <h2 className="text-base font-semibold text-[#132238]">
              No hay deudas para liquidar
            </h2>
            <p className="mt-2 text-sm text-[#64748b]">
              Cuando existan saldos entre participantes, podrás registrarlos
              aquí.
            </p>
          </div>
        ) : (
          <>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[#334155]">Deuda</span>
              <select
                value={selectedKey}
                onChange={(event) => setSelectedKey(event.target.value)}
                className="h-12 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-sm outline-none focus:border-primary"
              >
                {options.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.fromName} debe a {option.toName}
                  </option>
                ))}
              </select>
            </label>

            {selected ? (
              <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4">
                <p className="text-sm text-[#64748b]">Saldo máximo</p>
                <p className="mt-1 text-2xl font-semibold text-[#132238]">
                  {formatAmount(selected.currency, selected.amount)}
                </p>
              </div>
            ) : null}

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[#334155]">
                Monto a abonar
              </span>
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                type="number"
                inputMode="decimal"
                min="0"
                placeholder="Ej: 25000"
                className="h-12 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-sm outline-none focus:border-primary"
              />
            </label>
          </>
        )}

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="-mx-4 mt-auto grid grid-cols-2 gap-3 border-t border-[#e2e8f0] bg-[#fafafa] px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-full"
            disabled={!selected || settleMutation.isPending}
            onClick={() => selected && submit(selected.amount)}
          >
            Total
          </Button>
          <Button
            type="button"
            className="h-11 rounded-full"
            disabled={!canSubmit || settleMutation.isPending}
            onClick={() => submit(parsedAmount)}
          >
            {settleMutation.isPending ? 'Liquidando...' : 'Abonar'}
          </Button>
        </div>
      </div>
    </MobilePageLayout>
  );
}
