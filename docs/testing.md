# Testing

Tests use `bun:test`. Each touched project has `bun run test`, `bun check`, and `bun typecheck` scripts. Run them from `apps/api`, `packages/contracts`, or `packages/api-client` as appropriate.

API integration tests use a real Better Auth configuration and Postgres. Set `TEST_DATABASE_URL` to a disposable database populated with `prisma migrate deploy`; the default local database can be started with `docker compose up -d postgres`. Testkit helpers live in `apps/api/testkit/`: `makeTestApp`, `testEffect`, `device`, and sign-in helpers. Fake only external email, storage and push providers. Every user-owned resource needs an isolation test and each unbounded list needs a cursor pagination test.

Pure contract and client behavior belongs in `*.test.ts`; server route behavior belongs in `*.integration.test.ts`. Tests sit next to the code they cover.
