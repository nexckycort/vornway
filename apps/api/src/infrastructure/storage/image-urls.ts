export const ASSET_BASE_URL = 'https://assets.vornway.com';

export function resolveAssetUrl(imagePathOrUrl: string | null | undefined) {
  if (!imagePathOrUrl) return null;
  if (imagePathOrUrl.startsWith('https://')) return imagePathOrUrl;
  if (imagePathOrUrl.startsWith('/')) {
    return `${ASSET_BASE_URL}${imagePathOrUrl}`;
  }

  return `${ASSET_BASE_URL}/${imagePathOrUrl}`;
}

export function resolveUserImageUrl(
  imagePathOrUrl: string | null | undefined,
  updatedAt?: Date | string | null,
) {
  if (
    imagePathOrUrl?.startsWith('https://') ||
    imagePathOrUrl?.startsWith('data:')
  ) {
    return imagePathOrUrl;
  }

  const resolved = resolveAssetUrl(imagePathOrUrl);
  return resolved && withVersion(resolved, updatedAt);
}

export function getVersionedGroupImageUrl(
  imageUrl: string | null | undefined,
  updatedAt: Date | string | null | undefined,
) {
  const resolved = resolveAssetUrl(imageUrl);
  return resolved && withVersion(resolved, updatedAt);
}

export const storageKey = (
  folder: string,
  imagePathOrUrl: string | null | undefined,
) => {
  if (!imagePathOrUrl) return null;
  const prefix = `/${folder}/`;
  if (imagePathOrUrl.startsWith('/')) {
    return imagePathOrUrl.startsWith(prefix) ? imagePathOrUrl.slice(1) : null;
  }
  if (!URL.canParse(imagePathOrUrl)) return null;

  const { pathname } = new URL(imagePathOrUrl);
  const mediaPrefix = `/api/media${prefix}`;
  if (pathname.startsWith(mediaPrefix))
    return pathname.slice('/api/media/'.length);
  return imagePathOrUrl.startsWith(ASSET_BASE_URL) &&
    pathname.startsWith(prefix)
    ? pathname.slice(1)
    : null;
};

function withVersion(url: string, updatedAt: Date | string | null | undefined) {
  const version =
    updatedAt instanceof Date
      ? updatedAt.getTime()
      : typeof updatedAt === 'string'
        ? Date.parse(updatedAt)
        : null;

  if (!version || Number.isNaN(version)) return url;
  return `${url}${url.includes('?') ? '&' : '?'}v=${version}`;
}
