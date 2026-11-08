# Match the runtime verified locally. Override deliberately when upgrading Bun.
ARG BUN_VERSION=1.3.2
FROM oven/bun:${BUN_VERSION} AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts
COPY . ./
RUN bun run build

FROM oven/bun:${BUN_VERSION}-slim AS production
WORKDIR /app
COPY --from=build /app/src/.output/ ./
COPY scripts/backup-sqlite.js ./scripts/backup-sqlite.js
ENV PORT=1020 HOST=0.0.0.0 NUXT_SQLITE_PATH=/data/dashhack.sqlite
EXPOSE 1020
CMD ["bun", "run", "/app/server/index.mjs"]
