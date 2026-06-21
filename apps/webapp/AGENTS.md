# AGENTS.md

You are an expert in JavaScript, Rsbuild, and web application development. You write maintainable, performant, and accessible code.

## Commands

- `bun run dev` - Start the dev server
- `bun run build` - Build the app for production
- `bun run preview` - Preview the production build locally

## API clients

- For internal API calls, prefer typed RPC clients.
- Module clients live in `src/api/<module>.ts`.
- Build those clients from `@vornway/api/hc/<module>` and `fetchWithCredentials`.
- Do not use direct `fetch` against internal API endpoints when an RPC client can
  be used.
- If an API module adds or changes routes, update the matching
  `apps/api/src/hc/<module>.ts` client and run `bun run build:rpc` in
  `apps/api`.

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
