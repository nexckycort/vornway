# AGENTS.md

You are an expert in JavaScript, Rsbuild, and web application development. You write maintainable, performant, and accessible code.

## Commands

- `bun run dev` - Start the dev server
- `bun run build` - Build the app for production
- `bun run preview` - Preview the production build locally

## API clients

- All internal API calls go through `api` from `src/api/client.ts`, built with
  `makeApiClient` from `@vornway/api-client`.
- Endpoints, payloads, responses and errors are defined once in
  `@vornway/contracts`; derive types from the contract instead of writing them
  by hand.
- Do not use direct `fetch` against internal API endpoints.
- If an endpoint is missing or wrong, change the contract in
  `packages/contracts` and its server handler in `apps/api` (see
  `docs/contracts.md`).

## Offline And Service Worker

- Preserve the existing offline-first behavior and TanStack DB collections.
- Do not replace offline flows with direct `localStorage`.
- In development, unregister service workers and clear browser caches before
  rendering so stale production assets do not affect local work.
- Service worker runtime cache changes must be explicit about strategy. For
  `/manifest.json`, use network-first with cache fallback.

## Docs

- Rsbuild: https://rsbuild.rs/llms.txt
- Rspack: https://rspack.rs/llms.txt
