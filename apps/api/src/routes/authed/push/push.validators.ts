import * as z from 'zod';

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const revokePushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
});

export const nativePushSubscriptionSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android']).optional(),
});

export const revokeNativePushSubscriptionSchema = z.object({
  token: z.string().min(1),
});
