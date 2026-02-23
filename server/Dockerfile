# ── Stage 1: builder ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# pg is pure JavaScript — no native build tools needed (unlike better-sqlite3)
WORKDIR /app

# Copy workspace manifests + lockfile first — Docker layer cache optimisation
# npm ci uses package-lock.json for fast, deterministic installs (no registry re-resolution)
COPY package.json ./
COPY package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install ALL workspace dependencies (including devDeps for TypeScript + tsx)
RUN npm ci

# Copy server TypeScript source
COPY server/tsconfig.json ./server/
COPY server/src ./server/src

# Compile TypeScript → server/dist/
RUN npm run build --workspace=server


# ── Stage 2: production ───────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Copy workspace manifests (required for npm workspace module resolution at runtime)
COPY package.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Copy pre-built node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy compiled Express server
COPY --from=builder /app/server/dist ./server/dist

# Copy SQL migration files into dist/ — runMigrations() resolves via __dirname → dist/config/../db/migrations
COPY --from=builder /app/server/src/db/migrations ./server/dist/db/migrations

# Copy seed script for: docker compose run --rm server npm run seed
COPY --from=builder /app/server/src/db/seed.ts ./server/src/db/seed.ts
COPY --from=builder /app/server/src/config ./server/src/config

WORKDIR /app/server

EXPOSE 3001

# Health check uses the GET /health endpoint defined in app.ts
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "dist/index.js"]
