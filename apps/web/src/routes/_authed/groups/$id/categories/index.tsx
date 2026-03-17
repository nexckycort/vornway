import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import {
  Cell,
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChevronLeft,
  FolderPlus,
  PieChart as PieChartIcon,
  ReceiptText,
  TrendingUp,
} from 'lucide-react';
import { useState } from 'react';

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
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

function RouteComponent() {
  const { id: groupId } = Route.useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [categoryName, setCategoryName] = useState('');

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
      <div className="flex min-h-screen items-center justify-center bg-[#f3f4fa]">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f3f4fa] p-6">
        <p className="mb-6 text-gray-500">
          {error instanceof Error
            ? error.message
            : 'No se pudieron cargar las categorías'}
        </p>
        <button
          type="button"
          onClick={() => router.history.back()}
          className="rounded-xl bg-[#2f5fd0] px-6 py-3 text-white"
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

  const primaryChartEntries = primaryCurrency
    ? data.categories
        .map((category) => ({
          id: category.id ?? 'uncategorized',
          name: category.name,
          amount: category.totals[primaryCurrency] ?? 0,
        }))
        .filter((entry) => entry.amount > 0)
        .sort((a, b) => b.amount - a.amount)
    : [];

  const primaryTotal = primaryChartEntries.reduce(
    (sum, entry) => sum + entry.amount,
    0,
  );
  const topCategory = primaryChartEntries[0] ?? null;

  let progress = 0;
  const pieData = primaryChartEntries.map((entry, index) => {
    const slice = primaryTotal > 0 ? (entry.amount / primaryTotal) * 100 : 0;
    progress += slice;
    return {
      ...entry,
      fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      share: slice,
    };
  });

  const pieConfig = primaryChartEntries.reduce((config, entry, index) => {
    config[entry.id] = {
      label: entry.name,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    };
    return config;
  }, {} as ChartConfig);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#edf4ff_0%,#f7f1ea_38%,#f6f7fb_100%)] pb-12">
      <div className="px-4 pt-4 pb-3">
        <div className="rounded-[28px] border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur-md">
          <div className="mb-5 flex items-start gap-3">
            <button
              type="button"
              onClick={() => router.history.back()}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white"
            >
              <ChevronLeft className="h-6 w-6 text-[#1a1a3e]" />
            </button>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#56708f]">
                Analítica del grupo
              </p>
              <h1 className="truncate text-2xl font-semibold text-[#14213d]">
                Gastos por categoría
              </h1>
              <p className="text-sm text-[#5d6b7b]">{data.groupName}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-[#14213d] px-4 py-3 text-white">
              <p className="text-xs uppercase tracking-wide text-white/65">
                Categorías
              </p>
              <p className="mt-2 text-2xl font-semibold">{categoryCount}</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-[#7b8794]">
                Gastos
              </p>
              <p className="mt-2 text-2xl font-semibold text-[#14213d]">
                {totalExpenses}
              </p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-[#7b8794]">
                Top
              </p>
              <p className="mt-2 truncate text-sm font-semibold text-[#14213d]">
                {topCategory?.name ?? 'Sin datos'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4">
        <div className="rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur-md">
          <div className="mb-3 flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-[#2f5fd0]" />
            <h2 className="font-semibold text-[#14213d]">Crear categoría</h2>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
              placeholder="Ej. Transporte, Comida, Hospedaje"
              className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[#14213d] placeholder:text-gray-400"
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
              className="rounded-2xl bg-[#2f5fd0] px-5 py-3 font-medium text-white disabled:bg-gray-200 disabled:text-gray-400"
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
      </div>

      {primaryCurrency && primaryChartEntries.length > 0 ? (
        <div className="mt-5 px-4">
          <div className="rounded-[30px] border border-white/70 bg-[#14213d] p-5 text-white shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
                  <PieChartIcon className="h-3.5 w-3.5" />
                  Distribución principal
                </div>
                <h2 className="text-xl font-semibold">
                  Participación por categoría
                </h2>
                <p className="text-sm text-white/65">
                  Moneda dominante: {primaryCurrency}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-white/60">
                  Total
                </p>
                <p className="text-lg font-semibold">
                  {formatMoney(primaryTotal, primaryCurrency)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-[220px_1fr]">
              <div className="flex flex-col items-center justify-center">
                <ChartContainer
                  config={pieConfig}
                  className="mx-auto aspect-square h-[220px] w-full max-w-[220px]"
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
                                  {formatMoney(payload.amount, primaryCurrency)}
                                </span>
                              </div>
                            );
                          }}
                        />
                      }
                    />
                    <Pie
                      data={pieData}
                      dataKey="amount"
                      nameKey="id"
                      innerRadius={58}
                      outerRadius={88}
                      strokeWidth={2}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.id} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartLegend
                      content={<ChartLegendContent nameKey="id" className="flex-wrap" />}
                    />
                  </PieChart>
                </ChartContainer>
                <div className="-mt-2 text-center">
                  <p className="text-xs uppercase tracking-wide text-white/50">
                    Top
                  </p>
                  <p className="mt-1 max-w-[160px] truncate text-sm font-semibold">
                    {topCategory?.name ?? 'Sin datos'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {primaryChartEntries.map((entry, index) => {
                  const share =
                    primaryTotal > 0 ? (entry.amount / primaryTotal) * 100 : 0;
                  const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];

                  return (
                    <div key={entry.id} className="rounded-2xl bg-white/8 px-4 py-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <p className="font-medium">{entry.name}</p>
                        </div>
                        <p className="text-sm font-semibold">
                          {formatMoney(entry.amount, primaryCurrency)}
                        </p>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${share}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-white/55">
                        {share.toFixed(1)}% del total en {primaryCurrency}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {currencyEntries.length > 0 ? (
        <div className="mt-5 px-4">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#2f5fd0]" />
            <h2 className="text-lg font-semibold text-[#14213d]">
              Barras por moneda
            </h2>
          </div>

          <div className="space-y-4">
            {currencyEntries.map(([currency, total]) => {
              const entries = data.categories
                .map((category) => ({
                  id: category.id ?? 'uncategorized',
                  name: category.name,
                  amount: category.totals[currency] ?? 0,
                }))
                .filter((entry) => entry.amount > 0)
                .sort((a, b) => b.amount - a.amount);

              const barConfig = entries.reduce((config, entry, index) => {
                config[entry.id] = {
                  label: entry.name,
                  color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                };
                return config;
              }, {} as ChartConfig);

              return (
                <div
                  key={currency}
                  className="rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur-md"
                >
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-[#7b8794]">
                        Moneda
                      </p>
                      <h3 className="text-xl font-semibold text-[#14213d]">
                        {currency}
                      </h3>
                    </div>
                    <p className="text-lg font-semibold text-[#14213d]">
                      {formatMoney(total, currency)}
                    </p>
                  </div>

                  <ChartContainer
                    config={barConfig}
                    className="h-[240px] w-full"
                  >
                    <BarChart
                      accessibilityLayer
                      data={entries}
                      layout="vertical"
                      margin={{ left: 10, right: 10, top: 8, bottom: 8 }}
                    >
                      <CartesianGrid horizontal={false} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tickLine={false}
                        axisLine={false}
                        width={90}
                      />
                      <XAxis dataKey="amount" type="number" hide />
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
                                    {formatMoney(payload.amount, currency)}
                                  </span>
                                </div>
                              );
                            }}
                          />
                        }
                      />
                      <Bar dataKey="amount" radius={8}>
                        {entries.map((entry, index) => (
                          <Cell
                            key={entry.id}
                            fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-5 space-y-5 px-4">
        {data.categories.map((category) => (
          <section key={category.id ?? 'uncategorized'}>
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[#14213d]">
                  {category.name}
                </h2>
                <p className="text-sm text-[#68768a]">
                  {category.expenseCount} gasto
                  {category.expenseCount === 1 ? '' : 's'}
                </p>
              </div>
              <div className="text-right">
                {Object.entries(category.totals).map(([currency, amount]) => (
                  <p key={currency} className="font-semibold text-[#14213d]">
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
                    className="w-full rounded-[26px] border border-white/70 bg-white/90 px-4 py-4 text-left shadow-sm"
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
                        <p className="truncate font-medium text-[#14213d]">
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

                      <div className="text-right">
                        <p className="font-semibold text-[#14213d]">
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
  );
}
