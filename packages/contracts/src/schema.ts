import { Schema, SchemaGetter } from 'effect';

export const literalsWithFallback = <
  const L extends readonly [string, ...string[]],
  const F extends string,
>(
  literals: L,
  fallback: F,
) =>
  Schema.Union([
    Schema.Literals(literals),
    Schema.String.pipe(
      Schema.decodeTo(Schema.Literal(fallback), {
        decode: SchemaGetter.transform(() => fallback),
        encode: SchemaGetter.forbidden(
          () => `"${fallback}" is a decode-only fallback`,
        ),
      }),
    ),
  ]);

export const Cursor = Schema.String.pipe(Schema.brand('Cursor'));
export type Cursor = typeof Cursor.Type;

export class InvalidCursor extends Schema.TaggedError<InvalidCursor>()(
  'InvalidCursor',
  {},
  { httpApiStatus: 400 },
) {}

export const PageQuery = Schema.Struct({
  cursor: Schema.optionalKey(Cursor),
  limit: Schema.optionalKey(
    Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 100 })),
  ),
});
export type PageQuery = typeof PageQuery.Type;

export const Page = <S extends Schema.Top>(item: S) =>
  Schema.Struct({
    data: Schema.Array(item),
    pagination: Schema.Struct({
      limit: Schema.Int,
      total: Schema.Int,
      nextCursor: Schema.NullOr(Cursor),
    }),
  });
