export const normalizeAmount = (value: number) => Number(value.toFixed(2));

export const sameCurrency = (a: string, b: string) =>
  a.trim().toUpperCase() === b.trim().toUpperCase();

type Shares = Record<string, number>;

export const splitShares = (input: {
  method: 'equal' | 'percentage' | 'exact';
  amount: number;
  participantIds: readonly string[];
  percentageShares: Shares | undefined;
  exactShares: Shares | undefined;
}): Shares | undefined => {
  if (input.method === 'exact') {
    return exactSplit(input.amount, input.participantIds, input.exactShares);
  }
  if (input.method === 'percentage') {
    return percentageSplit(
      input.amount,
      input.participantIds,
      input.percentageShares,
    );
  }
  return equalSplit(input.amount, input.participantIds);
};

const equalSplit = (amount: number, participantIds: readonly string[]) => {
  const baseShare = normalizeAmount(amount / participantIds.length);
  return withRemainder(amount, participantIds, () => baseShare);
};

const exactSplit = (
  amount: number,
  participantIds: readonly string[],
  exactShares: Shares | undefined,
) => {
  if (!exactShares || hasUnknownKey(exactShares, participantIds)) {
    return undefined;
  }
  const shares = Object.fromEntries(
    participantIds.map((id) => [id, normalizeAmount(exactShares[id] ?? 0)]),
  );
  return total(shares) === normalizeAmount(amount) ? shares : undefined;
};

const percentageSplit = (
  amount: number,
  participantIds: readonly string[],
  percentageShares: Shares | undefined,
) => {
  if (!percentageShares || hasUnknownKey(percentageShares, participantIds)) {
    return undefined;
  }
  if (participantIds.some((id) => percentageShares[id] === undefined)) {
    return undefined;
  }
  const normalized = Object.fromEntries(
    participantIds.map((id) => [
      id,
      normalizeAmount(percentageShares[id] ?? 0),
    ]),
  );
  if (Math.abs(total(normalized) - 100) >= 0.01) return undefined;
  return withRemainder(amount, participantIds, (id) =>
    normalizeAmount(amount * ((normalized[id] ?? 0) / 100)),
  );
};

const hasUnknownKey = (shares: Shares, participantIds: readonly string[]) =>
  Object.keys(shares).some((id) => !participantIds.includes(id));

const total = (shares: Shares) =>
  normalizeAmount(Object.values(shares).reduce((sum, share) => sum + share, 0));

const withRemainder = (
  amount: number,
  participantIds: readonly string[],
  portion: (participantId: string) => number,
): Shares => {
  let assigned = 0;
  return Object.fromEntries(
    participantIds.map((id, index) => {
      const share =
        index === participantIds.length - 1
          ? normalizeAmount(amount - assigned)
          : portion(id);
      assigned = normalizeAmount(assigned + share);
      return [id, share];
    }),
  );
};
