import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { Bar, BarChart, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';
import {
  ChevronLeft,
  FolderPlus,
  PieChart as PieChartIcon,
  ReceiptText,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@workspace/ui/components/chart';
import { formatMoney } from '~/lib/money';

import { createExpenseCategory } from '../-actions/create-expense-category';
import { getCategoryBreakdown } from '../-actions/get-category-breakdown';

export const Route = createFileRoute('/_authed/groups/$id/categories/')({
  component: RouteComponent,
});

const CATEGORY_COLORS = [
  '#0f766e',
  '#2563eb',
  '#f97316',
  '#e11d48',
  '#7c3aed',
  '#0891b2',
  '#65a30d',
  '#ca8a04',
];

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

function shortenLabel(value: string) {
  return value.length > 12 ? `${value.slice(0, 12)}…` : value;
}

function RouteComponent() {
  const { id: groupId } = Route.useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [categoryName, setCategoryName] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['category-breakdown', groupId],
    queryFn: () => getCategoryBreakdown({ data: { groupId } }),
  });

  const createCategoryMutation = useMutation({
    mutationFn: createExpenseCategory,
    onSuccess: (result) => {
      if (result.success) {
        setCategoryName('');
        queryClient.invalidateQueries({
          queryKey: ['category-breakdown', groupId],
        });
        queryClient.invalidateQueries({
          queryKey: ['group-categories', groupId],
        });
      }
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f5f8]">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f4f5f8] p-6">
        <p className="mb-6 text-center text-gray-500">
          {error instanceof Error
            ? error.message
            : 'No se pudieron cargar las categorías'}
        </p>
        <button
          type="button"
          onClick={() => router.history.back()}
          className="rounded-2xl bg-[#1f4ed8] px-6 py-3 text-white"
        >
          Volver
        </button>
      </div>
    );
  }

  const categoryCount = data.categories.filter((category) => category.id).length;
  const totalExpenses = data.categories.reduce(
    (sum, category) => sum + category.expenseCount,
    0,
  );

  const currencyTotals = new Map<string, number>();
  for (const category of data.categories) {
    for (const [currency, amount] of Object.entries(category.totals)) {
      currencyTotals.set(currency, (currencyTotals.get(currency) ?? 0) + amount);
    }
  }

  const currencyEntries = Array.from(currencyTotals.entries()).sort(
    (a, b) => b[1] - a[1],
  );
  const primaryCurrency = currencyEntries[0]?.[0] ?? null;
  const activeCurrency = selectedCurrency ?? primaryCurrency;

  useEffect(() => {
    if (!currencyEntries.length) {
      setSelectedCurrency(null);
      return;
    }

    if (
      !selectedCurrency ||
      !currencyEntries.some(([currency]) => currency === selectedCurrency)
    ) {
      setSelectedCurrency(currencyEntries[0][0]);
    }
  }, [currencyEntries, selectedCurrency]);

  const categorySeries = activeCurrency
    ? data.categories
        .map((category, index) => ({
          id: category.id ?? 'uncategorized',
          name: category.name,
          shortName: shortenLabel(category.name),
          amount: category.totals[activeCurrency] ?? 0,
          fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
        }))
        .sort((a, b) => b.amount - a.amount)
    : [];

  const topCategory = categorySeries[0] ?? null;
  const totalPrimaryAmount = categorySeries.reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const chartData = categorySeries.slice(0, 6);

  const chartConfig = chartData.reduce((config, item) => {
    config[item.id] = {
      label: item.name,
      color: item.fill,
    };
    return config;
  }, {} as ChartConfig);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f3f7ff_0%,#f8f4ec_42%,#f5f6fa_100%)] pb-12">
      <div className="mx-auto w-full max-w-md px-4 pt-4">
        <div className="rounded-[28px] border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur-md">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => router.history.back()}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eef3ff]"
            >
              <ChevronLeft className="h-6 w-6 text-[#1a1a3e]" />
            </button>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#6b7a90]">
                Resumen visual
              </p>
              <h1 className="truncate text-2xl font-semibold text-[#132238]">
                Categorías
              </h1>
              <p className="text-sm text-[#68768a]">{data.groupName}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[#132238] px-4 py-3 text-white">
              <p className="text-[11px] uppercase tracking-wide text-white/60">
                Categorías
              </p>
              <p className="mt-1 text-2xl font-semibold">{categoryCount}</p>
            </div>
            <div className="rounded-2xl bg-[#eef3ff] px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-[#6b7a90]">
                Gastos
              </p>
              <p className="mt-1 text-2xl font-semibold text-[#132238]">
                {totalExpenses}
              </p>
            </div>
            <div className="col-span-2 rounded-2xl bg-white px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-[#6b7a90]">
                Categoría líder
              </p>
              <p className="mt-1 truncate text-base font-semibold text-[#132238]">
                {topCategory?.name ?? 'Sin datos'}
              </p>
              {primaryCurrency && totalPrimaryAmount > 0 ? (
                <p className="mt-1 text-sm text-[#68768a]">
                  {formatMoney(totalPrimaryAmount, primaryCurrency)} en{' '}
                  {primaryCurrency}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-[28px] border border-white/70 bg-white/90 p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-[#1f4ed8]" />
            <h2 className="font-semibold text-[#132238]">Crear categoría</h2>
          </div>
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
              placeholder="Ej. Transporte, Comida, Hospedaje"
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[#132238] placeholder:text-gray-400"
            />
            <button
              type="button"
              onClick={() =>
                createCategoryMutation.mutate({
                  data: {
                    groupId,
                    name: categoryName,
                  },
                })
              }
              disabled={!categoryName.trim() || createCategoryMutation.isPending}
              className="rounded-2xl bg-[#1f4ed8] px-5 py-3 font-medium text-white disabled:bg-gray-200 disabled:text-gray-400"
            >
              Crear
            </button>
          </div>
          {createCategoryMutation.data?.error ? (
            <p className="mt-3 text-sm text-red-500">
              {createCategoryMutation.data.error}
            </p>
          ) : null}
        </div>

        {activeCurrency && chartData.some((item) => item.amount > 0) ? (
          <>
            <div className="mt-4 overflow-hidden rounded-[30px] bg-[#132238] p-4 text-white shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <PieChartIcon className="h-4 w-4" />
                <p className="text-sm font-medium text-white/80">
                  Distribución en {activeCurrency}
                </p>
              </div>
              {currencyEntries.length > 1 ? (
                <div className="mb-3 flex flex-wrap gap-2">
                  {currencyEntries.map(([currency]) => (
                    <button
                      key={currency}
                      type="button"
                      onClick={() => setSelectedCurrency(currency)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        currency === activeCurrency
                          ? 'bg-white text-[#132238]'
                          : 'bg-white/10 text-white/80'
                      }`}
                    >
                      {currency}
                    </button>
                  ))}
                </div>
              ) : null}
              <ChartContainer
                config={chartConfig}
                className="h-[220px] w-full"
              >
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        formatter={(_, __, item) => {
                          const payload = item.payload as {
                            amount: number;
                            name: string;
                          };
                          return (
                            <div className="flex min-w-32 items-center justify-between gap-3">
                              <span>{payload.name}</span>
                              <span className="font-semibold">
                                {formatMoney(payload.amount, activeCurrency)}
                              </span>
                            </div>
                          );
                        }}
                      />
                    }
                  />
                  <Pie
                    data={chartData}
                    dataKey="amount"
                    nameKey="id"
                    innerRadius={52}
                    outerRadius={84}
                    strokeWidth={2}
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.id} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>

              <div className="mt-3 space-y-2">
                {chartData.filter((entry) => entry.amount > 0).map((entry) => {
                  const share =
                    totalPrimaryAmount > 0
                      ? (entry.amount / totalPrimaryAmount) * 100
                      : 0;

                  return (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-white/8 px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: entry.fill }}
                        />
                        <p className="truncate text-sm font-medium">
                          {entry.name}
                        </p>
                      </div>
                      <p className="shrink-0 text-xs text-white/70">
                        {share.toFixed(1)}%
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-[30px] border border-white/70 bg-white/90 p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#1f4ed8]" />
                <p className="text-sm font-medium text-[#132238]">
                  Comparación por categoría en {activeCurrency}
                </p>
              </div>
              <ChartContainer
                config={chartConfig}
                className="h-[260px] w-full"
              >
                <BarChart
                  accessibilityLayer
                  data={chartData}
                  margin={{ top: 10, right: 8, left: -18, bottom: 0 }}
                >
                  <XAxis
                    dataKey="shortName"
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    tickMargin={8}
                    fontSize={11}
                  />
                  <YAxis hide />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        hideLabel
                        formatter={(_, __, item) => {
                          const payload = item.payload as {
                            amount: number;
                            name: string;
                          };
                          return (
                            <div className="flex min-w-32 items-center justify-between gap-3">
                              <span>{payload.name}</span>
                              <span className="font-semibold">
                                {formatMoney(payload.amount, activeCurrency)}
                              </span>
                            </div>
                          );
                        }}
                      />
                    }
                  />
                  <Bar dataKey="amount" radius={[10, 10, 0, 0]}>
                    {chartData.map((entry) => (
                      <Cell key={entry.id} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
              <div className="mt-3 space-y-2">
                {categorySeries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-[#f5f7fb] px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: entry.fill }}
                      />
                      <p className="truncate text-sm font-medium text-[#132238]">
                        {entry.name}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-[#132238]">
                      {formatMoney(entry.amount, activeCurrency)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}

        <div className="mt-5 space-y-5">
          {data.categories.map((category) => (
            <section key={category.id ?? 'uncategorized'}>
              <div className="mb-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold text-[#132238]">
                    {category.name}
                  </h2>
                  <p className="text-sm text-[#68768a]">
                    {category.expenseCount} gasto
                    {category.expenseCount === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {Object.entries(category.totals).map(([currency, amount]) => (
                    <p key={currency} className="font-semibold text-[#132238]">
                      {formatMoney(amount, currency)}
                    </p>
                  ))}
                </div>
              </div>

              {category.expenses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white/80 p-4 text-sm text-gray-500">
                  Sin gastos en esta categoría
                </div>
              ) : (
                <div className="space-y-3">
                  {category.expenses.map((expense) => (
                    <button
                      key={expense.id}
                      type="button"
                      onClick={() =>
                        router.navigate({
                          to: '/groups/$id/expense/$expenseId',
                          params: { id: groupId, expenseId: expense.id },
                        })
                      }
                      className="w-full rounded-[24px] border border-white/70 bg-white/95 px-4 py-4 text-left shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                            expense.expenseType === 'composite'
                              ? 'bg-blue-100'
                              : 'bg-[#eef3ff]'
                          }`}
                        >
                          <span className="text-lg">
                            {expense.expenseType === 'composite' ? '🧾' : '💰'}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-[#132238]">
                            {expense.description}
                          </p>
                          <p className="mt-1 text-sm text-[#68768a]">
                            {formatDate(expense.date)} · Pagó {expense.paidByName}
                          </p>
                          {expense.expenseType === 'composite' ? (
                            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                              <ReceiptText className="h-3 w-3" />
                              {expense.subExpenseCount} subgasto
                              {expense.subExpenseCount === 1 ? '' : 's'}
                            </div>
                          ) : null}
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="font-semibold text-[#132238]">
                            {formatMoney(expense.amount, expense.currency)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
