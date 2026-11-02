# AGENTS.md

## Task Completion Requirements

- `bun lint:fix`, `bun fmt:fix` and `bun typecheck` must pass in every touched project before considering a task completed.
- Run `bun run test` in the touched project before finishing a change.

## Project Snapshot

Vornway is an app for group travel that aims to eliminate the chaos of organizing a trip involving multiple people.

This repository is a VERY EARLY WIP. Proposing sweeping changes that improve long-term maintainability is encouraged.

| Path                   | What                                                                 |
| ---------------------- | -------------------------------------------------------------------- |
| `apps/api`             | Effect HTTP server (`HttpApi`), Better Auth, Prisma/Postgres          |
| `apps/webapp`          | React web app (TanStack Router/Query), consumes `@vornway/api-client` |
| `apps/mobile`          | Mobile app                                                           |
| `packages/contracts`   | `HttpApi` contract shared by server and clients (schemas, errors)    |
| `packages/api-client`  | Typed client + TanStack Query options built from the contract        |

## Core Priorities

1. Performance first.
2. Reliability first.
3. Keep behavior predictable under load and during failures (session restarts, reconnects, partial streams).

If a tradeoff is required, choose correctness and robustness over short-term convenience.

## Maintainability

Long term maintainability is a core priority. If you add new functionality, first check if there is shared logic that can be extracted to a separate module. Duplicate logic across multiple files is a code smell and should be avoided. Don't be afraid to change existing code. Don't take shortcuts by just adding local logic to solve a problem.

## Translations

- In `apps/webapp`, any new user-facing text must be added in both English and Spanish.
- In `apps/webapp`, new UI copy must use the project's translation system instead of hardcoded strings.

## Web API Access

- In `apps/webapp`, all API calls go through `@vornway/api-client` (built from `@vornway/contracts`).
- Do not use direct `fetch` calls from webapp code when an endpoint exists or should exist in the contract.

## Development Logs

- The API development server output is mirrored to `apps/api/api-dev.log` by the API `dev` script.
- The log file is local and ignored by Git; inspect it while the development server is running.

## Vendored repositories

This project vendors external repositories under `.repos/` with `git subtree`, as read-only reference material for the libraries it depends on.

