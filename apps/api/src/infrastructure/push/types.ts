export type PushSubscriptionInput = {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
};

export type PushNotificationPayload = {
  title: string;
  body: string;
  url: string;
  type: string;
  tag: string;
  groupId: string;
  expenseId: string | null;
};

export type StoredPushSubscription = {
  id: string;
  endpoint: string;
  revokedAt: Date | null;
};
