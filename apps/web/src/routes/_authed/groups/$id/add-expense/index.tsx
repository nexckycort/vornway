import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import {
  ChevronDown,
  ChevronLeft,
  Info,
  Plus,
  ReceiptText,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { GradientLayout } from '~/components/gradient-layout';
import {
  type CompositeExpenseItem,
  sumCompositeExpenseItems,
} from '~/lib/expense-metadata';

import { getExpense } from '../-actions/get-expense';
import { getGroupCategories } from '../-actions/get-group-categories';
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

function createCompositeItemId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `subexpense-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function RouteComponent() {
  const { id: groupId } = Route.useParams();
  const { expenseId } = Route.useSearch();
  const isEditMode = Boolean(expenseId);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('COP');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [paidById, setPaidById] = useState<string | null>(null);
  const [expenseType, setExpenseType] = useState<'standard' | 'composite'>(
    'standard',
  );
  const [splitMethod, setSplitMethod] = useState<
    'equal' | 'percentage' | 'exact'
  >('equal');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    [],
  );
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});
  const [compositeItems, setCompositeItems] = useState<CompositeExpenseItem[]>(
    [],
  );
  const [newCompositeItemDescription, setNewCompositeItemDescription] =
    useState('');
  const [newCompositeItemAmount, setNewCompositeItemAmount] = useState('');
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showPaidByDropdown, setShowPaidByDropdown] = useState(false);
  const [showSplitDropdown, setShowSplitDropdown] = useState(false);
  const [showExpenseTypeDropdown, setShowExpenseTypeDropdown] = useState(false);
  const [hasLoadedEditData, setHasLoadedEditData] = useState(false);

  const currencies = ['COP', 'USD', 'EUR', 'AED'];
  const expenseTypes = [
    { value: 'standard' as const, label: 'Gasto normal' },
    { value: 'composite' as const, label: 'Bolsa de gastos' },
  ];
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
  const { data: categoriesData } = useQuery({
    queryKey: ['group-categories', groupId],
    queryFn: () => getGroupCategories({ data: { groupId } }),
  });

  const members = membersData?.members ?? [];
  const categories = categoriesData?.categories ?? [];
  const isSettlement = expenseData?.isSettlement ?? false;
  const isComposite = expenseType === 'composite';

  if (membersData?.currentUserMemberId && paidById === null) {
    setPaidById(membersData.currentUserMemberId);
  }

  const createExpenseMutation = useMutation({
    mutationFn: createExpense,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['group', groupId] });
        router.history.back();
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
        router.history.back();
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
    setCategoryId(expenseData.category?.id ?? null);
    setPaidById(expenseData.paidBy.memberId);
    setExpenseType(expenseData.expenseType);
    setCompositeItems(expenseData.compositeItems);

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
    if (!isComposite) return;

    const nextAmount = sumCompositeExpenseItems(compositeItems);
    setAmount(nextAmount > 0 ? nextAmount.toString() : '');
  }, [isComposite, compositeItems]);

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

  const canAddCompositeItem =
    newCompositeItemDescription.trim().length > 0 &&
    Number.isFinite(parseFloat(newCompositeItemAmount)) &&
    parseFloat(newCompositeItemAmount) > 0;

  const canAdd =
    description &&
    amount &&
    parseFloat(amount) > 0 &&
    paidById !== null &&
    isExactSplitValid &&
    (!isComposite || compositeItems.length > 0);

  const addCompositeItem = () => {
    if (!canAddCompositeItem) return;

    setCompositeItems((prev) => [
      ...prev,
      {
        id: createCompositeItemId(),
        description: newCompositeItemDescription.trim(),
        amount: parseFloat(newCompositeItemAmount),
        createdAt: new Date().toISOString(),
      },
    ]);
    setNewCompositeItemDescription('');
    setNewCompositeItemAmount('');
  };

  const removeCompositeItem = (itemId: string) => {
    setCompositeItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleSubmit = () => {
    if (!canAdd || !paidById) return;

    const payload = {
      groupId,
      categoryId: categoryId ?? undefined,
      description,
      amount: parseFloat(amount),
      currency,
      paidById,
      participantIds: selectedParticipants,
      expenseType,
      compositeItems: isComposite ? compositeItems : undefined,
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
  const selectedCategory = categories.find((category) => category.id === categoryId);
  const selectedExpenseType = expenseTypes.find((m) => m.value === expenseType);
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
      <div className="px-4 pt-5 pb-3 lg:mx-auto lg:max-w-4xl lg:px-6 lg:pt-6">
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

      <div className="flex-1 rounded-t-3xl border-t border-white/70 bg-white/85 px-4 pt-4 backdrop-blur-sm lg:mx-auto lg:max-w-4xl lg:px-6 lg:pt-6">
        <div className="mb-6">
          <label htmlFor="description" className="mb-2 block text-[#1a1a3e]">
            Descripción
          </label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej. Almuerzo, Caja chica, Reserva"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[#1a1a3e] placeholder:text-gray-400"
          />
        </div>

        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="block text-[#1a1a3e]">Categoría</span>
            <button
              type="button"
              onClick={() =>
                router.navigate({
                  to: '/groups/$id/categories',
                  params: { id: groupId },
                })
              }
              className="text-sm font-medium text-[#4040b0]"
            >
              Gestionar
            </button>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="flex w-full items-center justify-between rounded-xl bg-gray-100 px-4 py-3.5"
            >
              <span className="text-[#1a1a3e]">
                {selectedCategory?.name ?? 'Sin categoría'}
              </span>
              <ChevronDown className="h-5 w-5 text-gray-500" />
            </button>
            {showCategoryDropdown && (
              <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-xl border border-gray-200 bg-white shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setCategoryId(null);
                    setShowCategoryDropdown(false);
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50"
                >
                  Sin categoría
                </button>
                {categories.map((category) => (
                  <button
                    type="button"
                    key={category.id}
                    onClick={() => {
                      setCategoryId(category.id);
                      setShowCategoryDropdown(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50"
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mb-6 flex gap-4">
          <div className="w-1/3">
            <span className="mb-2 block text-[#1a1a3e]">Moneda</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                className="flex w-full items-center justify-between rounded-xl bg-gray-100 px-4 py-3.5"
              >
                <span className="text-[#1a1a3e]">{currency}</span>
                <ChevronDown className="h-5 w-5 text-gray-500" />
              </button>
              {showCurrencyDropdown && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-xl border border-gray-200 bg-white shadow-lg">
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
            <label htmlFor="amount" className="mb-2 block text-[#1a1a3e]">
              {isComposite ? 'Total acumulado*' : 'Monto*'}
            </label>
            <input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="$0.00"
              disabled={isComposite}
              className="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-[#1a1a3e] placeholder:text-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
        </div>

        <div className="mb-6 flex gap-4">
          <div className="flex-1">
            <span className="mb-2 block text-[#1a1a3e]">Tipo de gasto</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  if (!isSettlement) {
                    setShowExpenseTypeDropdown(!showExpenseTypeDropdown);
                  }
                }}
                className="flex w-full items-center justify-between rounded-xl bg-gray-100 px-4 py-3.5"
                disabled={isSettlement}
              >
                <span className="text-[#1a1a3e]">
                  {isSettlement
                    ? 'Liquidación entre miembros'
                    : (selectedExpenseType?.label ?? 'Gasto normal')}
                </span>
                <ChevronDown className="h-5 w-5 text-gray-500" />
              </button>
              {showExpenseTypeDropdown && !isSettlement && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-xl border border-gray-200 bg-white shadow-lg">
                  {expenseTypes.map((type) => (
                    <button
                      type="button"
                      key={type.value}
                      onClick={() => {
                        setExpenseType(type.value);
                        setShowExpenseTypeDropdown(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl"
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1">
            <span className="mb-2 block text-[#1a1a3e]">Pagado por</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPaidByDropdown(!showPaidByDropdown)}
                className="flex w-full items-center justify-between rounded-xl bg-gray-100 px-4 py-3.5"
              >
                <span className="text-[#1a1a3e]">
                  {selectedPayer?.name ?? 'Seleccionar'}
                </span>
                <ChevronDown className="h-5 w-5 text-gray-500" />
              </button>
              {showPaidByDropdown && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-xl border border-gray-200 bg-white shadow-lg">
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
                      <span className="block truncate text-[#1a1a3e]">
                        {p.name}
                      </span>
                      <span className="block truncate text-xs text-gray-500">
                        {p.email ?? 'Sin cuenta vinculada'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <span className="mb-2 block text-[#1a1a3e]">
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
              className="flex w-full items-center justify-between rounded-xl bg-gray-100 px-4 py-3.5"
              disabled={isSettlement}
            >
              <span className="text-[#1a1a3e]">
                {isSettlement
                  ? 'Liquidación entre miembros'
                  : (selectedSplitMethod?.label ?? 'Partes iguales')}
              </span>
              <ChevronDown className="h-5 w-5 text-gray-500" />
            </button>
            {showSplitDropdown && !isSettlement && (
              <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-xl border border-gray-200 bg-white shadow-lg">
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

        <div className="mb-6 flex items-start gap-3 rounded-xl bg-[#f0f8ff] p-4">
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#3498db]" />
          <p className="text-sm text-gray-600">
            {isSettlement
              ? 'Esta edición corresponde a una liquidación. No cambia el total gastado del grupo, solo salda deuda entre miembros.'
              : isComposite
                ? 'Esta bolsa de gastos te permite registrar compras pequeñas dentro de un mismo gasto. El total se recalcula automáticamente.'
                : splitMethod === 'exact'
                  ? 'Puedes editar cuánto paga cada participante. La suma debe ser igual al monto total.'
                  : 'Se dividira el monto total en partes iguales y todos pagan lo mismo de este gasto'}
          </p>
        </div>

        {isComposite && !isSettlement && (
          <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef2ff]">
                  <ReceiptText className="h-5 w-5 text-[#4040b0]" />
                </div>
                <div>
                  <p className="font-semibold text-[#1a1a3e]">
                    Subgastos del viaje
                  </p>
                  <p className="text-sm text-gray-500">
                    {compositeItems.length} movimiento
                    {compositeItems.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              <p className="text-right font-semibold text-[#1a1a3e]">
                $
                {sumCompositeExpenseItems(compositeItems).toLocaleString(
                  'es-CO',
                )}
              </p>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px_auto]">
              <input
                type="text"
                value={newCompositeItemDescription}
                onChange={(e) => setNewCompositeItemDescription(e.target.value)}
                placeholder="Ej. Chicle, agua, snack"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[#1a1a3e] placeholder:text-gray-400"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={newCompositeItemAmount}
                onChange={(e) => setNewCompositeItemAmount(e.target.value)}
                placeholder="$0"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[#1a1a3e] placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={addCompositeItem}
                disabled={!canAddCompositeItem}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4040b0] px-4 py-3 font-medium text-white disabled:bg-gray-200 disabled:text-gray-400"
              >
                <Plus className="h-4 w-4" />
                Agregar
              </button>
            </div>

            {compositeItems.length === 0 ? (
              <p className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-500">
                Aun no hay subgastos. Agrega compras pequeñas para acumularlas
                dentro de este gasto.
              </p>
            ) : (
              <div className="space-y-2">
                {compositeItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-[#1a1a3e]">
                        {item.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        Registrado{' '}
                        {new Date(item.createdAt).toLocaleDateString('es-CO')}
                      </p>
                    </div>
                    <p className="font-semibold text-[#1a1a3e]">
                      ${item.amount.toLocaleString('es-CO')}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeCompositeItem(item.id)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500"
                      aria-label={`Eliminar ${item.description}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="font-semibold text-[#1a1a3e]">Se divide con</p>
            <span className="text-sm text-gray-500">
              {selectedParticipants.length === 0
                ? 'Gasto personal'
                : selectedParticipants.length === members.length
                  ? 'Todos'
                  : `${selectedParticipants.length} participante${selectedParticipants.length > 1 ? 's' : ''}`}
            </span>
          </div>

          {!isSettlement && (
            <button
              type="button"
              onClick={() => toggleParticipant('all')}
              className="flex w-full items-center gap-4 py-3"
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-lg border-2 ${
                  selectedParticipants.length === members.length
                    ? 'border-[#4040b0] bg-[#4040b0]'
                    : 'border-gray-300'
                }`}
              >
                {selectedParticipants.length === members.length && (
                  <svg
                    className="h-4 w-4 text-white"
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

          {members.map((participant) => (
            <div
              key={participant.id}
              className="flex w-full items-center gap-3 py-3"
            >
              <button
                type="button"
                onClick={() => toggleParticipant(participant.id)}
                disabled={isSettlement}
                className="flex flex-1 items-center gap-4"
              >
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-lg border-2 ${
                    selectedParticipants.includes(participant.id)
                      ? 'border-[#4040b0] bg-[#4040b0]'
                      : 'border-gray-300'
                  }`}
                >
                  {selectedParticipants.includes(participant.id) && (
                    <svg
                      className="h-4 w-4 text-white"
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
                <span className="min-w-0 flex-1 text-left text-[#1a1a3e]">
                  <span className="block truncate">{participant.name}</span>
                  <span className="block truncate text-xs text-gray-500">
                    {participant.email ?? 'Sin cuenta vinculada'}
                  </span>
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
                  className="w-28 rounded-lg border border-gray-200 px-3 py-2 text-right text-[#1a1a3e] disabled:bg-gray-100 disabled:text-gray-400"
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

      <div className="border-t border-black/5 bg-white/90 px-4 py-6 backdrop-blur-xl lg:mx-auto lg:max-w-4xl lg:px-6 flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.history.back()}
          className="flex-1 py-4 font-medium text-[#1a1a3e]"
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
          className={`flex-1 rounded-2xl py-4 font-medium transition-colors ${
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

      {(createExpenseMutation.data?.error ||
        updateExpenseMutation.data?.error) && (
        <div className="px-4 pb-4 lg:mx-auto lg:max-w-4xl lg:px-6">
          <p className="text-center text-sm text-red-500">
            {createExpenseMutation.data?.error ??
              updateExpenseMutation.data?.error}
          </p>
        </div>
      )}
    </GradientLayout>
  );
}
