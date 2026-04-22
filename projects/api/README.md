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
