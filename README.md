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

## Project Status

⚠️ **This project is currently under active development and should be considered experimental.**

Most of the current codebase was written with the assistance of AI.

The original version of Vornway had been in development for a longer period, but I decided to discard it and rebuild the project from scratch. The current rewrite was bootstrapped in approximately **five days** to validate the architecture and accelerate development.

As a result, parts of the codebase prioritize shipping features over long-term maintainability. There is technical debt and some low-quality or duplicated code that will be progressively rewritten as the project evolves.

The long-term goal is to replace AI-generated scaffolding with cleaner, more maintainable implementations while keeping the project fully open source. Contributions, suggestions, and discussions are always welcome.
