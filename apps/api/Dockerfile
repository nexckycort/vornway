FROM oven/bun AS base

WORKDIR /app

# ---------------- install deps ----------------
FROM ghcr.io/pnpm/pnpm:11 AS install

# Copy workspace config plus the api package manifest and local lockfile
RUN mkdir -p /temp/dev/apps/api
COPY pnpm-workspace.yaml /temp/dev/
COPY apps/api/package.json /temp/dev/apps/api/package.json
COPY apps/api/pnpm-lock.yaml /temp/dev/apps/api/pnpm-lock.yaml

RUN cd /temp/dev/apps/api && pnpm install --ignore-scripts --frozen-lockfile

# ---------------- build ----------------
FROM base AS build

COPY --from=install /temp/dev/apps/api/node_modules apps/api/node_modules

COPY . .

WORKDIR /app/apps/api
RUN bun run db:generate && bun run build

# ---------------- runtime ----------------
FROM gcr.io/distroless/base

WORKDIR /app

COPY --from=build /app/apps/api/dist/api api

CMD ["./api"]

EXPOSE 8080
