import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'db',
  datasource: {
    url: env('DATABASE_URL'),
  },
});
