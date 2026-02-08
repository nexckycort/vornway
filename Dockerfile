FROM oven/bun AS base
WORKDIR /usr/src/app

# ---------------- install deps ----------------
FROM base AS install

# Copy root workspace files + all workspace package.json
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
COPY apps/web/package.json /temp/dev/apps/web/package.json
COPY packages/ui/package.json /temp/dev/packages/ui/package.json

RUN cd /temp/dev && bun install --ignore-scripts

# ---------------- build ----------------
FROM base AS build

# Copy installed node_modules (root + hoisted)
COPY --from=install /temp/dev/node_modules node_modules
COPY --from=install /temp/dev/apps/web/node_modules apps/web/node_modules
COPY --from=install /temp/dev/packages/ui/node_modules packages/ui/node_modules

# Copy full source
COPY . .

ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

RUN bun --filter @splitway/web db:generate
RUN bun --filter @splitway/web build
RUN bun --filter @splitway/web compile

# ---------------- runtime ----------------
FROM gcr.io/distroless/base-debian12

WORKDIR /app

# Copy built output
COPY --from=build /usr/src/app/apps/web/server server

USER bun
EXPOSE 3000

CMD ["./server"]
