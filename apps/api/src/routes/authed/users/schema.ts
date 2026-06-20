import * as z from 'zod';

export const searchUsersQuerySchema = z.object({
  query: z.string().trim().min(1).max(120),
});
export type SearchUsersQueryInput = z.infer<typeof searchUsersQuerySchema>;

export const updateUserAvatarSchema = z.object({
  dataUrl: z.string().trim().min(1),
});
export type UpdateUserAvatarInput = z.infer<typeof updateUserAvatarSchema>;
