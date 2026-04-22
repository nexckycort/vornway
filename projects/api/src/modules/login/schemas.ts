import * as z from 'zod';

export const sendOtpSchema = z.object({
  email: z.string().min(1),
  name: z.string().min(1).optional(),
});

export const verifyOtpSchema = z.object({
  email: z.string().min(1),
  otp: z.string().min(1),
  previousUserId: z.string().min(1).optional(),
  wasAnonymous: z.boolean().optional(),
});

export const syncGoogleSchema = z.object({
  previousUserId: z.string().min(1).optional(),
  wasAnonymous: z.boolean().optional(),
});
