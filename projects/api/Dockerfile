FROM oven/bun AS base

WORKDIR /app

# ---------------- install deps ----------------
FROM base AS install

RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
COPY prisma.config.ts /temp/dev/
COPY db /temp/dev/db


RUN cd /temp/dev && bun install --frozen-lockfile

# ---------------- build ----------------
FROM base AS build

COPY --from=install /temp/dev/node_modules node_modules

# Copy full source
COPY . .

# Prisma client is gitignored; generate before bundling (same as local postinstall)
RUN bun run db:generate && bun run build

#
FROM gcr.io/distroless/base

WORKDIR /app

COPY --from=build /app/dist/api api

CMD ["./api"]

EXPOSE 8080
