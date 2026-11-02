import { describe, expect, test } from 'bun:test';
import { monthRange } from './calendar';

describe('monthRange', () => {
  test('spans the month in the given time zone', () => {
    const range = monthRange('2026-04', 'America/Bogota');

    expect(range.key).toBe('2026-04');
    expect(range.start.toISOString()).toBe('2026-04-01T05:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-05-01T05:00:00.000Z');
    expect(range.budgetMonth.toISOString()).toBe('2026-04-01T00:00:00.000Z');
  });

  test('falls back to UTC for an unknown time zone', () => {
    const range = monthRange('2026-12', 'Not/AZone');

    expect(range.start.toISOString()).toBe('2026-12-01T00:00:00.000Z');
    expect(range.end.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });

  test('defaults to the current month', () => {
    expect(monthRange().key).toMatch(/^\d{4}-\d{2}$/);
  });
});
