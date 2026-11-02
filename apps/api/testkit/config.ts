import { ConfigProvider } from 'effect';

export const TEST_ORIGIN = 'http://localhost:3000';

export const testConfig = (overrides: Record<string, string> = {}) =>
  ConfigProvider.layer(
    ConfigProvider.fromUnknown({
      NODE_ENV: 'test',
      BETTER_AUTH_URL: TEST_ORIGIN,
      BETTER_AUTH_SECRET: 'test-secret-that-is-at-least-32-chars',
      DATABASE_URL: 'postgres://unused',
      RESEND_API_KEY: 're_unused',
      GOOGLE_CLIENT_ID: 'unused',
      GOOGLE_CLIENT_SECRET: 'unused',
      VAPID_PUBLIC_KEY: 'unused',
      VAPID_PRIVATE_KEY: 'unused',
      VAPID_SUBJECT: 'mailto:test@vornway.test',
      CLOUDFLARE_ACCOUNT_ID: 'unused',
      CLOUDFLARE_ACCESS_KEY_ID: 'unused',
      CLOUDFLARE_SECRET_ACCESS_KEY: 'unused',
      CLOUDFLARE_BUCKET_NAME: 'unused',
      ...overrides,
    }),
  );
