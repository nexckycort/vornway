import * as z from 'zod';

export const feedbackIdParamSchema = z.object({
  feedbackId: z.string().trim().min(1),
});
