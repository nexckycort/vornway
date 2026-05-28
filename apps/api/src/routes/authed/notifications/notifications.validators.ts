import * as z from 'zod';

export const listNotificationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().min(1).optional(),
  markAsRead: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});
