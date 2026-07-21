# AGENTS.md

## Task Completion Requirements

- `bun check` and `bun typecheck` must pass before considering tasks completed.

## Project Snapshot

Vornway is an app for group travel that aims to eliminate the chaos of organizing a trip involving multiple people

This repository is a VERY EARLY WIP. Proposing sweeping changes that improve long-term maintainability is encouraged.

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

- In `apps/webapp`, all API calls must go through the RPC clients.
- Do not use direct `fetch` calls from webapp code when an RPC client route exists or should exist.

## Development Logs

- The API development server output is mirrored to `apps/api/api-dev.log` by the API `dev` script.
- The log file is local and ignored by Git; inspect it while the development server is running.
