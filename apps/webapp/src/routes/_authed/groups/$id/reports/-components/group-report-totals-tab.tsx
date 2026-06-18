import { ChevronDown, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { Pie, PieChart } from 'recharts';

import { Button } from '#/components/ui/button';
import { Calendar } from '#/components/ui/calendar';
import { ChartContainer } from '#/components/ui/chart';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '#/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu';
import { CategoryIcon } from '#/routes/_authed/groups/$id/-components/category-icon';
import {
  formatMoney,
  getInitials,
} from '#/routes/_authed/groups/$id/-components/group-detail.utils';
import type { getGroupDetailMessages } from '#/routes/_authed/groups/$id/-messages';
import type { GroupSummary } from '#/routes/_authed/groups/$id/-types/group-detail.types';

const CURRENCY_META: Record<string, { flag: string; label: string }> = {
  COP: { flag: '🇨🇴', label: 'COP' },
  USD: { flag: '🇺🇸', label: 'USD' },
  EUR: { flag: '🇪🇺', label: 'EUR' },
  GBP: { flag: '🇬🇧', label: 'GBP' },
  MXN: { flag: '🇲🇽', label: 'MXN' },
  BRL: { flag: '🇧🇷', label: 'BRL' },
};

type ReportDateFilterMode = 'all' | 'day' | 'range';
type PendingDrawerMode = Exclude<ReportDateFilterMode, 'all'> | null;

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
  categoryTotal,
  selectedCategoryKey,
  onSelectedCategoryKeyChange,
  currentUserSpent,
  selectedCategory,
  sortedShareMembers,
  onSeeAll,
  onOpenMember,
}: GroupReportTotalsTabProps) {
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState(false);
  const [isCurrencyMenuOpen, setIsCurrencyMenuOpen] = useState(false);
  const [isDayDrawerOpen, setIsDayDrawerOpen] = useState(false);
  const [isRangeDrawerOpen, setIsRangeDrawerOpen] = useState(false);
  const [pendingDrawerMode, setPendingDrawerMode] =
    useState<PendingDrawerMode>(null);
  const [rangeCalendarMonths, setRangeCalendarMonths] = useState(1);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const compactDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      }),
    [],
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 640px)');
    const syncMonths = () => {
      setRangeCalendarMonths(mediaQuery.matches ? 2 : 1);
    };

    syncMonths();
    mediaQuery.addEventListener('change', syncMonths);

    return () => {
      mediaQuery.removeEventListener('change', syncMonths);
    };
  }, []);

  useEffect(() => {
    if (isPeriodMenuOpen || pendingDrawerMode == null) return;

    if (pendingDrawerMode === 'day') {
      setIsDayDrawerOpen(true);
    } else {
      setIsRangeDrawerOpen(true);
    }

    setPendingDrawerMode(null);
  }, [isPeriodMenuOpen, pendingDrawerMode]);

  const selectedDayLabel = useMemo(
    () =>
      selectedDay
        ? compactDateFormatter.format(selectedDay)
        : 'Selecciona una fecha',
    [compactDateFormatter, selectedDay],
  );
  const selectedRangeLabel = useMemo(() => {
    if (!selectedRange?.from) return 'Selecciona un rango';

    const from = compactDateFormatter.format(selectedRange.from);

    if (!selectedRange.to) return `${from} - ...`;

    const to = compactDateFormatter.format(selectedRange.to);

    return `${from} - ${to}`;
  }, [compactDateFormatter, selectedRange]);
  const selectedPeriodLabel = useMemo(() => {
    if (dateFilterMode === 'day') return selectedDayLabel;
    if (dateFilterMode === 'range') return selectedRangeLabel;

    return (
      totalsRangeOptions.find((option) => option.value === dateFilterMode)
        ?.label ?? t.reports.rangeAll
    );
  }, [
    dateFilterMode,
    selectedDayLabel,
    selectedRangeLabel,
    t.reports.rangeAll,
    totalsRangeOptions,
  ]);
  const selectedCurrencyMeta = CURRENCY_META[selectedCurrency] ?? {
    flag: '💱',
    label: selectedCurrency,
  };

  const handlePeriodChange = (value: ReportDateFilterMode) => {
    onDateFilterModeChange(value);

    if (value === 'day') {
      setIsRangeDrawerOpen(false);
      setPendingDrawerMode('day');
      setIsPeriodMenuOpen(false);
      return;
    }

    if (value === 'range') {
      setIsDayDrawerOpen(false);
      setPendingDrawerMode('range');
      setIsPeriodMenuOpen(false);
      return;
    }

    setPendingDrawerMode(null);
    setIsDayDrawerOpen(false);
    setIsRangeDrawerOpen(false);
    setIsPeriodMenuOpen(false);
  };

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
        <div className="flex items-center gap-2">
          <DropdownMenu
            open={isPeriodMenuOpen}
            onOpenChange={setIsPeriodMenuOpen}
          >
            <DropdownMenuTrigger className="inline-flex min-w-0 flex-1 items-center justify-between gap-2 rounded-full border border-[#e2e8f0] bg-white px-4 py-3 text-left text-sm font-medium text-[#3f3f46] shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition-colors hover:bg-[#fafafa] focus-visible:ring-2 focus-visible:ring-[#111111]/15">
              <span className="min-w-0 truncate">{selectedPeriodLabel}</span>
              <ChevronDown className="size-4 shrink-0 text-[#71717a]" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuGroup>
                <DropdownMenuRadioGroup
                  value={dateFilterMode}
                  onValueChange={(value) =>
                    handlePeriodChange(value as ReportDateFilterMode)
                  }
                >
                  {totalsRangeOptions.map((option) => (
                    <DropdownMenuRadioItem
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu
            open={isCurrencyMenuOpen}
            onOpenChange={setIsCurrencyMenuOpen}
          >
            <DropdownMenuTrigger className="inline-flex shrink-0 items-center justify-between gap-2 rounded-full border border-[#e2e8f0] bg-white px-3 py-3 text-left text-sm font-medium text-[#3f3f46] shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition-colors hover:bg-[#fafafa] focus-visible:ring-2 focus-visible:ring-[#111111]/15">
              <span className="inline-flex items-center gap-2">
                <span className="text-sm leading-none">
                  {selectedCurrencyMeta.flag}
                </span>
                <span>{selectedCurrencyMeta.label}</span>
              </span>
              <ChevronDown className="size-4 shrink-0 text-[#71717a]" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuGroup>
                <DropdownMenuRadioGroup
                  value={selectedCurrency}
                  onValueChange={(value) => {
                    onSelectedCurrencyChange(value);
                    setIsCurrencyMenuOpen(false);
                  }}
                >
                  {availableCurrencies.map((currency) => {
                    const meta = CURRENCY_META[currency] ?? {
                      flag: '💱',
                      label: currency,
                    };

                    return (
                      <DropdownMenuRadioItem key={currency} value={currency}>
                        <span className="inline-flex items-center gap-2">
                          <span className="text-sm leading-none">
                            {meta.flag}
                          </span>
                          <span>{meta.label}</span>
                        </span>
                      </DropdownMenuRadioItem>
                    );
                  })}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </section>

      <Drawer open={isDayDrawerOpen} onOpenChange={setIsDayDrawerOpen}>
        <DrawerContent className="gap-4 p-0">
          <DrawerHeader>
            <DrawerTitle>Selecciona un día</DrawerTitle>
            <DrawerDescription>
              Elige la fecha para filtrar el reporte.
            </DrawerDescription>
          </DrawerHeader>
          <Calendar
            mode="single"
            selected={selectedDay}
            onSelect={(value) => {
              onSelectedDayChange(value);
              if (value) {
                setIsDayDrawerOpen(false);
              }
            }}
            captionLayout="dropdown"
            timeZone={timeZone}
            className="mx-auto mb-5 rounded-2xl border border-[#e2e8f0]"
          />
        </DrawerContent>
      </Drawer>

      <Drawer open={isRangeDrawerOpen} onOpenChange={setIsRangeDrawerOpen}>
        <DrawerContent className="max-h-[85vh] gap-0 overflow-hidden p-0">
          <DrawerHeader>
            <DrawerTitle>Selecciona un rango</DrawerTitle>
            <DrawerDescription>
              Elige la fecha inicial y final para filtrar el reporte.
            </DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
            <Calendar
              mode="range"
              selected={selectedRange}
              onSelect={onSelectedRangeChange}
              captionLayout="dropdown"
              numberOfMonths={rangeCalendarMonths}
              timeZone={timeZone}
              className="mx-auto rounded-2xl border border-[#e2e8f0]"
            />
          </div>
          <DrawerFooter className="border-t border-[#e2e8f0] bg-background px-5 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            <Button
              type="button"
              className="h-12 w-full rounded-full"
              onClick={() => setIsRangeDrawerOpen(false)}
            >
              Aplicar rango
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

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
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-[#132238]">
            Gastos por categoría
          </h3>
        </div>

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
