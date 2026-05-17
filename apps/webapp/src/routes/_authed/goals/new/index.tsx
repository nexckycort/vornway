import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';

import { MobilePageLayout } from '#/components/mobile-page-layout';
import { Button } from '#/components/ui/button';
import { useCreateGoalMutation } from '../-hooks/use-create-goal';

export const Route = createFileRoute('/_authed/goals/new/')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const createGoalMutation = useCreateGoalMutation();
  const nameRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('COP');
  const [targetAmount, setTargetAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [installmentCount, setInstallmentCount] = useState('12');
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const node = nameRef.current;
    if (!node) return;

    const frame = window.requestAnimationFrame(() => node.focus());
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const canSubmit =
    name.trim().length > 0 &&
    Number(targetAmount) > 0 &&
    startDate.length > 0 &&
    endDate.length > 0 &&
    Number(installmentCount) > 0;

  const handleSubmit = async () => {
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
      });

      if (!result?.id) {
        throw new Error('No se pudo crear la meta');
      }

      await navigate({ to: '/goals', replace: true });
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
      <div className="mx-auto flex w-full max-w-[412px] flex-1 flex-col bg-[#fafafa] px-4 pb-0">
        <div className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#64748b]">
            Metas de ahorro
          </p>
          <h1 className="mt-2 text-2xl font-semibold leading-8 text-[#0f172a]">
            Crear meta
          </h1>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto pb-32">
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

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="border-t border-[#e2e8f0] bg-[#fafafa] px-0 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
          <div className="px-4">
            <Button
              type="button"
              disabled={!canSubmit || createGoalMutation.isPending}
              onClick={handleSubmit}
              className="h-14 w-full rounded-full bg-primary text-base font-medium text-white"
            >
              {createGoalMutation.isPending ? 'Creando...' : 'Crear meta'}
            </Button>
          </div>
        </div>
      </div>
    </MobilePageLayout>
  );
}
