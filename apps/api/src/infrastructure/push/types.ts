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
  groupId: string;
  expenseId: string | null;
};

export type StoredPushSubscription = {
  id: string;
  endpoint: string;
  revokedAt: Date | null;
};

export type PushNotifications = {
  storeSubscription: (
    input: PushSubscriptionInput,
  ) => Promise<StoredPushSubscription>;
  revokeSubscription: (input: {
    userId: string;
    endpoint: string;
  }) => Promise<void>;
  sendToUsers: (
    userIds: string[],
    payload: PushNotificationPayload,
  ) => Promise<void>;
};
