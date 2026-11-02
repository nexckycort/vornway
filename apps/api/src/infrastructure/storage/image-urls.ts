export const USER_IMAGE_ASSET_BASE_URL = 'https://assets.vornway.com';
export const GROUP_IMAGE_ASSET_BASE_URL = 'https://assets.vornway.com';

export function resolveUserImageUrl(
  imagePathOrUrl: string | null | undefined,
  updatedAt?: Date | string | null,
) {
  if (!imagePathOrUrl) return null;
  if (
    imagePathOrUrl.startsWith('https://') ||
    imagePathOrUrl.startsWith('data:')
  ) {
    return imagePathOrUrl;
  }

  const resolved = imagePathOrUrl.startsWith('/')
    ? `${USER_IMAGE_ASSET_BASE_URL}${imagePathOrUrl}`
    : `${USER_IMAGE_ASSET_BASE_URL}/${imagePathOrUrl}`;

  const version =
    updatedAt instanceof Date
      ? updatedAt.getTime()
      : typeof updatedAt === 'string'
        ? Date.parse(updatedAt)
        : null;

  if (!version || Number.isNaN(version)) {
    return resolved;
  }

  const separator = resolved.includes('?') ? '&' : '?';
  return `${resolved}${separator}v=${version}`;
}

export function resolveGroupImageUrl(
  imagePathOrUrl: string | null | undefined,
) {
  if (!imagePathOrUrl) return null;
  if (imagePathOrUrl.startsWith('https://')) return imagePathOrUrl;
  if (imagePathOrUrl.startsWith('/')) {
    return `${GROUP_IMAGE_ASSET_BASE_URL}${imagePathOrUrl}`;
  }

  return `${GROUP_IMAGE_ASSET_BASE_URL}/${imagePathOrUrl}`;
}

export function getVersionedGroupImageUrl(
  imageUrl: string | null | undefined,
  updatedAt: Date | string | null | undefined,
) {
  const resolvedImageUrl = resolveGroupImageUrl(imageUrl);
  if (!resolvedImageUrl) return null;

  const version =
    updatedAt instanceof Date
      ? updatedAt.getTime()
      : typeof updatedAt === 'string'
        ? Date.parse(updatedAt)
        : null;

  if (!version || Number.isNaN(version)) {
    return resolvedImageUrl;
  }

  const separator = resolvedImageUrl.includes('?') ? '&' : '?';
  return `${resolvedImageUrl}${separator}v=${version}`;
}
