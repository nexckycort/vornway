export type UserFeedbackType = 'BUG' | 'FEATURE_REQUEST';

export type UserFeedbackStatus =
  | 'OPEN'
  | 'IN_REVIEW'
  | 'PLANNED'
  | 'DONE'
  | 'REJECTED';

export type UserFeedbackAttachment = {
  url: string;
};

export type UserFeedbackMetadata = Record<string, unknown> & {
  attachments?: UserFeedbackAttachment[];
};

export type CreateUserFeedbackInput = {
  userId: string;
  type: UserFeedbackType;
  title: string;
  description: string;
  priority?: string | null;
  metadata?: Record<string, unknown>;
  images?: Array<{
    dataUrl: string;
  }>;
};

export type ListUserFeedbackInput = {
  userId: string;
  limit: number;
  cursor?: string | null;
};

export type DeleteUserFeedbackInput = {
  userId: string;
  feedbackId: string;
};

export type UserFeedbackItem = {
  id: string;
  userId: string;
  type: UserFeedbackType;
  title: string;
  description: string;
  status: UserFeedbackStatus;
  priority: string | null;
  metadata: UserFeedbackMetadata;
  createdAt: string;
  updatedAt: string;
};

export type ListUserFeedbackResult = {
  data: UserFeedbackItem[];
  pagination: {
    limit: number;
    total: number;
    nextCursor: string | null;
  };
};
