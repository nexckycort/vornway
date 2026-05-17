import { Button } from '#/components/ui/button';
import { useCreateExpenseMutation } from '#/routes/_authed/groups/-hooks/use-group-actions';
import { useGroupSummaryQuery } from '#/routes/_authed/groups/-hooks/use-group-detail-query';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Check, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export const Route = createFileRoute('/_authed/groups/$id/add-expense')({
  component: RouteComponent,
});

const currencies = ['COP', 'USD', 'EUR'];

function RouteComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const groupQuery = useGroupSummaryQuery(id);
  const createExpenseMutation = useCreateExpenseMutation(id);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('COP');
  const [paidById, setPaidById] = useState('');
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const members = groupQuery.data?.members ?? [];

  useEffect(() => {
    if (paidById || !groupQuery.data) return;
    setPaidById(groupQuery.data.myMembership?.id ?? members[0]?.id ?? '');
    setParticipantIds(members.map((member) => member.id));
  }, [groupQuery.data, members, paidById]);

  const parsedAmount = Number(amount);
  const canSubmit =
    description.trim().length > 0 &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    paidById.length > 0;
  const amountPerPerson = useMemo(() => {
    if (participantIds.length === 0 || !Number.isFinite(parsedAmount)) return 0;
    return parsedAmount / participantIds.length;
  }, [parsedAmount, participantIds.length]);

  const toggleParticipant = (memberId: string) => {
    setParticipantIds((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    );
  };

  const handleSubmit = async () => {
    if (!canSubmit || createExpenseMutation.isPending) return;
    setError(null);

    try {
      await createExpenseMutation.mutateAsync({
        description: description.trim(),
        amount: parsedAmount,
        currency,
        paidById,
        participantIds,
      });
      await navigate({ to: '/groups/$id', params: { id } });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo crear el gasto',
      );
    }
  };

  return (
    <main className="min-h-screen bg-[#efefef] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[412px] flex-col bg-[#fafafa] px-4 pb-0 pt-8">
        <header className="mb-6">
          <Link
            to="/groups/$id"
            params={{ id }}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[#334155]"
          >
            <ArrowLeft className="size-4" />
            Atrás
          </Link>
          <h1 className="text-2xl font-semibold leading-8 text-[#132238]">
            Añadir gasto
          </h1>
          <p className="mt-1 text-sm text-[#64748b]">
            {groupQuery.data?.name ?? 'Grupo'}
          </p>
        </header>

        <div className="flex flex-1 flex-col gap-5">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-[#334155]">Descripción</span>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ej: Almuerzo"
              className="h-12 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-sm outline-none focus:border-primary"
            />
          </label>

          <div className="grid grid-cols-[112px_1fr] gap-3">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[#334155]">Moneda</span>
              <select
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                className="h-12 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-sm outline-none focus:border-primary"
              >
                {currencies.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[#334155]">Monto</span>
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                type="number"
                inputMode="decimal"
                min="0"
                placeholder="0"
                className="h-12 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-sm outline-none focus:border-primary"
              />
            </label>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-[#334155]">Pagado por</span>
            <select
              value={paidById}
              onChange={(event) => setPaidById(event.target.value)}
              className="h-12 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-sm outline-none focus:border-primary"
            >
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>

          <section className="rounded-2xl border border-[#e2e8f0] bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-[#132238]">
                  Participantes
                </h2>
                <p className="text-xs text-[#64748b]">
                  {participantIds.length === 0
                    ? 'Gasto personal'
                    : `${participantIds.length} personas · ${currency} ${amountPerPerson.toLocaleString('es-CO')}`}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() =>
                  setParticipantIds(
                    participantIds.length === members.length
                      ? []
                      : members.map((member) => member.id),
                  )
                }
              >
                <Users className="size-4" />
                Todos
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              {members.map((member) => {
                const selected = participantIds.includes(member.id);
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => toggleParticipant(member.id)}
                    className="flex items-center justify-between rounded-2xl bg-[#f8fafc] px-3 py-3 text-left"
                  >
                    <span className="truncate text-sm font-medium text-[#132238]">
                      {member.name}
                    </span>
                    {selected ? <Check className="size-4 text-primary" /> : null}
                  </button>
                );
              })}
            </div>
          </section>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="-mx-4 mt-auto border-t border-[#e2e8f0] bg-[#fafafa] px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
            <Button
              type="button"
              className="h-11 w-full rounded-full"
              disabled={!canSubmit || createExpenseMutation.isPending}
              onClick={handleSubmit}
            >
              {createExpenseMutation.isPending ? 'Creando...' : 'Crear gasto'}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
