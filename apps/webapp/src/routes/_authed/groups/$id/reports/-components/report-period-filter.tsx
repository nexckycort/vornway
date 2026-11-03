import { ChevronDownIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useEffect, useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { Button } from '#/components/ui/button';
import { Calendar } from '#/components/ui/calendar';
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
import type { getGroupDetailMessages } from '#/routes/_authed/groups/$id/-messages';
import type { ReportDateFilterMode } from '../-lib/date-filter';

const CURRENCY_META: Record<string, { flag: string; label: string }> = {
  COP: { flag: '🇨🇴', label: 'COP' },
  USD: { flag: '🇺🇸', label: 'USD' },
  EUR: { flag: '🇪🇺', label: 'EUR' },
  GBP: { flag: '🇬🇧', label: 'GBP' },
  MXN: { flag: '🇲🇽', label: 'MXN' },
  BRL: { flag: '🇧🇷', label: 'BRL' },
};

type PendingDrawerMode = Exclude<ReportDateFilterMode, 'all'> | null;

export type TotalsRangeOption = {
  label: string;
  value: ReportDateFilterMode;
};

type ReportPeriodFilterProps = {
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
};

export function ReportPeriodFilter({
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
}: ReportPeriodFilterProps) {
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

  if (!isPeriodMenuOpen && pendingDrawerMode != null) {
    setPendingDrawerMode(null);
    if (pendingDrawerMode === 'day') {
      setIsDayDrawerOpen(true);
    } else {
      setIsRangeDrawerOpen(true);
    }
  }

  const selectedDayLabel = useMemo(
    () =>
      selectedDay
        ? compactDateFormatter.format(selectedDay)
        : t.reports.selectDate,
    [compactDateFormatter, selectedDay, t.reports.selectDate],
  );
  const selectedRangeLabel = useMemo(() => {
    if (!selectedRange?.from) return t.reports.selectRange;

    const from = compactDateFormatter.format(selectedRange.from);

    if (!selectedRange.to) return `${from} - ...`;

    const to = compactDateFormatter.format(selectedRange.to);

    return `${from} - ${to}`;
  }, [compactDateFormatter, selectedRange, t.reports.selectRange]);
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
      <section className="mt-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <DropdownMenu
            open={isPeriodMenuOpen}
            onOpenChange={setIsPeriodMenuOpen}
          >
            <DropdownMenuTrigger className="inline-flex min-w-0 flex-1 items-center justify-between gap-2 rounded-full border border-[#e2e8f0] bg-white px-4 py-3 text-left text-sm font-medium text-[#3f3f46] shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition-colors hover:bg-[#fafafa] focus-visible:ring-2 focus-visible:ring-[#111111]/15 sm:min-w-[220px] sm:flex-none sm:px-5">
              <span className="min-w-0 truncate">{selectedPeriodLabel}</span>
              <HugeiconsIcon
                icon={ChevronDownIcon}
                className="size-4 shrink-0 text-[#71717a]"
              />
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
            <DropdownMenuTrigger className="inline-flex shrink-0 items-center justify-between gap-2 rounded-full border border-[#e2e8f0] bg-white px-3 py-3 text-left text-sm font-medium text-[#3f3f46] shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition-colors hover:bg-[#fafafa] focus-visible:ring-2 focus-visible:ring-[#111111]/15 sm:min-w-[120px] sm:px-4">
              <span className="inline-flex items-center gap-2">
                <span className="text-sm leading-none">
                  {selectedCurrencyMeta.flag}
                </span>
                <span>{selectedCurrencyMeta.label}</span>
              </span>
              <HugeiconsIcon
                icon={ChevronDownIcon}
                className="size-4 shrink-0 text-[#71717a]"
              />
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
            <DrawerTitle>{t.reports.selectDayTitle}</DrawerTitle>
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
            <DrawerTitle>{t.reports.selectRangeTitle}</DrawerTitle>
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
    </>
  );
}