| Path            | Upstream                                                | Pinned to      |
| --------------- | ------------------------------------------------------- | -------------- |
| `.repos/effect` | [Effect-TS/effect](https://github.com/Effect-TS/effect) | `effect@4.0.5` |

- Use vendored repositories as read-only reference material when working with related libraries.
- Prefer examples and patterns from the vendored source code over generated guesses, `node_modules` type declarations or web search results.
- Do not edit files under `.repos/` unless explicitly asked.
- Do not import from `.repos/`. Application code keeps importing from normal package dependencies (`effect`, `@effect/*`).
- `.repos/` follows its own conventions (`AGENTS.md`, formatting, tooling). They don't apply to this project.

### Effect

When writing Effect code, inspect `.repos/effect/` for idiomatic usage, tests, module structure and API design. Treat it as the source of truth for Effect patterns.

- **Always read `.repos/effect/LLMS.md` before writing any Effect code.** It indexes the runnable examples in `.repos/effect/ai-docs/src/`.
- Module guides (large, read in chunks): `packages/effect/SCHEMA.md`, `HTTPAPI.md`, `CONFIG.md`.
- Where to look for what we use:
  - `effect` → `packages/effect/src/<Module>.ts`, tests in `packages/effect/test/`
  - `effect/http`, `effect/http-api` → `packages/effect/src/http/`, `packages/effect/src/http-api/`
  - `@effect/sql-pg` → `packages/sql/pg/`
  - `@effect/platform-bun` → `packages/platform/bun/`
  - `@effect/opentelemetry` → `packages/opentelemetry/`

### Updating

Keep the pinned tag in sync with the `effect` version in `pnpm-workspace.yaml`:

```sh
git subtree pull --prefix=.repos/effect https://github.com/Effect-TS/effect.git effect@<version> --squash
```

Then update the "Pinned to" column above.

## Mobile views

A mobile view isn't done until it has been reviewed against both skills in `.agents/skills/`, and every violation found has been fixed:

- [`vercel-composition-patterns`](.agents/skills/vercel-composition-patterns/SKILL.md): composition over boolean props, explicit variants, compound components, state in providers.
- [`vercel-react-native-skills`](.agents/skills/vercel-react-native-skills/SKILL.md): list performance, no falsy `&&` in JSX, destructured functions for the React Compiler, safe areas, native UI primitives.

Read each `SKILL.md`, then the `rules/*.md` that apply to the view. In the final report, say what the review found and what was fixed.

## Server and contracts

- Read `docs/effect-services.md` before writing server code: thin handlers, `Effect.fn('Service.method')` on every service method, tagged errors, never `Effect.die`/`orDie`, `HttpClient` instead of `fetch`.
- Read `docs/contracts.md` before changing `packages/contracts`: installed PWA/mobile versions keep calling us, so extendable enums use `literalsWithFallback`, and every list is paginated with a cursor (`PageQuery`/`Page`).
- `contracts` never imports server or app code; `api-client` depends only on `contracts`. Import workspace packages by name, never by relative path.

## Testing

Tests use `bun:test` and sit next to the code they test. Read `docs/testing.md` before writing one.

- `*.test.ts`: unit, pure logic, no I/O. `*.integration.test.ts`: the real system end to end, faking only what leaves the server.
- Server: integration tests only, against real Better Auth and Postgres. Every resource that belongs to a user needs an isolation test, and every paginated list a pagination test. Use the testkit in `apps/api/testkit/` (`makeTestApp`, `device()`, `signInWithPhone`/`signInWithEmail`, `testEffect`).
- Mobile: unit tests only, for pure logic (no component rendering), plus `src/dependency-graph.test.ts`, which fails on import cycles.
- Run `bun run test` in the touched project before finishing a change.

## File size limit

A pre-commit hook (`.githooks/pre-commit`) rejects staged files over 5,000 tokens (bytes / 4, i.e. 20 KB). Keep files small and split by responsibility before they reach the limit. Generated files (lockfiles, codegen, migrations) are exempt via `linguist-generated=true` in `.gitattributes`.

## Commits and PR titles

Use conventional commit-style messages and PR titles: `type(scope): summary`.

Valid types are `feat`, `fix`, `docs`, `chore`, `refactor` and `test`. Scopes are optional; use the affected package or area when helpful, e.g. `api`, `webapp`, `mobile`, `contracts`, `api-client`, `auth` or `groups`.

Examples: `fix(api): treat an unset NODE_ENV as production`, `docs: add README with project overview`, `chore: add the effect agent skill`.

## Stacked PRs

Most changes are a single PR branched from `main`; don't stack them. Only a change too large for one PR (about 500 changed lines or 15 files) ships as a [GitHub stack](https://docs.github.com/en/pull-requests/get-started/about-stacked-prs), never as plain branches whose PR bases point at each other. Install the extension once with `gh extension install github/gh-stack`.

```sh
gh stack init feat/groups-api        # bottom layer, based on main
gh stack add feat/groups-webapp      # each new layer on top of the previous one
gh stack submit --auto               # push every layer, open the PRs and the stack
gh stack rebase                      # after changing a lower layer, cascade it up
gh stack sync                        # after a merge, rebase the rest onto main
```

- Every PR in the stack must pass CI on its own: put contracts in the same layer as their server handlers.
- To turn PRs that already exist into a stack, run `gh stack link <bottom-pr> ... <top-pr>`.
- Merge from the bottom up: merging a PR merges every PR below it, and the ones above are retargeted to `main`.

## Style guide

### General principles

- Follow the existing code style: check neighboring files for patterns before writing new code.
- If a workaround needs a paragraph-long comment to justify it, the code is wrong: fix the code.
- Default to no comments. After writing a code comment, ask: "Would the next agent spend several tool calls trying to figure this out?" If the answer isn't clearly yes, the comment is noise: delete it. See [Comments](#comments).
- Keep things in one function unless composable or reusable.
- Validate unknown values once at the boundary that owns them. Pass typed values inward instead of repeating `typeof value === "object"` and property-existence checks. Do not defensively revalidate values already guaranteed by a schema, constructor or internal type.
- Do not extract single-use helpers preemptively. Inline the logic at the call site unless the helper is reused, hides a genuinely complex boundary, or has a clear independent name that improves the caller.
- Before adding complexity for a speculative or vanishingly unlikely race or security edge case, explain the concrete failure mode, likelihood and complexity cost to the user and get their buy-in. Do not silently expand scope for theoretical robustness.
- Avoid `try`/`catch` where possible.
- Avoid the `any` type.
- Use Bun APIs when possible, like `Bun.file()` (server and scripts; the webapp and mobile app don't run on Bun).
- Rely on type inference when possible; avoid explicit type annotations or interfaces unless necessary for exports or clarity.
- Prefer functional array methods (`flatMap`, `filter`, `map`) over `for` loops; use type guards on `filter` to keep type inference downstream.
- In Effect generators, bind services to named variables before calling methods. Do not use nested service yields such as `yield* (yield* Foo.Service).bar()`.
- Reduce the total variable count by inlining a value that is only used once.

```ts
// Good
const journal = await Bun.file(path.join(dir, 'journal.json')).json()

// Bad
const journalPath = path.join(dir, 'journal.json')
const journal = await Bun.file(journalPath).json()
```

### Destructuring

Avoid unnecessary destructuring. Use dot notation to preserve context.

```ts
// Good
obj.a
obj.b

// Bad
const { a, b } = obj
```

### Imports

- Never alias imports. Do not use `import { foo as bar } from '...'` or renamed imports like `resolve as pathResolve`.
- Never use type-position `import('...')` references such as `client={posthog as import('posthog-react-native').PostHog}`; add an `import type` at the top instead. Only when two imports genuinely collide on a name and no other option exists, an aliased type import (`import type { Session as AuthSession } from '...'`) is permitted as a last resort — still strongly preferred not to.
- Never use star imports (`import * as Foo from '...'`, `import type * as Foo from '...'`) for our own code or for libraries that export their namespaces by name. Import the namespace by name instead: `import { Effect, Schema } from 'effect'`, then reference `Schema.String`.
- Star imports are allowed only for third-party modules that have no namespace export and are documented that way: Expo SDK modules (`import * as SecureStore from 'expo-secure-store'`), `react` in `components/ui`, and the Drizzle schema object passed to the adapter.
- Prefer dynamic imports for heavy modules that are only needed in selected code paths, especially in startup-sensitive entrypoints (`apps/api/src/main.ts`, scripts). Destructure dynamic import bindings near the top of the narrowest scope that needs them so they read like normal imports. Avoid inline chains such as `await import('./module').then((mod) => mod.value())` or `(await import('./module')).value()`. Keep branch-specific imports inside the branch that needs them to preserve lazy loading.

### Variables

Prefer `const` over `let`. Use ternaries or early returns instead of reassignment.

```ts
// Good
const foo = condition ? 1 : 2

// Bad
let foo
if (condition) foo = 1
else foo = 2
```

### Control flow

Avoid `else` statements. Prefer early returns.

```ts
// Good
function foo() {
  if (condition) return 1
  return 2
}

// Bad
function foo() {
  if (condition) return 1
  else return 2
}
```

### Complex logic

When a function has several validation branches or supporting details, make the main function read as the happy path and move supporting details into small helpers below it.

```ts
// Good
export const toVehicle = (record: VehicleRecord, today: Date): Vehicle => ({
  ...record,
  status: vehicleStatus(record),
  alerts: vehicleAlerts(record, today),
})

const vehicleStatus = (vehicle: VehicleRecord) => {
  ...
}
```

- Keep helpers close to the code they support, below the main export when that improves readability.
- Do not over-abstract simple expressions into many single-use helpers; extract only when it names a real concept like `vehicleStatus` or `vehicleAlerts`.
- Do not return `Effect` from helpers unless they actually perform effectful work. Synchronous parsing, validation and option building stay synchronous.
- Prefer Effect schema helpers such as `Schema.UnknownFromJsonString` and `Schema.decodeUnknownOption` over a manual `JSON.parse` wrapped in `Effect.try` when parsing untrusted JSON strings.

### Comments

- Don't restate what the name, type or schema already says. No JSDoc on schema fields, service methods or constants that just describe them.
- Don't comment mocks, TODOs, section headers, absent handlers or library/config defaults.
- Keep a comment to one line, explaining _why_, never _what_.
- Before finishing a change, ask the "next agent" question about every comment in the diff.
- When a refactor changes the code, recheck the comments around it: one that was justified can become redundant once names or structure say the same thing.

```ts
// Good: a platform workaround nobody would guess from the code
// Above the active slot, or Android drops focus when it's reordered.

// Bad: restates what the code or its structure already shows
/** Feature flags returned by the server. */
// Mock until flags come from a real provider.
// Public: the app reads these before there is a session. (the route is `/public/` and its sibling has `SessionAuth`)
```
