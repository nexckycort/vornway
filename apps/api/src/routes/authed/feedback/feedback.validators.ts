import * as z from 'zod';

export const listFeedbackQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().trim().min(1).optional(),
});

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
