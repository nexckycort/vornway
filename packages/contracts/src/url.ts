import { Option, Schema } from 'effect';

export const isUrl = Schema.makeFilter<string>(
  (value) =>
    Option.isSome(Schema.decodeUnknownOption(Schema.URLFromString)(value)) ||
    'Must be a valid URL',
);
