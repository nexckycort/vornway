import { describe, expect, test } from 'bun:test';
import {
  getVersionedGroupImageUrl,
  resolveAssetUrl,
  resolveUserImageUrl,
  storageKey,
} from './image-urls';

describe('resolveAssetUrl', () => {
  test('resolves stored paths against the asset host and keeps absolute URLs', () => {
    expect(resolveAssetUrl(null)).toBeNull();
    expect(resolveAssetUrl('/feedback/ana/1/attachment-1.webp')).toBe(
      'https://assets.vornway.com/feedback/ana/1/attachment-1.webp',
    );
    expect(resolveAssetUrl('feedback/ana/1/attachment-1.webp')).toBe(
      'https://assets.vornway.com/feedback/ana/1/attachment-1.webp',
    );
    expect(resolveAssetUrl('https://cdn.example.com/a.webp')).toBe(
      'https://cdn.example.com/a.webp',
    );
  });
});

describe('resolveUserImageUrl', () => {
  const updatedAt = new Date('2026-11-01T00:00:00.000Z');

  test('versions stored paths but leaves absolute URLs and data URLs alone', () => {
    expect(resolveUserImageUrl('/users/ana/avatar.webp', updatedAt)).toBe(
      `https://assets.vornway.com/users/ana/avatar.webp?v=${updatedAt.getTime()}`,
    );
    expect(
      resolveUserImageUrl('https://cdn.example.com/a.png', updatedAt),
    ).toBe('https://cdn.example.com/a.png');
    expect(resolveUserImageUrl('data:image/png;base64,AAAA', updatedAt)).toBe(
      'data:image/png;base64,AAAA',
    );
    expect(resolveUserImageUrl('/users/ana/avatar.webp')).toBe(
      'https://assets.vornway.com/users/ana/avatar.webp',
    );
    expect(resolveUserImageUrl(null, updatedAt)).toBeNull();
  });
});

describe('getVersionedGroupImageUrl', () => {
  test('appends the version to paths and URLs, with the right separator', () => {
    expect(
      getVersionedGroupImageUrl(
        '/groups/g1/cover.webp',
        '2026-11-01T00:00:00.000Z',
      ),
    ).toBe(
      `https://assets.vornway.com/groups/g1/cover.webp?v=${Date.parse('2026-11-01T00:00:00.000Z')}`,
    );
    expect(
      getVersionedGroupImageUrl(
        'https://cdn.example.com/a.webp?x=1',
        new Date(5),
      ),
    ).toBe('https://cdn.example.com/a.webp?x=1&v=5');
    expect(getVersionedGroupImageUrl('/groups/g1/cover.webp', null)).toBe(
      'https://assets.vornway.com/groups/g1/cover.webp',
    );
    expect(getVersionedGroupImageUrl(undefined, new Date(5))).toBeNull();
  });
});

describe('storageKey', () => {
  test('finds the bucket key of files inside the folder only', () => {
    const key = 'feedback/ana/1/attachment-1.webp';

    expect(storageKey('feedback', `/${key}`)).toBe(key);
    expect(storageKey('feedback', `https://assets.vornway.com/${key}`)).toBe(
      key,
    );
    expect(storageKey('feedback', '/users/ana/avatar.webp')).toBeNull();
    expect(
      storageKey('feedback', 'https://cdn.example.com/feedback/a.webp'),
    ).toBeNull();
    expect(storageKey('feedback', undefined)).toBeNull();
    expect(storageKey('feedback', 'not a url')).toBeNull();
  });

  test('understands the media route the API serves group files from', () => {
    expect(
      storageKey(
        'groups',
        'https://api.vornway.com/api/media/groups/g1/cover.webp',
      ),
    ).toBe('groups/g1/cover.webp');
    expect(
      storageKey(
        'users',
        'https://api.vornway.com/api/media/groups/g1/cover.webp',
      ),
    ).toBeNull();
  });
});
