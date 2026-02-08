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
FROM base AS prerelease

# Copy installed node_modules (root + hoisted)
COPY --from=install /temp/dev/node_modules node_modules
COPY --from=install /temp/dev/apps/web/node_modules apps/web/node_modules
COPY --from=install /temp/dev/packages/ui/node_modules packages/ui/node_modules

# Copy full source
COPY . .

ENV DATABASE_URL=dummy

RUN bun --filter @splitway/web db:generate
RUN bun --filter @splitway/web build

# ---------------- runtime ----------------
FROM base AS release
ENV NODE_ENV=production

# Copy built output
COPY --from=prerelease /usr/src/app/apps/web/.output dist

USER bun
EXPOSE 3000

ENTRYPOINT [ "bun", "dist/server/index.mjs" ]
