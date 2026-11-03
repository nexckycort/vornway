import { DateTime } from 'effect';

export const toDate = (input: DateTime.DateTime.Input) =>
  DateTime.toDateUtc(DateTime.makeUnsafe(input));
