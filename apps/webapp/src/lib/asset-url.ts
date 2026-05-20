const ASSET_BASE_URL = 'https://assets.vornway.com';

export function resolveAssetUrl(
  value: string | null | undefined,
  updatedAt?: string | Date | null,
) {
  if (!value) return null;
  if (value.startsWith('https://') || value.startsWith('data:')) {
    return value;
  }

  const resolved = value.startsWith('/')
    ? `${ASSET_BASE_URL}${value}`
    : `${ASSET_BASE_URL}/${value}`;

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
