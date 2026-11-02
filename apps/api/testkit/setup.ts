import { afterAll } from 'bun:test';
import { closeTestDatabase } from './database';

const LEGACY_ENV = {
  BETTER_AUTH_URL: 'http://localhost:3000',
  BETTER_AUTH_SECRET: 'test-secret-that-is-at-least-32-chars',
  DATABASE_URL: 'postgres://unused',
  RESEND_API_KEY: 're_unused',
  GOOGLE_CLIENT_ID: 'unused',
  GOOGLE_CLIENT_SECRET: 'unused',
  VAPID_PUBLIC_KEY: 'unused',
  VAPID_PRIVATE_KEY: 'unused',
  VAPID_SUBJECT: 'unused',
  CLOUDFLARE_ACCOUNT_ID: 'unused',
  CLOUDFLARE_ACCESS_KEY_ID: 'unused',
  CLOUDFLARE_SECRET_ACCESS_KEY: 'unused',
  CLOUDFLARE_BUCKET_NAME: 'unused',
};

// Modules not ported yet parse process.env when imported, even if a test never calls them.
for (const [name, value] of Object.entries(LEGACY_ENV)) {
  process.env[name] ??= value;
}

afterAll(closeTestDatabase);
