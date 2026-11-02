import { describe, expect, test } from 'bun:test';
import { Effect } from 'effect';
import { compressImage } from './storage';

const PIXEL_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const spec = { size: 400, quality: 78 };

describe('compressImage', () => {
  test('converts an uploaded image to webp', async () => {
    const bytes = await Effect.runPromise(compressImage(PIXEL_PNG, spec));

    expect(new TextDecoder().decode(bytes.slice(8, 12))).toBe('WEBP');
  });

  test('refuses values that are not base64 data URLs', async () => {
    const error = await Effect.runPromise(
      Effect.flip(compressImage('https://example.com/a.png', spec)),
    );

    expect(error._tag).toBe('StorageError');
  });

  test('refuses images larger than 10 MB', async () => {
    const huge = `data:image/png;base64,${Buffer.alloc(11 * 1024 * 1024).toString('base64')}`;

    const error = await Effect.runPromise(
      Effect.flip(compressImage(huge, spec)),
    );

    expect(error._tag).toBe('StorageError');
  });

  test('refuses bytes that are not an image', async () => {
    const error = await Effect.runPromise(
      Effect.flip(compressImage('data:image/png;base64,AAAA', spec)),
    );

    expect(error._tag).toBe('StorageError');
  });
});
