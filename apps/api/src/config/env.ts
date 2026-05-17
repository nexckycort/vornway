import * as z from 'zod';

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('production'),

  BETTER_AUTH_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(1),

  DATABASE_URL: z.string().min(1),

  RESEND_API_KEY: z.string().min(1),

  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),

  VAPID_PUBLIC_KEY: z.string().min(1),
  VAPID_PRIVATE_KEY: z.string().min(1),
  VAPID_SUBJECT: z.string().min(1),

  MCP_TOKEN_SECRET: z.string().min(1).optional(),
  MCP_OAUTH_CLIENTS: z.string().optional(),
});

export const env = serverEnvSchema.parse(process.env);
