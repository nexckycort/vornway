FROM oven/bun AS base

WORKDIR /app

# ---------------- install deps ----------------
FROM ghcr.io/pnpm/pnpm:11 AS install

# Copy workspace config plus the join package manifest and local lockfile
RUN mkdir -p /temp/dev/apps/join
COPY pnpm-workspace.yaml /temp/dev/
COPY apps/join/package.json /temp/dev/apps/join/package.json
COPY apps/join/pnpm-lock.yaml /temp/dev/apps/join/pnpm-lock.yaml

RUN cd /temp/dev/apps/join && pnpm install --ignore-scripts --frozen-lockfile

# ---------------- build ----------------
FROM base AS build

COPY --from=install /temp/dev/apps/join/node_modules apps/join/node_modules

COPY . .

WORKDIR /app/apps/join
RUN bun run db:generate && bun run build

# ---------------- runtime ----------------
FROM gcr.io/distroless/base

WORKDIR /app

COPY --from=build /app/apps/join/dist/join join

CMD ["./join"]

EXPOSE 8080
