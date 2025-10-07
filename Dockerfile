# Build Stage 1

FROM oven/bun:latest AS build
WORKDIR /app

# Copy package.json and bun.lock (lock file)
COPY package.json bun.lock ./

# Install dependencies using npm
RUN bun install

# Copy the entire project
COPY . ./

# Build the project
RUN bun --bun run build

# Build Stage 2

FROM oven/bun:latest AS production
WORKDIR /app

# Only `.output` folder is needed from the build stage
COPY --from=build /app/.output/ ./

# Change the port and host
ENV PORT 1020
ENV HOST 0.0.0.0

EXPOSE 1020

ENTRYPOINT ["bun", "--bun", "run", "/app/server/index.mjs"]
