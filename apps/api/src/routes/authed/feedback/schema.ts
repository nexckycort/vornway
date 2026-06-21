import * as z from 'zod';

export const listFeedbackQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().trim().min(1).optional(),
});
export type ListFeedbackQueryInput = z.infer<typeof listFeedbackQuerySchema>;

export const createFeedbackSchema = z.object({
  type: z.enum(['BUG', 'FEATURE_REQUEST']),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(5000),
  priority: z.string().trim().min(1).max(80).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  images: z
    .array(
      z.object({
        dataUrl: z.string().trim().min(1),
      }),
    )
    .max(5)
    .optional(),
});
export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;

export const feedbackIdParamSchema = z.object({
  feedbackId: z.string().trim().min(1),
});
export type FeedbackIdParamInput = z.infer<typeof feedbackIdParamSchema>;

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

export type ListFeedbackResult = {
  data: UserFeedbackItem[];
  pagination: {
    limit: number;
    total: number;
    nextCursor: string | null;
  };
};
