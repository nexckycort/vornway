const FALLBACK_TIME_ZONE = 'UTC';

export const monthRange = (month?: string, timeZone?: string) => {
  const now = new Date();
  const validTimeZone = validTimeZoneOrFallback(timeZone);
  const nowParts = dateParts(now, validTimeZone);
  const source =
    month && /^\d{4}-\d{2}$/.test(month)
      ? month
      : `${nowParts.year}-${String(nowParts.month).padStart(2, '0')}`;
  const [yearValue, monthValue] = source.split('-').map(Number);
  const year = yearValue ?? nowParts.year;
  const monthIndex = (monthValue ?? 1) - 1;
  return {
    key: source,
    start: zonedMonthBoundaryToUtc(validTimeZone, year, monthIndex),
    end: zonedMonthBoundaryToUtc(validTimeZone, year, monthIndex + 1),
    budgetMonth: new Date(Date.UTC(year, monthIndex, 1)),
  };
};

const validTimeZoneOrFallback = (timeZone?: string) => {
  if (!timeZone) return FALLBACK_TIME_ZONE;

  try {
    Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return FALLBACK_TIME_ZONE;
  }
};

const dateParts = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    calendar: 'iso8601',
    numberingSystem: 'latn',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: values.year ?? date.getUTCFullYear(),
    month: values.month ?? date.getUTCMonth() + 1,
    day: values.day ?? date.getUTCDate(),
    hour: values.hour ?? 0,
    minute: values.minute ?? 0,
    second: values.second ?? 0,
  };
};

const zonedMonthBoundaryToUtc = (
  timeZone: string,
  year: number,
  monthIndex: number,
) => {
  const targetWallTime = Date.UTC(year, monthIndex, 1, 0, 0, 0);
  let utcTimestamp = targetWallTime;

  for (let index = 0; index < 4; index += 1) {
    const parts = dateParts(new Date(utcTimestamp), timeZone);
    const actualWallTime = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const delta = targetWallTime - actualWallTime;
    if (delta === 0) break;
    utcTimestamp += delta;
  }

  return new Date(utcTimestamp);
};
