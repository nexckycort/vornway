import * as z from 'zod';

export const listGroupsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().min(1).optional(),
});

export type ListGroupsQuery = z.infer<typeof listGroupsQuerySchema>;
