import type { getProfileMessages } from '../-messages';

export type NotificationStatus =
  | 'unsupported'
  | 'permission-required'
  | 'enabled'
  | 'blocked';

export function describeSession(
  userAgent: string | null | undefined,
  t: ReturnType<typeof getProfileMessages>,
) {
  if (!userAgent) return t.deviceUnknown;
  const normalized = userAgent.toLowerCase();
  if (normalized.includes('iphone') || normalized.includes('android')) {
    return t.mobileDevice;
  }
  if (normalized.includes('ipad') || normalized.includes('tablet')) {
    return t.tablet;
  }
  return t.desktop;
}

export function isMobileSession(userAgent?: string | null) {
  if (!userAgent) return false;
  const normalized = userAgent.toLowerCase();
  return (
    normalized.includes('iphone') ||
    normalized.includes('android') ||
    normalized.includes('mobile')
  );
}

export function getNotificationLabel(
  status: NotificationStatus,
  t: ReturnType<typeof getProfileMessages>,
) {
  if (status === 'unsupported') return t.notificationsUnsupported;
  if (status === 'permission-required') return t.notificationsDisabled;
  if (status === 'enabled') return t.notificationsEnabled;
  return t.notificationsBlocked;
}
