# Build Stage 1

FROM node:22-alpine AS build
WORKDIR /app

# Enable corepack (npm is included by default)
RUN corepack enable

# Copy package.json and package-lock.json (lock file)
COPY package.json package-lock.json ./

# Install dependencies using npm
RUN npm install

# Copy the entire project
COPY . ./

# Build the project
RUN npm run build

# Build Stage 2

FROM node:22-alpine
WORKDIR /app

# Only `.output` folder is needed from the build stage
COPY --from=build /app/.output/ ./

# Change the port and host
ENV PORT 80
ENV HOST 0.0.0.0

EXPOSE 80

CMD ["node", "/app/server/index.mjs"]
