import { Schema } from 'effect';

export const parseJson = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.Unknown),
);

export const stringifyJson = Schema.encodeSync(
  Schema.fromJsonString(Schema.Unknown),
);
