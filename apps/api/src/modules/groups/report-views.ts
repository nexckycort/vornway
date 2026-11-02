import type {
  ReportsBalances,
  ReportsShares,
  ReportsTotals,
} from '@vornway/contracts/modules/groups/report-schemas';
import { readExpenseTags } from './expense-metadata';
import { normalizeAmount } from './helpers';
import type { ReportMoneyRow, ReportShareRow } from './report-sql';

const PALETTE = [
  '#ff7fa3',
  '#f6c15b',
  '#8dd3ff',
  '#7ddfa8',
  '#c4a6ff',
  '#ffae63',
];
const FALLBACK_FILL = '#94a3b8';
const UNCATEGORIZED = 'Sin categoría';

type Category = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
};
type Member = { id: string; name: string; userId: string | null };

const paletteAt = (index: number) =>
  PALETTE[index % PALETTE.length] ?? FALLBACK_FILL;

const byAmountDesc = <T extends { amount: number }>(items: T[]) =>
  items.sort((left, right) => right.amount - left.amount);

const addTo = (
  record: Record<string, number>,
  currency: string,
  amount: number,
) => {
  record[currency] = normalizeAmount((record[currency] ?? 0) + amount);
};

export const buildTotalsReport = (input: {
  totals: ReadonlyArray<{
    currency: string;
    _sum: { amount: number | null };
    _count: { _all: number };
  }>;
  categoryTotals: ReadonlyArray<{
    currency: string;
    categoryId: string | null;
    _sum: { amount: number | null };
  }>;
  categories: ReadonlyArray<Category>;
  currentMemberShares: readonly ReportMoneyRow[];
  tagExpenses: ReadonlyArray<{
    amount: number;
    currency: string;
    metadata: unknown;
  }>;
  personal: boolean;
}): Omit<typeof ReportsTotals.Type, 'range' | 'startDate' | 'endDate'> => {
  const categoryById = new Map(
    input.categories.map((category) => [category.id, category]),
  );
  const totalsByCurrency = Object.fromEntries(
    input.totals.map((row) => [
      row.currency,
      normalizeAmount(row._sum.amount ?? 0),
    ]),
  );
  const currentUserSpentByCurrency: Record<string, number> = input.personal
    ? { ...totalsByCurrency }
    : {};
  if (!input.personal) {
    for (const row of input.currentMemberShares) {
      addTo(currentUserSpentByCurrency, row.currency, Number(row.total ?? 0));
    }
  }

  const categoriesByCurrency = Object.fromEntries(
    [...Map.groupBy(input.categoryTotals, (row) => row.currency)].map(
      ([currency, rows]) => [
        currency,
        byAmountDesc(
          rows.map((row, index) => {
            const category = row.categoryId
              ? categoryById.get(row.categoryId)
              : undefined;
            const name = category?.name?.trim() || UNCATEGORIZED;
            return {
              key: row.categoryId ?? `${name}::`,
              id: row.categoryId,
              name,
              icon: category?.icon ?? null,
              amount: normalizeAmount(row._sum.amount ?? 0),
              fill: category?.color ?? paletteAt(index),
            };
          }),
        ),
      ],
    ),
  );

  const tagsByCurrency = Object.fromEntries(
    [...Map.groupBy(input.tagExpenses, (expense) => expense.currency)].map(
      ([currency, expenses]) => {
        const amounts = new Map<string, number>();
        for (const expense of expenses) {
          for (const tag of readExpenseTags(expense.metadata)) {
            amounts.set(
              tag,
              normalizeAmount((amounts.get(tag) ?? 0) + expense.amount),
            );
          }
        }
        return [
          currency,
          byAmountDesc(
            [...amounts].map(([tag, amount], index) => ({
              key: tag,
              name: tag,
              amount,
              fill: paletteAt(index),
            })),
          ),
        ];
      },
    ),
  );

  return {
    totalsByCurrency,
    expenseCountByCurrency: Object.fromEntries(
      input.totals.map((row) => [row.currency, row._count._all]),
    ),
    currentUserSpentByCurrency,
    categoriesByCurrency,
    tagsByCurrency,
  };
};

export const buildBalancesReport = (
  members: readonly Member[],
  paidRows: readonly ReportMoneyRow[],
  owedRows: readonly ReportMoneyRow[],
  userId: string,
): Pick<typeof ReportsBalances.Type, 'memberBalances'> => {
  const balances = new Map<string, Record<string, number>>(
    members.map((member) => [member.id, {}]),
  );
  for (const row of paidRows) {
    const memberBalances = balances.get(row.memberId);
    if (memberBalances)
      addTo(memberBalances, row.currency, Number(row.total ?? 0));
  }
  for (const row of owedRows) {
    const memberBalances = balances.get(row.memberId);
    if (memberBalances)
      addTo(memberBalances, row.currency, -Number(row.total ?? 0));
  }
  return {
    memberBalances: members.map((member) => ({
      memberId: member.id,
      name: member.name,
      isCurrentUser: member.userId === userId,
      balances: balances.get(member.id) ?? {},
    })),
  };
};

export const buildSharesReport = (
  members: readonly Member[],
  rows: readonly ReportShareRow[],
  userId: string,
): Pick<typeof ReportsShares.Type, 'memberShares'> => {
  const shares = new Map<string, Record<string, number>>(
    members.map((member) => [member.id, {}]),
  );
  const categoryShares = new Map<
    string,
    Record<string, Record<string, number>>
  >(members.map((member) => [member.id, {}]));
  for (const row of rows) {
    const memberShares = shares.get(row.memberId);
    const memberCategories = categoryShares.get(row.memberId);
    if (!memberShares || !memberCategories) continue;
    const total = Number(row.total ?? 0);
    addTo(memberShares, row.currency, total);
    const currencyShares = memberCategories[row.currency] ?? {};
    addTo(currencyShares, row.categoryKey, total);
    memberCategories[row.currency] = currencyShares;
  }
  return {
    memberShares: members.map((member) => ({
      memberId: member.id,
      name: member.name,
      isCurrentUser: member.userId === userId,
      shares: shares.get(member.id) ?? {},
      categorySharesByCurrency: categoryShares.get(member.id) ?? {},
    })),
  };
};
