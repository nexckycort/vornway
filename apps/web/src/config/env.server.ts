import * as z from 'zod';

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']),
  BETTER_AUTH_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  APP_ENV: z.enum(['dev', 'prod']).default('prod'),
});

export const serverEnv = serverEnvSchema.parse(process.env);
