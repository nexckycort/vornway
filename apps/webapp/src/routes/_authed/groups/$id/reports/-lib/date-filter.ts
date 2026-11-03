export type ReportDateFilterMode = 'all' | 'day' | 'range';

export function toDayBoundaryIso(
  value: Date,
  boundary: 'start' | 'end',
): string | undefined {
  const year = value.getFullYear();
  const month = value.getMonth();
  const day = value.getDate();

  const date =
    boundary === 'start'
      ? new Date(year, month, day, 0, 0, 0, 0)
      : new Date(year, month, day, 23, 59, 59, 999);

  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function parseSearchDate(value: string | undefined) {
  if (!value) return undefined;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function isSameCalendarDay(
  left: Date | undefined,
  right: Date | undefined,
) {
  if (!left || !right) return false;

  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}
