import * as z from 'zod';

export const resolveMapUrlSchema = z.object({
  url: z.string().trim().url().max(1000),
});
