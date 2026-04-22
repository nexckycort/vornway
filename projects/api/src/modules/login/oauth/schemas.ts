import * as z from 'zod';

export const authorizeQuerySchema = z.object({
  response_type: z.literal('code').optional(),
  client_id: z.string().min(1),
  redirect_uri: z.url(),
  state: z.string().optional(),
  scope: z.string().optional(),
  resource: z.url().optional(),
  code_challenge: z.string().min(16).optional(),
  code_challenge_method: z.enum(['plain', 'S256']).optional(),
});

export const authorizeFormSchema = z.object({
  client_id: z.string().min(1),
  redirect_uri: z.url(),
  state: z.string().optional(),
  scope: z.string().optional(),
  resource: z.url().optional(),
  code_challenge: z.string().min(16).optional(),
  code_challenge_method: z.enum(['plain', 'S256']).optional(),
  email: z.email(),
  otp: z.string().min(4),
});

export const tokenFormSchema = z.object({
  grant_type: z.literal('authorization_code'),
  code: z.string().min(1),
  client_id: z.string().min(1),
  redirect_uri: z.url(),
  code_verifier: z.string().optional(),
});

export const clientRegistrationSchema = z.object({
  client_name: z.string().optional(),
  redirect_uris: z.array(z.url()).min(1),
  grant_types: z.array(z.string()).optional(),
  response_types: z.array(z.string()).optional(),
  token_endpoint_auth_method: z.string().optional(),
});
