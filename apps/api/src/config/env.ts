import { Config } from 'effect';

export const env = {
  host: Config.String('HOST').pipe(Config.withDefault('0.0.0.0')),
  port: Config.Port('PORT').pipe(Config.withDefault(3000)),
  nodeEnv: Config.Literals(
    ['development', 'test', 'production'],
    'NODE_ENV',
  ).pipe(Config.withDefault('production')),
  databaseUrl: Config.Redacted('DATABASE_URL'),
  authUrl: Config.String('BETTER_AUTH_URL'),
  authSecret: Config.Redacted('BETTER_AUTH_SECRET'),
  resendApiKey: Config.Redacted('RESEND_API_KEY'),
  googleClientId: Config.String('GOOGLE_CLIENT_ID'),
  googleClientSecret: Config.Redacted('GOOGLE_CLIENT_SECRET'),
  vapidPublicKey: Config.String('VAPID_PUBLIC_KEY'),
  vapidPrivateKey: Config.Redacted('VAPID_PRIVATE_KEY'),
  vapidSubject: Config.String('VAPID_SUBJECT'),
  cloudflareAccountId: Config.String('CLOUDFLARE_ACCOUNT_ID'),
  cloudflareAccessKeyId: Config.String('CLOUDFLARE_ACCESS_KEY_ID'),
  cloudflareSecretAccessKey: Config.Redacted('CLOUDFLARE_SECRET_ACCESS_KEY'),
  cloudflareBucketName: Config.String('CLOUDFLARE_BUCKET_NAME'),
  mcpTokenSecret: Config.option(Config.Redacted('MCP_TOKEN_SECRET')),
  mcpOauthClients: Config.option(Config.String('MCP_OAUTH_CLIENTS')),
};
