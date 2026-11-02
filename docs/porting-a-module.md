# Porting an API module

1. Define the endpoint group and schemas in `packages/contracts/src/modules/<feature>/contract.ts`.
2. Add the group to `packages/contracts/src/api.ts` and export its public schemas from the package entrypoint.
3. Implement domain behavior in `apps/api/src/modules/<feature>/service.ts` using injected services such as `Database`; every service method uses `Effect.fn('Service.method')` and tagged failures.
4. Add thin `HttpApiBuilder.group` handlers in `http.ts` and wire them in `apps/api/src/app.ts`.
5. Remove the feature's paths from the Hono fallback and delete the old `apps/api/src/routes/...` files when no other code imports them. Keep `src/hc/<feature>.ts` until the webapp migrates.
6. Add integration tests in `*.integration.test.ts` with `apps/api/testkit/`, including user isolation and cursor pagination where relevant.
7. Run `bun check`, `bun typecheck`, and `bun run test` in the touched projects.
