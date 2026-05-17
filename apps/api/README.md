To install dependencies:
```sh
bun install
```

To run HTTP API:
```sh
bun run dev
```

Open http://localhost:3000

## Modular style

Each feature lives in one folder under `src/modules/<feature>/` and includes everything it needs:
- `types.ts`
- `service.ts`
- `routes.ts`
- `mcp.ts`
- `module.ts`
- `index.ts`
- `<feature>.test.ts`

Create a new module:
```sh
bun run module:new <module-name>
```

After creating it, register it in `src/app/modules.ts`.

## Public routes and RPC type generation

`src/hc.ts` exports `PublicRoutes` and the generated declaration in `dist/src/hc.d.ts` is used by HTTP clients.

For this to work reliably, public routers must follow this pattern:

1. Use a chained `Hono` declaration:
```ts
const login = new Hono()
  .post(...)
  .post(...)
  .get(...)
```

2. Export that chained router as default:
```ts
export default login
```

3. Mount it from `src/routes/public/routes.ts`:
```ts
const app = new Hono()
  .basePath('/api')
  .route('/login', loginRoutes)
```

Important:
- Avoid creating the same public route in more than one place.
- Keep public HTTP endpoints under `src/routes/public/*` so `PublicRoutes` stays stable.
- If route typing is broken in clients, check that the router is declared with the chained style above.

## Environment variables

Push notifications require:
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
