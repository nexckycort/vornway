import { formatCurrency } from '#/lib/i18n';
import { CategoryIcon } from '#/routes/_authed/groups/$id/-components/category-icon';
import type { getGroupDetailMessages } from '#/routes/_authed/groups/$id/-messages';

type Messages = ReturnType<typeof getGroupDetailMessages>;

type CategorySummaryCardProps = {
  t: Messages;
  name: string;
  icon: string | null;
  color: string;
  currency: string;
  total: number;
  expenseCount: number;
  progressPercentage: number;
};

export function CategorySummaryCard({
  t,
  name: resolvedCategoryName,
  icon: resolvedCategoryIcon,
  color: resolvedCategoryColor,
  currency,
  total: categoryTotal,
  expenseCount: historyExpenseCount,
  progressPercentage,
}: CategorySummaryCardProps) {
  return (
    <section className="rounded-[28px] bg-[#111111] p-5 text-white shadow-[0_18px_44px_rgba(15,23,42,0.18)]">
      <div className="flex items-start gap-3">
        <div
          className="flex size-12 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${resolvedCategoryColor}24` }}
        >
          <CategoryIcon
            icon={resolvedCategoryIcon}
            color={resolvedCategoryColor}
            fallback={<span className="text-xl">🏷️</span>}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold">
            {resolvedCategoryName}
          </p>
          <p className="mt-1 text-sm text-white/65">
            {t.reports.categoryExpensesCount(historyExpenseCount)}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-3xl font-semibold tracking-tight">
          {formatCurrency(currency, categoryTotal)}
        </p>
        <p className="mt-2 text-sm text-white/65">
          {t.reports.categoryShareOfGroup(
            `${progressPercentage.toFixed(progressPercentage >= 10 ? 0 : 1)}%`,
          )}
        </p>
      </div>

      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/12">
        <div
          className="h-full rounded-full"
          style={{
            width: `${progressPercentage}%`,
            backgroundColor: resolvedCategoryColor,
          }}
        />
      </div>
    </section>
  );
}
