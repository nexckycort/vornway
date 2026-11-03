import { DateTime } from 'effect';

const FALLBACK_TIME_ZONE = 'UTC';

export const monthRange = (now: Date, month?: string, timeZone?: string) => {
  const validTimeZone = validTimeZoneOrFallback(timeZone);
  const nowParts = dateParts(now.getTime(), validTimeZone);
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
    budgetMonth: utcDate(Date.UTC(year, monthIndex, 1)),
  };
};

const utcDate = (epochMillis: number) =>
  DateTime.toDateUtc(DateTime.makeUnsafe(epochMillis));

const validTimeZoneOrFallback = (timeZone?: string) => {
  if (!timeZone) return FALLBACK_TIME_ZONE;

  try {
    Intl.DateTimeFormat('en-US', { timeZone }).format(0);
    return timeZone;
  } catch {
    return FALLBACK_TIME_ZONE;
  }
};

const dateParts = (epochMillis: number, timeZone: string) => {
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
  }).formatToParts(epochMillis);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );

  const utc = DateTime.makeUnsafe(epochMillis);

  return {
    year: values.year ?? DateTime.getPartUtc(utc, 'year'),
    month: values.month ?? DateTime.getPartUtc(utc, 'month'),
    day: values.day ?? DateTime.getPartUtc(utc, 'day'),
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
    const parts = dateParts(utcTimestamp, timeZone);
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

  return utcDate(utcTimestamp);
};
