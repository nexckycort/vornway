import { describe, expect, test } from 'bun:test';
import { Exit, Schema } from 'effect';
import {
  literalsWithFallback,
  Page,
  PageQuery,
  TrimmedString,
} from './schema.ts';

const Status = literalsWithFallback(['active', 'suspended'], 'unknown');

describe('literalsWithFallback', () => {
  test('decodes known values as themselves', () => {
    expect(Schema.decodeUnknownSync(Status)('active')).toBe('active');
  });

  test('decodes values added after this build as the fallback', () => {
    expect(Schema.decodeUnknownSync(Status)('archived')).toBe('unknown');
  });

  test('refuses to encode the fallback', () => {
    expect(Exit.isFailure(Schema.encodeExit(Status)('unknown'))).toBe(true);
  });
});

describe('PageQuery', () => {
  const decode = Schema.decodeUnknownExit(Schema.toCodecStringTree(PageQuery));

  test('reads limit from the query string', () => {
    expect(decode({ limit: '20' })).toEqual(Exit.succeed({ limit: 20 }));
  });

  test('rejects limits outside 1..100', () => {
    expect(Exit.isFailure(decode({ limit: '0' }))).toBe(true);
    expect(Exit.isFailure(decode({ limit: '101' }))).toBe(true);
  });
});

describe('Page', () => {
  const decode = Schema.decodeUnknownSync(Page(Schema.String));

  test('keeps the pagination envelope existing clients read', () => {
    const page = {
      data: ['a'],
      pagination: { limit: 20, total: 1, nextCursor: null },
    };

    expect(decode(page)).toEqual(page);
  });
});

describe('TrimmedString', () => {
  test('trims before checking', () => {
    const NonEmpty = TrimmedString.check(Schema.isMinLength(1));

    expect(Schema.decodeUnknownSync(NonEmpty)('  ana ')).toBe('ana');
    expect(Exit.isFailure(Schema.decodeUnknownExit(NonEmpty)('   '))).toBe(
      true,
    );
  });
});
