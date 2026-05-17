import * as z from 'zod';

export const searchUsersQuerySchema = z.object({
  query: z.string().trim().min(1).max(120),
});
