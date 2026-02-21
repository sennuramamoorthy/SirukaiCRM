# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Native build tools required by better-sqlite3 (compiled via node-gyp)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy workspace manifests first — Docker layer cache: only re-run npm ci when lockfile changes
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install ALL workspace dependencies (including devDeps for TypeScript + tsx)
# This also compiles better-sqlite3 native addon against Node 20 Alpine ABI
RUN npm ci

# Copy server TypeScript source
COPY server/tsconfig.json ./server/
COPY server/src ./server/src

# Compile TypeScript → server/dist/
RUN npm run build --workspace=server


# ── Stage 2: production ───────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Copy workspace manifests (required for npm workspace module resolution at runtime)
COPY package.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Copy pre-built node_modules from builder
# better-sqlite3 .node binary is already compiled for Node 20 Linux Alpine — no rebuild needed
# node_modules includes tsx (devDep) so "npm run seed" works at runtime
COPY --from=builder /app/node_modules ./node_modules

# Copy compiled Express server
COPY --from=builder /app/server/dist ./server/dist

# Copy SQL migration files — database.ts reads these at startup to auto-run migrations
COPY --from=builder /app/server/src/db/migrations ./server/src/db/migrations

# Copy seed script + config source for: docker compose run --rm server npm run seed
COPY --from=builder /app/server/src/db/seed.ts ./server/src/db/seed.ts
COPY --from=builder /app/server/src/config ./server/src/config

WORKDIR /app/server

EXPOSE 3001

# Health check uses the GET /health endpoint defined in app.ts
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=5 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "dist/index.js"]
