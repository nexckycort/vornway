import * as z from 'zod';

export const inviteParamsSchema = z.object({
  inviteCode: z.string().min(1),
});

export const acceptInviteSchema = z.object({
  memberId: z.string().min(1).optional(),
});
