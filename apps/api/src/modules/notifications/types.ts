export type NotificationType = 'expense.created' | 'group.member.added';

export type NotificationInboxItem = {
  id: string;
  type: NotificationType | string;
  title: string;
  body: string;
  url: string;
  groupId: string | null;
  expenseId: string | null;
  actorName: string | null;
  actorImage: string | null;
  readAt: string | null;
  createdAt: string;
};

export type ListNotificationsResult = {
  data: NotificationInboxItem[];
  pagination: {
    limit: number;
    total: number;
    nextCursor: string | null;
  };
};

export type NotificationService = {
  createForUsers: (input: {
    userIds: string[];
    type: NotificationType | string;
    title: string;
    body: string;
    url: string;
    groupId?: string | null;
    expenseId?: string | null;
    actorName?: string | null;
    actorImage?: string | null;
  }) => Promise<void>;
  listForUser: (input: {
    userId: string;
    limit: number;
    cursor: string | null;
  }) => Promise<ListNotificationsResult>;
  markAllAsRead: (userId: string) => Promise<void>;
};
