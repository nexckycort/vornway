import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'db',
  migrations: {
    path: './db/migrations',
    seed: 'bun db/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
