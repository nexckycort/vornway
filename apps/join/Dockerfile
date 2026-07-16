FROM oven/bun AS base

WORKDIR /app

# ---------------- install deps ----------------
FROM ghcr.io/pnpm/pnpm:11 AS install

# Copy root workspace files + all workspace package.json
RUN mkdir -p /temp/dev/apps/join
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml /temp/dev/
COPY apps/join/package.json /temp/dev/apps/join/package.json

RUN cd /temp/dev && pnpm install --ignore-scripts --frozen-lockfile

# ---------------- build ----------------
FROM base AS build

COPY --from=install /temp/dev/node_modules node_modules

COPY . .

WORKDIR /app/apps/join
RUN bun run db:generate && bun run build

# ---------------- runtime ----------------
FROM gcr.io/distroless/base

WORKDIR /app

COPY --from=build /app/dist/join join

CMD ["./join"]

EXPOSE 8080
