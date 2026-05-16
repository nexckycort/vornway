import * as z from 'zod';

export const listGroupsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().min(1).optional(),
});

export const createGroupSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.string().min(1).max(60),
  description: z.string().max(400).optional(),
});

export type ListGroupsQuery = z.infer<typeof listGroupsQuerySchema>;
