import * as z from 'zod';

export const searchUsersQuerySchema = z.object({
  query: z.string().trim().min(1).max(120),
});
export type SearchUsersQueryInput = z.infer<typeof searchUsersQuerySchema>;

export const updateUsernameSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(24)
    .regex(
      /^[a-z0-9._]+$/,
      'El nombre de usuario solo puede tener letras minusculas, numeros, punto y guion bajo',
    ),
});
export type UpdateUsernameInput = z.infer<typeof updateUsernameSchema>;

export const updateUserAvatarSchema = z.object({
  dataUrl: z.string().trim().min(1),
});
export type UpdateUserAvatarInput = z.infer<typeof updateUserAvatarSchema>;
