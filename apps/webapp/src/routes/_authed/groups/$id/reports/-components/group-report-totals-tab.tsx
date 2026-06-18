import { ChevronRight } from 'lucide-react';
import { Pie, PieChart } from 'recharts';

import { ChartContainer } from '#/components/ui/chart';
import type { getGroupDetailMessages } from '#/routes/_authed/groups/$id/-messages';
import { CategoryIcon } from '../../-components/category-icon';
import { formatMoney, getInitials } from '../../-components/group-detail.utils';
import type { GroupSummary } from '../../-types/group-detail.types';

const CURRENCY_META: Record<string, { flag: string; label: string }> = {
  COP: { flag: '🇨🇴', label: 'COP' },
  USD: { flag: '🇺🇸', label: 'USD' },
  EUR: { flag: '🇪🇺', label: 'EUR' },
  GBP: { flag: '🇬🇧', label: 'GBP' },
  MXN: { flag: '🇲🇽', label: 'MXN' },
  BRL: { flag: '🇧🇷', label: 'BRL' },
};

type ReportDateFilterMode = 'all' | 'day' | 'range';

type TotalsRangeOption = {
  label: string;
  value: ReportDateFilterMode;
};

type CategoryBreakdownEntry = {
  key: string;
  id: string | null;
  name: string;
  icon: string | null;
  expenseCount: number;
  amount: number;
  fill: string;
};

type ShareMember = {
  memberId: string;
  name: string;
  isCurrentUser: boolean;
  visibleShare: number;
};

type GroupReportTotalsTabProps = {
  group: GroupSummary;
  t: ReturnType<typeof getGroupDetailMessages>;
  expenseCount: number;
  dateFilterMode: ReportDateFilterMode;
  totalsRangeOptions: TotalsRangeOption[];
  selectedDay: string;
  rangeStartDate: string;
  rangeEndDate: string;
  onDateFilterModeChange: (value: ReportDateFilterMode) => void;
  onSelectedDayChange: (value: string) => void;
  onRangeStartDateChange: (value: string) => void;
  onRangeEndDateChange: (value: string) => void;
  availableCurrencies: string[];
  selectedCurrency: string;
  onSelectedCurrencyChange: (value: string) => void;
  reportsTotalsLoading: boolean;
  chartConfig: Record<string, { label: string; color: string }>;
  categoryBreakdown: CategoryBreakdownEntry[];
  categoryTotal: number;
  selectedCategoryKey: string | null;
  onSelectedCategoryKeyChange: (value: string | null) => void;
  currentUserSpent: number;
  selectedCategory: CategoryBreakdownEntry | null;
  sortedShareMembers: ShareMember[];
  onSeeAll: () => void;
  onOpenMember: (memberId: string) => void;
};

