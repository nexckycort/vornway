import { describe, expect, test } from 'bun:test';
import { toDate } from '#/infrastructure/dates';
import { summarizeDebt, summarizeGoal } from './goal-debt-summary';

const now = toDate('2026-11-02');

const goal = (
  overrides: Partial<Parameters<typeof summarizeGoal>[0]> = {},
) => ({
  id: 'goal-1',
  title: 'Trip fund',
  description: null,
  currency: 'EUR',
  targetAmount: 200,
  endDate: toDate('2026-12-31'),
  createdAt: toDate('2026-11-01'),
  group: { id: 'group-1', name: 'Trip' },
  contributions: [{ amount: 50.555 }, { amount: 25 }],
  ...overrides,
});

const debt = (
  overrides: Partial<Parameters<typeof summarizeDebt>[0]> = {},
) => ({
  id: 'debt-1',
  name: 'Laptop',
  ownerId: 'ana',
  counterpartyName: 'Bruno',
  direction: 'lent',
  currency: 'EUR',
  expectedTotal: 100,
  dueDate: null,
  updatedAt: toDate('2026-11-01'),
  payments: [{ amount: 40 }],
  ...overrides,
});

describe('summarizeGoal', () => {
  test('sums the contributions and computes the progress', () => {
    const summary = summarizeGoal(goal());

    expect(summary.savedAmount).toBe(75.56);
    expect(summary.progress).toBe(37.78);
  });

  test('caps the progress at one hundred percent, and is zero without a target', () => {
    expect(summarizeGoal(goal({ targetAmount: 50 })).progress).toBe(100);
    expect(summarizeGoal(goal({ targetAmount: 0 })).progress).toBe(0);
  });
});

describe('summarizeDebt', () => {
  test('is active until the expected total is paid', () => {
    const summary = summarizeDebt(debt(), 'ana', now);

    expect(summary).toMatchObject({
      direction: 'lent',
      paidAmount: 40,
      remainingAmount: 60,
      status: 'active',
    });
  });

  test('is overdue past its due date and paid once nothing remains', () => {
    expect(
      summarizeDebt(debt({ dueDate: toDate('2020-01-01') }), 'ana', now).status,
    ).toBe('overdue');
    expect(
      summarizeDebt(debt({ payments: [{ amount: 100 }] }), 'ana', now).status,
    ).toBe('paid');
  });

  test('shows the opposite direction to the counterparty', () => {
    expect(summarizeDebt(debt(), 'bruno', now).direction).toBe('borrowed');
    expect(
      summarizeDebt(debt({ direction: 'borrowed' }), 'ana', now).direction,
    ).toBe('borrowed');
  });
});
