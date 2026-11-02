import { Option, Schema } from 'effect';

const SEPARATOR = '|';
const SOURCES = [
  'transaction',
  'group-expense',
  'debt-payment',
  'debt-loan',
] as const;

type MovementSource = (typeof SOURCES)[number];

type MovementKey = {
  occurredAt: Date;
  source: MovementSource;
  id: string;
};

type Movement = {
  occurredAt: string;
  source: MovementSource;
  id: string;
};

export const encodeMovementCursor = (movement: Movement) =>
  [new Date(movement.occurredAt).getTime(), movement.source, movement.id].join(
    SEPARATOR,
  );

export const decodeMovementCursor = (cursor?: string): MovementKey | null => {
  if (!cursor) return null;

  const [timestampValue, source, id] = cursor.split(SEPARATOR);
  const timestamp = Number(timestampValue);
  const knownSource = SOURCES.find((candidate) => candidate === source);
  if (!Number.isFinite(timestamp) || !knownSource || !id) return null;

  return { occurredAt: new Date(timestamp), source: knownSource, id };
};

export const compareMovements = (
  left: Movement | MovementKey,
  right: Movement | MovementKey,
) => {
  const dateDelta = timestampOf(right) - timestampOf(left);
  if (dateDelta !== 0) return dateDelta;
  return sortKey(right).localeCompare(sortKey(left));
};

export const isMovementAfterCursor = (
  movement: Movement,
  cursor: MovementKey | null,
) => !cursor || compareMovements(cursor, movement) < 0;

const timestampOf = (movement: Movement | MovementKey) =>
  new Date(movement.occurredAt).getTime();

const sortKey = (movement: Movement | MovementKey) =>
  `${movement.source}:${movement.id}`;

const AccountCursor = Schema.fromJsonString(
  Schema.Struct({
    occurredAt: Schema.DateFromString,
    id: Schema.String.check(Schema.isMinLength(1)),
  }),
);

export const encodeAccountMovementCursor = (movement: {
  occurredAt: string;
  id: string;
}) =>
  encodeURIComponent(
    JSON.stringify({ occurredAt: movement.occurredAt, id: movement.id }),
  );

export const decodeAccountMovementCursor = (cursor: string) =>
  Option.liftThrowable(decodeURIComponent)(cursor).pipe(
    Option.flatMap(Schema.decodeUnknownOption(AccountCursor)),
  );