export function GroupReportTotalsTab({
  group,
  t,
  expenseCount,
  dateFilterMode,
  totalsRangeOptions,
  selectedDay,
  rangeStartDate,
  rangeEndDate,
  onDateFilterModeChange,
  onSelectedDayChange,
  onRangeStartDateChange,
  onRangeEndDateChange,
  availableCurrencies,
  selectedCurrency,
  onSelectedCurrencyChange,
  reportsTotalsLoading,
  chartConfig,
  categoryBreakdown,
  categoryTotal,
  selectedCategoryKey,
  onSelectedCategoryKeyChange,
  currentUserSpent,
  selectedCategory,
  sortedShareMembers,
  onSeeAll,
  onOpenMember,
}: GroupReportTotalsTabProps) {
  return (
    <>
      <section className="mt-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#132238]">
            {t.reports.expensesTitle}
          </h2>
          <p className="mt-1 text-xs text-[#64748b]">
            {expenseCount
              ? t.reports.expensesCount(expenseCount)
              : t.reports.noExpensesPeriod}
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary"
          onClick={onSeeAll}
        >
          {t.reports.seeAll}
          <ChevronRight className="size-4" />
        </button>
      </section>

      <section className="mt-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {totalsRangeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onDateFilterModeChange(option.value)}
              className={[
                'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                dateFilterMode === option.value
                  ? 'bg-primary text-white'
                  : 'border border-[#e2e8f0] bg-white text-[#64748b]',
              ].join(' ')}
            >
              {option.label}
            </button>
          ))}
        </div>
        {dateFilterMode === 'day' ? (
          <div className="mt-3">
            <label
              htmlFor="report-day-filter"
              className="block text-xs font-medium text-[#64748b]"
            >
              Fecha
            </label>
            <input
              id="report-day-filter"
              type="date"
              value={selectedDay}
              onChange={(event) => onSelectedDayChange(event.target.value)}
              className="mt-1 h-11 w-full rounded-2xl border border-[#e2e8f0] bg-white px-4 text-sm text-[#132238] outline-none transition focus:border-primary"
            />
          </div>
        ) : null}
        {dateFilterMode === 'range' ? (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="report-range-start"
                className="block text-xs font-medium text-[#64748b]"
              >
                Desde
              </label>
              <input
                id="report-range-start"
                type="date"
                value={rangeStartDate}
                max={rangeEndDate}
                onChange={(event) => onRangeStartDateChange(event.target.value)}
                className="mt-1 h-11 w-full rounded-2xl border border-[#e2e8f0] bg-white px-4 text-sm text-[#132238] outline-none transition focus:border-primary"
              />
            </div>
            <div>
              <label
                htmlFor="report-range-end"
                className="block text-xs font-medium text-[#64748b]"
              >
                Hasta
              </label>
              <input
                id="report-range-end"
                type="date"
                value={rangeEndDate}
                min={rangeStartDate}
                onChange={(event) => onRangeEndDateChange(event.target.value)}
                className="mt-1 h-11 w-full rounded-2xl border border-[#e2e8f0] bg-white px-4 text-sm text-[#132238] outline-none transition focus:border-primary"
              />
            </div>
          </div>
        ) : null}
      </section>

      <section className="mt-4 rounded-[28px] border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {availableCurrencies.map((currency) => {
            const meta = CURRENCY_META[currency] ?? {
              flag: '💱',
              label: currency,
            };

            return (
              <button
                key={currency}
                type="button"
                onClick={() => onSelectedCurrencyChange(currency)}
                className={[
                  'inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors',
                  selectedCurrency === currency
                    ? 'border-primary/20 bg-primary/10 text-primary'
                    : 'border-[#e2e8f0] bg-white text-[#64748b]',
                ].join(' ')}
              >
                <span className="text-sm leading-none">{meta.flag}</span>
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-center">
          {reportsTotalsLoading ? (
            <div className="flex size-56 items-center justify-center rounded-full border border-dashed border-[#e2e8f0] bg-[#f8fafc] text-xs text-[#94a3b8]">
              {t.reports.loadingTotals}
            </div>
          ) : (
            <ChartContainer className="size-56" config={chartConfig}>
              <PieChart>
                <Pie
                  data={categoryBreakdown}
                  dataKey="amount"
                  nameKey="name"
                  innerRadius={74}
                  outerRadius={108}
                  paddingAngle={3}
                  stroke="transparent"
                  fill="#94a3b8"
                />
              </PieChart>
            </ChartContainer>
          )}
        </div>

        <div className="mt-3 flex flex-col items-center">
          <p className="text-xs text-[#94a3b8]">{t.reports.totalGroup}</p>
          {reportsTotalsLoading ? (
            <p className="mt-1 text-2xl font-semibold text-[#132238]">…</p>
          ) : (
            <p className="mt-1 text-2xl font-semibold text-[#132238]">
              {formatMoney(selectedCurrency, categoryTotal)}
            </p>
          )}
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => onSelectedCategoryKeyChange(null)}
            className={[
              'inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-colors',
              selectedCategoryKey == null
                ? 'border-primary/20 bg-primary/10 text-primary'
                : 'border-[#e2e8f0] bg-white text-[#334155]',
            ].join(' ')}
          >
            Todas
          </button>
          {categoryBreakdown.map((entry) => (
            <button
              type="button"
              key={entry.key}
              onClick={() =>
                onSelectedCategoryKeyChange(
                  selectedCategoryKey === entry.key ? null : entry.key,
                )
              }
              className={[
                'inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-colors',
                selectedCategoryKey === entry.key
                  ? 'border-primary/20 bg-primary/10 text-primary'
                  : 'border-[#e2e8f0] bg-white text-[#334155]',
              ].join(' ')}
            >
              <span
                className="flex size-7 items-center justify-center rounded-full"
                style={{
                  backgroundColor: `${entry.fill}1f`,
                  color: entry.fill,
                }}
              >
                <CategoryIcon
                  icon={entry.icon}
                  color={entry.fill}
                  fallback={
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: entry.fill }}
                    />
                  }
                  className="size-3.5"
                />
              </span>
              {entry.name}
              <span className="text-[#64748b]">
                {formatMoney(selectedCurrency, entry.amount)}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3">
        <div className="min-w-0 rounded-[24px] border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-medium text-[#64748b]">
            {t.reports.totalGroup}
          </p>
          {reportsTotalsLoading ? (
            <p className="mt-1 break-all text-xl font-semibold leading-tight text-[#132238] sm:text-2xl">
              …
            </p>
          ) : (
            <p className="mt-1 break-all text-xl font-semibold leading-tight text-[#132238] sm:text-2xl">
              {formatMoney(selectedCurrency, categoryTotal)}
            </p>
          )}
        </div>

        <div className="min-w-0 rounded-[24px] bg-[#111111] p-4 text-white shadow-[0_8px_24px_rgba(15,23,42,0.14)]">
          <p className="text-xs font-medium text-white/70">
            {t.reports.yourShare}
          </p>
          <p className="mt-1 break-all text-xl font-semibold leading-tight sm:text-2xl">
            {formatMoney(selectedCurrency, currentUserSpent)}
          </p>
        </div>
      </section>

      <section className="mt-4 rounded-[28px] border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#132238]">
              {t.reports.participants}
            </h3>
            <p className="mt-1 text-xs text-[#64748b]">
              {selectedCategory
                ? `${selectedCategory.name} · ${selectedCurrency}`
                : `Parte en ${selectedCurrency}`}
            </p>
            {selectedCategory ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: selectedCategory.fill }}
                  />
                  Filtrando por {selectedCategory.name}
                </span>
                <button
                  type="button"
                  onClick={() => onSelectedCategoryKeyChange(null)}
                  className="text-[11px] font-medium text-[#64748b] underline underline-offset-2"
                >
                  Ver todas
                </button>
              </div>
            ) : null}
          </div>
          <span className="text-xs text-[#94a3b8]">
            {t.reports.peopleCount(sortedShareMembers.length)}
          </span>
        </div>

        <div className="space-y-3">
          {sortedShareMembers.map((member) => {
            const memberIdentity = group.members.find(
              (item) => item.id === member.memberId,
            );
            const isCreator = group.ownerId === memberIdentity?.userId;

            return (
              <button
                type="button"
                key={member.memberId}
                onClick={() => onOpenMember(member.memberId)}
                className="native-tap flex w-full items-center gap-3 rounded-2xl bg-[#f8fafc] px-3 py-2.5 text-left transition-colors hover:bg-[#eef2f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111]/15"
              >
                {memberIdentity?.image ? (
                  <img
                    src={memberIdentity.image}
                    alt={member.name}
                    className="size-10 shrink-0 rounded-full border border-[#e5e7eb] object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f3f4f6] text-sm font-semibold text-[#132238]">
                    {getInitials(member.name)}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#132238]">
                    {member.name}
                    {member.isCurrentUser ? (
                      <span className="ml-1 text-xs text-[#94a3b8]">
                        ({t.reports.you})
                      </span>
                    ) : null}
                    {isCreator ? (
                      <span className="ml-2 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                        {t.reports.owner}
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-[#64748b]">
                    {memberIdentity?.email ?? t.reports.unlinked}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-right">
                  <div>
                    <p className="text-sm font-semibold text-[#132238]">
                      {formatMoney(selectedCurrency, member.visibleShare)}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-[#94a3b8]" />
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}
