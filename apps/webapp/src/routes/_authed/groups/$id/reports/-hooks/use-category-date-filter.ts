import { useEffect, useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import type { getGroupDetailMessages } from '#/routes/_authed/groups/$id/-messages';
import {
  isSameCalendarDay,
  parseSearchDate,
  type ReportDateFilterMode,
  toDayBoundaryIso,
} from '../-lib/date-filter';

type PendingDrawerMode = Exclude<ReportDateFilterMode, 'all'> | null;

type UseCategoryDateFilterOptions = {
  startDate: string | undefined;
  endDate: string | undefined;
  t: ReturnType<typeof getGroupDetailMessages>;
  applyDates: (
    startDate: string | undefined,
    endDate: string | undefined,
  ) => void;
};

export function useCategoryDateFilter({
  startDate,
  endDate,
  t,
  applyDates,
}: UseCategoryDateFilterOptions) {
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [isDayDrawerOpen, setIsDayDrawerOpen] = useState(false);
  const [isRangeDrawerOpen, setIsRangeDrawerOpen] = useState(false);
  const [pendingDrawerMode, setPendingDrawerMode] =
    useState<PendingDrawerMode>(null);
  const [rangeCalendarMonths, setRangeCalendarMonths] = useState(1);
  const [draftRange, setDraftRange] = useState<DateRange | undefined>();
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
  const selectedStartDate = useMemo(
    () => parseSearchDate(startDate),
    [startDate],
  );
  const selectedEndDate = useMemo(() => parseSearchDate(endDate), [endDate]);
  const dateFilterMode: ReportDateFilterMode =
    selectedStartDate && selectedEndDate
      ? isSameCalendarDay(selectedStartDate, selectedEndDate)
        ? 'day'
        : 'range'
      : 'all';
  const selectedDay = dateFilterMode === 'day' ? selectedStartDate : undefined;
  const selectedRange =
    dateFilterMode === 'range'
      ? {
          from: selectedStartDate,
          to: selectedEndDate,
        }
      : undefined;

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

  if (!isDateMenuOpen && pendingDrawerMode != null) {
    setPendingDrawerMode(null);
    if (pendingDrawerMode === 'day') {
      setIsDayDrawerOpen(true);
    } else {
      setDraftRange(selectedRange);
      setIsRangeDrawerOpen(true);
    }
  }

  const dateFilterLabel = useMemo(() => {
    if (dateFilterMode === 'day' && selectedDay) {
      return compactDateFormatter.format(selectedDay);
    }

    if (dateFilterMode === 'range' && selectedRange?.from) {
      const from = compactDateFormatter.format(selectedRange.from);
      if (!selectedRange.to) return `${from} - ...`;

      return `${from} - ${compactDateFormatter.format(selectedRange.to)}`;
    }

    return t.reports.dates;
  }, [
    compactDateFormatter,
    dateFilterMode,
    selectedDay,
    selectedRange,
    t.reports.dates,
  ]);

  const handleDateFilterModeChange = (value: ReportDateFilterMode) => {
    if (value === 'day') {
      setIsRangeDrawerOpen(false);
      setPendingDrawerMode('day');
      setIsDateMenuOpen(false);
      return;
    }

    if (value === 'range') {
      setIsDayDrawerOpen(false);
      setPendingDrawerMode('range');
      setIsDateMenuOpen(false);
      return;
    }

    setPendingDrawerMode(null);
    setIsDayDrawerOpen(false);
    setIsRangeDrawerOpen(false);
    setIsDateMenuOpen(false);
    applyDates(undefined, undefined);
  };

  const applyDayFilter = (value: Date | undefined) => {
    if (!value) return;

    setIsDayDrawerOpen(false);
    applyDates(
      toDayBoundaryIso(value, 'start'),
      toDayBoundaryIso(value, 'end'),
    );
  };

  const applyRangeFilter = () => {
    setIsRangeDrawerOpen(false);
    applyDates(
      draftRange?.from ? toDayBoundaryIso(draftRange.from, 'start') : undefined,
      draftRange?.to ? toDayBoundaryIso(draftRange.to, 'end') : undefined,
    );
  };

  return {
    dateFilterMode,
    dateFilterLabel,
    selectedDay,
    isDateMenuOpen,
    setIsDateMenuOpen,
    isDayDrawerOpen,
    setIsDayDrawerOpen,
    isRangeDrawerOpen,
    setIsRangeDrawerOpen,
    rangeCalendarMonths,
    draftRange,
    setDraftRange,
    timeZone,
    handleDateFilterModeChange,
    applyDayFilter,
    applyRangeFilter,
  };
}
