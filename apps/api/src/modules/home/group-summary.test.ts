import { describe, expect, test } from 'bun:test';
import { DateTime } from 'effect';
import { summarizeGroup } from './group-summary';

const member = (id: string, userId: string | null, name = id) => ({
  id,
  name,
  userId,
  user: null,
});

const expense = (
  amount: number,
  payers: { memberId: string; amount: number }[],
  participants: { memberId: string; share: number }[],
  currency = 'USD',
) => ({
  amount,
  currency,
  paidById: payers[0]?.memberId ?? '',
  payers,
  participants,
});

const date = (value: string) => DateTime.toDateUtc(DateTime.makeUnsafe(value));

const group = (
  overrides: Partial<Parameters<typeof summarizeGroup>[0]> = {},
): Parameters<typeof summarizeGroup>[0] => ({
  id: 'group-1',
  name: 'Trip',
  type: 'trip',
  description: null,
  imageUrl: null,
  createdAt: date('2026-11-01T00:00:00.000Z'),
  updatedAt: date('2026-11-01T00:00:00.000Z'),
  GroupMember: [
    member('m-ana', 'ana'),
    member('m-bruno', 'bruno'),
    member('m-carla', null, 'Carla'),
  ],
  Expense: [
    expense(
      90,
      [{ memberId: 'm-ana', amount: 90 }],
      [
        { memberId: 'm-ana', share: 30 },
        { memberId: 'm-bruno', share: 30 },
        { memberId: 'm-carla', share: 30 },
      ],
    ),
  ],
  ...overrides,
});

const profile = { name: 'Ana', image: null, updatedAt: date('2026-01-01') };

describe('summarizeGroup', () => {
  test('shows what the payer is owed, per member', () => {
    const summary = summarizeGroup(group(), 'ana', profile);

    expect(summary.currentUser).toEqual({
      memberId: 'm-ana',
      name: 'm-ana',
      image: null,
    });
    expect(summary.participantBalances).toEqual([
      {
        memberId: 'm-bruno',
        memberName: 'm-bruno',
        currency: 'USD',
        amount: 30,
        direction: 'theyOweYou',
        label: 'Te debe 30 USD',
      },
      {
        memberId: 'm-carla',
        memberName: 'Carla',
        currency: 'USD',
        amount: 30,
        direction: 'theyOweYou',
        label: 'Te debe 30 USD',
      },
    ]);
    expect(summary.totalsByCurrency).toEqual({ USD: 60 });
    expect(summary.hasExpenses).toBe(true);
  });

  test('shows what a participant owes the payer', () => {
    const summary = summarizeGroup(group(), 'bruno', profile);

    expect(summary.participantBalances).toEqual([
      {
        memberId: 'm-ana',
        memberName: 'm-ana',
        currency: 'USD',
        amount: 30,
        direction: 'youOweThem',
        label: 'Debes 30 USD',
      },
    ]);
    expect(summary.totalsByCurrency).toEqual({ USD: -30 });
  });

  test('moves the current member to the end of the member list', () => {
    const summary = summarizeGroup(group(), 'bruno', profile);

    expect(summary.members.map((item) => item.id)).toEqual([
      'm-ana',
      'm-carla',
      'm-bruno',
    ]);
  });

  test('adds personal expenses without participants to the totals', () => {
    const summary = summarizeGroup(
      group({
        type: 'personal',
        Expense: [expense(12.345, [{ memberId: 'm-ana', amount: 12.345 }], [])],
      }),
      'ana',
      profile,
    );

    expect(summary.participantBalances).toEqual([]);
    expect(summary.totalsByCurrency).toEqual({ USD: 12.35 });
  });

  test('reports the profile of a user who is not a member, without balances', () => {
    const summary = summarizeGroup(group(), 'stranger', profile);

    expect(summary.currentUser).toEqual({
      memberId: 'stranger',
      name: 'Ana',
      image: null,
    });
    expect(summary.participantBalances).toEqual([]);
    expect(summary.totalsByCurrency).toEqual({});
  });
});
