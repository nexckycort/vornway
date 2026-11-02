import { describe, expect, test } from 'bun:test';
import { pairwiseBalances } from './balances';
import {
  normalizeExpenseTags,
  sanitizeAdvancedDetails,
  sanitizeSharedSplit,
} from './expense-metadata';
import {
  calculateTotalsByCurrency,
  createPayerShares,
  createSplitShares,
  readSplitMethod,
} from './helpers';

describe('createSplitShares', () => {
  const participantIds = ['a', 'b', 'c'];

  test('splits equally, rounding to cents', () => {
    expect(
      createSplitShares({ amount: 100, participantIds, splitMethod: 'equal' })
        .shares,
    ).toEqual({ a: 33.33, b: 33.33, c: 33.33 });
  });

  test('applies percentages and exact amounts, defaulting to zero', () => {
    const exactShares = { a: 25, b: 75 };
    expect(
      createSplitShares({
        amount: 200,
        participantIds,
        splitMethod: 'percentage',
        exactShares,
      }).shares,
    ).toEqual({ a: 50, b: 150, c: 0 });
    expect(
      createSplitShares({
        amount: 200,
        participantIds,
        splitMethod: 'exact',
        exactShares,
      }).shares,
    ).toEqual({ a: 25, b: 75, c: 0 });
  });

  test('has no shares without participants', () => {
    expect(
      createSplitShares({
        amount: 10,
        participantIds: [],
        splitMethod: 'equal',
      }).shares,
    ).toEqual({});
  });
});

describe('createPayerShares', () => {
  test('gives a single payer the whole amount', () => {
    expect(createPayerShares({ amount: 80, payerIds: [' a '] })).toEqual({
      payerIds: ['a'],
      shares: { a: 80 },
    });
  });

  test('uses the declared amounts of several payers', () => {
    expect(
      createPayerShares({
        amount: 100,
        payerIds: ['a', 'b'],
        payers: [
          { memberId: 'a', amount: 30 },
          { memberId: 'b', amount: 70 },
          { memberId: 'ignored', amount: 5 },
        ],
      }).shares,
    ).toEqual({ a: 30, b: 70 });
  });

  test('splits among several payers, leaving the remainder to the last', () => {
    expect(
      createPayerShares({ amount: 100, payerIds: ['a', 'b', 'c'] }).shares,
    ).toEqual({ a: 33.33, b: 33.33, c: 33.34 });
  });
});

describe('readSplitMethod', () => {
  test('trusts the stored method, otherwise infers it from the shares', () => {
    expect(readSplitMethod({ splitMethod: 'percentage' }, [])).toBe(
      'percentage',
    );
    expect(readSplitMethod(null, [{ share: 10 }, { share: 10.004 }])).toBe(
      'equal',
    );
    expect(readSplitMethod({}, [{ share: 10 }, { share: 30 }])).toBe('exact');
  });
});

describe('calculateTotalsByCurrency', () => {
  const expenses = [
    { amount: 10, currency: 'COP', notes: null, participants: [{}] },
    {
      amount: 5,
      currency: 'COP',
      notes: '[SETTLEMENT:FLEX]',
      participants: [{}],
    },
    { amount: 7, currency: 'COP', notes: '[DELETED]', participants: [{}] },
    { amount: 3, currency: 'USD', notes: null, participants: [] },
  ];

  test('skips settlements, deleted and participantless expenses', () => {
    expect(calculateTotalsByCurrency(expenses)).toEqual({ COP: 10 });
  });

  test('keeps participantless expenses on personal groups', () => {
    expect(
      calculateTotalsByCurrency(expenses, {
        includeParticipantlessExpenses: true,
      }),
    ).toEqual({ COP: 10, USD: 3 });
  });
});

describe('expense metadata', () => {
  test('normalizes tags: lowercase, hyphenated, unique, at most ten', () => {
    expect(
      normalizeExpenseTags(['#Viaje Largo', 'viaje-largo', 'x!y', ' ']),
    ).toEqual(['viaje-largo', 'xy']);
    expect(
      normalizeExpenseTags(Array.from({ length: 15 }, (_, i) => `t${i}`)),
    ).toHaveLength(10);
  });

  test('drops advanced details without content', () => {
    expect(sanitizeAdvancedDetails({ type: 'food', notes: '  ' })).toBeNull();
    expect(
      sanitizeAdvancedDetails({ type: 'food', placeName: ' Casa ' }),
    ).toEqual({ type: 'food', placeName: 'Casa' });
    expect(sanitizeAdvancedDetails({ placeName: 'Casa' })?.type).toBe('other');
  });

  test('sums shared split items into the amount', () => {
    expect(
      sanitizeSharedSplit({
        amount: 1,
        splitMethod: 'exact',
        items: [
          { name: ' A ', amount: 10 },
          { name: ' ', amount: 5 },
          { name: 'B', amount: 2.5 },
        ],
      }),
    ).toEqual({
      amount: 12.5,
      splitMethod: 'exact',
      items: [
        { name: 'A', amount: 10 },
        { name: 'B', amount: 2.5 },
      ],
    });
  });
});

describe('pairwiseBalances', () => {
  const expenses = [
    {
      amount: 100,
      currency: 'COP',
      paidById: 'me',
      payers: [],
      participants: [
        { memberId: 'me', share: 50 },
        { memberId: 'ana', share: 50 },
      ],
    },
    {
      amount: 30,
      currency: 'COP',
      paidById: 'ana',
      payers: [{ memberId: 'ana', amount: 30 }],
      participants: [
        { memberId: 'me', share: 20 },
        { memberId: 'ana', share: 10 },
      ],
    },
  ];

  test('nets what the other members owe me and I owe them', () => {
    expect(pairwiseBalances(expenses, 'me')).toEqual([
      { memberId: 'ana', currency: 'COP', net: 30 },
    ]);
  });

  test('leaves out settled counterparts', () => {
    expect(
      pairwiseBalances(
        [
          {
            amount: 10,
            currency: 'COP',
            paidById: 'me',
            payers: [],
            participants: [{ memberId: 'ana', share: 10 }],
          },
          {
            amount: 10,
            currency: 'COP',
            paidById: 'ana',
            payers: [],
            participants: [{ memberId: 'me', share: 10 }],
          },
        ],
        'me',
      ),
    ).toEqual([]);
  });
});
