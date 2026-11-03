import { ChevronRightIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { DateRange } from 'react-day-picker';
import { Pie, PieChart } from 'recharts';
import { ChartContainer } from '#/components/ui/chart';
import { CategoryIcon } from '#/routes/_authed/groups/$id/-components/category-icon';
import {
  formatMoney,
  getInitials,
} from '#/routes/_authed/groups/$id/-components/group-detail.utils';
import type { getGroupDetailMessages } from '#/routes/_authed/groups/$id/-messages';
import type { GroupSummary } from '#/routes/_authed/groups/$id/-types/group-detail.types';
import type { ReportDateFilterMode } from '../-lib/date-filter';
import {
  ReportPeriodFilter,
  type TotalsRangeOption,
} from './report-period-filter';

type CategoryBreakdownEntry = {
  key: string;
  id: string | null;
  name: string;
  icon: string | null;
  expenseCount?: number;
  amount: number;
  fill: string;
};

type TagBreakdownEntry = {
  key: string;
  name: string;
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
  dateFilterMode: ReportDateFilterMode;
  totalsRangeOptions: TotalsRangeOption[];
  selectedDay: Date | undefined;
  selectedRange: DateRange | undefined;
  onDateFilterModeChange: (value: ReportDateFilterMode) => void;
  onSelectedDayChange: (value: Date | undefined) => void;
  onSelectedRangeChange: (value: DateRange | undefined) => void;
  availableCurrencies: string[];
  selectedCurrency: string;
  onSelectedCurrencyChange: (value: string) => void;
  reportsTotalsLoading: boolean;
  chartConfig: Record<string, { label: string; color: string }>;
  categoryBreakdown: CategoryBreakdownEntry[];
  tagBreakdown: TagBreakdownEntry[];
  categoryTotal: number;
  currentUserSpent: number;
  sortedShareMembers: ShareMember[];
  onOpenMember: (memberId: string) => void;
  onOpenCategory: (category: CategoryBreakdownEntry) => void;
};

export function GroupReportTotalsTab({
  group,
  t,
  dateFilterMode,
  totalsRangeOptions,
  selectedDay,
  selectedRange,
  onDateFilterModeChange,
  onSelectedDayChange,
  onSelectedRangeChange,
  availableCurrencies,
  selectedCurrency,
  onSelectedCurrencyChange,
  reportsTotalsLoading,
  chartConfig,
  categoryBreakdown,
  tagBreakdown,
  categoryTotal,
  currentUserSpent,
  sortedShareMembers,
  onOpenMember,
  onOpenCategory,
}: GroupReportTotalsTabProps) {
  return (
    <>
      <ReportPeriodFilter
        t={t}
        dateFilterMode={dateFilterMode}
        totalsRangeOptions={totalsRangeOptions}
        selectedDay={selectedDay}
        selectedRange={selectedRange}
        onDateFilterModeChange={onDateFilterModeChange}
        onSelectedDayChange={onSelectedDayChange}
        onSelectedRangeChange={onSelectedRangeChange}
        availableCurrencies={availableCurrencies}
        selectedCurrency={selectedCurrency}
        onSelectedCurrencyChange={onSelectedCurrencyChange}
      />

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

      <div className="mt-4 mb-3">
        <h3 className="text-sm font-semibold text-[#132238]">
          Gastos por categoría
        </h3>
      </div>

      <section className="rounded-[28px] border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="relative flex items-center justify-center">
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
                  onClick={(_, index) => {
                    const category = categoryBreakdown[index];
                    if (category) onOpenCategory(category);
                  }}
                  className="cursor-pointer"
                />
              </PieChart>
            </ChartContainer>
          )}

          {!reportsTotalsLoading ? (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-sm text-[#64748b]">{t.reports.totalGroup}</p>
              <p className="mt-1 text-2xl font-semibold text-[#132238]">
                {formatMoney(selectedCurrency, categoryTotal)}
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {categoryBreakdown.map((entry) => (
            <button
              type="button"
              key={entry.key}
              onClick={() => onOpenCategory(entry)}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#e2e8f0] bg-white px-3 py-2 text-xs font-medium text-[#334155] transition-colors hover:bg-[#fafafa]"
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

        {group.type === 'personal' && tagBreakdown.length > 0 ? (
          <div className="mt-4 border-t border-[#eef2f7] pt-4">
            <p className="mb-3 text-sm font-semibold text-[#132238]">
              {t.reports.tags}
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {tagBreakdown.map((tag) => (
                <div
                  key={tag.key}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#e2e8f0] bg-white px-3 py-2 text-xs font-medium text-[#334155]"
                >
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: tag.fill }}
                  />
                  #{tag.name}
                  <span className="text-[#64748b]">
                    {formatMoney(selectedCurrency, tag.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="mt-4 rounded-[28px] border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#132238]">
              {t.reports.participants}
            </h3>
            <p className="mt-1 text-xs text-[#64748b]">
              {`Parte en ${selectedCurrency}`}
            </p>
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
                  <HugeiconsIcon
                    icon={ChevronRightIcon}
                    className="size-4 shrink-0 text-[#94a3b8]"
                  />
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}
