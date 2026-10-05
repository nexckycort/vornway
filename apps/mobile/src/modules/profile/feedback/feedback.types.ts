export type FeedbackType = 'BUG' | 'FEATURE_REQUEST';
export type FeedbackStatus =
  | 'OPEN'
  | 'IN_REVIEW'
  | 'PLANNED'
  | 'DONE'
  | 'REJECTED';

export type FeedbackItem = {
  id: string;
  type: FeedbackType;
  title: string;
  description: string;
  status: FeedbackStatus;
  priority: string | null;
  metadata: { attachments?: Array<{ url: string }> };
  createdAt: string;
};
