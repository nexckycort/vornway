import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { ChevronDown, ChevronLeft, Info, LayoutGrid } from 'lucide-react';
import { useEffect, useState } from 'react';
import { GradientLayout } from '~/components/gradient-layout';

import { getExpense } from '../-actions/get-expense';
import { createExpense } from './-actions/create-expense';
import { getGroupMembers } from './-actions/get-group-members';
import { updateExpense } from './-actions/update-expense';

export const Route = createFileRoute('/_authed/groups/$id/add-expense/')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { expenseId?: string } => ({
    expenseId:
      typeof search.expenseId === 'string' ? search.expenseId : undefined,
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { id: groupId } = Route.useParams();
  const { expenseId } = Route.useSearch();
  const isEditMode = Boolean(expenseId);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('COP');
  const [paidById, setPaidById] = useState<string | null>(null);
  const [splitMethod, setSplitMethod] = useState<
    'equal' | 'percentage' | 'exact'
  >('equal');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    [],
  );
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [showPaidByDropdown, setShowPaidByDropdown] = useState(false);
  const [showSplitDropdown, setShowSplitDropdown] = useState(false);
  const [hasLoadedEditData, setHasLoadedEditData] = useState(false);

  const currencies = ['COP', 'USD', 'EUR', 'AED'];
  const splitMethods = [
    { value: 'equal' as const, label: 'Partes iguales' },
    { value: 'percentage' as const, label: 'Porcentaje' },
    { value: 'exact' as const, label: 'Partes desiguales' },
  ];

  const { data: membersData, isLoading: isLoadingMembers } = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: () => getGroupMembers({ data: { groupId } }),
  });
  const { data: expenseData, isLoading: isLoadingExpense } = useQuery({
    queryKey: ['expense', groupId, expenseId],
    queryFn: () =>
      getExpense({
        data: {
          groupId,
          expenseId: expenseId ?? '',
        },
      }),
    enabled: isEditMode,
  });

  const members = membersData?.members ?? [];
  const isSettlement = expenseData?.isSettlement ?? false;

  // Set default paidBy when members are loaded
  if (membersData?.currentUserMemberId && paidById === null) {
    setPaidById(membersData.currentUserMemberId);
  }

  const createExpenseMutation = useMutation({
    mutationFn: createExpense,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['group', groupId] });
        router.navigate({ to: '/groups/$id', params: { id: groupId } });
      }
    },
  });
  const updateExpenseMutation = useMutation({
    mutationFn: updateExpense,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['group', groupId] });
        if (expenseId) {
          queryClient.invalidateQueries({
            queryKey: ['expense', groupId, expenseId],
          });
        }
        router.navigate({ to: '/groups/$id', params: { id: groupId } });
      }
    },
  });

  const toggleParticipant = (id: string) => {
    if (isSettlement) return;
    if (id === 'all') {
      if (selectedParticipants.length === members.length) {
        setSelectedParticipants([]);
      } else {
        setSelectedParticipants(members.map((p) => p.id));
      }
    } else {
      setSelectedParticipants((prev) =>
        prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
      );
    }
  };

  const amountPerPerson =
    selectedParticipants.length > 0 && amount
      ? (parseFloat(amount) / selectedParticipants.length).toLocaleString(
          'es-CO',
          {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          },
        )
      : '0';

  useEffect(() => {
    if (!expenseData || hasLoadedEditData) return;

    setDescription(expenseData.description);
    setAmount(expenseData.amount.toString());
    setCurrency(expenseData.currency);
    setPaidById(expenseData.paidBy.memberId);

    const participantIds = expenseData.participants.map(
      (participant) => participant.memberId,
    );
    setSelectedParticipants(participantIds);

    if (participantIds.length > 0) {
      const firstShare = expenseData.participants[0]?.share ?? 0;
      const hasDifferentShares = expenseData.participants.some(
        (participant) => Math.abs(participant.share - firstShare) >= 0.01,
      );
      setSplitMethod(hasDifferentShares ? 'exact' : 'equal');
      setExactAmounts(
        Object.fromEntries(
          expenseData.participants.map((participant) => [
            participant.memberId,
            participant.share.toString(),
          ]),
        ),
      );
    }

    setHasLoadedEditData(true);
  }, [expenseData, hasLoadedEditData]);

  useEffect(() => {
    if (splitMethod !== 'exact') return;

    const parsedAmount = parseFloat(amount);
    const totalAmount = Number.isFinite(parsedAmount) ? parsedAmount : 0;
    const defaultPerPerson =
      selectedParticipants.length > 0
        ? totalAmount / selectedParticipants.length
        : 0;

    setExactAmounts((prev) => {
      const next: Record<string, string> = {};

      for (const participantId of selectedParticipants) {
        next[participantId] =
          prev[participantId] ??
          (defaultPerPerson > 0
            ? defaultPerPerson.toFixed(2).replace(/\.00$/, '')
            : '');
      }

      return next;
    });
  }, [splitMethod, selectedParticipants, amount]);

  const parsedAmount = parseFloat(amount);
  const totalAmount = Number.isFinite(parsedAmount) ? parsedAmount : 0;
  const exactTotal = selectedParticipants.reduce((sum, participantId) => {
    const value = parseFloat(exactAmounts[participantId] ?? '0');
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  const hasInvalidExactAmounts = selectedParticipants.some((participantId) => {
    const rawValue = exactAmounts[participantId];
    if (rawValue === undefined || rawValue === '') return true;

    const parsedValue = parseFloat(rawValue);
    return !Number.isFinite(parsedValue) || parsedValue < 0;
  });

  const isExactSplitValid =
    splitMethod !== 'exact' ||
    selectedParticipants.length === 0 ||
    (!hasInvalidExactAmounts && Math.abs(exactTotal - totalAmount) < 0.01);

  const canAdd =
    description &&
    amount &&
    parseFloat(amount) > 0 &&
    paidById !== null &&
    isExactSplitValid;

  const handleSubmit = () => {
    if (!canAdd || !paidById) return;

    const payload = {
      groupId,
      description,
      amount: parseFloat(amount),
      currency,
      paidById,
      participantIds: selectedParticipants,
      splitMethod,
      exactShares:
        splitMethod === 'exact'
          ? Object.fromEntries(
              selectedParticipants.map((participantId) => [
                participantId,
                parseFloat(exactAmounts[participantId] ?? '0'),
              ]),
            )
          : undefined,
    };

    if (isEditMode && expenseId) {
      updateExpenseMutation.mutate({
        data: {
          ...payload,
          expenseId,
        },
      });
      return;
    }

    createExpenseMutation.mutate({ data: payload });
  };

  const selectedPayer = members.find((m) => m.id === paidById);
  const selectedSplitMethod = splitMethods.find((m) => m.value === splitMethod);

  if (
    isLoadingMembers ||
    (isEditMode && isLoadingExpense && !hasLoadedEditData)
  ) {
    return (
      <GradientLayout className="native-enter flex items-center justify-center pb-8">
        <p className="text-gray-500">Cargando...</p>
      </GradientLayout>
    );
  }

  return (
    <GradientLayout className="native-enter pb-8">
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <div className="native-surface-muted flex items-center gap-3 px-3 py-2.5">
          <button
            type="button"
            onClick={() => router.history.back()}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80"
          >
            <ChevronLeft className="w-6 h-6 text-[#1a1a3e]" />
          </button>
          <h1 className="text-xl font-semibold text-[#1a1a3e]">
            {isEditMode
              ? isSettlement
                ? 'Editar liquidación'
                : 'Editar gasto'
              : 'Añadir gasto'}
          </h1>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 rounded-t-3xl border-t border-white/70 bg-white/85 px-4 pt-4 backdrop-blur-sm">
        {/* Description */}
        <div className="mb-6">
          <label htmlFor="description" className="block text-[#1a1a3e] mb-2">
            Descripción
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0"
            >
              <LayoutGrid className="w-6 h-6 text-gray-600" />
            </button>
            <input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Almuerzo, Cena, Reserva"
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-[#1a1a3e] placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Currency & Amount */}
        <div className="flex gap-4 mb-6">
          <div className="w-1/3">
            <span className="block text-[#1a1a3e] mb-2">Moneda</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                className="w-full px-4 py-3.5 bg-gray-100 rounded-xl flex items-center justify-between"
              >
                <span className="text-[#1a1a3e]">{currency}</span>
                <ChevronDown className="w-5 h-5 text-gray-500" />
              </button>
              {showCurrencyDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10">
                  {currencies.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => {
                        setCurrency(c);
                        setShowCurrencyDropdown(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1">
            <label htmlFor="amount" className="block text-[#1a1a3e] mb-2">
              Monto*
            </label>
            <input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="$0.00"
              className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-[#1a1a3e] placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Paid by & Split method */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <span className="block text-[#1a1a3e] mb-2">Pagado por</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPaidByDropdown(!showPaidByDropdown)}
                className="w-full px-4 py-3.5 bg-gray-100 rounded-xl flex items-center justify-between"
              >
                <span className="text-[#1a1a3e]">
                  {selectedPayer?.name ?? 'Seleccionar'}
                </span>
                <ChevronDown className="w-5 h-5 text-gray-500" />
              </button>
              {showPaidByDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10">
                  {members.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => {
                        setPaidById(p.id);
                        setShowPaidByDropdown(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1">
            <span className="block text-[#1a1a3e] mb-2">
              {isSettlement ? 'Tipo' : 'Dividir en'}
            </span>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  if (!isSettlement) {
                    setShowSplitDropdown(!showSplitDropdown);
                  }
                }}
                className="w-full px-4 py-3.5 bg-gray-100 rounded-xl flex items-center justify-between"
                disabled={isSettlement}
              >
                <span className="text-[#1a1a3e]">
                  {isSettlement
                    ? 'Liquidación entre miembros'
                    : selectedSplitMethod?.label ?? 'Partes iguales'}
                </span>
                <ChevronDown className="w-5 h-5 text-gray-500" />
              </button>
              {showSplitDropdown && !isSettlement && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10">
                  {splitMethods.map((m) => (
                    <button
                      type="button"
                      key={m.value}
                      onClick={() => {
                        setSplitMethod(m.value);
                        setShowSplitDropdown(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl"
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info box */}
        <div className="flex items-start gap-3 p-4 bg-[#f0f8ff] rounded-xl mb-6">
          <Info className="w-5 h-5 text-[#3498db] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-600">
            {isSettlement
              ? 'Esta edición corresponde a una liquidación. No cambia el total gastado del grupo, solo salda deuda entre miembros.'
              : splitMethod === 'exact'
              ? 'Puedes editar cuánto paga cada participante. La suma debe ser igual al monto total.'
              : 'Se dividira el monto total en partes iguales y todos pagan lo mismo de este gasto'}
          </p>
        </div>

        {/* Split with */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-[#1a1a3e]">Se divide con</p>
            <span className="text-sm text-gray-500">
              {selectedParticipants.length === 0
                ? 'Gasto personal'
                : selectedParticipants.length === members.length
                  ? 'Todos'
                  : `${selectedParticipants.length} participante${selectedParticipants.length > 1 ? 's' : ''}`}
            </span>
          </div>

          {/* Select all */}
          {!isSettlement && (
            <button
              type="button"
              onClick={() => toggleParticipant('all')}
              className="w-full flex items-center gap-4 py-3"
            >
              <div
                className={`w-6 h-6 border-2 rounded-lg flex items-center justify-center ${
                  selectedParticipants.length === members.length
                    ? 'bg-[#4040b0] border-[#4040b0]'
                    : 'border-gray-300'
                }`}
              >
                {selectedParticipants.length === members.length && (
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              <span className="text-[#1a1a3e]">Todos</span>
            </button>
          )}

          {/* Participants */}
          {members.map((participant) => (
            <div
              key={participant.id}
              className="w-full flex items-center gap-3 py-3"
            >
              <button
                type="button"
                onClick={() => toggleParticipant(participant.id)}
                disabled={isSettlement}
                className="flex-1 flex items-center gap-4"
              >
                <div
                  className={`w-6 h-6 border-2 rounded-lg flex items-center justify-center ${
                    selectedParticipants.includes(participant.id)
                      ? 'bg-[#4040b0] border-[#4040b0]'
                      : 'border-gray-300'
                  }`}
                >
                  {selectedParticipants.includes(participant.id) && (
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <span className="flex-1 text-left text-[#1a1a3e]">
                  {participant.name}
                </span>
                {splitMethod !== 'exact' && (
                  <span className="text-[#1a1a3e]">
                    $
                    {selectedParticipants.includes(participant.id)
                      ? amountPerPerson
                      : '0'}
                  </span>
                )}
              </button>

              {splitMethod === 'exact' && (
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={exactAmounts[participant.id] ?? ''}
                  onChange={(e) =>
                    setExactAmounts((prev) => ({
                      ...prev,
                      [participant.id]: e.target.value,
                    }))
                  }
                  disabled={!selectedParticipants.includes(participant.id)}
                  className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-right text-[#1a1a3e] disabled:bg-gray-100 disabled:text-gray-400"
                  placeholder="0"
                />
              )}
            </div>
          ))}

          {splitMethod === 'exact' &&
            selectedParticipants.length > 0 &&
            (() => {
              const difference = exactTotal - totalAmount;
              const absDifference = Math.abs(difference).toLocaleString(
                'es-CO',
                { maximumFractionDigits: 2 },
              );

              if (Math.abs(difference) < 0.01) {
                return (
                  <p className="mt-2 text-sm text-green-600">
                    Monto distribuido correctamente
                  </p>
                );
              }

              if (difference > 0) {
                return (
                  <p className="mt-2 text-sm text-red-500">
                    Excede en ${absDifference} el monto total
                  </p>
                );
              }

              return (
                <p className="mt-2 text-sm text-gray-500">
                  Faltan ${absDifference} para completar el monto
                </p>
              );
            })()}
        </div>
      </div>

      {/* Bottom buttons */}
      <div className="px-4 py-6 flex items-center gap-4 border-t border-black/5 bg-white/90 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => router.history.back()}
          className="flex-1 py-4 text-[#1a1a3e] font-medium"
        >
          Volver
        </button>
        <button
          type="button"
          disabled={
            !canAdd ||
            createExpenseMutation.isPending ||
            updateExpenseMutation.isPending
          }
          onClick={handleSubmit}
          className={`flex-1 py-4 font-medium rounded-2xl transition-colors ${
            canAdd &&
            !createExpenseMutation.isPending &&
            !updateExpenseMutation.isPending
              ? 'bg-[#4040b0] text-white'
              : 'bg-gray-200 text-gray-400'
          }`}
        >
          {createExpenseMutation.isPending || updateExpenseMutation.isPending
            ? isEditMode
              ? 'Guardando...'
              : 'Añadiendo...'
            : isEditMode
              ? isSettlement
                ? 'Guardar liquidación'
                : 'Guardar cambios'
              : 'Añadir'}
        </button>
      </div>

      {/* Error message */}
      {(createExpenseMutation.data?.error ||
        updateExpenseMutation.data?.error) && (
        <div className="px-4 pb-4">
          <p className="text-red-500 text-sm text-center">
            {createExpenseMutation.data?.error ??
              updateExpenseMutation.data?.error}
          </p>
        </div>
      )}
    </GradientLayout>
  );
}
