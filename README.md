# Vornway

Open-source expense sharing and group finance application.

## Features

- Shared groups and expenses
- Multi-currency support
- Invitations
- Activity history
- Goals
- Push notifications
- PWA

## Architecture

- `apps/api`: Bun + Hono + Prisma
- `apps/webapp`: React + Rsbuild + TanStack
- `apps/join`: Invite flow
- `apps/landing`: Public website

## Local Development

Install the workspace dependencies:

```bash
bun install
```

Before starting the project, configure the Portless HTTPS proxy and synchronize
its hosts:

```bash
bun run portless:setup
```

This stops the proxy first in case it is already running, starts it with the
`dev.vornway.com` HTTPS domain, and runs `portless hosts sync`. If you prefer to
run the commands manually, use:

```bash
portless proxy stop
portless proxy start --https --tld dev.vornway.com
portless hosts sync
```

Start all development services from the repository root:

```bash
bun dev
```

Once the services are running, open another terminal and trust the local
Portless certificate:

```bash
portless trust
```

The trust command may request administrator permissions. It only needs to be
completed once per development machine unless the local certificate changes.

## Project Status

⚠️ **This project is currently under active development and should be considered experimental.**

Most of the current codebase was written with the assistance of AI.

The original version of Vornway had been in development for a longer period, but I decided to discard it and rebuild the project from scratch. The current rewrite was bootstrapped in approximately **five days** to validate the architecture and accelerate development.

The total time dedicated to this project is tracked across its current and former names:

[![WakaTime](https://wakatime.com/badge/user/028c7e3a-aa95-48d2-a991-97f3d117a6ef/project/15ae72fd-4f68-408e-bf68-657b0ac73806.svg)](https://wakatime.com/badge/user/028c7e3a-aa95-48d2-a991-97f3d117a6ef/project/15ae72fd-4f68-408e-bf68-657b0ac73806) + [![WakaTime](https://wakatime.com/badge/user/028c7e3a-aa95-48d2-a991-97f3d117a6ef/project/121d87b4-01d0-4676-9e35-809051520178.svg)](https://wakatime.com/badge/user/028c7e3a-aa95-48d2-a991-97f3d117a6ef/project/121d87b4-01d0-4676-9e35-809051520178)

The second tracker corresponds to the former **Splitwayapp** name, whose tracked time is no longer increasing but remains part of the project's total.

As a result, parts of the codebase prioritize shipping features over long-term maintainability. There is technical debt and some low-quality or duplicated code that will be progressively rewritten as the project evolves.

The long-term goal is to replace AI-generated scaffolding with cleaner, more maintainable implementations while keeping the project fully open source. Contributions, suggestions, and discussions are always welcome.
